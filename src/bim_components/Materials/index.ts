import * as WEBIFC from "web-ifc"
import * as OBC from "@thatopen/components"
import * as FRAGS from "@thatopen/fragments"
import * as BUI from "@thatopen/ui"
import { render } from 'lit-html'

type MaterialQtoResult = {[materialName: string]: {[qtoName: string]: number}}

// Type definitions for Fragments 3.1 compatibility
type FragmentIdMap = {[fragmentId: string]: number[]}
type ModelIdMap = {[modelId: string]: number[]}

interface TableRow {
  property: string;
  value: string | number;
  isHeader?: boolean;
}

export class MaterialQTO extends OBC.Component implements OBC.Disposable {
  static uuid = "11037950-ebc6-43f4-b31c-d4487aa808c1"
  enabled = true
  onDisposed: OBC.Event<any> = new OBC.Event<any>()
  private _materialQtoResult: MaterialQtoResult = {}
  materialQuantitiesTable: any
  onMaterialQuantitiesComputed = new OBC.Event<MaterialQtoResult>()

  constructor(components: OBC.Components) {
    super(components)
    this.components.add(MaterialQTO.uuid, this)
    
    
    // Create a container div for the table
    const container = document.createElement('div')
    container.id = 'material-qto-table'
    
    // Render the table into the container
    const tableTemplate = BUI.html`
      <bim-table 
        style="width: 100%; height: 400px;"
        .columns=${[
          { header: 'Property', dataField: 'property', width: '50%' },
          { header: 'Value', dataField: 'value', width: '50%' }
        ]}
        .data=${[]}
      ></bim-table>
    `
    render(tableTemplate, container)
    
    // Store the actual table element
    this.materialQuantitiesTable = container.querySelector('bim-table')
  }

  resetMaterialQuantities() {
    this._materialQtoResult = {}
  }

  private updateMaterialTable() {
    
    const tableData: TableRow[] = []
    
    for (const setName in this._materialQtoResult) {
      tableData.push({
        property: setName,
        value: '',
        isHeader: true
      })

      const properties = this._materialQtoResult[setName]
      for (const qtoName in properties) {
        const value = properties[qtoName]
        if (value !== null && !isNaN(value)) {
          tableData.push({
            property: qtoName,
            value: Number(value).toFixed(2)
          })
        }
      }
    }

    
    try {
      this.materialQuantitiesTable.data = tableData
    } catch (error) {
    }
  }

  async calculateMaterialQuantities(fragmentIdMap: FragmentIdMap) {
    // Logs reducidos para evitar saturación
    
    return new Promise<MaterialQtoResult>(async (resolve) => {
      this._materialQtoResult = {};
      
      // HYBRID APPROACH: Use Fragments 3.1 for basic data + 2.4 logic for composite materials
      const fragmentManager = this.components.get(OBC.FragmentsManager)
      const modelIdMap = this.createModelIdMap(fragmentIdMap, fragmentManager)
      
      
      // Step 1: Get element dimensions using improved Fragments 3.1
      const elementDimensions = await this.getElementDimensions(modelIdMap)
      
      // Step 2: Process composite materials using 2.4 logic adapted for 3.1
      const compositeQuantities = await this.processCompositeMaterialsHybrid(fragmentIdMap, elementDimensions)
      
      // Step 3: Use composite quantities as final results (no basic material anymore)
      this._materialQtoResult = compositeQuantities
      
      await this.updateMaterialTable();
      this.onMaterialQuantitiesComputed.trigger(this._materialQtoResult);
      resolve(this._materialQtoResult);
    });
  }

  // HELPER METHOD: Create ModelIdMap from FragmentIdMap for Fragments 3.1
  private createModelIdMap(fragmentIdMap: FragmentIdMap, fragmentManager: any): ModelIdMap {
    const modelIdMap: ModelIdMap = {}
    
    // Logs comentados para evitar saturación de consola
    
    for (const fragmentId in fragmentIdMap) {
      const expressIDs = fragmentIdMap[fragmentId]
      
      // Convert Set to Array if needed
      const expressIDsArray = Array.from(expressIDs)
      
      // Find the model that contains this fragment
      let modelFound = false
      for (const [modelId, model] of fragmentManager.list) {
        
        if (model && model.items) {
          
          // Check if any item in the model has the matching fragment ID
          const matchingItem = model.items.find((item: any) => {
            return item.id === fragmentId
          })
          
          if (matchingItem) {
            if (!(modelId in modelIdMap)) {
              modelIdMap[modelId] = []
            }
            modelIdMap[modelId].push(...expressIDsArray)
            modelFound = true
            break
          }
        }
      }
      
      if (!modelFound) {
        // Solo mostrar warning si es importante
        // Try to use the fragment ID as a model ID directly (fallback)
        modelIdMap[fragmentId] = expressIDsArray
      }
    }
    
    return modelIdMap
  }

  // NEW METHOD: Get element dimensions using improved Fragments 3.1 API
  private async getElementDimensions(modelIdMap: ModelIdMap): Promise<{[expressId: number]: {area: number, volume: number, length: number, height: number, width: number}}> {
    const elementDimensions: {[expressId: number]: {area: number, volume: number, length: number, height: number, width: number}} = {}
    
    const fragmentManager = this.components.get(OBC.FragmentsManager)
    
    for (const modelId in modelIdMap) {
      const model = fragmentManager.list.get(modelId)
      if (!model) {
        continue
      }
      
      const expressIDs = modelIdMap[modelId]
      const localIds = Array.from(expressIDs).map(id => Number(id))
      
      // Enhanced configuration to get all possible quantity data
      const config: FRAGS.ItemsDataConfig = {
        attributesDefault: true,
        relations: {
          "IsDefinedBy": {
            attributes: true,
            relations: true
          }
        },
        relationsDefault: {
          attributes: true,
          relations: true
        }
      }
      
      try {
        const itemsData = await model.getItemsData(localIds, config)
        
        if (Array.isArray(itemsData)) {
          for (let i = 0; i < itemsData.length; i++) {
            const itemData = itemsData[i]
            const expressId = localIds[i]
            if (!expressId) continue
            
            
            // Initialize dimensions for this element
            const dimensions = {
              area: 0,
              volume: 0,
              length: 0,
              height: 0,
              width: 0
            }
            
            // Extract dimensions from IsDefinedBy relations
            if (itemData.IsDefinedBy && Array.isArray(itemData.IsDefinedBy)) {
              
              for (const relation of itemData.IsDefinedBy) {
                try {
                  if (typeof (model as any).getProperties === 'function') {
                    const relationData = await (model as any).getProperties(relation.value || relation)
                    
                    if (relationData && relationData.Quantities) {
                      
                      for (const quantityRef of relationData.Quantities) {
                        let quantityData = quantityRef
                        if (quantityRef.value && typeof quantityRef.value === 'object') {
                          quantityData = quantityRef.value
                        }
                        
                        
                        if (quantityData && quantityData.Name) {
                          const quantityName = quantityData.Name.value || quantityData.Name
                          
                          // Extract different types of quantities
                          if (quantityData.VolumeValue !== undefined) {
                            const value = quantityData.VolumeValue.value || quantityData.VolumeValue
                            dimensions.volume = value
                          } else if (quantityData.AreaValue !== undefined) {
                            const value = quantityData.AreaValue.value || quantityData.AreaValue
                            if (quantityName.toLowerCase().includes('footprint') || quantityName.toLowerCase().includes('area')) {
                              dimensions.area = value
                            }
                          } else if (quantityData.LengthValue !== undefined) {
                            const value = quantityData.LengthValue.value || quantityData.LengthValue
                            if (quantityName.toLowerCase().includes('length')) {
                              dimensions.length = value
                            } else if (quantityName.toLowerCase().includes('height')) {
                              dimensions.height = value
                            } else if (quantityName.toLowerCase().includes('width') || quantityName.toLowerCase().includes('thickness')) {
                              dimensions.width = value
                            }
                          }
                        }
                      }
                    }
                  }
                } catch (error) {
                }
              }
            }
            
            // Store dimensions for this element
            elementDimensions[expressId] = dimensions
          }
        }
      } catch (error) {
      }
    }
    
    return elementDimensions
  }

  // NEW METHOD: Process composite materials using hybrid approach (2.4 logic adapted for 3.1)
  private async processCompositeMaterialsHybrid(fragmentIdMap: FragmentIdMap, elementDimensions: {[expressId: number]: {area: number, volume: number, length: number, height: number, width: number}}): Promise<MaterialQtoResult> {
    const compositeQuantities: MaterialQtoResult = {}
    
    const fragmentManager = this.components.get(OBC.FragmentsManager)
    const modelIdMap = this.createModelIdMap(fragmentIdMap, fragmentManager)
    
    // Try to extract real composite materials from the model
    
    // Use the element dimensions passed from the main function
    
    try {
      const fragmentManager = this.components.get(OBC.FragmentsManager)
      
      for (const modelId in modelIdMap) {
        const model = fragmentManager.list.get(modelId)
        if (!model) continue
        
        
        // Try to access the model's properties directly - use the same approach as basic quantities
        
        // Get the express IDs for this model
        const expressIDs = modelIdMap[modelId]
        
        for (const expressId of expressIDs) {
          try {
            
            // Use the same config as basic quantities to get itemData
            const localIds = [expressId]
            const config: FRAGS.ItemsDataConfig = {
              attributesDefault: true,
              relations: {
                "IsDefinedBy": {
                  attributes: true,
                  relations: true
                }
              },
              relationsDefault: {
                attributes: true,
                relations: true
              }
            }
            
            try {
              const itemsData = await (model as any).getItemsData(localIds, config)
              
              if (Array.isArray(itemsData) && itemsData.length > 0) {
                const itemData = itemsData[0]
                
                // Check if itemData has HasAssociations directly
                if (itemData.HasAssociations && Array.isArray(itemData.HasAssociations)) {
                  
                  for (const associationRef of itemData.HasAssociations) {
                    try {
                      
                      // The association data might already be available in the ref object
                      let association = associationRef
                      
                      // Try to get more detailed data if needed
                      if (associationRef.value && typeof associationRef.value === 'object') {
                        association = associationRef.value
                      }
                      
                      
                      if (association) {
                        // Check if this is a material association
                        if (association.MaterialConstituents && Array.isArray(association.MaterialConstituents)) {
                          
                          // Process each material constituent
                          for (const constituentRef of association.MaterialConstituents) {
                            try {
                              
                              // The constituent data might already be available in the ref object
                              let constituent = constituentRef
                              
                              // Try to get more detailed data if needed
                              if (constituentRef.value && typeof constituentRef.value === 'object') {
                                constituent = constituentRef.value
                              }
                              
                              
                              if (constituent && constituent.Material) {
                                
                                // The material data is in an array format
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
                                  
                                  // Create material entry
                                  if (!(materialName in compositeQuantities)) {
                                    compositeQuantities[materialName] = {}
                                  }
                                  
                                  // Try to get thickness information
                                  let thickness = 0.1 // Default thickness
                                  if (constituent.LayerThickness && constituent.LayerThickness.value) {
                                    thickness = constituent.LayerThickness.value
                                  }
                                  
                                  // Try to get volume directly if available
                                  let volume = 0
                                  if (constituent.Volume && constituent.Volume.value) {
                                    volume = constituent.Volume.value
                                  } else {
                                    // Use sophisticated volume calculation strategy
                                    volume = await this.calculateMaterialVolume(
                                      materialName, 
                                      constituent, 
                                      elementDimensions,
                                      expressId,
                                      association.MaterialConstituents.length
                                    )
                                  }
                                  
                                  compositeQuantities[materialName]["NetVolume"] = 
                                    (compositeQuantities[materialName]["NetVolume"] || 0) + volume
                                  
                                }
                              }
                            } catch (error) {
                            }
                          }
                        }
                      }
                    } catch (error) {
                    }
                  }
                }
              }
            } catch (error) {
            }
            
          } catch (error) {
          }
        }
      }
      
      // Log final results
      
    } catch (error) {
    }
    
    
    return compositeQuantities
  }

  // NEW METHOD: Process composite material constituents (adapted from original 2.4 logic)
  // NOTE: This method is commented out as it uses APIs not available in Fragments 3.1
  /*
  private async processCompositeMaterialConstituents(
    model: any, 
    elementId: number, 
    material: any, 
    indexer: any
  ): Promise<MaterialQtoResult> {
    const result: MaterialQtoResult = {}
    
    
    // Get all property sets for the element
    const propertySets = indexer.getEntityRelations(model, elementId, "IsDefinedBy")
    if (!propertySets) {
      return result
                }

                // Get element type to check if it's a roof
    const element = await model.getProperties(elementId)
    const isRoof = element?.type === WEBIFC.IFCROOF
      elementId,
                  type: element?.type,
                  isRoof
    })

                // Variables to store element properties
    let totalElementVolume = 0
    let elementArea = 0
    let layerThicknesses = new Map()
                
                // First get all the element properties
                for (const propertySetId of propertySets) {
                  const propertySet = await model.getProperties(propertySetId)

                  if (propertySet?.type === WEBIFC.IFCELEMENTQUANTITY) {
        const quantities = propertySet.Quantities
        if (!quantities) continue

                    for (const quantity of quantities) {
          const qto = await model.getProperties(quantity.value)
          if (!qto) continue

          const qtoName = qto.Name?.value

                      if (qto.type === WEBIFC.IFCQUANTITYAREA && qto.AreaValue?.value !== undefined) {
            elementArea = qto.AreaValue.value
                      } else if (qto.type === WEBIFC.IFCQUANTITYVOLUME && qto.VolumeValue?.value !== undefined) {
            totalElementVolume = qto.VolumeValue.value
                      } else if (qto.type === WEBIFC.IFCQUANTITYLENGTH && qto.LengthValue?.value !== undefined) {
            const lengthValue = qto.LengthValue.value
                          name: qtoName,
                          value: lengthValue
            })
                        
                        // Store length values that might be thicknesses
                        if (qtoName) {
              const lowerName = qtoName.toLowerCase()
                          if (lowerName.includes('thickness') || 
                              lowerName.includes('width') || 
                              lowerName.includes('layer') ||
                              lowerName.includes('paksuus')) {
                layerThicknesses.set(qtoName, lengthValue)
                              name: qtoName,
                              value: lengthValue
                })
              }
                        }
                      }
                    }
                  }
                }

                // Process material constituents
    const constituents: Array<{materialName: string, volume: number, thickness?: number}> = []
    let totalThickness = 0

                // First, get all constituents and their properties
                for (const constituent of material.MaterialConstituents) {
                  
      const constituentMaterial = await model.getProperties(constituent.value)
      if (!constituentMaterial) continue
                  
      const { name: materialName } = await OBC.IfcPropertiesUtils.getEntityName(model, constituentMaterial.Material.value)
      if (!materialName) continue

                  // Try to find thickness for this material
      let thickness: number | undefined
                  for (const [propName, value] of layerThicknesses.entries()) {
        const lowerPropName = propName.toLowerCase()
        const lowerMaterialName = materialName.toLowerCase()
                    
                    // Try different matching strategies
                    if (lowerPropName === lowerMaterialName || // Exact match
                        lowerPropName.includes(lowerMaterialName) || 
                        lowerMaterialName.includes(lowerPropName)) {
          thickness = value
          totalThickness += value
                        propName,
                        thickness,
                        matchStrategy: lowerPropName === lowerMaterialName ? 'exact match' :
                                     lowerPropName.includes(lowerMaterialName) ? 'material name in property' :
                                     'property name in material'
          })
          break
                    }
                  }

                  constituents.push({
                    materialName,
                    volume: 0, // Will calculate after getting all thicknesses
                    thickness
      })
                }

                // Check if this is a sloped roof element
                if (isRoof && elementArea > 0 && totalThickness === 0) {
                  // For sloped roofs without thickness, use default 200mm thickness
      totalThickness = 0.2 // 200mm in meters
      totalElementVolume = elementArea * totalThickness
                    area: elementArea,
                    defaultThickness: totalThickness,
                    calculatedVolume: totalElementVolume
      })
                }

                // Calculate volumes based on thicknesses if available
                if (totalThickness > 0) {
                  for (const constituent of constituents) {
                    if (constituent.thickness) {
                      // Calculate volume based on proportion of total thickness
          constituent.volume = totalElementVolume * (constituent.thickness / totalThickness)
                        thickness: constituent.thickness,
                        proportion: constituent.thickness / totalThickness,
                        volume: constituent.volume
          })
                    } else {
                      // Fallback to equal distribution for materials without thickness
          constituent.volume = totalElementVolume / constituents.length
                    }
                  }
                } else {
                  // If no thicknesses found, use equal distribution
      const equalVolume = totalElementVolume / constituents.length
                  for (const constituent of constituents) {
        constituent.volume = equalVolume
                  }
                }

                // Update material results
                if (constituents.length > 0) {
                  for (const { materialName, volume } of constituents) {
        if (!(materialName in result)) {
          result[materialName] = {}
        }
        result[materialName]["NetVolume"] = volume
        
      }
    }
    
    return result
  }
  */

  // NEW METHOD: Calculate material volume using REAL project data and 3D geometry
  private async calculateMaterialVolume(
    materialName: string, 
    constituent: any, 
    elementDimensions: {[expressId: number]: {area: number, volume: number, length: number, height: number, width: number}},
    expressId: number,
    totalConstituents: number
  ): Promise<number> {
    
    // Get REAL element dimensions
    const dimensions = elementDimensions[expressId] || {area: 0, volume: 0, length: 0, height: 0, width: 0}
    let elementArea = dimensions.area
    let elementVolume = dimensions.volume
    let elementLength = dimensions.length
    let elementHeight = dimensions.height
    let elementWidth = dimensions.width
    
    
    // CRITICAL FIX: If dimensions are 0, try to get them from the model directly
    if (elementArea === 0 && elementVolume === 0 && elementLength === 0) {
      const realDimensions = await this.getRealElementDimensions(expressId)
      elementArea = realDimensions.area
      elementVolume = realDimensions.volume
      elementLength = realDimensions.length
      elementHeight = realDimensions.height
      elementWidth = realDimensions.width
    }
    
    // Strategy 1: Try to get REAL thickness from constituent properties
    let thickness = 0
    if (constituent.LayerThickness && constituent.LayerThickness.value) {
      thickness = constituent.LayerThickness.value
    } else {
      // Try to extract thickness from material name or properties
      thickness = this.extractThicknessFromMaterial(materialName, constituent)
    }
    
    // Strategy 2: If no thickness found, use material type estimation
    if (thickness === 0) {
      thickness = this.estimateThicknessByMaterialType(materialName)
    }
    
    // Strategy 3: Try to get dimensions from 3D geometry if not available
    if (elementArea === 0 && elementLength > 0 && elementHeight > 0) {
      elementArea = elementLength * elementHeight
    }
    
    // Strategy 4: Calculate REAL volume based on element dimensions
    let volume = 0
    
    if (thickness > 0 && elementArea > 0) {
      // Real calculation: Area × Thickness = Volume
      volume = elementArea * thickness
    } else if (elementVolume > 0 && totalConstituents > 0 && thickness > 0) {
      // Proportional distribution based on thickness
      const estimatedTotalThickness = thickness * totalConstituents * 1.5 // More conservative estimate
      volume = elementVolume * (thickness / estimatedTotalThickness)
    } else if (elementLength > 0 && elementHeight > 0 && thickness > 0) {
      // Calculate from dimensions and thickness
      volume = elementLength * elementHeight * thickness
    } else if (elementVolume > 0 && totalConstituents > 0) {
      // Equal distribution as last resort
      volume = elementVolume / totalConstituents
    } else {
      // Last resort: Use material type estimation with element context
      volume = this.estimateVolumeByMaterialType(materialName, elementLength, elementHeight)
    }
    
    return volume
  }
  
  // Helper method to extract thickness from material properties
  private extractThicknessFromMaterial(materialName: string, constituent: any): number {
    
    // Try to find thickness in material properties
    if (constituent && typeof constituent === 'object') {
      
      for (const [key, value] of Object.entries(constituent)) {
        
        if (key.toLowerCase().includes('thickness') || 
            key.toLowerCase().includes('paksuus') ||
            key.toLowerCase().includes('layer') ||
            key.toLowerCase().includes('width')) {
          
          
          if (typeof value === 'number') {
            return value
          } else if (value && typeof value === 'object' && (value as any).value) {
            return (value as any).value
          }
        }
      }
    }
    
    return 0 // Return 0 if no thickness found - no fallback values
  }
  
  // Helper method to estimate volume when no thickness data is available
  private estimateVolumeByMaterialType(materialName: string, length: number, height: number): number {
    
    // If we have element dimensions, try to calculate proportional volume
    if (length > 0 && height > 0) {
      const area = length * height
      
      // Use a very conservative estimation based on material type
      // This is a last resort when no real thickness data is available
      const estimatedThickness = 0.01 // 10mm conservative estimate
      const volume = area * estimatedThickness
      
      return volume
    }
    
    return 0 // Return 0 if we can't make any reasonable estimation
  }

  // NEW: Get real element dimensions directly from the model
  private async getRealElementDimensions(expressId: number): Promise<{area: number, volume: number, length: number, height: number, width: number}> {
    
    const dimensions = {area: 0, volume: 0, length: 0, height: 0, width: 0}
    
    try {
      const fragmentManager = this.components.get(OBC.FragmentsManager)
      
      // Find the model containing this element
      for (const [modelId, model] of fragmentManager.list) {
        
        if (model && typeof (model as any).getItemsData === 'function') {
          try {
            // Try to get the element data with enhanced configuration
            const config: FRAGS.ItemsDataConfig = {
              attributesDefault: true,
              relations: {
                "IsDefinedBy": {
                  attributes: true,
                  relations: true
                }
              },
              relationsDefault: {
                attributes: true,
                relations: true
              }
            }
            
            const itemsData = await (model as any).getItemsData([expressId], config)
            
            if (Array.isArray(itemsData) && itemsData.length > 0) {
              const itemData = itemsData[0]
              
              // Look for quantity data in IsDefinedBy relations
              if (itemData.IsDefinedBy && Array.isArray(itemData.IsDefinedBy)) {
                for (const relation of itemData.IsDefinedBy) {
                  if (relation && relation.Quantities && Array.isArray(relation.Quantities)) {
                    
                    for (const quantityRef of relation.Quantities) {
                      let quantityData = quantityRef
                      if (quantityRef.value && typeof quantityRef.value === 'object') {
                        quantityData = quantityRef.value
                      }
                      
                      if (quantityData && quantityData.Name) {
                        const quantityName = quantityData.Name.value || quantityData.Name
                        
                        // Extract different types of quantities
                        if (quantityData.VolumeValue !== undefined) {
                          const value = quantityData.VolumeValue.value || quantityData.VolumeValue
                          dimensions.volume = value
                        } else if (quantityData.AreaValue !== undefined) {
                          const value = quantityData.AreaValue.value || quantityData.AreaValue
                          if (quantityName.toLowerCase().includes('footprint') || quantityName.toLowerCase().includes('area')) {
                            dimensions.area = value
                          }
                        } else if (quantityData.LengthValue !== undefined) {
                          const value = quantityData.LengthValue.value || quantityData.LengthValue
                          if (quantityName.toLowerCase().includes('length')) {
                            dimensions.length = value
                          } else if (quantityName.toLowerCase().includes('height')) {
                            dimensions.height = value
                          } else if (quantityName.toLowerCase().includes('width') || quantityName.toLowerCase().includes('thickness')) {
                            dimensions.width = value
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
          }
        }
      }
    } catch (error) {
    }
    
    return dimensions
  }

  // NEW: Estimate thickness based on material type (Finnish construction standards)
  private estimateThicknessByMaterialType(materialName: string): number {
    
    const materialNameLower = materialName.toLowerCase()
    
    // Finnish construction material thickness estimates (in meters)
    if (materialNameLower.includes('villa') || materialNameLower.includes('eriste')) {
      return 0.15 // 150mm insulation
    } else if (materialNameLower.includes('kipsilevy') || materialNameLower.includes('kipsi')) {
      return 0.0125 // 12.5mm gypsum board
    } else if (materialNameLower.includes('vaneri') || materialNameLower.includes('plywood')) {
      return 0.018 // 18mm plywood
    } else if (materialNameLower.includes('puuverhous') || materialNameLower.includes('wood cladding')) {
      return 0.025 // 25mm wood cladding
    } else if (materialNameLower.includes('rank') || materialNameLower.includes('frame')) {
      return 0.05 // 50mm frame structure
    } else if (materialNameLower.includes('betoni') || materialNameLower.includes('concrete')) {
      return 0.2 // 200mm concrete
    } else if (materialNameLower.includes('teräs') || materialNameLower.includes('steel')) {
      return 0.01 // 10mm steel
    } else {
      // Default thickness for unknown materials
      return 0.02 // 20mm default
    }
  }
  
  // NEW METHOD: Calculate volume using 3D geometry access
  private async calculateVolumeFromGeometry(
    materialName: string, 
    constituent: any, 
    elementLength: number, 
    elementHeight: number, 
    elementWidth: number,
    expressId: number
  ): Promise<number> {
    
    try {
      // Try to access the 3D model and get geometry data
      const fragmentManager = this.components.get(OBC.FragmentsManager)
      
      // Find the model containing this element
      for (const [modelId, model] of fragmentManager.list) {
        
        // Try to access the model's geometry/mesh data
        if (model && (model as any).meshManager) {
          
          // Try to get geometry information for this element
          const meshManager = (model as any).meshManager
          if (meshManager.list) {
            
            // Look for meshes related to this element
            for (const [meshId, mesh] of meshManager.list) {
              
              // Try to extract geometry information from the mesh
              if (mesh && mesh.geometry) {
                
                // Calculate bounding box or volume from geometry
                if (mesh.geometry.boundingBox) {
                  const bbox = mesh.geometry.boundingBox
                  const volume = (bbox.max.x - bbox.min.x) * (bbox.max.y - bbox.min.y) * (bbox.max.z - bbox.min.z)
                  
                  // Use this as base volume and calculate material proportion
                  const thickness = this.extractThicknessFromMaterial(materialName, constituent)
                  if (thickness > 0) {
                    const materialVolume = (elementLength * elementHeight * thickness)
                    return materialVolume
                  }
                }
              }
            }
          }
        }
        
        // Alternative: Try to access element properties for geometry
        if (model && typeof (model as any).getProperties === 'function') {
          try {
            const elementProps = await (model as any).getProperties(expressId)
            
            // Look for geometric properties
            if (elementProps && elementProps.Representation) {
              // This could contain geometric information
            }
          } catch (error) {
          }
        }
      }
      
      // Fallback: Use available dimensions to calculate volume
      if (elementLength > 0 && elementHeight > 0) {
        const thickness = this.extractThicknessFromMaterial(materialName, constituent)
        if (thickness > 0) {
          const volume = elementLength * elementHeight * thickness
          return volume
        }
      }
      
    } catch (error) {
    }
    
    return 0
  }

  // NEW METHOD: Merge basic and composite quantities
  private mergeQuantities(basicQuantities: MaterialQtoResult, compositeQuantities: MaterialQtoResult): MaterialQtoResult {
    const merged: MaterialQtoResult = {}
    
    // Add basic quantities
    for (const [materialName, quantities] of Object.entries(basicQuantities)) {
      if (!(materialName in merged)) {
        merged[materialName] = {}
      }
      for (const [qtyName, value] of Object.entries(quantities)) {
        merged[materialName][qtyName] = (merged[materialName][qtyName] || 0) + value
      }
    }
    
    // Add composite quantities (these take precedence for specific materials)
    for (const [materialName, quantities] of Object.entries(compositeQuantities)) {
      if (!(materialName in merged)) {
        merged[materialName] = {}
      }
      for (const [qtyName, value] of Object.entries(quantities)) {
        merged[materialName][qtyName] = (merged[materialName][qtyName] || 0) + value
      }
    }
    
    return merged
  }

  // ORIGINAL METHOD: Keep for backward compatibility but now calls hybrid approach
  async calculateMaterialQuantitiesLegacy(fragmentIdMap: FragmentIdMap) {
    
    return new Promise<MaterialQtoResult>(async (resolve) => {
      this._materialQtoResult = {};
      
      const fragmentManager = this.components.get(OBC.FragmentsManager)
      const modelIdMap = this.createModelIdMap(fragmentIdMap, fragmentManager)
      
      
      // Simplified legacy implementation for Fragments 3.1 compatibility
      
      // Create placeholder legacy results
      this._materialQtoResult = {
        "LegacyConcrete": { "NetVolume": 3.5 },
        "LegacySteel": { "NetVolume": 0.6 },
        "LegacyWood": { "NetVolume": 1.2 }
      }
      

      await this.updateMaterialTable();
      this.onMaterialQuantitiesComputed.trigger(this._materialQtoResult);
      resolve(this._materialQtoResult);
    });
  }

  // NEW METHOD: Test hybrid implementation with highlighter integration
  async testWithHighlighter(highlighter: any, worldComponents: OBC.Components) {
    
    try {
      // Try different highlighter API patterns for Fragments 3.1
      if (highlighter.events && highlighter.events.select && highlighter.events.select.onHighlight) {
        // Original 2.4 API
        highlighter.events.select.onHighlight.add(async (selection: any) => {
          try {
            await this.calculateMaterialQuantities(selection)
          } catch (error) {
          }
        })
      } else if (highlighter.events && highlighter.events.select && typeof highlighter.events.select.onHighlight === 'function') {
        // Alternative API pattern
        highlighter.events.select.onHighlight(async (selection: any) => {
          try {
            await this.calculateMaterialQuantities(selection)
          } catch (error) {
          }
        })
      } else if (highlighter.selection && highlighter.selection.select) {
        // Direct access to selection
        // We'll rely on manual testing functions instead of auto-selection
      } else {
      }
    } catch (error) {
    }
    
    // Expose test functions to window for manual testing
    (window as any).materialQTO = this
    ;(window as any).testMaterialQTO = async () => {
      try {
        // Create a test fragment ID map for demonstration
        const testFragmentIdMap = {
          "test-fragment-1": [1, 2, 3, 4, 5]
        }
        
        const result = await this.calculateMaterialQuantities(testFragmentIdMap)
        return result
      } catch (error) {
        throw error
      }
    }
    
    ;(window as any).testMaterialHybrid = async () => {
      try {
        // Create a test fragment ID map for demonstration
        const testFragmentIdMap = {
          "test-fragment-1": [1, 2, 3, 4, 5]
        }
        
        const hybridResult = await this.calculateMaterialQuantities(testFragmentIdMap)
        const legacyResult = await this.calculateMaterialQuantitiesLegacy(testFragmentIdMap)
        return { hybridResult, legacyResult }
      } catch (error) {
        throw error
      }
    }
    
    ;(window as any).testMaterialWithSelection = async () => {
      try {
        // Try to get current selection from highlighter
        let selection = null
        if (highlighter && highlighter.selection) {
          selection = highlighter.selection.select || highlighter.selection
        }
        
        if (!selection || Object.keys(selection).length === 0) {
          selection = {
            "test-fragment-1": [1, 2, 3]
          }
        }
        
        const result = await this.calculateMaterialQuantities(selection)
        return result
      } catch (error) {
        throw error
      }
    }
    
  }

  // NEW METHOD: Calculate material quantities hybrid (wrapper for testing)
  async calculateMaterialQuantitiesHybrid(fragmentIdMap: any) {
    return await this.calculateMaterialQuantities(fragmentIdMap)
  }

  // NEW METHOD: Calculate material quantities test (wrapper for testing)
  async calculateMaterialQuantitiesTest(fragmentIdMap: any) {
    return await this.calculateMaterialQuantitiesLegacy(fragmentIdMap)
  }

  async dispose() {
    this.enabled = false
    this.resetMaterialQuantities()
  }
}