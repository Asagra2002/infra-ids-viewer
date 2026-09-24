/**
 * Parses an IDS XML file and returns the list of specifications (name + description).
 */

export interface IDSSpecItem {
  index: number;
  name: string;
  description: string;
}

/**
 * Fetches an IDS file from a URL and parses specification names and descriptions.
 */
export async function fetchIDSSpecList(idsUrl: string): Promise<IDSSpecItem[]> {
  const response = await fetch(idsUrl);
  if (!response.ok) throw new Error(`Failed to fetch IDS: ${response.status}`);
  const xml = await response.text();
  return parseIDSSpecList(xml);
}

/**
 * Parses IDS XML string and returns array of { index, name, description } for each ids:specification.
 */
export function parseIDSSpecList(xml: string): IDSSpecItem[] {
  const specs: IDSSpecItem[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("IDS XML parse error: " + (parseError.textContent || "Unknown"));

  let specNodes = doc.getElementsByTagNameNS("http://standards.buildingsmart.org/IDS", "specification");
  if (specNodes.length === 0) {
    specNodes = doc.getElementsByTagName("specification") as HTMLCollectionOf<Element>;
  }
  if (specNodes.length === 0) {
    return parseIDSSpecListRegex(xml);
  }
  for (let i = 0; i < specNodes.length; i++) {
    const spec = specNodes[i];
    const name = spec.getAttribute("name") || "";
    let description = spec.getAttribute("description") || "";
    const descNode = spec.getElementsByTagNameNS("http://standards.buildingsmart.org/IDS", "description")[0]
      || spec.getElementsByTagName("description")[0];
    if (descNode?.textContent) description = descNode.textContent.trim();
    if (description && description.includes("&#10;")) description = description.replace(/&#10;/g, "\n");
    specs.push({ index: i + 1, name, description });
  }
  return specs;
}

/** Fallback: extract spec name and description with regex for IDS XML. */
function parseIDSSpecListRegex(xml: string): IDSSpecItem[] {
  const specs: IDSSpecItem[] = [];
  const re = /<ids:specification\s[^>]*name="([^"]*)"[^>]*description="([^"]*)"|description="([^"]*)"[^>]*name="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const name = m[1] || m[4] || "";
    const description = (m[2] || m[3] || "").replace(/&#10;/g, "\n");
    specs.push({ index: specs.length + 1, name, description });
  }
  return specs;
}
