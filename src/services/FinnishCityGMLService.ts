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

export class FinnishCityGMLService {
  private static instance: FinnishCityGMLService;

  public static getInstance(): FinnishCityGMLService {
    if (!FinnishCityGMLService.instance) {
      FinnishCityGMLService.instance = new FinnishCityGMLService();
    }
    return FinnishCityGMLService.instance;
  }

  /**
   * Genera archivo CityGML XML con elementos constructivos
   */
  public async generateCityGMLFile(cityGMLData: CityGMLData): Promise<Blob> {
    try {
      console.log('[FinnishCityGMLService] Generating CityGML file with construction elements...');

      // Extraer elementos constructivos del modelo IFC
      const constructionElements = await this.extractConstructionElements(cityGMLData.model);
      
      // Generar XML CityGML con elementos constructivos
      const cityGMLXML = this.generateDetailedCityGMLXML(cityGMLData, constructionElements);
      
      // Crear blob para descarga
      const blob = new Blob([cityGMLXML], { type: 'application/xml' });
      
      console.log('[FinnishCityGMLService] CityGML file generated successfully with', constructionElements.length, 'construction elements');
      return blob;
      
    } catch (error) {
      console.error('[FinnishCityGMLService] Error generating CityGML:', error);
      throw new Error('Failed to generate CityGML file');
    }
  }

  /**
   * Genera archivo GeoJSON para visualización en geojson.io
   */
  public async generateGeoJSONFile(cityGMLData: CityGMLData): Promise<Blob> {
    try {
      console.log('[FinnishCityGMLService] Generating GeoJSON file for geojson.io...');

      // Extraer elementos constructivos del modelo IFC
      const constructionElements = await this.extractConstructionElements(cityGMLData.model);
      
      // Generar GeoJSON con elementos constructivos
      const geoJSON = this.generateGeoJSON(cityGMLData, constructionElements);
      
      // Crear blob para descarga
      const blob = new Blob([JSON.stringify(geoJSON, null, 2)], { type: 'application/json' });
      
      console.log('[FinnishCityGMLService] GeoJSON file generated successfully with', constructionElements.length, 'construction elements');
      return blob;
      
    } catch (error) {
      console.error('[FinnishCityGMLService] Error generating GeoJSON:', error);
      throw new Error('Failed to generate GeoJSON file');
    }
  }

  /**
   * Extrae elementos constructivos del modelo IFC
   */
  private async extractConstructionElements(model: FragmentsGroup): Promise<any[]> {
    const elements: any[] = [];
    
    try {
      console.log('[FinnishCityGMLService] Extracting construction elements from', model.items.length, 'fragments');
      
      for (let i = 0; i < model.items.length; i++) {
        const fragment = model.items[i];
        
        try {
          // Extraer información del fragmento
          const elementInfo = await this.extractFragmentInfo(fragment, i);
          if (elementInfo) {
            elements.push(elementInfo);
          }
        } catch (error) {
          console.warn('[FinnishCityGMLService] Error extracting fragment', i, ':', error);
        }
      }
      
      console.log('[FinnishCityGMLService] Extracted', elements.length, 'construction elements');
      return elements;
      
    } catch (error) {
      console.error('[FinnishCityGMLService] Error extracting construction elements:', error);
      return [];
    }
  }

  /**
   * Extrae información de un fragmento individual
   */
  private async extractFragmentInfo(fragment: any, index: number): Promise<any | null> {
    try {
      // Intentar obtener propiedades del fragmento
      let properties: any = null;
      let elementType = 'Unknown';
      let elementName = `Element_${index}`;
      
      // Intentar acceder a propiedades del fragmento
      if ((fragment as any).properties) {
        properties = (fragment as any).properties;
      }
      
      // Intentar obtener tipo de elemento
      if (properties) {
        elementType = this.detectElementType(properties, fragment);
        elementName = this.extractElementName(properties, fragment) || elementName;
      }
      
      // Extraer geometría básica
      const geometry = this.extractFragmentGeometry(fragment);
      
      // Solo incluir elementos válidos
      if (elementType !== 'Unknown' && geometry) {
        return {
          id: fragment.id || `element_${index}`,
          name: elementName,
          type: elementType,
          geometry: geometry,
          properties: properties,
          index: index
        };
      }
      
      return null;
      
    } catch (error) {
      console.warn('[FinnishCityGMLService] Error extracting fragment info:', error);
      return null;
    }
  }

  /**
   * Detecta el tipo de elemento constructivo usando múltiples métodos
   */
  private detectElementType(properties: any, fragment: any): string {
    try {
      // Método 1: Buscar en propiedades del fragmento
      if (properties) {
        const propsString = JSON.stringify(properties).toLowerCase();
        
        // Mapeo de tipos IFC a CityGML
        if (propsString.includes('ifcwall') || propsString.includes('wall')) {
          console.log('[FinnishCityGMLService] Detected Wall from properties');
          return 'Wall';
        }
        if (propsString.includes('ifcslab') || propsString.includes('slab')) {
          console.log('[FinnishCityGMLService] Detected Slab from properties');
          return 'Slab';
        }
        if (propsString.includes('ifcbeam') || propsString.includes('beam')) {
          console.log('[FinnishCityGMLService] Detected Beam from properties');
          return 'Beam';
        }
        if (propsString.includes('ifccolumn') || propsString.includes('column')) {
          console.log('[FinnishCityGMLService] Detected Column from properties');
          return 'Column';
        }
        if (propsString.includes('ifcwindow') || propsString.includes('window')) {
          console.log('[FinnishCityGMLService] Detected Window from properties');
          return 'Window';
        }
        if (propsString.includes('ifcdoor') || propsString.includes('door')) {
          console.log('[FinnishCityGMLService] Detected Door from properties');
          return 'Door';
        }
        if (propsString.includes('ifcspace') || propsString.includes('space')) {
          console.log('[FinnishCityGMLService] Detected Space from properties');
          return 'Space';
        }
        if (propsString.includes('ifcroom') || propsString.includes('room')) {
          console.log('[FinnishCityGMLService] Detected Room from properties');
          return 'Room';
        }
        if (propsString.includes('ifcstair') || propsString.includes('stair')) {
          console.log('[FinnishCityGMLService] Detected Stair from properties');
          return 'Stair';
        }
        if (propsString.includes('ifcramp') || propsString.includes('ramp')) {
          console.log('[FinnishCityGMLService] Detected Ramp from properties');
          return 'Ramp';
        }
        if (propsString.includes('ifcplate') || propsString.includes('plate')) {
          console.log('[FinnishCityGMLService] Detected Plate from properties');
          return 'Plate';
        }
        if (propsString.includes('ifcshadingdevice') || propsString.includes('shading')) {
          console.log('[FinnishCityGMLService] Detected ShadingDevice from properties');
          return 'ShadingDevice';
        }
      }
      
      // Método 2: Buscar en el nombre del fragmento
      const fragmentName = (fragment.name || '').toLowerCase();
      if (fragmentName.includes('wall')) {
        console.log('[FinnishCityGMLService] Detected Wall from fragment name:', fragment.name);
        return 'Wall';
      }
      if (fragmentName.includes('slab')) {
        console.log('[FinnishCityGMLService] Detected Slab from fragment name:', fragment.name);
        return 'Slab';
      }
      if (fragmentName.includes('beam')) {
        console.log('[FinnishCityGMLService] Detected Beam from fragment name:', fragment.name);
        return 'Beam';
      }
      if (fragmentName.includes('column')) {
        console.log('[FinnishCityGMLService] Detected Column from fragment name:', fragment.name);
        return 'Column';
      }
      if (fragmentName.includes('window')) {
        console.log('[FinnishCityGMLService] Detected Window from fragment name:', fragment.name);
        return 'Window';
      }
      if (fragmentName.includes('door')) {
        console.log('[FinnishCityGMLService] Detected Door from fragment name:', fragment.name);
        return 'Door';
      }
      if (fragmentName.includes('space')) {
        console.log('[FinnishCityGMLService] Detected Space from fragment name:', fragment.name);
        return 'Space';
      }
      if (fragmentName.includes('room')) {
        console.log('[FinnishCityGMLService] Detected Room from fragment name:', fragment.name);
        return 'Room';
      }
      if (fragmentName.includes('stair')) {
        console.log('[FinnishCityGMLService] Detected Stair from fragment name:', fragment.name);
        return 'Stair';
      }
      if (fragmentName.includes('ramp')) {
        console.log('[FinnishCityGMLService] Detected Ramp from fragment name:', fragment.name);
        return 'Ramp';
      }
      if (fragmentName.includes('plate')) {
        console.log('[FinnishCityGMLService] Detected Plate from fragment name:', fragment.name);
        return 'Plate';
      }
      if (fragmentName.includes('shading')) {
        console.log('[FinnishCityGMLService] Detected ShadingDevice from fragment name:', fragment.name);
        return 'ShadingDevice';
      }
      
      // Método 3: Buscar en el ID del fragmento
      const fragmentId = (fragment.id || '').toLowerCase();
      if (fragmentId.includes('wall')) {
        console.log('[FinnishCityGMLService] Detected Wall from fragment ID:', fragment.id);
        return 'Wall';
      }
      if (fragmentId.includes('slab')) {
        console.log('[FinnishCityGMLService] Detected Slab from fragment ID:', fragment.id);
        return 'Slab';
      }
      if (fragmentId.includes('beam')) {
        console.log('[FinnishCityGMLService] Detected Beam from fragment ID:', fragment.id);
        return 'Beam';
      }
      if (fragmentId.includes('column')) {
        console.log('[FinnishCityGMLService] Detected Column from fragment ID:', fragment.id);
        return 'Column';
      }
      if (fragmentId.includes('window')) {
        console.log('[FinnishCityGMLService] Detected Window from fragment ID:', fragment.id);
        return 'Window';
      }
      if (fragmentId.includes('door')) {
        console.log('[FinnishCityGMLService] Detected Door from fragment ID:', fragment.id);
        return 'Door';
      }
      
      // Método 4: Detectar por geometría (último recurso)
      if (fragment.mesh && fragment.mesh.geometry) {
        const geometry = fragment.mesh.geometry;
        const position = geometry.attributes.position?.array;
        if (position && position.length > 0) {
          // Analizar proporciones para determinar tipo
          const vertices = this.extractVertices(position, null);
          if (vertices.length > 0) {
            const dimensions = this.calculateDimensions(vertices);
            const type = this.detectTypeByDimensions(dimensions);
            if (type !== 'Unknown') {
              console.log('[FinnishCityGMLService] Detected', type, 'from geometry dimensions:', dimensions);
              return type;
            }
          }
        }
      }
      
      console.log('[FinnishCityGMLService] Could not detect element type for fragment:', fragment.name || fragment.id);
      return 'Unknown';
      
    } catch (error) {
      console.warn('[FinnishCityGMLService] Error detecting element type:', error);
      return 'Unknown';
    }
  }

  /**
   * Calcula dimensiones de los vértices
   */
  private calculateDimensions(vertices: number[][]): { width: number, height: number, depth: number } {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const vertex of vertices) {
      minX = Math.min(minX, vertex[0]);
      maxX = Math.max(maxX, vertex[0]);
      minY = Math.min(minY, vertex[1]);
      maxY = Math.max(maxY, vertex[1]);
      minZ = Math.min(minZ, vertex[2]);
      maxZ = Math.max(maxZ, vertex[2]);
    }
    
    return {
      width: Math.abs(maxX - minX),
      height: Math.abs(maxZ - minZ),
      depth: Math.abs(maxY - minY)
    };
  }

  /**
   * Detecta tipo de elemento por dimensiones
   */
  private detectTypeByDimensions(dimensions: { width: number, height: number, depth: number }): string {
    const { width, height, depth } = dimensions;
    const maxDim = Math.max(width, height, depth);
    const minDim = Math.min(width, height, depth);
    const ratio = maxDim / minDim;
    
    // Elementos muy altos y delgados son columnas
    if (height > width * 3 && height > depth * 3) {
      return 'Column';
    }
    
    // Elementos muy anchos y delgados son vigas
    if (width > height * 3 && width > depth * 3) {
      return 'Beam';
    }
    
    // Elementos planos y anchos son losas
    if (depth < width * 0.1 && depth < height * 0.1) {
      return 'Slab';
    }
    
    // Elementos con proporciones moderadas son muros
    if (ratio > 2 && ratio < 10) {
      return 'Wall';
    }
    
    return 'Unknown';
  }

  /**
   * Extrae el nombre del elemento
   */
  private extractElementName(properties: any, fragment: any): string | null {
    try {
      // Buscar en propiedades comunes
      const commonNameFields = ['Name', 'name', 'ObjectType', 'objectType', 'Description', 'description'];
      
      for (const field of commonNameFields) {
        if (properties[field] && typeof properties[field] === 'string') {
          return properties[field];
        }
      }
      
      // Buscar en el nombre del fragmento
      if (fragment.name && typeof fragment.name === 'string') {
        return fragment.name;
      }
      
      return null;
      
    } catch (error) {
      console.warn('[FinnishCityGMLService] Error extracting element name:', error);
      return null;
    }
  }

  /**
   * Extrae geometría detallada del fragmento usando la API correcta de OBC
   */
  private extractFragmentGeometry(fragment: any): any | null {
    try {
      // Usar la API correcta de OBC para acceder a la geometría
      let positions: Float32Array | null = null;
      let indices: Uint32Array | null = null;
      
      // Método 1: Acceder directamente a la geometría del fragmento
      if (fragment.mesh && fragment.mesh.geometry) {
        const geometry = fragment.mesh.geometry;
        if (geometry.attributes && geometry.attributes.position) {
          positions = geometry.attributes.position.array;
        }
        if (geometry.index && geometry.index.array) {
          indices = geometry.index.array;
        }
      }
      
      // Método 2: Usar getAttribute si está disponible
      if (!positions && (fragment as any).getAttribute) {
        positions = (fragment as any).getAttribute('position') as Float32Array;
        indices = (fragment as any).getAttribute('index') as Uint32Array;
      }
      
      // Método 3: Buscar en propiedades del fragmento
      if (!positions && (fragment as any).geometry) {
        const geometry = (fragment as any).geometry;
        if (geometry.attributes && geometry.attributes.position) {
          positions = geometry.attributes.position.array;
        }
        if (geometry.index && geometry.index.array) {
          indices = geometry.index.array;
        }
      }
      
      // Método 4: Intentar acceder a través de la API de OBC
      if (!positions && (fragment as any).getGeometry) {
        try {
          const geometry = (fragment as any).getGeometry();
          if (geometry && geometry.attributes && geometry.attributes.position) {
            positions = geometry.attributes.position.array;
          }
          if (geometry && geometry.index && geometry.index.array) {
            indices = geometry.index.array;
          }
        } catch (error) {
          console.warn('[FinnishCityGMLService] Error accessing geometry via getGeometry:', error);
        }
      }
      
      if (positions && positions.length > 0) {
        console.log('[FinnishCityGMLService] Found geometry with', positions.length, 'positions and', indices?.length || 0, 'indices');
        
        // Extraer vértices únicos y generar caras
        const vertices = this.extractVertices(positions, indices);
        const faces = this.generateFaces(positions, indices);
        
        console.log('[FinnishCityGMLService] Extracted', vertices.length, 'unique vertices and', faces.length, 'faces');
        
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
          
          console.log('[FinnishCityGMLService] Geometry dimensions:', { width, height, depth, volume, surfaceArea });
          
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
        console.warn('[FinnishCityGMLService] No geometry found in fragment');
      }
      
      return null;
      
    } catch (error) {
      console.warn('[FinnishCityGMLService] Error extracting fragment geometry:', error);
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
        
        // Verificar que el índice esté dentro del rango válido
        if (index * 3 + 2 < positions.length) {
          const x = positions[index * 3];
          const y = positions[index * 3 + 1];
          const z = positions[index * 3 + 2];
          
          // Verificar que las coordenadas sean válidas
          if (isFinite(x) && isFinite(y) && isFinite(z)) {
            const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
            if (!vertexMap.has(key)) {
              vertexMap.set(key, vertices.length);
              vertices.push([x, y, z]);
            }
          }
        } else {
          console.warn('[FinnishCityGMLService] Invalid index:', index, 'for positions length:', positions.length);
        }
      }
    } else {
      // Sin índices, usar todas las posiciones
      for (let i = 0; i < positions.length; i += 3) {
        if (i + 2 < positions.length) {
          const x = positions[i];
          const y = positions[i + 1];
          const z = positions[i + 2];
          
          // Verificar que las coordenadas sean válidas
          if (isFinite(x) && isFinite(y) && isFinite(z)) {
            const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
            if (!vertexMap.has(key)) {
              vertexMap.set(key, vertices.length);
              vertices.push([x, y, z]);
            }
          }
        }
      }
    }
    
    console.log('[FinnishCityGMLService] Extracted', vertices.length, 'unique vertices from', positions.length, 'positions');
    return vertices;
  }

  /**
   * Genera caras a partir de posiciones e índices
   */
  private generateFaces(positions: Float32Array, indices: Uint32Array | null): number[][] {
    const faces: number[][] = [];
    
    if (indices && indices.length > 0) {
      // Generar caras triangulares usando índices
      for (let i = 0; i < indices.length; i += 3) {
        if (i + 2 < indices.length) {
          const v1 = indices[i];
          const v2 = indices[i + 1];
          const v3 = indices[i + 2];
          
          // Verificar que los índices sean válidos
          if (v1 !== undefined && v2 !== undefined && v3 !== undefined) {
            faces.push([v1, v2, v3]);
          }
        }
      }
    } else {
      // Sin índices, generar caras triangulares secuenciales
      const vertexCount = Math.floor(positions.length / 3);
      for (let i = 0; i < vertexCount; i += 3) {
        if (i + 2 < vertexCount) {
          faces.push([i, i + 1, i + 2]);
        }
      }
    }
    
    console.log('[FinnishCityGMLService] Generated', faces.length, 'faces from', indices?.length || positions.length, 'data points');
    return faces;
  }

  /**
   * Calcula el área de superficie del elemento
   */
  private calculateSurfaceArea(vertices: number[][], faces: number[][]): number {
    let totalArea = 0;
    
    for (const face of faces) {
      if (face.length >= 3) {
        // Verificar que los índices de vértices sean válidos
        const v1Index = face[0];
        const v2Index = face[1];
        const v3Index = face[2];
        
        // Verificar que los índices estén dentro del rango de vértices
        if (v1Index >= 0 && v1Index < vertices.length &&
            v2Index >= 0 && v2Index < vertices.length &&
            v3Index >= 0 && v3Index < vertices.length) {
          
          const v1 = vertices[v1Index];
          const v2 = vertices[v2Index];
          const v3 = vertices[v3Index];
          
          // Verificar que los vértices existan y tengan 3 coordenadas
          if (v1 && v2 && v3 && 
              v1.length >= 3 && v2.length >= 3 && v3.length >= 3) {
            
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
          } else {
            console.warn('[FinnishCityGMLService] Invalid vertices in face:', { v1Index, v2Index, v3Index, verticesLength: vertices.length });
          }
        } else {
          console.warn('[FinnishCityGMLService] Invalid vertex indices in face:', { v1Index, v2Index, v3Index, verticesLength: vertices.length });
        }
      }
    }
    
    return totalArea;
  }

  /**
   * Genera XML CityGML detallado con elementos constructivos
   */
  private generateDetailedCityGMLXML(cityGMLData: CityGMLData, constructionElements: any[]): string {
    const timestamp = new Date().toISOString();
    const { buildingData, cadastralInfo, location, projectInfo } = cityGMLData;
    
    // Agrupar elementos por tipo
    const elementsByType = this.groupElementsByType(constructionElements);
    
    const cityGMLXML = `<?xml version="1.0" encoding="UTF-8"?>
<core:CityModel xmlns:core="http://www.opengis.net/citygml/2.0"
                xmlns:bldg="http://www.opengis.net/citygml/building/2.0"
                xmlns:gml="http://www.opengis.net/gml"
                xmlns:finnish="http://www.finnish-standards.fi/citygml/extension"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://www.opengis.net/citygml/2.0 
                                   http://schemas.opengis.net/citygml/2.0/cityGML.xsd">
  
  <!-- Metadata -->
  <gml:description>Finnish Building Smart CityGML Export - ${projectInfo.name}</gml:description>
  <gml:name>${projectInfo.name}</gml:name>
  <gml:metaDataProperty>
    <gml:GenericMetaData>
      <gml:name>Project Information</gml:name>
      <gml:value>
        <gml:description>Generated by Finnish CityGML Service</gml:description>
        <gml:creationDate>${timestamp}</gml:creationDate>
        <gml:projectName>${projectInfo.name}</gml:projectName>
        <gml:municipality>${projectInfo.municipality}</gml:municipality>
        <gml:buildingType>${projectInfo.buildingType}</gml:buildingType>
        <gml:totalArea>${projectInfo.area}</gml:totalArea>
        <gml:constructionElements>${constructionElements.length}</gml:constructionElements>
      </gml:value>
    </gml:GenericMetaData>
  </gml:metaDataProperty>
  
  <!-- Building -->
  <bldg:Building gml:id="building_001">
    <!-- Basic Information -->
    <gml:name>${projectInfo.name}</gml:name>
    <gml:description>${projectInfo.buildingType} building in ${projectInfo.municipality}</gml:description>
    
    <!-- Geometry -->
    <bldg:lod1Solid>
      <gml:Solid>
        <gml:exterior>
          <gml:CompositeSurface>
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList>${location.longitude} ${location.latitude} ${location.elevation}</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>
          </gml:CompositeSurface>
        </gml:exterior>
      </gml:Solid>
    </bldg:lod1Solid>
    
    <!-- Building Properties -->
    <bldg:function>${buildingData.classification?.useCategory || 'dwelling'}</bldg:function>
    <bldg:usage>${buildingData.classification?.buildingType || 'residential'}</bldg:usage>
    <bldg:yearOfConstruction>${buildingData.additionalInfo?.constructionYear || new Date().getFullYear()}</bldg:yearOfConstruction>
    <bldg:storeysAboveGround>${buildingData.additionalInfo?.floors || 1}</bldg:storeysAboveGround>
    <bldg:height>${buildingData.dimensions?.height || 3}</bldg:height>
    <bldg:measuredHeight uom="m">${buildingData.dimensions?.height || 3}</bldg:measuredHeight>
    
    <!-- Construction Elements -->
    ${this.generateConstructionElementsXML(elementsByType)}
    
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
        <finnish:constructionElements>
          <finnish:totalElements>${constructionElements.length}</finnish:totalElements>
          ${Object.entries(elementsByType).map(([type, elements]) => `
          <finnish:elementType>
            <finnish:type>${type}</finnish:type>
            <finnish:count>${elements.length}</finnish:count>
          </finnish:elementType>`).join('')}
        </finnish:constructionElements>
      </finnish:BuildingExtension>
    </bldg:extension>
    
  </bldg:Building>
  
</core:CityModel>`;
    
    return cityGMLXML;
  }

  /**
   * Agrupa elementos por tipo
   */
  private groupElementsByType(elements: any[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};
    
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
   * Genera XML para elementos constructivos
   */
  private generateConstructionElementsXML(elementsByType: { [key: string]: any[] }): string {
    let xml = '';
    
    // Generar elementos por tipo
    for (const [type, elements] of Object.entries(elementsByType)) {
      xml += `    <!-- ${type} Elements -->\n`;
      
      for (const element of elements) {
        xml += this.generateElementXML(element, type);
      }
    }
    
    return xml;
  }

  /**
   * Genera XML para un elemento individual con geometría real
   */
  private generateElementXML(element: any, type: string): string {
    const geometry = element.geometry;
    const center = geometry.center;
    
    // Generar geometría real usando vértices y caras
    const geometryXML = this.generateRealGeometryXML(geometry);
    
    return `    <bldg:${type.toLowerCase()} gml:id="${element.id}">
      <gml:name>${element.name}</gml:name>
      <gml:description>${type} element with real geometry</gml:description>
      
      <!-- Real Geometry -->
      <bldg:lod1Geometry>
        ${geometryXML}
      </bldg:lod1Geometry>
      
      <!-- Element Properties -->
      <bldg:function>${this.getElementFunction(type)}</bldg:function>
      <bldg:usage>${this.getElementUsage(type)}</bldg:usage>
      <bldg:measuredHeight uom="m">${geometry.boundingBox.height.toFixed(3)}</bldg:measuredHeight>
      <bldg:measuredWidth uom="m">${geometry.boundingBox.width.toFixed(3)}</bldg:measuredWidth>
      <bldg:measuredDepth uom="m">${geometry.boundingBox.depth.toFixed(3)}</bldg:measuredDepth>
      
      <!-- Finnish Properties -->
      <bldg:extension>
        <finnish:ElementExtension>
          <finnish:elementType>${type}</finnish:elementType>
          <finnish:elementId>${element.id}</finnish:elementId>
          <finnish:volume uom="m3">${geometry.volume.toFixed(3)}</finnish:volume>
          <finnish:surfaceArea uom="m2">${geometry.surfaceArea.toFixed(3)}</finnish:surfaceArea>
          <finnish:vertexCount>${geometry.vertices.length}</finnish:vertexCount>
          <finnish:faceCount>${geometry.faces.length}</finnish:faceCount>
          <finnish:center>
            <finnish:x>${center[0].toFixed(6)}</finnish:x>
            <finnish:y>${center[1].toFixed(6)}</finnish:y>
            <finnish:z>${center[2].toFixed(6)}</finnish:z>
          </finnish:center>
          <finnish:boundingBox>
            <finnish:min>
              <finnish:x>${geometry.boundingBox.min[0].toFixed(6)}</finnish:x>
              <finnish:y>${geometry.boundingBox.min[1].toFixed(6)}</finnish:y>
              <finnish:z>${geometry.boundingBox.min[2].toFixed(6)}</finnish:z>
            </finnish:min>
            <finnish:max>
              <finnish:x>${geometry.boundingBox.max[0].toFixed(6)}</finnish:x>
              <finnish:y>${geometry.boundingBox.max[1].toFixed(6)}</finnish:y>
              <finnish:z>${geometry.boundingBox.max[2].toFixed(6)}</finnish:z>
            </finnish:max>
          </finnish:boundingBox>
        </finnish:ElementExtension>
      </bldg:extension>
      
    </bldg:${type.toLowerCase()}>\n`;
  }

  /**
   * Genera GeoJSON con elementos constructivos
   */
  private generateGeoJSON(cityGMLData: CityGMLData, constructionElements: any[]): any {
    const { buildingData, cadastralInfo, location, projectInfo } = cityGMLData;
    
    // Agrupar elementos por tipo
    const elementsByType = this.groupElementsByType(constructionElements);
    
    const geoJSON = {
      type: "FeatureCollection",
      features: [],
      properties: {
        name: projectInfo.name,
        description: `Finnish Building Smart GeoJSON Export - ${projectInfo.name}`,
        generatedDate: new Date().toISOString(),
        municipality: projectInfo.municipality,
        buildingType: projectInfo.buildingType,
        totalArea: projectInfo.area,
        totalElements: constructionElements.length,
        elementTypes: Object.keys(elementsByType).map(type => ({
          type: type,
          count: elementsByType[type].length
        })),
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
        } : null
      }
    };

    // Generar features para cada elemento constructivo
    for (const [type, elements] of Object.entries(elementsByType)) {
      for (const element of elements) {
        const feature = this.generateGeoJSONFeature(element, type, cityGMLData);
        if (feature) {
          geoJSON.features.push(feature);
        }
      }
    }

    // Agregar feature del edificio completo
    const buildingFeature = this.generateBuildingFeature(cityGMLData);
    if (buildingFeature) {
      geoJSON.features.unshift(buildingFeature); // Agregar al inicio
    }

    return geoJSON;
  }

  /**
   * Genera feature GeoJSON para un elemento individual
   */
  private generateGeoJSONFeature(element: any, type: string, cityGMLData: CityGMLData): any {
    const geometry = element.geometry;
    const { location } = cityGMLData;
    
    if (!geometry || !geometry.vertices || geometry.vertices.length === 0) {
      return null;
    }

    // Convertir coordenadas locales a coordenadas geográficas
    const geoCoordinates = this.convertToGeoCoordinates(geometry.vertices, location);
    
    // Generar geometría GeoJSON
    const geoJSONGeometry = this.generateGeoJSONGeometry(geoCoordinates, type);
    
    if (!geoJSONGeometry) {
      return null;
    }

    return {
      type: "Feature",
      geometry: geoJSONGeometry,
      properties: {
        id: element.id,
        name: element.name,
        elementType: type,
        function: this.getElementFunction(type),
        usage: this.getElementUsage(type),
        dimensions: {
          width: geometry.boundingBox.width.toFixed(3),
          height: geometry.boundingBox.height.toFixed(3),
          depth: geometry.boundingBox.depth.toFixed(3)
        },
        volume: geometry.volume.toFixed(3),
        surfaceArea: geometry.surfaceArea.toFixed(3),
        vertexCount: geometry.vertices.length,
        faceCount: geometry.faces.length,
        center: {
          x: geometry.center[0].toFixed(6),
          y: geometry.center[1].toFixed(6),
          z: geometry.center[2].toFixed(6)
        },
        boundingBox: {
          min: geometry.boundingBox.min.map((v: number) => v.toFixed(6)),
          max: geometry.boundingBox.max.map((v: number) => v.toFixed(6))
        },
        // Propiedades específicas para geojson.io
        color: this.getElementColor(type),
        opacity: 0.8,
        weight: 2
      }
    };
  }

  /**
   * Genera feature GeoJSON para el edificio completo
   */
  private generateBuildingFeature(cityGMLData: CityGMLData): any {
    const { buildingData, location, projectInfo } = cityGMLData;
    
    // Crear geometría simple del edificio (bounding box)
    const buildingGeometry = {
      type: "Polygon",
      coordinates: [[
        [location.longitude - 0.001, location.latitude - 0.001],
        [location.longitude + 0.001, location.latitude - 0.001],
        [location.longitude + 0.001, location.latitude + 0.001],
        [location.longitude - 0.001, location.latitude + 0.001],
        [location.longitude - 0.001, location.latitude - 0.001]
      ]]
    };

    return {
      type: "Feature",
      geometry: buildingGeometry,
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
        // Propiedades específicas para geojson.io
        color: "#FF0000",
        opacity: 0.3,
        weight: 3,
        fillColor: "#FF0000",
        fillOpacity: 0.1
      }
    };
  }

  /**
   * Convierte coordenadas locales a coordenadas geográficas
   */
  private convertToGeoCoordinates(vertices: number[][], location: any): number[][] {
    // Factor de escala aproximado (metros a grados)
    const metersToDegrees = 1 / 111320; // Aproximadamente 1 grado = 111,320 metros
    
    return vertices.map(vertex => [
      location.longitude + (vertex[0] * metersToDegrees),
      location.latitude + (vertex[1] * metersToDegrees),
      location.elevation + vertex[2]
    ]);
  }

  /**
   * Genera geometría GeoJSON según el tipo de elemento
   */
  private generateGeoJSONGeometry(geoCoordinates: number[][], type: string): any {
    if (geoCoordinates.length === 0) {
      return null;
    }

    switch (type.toLowerCase()) {
      case 'wall':
      case 'slab':
      case 'plate':
        return this.generatePolygonGeometry(geoCoordinates);
      case 'beam':
      case 'column':
        return this.generateLineStringGeometry(geoCoordinates);
      case 'window':
      case 'door':
        return this.generatePointGeometry(geoCoordinates);
      default:
        return this.generatePolygonGeometry(geoCoordinates);
    }
  }

  /**
   * Genera geometría de polígono
   */
  private generatePolygonGeometry(geoCoordinates: number[][]): any {
    if (geoCoordinates.length < 3) {
      return null;
    }

    // Crear polígono simple usando los primeros 4 puntos
    const ring: number[][] = [];
    
    // Agregar los primeros 4 puntos o todos los disponibles
    const numPoints = Math.min(geoCoordinates.length, 4);
    for (let i = 0; i < numPoints; i++) {
      ring.push(geoCoordinates[i]);
    }
    
    // Cerrar el polígono
    ring.push(geoCoordinates[0]);

    return {
      type: "Polygon",
      coordinates: [ring]
    };
  }

  /**
   * Genera geometría de línea
   */
  private generateLineStringGeometry(geoCoordinates: number[][]): any {
    if (geoCoordinates.length < 2) {
      return null;
    }

    return {
      type: "LineString",
      coordinates: geoCoordinates.slice(0, 2) // Usar solo los primeros 2 puntos
    };
  }

  /**
   * Genera geometría de punto
   */
  private generatePointGeometry(geoCoordinates: number[][]): any {
    if (geoCoordinates.length === 0) {
      return null;
    }

    return {
      type: "Point",
      coordinates: geoCoordinates[0]
    };
  }

  /**
   * Obtiene el color para el tipo de elemento
   */
  private getElementColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      'Wall': '#8B4513',      // Marrón
      'Slab': '#696969',      // Gris oscuro
      'Beam': '#FFD700',      // Dorado
      'Column': '#DC143C',    // Rojo carmesí
      'Window': '#87CEEB',    // Azul cielo
      'Door': '#228B22',      // Verde bosque
      'Space': '#DDA0DD',     // Ciruela
      'Room': '#F0E68C',      // Amarillo kaki
      'Stair': '#FF6347',     // Tomate
      'Ramp': '#FF69B4',      // Rosa caliente
      'Plate': '#4682B4',     // Azul acero
      'ShadingDevice': '#32CD32' // Verde lima
    };
    
    return colorMap[type] || '#000000';
  }

  /**
   * Genera XML de geometría real usando vértices y caras
   */
  private generateRealGeometryXML(geometry: any): string {
    const { vertices, faces } = geometry;
    
    if (!vertices || vertices.length === 0) {
      // Fallback a geometría simple si no hay vértices
      return `<gml:Solid>
        <gml:exterior>
          <gml:CompositeSurface>
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList>0 0 0</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>
          </gml:CompositeSurface>
        </gml:exterior>
      </gml:Solid>`;
    }
    
    // Generar caras triangulares como polígonos
    let surfaceMembers = '';
    
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      if (face.length >= 3) {
        const v1 = vertices[face[0]];
        const v2 = vertices[face[1]];
        const v3 = vertices[face[2]];
        
        // Crear polígono triangular
        surfaceMembers += `
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList>${v1[0].toFixed(6)} ${v1[1].toFixed(6)} ${v1[2].toFixed(6)} ${v2[0].toFixed(6)} ${v2[1].toFixed(6)} ${v2[2].toFixed(6)} ${v3[0].toFixed(6)} ${v3[1].toFixed(6)} ${v3[2].toFixed(6)} ${v1[0].toFixed(6)} ${v1[1].toFixed(6)} ${v1[2].toFixed(6)}</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>`;
      }
    }
    
    // Si no hay caras válidas, crear una cara simple
    if (!surfaceMembers) {
      const v1 = vertices[0] || [0, 0, 0];
      const v2 = vertices[1] || [1, 0, 0];
      const v3 = vertices[2] || [0, 1, 0];
      
      surfaceMembers = `
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList>${v1[0].toFixed(6)} ${v1[1].toFixed(6)} ${v1[2].toFixed(6)} ${v2[0].toFixed(6)} ${v2[1].toFixed(6)} ${v2[2].toFixed(6)} ${v3[0].toFixed(6)} ${v3[1].toFixed(6)} ${v3[2].toFixed(6)} ${v1[0].toFixed(6)} ${v1[1].toFixed(6)} ${v1[2].toFixed(6)}</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>`;
    }
    
    return `<gml:Solid>
        <gml:exterior>
          <gml:CompositeSurface>${surfaceMembers}
          </gml:CompositeSurface>
        </gml:exterior>
      </gml:Solid>`;
  }

  /**
   * Obtiene la función del elemento
   */
  private getElementFunction(type: string): string {
    const functionMap: { [key: string]: string } = {
      'Wall': 'structural',
      'Slab': 'structural',
      'Beam': 'structural',
      'Column': 'structural',
      'Window': 'opening',
      'Door': 'opening',
      'Space': 'space',
      'Room': 'space',
      'Stair': 'circulation',
      'Ramp': 'circulation',
      'Plate': 'structural',
      'ShadingDevice': 'shading'
    };
    
    return functionMap[type] || 'unknown';
  }

  /**
   * Obtiene el uso del elemento
   */
  private getElementUsage(type: string): string {
    const usageMap: { [key: string]: string } = {
      'Wall': 'wall',
      'Slab': 'slab',
      'Beam': 'beam',
      'Column': 'column',
      'Window': 'window',
      'Door': 'door',
      'Space': 'space',
      'Room': 'room',
      'Stair': 'stair',
      'Ramp': 'ramp',
      'Plate': 'plate',
      'ShadingDevice': 'shading'
    };
    
    return usageMap[type] || 'unknown';
  }

  /**
   * Genera XML CityGML básico (método original para compatibilidad)
   */
  private generateBasicCityGMLXML(cityGMLData: CityGMLData): string {
    const timestamp = new Date().toISOString();
    const { buildingData, cadastralInfo, location, projectInfo } = cityGMLData;
    
    const cityGMLXML = `<?xml version="1.0" encoding="UTF-8"?>
<core:CityModel xmlns:core="http://www.opengis.net/citygml/2.0"
                xmlns:bldg="http://www.opengis.net/citygml/building/2.0"
                xmlns:gml="http://www.opengis.net/gml"
                xmlns:finnish="http://www.finnish-standards.fi/citygml/extension"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://www.opengis.net/citygml/2.0 
                                   http://schemas.opengis.net/citygml/2.0/cityGML.xsd">
  
  <!-- Metadata -->
  <gml:description>Finnish Building Smart CityGML Export - ${projectInfo.name}</gml:description>
  <gml:name>${projectInfo.name}</gml:name>
  <gml:metaDataProperty>
    <gml:GenericMetaData>
      <gml:name>Project Information</gml:name>
      <gml:value>
        <gml:description>Generated by Finnish CityGML Service</gml:description>
        <gml:creationDate>${timestamp}</gml:creationDate>
        <gml:projectName>${projectInfo.name}</gml:projectName>
        <gml:municipality>${projectInfo.municipality}</gml:municipality>
        <gml:buildingType>${projectInfo.buildingType}</gml:buildingType>
        <gml:totalArea>${projectInfo.area}</gml:totalArea>
      </gml:value>
    </gml:GenericMetaData>
  </gml:metaDataProperty>
  
  <!-- Building -->
  <bldg:Building gml:id="building_001">
    <!-- Basic Information -->
    <gml:name>${projectInfo.name}</gml:name>
    <gml:description>${projectInfo.buildingType} building in ${projectInfo.municipality}</gml:description>
    
    <!-- Geometry -->
    <bldg:lod1Solid>
      <gml:Solid>
        <gml:exterior>
          <gml:CompositeSurface>
            <gml:surfaceMember>
              <gml:Polygon>
                <gml:exterior>
                  <gml:LinearRing>
                    <gml:posList>${location.longitude} ${location.latitude} ${location.elevation}</gml:posList>
                  </gml:LinearRing>
                </gml:exterior>
              </gml:Polygon>
            </gml:surfaceMember>
          </gml:CompositeSurface>
        </gml:exterior>
      </gml:Solid>
    </bldg:lod1Solid>
    
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
      </finnish:BuildingExtension>
    </bldg:extension>
    
  </bldg:Building>
  
</core:CityModel>`;
    
    return cityGMLXML;
  }
}
