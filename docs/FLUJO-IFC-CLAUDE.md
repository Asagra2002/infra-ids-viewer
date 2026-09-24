# Flujo IFC para Claude (validación RAVA y corrección)

Este documento define el flujo que Claude debe seguir. El usuario carga el IFC en el Integrated Viewer; Claude orquesta validación y corrección.

---

## 1. Flujo paso a paso

1. **Usuario** abre el visor BIM (Integrated Viewer) y opcionalmente ya ha cargado un IFC, o espera a que Claude lo haga.
2. **Claude** ejecuta **`load-ifc`** con la ruta del IFC a validar (ej. el original o el último `_RAVA_fixed*.ifc`).
   - El visor recibe el archivo y **reemplaza** el modelo actual. Solo hay un modelo en memoria.
3. **Claude** ejecuta **`run-rava-validation`**.
   - La validación se ejecuta **siempre sobre el modelo actualmente cargado en el visor**, es decir, el último IFC enviado con `load-ifc`.
   - El informe devuelto (specifications, resultsByLocalId, pass/fail) corresponde a **ese** IFC.
4. **Usuario** autoriza la corrección (o Claude sigue según lo acordado).
5. **Claude** construye un **patch** (lista de `changes` con globalId, propertySet/property o attribute, value) y ejecuta **`apply-rava-ifc-patch`** con:
   - `ifcPath`: ruta del IFC que quieres corregir (normalmente el que acabas de validar).
   - `patch`: el objeto `{ "changes": [ ... ] }`.
   - `outputPath`: ruta del **nuevo** IFC corregido (ej. mismo nombre con sufijo `_RAVA_fixed2.ifc`).
   - El script escribe el nuevo archivo en disco; **no** modifica el modelo que está en el visor.
6. **Claude** ejecuta **`load-ifc`** de nuevo con la ruta del **nuevo** IFC (`outputPath`).
   - Así el visor pasa a mostrar y usar el IFC corregido.
7. **Claude** ejecuta **`run-rava-validation`** otra vez.
   - El informe corresponde ahora al IFC corregido. Compara con el anterior para ver qué especificaciones pasan a ✅.

**No hace falta que el usuario cierre el visor.** Basta con que Claude haga `load-ifc` del nuevo archivo y luego `run-rava-validation`.

---

## 2. Origen del modelo validado

- **`run-rava-validation`** no recibe la ruta del archivo. Usa el modelo que esté cargado en el visor en ese momento.
- Cada **`load-ifc`** reemplaza ese modelo por el contenido del archivo indicado.
- Por tanto: **el informe de validación siempre se refiere al último IFC cargado con `load-ifc`.**

Si Claude acaba de hacer `load-ifc` con `ARK_..._RAVA_fixed2.ifc`, el resultado de `run-rava-validation` es el de **ese** archivo.

---

## 3. Si la validación sigue fallando después del patch

Si tras cargar el IFC corregido la validación muestra los **mismos** errores, las causas probables son:

1. **Nombres de propiedad**  
   El IDS RAVA espera nombres **exactos** de Pset y propiedad (ej. `FI_Kohde.TietomallinLaji`, `FI_Kiinteistö.KiinteistönNimi`). Si el patch usa otro nombre (typo, traducción), el validador no lo reconoce.

2. **Valores no permitidos**  
   Muchas especificaciones usan koodistot (listas cerradas). El valor en el patch debe ser uno de los permitidos (ej. para "Rakennuksen tietomallin laji": "Suunnitelmamalli", "Toteumamalli", etc.).

3. **Especificaciones no cubiertas en el patch**  
   Si una regla falla en localId 4070 (IfcBuilding) o 30 (IfcSite), el patch debe incluir un `change` para ese ente con la propiedad correcta. Si ese `change` falta o tiene globalId equivocado, esa especificación seguirá en rojo.

**Recomendación:** Revisar el IDS y `docs/RAVA-validacion-acciones-modelo.md` para alinear cada especificación fallida con el Pset/propiedad exacto y un valor válido, y asegurar que el patch incluya esos cambios con los GlobalIds obtenidos con **`list-ifc-entities`**.

---

## 4. Resumen para Claude

- **load-ifc** → Carga un IFC en el visor (reemplaza el modelo actual).
- **run-rava-validation** → Valida el modelo **actualmente cargado**; el informe es de ese IFC.
- **apply-rava-ifc-patch** → Escribe un **nuevo** IFC en disco; no cambia el visor.
- Para que el usuario vea y valide el resultado: **load-ifc** del nuevo archivo y luego **run-rava-validation** de nuevo.
- Para construir el patch sin leer el IFC: usar **list-ifc-entities** para obtener GlobalIds reales.
