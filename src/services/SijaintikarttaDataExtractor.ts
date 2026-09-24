/**
 * SijaintikarttaDataExtractor
 *
 * Extrae datos del edificio del modelo IFC para enviar a Sijaintikartta.
 * Migrado desde IFCMapViewer para usar con GIS (Cesium).
 */

import * as THREE from "three";
import { BuildingDimensionService } from "./BuildingDimensionService";
import type { BuildingData } from "../stores/SijaintikarttaStore";

type FragmentsGroup = any;

export interface GISLocation {
  latitude: number;
  longitude: number;
  elevation: number;
}

export function isInFinland(lat: number, lon: number): boolean {
  return lat >= 59.0 && lat <= 71.0 && lon >= 19.0 && lon <= 32.0;
}

export function convertToETRSTM35FIN(lat: number, lon: number): { x: number; y: number } {
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const lon0 = 27 * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const k0 = 1.0;

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = e2 * Math.cos(latRad) * Math.cos(latRad) / (1 - e2);
  const A = (lonRad - lon0) * Math.cos(latRad);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) * Math.sin(2 * latRad) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) * Math.sin(4 * latRad) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * latRad));

  const x =
    k0 *
    N *
    (A +
      ((1 - T + C) * A * A * A) / 6 +
      ((5 - 18 * T + T * T + 72 * C - 58 * 0.00669438) * A * A * A * A * A) / 120) +
    500000;
  const y =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        (A * A / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A * A * A * A) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * 0.00669438) * A * A * A * A * A * A) / 720));

  const yETRS = y + 2000000;
  return { x: Math.round(x), y: Math.round(yETRS) };
}

function detectSourceSoftware(model: FragmentsGroup): string {
  const modelName = model.name?.toLowerCase() || "";

  try {
    const modelAny = model as any;
    if (modelAny.properties) {
      const propsString = JSON.stringify(modelAny.properties).toLowerCase();
      if (propsString.includes("revit") || propsString.includes("autodesk")) return "revit";
      if (propsString.includes("archicad") || propsString.includes("graphisoft")) return "archicad";
      if (propsString.includes("sketchup") || propsString.includes("trimble")) return "sketchup";
    }
  } catch {}

  const softwarePatterns: Record<string, string[]> = {
    archicad: ["archicad", "pln", "archi", "graphisoft"],
    revit: ["revit", "rvt", "autodesk"],
    sketchup: ["sketchup", "skp", "trimble"],
  };

  for (const [software, patterns] of Object.entries(softwarePatterns)) {
    if (patterns.some((p) => modelName.includes(p))) return software;
  }

  if (modelName.includes("ifc4") || modelName.includes("ifc2x3")) {
    const { suggestsArchicad } = analyzeModelCharacteristics(model);
    return suggestsArchicad ? "archicad" : "revit";
  }

  const buildingType = detectBuildingTypeFromName(modelName);
  if (buildingType === "industrial" || buildingType === "factory") return "archicad";

  return "unknown";
}

function analyzeModelCharacteristics(model: FragmentsGroup): { suggestsArchicad: boolean } {
  try {
    let fragmentCount = 0;
    const obj: THREE.Object3D | undefined = (model as any)?.object ?? (model as any);
    if (obj?.traverse) {
      obj.traverse((child: THREE.Object3D) => {
        if ((child as any).isMesh) fragmentCount++;
      });
    }
    const hasComplexGeometry = fragmentCount > 1000;
    const hasDetailedProperties = !!(model as any)?.hasProperties || !!(model as any)?.properties;
    const suggestsArchicad = hasComplexGeometry && hasDetailedProperties;
    return { suggestsArchicad };
  } catch {
    return { suggestsArchicad: false };
  }
}

function detectBuildingTypeFromName(modelName: string): string {
  const industrial = ["factory", "industrial", "manufacturing", "production", "warehouse", "storage"];
  const commercial = ["office", "commercial", "business", "retail", "shopping"];
  const residential = ["residential", "house", "apartment", "home", "dwelling"];

  if (industrial.some((k) => modelName.includes(k))) return "industrial";
  if (commercial.some((k) => modelName.includes(k))) return "commercial";
  if (residential.some((k) => modelName.includes(k))) return "residential";
  return "unknown";
}

function calculateModelBoundingBox(model: FragmentsGroup): {
  width: number;
  length: number;
  height: number;
  surface: number;
  volume: number;
  source: string;
} {
  try {
    const group: THREE.Object3D | undefined = (model as any)?.object ?? (model as any);
    if (!group || !(group instanceof THREE.Object3D)) {
      throw new Error("Model does not expose a THREE.Object3D");
    }
    const box = new THREE.Box3().setFromObject(group);
    if (!box || !isFinite(box.min.x) || !isFinite(box.max.x)) {
      return {
        width: 10,
        length: 10,
        height: 3,
        surface: 100,
        volume: 300,
        source: "unknown",
      };
    }
    const rawWidth = Math.abs(box.max.x - box.min.x);
    const rawLength = Math.abs(box.max.y - box.min.y);
    const rawHeight = Math.abs(box.max.z - box.min.z);

    const source = detectSourceSoftware(model);
    const dimensionService = BuildingDimensionService.getInstance();
    const corrected = dimensionService.analyzeAndCorrectDimensions(
      { width: rawWidth, length: rawLength, height: rawHeight },
      source,
      model.name
    );

    return {
      width: corrected.width,
      length: corrected.length,
      height: corrected.height,
      surface: corrected.surface,
      volume: corrected.volume,
      source: corrected.source,
    };
  } catch {
    return {
      width: 10,
      length: 10,
      height: 3,
      surface: 100,
      volume: 300,
      source: "unknown",
    };
  }
}

async function extractBuildingInfo(model: FragmentsGroup): Promise<any> {
  const buildingInfo = {
    propertyNumber: "",
    municipality: "",
    zoning: "",
    landUse: "",
    buildingType: "",
    useCategory: "",
    energyClass: "",
    floors: 1,
    rooms: 0,
    materials: [] as string[],
    constructionYear: new Date().getFullYear(),
    cadastralInfo: {
      propertyId: "",
      landArea: 0,
      buildingArea: 0,
      ownership: "",
      landUse: "",
      zoningCode: "",
      buildingPermit: "",
      constructionPermit: "",
      occupancyPermit: "",
    },
    buildingDetails: {
      totalRooms: 0,
      bedrooms: 0,
      bathrooms: 0,
      kitchens: 0,
      livingRooms: 0,
      parkingSpaces: 0,
      basement: false,
      attic: false,
      balcony: false,
      garden: false,
    },
    technicalInfo: {
      heatingSystem: "",
      coolingSystem: "",
      ventilationSystem: "",
      electricalSystem: "",
      plumbingSystem: "",
      fireProtection: "",
      accessibility: "",
      structuralSystem: "",
    },
  };

  try {
    const anyModel = model as any;
    if (typeof anyModel.getSpatialStructure === "function") {
      const spatial = await anyModel.getSpatialStructure();
      const findBuilding = (node: any): any => {
        const cat = String(node?._category?.value || node?._category || "").toUpperCase();
        const typ = String(node?.type || "").toUpperCase();
        if (
          cat === "IFCBUILDING" ||
          typ === "IFCBUILDING" ||
          cat.includes("BUILDING") ||
          typ.includes("BUILDING")
        )
          return node;
        if (node?.children && Array.isArray(node.children)) {
          for (const c of node.children) {
            const found = findBuilding(c);
            if (found) return found;
          }
        }
        return null;
      };
      const buildingNode = findBuilding(spatial);
      if (buildingNode?.localId) {
        const itemsData = await anyModel.getItemsData([Number(buildingNode.localId)], {
          attributesDefault: true,
          relations: { IsDefinedBy: { attributes: true, relations: true } },
          relationsDefault: { attributes: true, relations: true },
        });
        if (Array.isArray(itemsData) && itemsData.length > 0) {
          const b: any = itemsData[0];
          const objType = String(b?.ObjectType?.value || "").toLowerCase();
          if (objType.includes("commercial") || objType.includes("office")) {
            buildingInfo.buildingType = "Commercial";
            buildingInfo.useCategory = "Office";
          } else if (objType.includes("industrial")) {
            buildingInfo.buildingType = "Industrial";
            buildingInfo.useCategory = "Industrial";
          } else if (objType.includes("residential")) {
            buildingInfo.buildingType = "Residential";
            buildingInfo.useCategory = "Dwelling";
          }
          if (Array.isArray(b?.IsDefinedBy)) {
            for (const rel of b.IsDefinedBy) {
              const r: any = (rel as any)?.value ?? rel;
              if (Array.isArray(r?.Quantities)) {
                for (const qRef of r.Quantities) {
                  const q: any = (qRef as any)?.value ?? qRef;
                  const qName = String(q?.Name?.value || q?.Name || "").toLowerCase();
                  if (qName.includes("numberoffloors") && typeof q?.NumberOfStoreys === "number") {
                    buildingInfo.floors = Math.max(buildingInfo.floors, q.NumberOfStoreys);
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch {}

  if (model.name) {
    const name = model.name.toLowerCase();
    if (name.includes("office") || name.includes("commercial")) {
      buildingInfo.buildingType = "Commercial";
      buildingInfo.useCategory = "Office";
    } else if (
      name.includes("residential") ||
      name.includes("house") ||
      name.includes("apartment")
    ) {
      buildingInfo.buildingType = "Residential";
      buildingInfo.useCategory = "Dwelling";
    } else if (name.includes("industrial") || name.includes("factory")) {
      buildingInfo.buildingType = "Industrial";
      buildingInfo.useCategory = "Industrial";
    } else if (name.includes("nordiclca")) {
      buildingInfo.buildingType = "Residential";
      buildingInfo.useCategory = "Dwelling";
      buildingInfo.energyClass = "A";
      buildingInfo.floors = 2;
      buildingInfo.constructionYear = 2024;
    }
    const yearMatch = name.match(/(\d{4})/);
    if (yearMatch) buildingInfo.constructionYear = parseInt(yearMatch[1]);
  }

  return buildingInfo;
}

/**
 * Extrae BuildingData del modelo IFC para enviar a Sijaintikartta.
 * @param model - Modelo IFC (FragmentsGroup)
 * @param location - Coordenadas (de GisLayers o similar)
 */
export async function extractBuildingData(
  model: FragmentsGroup,
  location: GISLocation
): Promise<BuildingData> {
  const boundingBox = calculateModelBoundingBox(model);
  const etrsCoords = convertToETRSTM35FIN(location.latitude, location.longitude);
  const buildingInfo = await extractBuildingInfo(model);

  const buildingData: BuildingData = {
    coordinates: {
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.elevation,
      etrsTM35FIN: { x: etrsCoords.x, y: etrsCoords.y },
    },
    dimensions: {
      width: boundingBox.width,
      length: boundingBox.length,
      height: boundingBox.height,
      surface: boundingBox.surface,
      volume: boundingBox.volume,
    },
    source: boundingBox.source,
    cadastral: {
      propertyNumber: buildingInfo.propertyNumber || "Auto-generated",
      municipality: buildingInfo.municipality || "Helsinki",
      zoning: buildingInfo.zoning || "Residential",
      landUse: buildingInfo.landUse || "Building",
    },
    classification: {
      buildingType: buildingInfo.buildingType || "Residential",
      useCategory: buildingInfo.useCategory || "Dwelling",
      zoning: buildingInfo.zoning || "Residential",
      energyClass: buildingInfo.energyClass || "A",
    },
    additionalInfo: {
      floors: buildingInfo.floors || 1,
      rooms: buildingInfo.rooms || 0,
      materials: buildingInfo.materials || [],
      constructionYear: buildingInfo.constructionYear || new Date().getFullYear(),
      modelName: model.name || "Unknown",
      modelType: model.type || "IFC",
    },
    cadastralInfo: {
      propertyId: buildingInfo.cadastralInfo?.propertyId || "Auto-generated",
      landArea: buildingInfo.cadastralInfo?.landArea || boundingBox.surface,
      buildingArea: buildingInfo.cadastralInfo?.buildingArea || boundingBox.surface,
      ownership: buildingInfo.cadastralInfo?.ownership || "Private",
      landUse: buildingInfo.cadastralInfo?.landUse || "Residential",
      zoningCode: buildingInfo.cadastralInfo?.zoningCode || "R1",
      buildingPermit: buildingInfo.cadastralInfo?.buildingPermit || "Pending",
      constructionPermit: buildingInfo.cadastralInfo?.constructionPermit || "Pending",
      occupancyPermit: buildingInfo.cadastralInfo?.occupancyPermit || "Pending",
    },
    buildingDetails: {
      totalRooms: buildingInfo.buildingDetails?.totalRooms ?? buildingInfo.rooms ?? 0,
      bedrooms: buildingInfo.buildingDetails?.bedrooms ?? 0,
      bathrooms: buildingInfo.buildingDetails?.bathrooms ?? 0,
      kitchens: buildingInfo.buildingDetails?.kitchens ?? 0,
      livingRooms: buildingInfo.buildingDetails?.livingRooms ?? 0,
      parkingSpaces: buildingInfo.buildingDetails?.parkingSpaces ?? 0,
      basement: buildingInfo.buildingDetails?.basement ?? false,
      attic: buildingInfo.buildingDetails?.attic ?? false,
      balcony: buildingInfo.buildingDetails?.balcony ?? false,
      garden: buildingInfo.buildingDetails?.garden ?? false,
    },
    technicalInfo: {
      heatingSystem: buildingInfo.technicalInfo?.heatingSystem || "Not specified",
      coolingSystem: buildingInfo.technicalInfo?.coolingSystem || "Not specified",
      ventilationSystem: buildingInfo.technicalInfo?.ventilationSystem || "Not specified",
      electricalSystem: buildingInfo.technicalInfo?.electricalSystem || "Not specified",
      plumbingSystem: buildingInfo.technicalInfo?.plumbingSystem || "Not specified",
      fireProtection: buildingInfo.technicalInfo?.fireProtection || "Not specified",
      accessibility: buildingInfo.technicalInfo?.accessibility || "Not specified",
      structuralSystem: buildingInfo.technicalInfo?.structuralSystem || "Not specified",
    },
  };

  return buildingData;
}
