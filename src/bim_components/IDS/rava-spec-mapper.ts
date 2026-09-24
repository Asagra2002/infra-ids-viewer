import * as XLSX from 'xlsx';

export interface RAVASpecification {
  luokka: string; // Clase/Categoría
  attribuutti: string; // Atributo
  kommentti: string; // Comentario
  linkki: string; // Link a documentación oficial (yhteentoimivuusalusta)
  kayttotarkoitus: string; // Propósito de uso
  vaihe: string; // Fase (L+T = Lupa + Toteuma)
  entity: string; // IFC Entity (ej: IfcBuilding)
  predefinedType?: string; // PredefinedType si aplica
  attribute?: string; // Nombre del atributo IFC
  pset: string; // Property Set (ej: FI_Kohde)
  property: string; // Nombre de la propiedad (ej: TietomallinLaji)
  datatype?: string; // Tipo de dato IFC
  tayttoohje?: string; // Instrucciones de llenado
  sallitutArvot?: string; // Valores permitidos
  koodisto?: string; // Código/estándar (nombre del código)
  koodistoUri?: string; // URI completo al código oficial (uri.suomi.fi/codelist/...)
}

export class RAVASpecificationMapper {
  private specifications: Map<string, RAVASpecification> = new Map();
  private propertyMap: Map<string, RAVASpecification> = new Map(); // pset.property -> spec

  /**
   * Carga el archivo Excel de RAVA y extrae las especificaciones
   * Soporta tanto rutas de archivo (Node.js) como URLs (navegador)
   */
  async loadExcel(excelPath: string): Promise<void> {
    try {
      let workbook: XLSX.WorkBook;
      
      // Detectar si es una URL (navegador) o ruta de archivo (Node.js)
      if (excelPath.startsWith('http://') || excelPath.startsWith('https://') || excelPath.startsWith('/')) {
        // Cargar desde URL usando fetch (navegador)
        const response = await fetch(excelPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
        }
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        if (contentType.includes("text/html")) {
          throw new Error(
            "Server returned HTML instead of Excel (e.g. 404 or login page). Check the Excel URL and that the file is served correctly."
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        // XLSX (Office Open XML) files start with PK (ZIP magic)
        const bytes = new Uint8Array(arrayBuffer);
        if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
          throw new Error(
            "Response is not a valid Excel file (expected ZIP/XLSX format). Check the URL and server response."
          );
        }
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      } else {
        // Cargar desde ruta de archivo (Node.js)
        workbook = XLSX.readFile(excelPath);
      }
      
      const sheet = workbook.Sheets['osaA-liite1'];
      
      if (!sheet) {
        throw new Error(`Sheet 'osaA-liite1' not found in Excel file`);
      }

      const data = XLSX.utils.sheet_to_json(sheet, { 
        header: 1, 
        defval: null,
        raw: false 
      }) as any[][];

      // Headers están en la fila 5 (índice 5)
      // Datos empiezan en la fila 6 (índice 6)
      for (let i = 6; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue; // Saltar filas vacías

        const spec: RAVASpecification = {
          luokka: String(row[0] || '').trim(),
          attribuutti: String(row[1] || '').trim(),
          kommentti: String(row[2] || '').trim(),
          linkki: String(row[3] || '').trim(),
          kayttotarkoitus: String(row[4] || '').trim(),
          vaihe: String(row[5] || '').trim(),
          entity: String(row[6] || '').trim(),
          predefinedType: row[7] ? String(row[7]).trim() : undefined,
          attribute: row[8] ? String(row[8]).trim() : undefined,
          pset: String(row[9] || '').trim(),
          property: String(row[10] || '').trim(),
          datatype: row[11] ? String(row[11]).trim() : undefined,
          tayttoohje: row[12] ? String(row[12]).trim() : undefined,
          sallitutArvot: row[13] ? String(row[13]).trim() : undefined,
          koodisto: row[14] ? String(row[14]).trim() : undefined,
          koodistoUri: this.resolveKoodistoUri(row[14] ? String(row[14]).trim() : undefined),
        };

        // Crear clave única: luokka + attribuutti
        const key = `${spec.luokka}|${spec.attribuutti}`;
        this.specifications.set(key, spec);

        // También mapear por property set + property name
        if (spec.pset && spec.property) {
          const propKey = `${spec.pset}.${spec.property}`;
          this.propertyMap.set(propKey, spec);
        }
      }

      console.log(`[RAVASpecificationMapper] Loaded ${this.specifications.size} specifications from Excel`);
    } catch (error) {
      console.error('[RAVASpecificationMapper] Error loading Excel:', error);
      throw error;
    }
  }

  /**
   * Busca una especificación por property set y property name
   */
  getSpecificationByProperty(pset: string, propertyName: string): RAVASpecification | undefined {
    const key = `${pset}.${propertyName}`;
    return this.propertyMap.get(key);
  }

  /**
   * Busca una especificación por clase y atributo
   */
  getSpecificationByClass(luokka: string, attribuutti: string): RAVASpecification | undefined {
    const key = `${luokka}|${attribuutti}`;
    return this.specifications.get(key);
  }

  /**
   * Busca todas las especificaciones para una entidad IFC
   */
  getSpecificationsByEntity(entity: string): RAVASpecification[] {
    const results: RAVASpecification[] = [];
    for (const spec of this.specifications.values()) {
      if (spec.entity === entity || spec.entity === `Ifc${entity}`) {
        results.push(spec);
      }
    }
    return results;
  }

  /**
   * Obtiene todas las especificaciones cargadas
   */
  getAllSpecifications(): RAVASpecification[] {
    return Array.from(this.specifications.values());
  }

  /**
   * Resuelve el URI completo de un koodisto basado en su nombre
   * Mapea nombres conocidos de koodistot a sus URIs oficiales en uri.suomi.fi
   */
  private resolveKoodistoUri(koodistoName?: string): string | undefined {
    if (!koodistoName) return undefined;

    const koodistoMap: Record<string, string> = {
      'Rakenteellinen järjestelmä': 'http://uri.suomi.fi/codelist/rakrek/raktkk_builtsystem_1_0',
      'Paloluokka': 'http://uri.suomi.fi/codelist/rytj/Paloluokka',
      'Sisäänkäynnin tyyppi': 'http://uri.suomi.fi/codelist/rytj/sisaankaynti',
      'Tilan käyttötarkoitus': 'http://uri.suomi.fi/codelist/rakrek/occupancytype_1_0',
      'Kaiteen laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_railing_4_0_2_1',
      'Katon laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_roof_4_0_2_1',
      'Laatan laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_slab_4_0_2_1',
      'Luiskan laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_ramp_4_0_2_1',
      'Paalun laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_pile_4_0_2_1',
      'Palkin laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_beam_4_0_2_1',
      'Pilarin laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_column_4_0_2_1',
      'Portaan laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_stair_4_0_2_1',
      'Seinän laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_wall_4_0_2_1',
      'Ikkunan laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_window_4_0_2_1',
      'Kalusteen laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_furniture_4_0_2_1',
      'Laitteen laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_electricappliance_4_0_2_1',
      'Oven laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_door_4_0_2_1',
      'Tilan laji': 'http://uri.suomi.fi/codelist/rakrek/raktkk_space_4_0_2_1',
      'Rakennuksen tietomallin laji': 'https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji',
      'Kaavatilanne': 'https://iri.suomi.fi/model/raklu/kaavatilanne',
      'Rakentamistoimenpide': 'https://iri.suomi.fi/model/raklu/rakentamistoimenpide',
      'Omistajalaji': 'https://iri.suomi.fi/model/raklu/omistajalaji',
      'Rakennuspaikan hallintaperuste': 'https://iri.suomi.fi/model/raklu/hallintaperuste',
    };

    // Buscar coincidencia exacta o parcial
    const normalizedName = koodistoName.trim();
    const exactMatch = koodistoMap[normalizedName];
    if (exactMatch) return exactMatch;

    // Buscar coincidencia parcial (por si el nombre varía ligeramente)
    for (const [key, uri] of Object.entries(koodistoMap)) {
      if (normalizedName.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(normalizedName.toLowerCase())) {
        return uri;
      }
    }

    return undefined;
  }

  /**
   * Obtiene información adicional sobre un koodisto desde su URI
   * Útil para validar valores contra códigos oficiales
   * 
   * Los koodistot en uri.suomi.fi pueden estar disponibles en diferentes formatos:
   * - HTML (para visualización)
   * - JSON-LD / RDF (para consumo programático)
   * - API REST (si está disponible)
   */
  async fetchKoodistoValues(koodistoUri: string): Promise<{
    uri: string;
    name?: string;
    description?: string;
    values: Array<{
      code: string;
      label: string;
      description?: string;
    }>;
    source: 'api' | 'parsed' | 'cached' | 'unknown';
  } | null> {
    try {
      console.log(`[RAVASpecificationMapper] Fetching koodisto: ${koodistoUri}`);

      // Intentar obtener desde cache primero
      const cached = this.getCachedKoodisto(koodistoUri);
      if (cached) {
        return { ...cached, source: 'cached' };
      }

      // Intentar fetch desde API/JSON-LD
      try {
        const response = await fetch(koodistoUri, {
          headers: {
            'Accept': 'application/json, application/ld+json, application/rdf+xml, text/html',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json') || contentType.includes('application/ld+json')) {
          const data = await response.json();
          const parsed = this.parseKoodistoJSON(data);
          if (parsed) {
            this.cacheKoodisto(koodistoUri, parsed);
            return { ...parsed, source: 'api' };
          }
        } else if (contentType.includes('text/html')) {
          // Intentar parsear HTML (fallback)
          const html = await response.text();
          const parsed = this.parseKoodistoHTML(html, koodistoUri);
          if (parsed && parsed.values.length > 0) {
            this.cacheKoodisto(koodistoUri, parsed);
            return { ...parsed, source: 'parsed' };
          }
        }
      } catch (fetchError) {
        console.warn(`[RAVASpecificationMapper] Could not fetch koodisto from URI, trying fallback:`, fetchError);
      }

      // Fallback: usar valores conocidos de algunos koodistot comunes
      const fallbackValues = this.getFallbackKoodistoValues(koodistoUri);
      if (fallbackValues) {
        return { ...fallbackValues, source: 'unknown' };
      }

      return null;
    } catch (error) {
      console.error(`[RAVASpecificationMapper] Error fetching koodisto:`, error);
      return null;
    }
  }

  private koodistoCache: Map<string, any> = new Map();

  private getCachedKoodisto(uri: string): any {
    return this.koodistoCache.get(uri);
  }

  private cacheKoodisto(uri: string, data: any): void {
    this.koodistoCache.set(uri, data);
  }

  /**
   * Parsea respuesta JSON/JSON-LD de un koodisto
   */
  private parseKoodistoJSON(data: any): {
    uri: string;
    name?: string;
    description?: string;
    values: Array<{ code: string; label: string; description?: string }>;
  } | null {
    try {
      // Intentar diferentes formatos de respuesta
      let items: any[] = [];
      let name: string | undefined;
      let description: string | undefined;

      // Formato 1: Array directo
      if (Array.isArray(data)) {
        items = data;
      }
      // Formato 2: Objeto con array en alguna propiedad
      else if (data['@graph']) {
        items = data['@graph'];
      }
      else if (data.items || data.members || data.concepts) {
        items = data.items || data.members || data.concepts;
      }
      // Formato 3: JSON-LD con estructura específica
      else if (data['@type'] && (data['@type'].includes('ConceptScheme') || data['@type'].includes('CodeList'))) {
        name = data.name || data.label || data['skos:prefLabel'];
        description = data.description || data['skos:definition'];
        if (data.hasTopConcept) {
          items = Array.isArray(data.hasTopConcept) ? data.hasTopConcept : [data.hasTopConcept];
        }
      }

      if (items.length === 0) return null;

      const values = items
        .map((item: any) => {
          const code = item.code || item.identifier || item['skos:notation'] || item['@id']?.split('/').pop();
          const label = item.label || item.name || item['skos:prefLabel'] || item.title;
          const desc = item.description || item['skos:definition'] || item.comment;

          if (!code || !label) return null;

          return {
            code: String(code),
            label: String(label),
            description: desc ? String(desc) : undefined,
          };
        })
        .filter((v: any) => v !== null);

      return {
        uri: data['@id'] || data.uri || '',
        name: name || data.name || data.label,
        description: description || data.description,
        values,
      };
    } catch (error) {
      console.error('[RAVASpecificationMapper] Error parsing JSON koodisto:', error);
      return null;
    }
  }

  /**
   * Parsea HTML de un koodisto (fallback)
   */
  private parseKoodistoHTML(html: string, uri: string): {
    uri: string;
    values: Array<{ code: string; label: string }>;
  } | null {
    // Implementación básica - podría mejorarse con DOMParser si está disponible
    // Por ahora retornamos null y confiamos en fallback values
    return null;
  }

  /**
   * Valores conocidos para koodistot comunes (fallback)
   */
  private getFallbackKoodistoValues(uri: string): {
    uri: string;
    name: string;
    values: Array<{ code: string; label: string }>;
  } | null {
    const fallbackMap: Record<string, { name: string; values: Array<{ code: string; label: string }> }> = {
      'http://uri.suomi.fi/codelist/rytj/Paloluokka': {
        name: 'Paloluokka',
        values: [
          { code: 'P1', label: 'P1' },
          { code: 'P2', label: 'P2' },
          { code: 'P3', label: 'P3' },
          { code: 'P4', label: 'P4' },
        ],
      },
      'http://uri.suomi.fi/codelist/rytj/sisaankaynti': {
        name: 'Sisäänkäynnin tyyppi',
        values: [
          { code: 'Pääsisäänkäynti', label: 'Pääsisäänkäynti' },
          { code: 'Sivusisäänkäynti', label: 'Sivusisäänkäynti' },
          { code: 'Palvelusisäänkäynti', label: 'Palvelusisäänkäynti' },
        ],
      },
    };

    const fallback = fallbackMap[uri];
    if (!fallback) return null;

    return {
      uri,
      name: fallback.name,
      values: fallback.values,
    };
  }

  /**
   * Valida si un valor está permitido según un koodisto
   */
  async validateValueAgainstKoodisto(
    koodistoUri: string,
    value: string
  ): Promise<{
    isValid: boolean;
    matchedValue?: { code: string; label: string; description?: string };
    koodistoInfo?: { name?: string; description?: string; values: Array<{ code: string; label: string }> };
  }> {
    const koodistoData = await this.fetchKoodistoValues(koodistoUri);
    
    if (!koodistoData || !koodistoData.values || koodistoData.values.length === 0) {
      return { isValid: false };
    }

    const normalizedValue = value.trim().toLowerCase();
    
    // Buscar coincidencia exacta o por código/etiqueta
    const matchedValue = koodistoData.values.find(
      (item) =>
        item.code.toLowerCase() === normalizedValue ||
        item.label.toLowerCase() === normalizedValue ||
        item.code.toLowerCase().includes(normalizedValue) ||
        item.label.toLowerCase().includes(normalizedValue)
    );

    return {
      isValid: !!matchedValue,
      matchedValue: matchedValue || undefined,
      koodistoInfo: {
        name: koodistoData.name,
        description: koodistoData.description,
        values: koodistoData.values.map(v => ({ code: v.code, label: v.label })),
      },
    };
  }
}
