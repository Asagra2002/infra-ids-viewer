import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";

export interface RavaViolation {
  guid: string;
  ruleId?: string;
  expectedProperty?: string;
}

export interface RavaChange {
  guid: string;
  propertySet: string;
  propertyName: string;
  before: unknown;
  after: unknown;
  source: string;
}

export interface RavaAreaPerOccupantResult {
  changes: RavaChange[];
}

export interface RavaProjectInfoInput {
  site?: {
    name?: string;
    propertyId?: string;
    subplotId?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    planId?: string;
    planStatus?: string;
    ownershipType?: string;
  };
  building?: {
    name?: string;
    streetAddress?: string;
    postalCode?: string;
    city?: string;
    isTemporary?: boolean;
    ownershipCategory?: string;
    permanentBuildingId?: string;
  };
  designer?: {
    designerName?: string;
    officeName?: string;
  };
  dryRun?: boolean;
}

/**
 * Ejecuta la validación RAVA usando el flujo oficial de IDS (OBC.IDSSpecifications),
 * similar a como lo hace el panel de UI, pero devolviendo solo datos estructurados.
 */
export async function runRavaValidationLocal(components?: OBC.Components) {
  const comps =
    components ??
    ((window as any).worldComponents as OBC.Components | undefined);

  if (!comps) {
    throw new Error(
      "No se encontraron componentes OBC (worldComponents) para ejecutar la validación RAVA."
    );
  }

  const fragments = comps.get(OBC.FragmentsManager);
  const officialIds = comps.get(OBC.IDSSpecifications);

  // Asegurar que las especificaciones IDS RAVA están cargadas.
  if (!officialIds.list || officialIds.list.size === 0) {
    try {
      console.log("[RAVA] No IDS specifications loaded. Loading RAVA3.5 IDS...");
      const idsResponse = await fetch(
        "/assets/IFC example/RAVA3x5_asetuksen_liite1_tarkastus_v1_0.ids"
      );
      if (!idsResponse.ok) {
        throw new Error(`Failed to load IDS: ${idsResponse.status}`);
      }
      const idsContent = await idsResponse.text();
      const loadedSpecs = officialIds.load(idsContent);
      console.log(
        "[RAVA] Loaded",
        loadedSpecs.length,
        "specification(s) via OBC.IDSSpecifications.load()"
      );

      // Intentar sincronizar con nuestro IDSValidator si existe
      try {
        const idsValidator = comps.get(
          (FRAGS as any).IDSValidator ?? (OBC as any).IDSValidator
        ) as any;
        if (idsValidator && typeof idsValidator.load === "function") {
          await idsValidator.load(idsContent);
          if (typeof idsValidator.syncToOfficialIDS === "function") {
            idsValidator.syncToOfficialIDS(officialIds);
          }
        }

        const excelPath =
          "/assets/IFC example/RAVA3.5-ydintietojen ja rakennuksen suunnitelmamallin tekniset määritykset v1_0.xlsx";
        if (
          idsValidator &&
          typeof idsValidator.loadRAVAExcel === "function"
        ) {
          const excelLoaded = await idsValidator.loadRAVAExcel(
            encodeURI(excelPath)
          );
          if (excelLoaded) {
            console.log("[RAVA] RAVA Excel loaded successfully");
          } else {
            console.warn(
              "[RAVA] Could not load RAVA Excel (continuing without it). Check URL and that the file is served."
            );
          }
        }
      } catch (error) {
        console.warn(
          "[RAVA] Could not sync IDSValidator with official IDS specifications (non-critical):",
          error
        );
      }
    } catch (error) {
      console.error("[RAVA] Error auto-loading IDS/RAVA files:", error);
      return {
        modelId: "unknown",
        specifications: [],
      };
    }
  }

  const modelsEntries = Array.from(
    fragments.list.entries()
  ) as Array<[string, FRAGS.FragmentsGroup]>;
  if (modelsEntries.length === 0) {
    throw new Error("No IFC models loaded in FragmentsManager.");
  }

  // Usar siempre el ÚLTIMO modelo cargado (por ejemplo, el IFC corregido
  // que viene de MCP), en lugar del primero que se añadió al FragmentsManager.
  const [rawModelId, model] =
    modelsEntries[modelsEntries.length - 1] ?? ["default", undefined as any];
  const escapedId = String(rawModelId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const modelIdsRegex = [new RegExp(escapedId, "i")];

  const summary: any = {
    modelId: rawModelId,
    specifications: [] as any[],
  };

  for (const [, spec] of officialIds.list) {
    const result = await spec.test(modelIdsRegex);
    const byElement: Record<
      number,
      {
        pass: boolean;
      }
    > = {};

    for (const [, items] of result) {
      for (const [localId, r] of items) {
        byElement[localId] = { pass: r.pass };
      }
    }

    summary.specifications.push({
      name: spec.name,
      resultsByLocalId: byElement,
    });
  }

  return summary;
}


/**
 * MVP: aplica (o simula) una regla sencilla de RAVA sobre AreaPerOccupant.
 *
 * Por ahora:
 * - Solo actúa sobre IfcSpace.
 * - Rellena Pset_SpaceOccupancyRequirements.AreaPerOccupant si está vacío,
 *   copiando desde alguna propiedad de área ya existente cuando sea posible.
 *
 * Esta función está pensada para ser llamada desde el cliente MCP a través
 * de WebSocket, y para ir refinando la lógica de mapeo RAVA más adelante.
 */
export async function applyRavaAreaPerOccupant(
  components: OBC.Components,
  options: {
    targets?: "all" | "spacesWithViolations";
    dryRun?: boolean;
  } = {}
): Promise<RavaAreaPerOccupantResult> {
  const { targets = "all", dryRun = false } = options;

  const changes: RavaChange[] = [];

  // Obtener mundos y gestor de props IFC
  const worlds = components.get(OBC.Worlds);
  const world = worlds.list.values().next().value as
    | OBC.World<OBC.ShadowedScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>
    | undefined;

  if (!world) {
    console.warn("[RAVA] No se encontró un mundo activo para aplicar reglas.");
    return { changes };
  }

  if (!OBC.IfcPropertiesManager) {
    console.warn(
      "[RAVA] OBC.IfcPropertiesManager no está disponible en esta versión de @thatopen/components. applyRavaAreaPerOccupant se omite."
    );
    return { changes };
  }

  const ifcManager = components.get(OBC.IfcPropertiesManager);

  // En el MVP, simplemente iteramos por todas las entidades IfcSpace
  const spaces = await ifcManager.getAll("IFCSPACE").catch(() => []);

  for (const space of spaces as any[]) {
    const guid: string | undefined = space.GlobalId || space.globalId || space.guid;
    if (!guid) continue;

    // En el futuro, si "spacesWithViolations", aquí podríamos cruzar con IDS
    if (targets === "spacesWithViolations") {
      // MVP: todavía no filtramos, aplicaríamos a todos los espacios
    }

    const psets = await ifcManager.getPropertySets(space.expressID).catch(() => ({}));
    const psetOccReq =
      psets?.Pset_SpaceOccupancyRequirements ||
      psets?.["Pset_SpaceOccupancyRequirements"] ||
      {};

    const beforeValue = psetOccReq.AreaPerOccupant;

    // Si ya tiene valor, saltar en este MVP
    if (beforeValue !== undefined && beforeValue !== null && beforeValue !== "") {
      continue;
    }

    // Heurística muy simple de ejemplo:
    // intentar derivar el valor desde Pset_SpaceCommon.NetPlannedArea o GrossPlannedArea
    const psetCommon =
      psets?.Pset_SpaceCommon || psets?.["Pset_SpaceCommon"] || {};

    const candidate =
      psetCommon.NetPlannedArea ??
      psetCommon.GrossPlannedArea ??
      psetCommon["NetPlannedArea"] ??
      psetCommon["GrossPlannedArea"];

    if (
      candidate === undefined ||
      candidate === null ||
      (typeof candidate === "string" && candidate.trim() === "")
    ) {
      continue;
    }

    const afterValue = candidate;

    changes.push({
      guid,
      propertySet: "Pset_SpaceOccupancyRequirements",
      propertyName: "AreaPerOccupant",
      before: beforeValue,
      after: afterValue,
      source: "copiedFrom:Pset_SpaceCommon.(NetPlannedArea|GrossPlannedArea)",
    });

    if (!dryRun) {
      try {
        // Actualizar el valor en el gestor de propiedades IFC
        await ifcManager.setProperty(space.expressID, {
          Pset_SpaceOccupancyRequirements: {
            ...psetOccReq,
            AreaPerOccupant: afterValue,
          },
        });
      } catch (error) {
        console.error(
          `[RAVA] Error al aplicar AreaPerOccupant para espacio ${guid}:`,
          error
        );
      }
    }
  }

  return { changes };
}

/**
 * Aplica (o simula) el llenado de las propiedades RAVA de "Información del proyecto"
 * en IfcSite / IfcBuilding usando los Psets FI_*.
 *
 * Esta función está preparada para ser llamada desde el MCP a través del WebSocket.
 */
export async function applyRavaProjectInfo(
  components: OBC.Components,
  input: RavaProjectInfoInput
): Promise<{ changes: RavaChange[] }> {
  const { site, building, designer, dryRun = true } = input;
  const changes: RavaChange[] = [];

  const fragments = components.get(OBC.FragmentsManager);
  const models = Array.from(fragments.list.values()) as FRAGS.FragmentsGroup[];
  if (models.length === 0) {
    console.warn("[RAVA] No IFC models loaded in FragmentsManager for project info.");
    return { changes };
  }
  const model = models[0];

  let siteExpressId: number | undefined;
  let buildingExpressId: number | undefined;

  // Intentar localizar IfcSite y IfcBuilding
  try {
    for (const fragment of model.items) {
      for (const id of fragment.ids) {
        const element = await model.getProperties(id);
        if (!element) continue;
        const entityType = await OBC.IfcPropertiesUtils.getEntityName(model, element.expressID);
        if (!siteExpressId && entityType.name === "IFCSITE") {
          siteExpressId = element.expressID;
        }
        if (!buildingExpressId && entityType.name === "IFCBUILDING") {
          buildingExpressId = element.expressID;
        }
        if (siteExpressId && buildingExpressId) break;
      }
      if (siteExpressId && buildingExpressId) break;
    }
  } catch (error) {
    console.warn("[RAVA] Error locating IfcSite/IfcBuilding for project info:", error);
  }

  if (!siteExpressId && site) {
    console.warn("[RAVA] Requested site project info but no IfcSite was found.");
  }
  if (!buildingExpressId && (building || designer)) {
    console.warn("[RAVA] Requested building/designer project info but no IfcBuilding was found.");
  }

  // Helper to push change records
  const pushChange = (
    guidLabel: string,
    propertySet: string,
    propertyName: string,
    beforeValue: unknown,
    afterValue: unknown
  ) => {
    changes.push({
      guid: guidLabel,
      propertySet,
      propertyName,
      before: beforeValue,
      after: afterValue,
      source: "applyRavaProjectInfo",
    });
  };

  // Recoger valores "antes" sólo si podemos acceder fácilmente
  let ifcManager: any = null;
  if (OBC.IfcPropertiesManager) {
    try {
      ifcManager = components.get(OBC.IfcPropertiesManager);
    } catch {
      ifcManager = null;
    }
  }

  // SITE: Pset_FI_Rakennuspaikka en IfcSite
  if (site && siteExpressId !== undefined) {
    let psets: any = {};
    if (ifcManager) {
      try {
        psets = await ifcManager.getPropertySets(siteExpressId).catch(() => ({}));
      } catch {
        psets = {};
      }
    }
    const psetName = "Pset_FI_Rakennuspaikka";
    const current = psets?.[psetName] || {};

    const mappings: Array<[keyof NonNullable<RavaProjectInfoInput["site"]>, string]> = [
      ["name", "Nimi"],
      ["propertyId", "Kiinteistotunnus"],
      ["subplotId", "Maaraalatunnus"],
      ["address", "Osoite"],
      ["postalCode", "Postinumero"],
      ["city", "Postitoimipaikka"],
      ["planId", "PysynKaavatunnus"],
      ["planStatus", "Kaavatilanne"],
      ["ownershipType", "Hallintamuoto"],
    ];

    for (const [field, propName] of mappings) {
      const value = site[field];
      if (value === undefined) continue;
      const beforeValue = current?.[propName];
      pushChange("IfcSite", psetName, propName, beforeValue, value);
    }

    if (!dryRun && ifcManager) {
      const newPset = { ...(current || {}) };
      for (const [field, propName] of mappings) {
        const value = site[field];
        if (value === undefined) continue;
        (newPset as any)[propName] = value;
      }
      try {
        await ifcManager.setProperty(siteExpressId, {
          [psetName]: newPset,
        });
      } catch (error) {
        console.error("[RAVA] Error applying project site info:", error);
      }
    }
  }

  // BUILDING: Pset_FI_Rakennuskohde en IfcBuilding
  if (building && buildingExpressId !== undefined) {
    let psets: any = {};
    if (ifcManager) {
      try {
        psets = await ifcManager.getPropertySets(buildingExpressId).catch(() => ({}));
      } catch {
        psets = {};
      }
    }
    const psetName = "Pset_FI_Rakennuskohde";
    const current = psets?.[psetName] || {};

    const mappings: Array<[keyof NonNullable<RavaProjectInfoInput["building"]>, string]> = [
      ["name", "Nimi"],
      ["streetAddress", "Katuosoite"],
      ["postalCode", "Postinumero"],
      ["city", "Postitoimipaikka"],
      ["isTemporary", "OnValaikainen"],
      ["ownershipCategory", "Omistajalaji"],
      ["permanentBuildingId", "PysvRakennustunnus"],
    ];

    for (const [field, propName] of mappings) {
      const value = building[field];
      if (value === undefined) continue;
      const beforeValue = current?.[propName];
      pushChange("IfcBuilding", psetName, propName, beforeValue, value);
    }

    if (!dryRun && ifcManager) {
      const newPset = { ...(current || {}) };
      for (const [field, propName] of mappings) {
        const value = building[field];
        if (value === undefined) continue;
        (newPset as any)[propName] = value;
      }
      try {
        await ifcManager.setProperty(buildingExpressId, {
          [psetName]: newPset,
        });
      } catch (error) {
        console.error("[RAVA] Error applying project building info:", error);
      }
    }
  }

  // DESIGNER: Pset_FI_Suunnittelija en IfcBuilding (o IfcProject en futuras versiones)
  if (designer && buildingExpressId !== undefined) {
    let psets: any = {};
    if (ifcManager) {
      try {
        psets = await ifcManager.getPropertySets(buildingExpressId).catch(() => ({}));
      } catch {
        psets = {};
      }
    }
    const psetName = "Pset_FI_Suunnittelija";
    const current = psets?.[psetName] || {};

    const mappings: Array<[keyof NonNullable<RavaProjectInfoInput["designer"]>, string]> = [
      ["designerName", "Nimi"],
      ["officeName", "ToimistonNimi"],
    ];

    for (const [field, propName] of mappings) {
      const value = designer[field];
      if (value === undefined) continue;
      const beforeValue = current?.[propName];
      pushChange("IfcBuilding", psetName, propName, beforeValue, value);
    }

    if (!dryRun && ifcManager) {
      const newPset = { ...(current || {}) };
      for (const [field, propName] of mappings) {
        const value = designer[field];
        if (value === undefined) continue;
        (newPset as any)[propName] = value;
      }
      try {
        await ifcManager.setProperty(buildingExpressId, {
          [psetName]: newPset,
        });
      } catch (error) {
        console.error("[RAVA] Error applying project designer info:", error);
      }
    }
  }

  if (!ifcManager && !dryRun) {
    console.warn(
      "[RAVA] OBC.IfcPropertiesManager no está disponible; applyRavaProjectInfo ha generado el diff pero no ha podido escribir cambios en el modelo."
    );
  }

  return { changes };
}

/**
 * Exporta el primer modelo de fragments cargado como archivo .frag descargable en el navegador.
 * Devuelve metadatos básicos para el MCP.
 */
export async function exportCurrentFragmentsModel(
  components: OBC.Components
): Promise<{ modelId: string; fileName: string; byteLength: number }> {
  const fragments = components.get(OBC.FragmentsManager);
  const models = Array.from(fragments.list.values()) as FRAGS.FragmentsGroup[];
  if (models.length === 0) {
    throw new Error("No IFC models loaded in FragmentsManager.");
  }

  const model = models[0];
  const modelId: string =
    (model as any).modelId ?? Array.from(fragments.list.keys())[0] ?? "model";

  const buffer = await (model as any).getBuffer(false);
  const bytes = new Uint8Array(buffer as ArrayBufferLike);
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const fileName = `${modelId}-rava-fixed.frag`;

  // Trigger download in browser
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { modelId, fileName, byteLength: bytes.byteLength };
}



