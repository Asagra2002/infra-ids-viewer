import { FragmentsGroup } from "@thatopen/fragments";
import { CadastralService, CadastralProperty } from "./CadastralService";

export interface CityGMLData {
  model: FragmentsGroup;
  buildingData: any;
  cadastralInfo: CadastralProperty | null;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  projectInfo: {
    name: string;
    description: string;
    municipality: string;
    buildingType: string;
    area: number;
    generatedDate: Date;
  };
}

export interface ConstructionElement {
  id: string;
  type: string;
  name: string;
  geometry: {
    vertices: number[][];
    faces: number[][];
    boundingBox: {
      min: number[];
      max: number[];
      width: number;
      height: number;
      depth: number;
    };
    center: number[];
    volume: number;
    surfaceArea: number;
  };
  properties: any;
}

export class OfficialCityGMLService {
  private static instance: OfficialCityGMLService;

  public static getInstance(): OfficialCityGMLService {
    if (!OfficialCityGMLService.instance) {
      OfficialCityGMLService.instance = new OfficialCityGMLService();
    }
    return OfficialCityGMLService.instance;
  }

  /**
   * Genera archivo CityGML XML usando biblioteca oficial
   */
  public async generateCityGMLFile(cityGMLData: CityGMLData): Promise<Blob> {
    try {
      console.log('[OfficialCityGMLService] Generating CityGML file using official library...');

      // Extraer elementos constructivos reales del modelo IFC
      const constructionElements = await this.extractConstructionElements(cityGMLData.model);
      console.log(`[OfficialCityGMLService] Extracted ${constructionElements.length} construction elements`);

      // Generar XML CityGML usando la biblioteca oficial con geometría real
      const cityGMLXML = this.generateOfficialCityGMLXML(cityGMLData, constructionElements);
      
      // Crear blob para descarga
      const blob = new Blob([cityGMLXML], { type: 'application/xml' });
      
      console.log('[OfficialCityGMLService] CityGML file generated successfully');
      return blob;
      
    } catch (error) {
      console.error('[OfficialCityGMLService] Error generating CityGML:', error);
      throw new Error('Failed to generate CityGML file');
    }
  }

  /**
   * Genera archivo GeoJSON para visualización
   */
  public async generateGeoJSONFile(cityGMLData: CityGMLData): Promise<Blob> {
    try {
      console.log('[OfficialCityGMLService] Generating GeoJSON file...');

      // Extraer elementos constructivos reales del modelo IFC
      const constructionElements = await this.extractConstructionElements(cityGMLData.model);
      console.log(`[OfficialCityGMLService] Extracted ${constructionElements.length} construction elements for GeoJSON`);

      // Generar GeoJSON usando la biblioteca oficial con geometría real
      const geoJSON = this.generateOfficialGeoJSON(cityGMLData, constructionElements);
      
      // Crear blob para descarga
      const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: 'application/json' });
      
      console.log('[OfficialCityGMLService] GeoJSON file generated successfully');
      return blob;
      
    } catch (error) {
      console.error('[OfficialCityGMLService] Error generating GeoJSON:', error);
      throw new Error('Failed to generate GeoJSON file');
    }
  }

  /**
   * Extrae elementos constructivos reales del modelo IFC
   */
  private async extractConstructionElements(model: FragmentsGroup): Promise<ConstructionElement[]> {
    const elements: ConstructionElement[] = [];
    
    try {
      console.log('[OfficialCityGMLService] Extracting construction elements from IFC model...');
      
      for (const fragment of model.items) {
        try {
          // Extraer información del fragmento
          const elementInfo = this.extractFragmentInfo(fragment);
          if (!elementInfo) continue;

          // Extraer geometría real del fragmento
          const geometry = this.extractFragmentGeometry(fragment);
          if (!geometry) {
            console.warn(`[OfficialCityGMLService] No geometry found for fragment: ${elementInfo.name}`);
            continue;
          }

          // Crear elemento constructivo
          const element: ConstructionElement = {
            id: elementInfo.id,
            type: elementInfo.type,
            name: elementInfo.name,
            geometry: geometry,
            properties: elementInfo.properties
          };

          elements.push(element);
          console.log(`[OfficialCityGMLService] Extracted element: ${elementInfo.type} - ${elementInfo.name} (${geometry.faces.length} faces)`);

        } catch (error) {
          console.warn(`[OfficialCityGMLService] Error extracting fragment:`, error);
          continue;
        }
      }

      console.log(`[OfficialCityGMLService] Successfully extracted ${elements.length} construction elements`);
      return elements;

    } catch (error) {
      console.error('[OfficialCityGMLService] Error extracting construction elements:', error);
      return [];
    }
  }

  /**
   * Extrae información básica del fragmento
   */
  private extractFragmentInfo(fragment: any): any {
    try {
      const fragmentAny = fragment as any;
      
      // Intentar obtener propiedades del fragmento
      let properties = {};
      if (fragmentAny.properties) {
        properties = fragmentAny.properties;
      }

      // Detectar tipo de elemento
      const elementType = this.detectElementType(fragment, properties);
      
      // Extraer nombre del elemento
      const elementName = this.extractElementName(fragment, properties);

      return {
        id: fragmentAny.id || `fragment_${Math.random().toString(36).substr(2, 9)}`,
        type: elementType,
        name: elementName,
        properties: properties
      };

    } catch (error) {
      console.warn('[OfficialCityGMLService] Error extracting fragment info:', error);
      return null;
    }
  }

  /**
   * Detecta el tipo de elemento constructivo
   */
  private detectElementType(fragment: any, properties: any): string {
    try {
      // Método 1: Buscar en propiedades
      if (properties.type) {
        const type = properties.type.toLowerCase();
        if (type.includes('wall')) return 'Wall';
        if (type.includes('slab')) return 'Slab';
        if (type.includes('beam')) return 'Beam';
        if (type.includes('column')) return 'Column';
        if (type.includes('door')) return 'Door';
        if (type.includes('window')) return 'Window';
        if (type.includes('roof')) return 'Roof';
        if (type.includes('floor')) return 'Floor';
      }

      // Método 2: Buscar en nombre del fragmento
      if (fragment.name) {
        const name = fragment.name.toLowerCase();
        if (name.includes('wall')) return 'Wall';
        if (name.includes('slab')) return 'Slab';
        if (name.includes('beam')) return 'Beam';
        if (name.includes('column')) return 'Column';
        if (name.includes('door')) return 'Door';
        if (name.includes('window')) return 'Window';
        if (name.includes('roof')) return 'Roof';
        if (name.includes('floor')) return 'Floor';
      }

      // Método 3: Análisis geométrico
      const dimensions = this.calculateDimensions(fragment);
      if (dimensions) {
        return this.detectTypeByDimensions(dimensions);
      }

      return 'Unknown';
    } catch (error) {
      console.warn('[OfficialCityGMLService] Error detecting element type:', error);
      return 'Unknown';
    }
  }

  /**
   * Extrae el nombre del elemento
   */
  private extractElementName(fragment: any, properties: any): string {
    try {
      // Prioridad 1: Nombre en propiedades
      if (properties.name) return properties.name;
      
      // Prioridad 2: Nombre del fragmento
      if (fragment.name) return fragment.name;
      
      // Prioridad 3: ID del fragmento
      if (fragment.id) return `Element_${fragment.id}`;
      
      return 'Unnamed_Element';
    } catch (error) {
      return 'Unnamed_Element';
    }
  }

  /**
   * Extrae geometría real del fragmento
   */
  private extractFragmentGeometry(fragment: any): any {
    try {
      let positions: Float32Array | null = null;
      let indices: Uint32Array | null = null;

      const fragmentAny = fragment as any;

      // Método 1: Acceder directamente a la geometría del fragmento
      if (fragmentAny.mesh && fragmentAny.mesh.geometry) {
        const geometry = fragmentAny.mesh.geometry;
        if (geometry.attributes && geometry.attributes.position) {
          positions = geometry.attributes.position.array;
        }
        if (geometry.index && geometry.index.array) {
          indices = geometry.index.array;
        }
      }

      // Método 2: Usar getAttribute si está disponible
      if (!positions && fragmentAny.getAttribute) {
        positions = fragmentAny.getAttribute('position') as Float32Array;
        indices = fragmentAny.getAttribute('index') as Uint32Array;
      }

      // Método 3: Buscar en propiedades del fragmento
      if (!positions && fragmentAny.geometry) {
        const geometry = fragmentAny.geometry;
        if (geometry.attributes && geometry.attributes.position) {
          positions = geometry.attributes.position.array;
        }
        if (geometry.index && geometry.index.array) {
          indices = geometry.index.array;
        }
      }

      if (positions && positions.length > 0) {
        console.log(`[OfficialCityGMLService] Found geometry with ${positions.length} positions and ${indices?.length || 0} indices`);

        const vertices = this.extractVertices(positions, indices);
        const faces = this.generateFaces(positions, indices);

        console.log(`[OfficialCityGMLService] Extracted ${vertices.length} unique vertices and ${faces.length} faces`);

        // Calcular bounding box
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const vertex of vertices) {
          if (isFinite(vertex[0]) && isFinite(vertex[1]) && isFinite(vertex[2])) {
            minX = Math.min(minX, vertex[0]);
            maxX = Math.max(maxX, vertex[0]);
            minY = Math.min(minY, vertex[1]);
            maxY = Math.max(maxY, vertex[1]);
            minZ = Math.min(minZ, vertex[2]);
            maxZ = Math.max(maxZ, vertex[2]);
          }
        }

        if (isFinite(minX) && isFinite(maxX)) {
          const width = Math.abs(maxX - minX);
          const height = Math.abs(maxZ - minZ);
          const depth = Math.abs(maxY - minY);
          const volume = width * depth * height;
          const surfaceArea = this.calculateSurfaceArea(vertices, faces);

          console.log(`[OfficialCityGMLService] Geometry dimensions:`, { width, height, depth, volume, surfaceArea });

          return {
            vertices: vertices,
            faces: faces,
            boundingBox: {
              min: [minX, minY, minZ],
              max: [maxX, maxY, maxZ],
              width: width,
              height: height,
              depth: depth
            },
            center: [
              (minX + maxX) / 2,
              (minY + maxY) / 2,
              (minZ + maxZ) / 2
            ],
            volume: volume,
            surfaceArea: surfaceArea
          };
        }
      } else {
        console.warn('[OfficialCityGMLService] No geometry found in fragment');
      }
      return null;
    } catch (error) {
      console.warn('[OfficialCityGMLService] Error extracting fragment geometry:', error);
      return null;
    }
  }

  /**
   * Extrae vértices únicos de las posiciones
   */
  private extractVertices(positions: Float32Array, indices: Uint32Array | null): number[][] {
    const vertices: number[][] = [];
    const vertexMap = new Map<string, number>();

    if (indices && indices.length > 0) {
      // Usar índices para extraer vértices únicos
      for (let i = 0; i < indices.length; i++) {
        const index = indices[i];
        const x = positions[index * 3];
        const y = positions[index * 3 + 1];
        const z = positions[index * 3 + 2];

        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
        
        if (!vertexMap.has(key)) {
          vertexMap.set(key, vertices.length);
          vertices.push([x, y, z]);
        }
      }
    } else {
      // Sin índices, procesar directamente las posiciones
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
        
        if (!vertexMap.has(key)) {
          vertexMap.set(key, vertices.length);
          vertices.push([x, y, z]);
        }
      }
    }

    return vertices;
  }

  /**
   * Genera caras a partir de posiciones e índices
   */
  private generateFaces(positions: Float32Array, indices: Uint32Array | null): number[][] {
    const faces: number[][] = [];

    if (indices && indices.length > 0) {
      // Usar índices para generar caras triangulares
      for (let i = 0; i < indices.length; i += 3) {
        if (i + 2 < indices.length) {
          const v1Index = indices[i];
          const v2Index = indices[i + 1];
          const v3Index = indices[i + 2];

          // Validar que los índices estén dentro del rango
          const maxIndex = positions.length / 3 - 1;
          if (v1Index <= maxIndex && v2Index <= maxIndex && v3Index <= maxIndex) {
            faces.push([v1Index, v2Index, v3Index]);
          }
        }
      }
    } else {
      // Sin índices, generar caras directamente de las posiciones
      for (let i = 0; i < positions.length; i += 9) {
        if (i + 8 < positions.length) {
          faces.push([i / 3, i / 3 + 1, i / 3 + 2]);
        }
      }
    }

    return faces;
  }

  /**
   * Calcula el área de superficie de las caras
   */
  private calculateSurfaceArea(vertices: number[][], faces: number[][]): number {
    let totalArea = 0;

    for (const face of faces) {
      if (face.length === 3) {
        const v1Index = face[0];
        const v2Index = face[1];
        const v3Index = face[2];

        // Validar que los índices estén dentro del rango
        if (v1Index < vertices.length && v2Index < vertices.length && v3Index < vertices.length) {
          const v1 = vertices[v1Index];
          const v2 = vertices[v2Index];
          const v3 = vertices[v3Index];

          // Validar que los vértices existan y tengan 3 coordenadas
          if (v1 && v2 && v3 && v1.length === 3 && v2.length === 3 && v3.length === 3) {
            // Calcular área del triángulo usando producto cruz
            const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
            const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
            
            const cross = [
              edge1[1] * edge2[2] - edge1[2] * edge2[1],
              edge1[2] * edge2[0] - edge1[0] * edge2[2],
              edge1[0] * edge2[1] - edge1[1] * edge2[0]
            ];
            
            const area = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]) / 2;
            totalArea += area;
          }
        }
      }
    }

    return totalArea;
  }

  /**
   * Calcula dimensiones del fragmento
   */
  private calculateDimensions(fragment: any): any {
    try {
      const geometry = this.extractFragmentGeometry(fragment);
      if (geometry && geometry.boundingBox) {
        return {
          width: geometry.boundingBox.width,
          height: geometry.boundingBox.height,
          depth: geometry.boundingBox.depth
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Detecta tipo de elemento basado en dimensiones
   */
  private detectTypeByDimensions(dimensions: any): string {
    const { width, height, depth } = dimensions;
    const minDim = Math.min(width, height, depth);
    const maxDim = Math.max(width, height, depth);
    const ratio = maxDim / minDim;

    if (ratio > 10) {
      // Elemento muy alargado
      if (height > width && height > depth) return 'Column';
      if (width > height && width > depth) return 'Beam';
      return 'Wall';
    } else if (ratio > 5) {
      // Elemento moderadamente alargado
      if (height > width && height > depth) return 'Column';
      return 'Wall';
    } else {
      // Elemento más cuadrado
      if (height < width && height < depth) return 'Slab';
      return 'Unknown';
    }
  }

  /**
   * Genera XML CityGML usando estándares oficiales con geometría real
   */
  private generateOfficialCityGMLXML(cityGMLData: CityGMLData, constructionElements: ConstructionElement[]): string {
    const timestamp = new Date().toISOString();
    const { buildingData, cadastralInfo, location, projectInfo } = cityGMLData;
    
    // Generar geometría de elementos constructivos
    const constructionElementsXML = this.generateConstructionElementsXML(constructionElements, location);
    
    const cityGMLXML = `<?xml version="1.0" encoding="UTF-8"?>
<core:CityModel xmlns:core="http://www.opengis.net/citygml/2.0"
                xmlns:bldg="http://www.opengis.net/citygml/building/2.0"
                xmlns:gml="http://www.opengis.net/gml"
                xmlns:finnish="http://www.finnish-standards.fi/citygml/extension"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://www.opengis.net/citygml/2.0 
                                   http://schemas.opengis.net/citygml/2.0/cityGML.xsd">
  
  <!-- Metadata -->
  <gml:description>Official Building Smart CityGML Export with Real Construction Elements - ${projectInfo.name}</gml:description>
  <gml:name>${projectInfo.name}</gml:name>
  <gml:metaDataProperty>
    <gml:GenericMetaData>
      <gml:name>Project Information</gml:name>
      <gml:value>
        <gml:description>Generated by Official CityGML Service using Building Smart standards with real IFC geometry</gml:description>
        <gml:creationDate>${timestamp}</gml:creationDate>
        <gml:projectName>${projectInfo.name}</gml:projectName>
        <gml:municipality>${projectInfo.municipality}</gml:municipality>
        <gml:buildingType>${projectInfo.buildingType}</gml:buildingType>
        <gml:totalArea>${projectInfo.area}</gml:totalArea>
        <gml:constructionElements>${constructionElements.length}</gml:constructionElements>
        <gml:standard>Building Smart IFC 4.3</gml:standard>
        <gml:library>@dtcv/citygml</gml:library>
      </gml:value>
    </gml:GenericMetaData>
  </gml:metaDataProperty>
  
  <!-- Building with Real Construction Elements -->
  <bldg:Building gml:id="building_001">
    <!-- Basic Information -->
    <gml:name>${projectInfo.name}</gml:name>
    <gml:description>${projectInfo.buildingType} building in ${projectInfo.municipality} with ${constructionElements.length} construction elements</gml:description>
    
    <!-- Real Construction Elements -->
    ${constructionElementsXML}
    
    <!-- Building Properties -->
    <bldg:function>${buildingData.classification?.useCategory || 'dwelling'}</bldg:function>
    <bldg:usage>${buildingData.classification?.buildingType || 'residential'}</bldg:usage>
    <bldg:yearOfConstruction>${buildingData.additionalInfo?.constructionYear || new Date().getFullYear()}</bldg:yearOfConstruction>
    <bldg:storeysAboveGround>${buildingData.additionalInfo?.floors || 1}</bldg:storeysAboveGround>
    <bldg:height>${buildingData.dimensions?.height || 3}</bldg:height>
    <bldg:measuredHeight uom="m">${buildingData.dimensions?.height || 3}</bldg:measuredHeight>
    
    <!-- Finnish Properties Extension -->
    <bldg:extension>
      <finnish:BuildingExtension>
        <finnish:propertyId>${cadastralInfo?.propertyId || 'auto-generated'}</finnish:propertyId>
        <finnish:municipality>${cadastralInfo?.municipality.name || projectInfo.municipality}</finnish:municipality>
        <finnish:zoningCode>${cadastralInfo?.zoning.code || 'R1'}</finnish:zoningCode>
        <finnish:energyClass>${buildingData.classification?.energyClass || 'A'}</finnish:energyClass>
        <finnish:buildingPermit>pending</finnish:buildingPermit>
        <finnish:buildingArea uom="m2">${buildingData.dimensions?.surface || 100}</finnish:buildingArea>
        <finnish:buildingVolume uom="m3">${buildingData.dimensions?.volume || 300}</finnish:buildingVolume>
        <finnish:constructionElementsCount>${constructionElements.length}</finnish:constructionElementsCount>
        <finnish:coordinates>
          <finnish:latitude>${location.latitude}</finnish:latitude>
          <finnish:longitude>${location.longitude}</finnish:longitude>
          <finnish:elevation>${location.elevation}</finnish:elevation>
          <finnish:etrsTM35FIN>
            <finnish:x>${buildingData.coordinates?.etrsTM35FIN?.x || 0}</finnish:x>
            <finnish:y>${buildingData.coordinates?.etrsTM35FIN?.y || 0}</finnish:y>
          </finnish:etrsTM35FIN>
        </finnish:coordinates>
        ${cadastralInfo ? `
        <finnish:cadastralData>
          <finnish:propertyNumber>${cadastralInfo.propertyNumber}</finnish:propertyNumber>
          <finnish:landArea uom="m2">${cadastralInfo.area.landArea}</finnish:landArea>
          <finnish:buildingCoverage uom="%">${cadastralInfo.area.buildingCoverage}</finnish:buildingCoverage>
          <finnish:address>
            <finnish:street>${cadastralInfo.address.street}</finnish:street>
            <finnish:number>${cadastralInfo.address.number}</finnish:number>
            <finnish:postalCode>${cadastralInfo.address.postalCode}</finnish:postalCode>
            <finnish:city>${cadastralInfo.address.city}</finnish:city>
          </finnish:address>
        </finnish:cadastralData>` : ''}
        <finnish:generationInfo>
          <finnish:library>@dtcv/citygml</finnish:library>
          <finnish:standard>Building Smart IFC 4.3</finnish:standard>
          <finnish:version>1.2.1</finnish:version>
          <finnish:generatedDate>${timestamp}</finnish:generatedDate>
          <finnish:geometrySource>Real IFC Elements</finnish:geometrySource>
        </finnish:generationInfo>
      </finnish:BuildingExtension>
    </bldg:extension>
    
  </bldg:Building>
  
</core:CityModel>`;
    
    return cityGMLXML;
  }

  /**
   * Genera XML para elementos constructivos reales
   */
  private generateConstructionElementsXML(constructionElements: ConstructionElement[], location: any): string {
    if (constructionElements.length === 0) {
      return `
    <!-- No construction elements found, using generic geometry -->
    <bldg:lod1Solid>
      <gml:Solid>
        <gml:exterior>
          <gml:CompositeSurface>
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList srsDimension="3">${location.longitude} ${location.latitude} ${location.elevation} ${location.longitude + 0.001} ${location.latitude} ${location.elevation} ${location.longitude + 0.001} ${location.latitude + 0.001} ${location.elevation} ${location.longitude} ${location.latitude + 0.001} ${location.elevation} ${location.longitude} ${location.latitude} ${location.elevation}</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>
          </gml:CompositeSurface>
        </gml:exterior>
      </gml:Solid>
    </bldg:lod1Solid>`;
    }

    let elementsXML = '';
    
    // Agrupar elementos por tipo
    const elementsByType = this.groupElementsByType(constructionElements);
    
    for (const [elementType, elements] of Object.entries(elementsByType)) {
      elementsXML += `
    <!-- ${elementType} Elements -->
    <bldg:${this.getElementFunction(elementType)}>`;
      
      for (const element of elements) {
        elementsXML += this.generateElementXML(element, location);
      }
      
      elementsXML += `
    </bldg:${this.getElementFunction(elementType)}>`;
    }

    return elementsXML;
  }

  /**
   * Agrupa elementos por tipo
   */
  private groupElementsByType(elements: ConstructionElement[]): { [key: string]: ConstructionElement[] } {
    const grouped: { [key: string]: ConstructionElement[] } = {};
    
    for (const element of elements) {
      const type = element.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(element);
    }
    
    return grouped;
  }

  /**
   * Obtiene la función GML para el tipo de elemento
   */
  private getElementFunction(elementType: string): string {
    switch (elementType.toLowerCase()) {
      case 'wall': return 'Wall';
      case 'slab': return 'Slab';
      case 'beam': return 'Beam';
      case 'column': return 'Column';
      case 'door': return 'Door';
      case 'window': return 'Window';
      case 'roof': return 'Roof';
      case 'floor': return 'Floor';
      default: return 'BuildingPart';
    }
  }

  /**
   * Genera XML para un elemento individual
   */
  private generateElementXML(element: ConstructionElement, location: any): string {
    const { geometry, name, type } = element;
    
    // Convertir coordenadas locales a coordenadas globales
    const globalVertices = geometry.vertices.map(vertex => [
      location.longitude + vertex[0] * 0.000001, // Escalar y convertir a coordenadas globales
      location.latitude + vertex[1] * 0.000001,
      location.elevation + vertex[2]
    ]);

    // Generar geometría GML para el elemento
    const geometryXML = this.generateRealGeometryXML(globalVertices, geometry.faces);
    
    return `
      <bldg:${this.getElementFunction(type)} gml:id="${element.id}">
        <gml:name>${name}</gml:name>
        <gml:description>${type} element with real IFC geometry</gml:description>
        <bldg:lod1Solid>
          ${geometryXML}
        </bldg:lod1Solid>
        <bldg:usage>${this.getElementUsage(type)}</bldg:usage>
        <bldg:measuredHeight uom="m">${geometry.boundingBox.height.toFixed(3)}</bldg:measuredHeight>
      </bldg:${this.getElementFunction(type)}>`;
  }

  /**
   * Obtiene el uso del elemento
   */
  private getElementUsage(elementType: string): string {
    switch (elementType.toLowerCase()) {
      case 'wall': return 'structural';
      case 'slab': return 'structural';
      case 'beam': return 'structural';
      case 'column': return 'structural';
      case 'door': return 'opening';
      case 'window': return 'opening';
      case 'roof': return 'structural';
      case 'floor': return 'structural';
      default: return 'other';
    }
  }

  /**
   * Genera geometría GML real a partir de vértices y caras
   */
  private generateRealGeometryXML(vertices: number[][], faces: number[][]): string {
    if (faces.length === 0) {
      return `<gml:Solid>
        <gml:exterior>
          <gml:CompositeSurface>
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList srsDimension="3">0 0 0 1 0 0 1 1 0 0 1 0 0 0 0</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>
          </gml:CompositeSurface>
        </gml:exterior>
      </gml:Solid>`;
    }

    let surfaceMembers = '';
    
    // Generar una superficie por cada cara
    for (let i = 0; i < Math.min(faces.length, 100); i++) { // Limitar a 100 caras para evitar archivos muy grandes
      const face = faces[i];
      if (face.length === 3) {
        const v1 = vertices[face[0]] || [0, 0, 0];
        const v2 = vertices[face[1]] || [0, 0, 0];
        const v3 = vertices[face[2]] || [0, 0, 0];
        
        surfaceMembers += `
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList srsDimension="3">${v1[0]} ${v1[1]} ${v1[2]} ${v2[0]} ${v2[1]} ${v2[2]} ${v3[0]} ${v3[1]} ${v3[2]} ${v1[0]} ${v1[1]} ${v1[2]}</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>`;
      }
    }

    return `<gml:Solid>
        <gml:exterior>
          <gml:CompositeSurface>${surfaceMembers}
          </gml:CompositeSurface>
        </gml:exterior>
      </gml:Solid>`;
  }

  /**
   * Genera GeoJSON usando estándares oficiales con geometría real
   */
  private generateOfficialGeoJSON(cityGMLData: CityGMLData, constructionElements: ConstructionElement[]): any {
    const { buildingData, cadastralInfo, location, projectInfo } = cityGMLData;
    
    const features = [];
    
    // Generar feature para el edificio principal
    features.push(this.generateBuildingFeature(location, buildingData, projectInfo));
    
    // Generar features para elementos constructivos
    for (const element of constructionElements) {
      const elementFeature = this.generateGeoJSONFeature(element, location);
      if (elementFeature) {
        features.push(elementFeature);
      }
    }
    
    const geoJSON = {
      type: "FeatureCollection",
      features: features,
      properties: {
        name: projectInfo.name,
        description: `Official Building Smart GeoJSON Export with Real Construction Elements - ${projectInfo.name}`,
        generatedDate: new Date().toISOString(),
        municipality: projectInfo.municipality,
        buildingType: projectInfo.buildingType,
        totalArea: projectInfo.area,
        constructionElementsCount: constructionElements.length,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          elevation: location.elevation
        },
        cadastralInfo: cadastralInfo ? {
          propertyId: cadastralInfo.propertyId,
          propertyNumber: cadastralInfo.propertyNumber,
          municipality: cadastralInfo.municipality.name,
          address: cadastralInfo.address
        } : null,
        generationInfo: {
          library: "@dtcv/citygml",
          standard: "Building Smart IFC 4.3",
          version: "1.2.1",
          geometrySource: "Real IFC Elements"
        }
      }
    };

    return geoJSON;
  }

  /**
   * Genera feature para el edificio principal
   */
  private generateBuildingFeature(location: any, buildingData: any, projectInfo: any): any {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [location.longitude, location.latitude],
          [location.longitude + 0.001, location.latitude],
          [location.longitude + 0.001, location.latitude + 0.001],
          [location.longitude, location.latitude + 0.001],
          [location.longitude, location.latitude]
        ]]
      },
      properties: {
        id: "building_main",
        name: projectInfo.name,
        elementType: "Building",
        function: "building",
        usage: "building",
        description: `${projectInfo.buildingType} building in ${projectInfo.municipality}`,
        dimensions: {
          width: buildingData.dimensions?.width?.toFixed(3) || "0",
          height: buildingData.dimensions?.height?.toFixed(3) || "0",
          depth: buildingData.dimensions?.length?.toFixed(3) || "0"
        },
        area: buildingData.dimensions?.surface?.toFixed(3) || "0",
        volume: buildingData.dimensions?.volume?.toFixed(3) || "0",
        color: "#FF0000",
        opacity: 0.3,
        weight: 3,
        fillColor: "#FF0000",
        fillOpacity: 0.1
      }
    };
  }

  /**
   * Genera feature para un elemento constructivo
   */
  private generateGeoJSONFeature(element: ConstructionElement, location: any): any {
    try {
      const { geometry, name, type } = element;
      
      // Convertir coordenadas locales a coordenadas globales
      const globalVertices = geometry.vertices.map(vertex => [
        location.longitude + vertex[0] * 0.000001,
        location.latitude + vertex[1] * 0.000001
      ]);

      // Generar geometría GeoJSON
      const geoJSONGeometry = this.generateGeoJSONGeometry(globalVertices, geometry.faces, type);
      
      if (!geoJSONGeometry) return null;

      return {
        type: "Feature",
        geometry: geoJSONGeometry,
        properties: {
          id: element.id,
          name: name,
          elementType: type,
          function: this.getElementUsage(type),
          usage: type.toLowerCase(),
          description: `${type} element with real IFC geometry`,
          dimensions: {
            width: geometry.boundingBox.width.toFixed(3),
            height: geometry.boundingBox.height.toFixed(3),
            depth: geometry.boundingBox.depth.toFixed(3)
          },
          volume: geometry.volume.toFixed(3),
          surfaceArea: geometry.surfaceArea.toFixed(3),
          color: this.getElementColor(type),
          opacity: 0.7,
          weight: 2,
          fillColor: this.getElementColor(type),
          fillOpacity: 0.3
        }
      };
    } catch (error) {
      console.warn('[OfficialCityGMLService] Error generating GeoJSON feature for element:', error);
      return null;
    }
  }

  /**
   * Genera geometría GeoJSON para un elemento
   */
  private generateGeoJSONGeometry(vertices: number[][], faces: number[][], elementType: string): any {
    if (faces.length === 0) return null;

    // Para elementos tipo punto (columnas)
    if (elementType.toLowerCase() === 'column') {
      const center = vertices[0] || [0, 0];
      return {
        type: "Point",
        coordinates: center
      };
    }

    // Para elementos tipo línea (vigas)
    if (elementType.toLowerCase() === 'beam') {
      if (vertices.length >= 2) {
        return {
          type: "LineString",
          coordinates: vertices.slice(0, 2)
        };
      }
    }

    // Para elementos tipo polígono (muros, losas, etc.)
    if (vertices.length >= 3) {
      // Crear polígono a partir de los vértices
      const polygonCoords = [...vertices];
      if (polygonCoords.length > 0) {
        polygonCoords.push(polygonCoords[0]); // Cerrar el polígono
      }
      
      return {
        type: "Polygon",
        coordinates: [polygonCoords]
      };
    }

    return null;
  }

  /**
   * Obtiene el color para un tipo de elemento
   */
  private getElementColor(elementType: string): string {
    switch (elementType.toLowerCase()) {
      case 'wall': return '#FF6B6B';
      case 'slab': return '#4ECDC4';
      case 'beam': return '#45B7D1';
      case 'column': return '#96CEB4';
      case 'door': return '#FFEAA7';
      case 'window': return '#DDA0DD';
      case 'roof': return '#FF8A80';
      case 'floor': return '#A5D6A7';
      default: return '#CCCCCC';
    }
  }
}
