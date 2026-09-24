"""
apply_rava_patch.py  (v2 – usa ifcopenshell.api para garantizar serialización)
--------------------------------------------------------------------------------
Aplica un patch JSON a un archivo IFC usando ifcopenshell.api.

Para cada change en patch["changes"]:
  - Si tiene "propertySet" + "property" + "value":
      * Usa ifcopenshell.api para obtener o crear el Pset y añadir/editar la propiedad.
  - Si tiene "attribute" + "value":
      * Asigna el atributo directo en la entidad IFC.

Uso desde línea de comandos:
  python apply_rava_patch.py <ifc_input> <patch_json> [ifc_output]

Requiere: pip install ifcopenshell
"""

import ifcopenshell
import ifcopenshell.api
import json
import sys
import os


def _find_pset(entity, pset_name):
    """Devuelve el IfcPropertySet con pset_name enlazado a entity, o None."""
    if not hasattr(entity, "IsDefinedBy") or entity.IsDefinedBy is None:
        return None
    for rel in entity.IsDefinedBy:
        if rel.is_a("IfcRelDefinesByProperties"):
            definition = rel.RelatingPropertyDefinition
            if definition.is_a("IfcPropertySet") and getattr(definition, "Name", None) == pset_name:
                return definition
    return None


def apply_patch(ifc_path: str, patch: dict, output_path: str = None) -> dict:
    """
    Aplica el patch al IFC y guarda el resultado.
    Devuelve: {"outputPath": str, "applied": int, "total": int, "errors": [str]}
    """
    if output_path is None:
        base, ext = os.path.splitext(ifc_path)
        output_path = base + "_RAVA_fixed" + ext

    ifc_file = ifcopenshell.open(ifc_path)

    guid_index = {}
    for entity in ifc_file:
        if hasattr(entity, "GlobalId") and entity.GlobalId:
            guid_index[entity.GlobalId] = entity

    changes = patch.get("changes", [])
    applied = 0
    errors = []

    for change in changes:
        global_id = change.get("globalId")
        if not global_id:
            errors.append("Change sin globalId, ignorado.")
            continue

        entity = guid_index.get(global_id)
        if entity is None:
            errors.append(f"GlobalId no encontrado: {global_id}")
            continue

        try:
            if "attribute" in change:
                setattr(entity, change["attribute"], change["value"])
                applied += 1

            elif "propertySet" in change and "property" in change:
                pset_name = change["propertySet"]
                prop_name = change["property"]
                value = change["value"]

                pset = _find_pset(entity, pset_name)
                if pset is None:
                    pset = ifcopenshell.api.run(
                        "pset.add_pset",
                        ifc_file,
                        product=entity,
                        name=pset_name,
                    )

                # edit_pset espera valores Python crudos (str, int, bool, float)
                ifcopenshell.api.run(
                    "pset.edit_pset",
                    ifc_file,
                    pset=pset,
                    properties={prop_name: value},
                )

                # Si el valor es float, edit_pset puede preservar el tipo anterior (p.ej. IfcInteger).
                # Forzamos IfcReal directamente en la propiedad existente.
                if isinstance(value, float):
                    for prop in pset.HasProperties:
                        if prop.Name == prop_name and hasattr(prop, "NominalValue"):
                            if prop.NominalValue is not None and prop.NominalValue.is_a() != "IfcReal":
                                prop.NominalValue = ifc_file.create_entity("IfcReal", value)
                            break

                applied += 1

            else:
                errors.append(
                    f"Change para {global_id} no tiene ni 'attribute' ni 'propertySet+property'."
                )

        except Exception as e:
            errors.append(f"Error en {global_id}: {e}")

    ifc_file.write(output_path)

    return {
        "outputPath": os.path.abspath(output_path),
        "applied": applied,
        "total": len(changes),
        "errors": errors,
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python apply_rava_patch.py <ifc_input> <patch.json> [ifc_output]", file=sys.stderr)
        sys.exit(1)

    ifc_input = sys.argv[1]
    patch_file = sys.argv[2]
    ifc_output = sys.argv[3] if len(sys.argv) > 3 else None

    with open(patch_file, "r", encoding="utf-8") as f:
        patch_data = json.load(f)

    result = apply_patch(ifc_input, patch_data, ifc_output)
    print(json.dumps(result, ensure_ascii=False))
