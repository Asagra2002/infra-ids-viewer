#!/usr/bin/env python3
"""
Lista entidades IFC relevantes (tipo, GlobalId, Name) sin cargar el IFC en memoria del cliente.
Uso: python3 list_ifc_entities.py <input.ifc> [--types IfcSite,IfcBuilding,IfcSpace]
Salida: JSON compacto para que Claude construya patches sin leer el IFC completo.
"""

import json
import sys
import os

try:
    import ifcopenshell
except ImportError:
    print("ERROR: ifcopenshell no instalado. Ejecuta: pip install ifcopenshell", file=sys.stderr)
    sys.exit(1)

# Tipos que interesan para RAVA (Site, Building, Space, Project)
DEFAULT_TYPES = ("IfcProject", "IfcSite", "IfcBuilding", "IfcSpace")


def main():
    if len(sys.argv) < 2:
        print("Uso: list_ifc_entities.py <input.ifc> [--types IfcSite,IfcBuilding,IfcSpace]", file=sys.stderr)
        sys.exit(2)
    input_path = sys.argv[1]
    types_filter = DEFAULT_TYPES
    if len(sys.argv) >= 4 and sys.argv[2] == "--types":
        types_filter = tuple(t.strip() for t in sys.argv[3].split(",") if t.strip())
    if not os.path.isfile(input_path):
        print(f"ERROR: no existe el IFC: {input_path}", file=sys.stderr)
        sys.exit(3)

    model = ifcopenshell.open(input_path)
    types_set = set(types_filter)
    out = []
    for entity in model:
        if entity.is_a() not in types_set:
            continue
        try:
            gid = getattr(entity, "GlobalId", None) or ""
        except Exception:
            gid = ""
        name = ""
        if hasattr(entity, "Name") and entity.Name:
            name = str(entity.Name)
        out.append({
            "type": entity.is_a(),
            "globalId": gid,
            "name": name[:80],
        })
    print(json.dumps({"entities": out, "count": len(out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
