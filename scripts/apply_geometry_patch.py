#!/usr/bin/env python3
"""
apply_geometry_patch.py

Aplica correcciones geométricas a elementos IFC mediante estrategia de reemplazo nuclear:
  1. Modifica atributos directos del elemento (OverallWidth, OverallHeight, etc.)
  2. Elimina la representación geométrica existente (sin importar su tipo)
  3. Crea una nueva representación simple como IfcExtrudedAreaSolid
  4. Preserva ObjectPlacement (posición en el espacio)
  5. Guarda el IFC resultante

El IFC corregido es válido, vinculable en Archicad/Revit como referencia geométrica,
y pasa la validación RAVA. La geometría es un sólido simple, no el detalle original.

Uso:
    python3 apply_geometry_patch.py <ifc_path> <patch_json_path> [output_path]

patch_json formato:
{
  "changes": [
    {
      "globalId": "3RtSgxAbCdEfGhIjKlMnOp",
      "operation": "resize_door",
      "params": { "width": 0.9, "height": 2.1, "thickness": 0.1 }
    }
  ]
}

Operaciones disponibles:
  resize_door   → IfcDoor: modifica OverallWidth/OverallHeight + nuclear replace
  resize_space  → IfcSpace: nuclear replace con área correcta
  move          → Cualquier IfcProduct: modifica ObjectPlacement (delta x/y/z)
"""

import sys
import json
import ifcopenshell
import ifcopenshell.util.placement
import ifcopenshell.api


# ---------------------------------------------------------------------------
# Utilidades de contexto IFC
# ---------------------------------------------------------------------------

def get_body_context(model):
    """
    Obtiene el contexto de representación 'Body' del modelo.
    Busca primero en SubContexts, luego en contextos raíz.
    """
    # Preferir el subcontexto Body
    for ctx in model.by_type("IfcGeometricRepresentationSubContext"):
        ident = getattr(ctx, "ContextIdentifier", None) or ""
        if ident.lower() in ("body", "facetation", "body-fallback"):
            return ctx

    # Fallback: contexto raíz de tipo Model
    for ctx in model.by_type("IfcGeometricRepresentationContext"):
        if ctx.is_a("IfcGeometricRepresentationSubContext"):
            continue
        ctx_type = getattr(ctx, "ContextType", None) or ""
        if ctx_type.lower() == "model":
            return ctx

    # Último recurso: cualquier contexto disponible
    contexts = [
        c for c in model.by_type("IfcGeometricRepresentationContext")
        if not c.is_a("IfcGeometricRepresentationSubContext")
    ]
    if contexts:
        return contexts[0]

    raise ValueError("No se encontró ningún IfcGeometricRepresentationContext en el modelo")


def find_element_by_global_id(model, global_id):
    """Busca un IfcProduct por su GlobalId."""
    for element in model.by_type("IfcProduct"):
        if getattr(element, "GlobalId", None) == global_id:
            return element
    return None


# ---------------------------------------------------------------------------
# Construcción de entidades geométricas
# ---------------------------------------------------------------------------

def create_axis2placement_3d(model, origin=(0.0, 0.0, 0.0), axis=(0.0, 0.0, 1.0), ref_dir=(1.0, 0.0, 0.0)):
    """Crea un IfcAxis2Placement3D."""
    pt = model.create_entity("IfcCartesianPoint", Coordinates=list(origin))
    ax = model.create_entity("IfcDirection", DirectionRatios=list(axis))
    rd = model.create_entity("IfcDirection", DirectionRatios=list(ref_dir))
    return model.create_entity("IfcAxis2Placement3D", Location=pt, Axis=ax, RefDirection=rd)


def create_rectangular_solid(model, body_context, width, depth, height, origin=(0.0, 0.0, 0.0)):
    """
    Crea un IfcExtrudedAreaSolid rectangular y lo envuelve en IfcProductDefinitionShape.
    width  → XDim del perfil
    depth  → YDim del perfil (espesor)
    height → profundidad de extrusión (altura del elemento)
    origin → offset de posición del sólido dentro del placement del elemento
    """
    profile = model.create_entity(
        "IfcRectangleProfileDef",
        ProfileType="AREA",
        XDim=float(width),
        YDim=float(depth),
    )

    placement_3d = create_axis2placement_3d(
        model,
        origin=(float(origin[0]), float(origin[1]), float(origin[2])),
        axis=(0.0, 0.0, 1.0),
        ref_dir=(1.0, 0.0, 0.0),
    )

    extrusion_dir = model.create_entity("IfcDirection", DirectionRatios=[0.0, 0.0, 1.0])

    solid = model.create_entity(
        "IfcExtrudedAreaSolid",
        SweptArea=profile,
        Position=placement_3d,
        ExtrudedDirection=extrusion_dir,
        Depth=float(height),
    )

    shape_rep = model.create_entity(
        "IfcShapeRepresentation",
        ContextOfItems=body_context,
        RepresentationIdentifier="Body",
        RepresentationType="SweptSolid",
        Items=[solid],
    )

    prod_def = model.create_entity(
        "IfcProductDefinitionShape",
        Representations=[shape_rep],
    )

    return prod_def


# ---------------------------------------------------------------------------
# Nuclear replace: eliminar representación existente
# ---------------------------------------------------------------------------

def remove_existing_representation(model, element):
    """
    Elimina la representación geométrica existente del elemento.
    No toca ObjectPlacement.
    """
    if not element.Representation:
        return

    prod_def = element.Representation

    for rep in list(prod_def.Representations or []):
        for item in list(rep.Items or []):
            try:
                model.remove(item)
            except Exception:
                pass
        try:
            model.remove(rep)
        except Exception:
            pass

    try:
        model.remove(prod_def)
    except Exception:
        pass

    element.Representation = None


# ---------------------------------------------------------------------------
# Operaciones
# ---------------------------------------------------------------------------

def apply_resize_door(model, element, params):
    """
    Corrige dimensiones de una IfcDoor:
    - Modifica OverallWidth y OverallHeight (atributos directos)
    - Nuclear replace de la representación geométrica
    """
    width = float(params["width"])
    height = float(params["height"])
    thickness = float(params.get("thickness", 0.1))

    # Atributos directos IFC
    if hasattr(element, "OverallWidth") and element.OverallWidth is not None:
        element.OverallWidth = width
    if hasattr(element, "OverallHeight") and element.OverallHeight is not None:
        element.OverallHeight = height

    # Nuclear replace: sólido centrado en XY, base en Z=0
    body_context = get_body_context(model)
    remove_existing_representation(model, element)

    prod_def = create_rectangular_solid(
        model,
        body_context,
        width=width,
        depth=thickness,
        height=height,
        origin=(-width / 2.0, -thickness / 2.0, 0.0),
    )
    element.Representation = prod_def

    return {
        "operation": "resize_door",
        "globalId": element.GlobalId,
        "applied": {"width": width, "height": height, "thickness": thickness},
    }


def apply_resize_space(model, element, params):
    """
    Corrige dimensiones de un IfcSpace:
    - Nuclear replace de la representación geométrica con área correcta
    """
    length = float(params["length"])
    width = float(params["width"])
    height = float(params.get("height", 2.5))

    body_context = get_body_context(model)
    remove_existing_representation(model, element)

    prod_def = create_rectangular_solid(
        model,
        body_context,
        width=length,
        depth=width,
        height=height,
        origin=(0.0, 0.0, 0.0),
    )
    element.Representation = prod_def

    return {
        "operation": "resize_space",
        "globalId": element.GlobalId,
        "applied": {"length": length, "width": width, "height": height},
    }


def apply_move(model, element, params):
    """
    Mueve un elemento modificando su ObjectPlacement.
    Acepta deltas x, y, z en metros.
    No toca la representación geométrica.
    """
    if not element.ObjectPlacement:
        raise ValueError(f"El elemento {element.GlobalId} no tiene ObjectPlacement")

    delta_x = float(params.get("x", 0.0))
    delta_y = float(params.get("y", 0.0))
    delta_z = float(params.get("z", 0.0))

    matrix = ifcopenshell.util.placement.get_local_placement(element.ObjectPlacement)
    matrix[0][3] += delta_x
    matrix[1][3] += delta_y
    matrix[2][3] += delta_z

    ifcopenshell.api.run(
        "geometry.edit_object_placement",
        model,
        product=element,
        matrix=matrix,
        is_si=True,
    )

    return {
        "operation": "move",
        "globalId": element.GlobalId,
        "applied": {"delta_x": delta_x, "delta_y": delta_y, "delta_z": delta_z},
    }


# ---------------------------------------------------------------------------
# Registro de operaciones
# ---------------------------------------------------------------------------

OPERATIONS = {
    "resize_door": apply_resize_door,
    "resize_space": apply_resize_space,
    "move": apply_move,
}


# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------

def apply_patch(ifc_path, patch, output_path=None):
    if not output_path:
        base = ifc_path.rsplit(".", 1)[0]
        output_path = f"{base}_geom_fixed.ifc"

    model = ifcopenshell.open(ifc_path)
    results = []
    errors = []

    for change in patch.get("changes", []):
        global_id = change.get("globalId")
        operation = change.get("operation")
        params = change.get("params", {})

        if not global_id:
            errors.append({"error": "Falta globalId en el cambio"})
            continue

        if operation not in OPERATIONS:
            errors.append({"globalId": global_id, "error": f"Operación desconocida: {operation}"})
            continue

        element = find_element_by_global_id(model, global_id)
        if not element:
            errors.append({"globalId": global_id, "error": "Elemento no encontrado en el modelo"})
            continue

        try:
            result = OPERATIONS[operation](model, element, params)
            results.append(result)
        except Exception as e:
            errors.append({"globalId": global_id, "operation": operation, "error": str(e)})

    model.write(output_path)

    return {
        "outputPath": output_path,
        "applied": results,
        "errors": errors,
        "success": len(errors) == 0,
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Uso: apply_geometry_patch.py <ifc_path> <patch_json_path> [output_path]"
        }))
        sys.exit(1)

    ifc_path = sys.argv[1]
    patch_path = sys.argv[2]
    output_path = sys.argv[3] if len(sys.argv) > 3 else None

    try:
        with open(patch_path, "r", encoding="utf-8") as f:
            patch = json.load(f)

        result = apply_patch(ifc_path, patch, output_path)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)
