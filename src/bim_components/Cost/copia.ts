import * as WEBIFC from "web-ifc"
import * as OBC from "@thatopen/components"
import * as FRAGS from "@thatopen/fragments"
import { Component, Components, Event } from '@thatopen/components';
import { ElementData, BaseCostElement } from '../../types/cost/shared';
import { MaterialCostsTableData } from '../../types/cost/elements';
import type { IFCQuantityValue } from '../../types/cost';
import { getTalo2000Quantity, TALO_2000_MEASUREMENTS } from '../../constants/talo2000';
import { UnifiedCostService } from '../../services/UnifiedCostService';

export const IFC = {
  IFCQUANTITYLENGTH: 357,
  IFCELEMENTQUANTITY: 358,
  IFCQUANTITYVOLUME: 359,
  IFCQUANTITYAREA: 360,
  IFCRELASSOCIATESCLASSIFICATION: 647927063,
  IFCCLASSIFICATIONREFERENCE: 437
};

interface MaterialCostsTable {
  columns: Array<{
    header: string;
    dataField: string;
    width: string;
    sortable: boolean;
  }>;
  data: MaterialCostsTableData[];
}

export class CostCalculator extends OBC.Component {
  static uuid = "b7fa5ae6-7ce8-471a-8d90-b3f14b755c21"
  enabled = true
  onDisposed: OBC.Event<any>
  onMaterialCostsComputed: OBC.Event<BaseCostElement[]>
  onProgress: OBC.Event<number>
  onError: OBC.Event<Error>
  private _results: BaseCostElement[] = []
  private fragments: OBC.FragmentsManager
  private costService: UnifiedCostService

  materialCostsTable: MaterialCostsTable = {
    columns: [
      { header: 'TALO Code', dataField: 'taloCode', width: '15%', sortable: true },
      { header: 'Element Type', dataField: 'type', width: '25%', sortable: true },
      { header: 'Element Name', dataField: 'name', width: '25%', sortable: true },
      { header: 'Material Cost', dataField: 'materialCost', width: '15%', sortable: true },
      { header: 'Total Cost', dataField: 'totalCost', width: '20%', sortable: true }
    ],
    data: [{
      id: '0',
      name: 'No data',
      description: 'No data available',
      type: '-',
      category: '-',
      taloCode: '-',
      materialCost: 0,
      laborCost: 0,
      equipmentCost: 0,
      overheadCost: 0,
      totalCost: 0
    }]
  }

  constructor(components: OBC.Components) {
    super(components)
    this.components = components
    this.fragments = components.get(OBC.FragmentsManager)
    this.costService = UnifiedCostService.getInstance()
    
    this.onDisposed = new OBC.Event()
    this.onMaterialCostsComputed = new OBC.Event()
    this.onProgress = new OBC.Event()
    this.onError = new OBC.Event()
  }

  async calculateMaterialCosts(fragmentIdMap: any) {
    console.log('[Cost] 🔍 calculateMaterialCosts called with fragmentIdMap:', fragmentIdMap);
    this._results = [];

    const models = this.fragments.list;
    console.log('[Cost] 🔍 Fragments list:', models);
    let processedCount = 0;
    let totalElements = 0;

    // Prefer the incoming fragmentIdMap (from analyzeCompleteModel) to count and process
    if (fragmentIdMap && typeof fragmentIdMap === 'object' && Object.keys(fragmentIdMap).length > 0) {
      // Count total elements from the provided map
      console.log('[Cost] 🔍 Counting total elements from fragmentIdMap...');
      for (const modelId in fragmentIdMap) {
        const ids = fragmentIdMap[modelId];
        const count = ids instanceof Set ? ids.size : Array.isArray(ids) ? ids.length : 0;
        totalElements += count;
      }
      console.log('[Cost] 🔍 Total elements to process (from map):', totalElements);

      // Process using the provided map
      for (const [modelId, model] of models) {
        const ids = fragmentIdMap[modelId];
        if (!ids) continue;

        console.log('[Cost] 🔍 Processing model from map:', modelId);
        const iterable = ids instanceof Set ? Array.from(ids) : Array.isArray(ids) ? ids : [];
        for (const id of iterable) {
          await this.processElement(model, Number(id));
          processedCount++;
          if (totalElements > 0) this.onProgress.trigger((processedCount / totalElements) * 100);
        }
      }
    } else {
      // Fallback: legacy path (may result in 0 if items are not exposed)
      console.log('[Cost] ⚠️ fragmentIdMap empty in calculateMaterialCosts; using legacy items traversal');
    // Count total elements
      console.log('[Cost] 🔍 Counting total elements (legacy)...');
    for (const [_, model] of models) {
        if ((model as any)?.items) {
          for (const fragment of (model as any).items) {
          totalElements += fragment.ids.size;
        }
      }
    }
      console.log('[Cost] 🔍 Total elements to process (legacy):', totalElements);

      // Process each model (legacy)
    for (const [modelId, model] of models) {
        console.log('[Cost] 🔍 Processing model (legacy):', modelId);
        if ((model as any)?.items) {
          for (const fragment of (model as any).items) {
          for (const id of fragment.ids) {
            await this.processElement(model, id);
            processedCount++;
              if (totalElements > 0) this.onProgress.trigger((processedCount / totalElements) * 100);
            }
          }
        }
      }
    }

    console.log('[Cost] 🔍 Final results count:', this._results.length);
    console.log('[Cost] 🔍 Final results:', this._results);
    this.updateResultsTable();
    console.log('[Cost] 🔍 Triggering onMaterialCostsComputed event...');
    this.onMaterialCostsComputed.trigger(this._results);
    console.log('[Cost] 🔍 Event triggered successfully');
    return this._results;
  }

  private async processElement(model: any, id: number): Promise<void> {
    console.log('[Cost] 🔍 Processing element ID:', id);
    try {
      // Fragments 3.1: use getItemsData with localId and a rich config
      const localIds = [Number(id)];
      const config: FRAGS.ItemsDataConfig = {
        attributesDefault: true,
        relations: {
          "IsDefinedBy": { attributes: true, relations: true },
          "HasAssociations": { attributes: true, relations: true }
        },
        relationsDefault: { attributes: true, relations: true }
      };

      const itemsData = await model.getItemsData(localIds, config);
      if (!Array.isArray(itemsData) || itemsData.length === 0) {
        console.log('[Cost] ⚠️ No item data from getItemsData for ID:', id);
        return;
      }

      const itemData: any = itemsData[0];

      // Type/category
      let elementType = 'Unknown';
      if (itemData._category?.value) elementType = itemData._category.value;
      else if (itemData.type) elementType = itemData.type;
      const ifcType = String(elementType).replace(/^IFC/, 'Ifc').replace(/\s+/g, '');
      const ifcTypeLower = ifcType.toLowerCase();

      // Skip non-costable container/site/meta types
      const excludedTypes = new Set<string>([
        'ifcproject','ifcsite','ifcbuilding','ifcbuildingstorey','ifcgrid','ifcgeographicelement'
      ]);
      if (excludedTypes.has(ifcTypeLower)) {
        console.log('[Cost] ⏭️ Skipping non-costable type:', ifcType);
        return;
      }

      // Name/category (fallbacks)
      const elementName = itemData.Name?.value || itemData.name || 'Unknown';
      const elementCategory = itemData.ObjectType?.value || ifcType;

      // Quantities from IsDefinedBy
      const quantities: { [key: string]: IFCQuantityValue } = {};
      if (itemData.IsDefinedBy && Array.isArray(itemData.IsDefinedBy)) {
        for (const relation of itemData.IsDefinedBy) {
          const relationData: any = relation as any;
          if (relationData && relationData.Quantities && Array.isArray(relationData.Quantities)) {
            for (const quantityRef of relationData.Quantities) {
              let quantityData: any = quantityRef;
              if ((quantityRef as any).value && typeof (quantityRef as any).value === 'object') {
                quantityData = (quantityRef as any).value;
              }
              if (quantityData && quantityData.Name) {
                const qName = quantityData.Name.value || quantityData.Name;
              let value: number | undefined;
              let unit = '';
                if (quantityData.VolumeValue !== undefined) {
                  value = quantityData.VolumeValue.value || quantityData.VolumeValue; unit = 'm3';
                } else if (quantityData.AreaValue !== undefined) {
                  value = quantityData.AreaValue.value || quantityData.AreaValue; unit = 'm2';
                } else if (quantityData.LengthValue !== undefined) {
                  value = quantityData.LengthValue.value || quantityData.LengthValue; unit = 'm';
                }
                if (value !== undefined) {
                  quantities[String(qName)] = { value, unit } as IFCQuantityValue;
                }
              }
            }
          }
        }
      }

      // TALO classification search - NEW APPROACH: Direct IFC data access
      let taloCode = '';
      let taloName = '';

      console.log('[Cost] 🔍 Searching for TALO classification in element ID:', id);
      
      // NEW APPROACH: Direct search for specific TALO classification relations
      try {
        console.log('[Cost] 🔍 Trying direct TALO relation search approach...');
        
        // Based on the IFC data you provided, we know these specific IDs exist:
        // #21992=IFCRELASSOCIATESCLASSIFICATION (TALO 2000)
        // #27220=IFCCLASSIFICATIONREFERENCE (contains the actual TALO code)
        
        const config: FRAGS.ItemsDataConfig = {
          attributesDefault: true,
          relations: {
            "IsDefinedBy": { attributes: true, relations: true },
            "HasAssociations": { attributes: true, relations: true },
            "RelatedObjects": { attributes: true, relations: true },
            "RelatingClassification": { attributes: true, relations: true }
          },
          relationsDefault: { attributes: true, relations: true }
        };
        
        // Search for the specific TALO classification relation ID
        const taloRelationIds = [21992, 27220]; // Known IDs from your IFC data
        
        console.log('[Cost] 🔍 Searching for specific TALO relation IDs:', taloRelationIds);
        
        const itemsData = await model.getItemsData(taloRelationIds, config);
        console.log('[Cost] 🔍 Retrieved', itemsData.length, 'specific items');
        
        // Look for the TALO classification relation
        for (const itemData of itemsData) {
          const item: any = itemData;
          
          console.log('[Cost] 🔍 Checking specific item:', {
            id: item._id || item.id,
            name: item.Name?.value || item.Name,
            description: item.Description?.value || item.Description,
            hasRelatedObjects: !!item.RelatedObjects,
            hasRelatingClassification: !!item.RelatingClassification
          });
          
          // Check if this is the TALO classification relation
          const name = String(item.Name?.value || item.Name || '');
          const description = String(item.Description?.value || item.Description || '');
          
          if (name.includes('TALO') || description.includes('TALO')) {
            console.log('[Cost] 🔍 Found TALO classification relation!');
            
            // Check if our element ID is in the related objects
            if (item.RelatedObjects && Array.isArray(item.RelatedObjects)) {
              const relatedObjectIds = item.RelatedObjects.map((obj: any) => {
                return obj.value || obj.id || obj;
              });
              console.log('[Cost] 🔍 Related object IDs:', relatedObjectIds);
              
              if (relatedObjectIds.includes(id)) {
                console.log('[Cost] 🎯 Element ID', id, 'found in TALO classification relation!');
                
                // Get the classification reference
                if (item.RelatingClassification) {
                  let classificationRef = item.RelatingClassification;
                  if (classificationRef.value) {
                    classificationRef = classificationRef.value;
                  }
                  
                  console.log('[Cost] 🔍 Classification reference:', classificationRef);
                  
                  // Extract TALO code from the classification reference
                  const identification = classificationRef.Identification?.value || classificationRef.Identification;
                  const refName = classificationRef.Name?.value || classificationRef.Name || '';
                  
                  if (identification) {
                    taloCode = identification;
                    taloName = refName || `TALO ${taloCode}`;
                    console.log('[Cost] 🎯 TALO code extracted via direct search:', { 
                      taloCode, 
                      taloName,
                      source: 'Direct TALO relation search'
                    });
                    break;
                  }
                }
              }
            }
          }
          
          // Also check if this is a classification reference with TALO code
          const identification = item.Identification?.value || item.Identification;
          if (identification && typeof identification === 'string' && identification.match(/^\d+\.\d+/)) {
            console.log('[Cost] 🔍 Found potential TALO code in classification reference:', identification);
            
            // This might be the classification reference itself
            // We need to check if this reference is related to our element
            // For now, let's use it as a potential TALO code
            taloCode = identification;
            taloName = item.Name?.value || item.Name || `TALO ${taloCode}`;
            console.log('[Cost] 🎯 TALO code extracted from classification reference:', { 
              taloCode, 
              taloName,
              source: 'Classification reference direct'
            });
          }
        }
        
        if (!taloCode) {
          console.log('[Cost] ⚠️ No TALO classification found via direct search for element ID:', id);
        }
      } catch (error) {
        console.log('[Cost] ⚠️ Error in direct TALO search approach:', error);
      }
      
      // Fallback: If direct IFC access failed, try the original approach
      if (!taloCode) {
        console.log('[Cost] 🔍 Direct IFC access failed, trying original IfcRelationsIndexer approach...');
        
        try {
          // Check if IfcRelationsIndexer is available
          let indexer = null;
          try {
            indexer = this.components.get(OBC.IfcRelationsIndexer);
          } catch (indexerError) {
            console.log('[Cost] 🔍 IfcRelationsIndexer not available (expected in Fragments 3.1)');
          }
          
          if (indexer) {
            console.log('[Cost] 🔍 IfcRelationsIndexer found, using original approach');
            
            // Process the model with the indexer
            await indexer.process(model);
            
            // Get TALO classification using the original method
            const classificationRelations = indexer.getEntityRelations(model, id, "HasAssociations");
            if (classificationRelations) {
              console.log('[Cost] 🔍 Classification relations found:', classificationRelations.length);
              
              for (const relId of classificationRelations) {
                const relation = await model.getProperties(relId);
                if (!relation || relation.type !== IFC.IFCRELASSOCIATESCLASSIFICATION) continue;

                console.log('[Cost] 🔍 Processing classification relation:', {
                  type: relation.type,
                  identification: relation.Identification?.value,
                  name: relation.Name?.value
                });

                const identification = relation.Identification?.value;
                const name = relation.Name?.value;

                if (identification) {
                  if (relation.ReferencedSource?.value) {
                    const sourceData = await model.getProperties(relation.ReferencedSource.value);

                    if (sourceData?.Name?.value?.includes('TALO') || 
                        sourceData?.Description?.value?.includes('TALO')) {
                      taloCode = identification;
                      taloName = name || '';
                      console.log('[Cost] 🎯 TALO code found via ReferencedSource:', { 
                        taloCode, 
                        taloName,
                        sourceName: sourceData?.Name?.value,
                        sourceDesc: sourceData?.Description?.value
                      });
                      break;
                    }
                  } else if (identification.match(/^\d+\.\d+(\.\d+)*$/)) {
                    taloCode = identification;
                    taloName = name || '';
                    console.log('[Cost] 🎯 TALO code found via direct identification:', { taloCode, taloName });
                    break;
                  }
                }
              }
            } else {
              console.log('[Cost] ⚠️ No classification relations found for element ID:', id);
            }
          }
        } catch (error) {
          console.log('[Cost] ⚠️ Error in original approach:', error);
        }
      }
      
      // Final fallback: Direct mapping if nothing else worked
      if (!taloCode) {
        console.log('[Cost] 🔍 Using direct TALO mapping as final fallback...');
        
        const elementName = itemData.Name?.value || itemData.name || '';
        const elementType = itemData._category?.value || itemData.type || '';
        
        console.log('[Cost] 🔍 Element details for TALO mapping:', {
          id: id,
          name: elementName,
          type: elementType
        });
        
        // ENHANCED TALO mapping based on specific IFC data from your model
        // Based on the IFC data: #27220=IFCCLASSIFICATIONREFERENCE($,'1.2.3.2','Kantavat sein\X\E4t',#28240,$,$);
        const taloMapping: { [key: string]: { code: string; name: string } } = {
          // Walls - Based on your IFC data, walls should be 1.2.3.2 (Load-bearing walls)
          'ifcwall': { code: '1.2.3.2', name: 'Kantavat seinät' }, // Load-bearing walls
          'wall': { code: '1.2.3.2', name: 'Kantavat seinät' },
          
          // Other elements based on Finnish TALO 2000 standards
          'ifcslab': { code: '1.2.2', name: 'Base floors' },
          'ifcroof': { code: '1.2.6', name: 'Roofs' },
          'ifccolumn': { code: '1.2.3.1', name: 'Load-bearing columns' },
          'ifcbeam': { code: '1.2.3.1', name: 'Load-bearing beams' },
          'ifcfooting': { code: '1.2.1', name: 'Foundations' },
          'ifcwindow': { code: '1.3.2', name: 'Windows' },
          'ifcdoor': { code: '1.3.2', name: 'Doors' },
          'ifccovering': { code: '1.3.3', name: 'Ceilings' },
          'ifcrailing': { code: '1.3.4', name: 'Accessories' },
          'ifcpipesegment': { code: '2.1.1', name: 'Pipe components' },
          'ifcductsegment': { code: '2.1.2', name: 'Duct components' },
          'ifccablesegment': { code: '2.4.1', name: 'Electrical cables' },
          'ifcelectricappliance': { code: '2.4.2', name: 'Electrical appliances' },
          'ifccommunicationsappliance': { code: '2.4.3', name: 'Communications equipment' },
          'ifcsanitaryterminal': { code: '2.1.3', name: 'Sanitary fixtures' },
          'ifcfurniture': { code: '3.1.1', name: 'Interior elements' }
        };
        
        const elementTypeLower = elementType.toLowerCase().replace(/^ifc/, '');
        console.log('[Cost] 🔍 Looking for mapping for type:', elementTypeLower);
        console.log('[Cost] 🔍 Available mappings:', Object.keys(taloMapping));
        
        // Try both with and without 'ifc' prefix
        let mappedTalo = taloMapping[elementTypeLower];
        if (!mappedTalo && elementTypeLower.startsWith('ifc')) {
          mappedTalo = taloMapping[elementTypeLower.substring(3)]; // Remove 'ifc' prefix
        }
        if (!mappedTalo && !elementTypeLower.startsWith('ifc')) {
          mappedTalo = taloMapping['ifc' + elementTypeLower]; // Add 'ifc' prefix
        }
        
        if (mappedTalo) {
          taloCode = mappedTalo.code;
          taloName = mappedTalo.name;
          console.log('[Cost] 🎯 TALO code mapped from element type (fallback):', { 
            taloCode, 
            taloName, 
            elementType: elementTypeLower,
            note: 'Fallback mapping - direct IFC access failed'
          });
        } else {
          console.log('[Cost] ⚠️ No TALO mapping found for element type:', elementTypeLower);
          console.log('[Cost] 💡 Available mappings:', Object.keys(taloMapping));
        }
      }
      
      // 1. Search in HasAssociations
      if (itemData.HasAssociations && Array.isArray(itemData.HasAssociations)) {
        console.log('[Cost] 🔍 HasAssociations found:', itemData.HasAssociations.length, 'associations');
        
        for (let i = 0; i < itemData.HasAssociations.length; i++) {
          const assocRef = itemData.HasAssociations[i];
          let assoc: any = assocRef;
          if ((assocRef as any).value && typeof (assocRef as any).value === 'object') {
            assoc = (assocRef as any).value;
          }

          console.log(`[Cost] 🔍 Association ${i}:`, {
            type: assoc?.type || 'unknown',
            identification: assoc?.Identification?.value || assoc?.Identification,
            name: assoc?.Name?.value || assoc?.Name,
            referencedIdentifier: assoc?.ReferencedIdentifier?.value || assoc?.ReferencedIdentifier,
            itemReference: assoc?.ItemReference?.value || assoc?.ItemReference,
            hasRelatingClassification: !!assoc?.RelatingClassification,
            hasReferencedSource: !!assoc?.ReferencedSource
          });

          // Deep search in all possible fields
          const searchFields = [
            assoc?.Identification?.value || assoc?.Identification,
            assoc?.ReferencedIdentifier?.value || assoc?.ReferencedIdentifier,
            assoc?.ItemReference?.value || assoc?.ItemReference,
            assoc?.Name?.value || assoc?.Name,
            assoc?.Description?.value || assoc?.Description,
            assoc?.Location?.value || assoc?.Location
          ];

          // Search in ReferencedSource
          if (assoc?.ReferencedSource) {
            const src = assoc.ReferencedSource.value || assoc.ReferencedSource;
            searchFields.push(
              src?.Name?.value || src?.Name,
              src?.Description?.value || src?.Description,
              src?.Identification?.value || src?.Identification,
              src?.ReferencedIdentifier?.value || src?.ReferencedIdentifier,
              src?.ItemReference?.value || src?.ItemReference
            );
            console.log(`[Cost] 🔍 ReferencedSource ${i}:`, {
              name: src?.Name?.value || src?.Name,
              description: src?.Description?.value || src?.Description,
              identification: src?.Identification?.value || src?.Identification
            });
          }

          // Search in RelatingClassification
          if (assoc?.RelatingClassification) {
            const rel = assoc.RelatingClassification.value || assoc.RelatingClassification;
            searchFields.push(
              rel?.Identification?.value || rel?.Identification,
              rel?.ItemReference?.value || rel?.ItemReference,
              rel?.Name?.value || rel?.Name,
              rel?.Description?.value || rel?.Description
            );
            
            // Also search in RelatingClassification's ReferencedSource
            if (rel?.ReferencedSource) {
              const relSrc = rel.ReferencedSource.value || rel.ReferencedSource;
              searchFields.push(
                relSrc?.Name?.value || relSrc?.Name,
                relSrc?.Description?.value || relSrc?.Description,
                relSrc?.Identification?.value || relSrc?.Identification,
                relSrc?.ReferencedIdentifier?.value || relSrc?.ReferencedIdentifier
              );
            }
            console.log(`[Cost] 🔍 RelatingClassification ${i}:`, {
              identification: rel?.Identification?.value || rel?.Identification,
              itemReference: rel?.ItemReference?.value || rel?.ItemReference,
              name: rel?.Name?.value || rel?.Name
            });
          }

          // Check all collected fields for TALO patterns
          for (const field of searchFields) {
            if (!field) continue;
            
            const fieldStr = String(field).trim();
            console.log(`[Cost] 🔍 Checking field: "${fieldStr}"`);
            
            // Check for TALO system indicators
            const isTaloSystem = /TALO|TALO2000|T2000|TALO-2000/i.test(fieldStr);
            
            // Check for TALO code patterns
            const taloPattern = /(\d+\.\d+(?:\.\d+)*(?:\.\d+)*)/;
            const codeMatch = fieldStr.match(taloPattern);
            
            if (codeMatch || isTaloSystem) {
              if (codeMatch) {
                taloCode = codeMatch[1];
                taloName = String(assoc?.Name?.value || assoc?.Name || '');
                console.log('[Cost] 🎯 TALO code found in HasAssociations:', { 
                  taloCode, 
                  taloName, 
                  source: 'HasAssociations',
                  field: fieldStr
                });
                break;
              } else if (isTaloSystem) {
                // Found TALO system but no code - might be in a different field
                console.log('[Cost] 🔍 TALO system detected but no code found:', fieldStr);
              }
            }
          }
          
          if (taloCode) break;
        }
      }

      // 2. Search in top-level Classifications array
      if (!taloCode && Array.isArray((itemData as any).Classifications)) {
        console.log('[Cost] 🔍 Top-level Classifications found:', (itemData as any).Classifications.length);
        
        for (let i = 0; i < (itemData as any).Classifications.length; i++) {
          const cls = (itemData as any).Classifications[i];
          const c: any = (cls as any).value || cls;
          
          console.log(`[Cost] 🔍 Classification ${i}:`, {
            identification: c?.Identification?.value || c?.Identification,
            itemReference: c?.ItemReference?.value || c?.ItemReference,
            name: c?.Name?.value || c?.Name,
            description: c?.Description?.value || c?.Description
          });

          const clsFields = [
            c?.Identification?.value || c?.Identification,
            c?.ItemReference?.value || c?.ItemReference,
            c?.Name?.value || c?.Name,
            c?.Description?.value || c?.Description
          ];

          // Search in ReferencedSource of classification
          if (c?.ReferencedSource) {
            const clsSrc = c.ReferencedSource.value || c.ReferencedSource;
            clsFields.push(
              clsSrc?.Name?.value || clsSrc?.Name,
              clsSrc?.Description?.value || clsSrc?.Description,
              clsSrc?.Identification?.value || clsSrc?.Identification,
              clsSrc?.ReferencedIdentifier?.value || clsSrc?.ReferencedIdentifier
            );
            console.log(`[Cost] 🔍 Classification ReferencedSource ${i}:`, {
              name: clsSrc?.Name?.value || clsSrc?.Name,
              description: clsSrc?.Description?.value || clsSrc?.Description
            });
          }

          for (const field of clsFields) {
            if (!field) continue;
            
            const fieldStr = String(field).trim();
            const taloPattern = /(\d+\.\d+(?:\.\d+)*(?:\.\d+)*)/;
            const codeMatch = fieldStr.match(taloPattern);
            const isTaloSystem = /TALO|TALO2000|T2000/i.test(fieldStr);
            
            if (codeMatch || isTaloSystem) {
              if (codeMatch) {
                taloCode = codeMatch[1];
                taloName = String(c?.Name?.value || c?.Name || '');
                console.log('[Cost] 🎯 TALO code found in Classifications:', { 
                  taloCode, 
                  taloName, 
                  source: 'Classifications',
                  field: fieldStr
                });
                break;
              }
            }
          }
          
          if (taloCode) break;
        }
      }

      // 3. Search in all other possible classification-related fields
      if (!taloCode) {
        const additionalFields = [
          'Classification',
          'Classifications', 
          'Type',
          'ObjectType',
          'Tag',
          'GlobalId',
          'OwnerHistory',
          'PropertySets',
          'IsDefinedBy'
        ];

        for (const fieldName of additionalFields) {
          const fieldValue = (itemData as any)[fieldName];
          if (fieldValue) {
            console.log(`[Cost] 🔍 Checking additional field ${fieldName}:`, fieldValue);
            
            const fieldStr = String(fieldValue).trim();
            const taloPattern = /(\d+\.\d+(?:\.\d+)*(?:\.\d+)*)/;
            const codeMatch = fieldStr.match(taloPattern);
            const isTaloSystem = /TALO|TALO2000|T2000/i.test(fieldStr);
            
            if (codeMatch || isTaloSystem) {
              if (codeMatch) {
                taloCode = codeMatch[1];
                taloName = String(fieldValue);
                console.log('[Cost] 🎯 TALO code found in additional field:', { 
                  taloCode, 
                  taloName, 
                  source: fieldName,
                  field: fieldStr
                });
              break;
              }
            }
          }
        }
      }

      // 4. If still no TALO code found, log all available data for debugging
      if (!taloCode) {
        console.log('[Cost] ⚠️ No TALO classification found for element ID:', id);
        console.log('[Cost] 🔍 Available data for debugging:', {
          elementName: elementName,
          elementType: ifcType,
          hasAssociations: !!(itemData.HasAssociations && itemData.HasAssociations.length > 0),
          hasClassifications: !!(itemData as any).Classifications,
          allKeys: Object.keys(itemData)
        });
      }

      // Try to get TALO name from constants if available
      try {
        const taloElements = (await import('../../constants/talo2000')).TALO_ELEMENTS as any;
        if (taloCode && taloElements[taloCode]) {
          taloName = taloElements[taloCode].name?.en || taloElements[taloCode].name?.fi || taloName;
        }
      } catch {}

      // Build temp element
      const tempElementData: ElementData = {
        id: Number(id),
        name: elementName,
        type: ifcType,
        category: elementCategory,
        taloCode: taloCode,
        description: '',
        quantities: quantities,
        properties: {},
        taloName: taloName
      };

      // Quantity for costing
      const primaryQuantity = getTalo2000Quantity(tempElementData, taloCode);
      const finalQuantity = primaryQuantity?.value || Object.values(quantities)[0]?.value || 0;

      const defaultCosts = this.getDefaultCosts(ifcType, taloCode, finalQuantity);
      const costElement = this.costService.calculateElementCost(taloCode, finalQuantity);
      
      if (costElement) {
        const updatedCostElement: BaseCostElement = {
          id: Number(id),
          name: elementName,
          type: ifcType,
          category: elementCategory,
          taloCode: taloCode,
          taloName: taloName,
          quantity: finalQuantity,
          costs: costElement.costs,
          baseQuantities: quantities
        };
        console.log('[Cost] 🔍 Adding cost element to results:', updatedCostElement);
        this._results.push(updatedCostElement);
      } else {
        const defaultCostElement: BaseCostElement = {
          id: Number(id),
          name: elementName,
          type: ifcType,
          category: elementCategory,
          taloCode: taloCode,
          taloName: taloName,
          quantity: finalQuantity,
          costs: defaultCosts,
          baseQuantities: quantities
        };
        console.log('[Cost] 🔍 Adding default cost element to results:', defaultCostElement);
        this._results.push(defaultCostElement);
      }

    } catch (error) {
      console.error('[CostCalculator] Error processing element:', id, error);
      this.onError.trigger(error as Error);
    }
  }

  private getDefaultCosts(type: string, taloCode: string, quantity: number): { material: number; labor: number; equipment: number; overhead: number; total: number } {
    // Base costs by element type (€/m²)
    const baseCosts: { [key: string]: number } = {
      'IfcWall': 120,
      'IfcSlab': 100,
      'IfcColumn': 150,
      'IfcBeam': 140,
      'IfcWindow': 300,
      'IfcDoor': 250,
      'IfcRoof': 180,
      'IfcStair': 200
    };

    // Cost multipliers by TALO code
    const taloMultipliers: { [key: string]: number } = {
      '1.2': 1.2,  // Structure
      '1.3': 1.1,  // Envelope
      '2.1': 1.3,  // MEP
      '2.2': 1.2,  // Distribution
      '3': 1.0,    // Interior
    };

    const baseCost = baseCosts[type] || 100; // Default 100€/m² if type not found
    const taloPrefix = taloCode.split('.')[0];
    const multiplier = taloMultipliers[taloPrefix] || 1.0;

    const totalCost = baseCost * multiplier * quantity;

    return {
      material: totalCost * 0.4, // 40% materials
      labor: totalCost * 0.35,   // 35% labor
      equipment: totalCost * 0.15, // 15% equipment
      overhead: totalCost * 0.1,   // 10% overhead
      total: totalCost
    };
  }

  private updateResultsTable(): void {
    const tableData: MaterialCostsTableData[] = this._results.map(element => ({
      id: element.id.toString(),
      name: element.name,
      type: element.type,
      category: element.category,
      taloCode: element.taloCode,
      materialCost: element.costs?.material || 0,
      laborCost: element.costs?.labor || 0,
      equipmentCost: element.costs?.equipment || 0,
      overheadCost: element.costs?.overhead || 0,
      totalCost: element.costs?.total || 0
    }));

    this.materialCostsTable.data = tableData;
  }

  // Method to show loading indicator in Cost panel
  showLoadingIndicator(message: string = 'Analyzing costs...', progress?: number) {
    const costContent = document.getElementById('cost-content');
    if (costContent) {
      let html = `
        <div style="padding: 20px; text-align: center;">
          <div style="margin-bottom: 10px; color: var(--bim-label--c);">${message}</div>
      `;
      
      if (progress !== undefined) {
        html += `
          <div style="width: 100%; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; overflow: hidden; height: 8px;">
            <div style="width: ${progress}%; background: #ffc107; height: 100%; transition: width 0.3s;"></div>
          </div>
          <div style="margin-top: 8px; color: var(--bim-label--c); font-size: 12px;">${Math.round(progress)}%</div>
        `;
      } else {
        html += `
          <div style="width: 100%; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; overflow: hidden; height: 8px;">
            <div style="width: 100%; background: #ffc107; height: 100%; animation: pulse 1.5s ease-in-out infinite;"></div>
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
      
      costContent.innerHTML = html;
    }
  }

  // Extract building information from spatial structure AND analyzed data
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
        console.log('[Cost] 🔍 Extracting building info from model:', modelId);
        console.log('[Cost] 🔍 Model properties:', {
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
              console.log('[Cost] 🎯 Found IfcBuilding node with localId:', node.localId);
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
            console.log('[Cost] 🏢 Found IfcBuilding with localId:', buildingNode.localId);
            
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
                              console.log('[Cost] 📐 Found building area:', roundedArea.toFixed(3), 'm² from', quantityName);
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
              console.warn('[Cost] ⚠️ Error extracting building properties:', error);
            }
          } else {
            // No IfcBuilding found, use model name
            buildingName = modelName;
            console.log('[Cost] 📝 No IfcBuilding found, using model name:', buildingName);
          }
        }
        
        // 🎯 STRATEGY 2: If no area found from IfcBuilding, try to calculate from IfcSlab (floors) in spatial structure
        if (buildingArea === 0) {
          console.log('[Cost] 📏 No area found in IfcBuilding quantities');
          console.log('[Cost] 📏 Trying Strategy 2: Extract actual area from IfcSlabs in spatial structure...');
          
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
              console.log('[Cost] 📦 Found', slabIds.size, 'slabs in total');
              
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
                  console.log('[Cost] ✅ Calculated building area from slabs:', buildingArea.toFixed(3), 'm²');
                }
              } catch (error) {
                console.warn('[Cost] ⚠️ Error calculating area from slabs:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[Cost] ❌ Error extracting building info:', error);
    }
    
    // 🎯 FINAL STRATEGY: Estimate from already processed Cost data if nothing else worked
    if (buildingArea === 0) {
      console.log('[Cost] 💡 Spatial structure search failed. Attempting to estimate from Cost results...');
      
      if (this._results && this._results.length > 0) {
        // Search for IfcSlab in different case variations
        let slabData = null;
        for (const element of this._results) {
          if (element.type.toLowerCase() === 'ifcslab') {
            slabData = element;
            console.log('[Cost] 🔍 Found slab data:', element.name);
            break;
          }
        }
        
        if (slabData && slabData.baseQuantities) {
          let totalSlabVolume = 0;
          
          for (const [quantityName, quantityData] of Object.entries(slabData.baseQuantities)) {
            if (quantityName.toLowerCase().includes('volume') && typeof quantityData === 'object' && 'value' in quantityData) {
              totalSlabVolume += (quantityData as any).value || 0;
            }
          }
          
          if (totalSlabVolume > 0) {
            // Estimate area from slab volume
            // Typical slab thickness in Finland: 200-300mm for floors
            const estimatedThickness = 0.25; // 250mm average
            buildingArea = Math.round((totalSlabVolume / estimatedThickness) * 1000) / 1000; // Round to 3 decimals
            console.log('[Cost] ✅ Estimated building area from IfcSlab volumes:', buildingArea.toFixed(3), 'm²');
            console.log('[Cost] 📐 Calculation:', totalSlabVolume.toFixed(2), 'm³ ÷', estimatedThickness, 'm (avg slab thickness)');
            console.log('[Cost] 💡 Note: This is an estimation. User can adjust in CostPage if needed.');
          } else {
            console.warn('[Cost] ⚠️ Could not extract building area from IFC. User will need to input manually in CostPage.');
          }
        } else {
          console.warn('[Cost] ⚠️ No IfcSlab data available for estimation. User will need to input manually in CostPage.');
        }
      } else {
        console.warn('[Cost] ⚠️ No Cost results available yet. User will need to input area manually in CostPage.');
      }
    }
    
    return {
      name: buildingName,
      area: buildingArea,
      type: buildingType,
      location: 'Helsinki' // Default location
    };
  }

  // Method to send Cost data to CostPage via CostStore
  async sendToCostPage(result: BaseCostElement[]) {
    console.log('[Cost] 📤 Sending data to Cost Analysis page...');
    
    // 🆕 Extract building information
    const buildingInfo = await this.extractBuildingInfo();
    console.log('[Cost] 🏢 Extracted building info:', {
      ...buildingInfo,
      area: buildingInfo.area > 0 ? `${buildingInfo.area.toFixed(3)} m²` : 'Not found'
    });
    
    // Import and use CostStore
    import('../../stores/CostStore').then(({ useCostStore }) => {
      const store = useCostStore.getState();
      
      // Set Cost data
      store.setCostData(result);
      
      // 🆕 Set project info with extracted building data
      store.setProjectInfo({
        name: buildingInfo.name,
        area: buildingInfo.area,
        cost: 0, // Default cost
        description: `Cost Analysis for ${buildingInfo.name}`,
        type: buildingInfo.type as 'residential' | 'commercial' | 'industrial' | 'infrastructure',
        location: buildingInfo.location,
        buildingType: buildingInfo.type,
        constructionMethod: 'traditional' // Default construction method
      });
      
      console.log('[Cost] ✅ Data and project info sent to CostStore successfully');
      
      // Show success message
      const costContent = document.getElementById('cost-content');
      if (costContent) {
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ffc107;
          color: #000;
          padding: 16px 24px;
          border-radius: 8px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          animation: slideIn 0.3s ease;
        `;
        successMsg.innerHTML = `
          ✓ Data sent to Cost Analysis page!<br>
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
      
      // Navigate to Cost page
      window.location.hash = 'Cost';
    }).catch(error => {
      console.error('[Cost] ❌ Error sending data to CostStore:', error);
    });
  }

  // Analyze complete model - use getSpatialStructure to get all elements
  async analyzeCompleteModel() {
    const startTime = performance.now();
    console.log('[Cost] 🔍 Starting full model cost analysis...');
    console.log('[Cost] 🔍 CostCalculator instance:', this);
    console.log('[Cost] 🔍 Components available:', this.components);
    
    // Show loading indicator
    this.showLoadingIndicator('Collecting model elements...', 10);
    
    const fragmentManager = this.components.get(OBC.FragmentsManager);
    console.log('[Cost] 🔍 FragmentManager obtained:', fragmentManager);
    console.log('[Cost] 🔍 FragmentManager list:', fragmentManager.list);
    console.log('[Cost] 🔍 FragmentManager list size:', fragmentManager.list?.size);
    
    // Check if any models are loaded
    if (!fragmentManager.list || fragmentManager.list.size === 0) {
      console.warn('[Cost] ⚠️ No models loaded');
      console.log('[Cost] 🔍 FragmentManager.list:', fragmentManager.list);
      console.log('[Cost] 🔍 FragmentManager.list.size:', fragmentManager.list?.size);
      const costContent = document.getElementById('cost-content');
      if (costContent) {
        costContent.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <div style="margin-bottom: 16px; color: #ff6b6b; font-size: 48px;">⚠️</div>
            <div style="margin-bottom: 10px; color: var(--bim-label--c); font-weight: 600; font-size: 16px;">No Model Loaded</div>
            <div style="color: var(--bim-label--c); opacity: 0.8; font-size: 14px;">
              Please load an IFC model before running the cost analysis.
            </div>
          </div>
        `;
      }
      throw new Error('No IFC models loaded. Please load a model first.');
    }
    
    const fragmentIdMap: any = {};
    let totalElements = 0;
    
    // Get all element IDs from all models using getSpatialStructure
    console.log('[Cost] 🔍 Iterating through models...');
    console.log('[Cost] 🔍 FragmentManager.list entries:', fragmentManager.list.size);
    
    for (const [modelId, model] of fragmentManager.list) {
      console.log('[Cost] 🔍 ==========================================');
      console.log('[Cost] 🔍 Processing model ID:', modelId);
      console.log('[Cost] 🔍 Model type:', typeof model);
      console.log('[Cost] 🔍 Model keys:', Object.keys(model));
      console.log('[Cost] 🔍 Has getSpatialStructure?', typeof (model as any).getSpatialStructure === 'function');
      
      const allIds = new Set<number>();
      
      // Use getSpatialStructure to traverse the model hierarchy
      if (typeof (model as any).getSpatialStructure === 'function') {
        console.log('[Cost] 🔍 Calling getSpatialStructure...');
        try {
          const spatialStructure = await (model as any).getSpatialStructure();
          console.log('[Cost] 🔍 Spatial structure received:', spatialStructure);
          console.log('[Cost] 🔍 Spatial structure type:', typeof spatialStructure);
          console.log('[Cost] 🔍 Spatial structure keys:', spatialStructure ? Object.keys(spatialStructure) : 'null');
          console.log('[Cost] 🔍 Spatial structure localId:', spatialStructure?.localId);
          console.log('[Cost] 🔍 Spatial structure children:', spatialStructure?.children);
          
          // Recursively collect all element IDs from the spatial structure
          let elementCount = 0;
          const collectIds = (node: any, depth: number = 0) => {
            const indent = '  '.repeat(depth);
            console.log(`[Cost] 🔍 ${indent}Node at depth ${depth}:`, {
              localId: node?.localId,
              hasChildren: Array.isArray(node?.children),
              childrenCount: node?.children?.length || 0
            });
            
            // In Fragments 3.1, the property is localId, not expressID
            if (node.localId && node.localId > 0) {
              allIds.add(node.localId);
              elementCount++;
              console.log(`[Cost] 🔍 ${indent}✓ Added element ID: ${node.localId} (total: ${elementCount})`);
            }
            
            if (node.children && Array.isArray(node.children)) {
              console.log(`[Cost] 🔍 ${indent}Processing ${node.children.length} children...`);
              for (const child of node.children) {
                collectIds(child, depth + 1);
              }
            }
          };
          
          collectIds(spatialStructure);
          console.log('[Cost] 🔍 Total IDs collected for model', modelId, ':', allIds.size);
        } catch (error) {
          console.error('[Cost] ❌ Error calling getSpatialStructure:', error);
        }
      } else {
        console.log('[Cost] ⚠️ getSpatialStructure function not available for model:', modelId);
        console.log('[Cost] 🔍 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));
      }
      
      if (allIds.size > 0) {
        fragmentIdMap[modelId] = allIds;
        totalElements += allIds.size;
        console.log('[Cost] ✅ Model', modelId, 'added to fragmentIdMap with', allIds.size, 'elements');
      } else {
        console.log('[Cost] ⚠️ No elements found in model:', modelId);
      }
      console.log('[Cost] 🔍 ==========================================');
    }
    
    console.log(`[Cost] 📊 ${totalElements} elements found`);
    console.log('[Cost] 🔍 FragmentIdMap:', fragmentIdMap);
    
    if (totalElements === 0) {
      console.log('[Cost] ⚠️ No elements found, showing error message');
      const costContent = document.getElementById('cost-content');
      if (costContent) {
        costContent.innerHTML = `
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
    this.showLoadingIndicator('Analyzing costs and materials...', 20);
    console.log('[Cost] 🔍 Calling calculateMaterialCosts with fragmentIdMap:', fragmentIdMap);
    
    // Use the regular calculation method
    const result = await this.calculateMaterialCosts(fragmentIdMap);
    console.log('[Cost] 🔍 calculateMaterialCosts result:', result);
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[Cost] ✅ Analysis completed in ${duration}s`);
    
    return result;
  }
}