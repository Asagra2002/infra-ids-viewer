# RAVA 3.5 – Acciones en el modelo para pasar la validación

Este documento se ha generado contrastando tu **reporte BCF** (`rava-validation-export(7).bcfzip`) con el **IDS** (`RAVA3x5_asetuksen_liite1_tarkastus_v1_0.ids`). Indica **qué propiedades o acciones** debes hacer en el modelo (Archicad/Revit) para cumplir cada especificación que está fallando.

---

## Resumen del reporte

En el BCF aparecen **tres grupos** de fallos:

| Grupo | Elemento IFC | Cantidad aprox. | Especificaciones que fallan |
|-------|--------------|------------------|-----------------------------|
| **A** | **IfcSite** (ID 31) | 1 | Rakennuspaikan nimi, Määräalatunnus, Postitoimipaikka, Kaavatunnus, Tietomallin korkeuskoordinaattijärjestelmä, Putkitus/latauspisteet, etc. |
| **B** | **IfcBuilding** (ID 5193) | 1 | Tietomallin laji, Suunnittelijan nimi, Suunnittelutoimisto, Rakentamistoimenpide, Rakennuskohteen nimi/osoite, Verkostoliittymät, Polkupyöräpaikat, Käyttötarkoitus, Kantava rakenne, Lämmitys, Julkisivu, Korkeus, Kerrosluku, Tilavuus, etc. (muchas) |
| **C** | **IfcSpace** (varios IDs) | ~90 elementos | Siempre las mismas 5: **Kokonaisala**, **Kerrosala**, **Rakennusoikeudellinen kerrosala**, **Kellariala**, **Ullakkoala** |

---

## Grupo C – IfcSpace (áreas por planta)

Es el que más temas genera en el BCF. **Todos** los IfcSpace que fallan deben cumplir las **mismas 5 especificaciones** de área.

### Qué exige el IDS

Cada una de estas 5 especificaciones se cumple con **IfcSpace** que:

1. Tenga **PropertySet** = `FI_Laajuustieto`, propiedad **Tyyppi** con el valor exacto indicado abajo.
2. Tenga **PredefinedType** = `GFA` (Gross Floor Area).

| Especificación RAVA | Valor exacto de FI_Laajuustieto.Tyyppi |
|---------------------|----------------------------------------|
| Kokonaisala | `Kokonaisala` |
| Kerrosala | `Kerrosala` |
| Rakennusoikeudellinen kerrosala | `Rakennusoikeudellinen kerrosala` |
| Kellariala | `Kellariala` |
| Ullakkoala | `Ullakkoala` |

### Acciones en Archicad / Revit

- **Archicad**  
  - Asegúrate de que los **Zonas** (o equivalentes que exportas como IfcSpace) tengan en IFC:
    - **Pset**: `FI_Laajuustieto`.
    - **Propiedad**: `Tyyppi` con **uno** de los valores: `Kokonaisala`, `Kerrosala`, `Rakennusoikeudellinen kerrosala`, `Kellariala`, `Ullakkoala` (según qué tipo de área represente esa zona).
  - El tipo de zona/space en IFC debe ser **GFA** (Gross Floor Area). Configura el mapeo IFC para que las zonas de área exporten como IfcSpace con PredefinedType = GFA.
- **Revit**  
  - Asigna a cada **Room/Space** que represente estas áreas un **Parameter** (o IFC property set) que se exporte como:
    - **Pset**: `FI_Laajuustieto`
    - **Property**: `Tyyppi` = uno de los cinco valores anteriores.
  - Asegura que el IfcSpace exportado tenga PredefinedType = GFA.

**Resumen:** Cada espacio (zona/room) que represente “área de planta” debe tener **FI_Laajuustieto.Tyyppi** = el nombre correcto del tipo de área y **PredefinedType = GFA**.

---

## Grupo B – IfcBuilding (edificio)

El elemento es el **edificio** (un solo IfcBuilding en el BCF, ID 5193). El IDS exige muchas propiedades en **IFCBUILDING** con **PropertySet** = `FI_Kohde` (y en algún caso otro Pset). Abajo solo las que aparecen en tu BCF; el IDS tiene más.

### Propiedades requeridas (FI_Kohde salvo indicación)

| Especificación RAVA | PropertySet | BaseName (nombre propiedad IFC) | Tipo / valores |
|---------------------|-------------|----------------------------------|----------------|
| Rakennuksen tietomallin laji | FI_Kohde | TietomallinLaji | "Suunnitelmamalli" / "Toteumamalli" / "Planmodell" / "Utfallsmodell" / "Planning model" / "As-built model" |
| Suunnittelijan nimi | FI_Kohde | VastaavaSuunnittelija | Texto |
| Rakennussuunnittelutoimiston nimi | FI_Kohde | Suunnittelutoimisto | Texto |
| Rakentamistoimenpiteen laji | FI_Kohde | (ver IDS) | Según koodisto |
| Rakennustoimenpide on perusparannus | FI_Kohde | (boolean) | true/false |
| Rakennuskohteen nimi | FI_Kohde | (nombre del edificio) | Texto |
| Rakennuskohteen katuosoite | FI_Kohde | (dirección) | Texto |
| Rakennuskohteen postinumero | FI_Kohde | (código postal) | Texto |
| Rakennuskohteen postitoimipaikka | FI_Kohde | (localidad) | Texto |
| Korkeus | FI_Kohde | RakennuksenKorkeus | Real (m) |
| Kerrosluku | FI_Kohde | RakennuksenKerrosluku | Entero |
| Tilavuus | FI_Kohde | RakennuksenTilavuus | Entero (m³) |
| Suhde maan pintaan | FI_Kohde | RakennuksenSuhdeMaanpintaan | Valores del koodisto (ej. "Kokonaan pinnan yllä") |
| Kantavan rakenteen rakennusaine (Betoni, Tiili, Teräs, Puu, Muu) | FI_Kohde | (propiedades boolean/lista según IDS) | Según IDS |
| Lämmitysenergianlähteen laji / Lämmitystavan laji | FI_Kohde | (varias) | Según koodisto |
| Julkisivun rakennusaine (Betoni, Tiili, …) | FI_Kohde | (varias) | Según IDS |
| Jäähdytystavan laji, Ilmanvaihtotavan laji, Talousveden laji, etc. | FI_Kohde / otros | (ver IDS) | Según koodisto |

Las propiedades exactas de “Verkostoliittymän laji”, “Polkupyöräpaikkojen määrä”, “Käyttötarkoituksen laji”, “Putkitus autojen latauspistettä varten”, etc. están definidas en el IDS con **FI_Kohde** u otros Psets; hay que añadirlas al **objeto Edificio** en el modelo con el nombre IFC indicado en el IDS.

### Acciones en Archicad / Revit

- En **Archicad**: en la **configuración del proyecto** o en las **propiedades del edificio** (lo que se exporte como IfcBuilding), crea o mapea **Property Sets IFC**:
  - **FI_Kohde** con todas las propiedades listadas en el IDS para IFCBUILDING (TietomallinLaji, VastaavaSuunnittelija, Suunnittelutoimisto, RakennuksenKorkeus, RakennuksenKerrosluku, RakennuksenTilavuus, etc.).
- En **Revit**: asigna los **Project Information** o **Building** parameters que se mapeen a **FI_Kohde** y a los nombres de propiedad anteriores en la exportación IFC.

El Excel **RAVA3.5-ydintietojen ja rakennuksen suunnitelmamallin tekniset määritykset v1_0.xlsx** contiene las “täyttöohje” (instrucciones de cómo rellenar) por atributo; si la app lo carga, puedes verlas también en el reporte/BCF. Si no, usa ese Excel como referencia oficial para valores permitidos (koodistot).

---

## Grupo A – IfcSite (solar)

El elemento es el **solar** (IfcSite, ID 31 en tu BCF).

### Propiedades requeridas (FI_Kiinteistö en IfcSite)

| Especificación RAVA | PropertySet | BaseName | Notas |
|---------------------|-------------|----------|--------|
| Rakennuspaikan nimi | FI_Kiinteistö | KiinteistönNimi | Texto |
| Rakennuspaikan kiinteistötunnus | FI_Kiinteistö | Kiinteistötunnus | Texto |
| Rakennuspaikan määräalatunnus | FI_Kiinteistö | Määräala | Opcional |
| Rakennuspaikan osoite | FI_Kiinteistö | Katuosoite | Texto |
| Rakennuspaikan postinumero | FI_Kiinteistö | Postinumero | Texto |
| Rakennuspaikan postitoimipaikka | FI_Kiinteistö | Postitoimipaikka | Texto |
| Rakennuspaikan pysyvä kaavatunnus | FI_Kiinteistö | Kaavatunnus | Opcional |
| Tietomallin korkeuskoordinaattijärjestelmä | (ver IDS) | (ver IDS) | Requerido según IDS |

Otras que aparecen en el BCF (Putkitus autojen latauspistettä varten, Muut johtoreitit, Esikaapelointi, Autojen latauspisteiden määrä) están definidas en el IDS; típicamente en **IFCSITE** o en **IFCBUILDING** según la spec. Revisa el IDS por el nombre exacto del Pset y de la propiedad.

### Acciones en Archicad / Revit

- Asigna al **solar / site** (lo que se exporte como **IfcSite**) el **Property Set** **FI_Kiinteistö** con las propiedades: KiinteistönNimi, Kiinteistötunnus, Määräala (opcional), Katuosoite, Postinumero, Postitoimipaikka, Kaavatunnus (opcional).
- Añade la propiedad del **sistema de coordenadas de altura** según el IDS (nombre exacto en el archivo .ids).

---

## Orden recomendado

1. **Sitio (IfcSite)**: Añadir **FI_Kiinteistö** con las propiedades anteriores.
2. **Edificio (IfcBuilding)**: Añadir **FI_Kohde** (y otros Psets que marque el IDS) con todas las propiedades del edificio listadas en el IDS.
3. **Espacios (IfcSpace)**: Para cada zona/room que deba representar área RAVA:
   - Añadir **FI_Laajuustieto.Tyyppi** = `Kokonaisala` / `Kerrosala` / `Rakennusoikeudellinen kerrosala` / `Kellariala` / `Ullakkoala`.
   - Asegurar **PredefinedType** = **GFA**.

Luego **volver a exportar IFC** y ejecutar de nuevo **«Validate RAVA»** en la app; el BCF y el reporte te indicarán si queda algún fallo.

---

## Referencia rápida – IfcSpace (Grupo C)

Para que un **IfcSpace** pase las 5 especificaciones de área:

- **Pset**: `FI_Laajuustieto`
- **Propiedad**: `Tyyppi` = exactamente uno de:
  - `Kokonaisala`
  - `Kerrosala`
  - `Rakennusoikeudellinen kerrosala`
  - `Kellariala`
  - `Ullakkoala`
- **PredefinedType** del IfcSpace: `GFA`

Cada espacio debe tener **un solo** tipo de área (un solo valor de Tyyppi); para cubrir las 5 especificaciones necesitas espacios con cada uno de los 5 valores (por ejemplo, zonas de kokonaisala, kerrosala, etc. por planta).
