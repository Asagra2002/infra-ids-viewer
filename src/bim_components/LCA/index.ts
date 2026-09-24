import * as OBC from "@thatopen/components"
import * as FRAGS from "@thatopen/fragments"
import * as OBF from "@thatopen/components-front"
import { MATERIAL_FACTORS, IMPACT_CATEGORIES } from '../../data/emissionFactors';

// Validation interfaces and types
interface VolumeValidationResult {
  isValid: boolean;
  geometricVolume: number;
  propertyVolume: number | null;
  discrepancy: number | null;
  method: 'geometric' | 'property' | 'both';
  warnings: string[];
}

interface ValidationThresholds {
  maxVolume: number;  // Maximum reasonable volume for any element (m³)
  minVolume: number;  // Minimum reasonable volume for any element (m³)
  maxDiscrepancy: number;  // Maximum allowed discrepancy between methods (%)
}

interface MaterialThresholds {
  maxVolume: number;
  minVolume: number;
  typicalVolume: number;
  density?: number;  // kg/m³ para validación adicional
}

const DEFAULT_VALIDATION_THRESHOLDS: ValidationThresholds = {
  maxVolume: 200,  // Reducido de 1000 a 200
  minVolume: 0.0001,
  maxDiscrepancy: 0.2
};

const MATERIAL_THRESHOLDS: { [key: string]: MaterialThresholds } = {
  // Materiales estructurales
  'concrete': {
    maxVolume: 150,
    minVolume: 0.01,
    typicalVolume: 50,
    density: 2400
  },
  'timber': {
    maxVolume: 100,
    minVolume: 0.001,
    typicalVolume: 20,
    density: 500
  },
  // Aislamientos
  'insulation': {
    maxVolume: 100,
    minVolume: 0.001,
    typicalVolume: 30,
    density: 40
  },
  // Acabados
  'gypsum': {
    maxVolume: 180,
    minVolume: 0.001,
    typicalVolume: 40,
    density: 800
  },
  'glass': {
    maxVolume: 20,
    minVolume: 0.001,
    typicalVolume: 5,
    density: 2500
  },
  // Metales
  'metal': {
    maxVolume: 30,
    minVolume: 0.0001,
    typicalVolume: 2,
    density: 7850
  },
  // Valores por defecto más restrictivos
  'default': {
    maxVolume: 50,
    minVolume: 0.0001,
    typicalVolume: 10
  }
};

type MaterialQtoResult = {[materialName: string]: {[qtoName: string]: number}}

interface TableRow {
  property: string;
  value: string | number;
  isHeader?: boolean;
  category?: string;
}

// Añadir nueva interfaz para la estructura de datos
type ElementMaterialQtoResult = {
  [elementType: string]: {
    [materialName: string]: {
      NetVolume: number
    }
  }
}

interface ElementTypeThresholds {
  maxVolume: number;
  minVolume: number;
  typicalVolume: number;
}

const ELEMENT_TYPE_THRESHOLDS: { [key: string]: ElementTypeThresholds } = {
  'IfcSlab': {
    maxVolume: 2000,
    minVolume: 0.1,
    typicalVolume: 500
  },
  'IfcCovering': {
    maxVolume: 1000,
    minVolume: 0.05,
    typicalVolume: 300
  },
  'IfcRoof': {
    maxVolume: 1000,
    minVolume: 0.1,
    typicalVolume: 200
  },
  'IfcWall': {
    maxVolume: 2000,
    minVolume: 0.1,
    typicalVolume: 800
  }
};

export class LCACalculator extends OBC.Component implements OBC.Disposable {
  static uuid = "13229f66-c0b9-477b-84e9-5b2a63354a21"
  enabled = true
  onDisposed = new OBC.Event<any>()
  private _materialQtoResult: MaterialQtoResult = {}
  private _elementMaterialQtoResult: ElementMaterialQtoResult = {}
  private _dimensionsCache: Map<number, {area: number, volume: number, length: number, height: number, width: number}> = new Map()
  materialQuantitiesTable = {
    columns: [
      { header: 'Element/Material', dataField: 'property', width: '60%', sortable: true },
      { header: 'Volume', dataField: 'value', width: '40%', sortable: true }
    ],
    data: [{
      property: 'No data available',
      value: '-'
    }] as TableRow[]
  };
  onMaterialQuantitiesComputed = new OBC.Event<MaterialQtoResult>()
  onProgress?: (percent: number) => void;
  materialFactors = MATERIAL_FACTORS;
  impactCategories = IMPACT_CATEGORIES;
  
  // Method to show loading indicator in LCA panel
  showLoadingIndicator(message: string = 'Analyzing model...', progress?: number) {
    const lcaContent = document.getElementById('lca-content');
    if (lcaContent) {
      let html = `
        <div style="padding: 20px; text-align: center;">
          <div style="margin-bottom: 10px; color: var(--bim-label--c);">${message}</div>
      `;
      
      if (progress !== undefined) {
        html += `
          <div style="width: 100%; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; overflow: hidden; height: 8px;">
            <div style="width: ${progress}%; background: #bcf124; height: 100%; transition: width 0.3s;"></div>
          </div>
          <div style="margin-top: 8px; color: var(--bim-label--c); font-size: 12px;">${Math.round(progress)}%</div>
        `;
      } else {
        html += `
          <div style="width: 100%; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; overflow: hidden; height: 8px;">
            <div style="width: 100%; background: #bcf124; height: 100%; animation: pulse 1.5s ease-in-out infinite;"></div>
          </div>
        `;
      }
      
      html += `</div>
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        </style>
      `;
      
      lcaContent.innerHTML = html;
    }
  }
  
  // Method to update LCA panel in the UI
  updateLCAPanel(result: ElementMaterialQtoResult) {
    const lcaContent = document.getElementById('lca-content');
    if (lcaContent && result && Object.keys(result).length > 0) {
      let html = `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--bim-border-color,#555);">
              <th style="text-align: left; padding: 8px; color: var(--bim-text-color,#999); font-size: 12px; font-weight: normal;">Element / Material</th>
              <th style="text-align: right; padding: 8px; color: var(--bim-text-color,#999); font-size: 12px; font-weight: normal;">Volume</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      for (const elementType in result) {
        const materials = result[elementType];
        let elementTotal = 0;
        for (const material in materials) {
          elementTotal += materials[material].NetVolume;
        }
        
        if (elementTotal > 0) {
          html += `<tr style="border-bottom: 1px solid var(--bim-border-color,#555);"><td style="padding: 8px; color: var(--bim-text-color,#999); font-size: 12px;">${elementType}</td><td style="text-align: right; padding: 8px; color: var(--bim-text-color,#999); font-size: 12px;">${elementTotal.toFixed(2)} m³</td></tr>`;
          
          for (const material in materials) {
            const volume = materials[material].NetVolume;
            if (volume > 0) {
              html += `<tr style="border-bottom: 1px solid var(--bim-border-color,#555);"><td style="padding: 8px; padding-left: 24px; color: var(--bim-text-color,#999); font-size: 12px;">${material}</td><td style="text-align: right; padding: 8px; color: var(--bim-text-color,#999); font-size: 12px;">${volume.toFixed(2)} m³</td></tr>`;
            }
          }
        }
      }
      
      html += `
          </tbody>
        </table>
        <button 
          id="send-to-lca-page-btn"
          style="
            width: 100%;
            padding: 12px;
            background: #bcf124;
            color: #000;
            border: none;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: opacity 0.2s;
          "
          onmouseover="this.style.opacity='0.9'"
          onmouseout="this.style.opacity='1'"
        >
          <span style="font-size: 18px;">📊</span>
          Send to LCA Evaluation
        </button>
      `;
      
      lcaContent.innerHTML = html;
      
      // Add click event listener to the button
      const button = document.getElementById('send-to-lca-page-btn');
      if (button) {
        button.addEventListener('click', async () => {
          // Show informative message before sending
          const infoMsg = document.createElement('div');
          infoMsg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4caf50;
            color: white;
            padding: 16px 24px;
            border-radius: 6px;
            font-weight: 500;
            box-shadow: 0 2px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            text-align: center;
            max-width: 350px;
          `;
          infoMsg.innerHTML = `
            <div style="margin-bottom: 10px; font-size: 16px;">✅</div>
            <div style="margin-bottom: 8px; font-size: 15px;">LCA Analysis Complete</div>
            <div style="font-size: 13px; opacity: 0.9;">
              Results are now available in the LCA Evaluation panel.
            </div>
          `;
          document.body.appendChild(infoMsg);
          
          // Remove message after 3 seconds
          setTimeout(() => {
            infoMsg.style.opacity = '0';
            infoMsg.style.transition = 'opacity 0.3s';
            setTimeout(() => infoMsg.remove(), 300);
          }, 3000);
          
          // Send data to LCA page
          await this.sendToLCAPage(result);
        });
      }
    }
  }

  // 🆕 Extract building information from spatial structure AND analyzed data
  private async extractBuildingInfo(): Promise<{
    name: string;
    area: number;
    type: string;
    location: string;
  }> {
    const fragmentManager = this.components.get(OBC.FragmentsManager);
    
    let buildingArea = 0;
    let buildingName = 'Unnamed Project';
    let buildingType = 'residential';
    
    try {
      // Iterate through all loaded models
      for (const [modelId, model] of fragmentManager.list) {
        console.log('[LCA] 🔍 Extracting building info from model:', modelId);
        console.log('[LCA] 🔍 Model properties:', {
          modelId,
          name: (model as any).name,
          uuid: (model as any).uuid,
          hasName: !!(model as any).name
        });
        
        // Get project name from model (will be used if IfcBuilding doesn't have a name)
        const modelName = (model as any).name || modelId || buildingName;
        
        // Use getSpatialStructure to find IfcBuilding
        if (typeof (model as any).getSpatialStructure === 'function') {
          const spatialStructure = await (model as any).getSpatialStructure();
          
          // Find IfcBuilding in the structure
          const findBuilding = (node: any): any => {
            // Check if this node is an IfcBuilding (multiple ways to check)
            const category = String(node._category?.value || node._category || '').toUpperCase();
            const type = String(node.type || '').toUpperCase();
            const name = String(node.name || '').toLowerCase();
            
            if (category === 'IFCBUILDING' || 
                type === 'IFCBUILDING' ||
                category.includes('BUILDING') ||
                type.includes('BUILDING') ||
                name.includes('building')) {
              console.log('[LCA] 🎯 Found IfcBuilding node with localId:', node.localId);
              return node;
            }
            
            // Recursively search children
            if (node.children && Array.isArray(node.children)) {
              for (const child of node.children) {
                const found = findBuilding(child);
                if (found) return found;
              }
            }
            
            return null;
          };
          
          const buildingNode = findBuilding(spatialStructure);
          
          if (buildingNode && buildingNode.localId) {
            console.log('[LCA] 🏢 Found IfcBuilding with localId:', buildingNode.localId);
            
            // Get building properties using getItemsData
            const config: FRAGS.ItemsDataConfig = {
              attributesDefault: true,
              relations: {
                "IsDefinedBy": { attributes: true, relations: true }
              },
              relationsDefault: { attributes: true, relations: true }
            };
            
            try {
              const buildingData = await model.getItemsData([buildingNode.localId], config);
              
              if (Array.isArray(buildingData) && buildingData.length > 0) {
                const building: any = buildingData[0];
                
                // Extract building name (use IfcBuilding name if available, otherwise use model name)
                if (building.Name?.value) {
                  buildingName = building.Name.value;
                } else {
                  buildingName = modelName; // Use model name as fallback
                }
                
                // Extract area from quantities
                if (building.IsDefinedBy && Array.isArray(building.IsDefinedBy)) {
                  for (const relation of building.IsDefinedBy) {
                    const relationData = relation as any;
                    
                    if (relationData && relationData.Quantities && Array.isArray(relationData.Quantities)) {
                      for (const quantityRef of relationData.Quantities) {
                        let quantityData: any = quantityRef;
                        if ((quantityRef as any).value && typeof (quantityRef as any).value === 'object') {
                          quantityData = (quantityRef as any).value;
                        }
                        
                        if (quantityData && quantityData.Name) {
                          const quantityName = String(quantityData.Name.value || quantityData.Name).toLowerCase();
                          
                          // Look for GrossFloorArea or similar
                          if (quantityName.includes('grossfloorarea') || 
                              quantityName.includes('totalarea') ||
                              quantityName.includes('netfloorarea')) {
                            if (quantityData.AreaValue !== undefined) {
                              const areaValue = quantityData.AreaValue.value || quantityData.AreaValue;
                              const roundedArea = Math.round(areaValue * 1000) / 1000; // Round to 3 decimals
                              buildingArea = Math.max(buildingArea, roundedArea);
                              console.log('[LCA] 📐 Found building area:', roundedArea.toFixed(3), 'm² from', quantityName);
                            }
                          }
                        }
                      }
                    }
                  }
                }
                
                // Detect building type from properties
                if (building.ObjectType?.value) {
                  const objectType = String(building.ObjectType.value).toLowerCase();
                  if (objectType.includes('commercial') || objectType.includes('office')) {
                    buildingType = 'commercial';
                  } else if (objectType.includes('industrial')) {
                    buildingType = 'industrial';
                  } else if (objectType.includes('residential')) {
                    buildingType = 'residential';
                  }
                }
              }
            } catch (error) {
              console.warn('[LCA] ⚠️ Error extracting building properties:', error);
            }
          } else {
            // No IfcBuilding found, use model name
            buildingName = modelName;
            console.log('[LCA] 📝 No IfcBuilding found, using model name:', buildingName);
          }
        }
        
        // 🎯 STRATEGY 2: If no area found from IfcBuilding, try to calculate from IfcSlab (floors) in spatial structure
        if (buildingArea === 0) {
          console.log('[LCA] 📏 No area found in IfcBuilding quantities');
          console.log('[LCA] 📏 Trying Strategy 2: Extract actual area from IfcSlabs in spatial structure...');
          
          let floorArea = 0;
          
          // Use getSpatialStructure to find all IfcSlabs
          if (typeof (model as any).getSpatialStructure === 'function') {
            const spatialStructure = await (model as any).getSpatialStructure();
            const slabIds = new Set<number>();
            
            const collectSlabs = (node: any) => {
              const category = String(node._category?.value || node._category || '').toUpperCase();
              const type = String(node.type || '').toUpperCase();
              
              // Check multiple ways a slab could be identified
              if (category === 'IFCSLAB' || 
                  type === 'IFCSLAB' ||
                  category.includes('SLAB') ||
                  type.includes('SLAB')) {
                if (node.localId && node.localId > 0) {
                  slabIds.add(node.localId);
                }
              }
              
              if (node.children && Array.isArray(node.children)) {
                for (const child of node.children) {
                  collectSlabs(child);
                }
              }
            };
            
            collectSlabs(spatialStructure);
            
            if (slabIds.size > 0) {
              console.log('[LCA] 📦 Found', slabIds.size, 'slabs in total');
              
              const config: FRAGS.ItemsDataConfig = {
                attributesDefault: true,
                relations: {
                  "IsDefinedBy": { attributes: true, relations: true }
                },
                relationsDefault: { attributes: true, relations: true }
              };
              
              try {
                const slabsData = await model.getItemsData(Array.from(slabIds), config);
                
                if (Array.isArray(slabsData)) {
                  for (const slabData of slabsData) {
                    const slab: any = slabData;
                    
                    // Check if it's a floor slab (not roof)
                    const predefinedType = String(slab.PredefinedType?.value || slab.ObjectType?.value || '').toLowerCase();
                    
                    if (predefinedType === 'floor' || predefinedType === 'baseslab' || predefinedType === '') {
                      // Extract area from quantities
                      if (slab.IsDefinedBy && Array.isArray(slab.IsDefinedBy)) {
                        for (const relation of slab.IsDefinedBy) {
                          const relationData = relation as any;
                          
                          if (relationData && relationData.Quantities && Array.isArray(relationData.Quantities)) {
                            for (const quantityRef of relationData.Quantities) {
                              let quantityData: any = quantityRef;
                              if ((quantityRef as any).value) {
                                quantityData = (quantityRef as any).value;
                              }
                              
                              if (quantityData && quantityData.AreaValue !== undefined) {
                                const areaValue = quantityData.AreaValue.value || quantityData.AreaValue;
                                floorArea += areaValue;
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
                
                if (floorArea > 0) {
                  buildingArea = Math.round(floorArea * 1000) / 1000; // Round to 3 decimals
                  console.log('[LCA] ✅ Calculated building area from slabs:', buildingArea.toFixed(3), 'm²');
                }
              } catch (error) {
                console.warn('[LCA] ⚠️ Error calculating area from slabs:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[LCA] ❌ Error extracting building info:', error);
    }
    
    // 🎯 FINAL STRATEGY: Estimate from already processed LCA data if nothing else worked
    if (buildingArea === 0) {
      console.log('[LCA] 💡 Spatial structure search failed. Attempting to estimate from LCA results...');
      
      if (this._elementMaterialQtoResult) {
        // Search for IfcSlab in different case variations
        let slabData = null;
        for (const elementType in this._elementMaterialQtoResult) {
          if (elementType.toLowerCase() === 'ifcslab') {
            slabData = this._elementMaterialQtoResult[elementType];
            console.log('[LCA] 🔍 Found slab data under key:', elementType);
            break;
          }
        }
        
        if (slabData) {
          let totalSlabVolume = 0;
          
          for (const material in slabData) {
            totalSlabVolume += slabData[material].NetVolume;
          }
          
          if (totalSlabVolume > 0) {
            // Estimate area from slab volume
            // Typical slab thickness in Finland: 200-300mm for floors
            const estimatedThickness = 0.25; // 250mm average
            buildingArea = Math.round((totalSlabVolume / estimatedThickness) * 1000) / 1000; // Round to 3 decimals
            console.log('[LCA] ✅ Estimated building area from IfcSlab volumes:', buildingArea.toFixed(3), 'm²');
            console.log('[LCA] 📐 Calculation:', totalSlabVolume.toFixed(2), 'm³ ÷', estimatedThickness, 'm (avg slab thickness)');
            console.log('[LCA] 💡 Note: This is an estimation. User can adjust in MaterialsPage if needed.');
          } else {
            console.warn('[LCA] ⚠️ Could not extract building area from IFC. User will need to input manually in MaterialsPage.');
          }
        } else {
          console.warn('[LCA] ⚠️ No IfcSlab data available for estimation. User will need to input manually in MaterialsPage.');
        }
      } else {
        console.warn('[LCA] ⚠️ No LCA results available yet. User will need to input area manually in MaterialsPage.');
      }
    }
    
    return {
      name: buildingName,
      area: buildingArea,
      type: buildingType,
      location: 'Helsinki' // Default location
    };
  }

  // Method to send LCA data to MaterialsPage via LCAStore
  async sendToLCAPage(result: ElementMaterialQtoResult) {
    console.log('[LCA] 📤 Sending data to LCA Evaluation page...');
    
    // Format data for MaterialsPage
    const formattedData: any[] = [];
    
    for (const elementType in result) {
      const materials = result[elementType];
      
      for (const materialName in materials) {
        const materialData = materials[materialName];
        
        formattedData.push({
          property: materialName,
          value: `${materialData.NetVolume.toFixed(2)} m³`,
          category: elementType,
          isHeader: false
        });
      }
    }
    
    console.log('[LCA] 📦 Formatted data:', formattedData);
    
    // 🆕 Extract building information
    const buildingInfo = await this.extractBuildingInfo();
    console.log('[LCA] 🏢 Extracted building info:', {
      ...buildingInfo,
      area: buildingInfo.area > 0 ? `${buildingInfo.area.toFixed(3)} m²` : 'Not found'
    });
    
    // Import and use LCAStore
    import('../../stores/LCAStore').then(({ useLCAStore }) => {
      const store = useLCAStore.getState();
      
      // Set LCA data (with columns for compatibility)
      store.setLCAData({
        data: formattedData,
        columns: [
          { header: 'Material', dataField: 'property', width: '60%', sortable: true },
          { header: 'Volume', dataField: 'value', width: '40%', sortable: true }
        ]
      });
      
      // 🆕 Set project info with extracted building data
      store.setProjectInfo({
        name: buildingInfo.name,
        area: buildingInfo.area,
        cost: 0,
        description: `LCA Analysis for ${buildingInfo.name}`,
        status: 'Active',
        progress: 0,
        type: buildingInfo.type,
        location: buildingInfo.location
      });
      
      console.log('[LCA] ✅ Data and project info sent to LCAStore successfully');
      
      // Show success message
      const lcaContent = document.getElementById('lca-content');
      if (lcaContent) {
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #bcf124;
          color: #000;
          padding: 16px 24px;
          border-radius: 8px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          animation: slideIn 0.3s ease;
        `;
        successMsg.innerHTML = `
          ✓ Data sent to LCA Evaluation page!<br>
          <span style="font-size: 12px; opacity: 0.8;">
            ${buildingInfo.area > 0 ? `Area: ${buildingInfo.area.toFixed(3)} m²` : 'Area: Manual input required'}
          </span>
        `;
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
          successMsg.style.opacity = '0';
          successMsg.style.transition = 'opacity 0.3s';
          setTimeout(() => successMsg.remove(), 300);
        }, 3000);
      }
      
      // Navigate to Materials page
      window.location.hash = 'Materials';
    }).catch(error => {
      console.error('[LCA] ❌ Error sending data to LCAStore:', error);
    });
  }

  constructor(components: OBC.Components) {
    super(components)
    this.components.add(LCACalculator.uuid, this)
    
    // Create table with initial data
    this.materialQuantitiesTable = {
      columns: [
        { header: '', dataField: 'property', width: '50%', sortable: true },
        { header: 'Value', dataField: 'value', width: '50%', sortable: true }
      ],
      data: [{
        property: 'No data available',
        value: '-'
      }]
    }
  }

  resetMaterialQuantities() {
    this._materialQtoResult = {}
  }

  private updateMaterialTable() {
    const tableData: TableRow[] = [];
    
    let totalVolume = 0;
    for (const elementType in this._elementMaterialQtoResult) {
        const materials = this._elementMaterialQtoResult[elementType];
        for (const material in materials) {
            const volume = materials[material].NetVolume;
            totalVolume += volume;
        }
    }
    
    tableData.push({
        property: 'Total Material Volumes',
        value: `${totalVolume.toFixed(2)} m³`,
        isHeader: true
    });

    for (const elementType in this._elementMaterialQtoResult) {
        const materials = this._elementMaterialQtoResult[elementType];
        let elementTotalVolume = 0;
        
        for (const material in materials) {
            const volume = materials[material].NetVolume;
            elementTotalVolume += volume;
        }
        
        if (elementTotalVolume > 0) {
            tableData.push({
                property: elementType,
                value: `${elementTotalVolume.toFixed(2)} m³`,
                isHeader: true
            });

            for (const material in materials) {
                const volume = materials[material].NetVolume;
                if (volume > 0) {
                    tableData.push({
                        property: `  ${material}`,
                        value: `${volume.toFixed(2)} m³`
                    });
                }
            }
        }
    }

    this.materialQuantitiesTable.data = tableData;
  }

  private validateVolume(
    geometricVolume: number,
    propertyVolume: number | null,
    elementType: string
  ): VolumeValidationResult {
    const result: VolumeValidationResult = {
      isValid: true,
      geometricVolume,
      propertyVolume,
      discrepancy: null,
      method: propertyVolume !== null ? 'both' : 'geometric',
      warnings: []
    };

    if (isNaN(geometricVolume) || !isFinite(geometricVolume)) {
      result.isValid = false;
      result.warnings.push(`Invalid geometric volume: ${geometricVolume}`);
      result.geometricVolume = 0;
      return result;
    }

    if (geometricVolume > DEFAULT_VALIDATION_THRESHOLDS.maxVolume) {
      result.isValid = false;
      result.warnings.push(`Geometric volume (${geometricVolume.toFixed(2)} m³) exceeds maximum threshold (${DEFAULT_VALIDATION_THRESHOLDS.maxVolume} m³)`);
      result.geometricVolume = DEFAULT_VALIDATION_THRESHOLDS.maxVolume;
    }

    if (geometricVolume < DEFAULT_VALIDATION_THRESHOLDS.minVolume) {
      result.isValid = false;
      result.warnings.push(`Geometric volume (${geometricVolume.toFixed(2)} m³) is below minimum threshold (${DEFAULT_VALIDATION_THRESHOLDS.minVolume} m³)`);
      result.geometricVolume = DEFAULT_VALIDATION_THRESHOLDS.minVolume;
    }

    if (propertyVolume !== null) {
      if (isNaN(propertyVolume) || !isFinite(propertyVolume)) {
        result.isValid = false;
        result.warnings.push(`Invalid property volume: ${propertyVolume}`);
        result.propertyVolume = null;
        return result;
      }

      let validatedPropertyVolume = propertyVolume;

      if (propertyVolume > DEFAULT_VALIDATION_THRESHOLDS.maxVolume) {
        result.isValid = false;
        result.warnings.push(`Property volume (${propertyVolume.toFixed(2)} m³) exceeds maximum threshold (${DEFAULT_VALIDATION_THRESHOLDS.maxVolume} m³)`);
        validatedPropertyVolume = DEFAULT_VALIDATION_THRESHOLDS.maxVolume;
      }

      if (propertyVolume < DEFAULT_VALIDATION_THRESHOLDS.minVolume) {
        result.isValid = false;
        result.warnings.push(`Property volume (${propertyVolume.toFixed(2)} m³) is below minimum threshold (${DEFAULT_VALIDATION_THRESHOLDS.minVolume} m³)`);
        validatedPropertyVolume = DEFAULT_VALIDATION_THRESHOLDS.minVolume;
      }

      result.propertyVolume = validatedPropertyVolume;

      const maxVolume = Math.max(result.geometricVolume, validatedPropertyVolume);
      if (maxVolume > 0) {
        result.discrepancy = Math.abs(result.geometricVolume - validatedPropertyVolume) / maxVolume;
        
        if (result.discrepancy > DEFAULT_VALIDATION_THRESHOLDS.maxDiscrepancy) {
          result.isValid = false;
          result.warnings.push(
            `High volume discrepancy (${(result.discrepancy * 100).toFixed(1)}%) between geometric (${result.geometricVolume.toFixed(2)} m³) and property (${validatedPropertyVolume.toFixed(2)} m³) methods`
          );
        }
      }
    }

    return result;
  }

  private async detectSourceSoftware(model: any): Promise<'ArchiCAD' | 'Revit' | 'Unknown'> {
    try {
      const modelName = String((model as any).name || '').toLowerCase()
      if (modelName.includes('archicad')) return 'ArchiCAD'
      if (modelName.includes('revit')) return 'Revit'
    } catch {}
    return 'Unknown'
  }

  private getMaterialCategory(materialName: string): string {
    const lowerName = materialName.toLowerCase();
    
    // Mapeo mejorado de nombres de materiales a categorías
    if (lowerName.includes('concrete') || lowerName.includes('betoni') || 
        lowerName.includes('runko') || lowerName.includes('element')) return 'concrete';
        
    if (lowerName.includes('timber') || lowerName.includes('wood') || lowerName.includes('puu') || 
        lowerName.includes('clt') || lowerName.includes('lumber') || lowerName.includes('sahatavara') ||
        lowerName.includes('höylä') || lowerName.includes('vaneri')) return 'timber';
        
    if (lowerName.includes('insulation') || lowerName.includes('eriste') || 
        lowerName.includes('mineral') || lowerName.includes('villa') ||
        lowerName.includes('lämmön')) return 'insulation';
        
    if (lowerName.includes('gypsum') || lowerName.includes('kipsi') ||
        lowerName.includes('kartonki')) return 'gypsum';
        
    if (lowerName.includes('glass') || lowerName.includes('lasi') ||
        lowerName.includes('window') || lowerName.includes('ikkuna')) return 'glass';
        
    if (lowerName.includes('metal') || lowerName.includes('steel') || 
        lowerName.includes('aluminium') || lowerName.includes('metalli') ||
        lowerName.includes('chrome') || lowerName.includes('teräs')) return 'metal';
    
    return 'default';
  }

  private validateMaterialVolume(
    volume: number,
    materialName: string,
    sourceSoftware: 'ArchiCAD' | 'Revit' | 'Unknown'
  ): number {
    const category = this.getMaterialCategory(materialName);
    const thresholds = MATERIAL_THRESHOLDS[category] || MATERIAL_THRESHOLDS['default'];

    if (isNaN(volume) || !isFinite(volume)) {
      console.warn(`[LCA] Invalid volume for ${materialName}: ${volume}`);
      return 0;
    }

    if (sourceSoftware === 'Revit' && volume === 200) {
      console.warn(`[LCA] Invalid default volume (200 m³) detected in Revit:`, {
        material: materialName,
        category,
        volume
      });
      return 0;
    }

    if (volume > thresholds.maxVolume) {
      console.warn(`[LCA] Volume exceeds maximum for ${materialName}:`, {
        volume,
        maxAllowed: thresholds.maxVolume,
        category
      });
      return 0;
    }

    if (volume < thresholds.minVolume && volume > 0) {
      if (sourceSoftware === 'ArchiCAD' && category === 'metal') {
        return volume;
      }
      console.warn(`[LCA] Volume below minimum for ${materialName}:`, {
        volume,
        minAllowed: thresholds.minVolume,
        category
      });
      return thresholds.minVolume;
    }

    return volume;
  }

  private validateVolumeForElementType(
    volume: number,
    elementType: string,
    sourceSoftware: 'ArchiCAD' | 'Revit' | 'Unknown'
  ): number {
    const thresholds = ELEMENT_TYPE_THRESHOLDS[elementType] || {
      maxVolume: DEFAULT_VALIDATION_THRESHOLDS.maxVolume,
      minVolume: DEFAULT_VALIDATION_THRESHOLDS.minVolume,
      typicalVolume: 100
    };

    if (sourceSoftware === 'Revit' && volume >= 1000) {
      console.warn(`[LCA] Suspicious volume of 1000 m³ detected in Revit for ${elementType}`);
      return thresholds.typicalVolume;
    }

    if (sourceSoftware === 'ArchiCAD') {
      if (elementType === 'IfcSlab' && volume > thresholds.typicalVolume * 2) {
        console.warn(`[LCA] High volume detected for ArchiCAD IfcSlab: ${volume} m³`);
      }
    } else if (sourceSoftware === 'Revit') {
      if (elementType === 'IfcCovering' && volume > thresholds.typicalVolume * 2) {
        console.warn(`[LCA] High volume detected for Revit IfcCovering: ${volume} m³`);
      }
    }

    if (volume > thresholds.maxVolume) {
      console.warn(`[LCA] Volume exceeds maximum for ${elementType}: ${volume} m³ > ${thresholds.maxVolume} m³`);
      return thresholds.maxVolume;
    }
    if (volume < thresholds.minVolume) {
      console.warn(`[LCA] Volume below minimum for ${elementType}: ${volume} m³ < ${thresholds.minVolume} m³`);
      return thresholds.minVolume;
    }

    return volume;
  }

  // ====================================================================
  // 🔧 MÉTODOS COPIADOS DE MATERIALS/INDEX.TS - NUEVOS PARA FRAGMENTS 3.1
  // ====================================================================
  
  // Extract thickness from material properties
  private extractThicknessFromMaterial(materialName: string, constituent: any): number {
    if (constituent && typeof constituent === 'object') {
      for (const [key, value] of Object.entries(constituent)) {
        if (key.toLowerCase().includes('thickness') || 
            key.toLowerCase().includes('paksuus') ||
            key.toLowerCase().includes('layer') ||
            key.toLowerCase().includes('width')) {
          if (typeof value === 'number') return value
          if (value && typeof value === 'object' && (value as any).value) return (value as any).value
        }
      }
    }
    return 0
  }

  // Estimate thickness based on material type - Finnish construction standards
  private estimateThicknessByMaterialType(materialName: string): number {
    const materialNameLower = materialName.toLowerCase()
    
    if (materialNameLower.includes('villa') || materialNameLower.includes('eriste')) return 0.15
    if (materialNameLower.includes('kipsilevy') || materialNameLower.includes('kipsi')) return 0.0125
    if (materialNameLower.includes('vaneri') || materialNameLower.includes('plywood')) return 0.018
    if (materialNameLower.includes('puuverhous') || materialNameLower.includes('wood cladding')) return 0.025
    if (materialNameLower.includes('rank') || materialNameLower.includes('frame')) return 0.05
    if (materialNameLower.includes('betoni') || materialNameLower.includes('concrete')) return 0.2
    if (materialNameLower.includes('teräs') || materialNameLower.includes('steel')) return 0.01
    return 0.02
  }

  // Estimate volume when no data available
  private estimateVolumeByMaterialType(materialName: string, length: number, height: number): number {
    if (length > 0 && height > 0) {
      return length * height * 0.01
    }
    return 0
  }

  private async getRealElementDimensions(localId: number): Promise<{area: number, volume: number, length: number, height: number, width: number}> {
    const cached = this._dimensionsCache.get(localId)
    if (cached) return cached
    const dims = {area: 0, volume: 0, length: 0, height: 0, width: 0}
    this._dimensionsCache.set(localId, dims)
    return dims
  }

  // Calculate material volume - SIMPLIFIED
  private async calculateMaterialVolumeNew(
    materialName: string, 
    constituent: any, 
    elementDimensions: {area: number, volume: number, length: number, height: number, width: number},
    expressId: number,
    totalConstituents: number
  ): Promise<number> {
    // Get thickness
    let thickness = this.estimateThicknessByMaterialType(materialName)
    
    // Use element volume if available
    if (elementDimensions.volume > 0 && totalConstituents > 0) {
      return elementDimensions.volume / totalConstituents
    }
    
    // Use area × thickness if area available
    if (elementDimensions.area > 0) {
      return elementDimensions.area * thickness
    }
    
    // Default: 1m² × thickness
    const defaultArea = 1.0
    const volume = defaultArea * thickness
    return volume
  }
  
  // COPIADO DE MATERIALS: Create ModelIdMap from FragmentIdMap
  private createModelIdMap(fragmentIdMap: any, fragmentManager: any): any {
    return fragmentIdMap
  }

  // COPIADO DE MATERIALS: Get element dimensions using Fragments 3.1 API
  private async getElementDimensionsLCA(modelIdMap: any): Promise<{[localId: number]: {area: number, volume: number, length: number, height: number, width: number}}> {
    const elementDimensions: {[localId: number]: {area: number, volume: number, length: number, height: number, width: number}} = {}
    
    const fragmentManager = this.components.get(OBC.FragmentsManager)
    
    for (const modelId in modelIdMap) {
      const model = fragmentManager.list.get(modelId)
      if (!model) {
        continue
      }
      
      const localIdSet = modelIdMap[modelId]
      const localIds = Array.from(localIdSet).map(id => Number(id))
      
      const config: FRAGS.ItemsDataConfig = {
        attributesDefault: true,
        relations: {
          "IsDefinedBy": { attributes: true, relations: true },
          "HasAssociations": { attributes: true, relations: true }
        },
        relationsDefault: { attributes: true, relations: true }
      }
      
      try {
        const itemsData = await model.getItemsData(localIds, config)
        
        if (Array.isArray(itemsData)) {
          for (let i = 0; i < itemsData.length; i++) {
              const itemData: any = itemsData[i]
            const localId = localIds[i]
            if (!localId) continue
            
            
            const dimensions = { area: 0, volume: 0, length: 0, height: 0, width: 0 }
            
            if (itemData.IsDefinedBy && Array.isArray(itemData.IsDefinedBy)) {
              for (const relation of itemData.IsDefinedBy) {
                try {
                  // EN FRAGMENTS 3.1, la relación YA CONTIENE LOS DATOS
                  // No necesitamos llamar a getProperties
                  const relationData = relation as any
                    
                  if (relationData && relationData.Quantities && Array.isArray(relationData.Quantities)) {
                    for (const quantityRef of relationData.Quantities) {
                        let quantityData: any = quantityRef
                        if ((quantityRef as any).value && typeof (quantityRef as any).value === 'object') {
                          quantityData = (quantityRef as any).value
                        }
                        
                                                if (quantityData) {
                          const qNameRaw = quantityData.Name?.value ?? quantityData.Name ?? ''
                          const quantityName = String(qNameRaw)
                          
                          if (quantityData.VolumeValue !== undefined || quantityData.Volume !== undefined) {
                            const volRaw = (quantityData.VolumeValue?.value ?? quantityData.VolumeValue ?? quantityData.Volume?.value ?? quantityData.Volume)
                            if (typeof volRaw === 'number') dimensions.volume = volRaw
                          } else if (quantityData.AreaValue !== undefined || quantityData.Area !== undefined) {
                            const areaRaw = (quantityData.AreaValue?.value ?? quantityData.AreaValue ?? quantityData.Area?.value ?? quantityData.Area)
                            if (typeof areaRaw === 'number') {
                              if (quantityName.toLowerCase().includes('footprint') || quantityName.toLowerCase().includes('area') || quantityName === '') {
                                dimensions.area = areaRaw
                              }
                            }
                          } else if (
                            quantityData.LengthValue !== undefined ||
                            quantityData.Length !== undefined ||
                            quantityData.HeightValue !== undefined ||
                            quantityData.Height !== undefined ||
                            quantityData.WidthValue !== undefined ||
                            quantityData.Width !== undefined ||
                            quantityData.Thickness !== undefined ||
                            quantityData.ThicknessValue !== undefined
                          ) {
                            const lenRaw = (quantityData.LengthValue?.value ?? quantityData.LengthValue ?? quantityData.Length?.value ?? quantityData.Length)
                            const hRaw = (quantityData.HeightValue?.value ?? quantityData.HeightValue ?? quantityData.Height?.value ?? quantityData.Height)
                            const wRaw = (
                              quantityData.WidthValue?.value ?? quantityData.WidthValue ??
                              quantityData.Width?.value ?? quantityData.Width ??
                              quantityData.ThicknessValue?.value ?? quantityData.ThicknessValue ??
                              quantityData.Thickness?.value ?? quantityData.Thickness
                            )
                            if (typeof lenRaw === 'number') dimensions.length = lenRaw
                            if (typeof hRaw === 'number') dimensions.height = hRaw
                            if (typeof wRaw === 'number') dimensions.width = wRaw
                          } else {
                          }
                        } else {
                        }
                      }
                } else {
                    }
                } catch (error) {
                }
              }
            } else {
            }
            
            if ((dimensions.area === 0) && (dimensions.volume === 0) && (dimensions.length === 0) && (dimensions.height === 0) && (dimensions.width === 0)) {
              try {
                const fallbackDims = await this.getRealElementDimensions(localId)
                elementDimensions[localId] = fallbackDims
              } catch {
                elementDimensions[localId] = dimensions
              }
            } else {
              elementDimensions[localId] = dimensions
            }
          }
                } else {
        }
      } catch (error) {
      }
    }
    
    return elementDimensions
  }

  // ====================================================================
  // FIN DE MÉTODOS COPIADOS
  // ====================================================================

  // ====================================================================
  // MÉTODO ORIGINAL COMENTADO PARA PRESERVACIÓN
  // ====================================================================
  // ====================================================================
  // FIN MÉTODO ORIGINAL COMENTADO
  // ====================================================================

  // ====================================================================
  // NUEVO MÉTODO - LÓGICA COMPLETA COPIADA DE MATERIALS/INDEX.TS
  // ====================================================================
  // Analyze complete model - use getSpatialStructure to get all elements
  async analyzeCompleteModel() {
    const startTime = performance.now();
    console.log('[LCA] 🔍 Starting full model analysis...');
    
    // Show loading indicator
    this.showLoadingIndicator('Collecting model elements...', 10);
    
    const fragmentManager = this.components.get(OBC.FragmentsManager);
    
    // Check if any models are loaded
    if (!fragmentManager.list || fragmentManager.list.size === 0) {
      console.warn('[LCA] ⚠️ No models loaded');
      const lcaContent = document.getElementById('lca-content');
      if (lcaContent) {
        lcaContent.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <div style="margin-bottom: 16px; color: #ff6b6b; font-size: 48px;">⚠️</div>
            <div style="margin-bottom: 10px; color: var(--bim-label--c); font-weight: 600; font-size: 16px;">No Model Loaded</div>
            <div style="color: var(--bim-label--c); opacity: 0.8; font-size: 14px;">
              Please load an IFC model before running the LCA analysis.
            </div>
          </div>
        `;
      }
      throw new Error('No IFC models loaded. Please load a model first.');
    }
    
    const fragmentIdMap: any = {};
    let totalElements = 0;
    
    // Get all element IDs from all models using getSpatialStructure
    for (const [modelId, model] of fragmentManager.list) {
      const allIds = new Set<number>();
      
      // Use getSpatialStructure to traverse the model hierarchy
      if (typeof (model as any).getSpatialStructure === 'function') {
        const spatialStructure = await (model as any).getSpatialStructure();
        
        // Recursively collect all element IDs from the spatial structure
        const collectIds = (node: any) => {
          // In Fragments 3.1, the property is localId, not expressID
          if (node.localId && node.localId > 0) {
            allIds.add(node.localId);
          }
          
          if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
              collectIds(child);
            }
          }
        };
        
        collectIds(spatialStructure);
      }
      
      if (allIds.size > 0) {
        fragmentIdMap[modelId] = allIds;
        totalElements += allIds.size;
      }
    }
    
    console.log(`[LCA] 📊 ${totalElements} elements found`);
    
    if (totalElements === 0) {
      const lcaContent = document.getElementById('lca-content');
      if (lcaContent) {
        lcaContent.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <div style="margin-bottom: 16px; color: #ffa500; font-size: 48px;">ℹ️</div>
            <div style="margin-bottom: 10px; color: var(--bim-label--c); font-weight: 600; font-size: 16px;">No Elements Found</div>
            <div style="color: var(--bim-label--c); opacity: 0.8; font-size: 14px;">
              The loaded model doesn't contain any elements to analyze.
            </div>
          </div>
        `;
      }
      throw new Error('No elements found in the model');
    }
    
    // Update progress
    this.showLoadingIndicator('Analyzing materials and volumes...', 20);
    
    // Use the regular calculation method
    const result = await this.calculateMaterialQuantities(fragmentIdMap);
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[LCA] ✅ Analysis completed in ${duration}s`);
    
    return result;
  }

  async calculateMaterialQuantities(fragmentIdMap: any) {
    
    return new Promise<ElementMaterialQtoResult>(async (resolve, reject) => {
      try {
        this._elementMaterialQtoResult = {};
        const fragmentManager = this.components.get(OBC.FragmentsManager);
        
        // PASO 1: Crear ModelIdMap (IGUAL QUE MATERIALS)
        let modelIdMap: any = {}
        try {
          modelIdMap = this.createModelIdMap(fragmentIdMap, fragmentManager)
        } catch (error) {
          throw error
        }
        
        // Count total elements for progress tracking
        let totalElements = 0;
        for (const modelId in modelIdMap) {
          totalElements += modelIdMap[modelId].size || modelIdMap[modelId].length || 0;
        }
        
        // PASO 2: Obtener dimensiones usando getItemsData (IGUAL QUE MATERIALS)
        this.showLoadingIndicator(`Processing ${totalElements} elements...`, 30);
        const elementDimensions = await this.getElementDimensionsLCA(modelIdMap)
        
        // PASO 3: Procesar materiales usando getItemsData (IGUAL QUE MATERIALS)
        let processedElements = 0;
        
        for (const modelId in modelIdMap) {
          const model = fragmentManager.list.get(modelId)
          if (!model) continue
          
          const localIdSet = modelIdMap[modelId]
          
          for (const localId of localIdSet) {
            processedElements++;
            
            // Update progress every 10 elements
            if (processedElements % 10 === 0 || processedElements === totalElements) {
              const progress = 30 + (processedElements / totalElements) * 60; // 30-90%
              this.showLoadingIndicator(`Analyzing materials... ${processedElements}/${totalElements}`, progress);
            }
            const localIds = [localId]
            const config: FRAGS.ItemsDataConfig = {
              attributesDefault: true,
              relations: {
                "IsDefinedBy": { attributes: true, relations: true },
                "HasAssociations": { attributes: true, relations: true }
              },
              relationsDefault: { attributes: true, relations: true }
            }
            
            try {
              const itemsData = await model.getItemsData(localIds, config)
              
              if (Array.isArray(itemsData) && itemsData.length > 0) {
                const itemData: any = itemsData[0]
                
                // Get element type from _category
                let elementType = 'Unknown'
                if (itemData._category?.value) {
                  elementType = itemData._category.value
                } else if (itemData.type) {
                  elementType = itemData.type
                }
                const formattedElementType = String(elementType).replace(/^IFC/, 'Ifc').replace(/\s+/g, '')
                
                
                if (!(formattedElementType in this._elementMaterialQtoResult)) {
                  this._elementMaterialQtoResult[formattedElementType] = {}
                }
                
                // Process HasAssociations (IGUAL QUE MATERIALS)
                if (itemData.HasAssociations && Array.isArray(itemData.HasAssociations)) {
                  
                  for (const associationRef of itemData.HasAssociations) {
                    let association: any = associationRef
                    if ((associationRef as any).value && typeof (associationRef as any).value === 'object') {
                      association = (associationRef as any).value
                    }
                    
                    if (association && association.MaterialConstituents && Array.isArray(association.MaterialConstituents)) {
                      for (const constituentRef of association.MaterialConstituents) {
                        let constituent: any = constituentRef
                        if ((constituentRef as any).value && typeof (constituentRef as any).value === 'object') {
                          constituent = (constituentRef as any).value
                        }
                        
                        if (constituent && constituent.Material) {
                          let material = null
                          
                          if (Array.isArray(constituent.Material) && constituent.Material.length > 0) {
                            material = constituent.Material[0]
                          } else if (constituent.Material.value && Array.isArray(constituent.Material.value)) {
                            material = constituent.Material.value[0]
                          } else if (typeof constituent.Material === 'object') {
                            material = constituent.Material
                          }
                          
                          if (material && material.Name) {
                            const materialName = material.Name.value || material.Name
                            
                            if (!(materialName in this._elementMaterialQtoResult[formattedElementType])) {
                              this._elementMaterialQtoResult[formattedElementType][materialName] = { NetVolume: 0 }
                            }
                            
                            // Calculate volume
                            let volume = 0
                            if (constituent.Volume && constituent.Volume.value) {
                              volume = constituent.Volume.value
                  } else {
                              volume = await this.calculateMaterialVolumeNew(
                      materialName,
                                constituent,
                                elementDimensions[localId] || {area: 0, volume: 0, length: 0, height: 0, width: 0},
                                localId,
                                association.MaterialConstituents.length
                              )
                            }
                            
                            this._elementMaterialQtoResult[formattedElementType][materialName].NetVolume += volume
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`[LCA-NEW] ❌ Error procesando elemento ${localId}:`, error)
            }
          }
        }
        
        // Final progress update
        this.showLoadingIndicator('Generating results...', 95);
        
        await this.updateMaterialTable();
        this.printMaterialSummary();
        
        // Trigger event to update LCA panel
        this.onMaterialQuantitiesComputed.trigger(this._elementMaterialQtoResult as any)

        // Automatically update the LCA panel in the UI (this will replace the loading indicator)
        this.updateLCAPanel(this._elementMaterialQtoResult);

        resolve(this._elementMaterialQtoResult);
      } catch (error) {
        console.error('❌ [LCA-NEW] ERROR EN CÁLCULO')
        console.error('❌ Error:', error);
        reject(error);
      }
    });
  }

  private printMaterialSummary() {
    console.log('\n=== LCA ANALYSIS SUMMARY ===');
    console.log('---------------------------');
    
    let totalVolume = 0;
    const elementVolumes = new Map<string, number>();
    const materialVolumes = new Map<string, number>();

    for (const elementType in this._elementMaterialQtoResult) {
      let elementTotalVolume = 0;
      const materials = this._elementMaterialQtoResult[elementType];
      
      for (const material in materials) {
        const volume = materials[material].NetVolume;
        elementTotalVolume += volume;
        totalVolume += volume;
        
        materialVolumes.set(
          material, 
          (materialVolumes.get(material) || 0) + volume
        );
      }
      
      elementVolumes.set(elementType, elementTotalVolume);
    }

    console.log('Total Volume:', totalVolume.toFixed(2), 'm³');
    console.log('\nVolumes by Element Type:');
    console.log('---------------------------');
    elementVolumes.forEach((volume, elementType) => {
      const percentage = ((volume / totalVolume) * 100).toFixed(1);
      console.log(`${elementType}: ${volume.toFixed(2)} m³ (${percentage}%)`);
    });

    console.log('\nVolumes by Material:');
    console.log('---------------------------');
    materialVolumes.forEach((volume, material) => {
      const percentage = ((volume / totalVolume) * 100).toFixed(1);
      console.log(`${material}: ${volume.toFixed(2)} m³ (${percentage}%)`);
    });

    console.log('\nAnalysis Notes:');
    console.log('---------------------------');
    if (totalVolume === 0) {
      console.log('WARNING: No volumes calculated!');
    }
    if (totalVolume > 100000) {
      console.log('WARNING: Unusually large total volume - possible unit conversion issue');
    }
    if (materialVolumes.size === 0) {
      console.log('WARNING: No materials found!');
    }
    
    console.log('===========================\n');
  }

  async dispose() {
    this.enabled = false
    this.resetMaterialQuantities()
  }

  async getMaterialQuantities() {
    // Asegurarnos de que tenemos datos en la tabla
    if (!this.materialQuantitiesTable.data || this.materialQuantitiesTable.data.length === 0) {
        throw new Error('No material quantities data available');
    }

    // Procesar los datos existentes de la tabla
    const processedData: TableRow[] = [];
    let currentCategory = '';

    this.materialQuantitiesTable.data.forEach(row => {
        if (row.isHeader) {
            // Es un encabezado de elemento IFC
            if (row.property !== 'Total Material Volumes') {
                currentCategory = row.property;
                processedData.push({
                    property: row.property,
                    value: row.value,
                    isHeader: true,
                    category: row.property
                });
            }
        } else {
            // Es una fila de material
            const materialName = row.property.trim();
            const volumeStr = String(row.value).replace(' m³', '');
            const volume = parseFloat(volumeStr);

            if (!isNaN(volume)) {
                processedData.push({
                    property: materialName,
                    value: `${(volume).toFixed(3)} m³`,
                    category: currentCategory,
                    isHeader: false
                });
            }
        }
    });

    return {
        data: processedData,
        columns: this.materialQuantitiesTable.columns
    };
  }
}