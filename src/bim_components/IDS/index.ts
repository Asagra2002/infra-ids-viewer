import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import { XMLParser } from "fast-xml-parser";
import { v4 as uuidv4 } from 'uuid';
import { RAVASpecificationMapper, RAVASpecification } from './rava-spec-mapper';

interface IDSInfo {
  title: string;
  copyright: string;
  version: string;
  description?: string;
  author?: string;
  date?: string;
  purpose?: string;
  milestone?: string;
}

interface IDSVersion {
  version: '1.0' | '2.1' | '3.0';
  schemaLocation: string;
}

interface IDSPropertyValue21 {
  type: string;
  value: string;
  enumValues?: string[]; // Para IDS 1.0 con xs:restriction/xs:enumeration
}

interface IDSPropertyValue30 {
  type: string;
  simpleValue: string;
}

interface IDSEntityRequirement {
  name: string;
  predefinedType?: string;
  instructions?: string;
}

interface IDSPropertyRequirement {
  propertySet: string;
  name: string;
  value?: IDSPropertyValue21 | IDSPropertyValue30;
  instructions?: string;
  minOccurs?: number;
  maxOccurs?: number;
  dataType?: string;
}

interface IDSFacet {
  type: 'entity' | 'attribute' | 'property' | 'material' | 'classification' | 'partOf';
  name: string;
  value?: any;
  propertySet?: string;
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enumValues?: string[];
  };
}

interface IDSCheckResult {
  guid: string;
  expressID: number;
  pass: boolean;
  checks: IDSCheck[];
  details: {
    entityName: string;
    entityType: string;
    location?: {
      level?: string;
      coordinates?: [number, number, number];
    };
  };
}

interface IDSCheck {
  type: IDSFacet['type'];
  status: 'missing' | 'invalid' | 'invalid_type' | 'invalid_value' | 'invalid_pattern' | 'out_of_range';
  pass: boolean;
  requirement: {
    type: string;
    expected: any;
    actual?: any;
    propertySet?: string;
    propertyName?: string;
    system?: string;
    relation?: string;
    constraints?: {
      min?: number;
      max?: number;
      pattern?: string;
      enumValues?: string[];
    };
  };
  details?: string;
  instructions?: string;
  // Información adicional del Excel de RAVA
  ravaInfo?: {
    luokka?: string; // Clase/Categoría
    attribuutti?: string; // Atributo
    kommentti?: string; // Comentario descriptivo
    linkki?: string; // Link a documentación oficial (yhteentoimivuusalusta)
    kayttotarkoitus?: string; // Propósito de uso
    tayttoohje?: string; // Instrucciones de llenado
    koodisto?: string; // Código/estándar (nombre)
    koodistoUri?: string; // URI completo al código oficial (uri.suomi.fi/codelist/...)
  };
}

interface IDSSpecification {
  name: string;
  ifcVersion: Set<string>;
  metadata: IDSInfo;
  applicability: {
    entity: IDSEntityRequirement;
    attribute?: {
      name: string;
      value?: string;
      instructions?: string;
    }[];
    property?: IDSPropertyRequirement[];
    material?: {
      value?: string;
      instructions?: string;
    };
    classification?: {
      system: string;
      value?: string;
      instructions?: string;
    }[];
  };
  requirements: {
    entity?: IDSEntityRequirement;
    attribute?: {
      name: string;
      value?: string;
      instructions?: string;
    }[];
    property?: IDSPropertyRequirement[];
    material?: {
      value?: string;
      properties?: {
        name: string;
        value?: string;
        instructions?: string;
      }[];
      instructions?: string;
    };
    classification?: {
      system: string;
      value?: string;
      reference?: string;
      instructions?: string;
    }[];
    partOf?: {
      entity: string;
      relation: string;
      instructions?: string;
    }[];
  };
}

export class IDSValidator extends OBC.Component implements OBC.Disposable {
  static uuid = "ccaf266f-f1c7-47b4-ba09-acd6fc466668" as const;
  enabled = true;
  onDisposed = new OBC.Event<void>();
  private specifications = new Map<string, IDSSpecification>();
  list = new Map<string, IDSSpecification>();
  private currentVersion: IDSVersion = {
    version: '2.1',
    schemaLocation: 'http://standards.buildingsmart.org/IDS/2.1/ids.xsd'
  };
  private _ravaMapper?: RAVASpecificationMapper;
  
  /**
   * Obtiene el mapper de RAVA (solo disponible si se cargó el Excel)
   */
  get ravaMapper(): RAVASpecificationMapper | undefined {
    return this._ravaMapper;
  }

  static xmlParser = new XMLParser({
    allowBooleanAttributes: true,
    attributeNamePrefix: "",
    ignoreAttributes: false,
    ignoreDeclaration: true,
    ignorePiTags: true,
    numberParseOptions: { leadingZeros: true, hex: true },
    parseAttributeValue: true,
    preserveOrder: true,
    processEntities: false,
    removeNSPrefix: false, // Keep namespace prefixes
    trimValues: true,
    textNodeName: "_text",
    isArray: (name, jPath, isLeafNode, isAttribute) => {
      // Make ids:specification always an array
      if (jPath.includes('ids:specifications') && name === 'ids:specification') {
        return true;
      }
      return false;
    },
  });

  constructor(components: OBC.Components) {
    super(components);
    components.add(IDSValidator.uuid, this);
  }

  /**
   * Carga el archivo Excel de RAVA para enriquecer los resultados de validación.
   * @returns true si se cargó correctamente, false si falló (el mapper sigue siendo opcional)
   */
  async loadRAVAExcel(excelPath: string): Promise<boolean> {
    try {
      this._ravaMapper = new RAVASpecificationMapper();
      await this._ravaMapper.loadExcel(excelPath);
      console.log('[IDSValidator] RAVA Excel loaded successfully');
      return true;
    } catch (error) {
      console.error('[IDSValidator] Error loading RAVA Excel:', error);
      return false;
    }
  }

  private detectIDSVersion(idsContent: string): IDSVersion {
    if (idsContent.includes('http://standards.buildingsmart.org/IDS/3.0/ids.xsd')) {
      return {
        version: '3.0',
        schemaLocation: 'http://standards.buildingsmart.org/IDS/3.0/ids.xsd'
      };
    }
    if (idsContent.includes('http://standards.buildingsmart.org/IDS/1.0/ids.xsd')) {
      return {
        version: '1.0',
        schemaLocation: 'http://standards.buildingsmart.org/IDS/1.0/ids.xsd'
      };
    }
    return {
      version: '2.1',
      schemaLocation: 'http://standards.buildingsmart.org/IDS/2.1/ids.xsd'
    };
  }

  private validateRequiredFields(info: any, specification: any): void {
    // Validate required fields according to buildingSMART standards
    if (!info.title) {
      throw new Error("Missing required field: ids:info/ids:title");
    }
    if (!info.copyright) {
      throw new Error("Missing required field: ids:info/ids:copyright");
    }
    if (this.currentVersion.version === '3.0' && !info.version) {
      throw new Error("Missing required field: ids:info/ids:version (required in IDS 3.0)");
    }
    if (!specification.name) {
      throw new Error("Missing required field: ids:specification/@name");
    }
    if (!specification.ifcVersion) {
      throw new Error("Missing required field: ids:specification/@ifcVersion");
    }
  }

  async load(idsContent: string) {
    try {
      this.specifications.clear();
      this.list.clear();

      this.currentVersion = this.detectIDSVersion(idsContent);

      const parsedData = IDSValidator.xmlParser.parse(idsContent);
      
      // When preserveOrder: true, parser returns array format
      // Structure: [{ "ids:ids": [{ "ids:info": [...] }, { "ids:specifications": [...] }] }]
      let info: any = {};
      let specsSection: any = null;
      
      // Handle nested structure: parsedData[0]["ids:ids"] is an array
      let idsArray: any = null;
      
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        // Check if first element has "ids:ids"
        if (parsedData[0]["ids:ids"]) {
          idsArray = Array.isArray(parsedData[0]["ids:ids"]) 
            ? parsedData[0]["ids:ids"] 
            : [parsedData[0]["ids:ids"]];
        } else {
          // Direct array format: [{ "ids:info": [...] }, { "ids:specifications": [...] }]
          idsArray = parsedData;
        }
      } else if (parsedData["ids:ids"]) {
        // Standard format: { "ids:ids": { "ids:info": {...}, "ids:specifications": {...} } }
        const ids = parsedData["ids:ids"];
        if (Array.isArray(ids)) {
          idsArray = ids;
        } else {
          // Single object format
          info = ids["ids:info"] || ids.info || {};
          specsSection = ids["ids:specifications"] || ids.specifications;
        }
      } else {
        // Fallback: treat as direct structure
        info = parsedData["ids:info"] || parsedData.info || {};
        specsSection = parsedData["ids:specifications"] || parsedData.specifications;
      }
      
      // Process idsArray if we have it
      if (idsArray && Array.isArray(idsArray)) {
        for (const item of idsArray) {
          if (item["ids:info"]) {
            // Extract info from preserveOrder format
            const infoArray = Array.isArray(item["ids:info"]) ? item["ids:info"] : [item["ids:info"]];
            for (const infoItem of infoArray) {
              if (infoItem["ids:title"]) {
                const titleArray = Array.isArray(infoItem["ids:title"]) ? infoItem["ids:title"] : [infoItem["ids:title"]];
                info.title = titleArray[0]?._text || titleArray[0];
              }
              if (infoItem["ids:copyright"]) {
                const copyrightArray = Array.isArray(infoItem["ids:copyright"]) ? infoItem["ids:copyright"] : [infoItem["ids:copyright"]];
                info.copyright = copyrightArray[0]?._text || copyrightArray[0];
              }
              if (infoItem["ids:description"]) {
                const descArray = Array.isArray(infoItem["ids:description"]) ? infoItem["ids:description"] : [infoItem["ids:description"]];
                info.description = descArray[0]?._text || descArray[0];
              }
              if (infoItem["ids:date"]) {
                const dateArray = Array.isArray(infoItem["ids:date"]) ? infoItem["ids:date"] : [infoItem["ids:date"]];
                info.date = dateArray[0]?._text || dateArray[0];
              }
            }
          }
          if (item["ids:specifications"]) {
            specsSection = item["ids:specifications"];
          }
        }
      }
      
      if (!specsSection) {
        console.error("[IDS] Could not find ids:specifications in parsed data");
        console.error("[IDS] Parsed structure:", JSON.stringify(parsedData, null, 2));
        throw new Error("Invalid IDS format: Missing required ids:specifications section");
      }

      // Extract specifications array from preserveOrder format
      let specsArray: any[] = [];
      
      if (Array.isArray(specsSection)) {
        // Collect ALL specification elements from every item (preserveOrder may split applicability/requirements)
        for (const item of specsSection) {
          if (item["ids:specification"]) {
            const specItem = item["ids:specification"];
            const arr = Array.isArray(specItem) ? specItem : [specItem];
            specsArray.push(...arr);
          }
        }
      } else if (specsSection["ids:specification"]) {
        const specItem = specsSection["ids:specification"];
        specsArray = Array.isArray(specItem) ? specItem : [specItem];
      } else if (specsSection.specification) {
        const specItem = specsSection.specification;
        specsArray = Array.isArray(specItem) ? specItem : [specItem];
      }
      
      if (specsArray.length === 0) {
        console.error("[IDS] Could not extract specifications array");
        console.error("[IDS] Specifications section structure:", JSON.stringify(specsSection, null, 2));
        throw new Error("Invalid IDS format: Missing ids:specification elements");
      }

      // In preserveOrder, each logical spec may be split: one element has ids:applicability, next has ids:requirements.
      // Pair them so we get one full specification per pair.
      const specs: any[] = [];
      for (let i = 0; i < specsArray.length; i++) {
        const curr = specsArray[i];
        const hasAppl = !!(curr["ids:applicability"]);
        const hasReqs = !!(curr["ids:requirements"]);
        if (hasAppl && hasReqs) {
          specs.push(curr);
        } else if (hasAppl && i + 1 < specsArray.length && specsArray[i + 1]["ids:requirements"]) {
          const next = specsArray[i + 1];
          specs.push({
            ...curr,
            "ids:requirements": next["ids:requirements"],
            name: curr.name || next.name,
            ifcVersion: curr.ifcVersion || next.ifcVersion,
            identifier: curr.identifier || next.identifier,
            ":@": { ...curr[":@"], ...next[":@"] }
          });
          i++;
        } else if (hasReqs) {
          specs.push(curr);
        } else if (hasAppl) {
          specs.push(curr);
        }
      }
      console.log("[IDS] Found", specsArray.length, "specification element(s), combined into", specs.length, "complete specification(s)");

      for (const spec of specs) {
        // Extract spec attributes from preserveOrder format (including XML attributes in ":@")
        const attrs = spec[":@"] || {};
        let specName = spec.name || attrs.name || attrs["@_name"];
        let specIfcVersion = spec.ifcVersion || attrs.ifcVersion || attrs["@_ifcVersion"];
        let specApplicability = spec["ids:applicability"];
        let specRequirements = spec["ids:requirements"];
        
        // Handle preserveOrder format where name might be in ids:name array
        if (!specName && spec["ids:name"]) {
          const nameItem = Array.isArray(spec["ids:name"]) ? spec["ids:name"][0] : spec["ids:name"];
          specName = this.extractTextFromSimpleValue(nameItem) || nameItem?._text || (typeof nameItem === 'string' ? nameItem : null);
        }
        
        // Extract applicability - handle preserveOrder array format
        if (!specApplicability && spec["ids:applicability"]) {
          const applItem = Array.isArray(spec["ids:applicability"]) ? spec["ids:applicability"][0] : spec["ids:applicability"];
          specApplicability = applItem;
        }
        
        // Extract requirements - handle preserveOrder array format
        if (!specRequirements && spec["ids:requirements"]) {
          const reqItem = Array.isArray(spec["ids:requirements"]) ? spec["ids:requirements"][0] : spec["ids:requirements"];
          specRequirements = reqItem;
        }
        
        if (!specApplicability) {
          console.warn("[IDS] Skipping spec (missing applicability):", specName || "(unnamed)");
          continue;
        }
        if (!specRequirements) {
          console.warn("[IDS] Skipping spec (missing requirements):", specName || "(unnamed)");
          continue;
        }
        
        const identifier = spec.identifier || uuidv4();
        const name = specName || "Unnamed Specification";
        const ifcVersion = new Set<string>(specIfcVersion?.split(/\s+/) || ["IFC4"]);

        const specification: IDSSpecification = {
          name,
          ifcVersion,
          metadata: {
            title: info.title || "",
            copyright: info.copyright || "",
            version: info.version || "1.0",
            description: info.description || "",
            author: info.author || "Unknown",
            date: info.date || new Date().toISOString(),
            purpose: info.purpose || ""
          },
          applicability: this.parseApplicability(specApplicability),
          requirements: this.parseRequirements(specRequirements)
        };

        this.specifications.set(identifier, specification);
        this.list.set(identifier, specification);
      }

      console.log("[IDS] Loaded", this.specifications.size, "specification(s)");
      return true;
    } catch (error) {
      console.error("[IDS] Error loading IDS file:", error);
      throw error;
    }
  }

  /**
   * Sincroniza las especificaciones cargadas (p. ej. RAVA 3.5) al componente oficial
   * OBC.IDSSpecifications para usar spec.test() y getModelIdMap() según la documentación
   * de That Open (Fragments 3: getCategories, getItemsOfCategories, getItemsData).
   */
  syncToOfficialIDS(officialIds: OBC.IDSSpecifications): void {
    const list = officialIds.list as Map<string, OBC.IDSSpecification>;
    const keysToDelete = Array.from(list.keys());
    for (const key of keysToDelete) {
      list.delete(key);
    }
    for (const [, spec] of this.specifications) {
      const ifcVersions = Array.from(spec.ifcVersion).length ? Array.from(spec.ifcVersion) : ["IFC4"];
      const officialSpec = officialIds.create(spec.name, ifcVersions);
      const entityFacet = new OBC.IDSEntity(this.components, {
        type: "simple",
        parameter: spec.applicability.entity.name,
      });
      if (spec.applicability.entity.predefinedType) {
        entityFacet.predefinedType = {
          type: "simple",
          parameter: spec.applicability.entity.predefinedType,
        };
      }
      officialSpec.applicability.add(entityFacet);
      if (spec.requirements.property?.length) {
        for (const p of spec.requirements.property) {
          const propFacet = new OBC.IDSProperty(
            this.components,
            { type: "simple", parameter: p.propertySet },
            { type: "simple", parameter: p.name }
          );
          officialSpec.requirements.add(propFacet);
        }
      }
    }
    console.log("[IDS] Synced", this.specifications.size, "specification(s) to OBC.IDSSpecifications");
  }

  private parseApplicability(applicability: any) {
    if (!applicability) {
      throw new Error("Missing required applicability section");
    }
    
    // Handle preserveOrder format: applicability might be an array
    let applicabilityObj = applicability;
    if (Array.isArray(applicability)) {
      applicabilityObj = applicability[0];
    }
    
    // Handle preserveOrder format: ids:entity might be an array
    let entity = applicabilityObj["ids:entity"];
    if (!entity) {
      console.error("[IDS] Applicability structure:", JSON.stringify(applicabilityObj, null, 2));
      throw new Error("Missing required applicability/entity section");
    }
    
    if (Array.isArray(entity)) {
      entity = entity[0];
    }
    
    const name = this.getSimpleValue(entity, "ids:name") || "";
    const predefinedType = this.getSimpleValue(entity, "ids:predefinedType");
    const instructions = this.getSimpleValue(entity, "ids:instructions");

    return {
      entity: {
        name,
        predefinedType: predefinedType || undefined,
        instructions: instructions || undefined
      }
    };
  }

  private parsePropertyValue(value: any): IDSPropertyValue21 | IDSPropertyValue30 {
    // Handle preserveOrder format: value might be an array
    let valueObj = value;
    if (Array.isArray(value)) {
      valueObj = value[0];
    }
    
    if (this.currentVersion.version === '3.0') {
      const val: IDSPropertyValue30 = {
        type: valueObj["ids:type"] || 'STRING',
        simpleValue: valueObj["ids:simpleValue"],
      };
      return val;
    } else {
      // Para IDS 1.0 y 2.1
      const val: IDSPropertyValue21 = {
        type: valueObj["ids:type"] || 'STRING',
        value: valueObj["ids:value"] || "",
        enumValues: undefined
      };
      
      // Para IDS 1.0: extraer enumeraciones de xs:restriction/xs:enumeration
      let restriction = valueObj["xs:restriction"];
      
      // Handle preserveOrder format for restriction
      if (restriction && Array.isArray(restriction)) {
        restriction = restriction[0];
      }
      
      if (restriction) {
        let enumerations = restriction["xs:enumeration"];
        
        // Handle preserveOrder format for enumeration
        if (enumerations) {
          if (Array.isArray(enumerations)) {
            // Check if it's preserveOrder format with objects containing xs:enumeration
            if (enumerations.length > 0 && enumerations[0]["xs:enumeration"]) {
              enumerations = enumerations.map((item: any) => item["xs:enumeration"]).flat();
            }
          } else {
            enumerations = [enumerations];
          }
          
          val.enumValues = enumerations
            .map((enumItem: any) => {
              // Handle preserveOrder format: enumeration might have _text or value attribute
              if (enumItem._text) return enumItem._text;
              if (enumItem.value) return enumItem.value;
              if (enumItem["@_value"]) return enumItem["@_value"];
              return null;
            })
            .filter((v: any) => v !== undefined && v !== null && v !== "");
          
          // Si hay enumeraciones, el valor esperado es la lista completa
          // pero mantenemos el primer valor como referencia
          if (val.enumValues.length > 0) {
            val.value = val.enumValues[0]; // Valor por defecto para compatibilidad
          }
        }
      }
      
      return val;
    }
  }

  private parseRequirements(requirements: any) {
    if (!requirements) return {};

    // Handle preserveOrder format: requirements might be an array
    let requirementsObj = requirements;
    if (Array.isArray(requirements)) {
      requirementsObj = requirements[0];
    }

    const reqs: any = {};
    
    if (requirementsObj["ids:property"]) {
      // Handle preserveOrder format: ids:property might be an array
      let propsArray = requirementsObj["ids:property"];
      if (Array.isArray(propsArray)) {
        // Check if it's preserveOrder format with objects containing ids:property
        if (propsArray.length > 0 && propsArray[0]["ids:property"]) {
          // Nested preserveOrder format
          propsArray = propsArray.map((item: any) => item["ids:property"]).flat();
        }
      } else {
        propsArray = [propsArray];
      }

      reqs.property = propsArray.map((prop: any) => {
        // Handle preserveOrder format for property value
        let propValue = prop["ids:value"];
        if (propValue && Array.isArray(propValue)) {
          propValue = propValue[0];
        }
        const value = propValue ? this.parsePropertyValue(propValue) : undefined;
        
        // Para IDS 1.0, buscar ids:baseName; para 2.1/3.0, buscar ids:name
        let propertyName = "";
        if (this.currentVersion.version === '1.0') {
          propertyName = this.getSimpleValue(prop, "ids:baseName") || this.getSimpleValue(prop, "ids:name") || "";
        } else {
          propertyName = this.getSimpleValue(prop, "ids:name") || "";
        }
        
        return {
          propertySet: this.getSimpleValue(prop, "ids:propertySet") || "",
          name: propertyName,
          value,
          instructions: this.getSimpleValue(prop, "ids:instructions"),
          minOccurs: prop.minOccurs,
          maxOccurs: prop.maxOccurs,
          dataType: this.currentVersion.version === '3.0' ? prop.dataType : prop.dataType || undefined
        };
      });
    }

    if (requirements.material) {
      reqs.material = this.parseMaterialRequirements(requirements.material);
    }

    if (requirements.classification) {
      reqs.classification = this.parseClassificationRequirements(requirements.classification);
    }

    if (requirements.partOf) {
      reqs.partOf = this.parsePartOfRequirements(requirements.partOf);
    }

    return reqs;
  }

  private parseMaterialRequirements(material: any) {
    return {
      value: this.getSimpleValue(material, "ids:value")
    };
  }

  private parseClassificationRequirements(classifications: any) {
    const class_ = Array.isArray(classifications) ? classifications : [classifications];
    return class_.map(c => ({
      system: this.getSimpleValue(c, "ids:system") || "",
      value: this.getSimpleValue(c, "ids:value")
    }));
  }

  private parsePartOfRequirements(partOf: any) {
    const parts = Array.isArray(partOf) ? partOf : [partOf];
    return parts.map(p => ({
      entity: this.getSimpleValue(p, "ids:entity"),
      relation: p.relation || ""
    }));
  }

  /** Extract a single string from preserveOrder nested structure (ids:simpleValue arrays with _text). */
  private extractTextFromSimpleValue(val: any): string | null {
    if (val == null) return null;
    if (typeof val === 'string') return val;
    if (val._text) return val._text;
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (typeof first === 'string') return first;
      if (first._text) return first._text;
      if (first["ids:simpleValue"]) return this.extractTextFromSimpleValue(first["ids:simpleValue"]);
    }
    if (val["ids:simpleValue"]) return this.extractTextFromSimpleValue(val["ids:simpleValue"]);
    return null;
  }

  private getSimpleValue(element: any, path: string): string | null {
    if (!element) return null;
    
    if (element[path]) {
      const value = element[path];
      const extracted = this.extractTextFromSimpleValue(value);
      if (extracted != null) return extracted;
    }
    
    // Para IDS 1.0, también busca ids:baseName cuando se busca ids:name
    if (path === "ids:name" && element["ids:baseName"]) {
      const extracted = this.extractTextFromSimpleValue(element["ids:baseName"]);
      if (extracted != null) return extracted;
    }
    
    return null;
  }

  async test(model: FRAGS.FragmentsGroup): Promise<IDSCheckResult[]> {
    const results: IDSCheckResult[] = [];
    let indexer: InstanceType<typeof OBC.IfcRelationsIndexer> | null = null;
    try {
      if (OBC.IfcRelationsIndexer) {
        indexer = this.components.get(OBC.IfcRelationsIndexer);
      }
    } catch {
      // IfcRelationsIndexer not registered (e.g. Fragments 3 without indexer)
    }
    if (!indexer) {
      console.log("[IDS] IfcRelationsIndexer not available, continuing without it");
    }

    const hasItems = Array.isArray(model.items) && model.items.length > 0;
    const hasGetProperties = typeof (model as any).getProperties === "function";
    if (!hasItems || !hasGetProperties) {
      console.warn(
        "[IDS] Model does not expose items or getProperties (e.g. Fragments 3). Validation skipped. Results will be empty."
      );
      return results;
    }

    for (const [identifier, spec] of this.specifications) {
      // Log specification details
      console.log("[IDS] Testing Specification:", {
        name: spec.name,
        version: spec.metadata?.version,
        author: spec.metadata?.author,
        applicableEntity: spec.applicability.entity.name,
        requirements: spec.requirements
      });

      let validationStats = {
        total: 0,
        passed: 0,
        failed: 0
      };

      for (const fragment of model.items) {
        for (const expressID of fragment.ids) {
          const element = await model.getProperties(expressID);
          if (!element) continue;

          const entityType = await OBC.IfcPropertiesUtils.getEntityName(model, element.expressID);
          if (entityType.name !== spec.applicability.entity.name) {
            continue;
          }

          validationStats.total++;
          const result = await this.validateElement(model, element, expressID, spec, indexer);
          results.push(result);

          if (result.pass) {
            validationStats.passed++;
          } else {
            validationStats.failed++;
            // Log failed validations with details
            console.log(`[IDS] Validation Failed for ${entityType.name} (ID: ${expressID}):`, {
              guid: result.guid,
              elementName: result.details.entityName,
              failures: result.checks.filter(c => !c.pass).map(c => ({
                type: c.type,
                status: c.status,
                details: c.details,
                expected: c.requirement?.expected,
                actual: c.requirement?.actual
              }))
            });
          }
        }
      }

      // Log validation summary
      const total = validationStats.total;
      const passRate = total > 0 ? ((validationStats.passed / total) * 100).toFixed(2) : "0";
      console.log("[IDS] Validation Summary:", {
        specification: spec.name,
        stats: validationStats,
        passRate: `${passRate}%`
      });
    }

    return results;
  }

  getFragmentIdMap(model: FRAGS.FragmentsGroup, result: IDSCheckResult[]) {
    const empty = { pass: {} as Record<number, any>, fail: {} as Record<number, any> };
    if (typeof (model as any).getFragmentMap !== "function") {
      return empty;
    }
    const passResults = result.filter((check) => check.pass);
    const passIDs = passResults.map((check) => check.expressID);
    const pass = model.getFragmentMap(passIDs);

    const failResults = result.filter((check) => !check.pass);
    const failIDs = failResults.map((check) => check.expressID);
    const fail = model.getFragmentMap(failIDs);

    return { pass, fail };
  }

  private async validateElement(
    model: FRAGS.FragmentsGroup,
    element: any,
    expressID: number,
    specification: IDSSpecification,
    indexer: InstanceType<typeof OBC.IfcRelationsIndexer> | null
  ): Promise<IDSCheckResult> {
    const entityType = await OBC.IfcPropertiesUtils.getEntityName(model, element.expressID);
    
    const result: IDSCheckResult = {
      guid: element.GlobalId?.value || "",
      expressID,
      pass: true,
      checks: [],
      details: {
        entityName: element.Name?.value || "Unnamed",
        entityType: entityType.name || "Unknown",
        location: await this.getElementLocation(model, element, indexer)
      }
    };

    // Verificar aplicabilidad
    result.pass = await this.checkApplicability(model, element, specification.applicability, indexer);
    
    if (!result.pass) {
      result.checks.push({
        type: 'entity',
        status: 'invalid',
        pass: false,
        requirement: {
          type: 'entity',
          expected: specification.applicability.entity.name,
          actual: entityType.name
        },
        details: `Entity type mismatch. Expected: ${specification.applicability.entity.name}, Found: ${entityType.name}`
      });
      return result;
    }

    // Validar requisitos de propiedades
    if (specification.requirements.property) {
      for (const prop of specification.requirements.property) {
        const check = await this.validatePropertyRequirement(model, element, prop, indexer);
        if (!check.requirement) {
          check.requirement = {
            type: 'property',
            propertySet: prop.propertySet,
            propertyName: prop.name,
            expected: prop.value ? this.getPropertyValue(prop.value) : undefined,
            actual: undefined
          };
        }
        result.checks.push(check);
        if (!check.pass) {
          result.pass = false;
        }
      }
    }

    // Validar otros requisitos solo si las propiedades pasan
    if (result.pass) {
      if (specification.requirements.entity) {
        const check = await this.validateEntityRequirement(model, element, specification.requirements.entity);
        if (!check.requirement) {
          check.requirement = {
            type: 'entity',
            expected: specification.requirements.entity.name,
            actual: element.Name?.value
          };
        }
        result.checks.push(check);
        if (!check.pass) result.pass = false;
      }

      if (specification.requirements.attribute) {
        for (const attr of specification.requirements.attribute) {
          const check = await this.validateAttributeRequirement(model, element, attr);
          if (!check.requirement) {
            check.requirement = {
              type: 'attribute',
              expected: attr.value,
              actual: element.getAttribute(attr.name)
            };
          }
          result.checks.push(check);
          if (!check.pass) result.pass = false;
        }
      }

      if (specification.requirements.material) {
        const check = await this.validateMaterialRequirement(model, element, specification.requirements.material, indexer);
        if (!check.requirement) {
          check.requirement = {
            type: 'material',
            expected: specification.requirements.material.value,
            actual: undefined
          };
        }
        result.checks.push(check);
        if (!check.pass) result.pass = false;
      }

      if (specification.requirements.classification) {
        for (const class_ of specification.requirements.classification) {
          const check = await this.validateClassificationRequirement(model, element, class_, indexer);
          if (!check.requirement) {
            check.requirement = {
              type: 'classification',
              system: class_.system,
              expected: class_.value,
              actual: undefined
            };
          }
          result.checks.push(check);
          if (!check.pass) result.pass = false;
        }
      }

      if (specification.requirements.partOf) {
        for (const part of specification.requirements.partOf) {
          const check = await this.validatePartOfRequirement(model, element, part, indexer);
          if (!check.requirement) {
            check.requirement = {
              type: 'partOf',
              expected: part.entity,
              actual: undefined
            };
          }
          result.checks.push(check);
          if (!check.pass) result.pass = false;
        }
      }
    }

    return result;
  }

  private async getElementLocation(
    model: FRAGS.FragmentsGroup,
    element: any,
    indexer: InstanceType<typeof OBC.IfcRelationsIndexer> | null
  ): Promise<IDSCheckResult['details']['location']> {
    const location: IDSCheckResult['details']['location'] = {};
    if (!indexer) return location;

    // Obtener nivel del elemento
    const containment = indexer.getEntityRelations(model, element.expressID, "ContainedInStructure");
    if (containment) {
      for (const containerId of containment) {
        const container = await model.getProperties(containerId);
        if (container && container.type === "IFCBUILDINGSTOREY") {
          location.level = container.Name?.value;
          break;
        }
      }
    }

    // Obtener coordenadas del elemento
    if (element.ObjectPlacement) {
      const placement = await model.getProperties(element.ObjectPlacement.value);
      if (placement && placement.RelativePlacement) {
        const relativePlacement = await model.getProperties(placement.RelativePlacement.value);
        if (relativePlacement && relativePlacement.Location) {
          const loc = await model.getProperties(relativePlacement.Location.value);
          if (loc) {
            location.coordinates = [
              loc.Coordinates[0]?.value || 0,
              loc.Coordinates[1]?.value || 0,
              loc.Coordinates[2]?.value || 0
            ];
          }
        }
      }
    }

    return location;
  }

  private async validateEntityRequirement(
    model: FRAGS.FragmentsGroup,
    element: any,
    requirement: any
  ): Promise<IDSCheck> {
    const check: IDSCheck = {
      type: 'entity',
      status: 'missing',
      pass: false,
      requirement: {
        type: requirement.type,
        expected: requirement.name,
        actual: element.Name?.value
      }
    };

    if (element.Name?.value === requirement.name) {
      check.status = 'invalid';
      check.pass = true;
    }

    return check;
  }

  private async validateAttributeRequirement(
    model: FRAGS.FragmentsGroup,
    element: any,
    requirement: any
  ): Promise<IDSCheck> {
    const check: IDSCheck = {
      type: 'attribute',
      status: 'missing',
      pass: false,
      requirement: {
        type: requirement.type,
        expected: requirement.value,
        actual: element.getAttribute(requirement.name)
      }
    };

    if (element.getAttribute(requirement.name) === requirement.value) {
      check.status = 'invalid';
      check.pass = true;
    }

    return check;
  }

  private getPropertyValue(value: IDSPropertyValue21 | IDSPropertyValue30): string {
    if ('value' in value) {
      return value.value;
    }
    return value.simpleValue;
  }
  
  private getPropertyEnumValues(value: IDSPropertyValue21 | IDSPropertyValue30): string[] | undefined {
    if ('enumValues' in value && value.enumValues) {
      return value.enumValues;
    }
    return undefined;
  }

  private async validatePropertyRequirement(
    model: FRAGS.FragmentsGroup,
    element: any,
    requirement: any,
    indexer: InstanceType<typeof OBC.IfcRelationsIndexer> | null
  ): Promise<IDSCheck> {
    const expectedValue = requirement.value ? this.getPropertyValue(requirement.value) : undefined;
    const check: IDSCheck = {
      type: 'property',
      status: 'missing',
      pass: false,
      requirement: {
        type: 'property',
        propertySet: requirement.propertySet,
        propertyName: requirement.name,
        expected: expectedValue,
        actual: undefined
      },
      details: `Property "${requirement.name}" not found in property set "${requirement.propertySet}"`
    };
    if (!indexer) return check;

    // Enriquecer con información del Excel de RAVA desde el inicio
    if (this._ravaMapper && requirement.propertySet && requirement.name) {
      const ravaSpec = this._ravaMapper.getSpecificationByProperty(
        requirement.propertySet,
        requirement.name
      );
      if (ravaSpec) {
        check.ravaInfo = {
          luokka: ravaSpec.luokka,
          attribuutti: ravaSpec.attribuutti,
          kommentti: ravaSpec.kommentti,
          linkki: ravaSpec.linkki,
          kayttotarkoitus: ravaSpec.kayttotarkoitus,
          tayttoohje: ravaSpec.tayttoohje,
          koodisto: ravaSpec.koodisto,
          koodistoUri: ravaSpec.koodistoUri,
        };
      }
    }

    const relations = indexer.getEntityRelations(model, element.expressID, "IsDefinedBy");
    if (!relations) return check;

    for (const relationId of relations) {
      const relation = await model.getProperties(relationId);
      if (!relation) continue;

      const propertySetId = relation.RelatingPropertyDefinition?.value;
      if (!propertySetId) continue;

      const propertySet = await model.getProperties(propertySetId);
      if (!propertySet || propertySet.type !== 'IFCPROPERTYSET' || 
          propertySet.Name?.value !== requirement.propertySet) {
        continue;
      }

      const properties = propertySet.HasProperties;
      if (!properties) continue;

      for (const prop of properties) {
        const property = await model.getProperties(prop.value);
        if (!property || property.Name?.value !== requirement.name) continue;

        const propValue = property.NominalValue?.value;
        check.requirement.actual = propValue;

        // Enriquecer con información del Excel de RAVA si está disponible
        if (this._ravaMapper && requirement.propertySet && requirement.name) {
          const ravaSpec = this._ravaMapper.getSpecificationByProperty(
            requirement.propertySet,
            requirement.name
          );
          if (ravaSpec) {
            check.ravaInfo = {
              luokka: ravaSpec.luokka,
              attribuutti: ravaSpec.attribuutti,
              kommentti: ravaSpec.kommentti,
              linkki: ravaSpec.linkki,
              kayttotarkoitus: ravaSpec.kayttotarkoitus,
              tayttoohje: ravaSpec.tayttoohje,
              koodisto: ravaSpec.koodisto,
              koodistoUri: ravaSpec.koodistoUri,
            };
          }
        }

        if (!requirement.value) {
          check.pass = true;
          check.status = 'invalid';
          check.details = `Property "${requirement.name}" found in "${requirement.propertySet}"`;
          return check;
        }

        // Verificar si hay valores enumerados (IDS 1.0 con xs:restriction)
        const enumValues = requirement.value ? this.getPropertyEnumValues(requirement.value) : undefined;
        
        if (enumValues && enumValues.length > 0) {
          // Validar contra lista de valores permitidos
          const actualValueStr = String(propValue).trim();
          const matchesEnum = enumValues.some(enumVal => 
            String(enumVal).trim().toLowerCase() === actualValueStr.toLowerCase()
          );
          
          if (matchesEnum) {
            check.pass = true;
            check.status = 'invalid';
            check.details = `Property "${requirement.name}" matches one of the allowed values: ${enumValues.join(', ')}`;
            check.requirement.constraints = {
              enumValues: enumValues
            };
          } else {
            check.pass = false;
            check.status = 'invalid_value';
            check.details = `Property "${requirement.name}" has incorrect value. Expected one of: ${enumValues.join(', ')}, Found: "${propValue}"`;
            check.requirement.constraints = {
              enumValues: enumValues
            };
          }
        } else {
          // Validación simple (valor único)
          const actualValueStr = String(propValue).toLowerCase();
          const expectedValueStr = String(expectedValue).toLowerCase();

          if (actualValueStr === expectedValueStr) {
            check.pass = true;
            check.status = 'invalid';
            check.details = `Property "${requirement.name}" matches required value "${expectedValue}"`;
          } else {
            check.pass = false;
            check.status = 'invalid_value';
            check.details = `Property "${requirement.name}" has incorrect value. Expected: "${expectedValue}", Found: "${propValue}"`;
          }
        }

        // Validación cruzada con koodisto si está disponible
        if (check.ravaInfo?.koodistoUri && this._ravaMapper) {
          try {
            const koodistoValidation = await this._ravaMapper.validateValueAgainstKoodisto(
              check.ravaInfo.koodistoUri,
              String(propValue)
            );

            if (!koodistoValidation.isValid && koodistoValidation.koodistoInfo) {
              // Agregar información adicional al check sobre valores válidos del koodisto
              if (!check.requirement.constraints) {
                check.requirement.constraints = {};
              }
              check.requirement.constraints.koodistoValues = koodistoValidation.koodistoInfo.values.map(v => v.label);
              check.requirement.constraints.koodistoName = koodistoValidation.koodistoInfo.name;

              // Si el valor no coincide con el koodisto pero pasó la validación básica, marcar como warning
              if (check.pass && !koodistoValidation.isValid) {
                check.details = `${check.details || ''} ⚠️ Value may not match official koodisto "${koodistoValidation.koodistoInfo.name}". Valid values: ${koodistoValidation.koodistoInfo.values.map(v => v.label).join(', ')}`;
              }
            } else if (koodistoValidation.isValid && koodistoValidation.matchedValue) {
              // Valor válido según koodisto - agregar confirmación
              check.details = `${check.details || ''} ✅ Validated against koodisto "${koodistoValidation.koodistoInfo?.name || 'official code'}"`;
            }
          } catch (error) {
            // Silenciar errores de validación de koodisto - no es crítico
            console.debug('[IDSValidator] Koodisto validation error (non-critical):', error);
          }
        }

        return check;
      }
    }

    return check;
  }

  private async validateMaterialRequirement(
    model: FRAGS.FragmentsGroup,
    element: any,
    requirement: any,
    indexer: InstanceType<typeof OBC.IfcRelationsIndexer> | null
  ): Promise<IDSCheck> {
    const check: IDSCheck = {
      type: 'material',
      status: 'missing',
      pass: false,
      requirement: {
        type: requirement.type,
        expected: requirement.value,
        actual: element.getAttribute(requirement.name)
      }
    };
    if (!indexer) return check;

    const associations = indexer.getEntityRelations(model, element.expressID, "HasAssociations");
    if (!associations) return check;

    for (const assocId of associations) {
      const association = await model.getProperties(assocId);
      if (!association || !association.RelatingMaterial) continue;

      const material = await model.getProperties(association.RelatingMaterial.value);
      if (!material) continue;

      const { name } = await OBC.IfcPropertiesUtils.getEntityName(model, material.expressID);
      if (!name) continue;

      check.pass = true;
      if (requirement.value && name !== requirement.value) {
        check.status = 'invalid';
        check.details = `Expected material "${requirement.value}", got "${name}"`;
        check.pass = false;
      }
      break;
    }

    return check;
  }

  private async validateClassificationRequirement(
    model: FRAGS.FragmentsGroup,
    element: any,
    requirement: any,
    indexer: InstanceType<typeof OBC.IfcRelationsIndexer> | null
  ): Promise<IDSCheck> {
    const check: IDSCheck = {
      type: 'classification',
      status: 'missing',
      pass: false,
      requirement: {
        type: requirement.type,
        expected: requirement.value,
        actual: element.getAttribute(requirement.system)
      }
    };
    if (!indexer) return check;

    const associations = indexer.getEntityRelations(model, element.expressID, "HasAssociations");
    if (!associations) return check;

    for (const assocId of associations) {
      const association = await model.getProperties(assocId);
      if (!association || !association.RelatingClassification) continue;

      const classification = await model.getProperties(association.RelatingClassification.value);
      if (!classification) continue;

      if (requirement.system && classification.Name?.value !== requirement.system) continue;

      check.pass = true;
      if (requirement.value && classification.Identification?.value !== requirement.value) {
        check.status = 'invalid';
        check.details = `Expected "${requirement.value}", got "${classification.Identification?.value}"`;
        check.pass = false;
      }
      break;
    }

    return check;
  }

  private async validatePartOfRequirement(
    model: FRAGS.FragmentsGroup,
    element: any,
    requirement: any,
    indexer: InstanceType<typeof OBC.IfcRelationsIndexer> | null
  ): Promise<IDSCheck> {
    const check: IDSCheck = {
      type: 'partOf',
      status: 'missing',
      pass: false,
      requirement: {
        type: requirement.type,
        expected: requirement.relatedEntity,
        actual: element.getAttribute(requirement.relation)
      }
    };
    if (!indexer) return check;

    const relations = indexer.getEntityRelations(model, element.expressID, requirement.relation);
    if (!relations) return check;

    for (const relationId of relations) {
      const related = await model.getProperties(relationId);
      if (!related) continue;

      const entityType = await OBC.IfcPropertiesUtils.getEntityName(model, related.expressID);
      if (entityType.name === requirement.relatedEntity) {
        check.pass = true;
        break;
      }
    }

    return check;
  }

  private async checkApplicability(
    model: FRAGS.FragmentsGroup,
    element: any,
    applicability: IDSSpecification['applicability'],
    _indexer: InstanceType<typeof OBC.IfcRelationsIndexer> | null
  ): Promise<boolean> {
    const entityType = await OBC.IfcPropertiesUtils.getEntityName(model, element.expressID);
    if (entityType.name !== applicability.entity.name) return false;
    
    if (applicability.entity.predefinedType && 
        element.PredefinedType?.value !== applicability.entity.predefinedType) {
      return false;
    }
    
    return true;
  }

  /**
   * Genera un reporte mejorado con información del Excel de RAVA y koodistot
   */
  generateEnhancedReport(results: IDSCheckResult[]): {
    summary: {
      total: number;
      passed: number;
      failed: number;
      passRate: number;
      withKoodistoInfo: number; // Cuántos checks tienen información de koodisto
    };
    failures: Array<{
      expressID: number;
      guid: string;
      entityName: string;
      entityType: string;
      checks: Array<{
        propertySet?: string;
        propertyName?: string;
        status: string;
        details: string;
        ravaInfo?: IDSCheck['ravaInfo'];
        koodistoValidation?: {
          isValid: boolean;
          matchedValue?: { code: string; label: string };
          validValues?: Array<{ code: string; label: string }>;
        };
      }>;
    }>;
    koodistoReferences: Array<{
      uri: string;
      name?: string;
      usedInChecks: number;
    }>;
  } {
    // Contar checks con información de koodisto
    let withKoodistoInfo = 0;
    const koodistoUriMap = new Map<string, { name?: string; count: number }>();

    results.forEach(result => {
      result.checks.forEach(check => {
        if (check.ravaInfo?.koodistoUri) {
          withKoodistoInfo++;
          const uri = check.ravaInfo.koodistoUri;
          const existing = koodistoUriMap.get(uri);
          if (existing) {
            existing.count++;
          } else {
            koodistoUriMap.set(uri, {
              name: check.ravaInfo.koodisto,
              count: 1,
            });
          }
        }
      });
    });

    const summary = {
      total: results.length,
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length,
      passRate: results.length > 0 
        ? (results.filter(r => r.pass).length / results.length) * 100 
        : 0,
      withKoodistoInfo
    };

    const failures = results
      .filter(r => !r.pass)
      .map(result => ({
        expressID: result.expressID,
        guid: result.guid,
        entityName: result.details.entityName,
        entityType: result.details.entityType,
        checks: result.checks
          .filter(c => !c.pass)
          .map(check => {
            const checkData: any = {
              propertySet: check.requirement.propertySet,
              propertyName: check.requirement.propertyName,
              status: check.status,
              details: check.details || '',
              ravaInfo: check.ravaInfo,
            };

            // Agregar información de koodisto si está disponible
            if (check.requirement.constraints?.koodistoValues) {
              checkData.koodistoValidation = {
                isValid: false, // Si está en failures, no pasó
                validValues: check.requirement.constraints.koodistoValues.map((label: string) => ({
                  code: label, // Usar label como code si no hay código específico
                  label,
                })),
              };
            }

            return checkData;
          })
      }));

    const koodistoReferences = Array.from(koodistoUriMap.entries()).map(([uri, data]) => ({
      uri,
      name: data.name,
      usedInChecks: data.count,
    }));

    return { summary, failures, koodistoReferences };
  }

  dispose() {
    this.enabled = false;
    this.onDisposed.trigger();
  }
}
