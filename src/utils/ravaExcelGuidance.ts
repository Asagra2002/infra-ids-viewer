/**
 * Loads the RAVA 3.5 Excel and builds a map: spec name (IDS name or luokka) -> guidance text (tayttoohje).
 * Used in the full report to show "How to pass in Archicad/Revit" per specification.
 */

import * as XLSX from "xlsx";

const RAVA_EXCEL_PATH = "/assets/IFC example/RAVA3.5-ydintietojen ja rakennuksen suunnitelmamallin tekniset määritykset v1_0.xlsx";

export interface RAVAGuidanceMap {
  byLuokka: Record<string, string>;
  byPsetProperty: Record<string, string>;
}

/**
 * Fetches the RAVA Excel and returns a map from spec identifier (luokka or "pset.property") to tayttoohje.
 */
export async function fetchRAVAGuidance(excelUrl: string = RAVA_EXCEL_PATH): Promise<RAVAGuidanceMap> {
  const url = excelUrl.includes(" ") ? encodeURI(excelUrl) : excelUrl;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch RAVA Excel: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets["osaA-liite1"];
  if (!sheet) return { byLuokka: {}, byPsetProperty: {} };

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  const byLuokka: Record<string, string> = {};
  const byPsetProperty: Record<string, string> = {};

  for (let i = 6; i < data.length; i++) {
    const row = data[i];
    if (!row || row[0] == null) continue;
    const luokka = String(row[0] || "").trim();
    const attribuutti = String(row[1] || "").trim();
    const pset = String(row[9] || "").trim();
    const property = String(row[10] || "").trim();
    const tayttoohje = row[12] ? String(row[12]).trim() : "";
    if (!tayttoohje) continue;
    if (luokka) byLuokka[luokka] = tayttoohje;
    if (luokka && attribuutti) byLuokka[`${luokka}|${attribuutti}`] = tayttoohje;
    if (pset && property) byPsetProperty[`${pset}.${property}`] = tayttoohje;
  }
  return { byLuokka, byPsetProperty };
}

/**
 * Returns guidance text for an IDS spec name by matching to Excel luokka (or first word match).
 */
export function getGuidanceForSpecName(
  specName: string,
  guidanceMap: RAVAGuidanceMap
): string | undefined {
  const exact = guidanceMap.byLuokka[specName];
  if (exact) return exact;
  const normalized = specName.trim();
  for (const [key, text] of Object.entries(guidanceMap.byLuokka)) {
    if (key.startsWith(normalized) || normalized.startsWith(key.split("|")[0])) return text;
  }
  return undefined;
}
