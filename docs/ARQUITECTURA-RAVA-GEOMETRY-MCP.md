# Arquitectura: Corrección Geométrica RAVA con MCP multi-ecosistema

> **Estado:** Investigación + diseño completados. Implementación lista para ejecutar.  
> **Fecha de investigación:** Abril 2026  
> **Implementación preparada en:** `scripts/apply_geometry_patch.py`, `websocket-client.ts`, `main.ts`, `IntegratedViewer.tsx`

---

## 1. Visión general y rol de cada ecosistema

El objetivo es extender el flujo MCP actual (que ya corrige **propiedades** IFC) para incluir **correcciones geométricas** requeridas por RAVA 3.5. La arquitectura distingue claramente el rol de cada ecosistema:

| Ecosistema | Rol | Qué hace Claude |
|---|---|---|
| **That Open Engine** | Sandbox de validación + IFC de referencia | Valida IDS, aplica nuclear replace, genera BCF verificado e IFC corregido |
| **Archicad** | Modelo nativo de diseño | Lee BCF verificado, aplica corrección nativa por GlobalId via tapir-MCP |
| **Revit** | Modelo nativo de diseño | Lee BCF verificado, aplica corrección nativa por GlobalId via revit-MCP |

El BCF es el único artefacto que viaja entre ecosistemas. No hay integración directa entre ellos.

---

## 2. El IFC corregido tiene tres audiencias

El IFC resultante del proceso de corrección en That Open Engine no es solo un artefacto de validación — sirve a tres flujos de trabajo distintos:

**Audiencia 1 — Validador RAVA:** Confirma que la corrección pasa la especificación IDS. La geometría "bloque" es suficiente porque RAVA valida atributos y dimensiones, no el detalle visual.

**Audiencia 2 — Equipos con BCF:** Reciben el BCF con las correcciones verificadas en JSON estructurado. Claude en Archicad/Revit lee el BCF y aplica la corrección nativa preservando tipos, materiales y relaciones.

**Audiencia 3 — Equipos con IFC vinculado:** Muchos estudios de arquitectura en Finlandia no usan BCF sino que vinculan el IFC como referencia en su modelo nativo (Archicad o Revit). El IFC corregido — aunque sea un bloque simple — comunica **dónde debe estar** (ObjectPlacement preservado) y **qué tamaño debe tener** (dimensiones validadas). El arquitecto contrasta visualmente su puerta nativa contra el bloque IFC y ajusta manualmente.

---

## 3. La estrategia nuclear: por qué es correcta

En lugar de intentar entender y modificar la representación geométrica existente (que varía enormemente entre Archicad, Revit e IFCs simples), el script siempre aplica la misma estrategia:

1. Modificar los **atributos directos** del elemento (`OverallWidth`, `OverallHeight` para puertas)
2. **Eliminar toda la representación existente** sin importar su tipo (IfcExtrudedAreaSolid, IfcMappedItem, IfcBooleanClippingResult...)
3. **Crear una nueva representación simple** desde cero: `IfcExtrudedAreaSolid` con `IfcRectangleProfileDef`
4. **Preservar el `ObjectPlacement`** — la posición del elemento no cambia
5. Guardar el IFC

Esto funciona igual con IFCs de Archicad, Revit o cualquier fuente. La puerta resultante en el viewer es un bloque rectangular, pero:
- El IFC es completamente válido y vinculable
- Los atributos son correctos para RAVA
- La geometría tiene las dimensiones exactas validadas
- El placement es el original

---

## 4. El flujo completo (implementado)

```
Usuario hace click en una puerta en el viewer
  ↓
Claude: get-viewer-selection
  → viewer resuelve localId → GlobalId (model.getGuidsByLocalIds)
  → { globalId, entityType: "IfcDoor", entityName: "D-01" }
  ↓
Claude razona: "D-01 mide 0.8m × 2.0m. RAVA requiere mínimo 0.9m × 2.1m"
(info del IFC via list-ifc-entities o del BCF de validación previa)
  ↓
Usuario/Claude confirma corrección
  ↓
Claude: apply-geometry-patch
  → ifcPath, globalId, operation: "resize_door", params: { width: 0.9, height: 2.1 }
  → Python: nuclear replace → nuevo IFC guardado en disco
  → { outputPath, applied: [...], success: true }
  ↓
Claude: load-ifc (nuevo archivo)
  → viewer recarga con geometría corregida visible
  ↓
Claude: run-rava-validation
  → ✅ puerta pasa RAVA
  ↓
BCF actualizado: issue cerrado + parámetros de corrección en comentario JSON
  ↓
IFC corregido disponible como:
  ├─ Referencia vinculable en Archicad/Revit (Audiencia 3)
  └─ Base para que Claude aplique corrección nativa via MCP (Audiencia 2)
```

---

## 5. Operaciones implementadas en apply_geometry_patch.py

| Operación | Elementos | Parámetros | Descripción |
|---|---|---|---|
| `resize_door` | IfcDoor | `width`, `height`, `thickness` (opt.) | Nuclear replace + atributos OverallWidth/OverallHeight |
| `resize_space` | IfcSpace | `length`, `width`, `height` (opt.) | Nuclear replace con área correcta |
| `move` | Cualquier IfcProduct | `x`, `y`, `z` (deltas) | Modifica ObjectPlacement sin tocar geometría |

Extensible: añadir `resize_wall`, `resize_railing`, etc. siguiendo el mismo patrón.

---

## 6. Piezas implementadas

### 6.1 `scripts/apply_geometry_patch.py` ← nuevo
Script Python que implementa la estrategia nuclear. Recibe:
```json
{
  "changes": [
    {
      "globalId": "3RtSgx...",
      "operation": "resize_door",
      "params": { "width": 0.9, "height": 2.1, "thickness": 0.1 }
    }
  ]
}
```
Devuelve JSON con `outputPath`, `applied`, `errors`, `success`.

### 6.2 `window.__viewerSelection` en `IntegratedViewer.tsx` ← modificado
El raycaster ya almacena la selección internamente. Se añade `window.__viewerSelection = modelIdMap` en el handler `onSelect` para que el cliente WebSocket pueda leerla.

### 6.3 Handler `get-viewer-selection` en `websocket-client.ts` ← modificado
Nuevo tipo de mensaje. El viewer resuelve `localId → GlobalId` usando `model.getGuidsByLocalIds()` y obtiene `entityType` + `entityName` con `model.getItemsData()`. Responde con:
```json
{
  "type": "get-viewer-selection:result",
  "selection": { "globalId": "...", "localId": 42, "modelId": "...", "entityType": "IfcDoor", "entityName": "D-01" }
}
```

### 6.4 MCP tools en `main.ts` ← modificado

**`get-viewer-selection`:** Envía el mensaje WS y devuelve la selección actual del viewer a Claude.

**`apply-geometry-patch`:** Análoga a `apply-rava-ifc-patch`. Llama a `apply_geometry_patch.py` con el patch de geometría y devuelve el resultado.

---

## 7. El BCF como especificación de corrección verificada

El BCF generado tras la validación exitosa incluye en el comentario del topic:

```json
{
  "rava_correction": {
    "spec": "MinimumDoorWidth",
    "operation": "resize_door",
    "validated": true,
    "params": { "width": 0.9, "height": 2.1 },
    "validated_in": "That Open Engine sandbox",
    "ifc_corrected_path": "/ruta/al/archivo_geom_fixed.ifc"
  }
}
```

Esto permite que Claude en Archicad/Revit (via MCP) lea el BCF, extraiga los parámetros y aplique la corrección nativa sin necesidad de razonar de nuevo sobre la norma RAVA.

---

## 8. Lo que ya existe y se reutiliza

### MCP Server (`mcp-server/main.ts`)
| Tool | Estado |
|---|---|
| `load-ifc` | ✅ Existente |
| `run-rava-validation` | ✅ Existente |
| `apply-rava-ifc-patch` | ✅ Existente (propiedades) |
| `list-ifc-entities` | ✅ Existente |
| `get-viewer-selection` | 🆕 Preparado |
| `apply-geometry-patch` | 🆕 Preparado |

### Scripts Python (`scripts/`)
| Script | Estado |
|---|---|
| `apply_rava_patch.py` | ✅ Existente (propiedades) |
| `list_ifc_entities.py` | ✅ Existente |
| `apply_geometry_patch.py` | 🆕 Preparado |

### Frontend
| Componente | Estado |
|---|---|
| `websocket-client.ts` — handlers existentes | ✅ Existente |
| `websocket-client.ts` — handler get-viewer-selection | 🆕 Preparado |
| `IntegratedViewer.tsx` — window.__viewerSelection | 🆕 Preparado (1 línea) |

---

## 9. MCP de terceros para corrección nativa (Fase 2)

### Archicad
- **Servidor:** `tapir-archicad-MCP` v0.3.2 (febrero 2026)
- **PyPI:** `pip install tapir-archicad-mcp`
- **GitHub:** `SzamosiMate/tapir-archicad-MCP`
- **Tools:** 137 (Tapir API + JSON API oficial Graphisoft)
- **Requiere:** Python 3.12+, Archicad con JSON API, add-on Tapir

### Revit
- **Servidor principal:** `RevitMCPBridge2026` — 705+ endpoints, named pipes (`WeberG619/RevitMCPBridge2026`)
- **Alternativa:** `mcp-servers-for-revit` — TS + C# add-in + WebSocket, Revit 2020-2026

---

## 10. Decisiones de arquitectura confirmadas

**That Open Engine no exporta IFC:** Confirmado por issue #138 de ThatOpen (enero 2026). La persistencia siempre pasa por ifcopenshell Python.

**Nuclear replace es la estrategia correcta:** Funciona con cualquier fuente de IFC (Archicad, Revit, simples). La fidelidad visual no es el objetivo — la validez RAVA y la referencia dimensional sí.

**ObjectPlacement siempre se preserva:** Al reemplazar solo la representación (no el placement), el elemento queda en su posición correcta en el espacio. Crítico para que el IFC sea usable como referencia vinculada.

**El BCF es el protocolo entre ecosistemas:** GlobalId + parámetros verificados en JSON en el comentario del topic. Claude en cualquier ecosistema puede leerlo y actuar sin razonar de nuevo.

---

## 11. Próximos pasos sugeridos

1. **Ejecutar el experimento base:** Cargar un IFC, seleccionar una puerta, aplicar `apply-geometry-patch`, verificar que el nuevo IFC se carga y la validación pasa.
2. **Verificar vinculabilidad:** Abrir el IFC corregido en Archicad o Revit como referencia vinculada y confirmar que se muestra correctamente.
3. **Enriquecer el BCF:** Modificar `BCFTool.createTopicsFromRAVAValidationReport()` para incluir el JSON de corrección en el comentario del topic cuando la corrección está verificada.
4. **Instalar tapir-archicad-MCP:** Verificar qué tools concretas permiten modificar dimensiones de elementos por GlobalId.
5. **Extender operaciones:** Añadir `resize_wall`, `resize_railing`, `resize_space_opening` según necesidades RAVA.

---

## 12. Referencias

- **That Open EditApi:** https://docs.thatopen.com/Tutorials/Fragments/Fragments/FragmentsModels/EditApi
- **That Open Issue #138 (no IFC export):** https://github.com/ThatOpen/engine_fragment/issues/138
- **tapir-archicad-MCP:** https://github.com/SzamosiMate/tapir-archicad-MCP
- **mcp-servers-for-revit:** https://github.com/mcp-servers-for-revit/mcp-servers-for-revit
- **RevitMCPBridge2026:** https://github.com/WeberG619/RevitMCPBridge2026
- **ifcopenshell geometry API:** https://docs.ifcopenshell.org/autoapi/ifcopenshell/api/geometry/index.html
- **Flujo RAVA propiedades:** `docs/FLUJO-IFC-CLAUDE.md`
