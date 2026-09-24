import * as OBC from "@thatopen/components"
import * as FRAGS from "@thatopen/fragments"
import { Component, Components, Event } from '@thatopen/components';
import { ElementData, BaseCostElement } from '../../types/cost/shared';
import { MaterialCostsTableData } from '../../types/cost/elements';
import type { IFCQuantityValue } from '../../types/cost';
import { getTalo2000Quantity, TALO_2000_MEASUREMENTS } from '../../constants/talo2000';
import { UnifiedCostService } from '../../services/UnifiedCostService';
import { useCostStore } from '../../stores/CostStore';

export const IFC = {
  IFCQUANTITYLENGTH: 357,
  IFCELEMENTQUANTITY: 358,
  IFCQUANTITYVOLUME: 359,
  IFCQUANTITYAREA: 360,
  IFCRELASSOCIATESCLASSIFICATION: 647927063,
  IFCCLASSIFICATIONREFERENCE: 437
};

interface MaterialCostsTableColumn {
  header: string;
  dataField: string;
  width: string;
  sortable: boolean;
}

interface MaterialCostsTable {
  columns: MaterialCostsTableColumn[];
  data: MaterialCostsTableData[];
}

interface BuildingInfo {
  name: string;
  area: number;
  type: string;
  location: string;
}

export class CostCalculator extends OBC.Component {
  static uuid = "b7fa5ae6-7ce8-471a-8d90-b3f14b755c21"
  enabled = true
  onDisposed: OBC.Event<any>
  onMaterialCostsComputed: OBC.Event<BaseCostElement[]>
  onProgress: OBC.Event<number>
  onError: OBC.Event<Error>
  private _results: BaseCostElement[] = []
  private _lastAnalysisResult: BaseCostElement[] | null = null
  private fragments: OBC.FragmentsManager
  
  // Get last analysis results - used by sendToCostPage button
  public getLastAnalysisResult(): BaseCostElement[] | null {
    return this._lastAnalysisResult;
  }
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
      console.log('[Cost] ⚠️ fragmentIdMap empty; collecting localIds via spatial structure (Fragments 3.1)');
      const mapFromStructure: Record<string, Set<number>> = {};
      // Collect IDs per model using getSpatialStructure
      for (const [modelId, model] of models) {
        if (typeof (model as any).getSpatialStructure === 'function') {
          try {
            const spatial = await (model as any).getSpatialStructure();
            const idSet = new Set<number>();
            const collect = (node: any) => {
              const lid = Number(node?.localId);
              if (lid && lid > 0) idSet.add(lid);
              if (node?.children && Array.isArray(node.children)) {
                for (const c of node.children) collect(c);
              }
            };
            collect(spatial);
            if (idSet.size > 0) {
              mapFromStructure[modelId] = idSet;
              totalElements += idSet.size;
            }
          } catch (e) {
            console.warn('[Cost] ⚠️ Error reading spatial structure for model', modelId, e);
          }
        }
      }
      console.log('[Cost] 🔍 Total elements to process (spatial):', totalElements);
      // Process using collected map
      for (const [modelId, model] of models) {
        const ids = mapFromStructure[modelId];
        if (!ids) continue;
        console.log('[Cost] 🔍 Processing model (spatial):', modelId);
        for (const id of ids) {
          await this.processElement(model, Number(id));
          processedCount++;
          if (totalElements > 0) this.onProgress.trigger((processedCount / totalElements) * 100);
        }
      }
    }

    console.log('[Cost] 🔍 Final results count:', this._results.length);
    console.log('[Cost] 🔍 Final results:', this._results);
    // Ensure any progress listeners see 100% when finished
    try {
      if (this.onProgress) this.onProgress.trigger(100);
    } catch (e) {
      console.warn('[Cost] ⚠️ Error triggering final onProgress:', e);
    }

    this.updateResultsTable();
    console.log('[Cost] 🔍 Triggering onMaterialCostsComputed event...');
    this.onMaterialCostsComputed.trigger(this._results);
    // Force a minimal render in the cost panel in case the UI missed the event
    try {
      const costContent = document.getElementById('cost-content');
      if (costContent) {
        const rows = this._results.map(r => {
          const talo = r.taloCode || '-';
          const idOrName = r.name || (r.id ? `#${r.id}` : '-');
          const type = r.type || '-';
          let unit = '';
          try {
            const first = Object.values(r.baseQuantities || {})[0] as any;
            unit = (first && typeof first === 'object' && first.unit) ? first.unit : '';
          } catch {}
          const fmt = (n: any) => {
            const num = typeof n === 'number' ? n : Number(n);
            return Number.isFinite(num) ? num.toFixed(3) : String(n ?? '');
          };
          const qtyRaw = (r as any).quantity != null ? (r as any).quantity : '';
          const qtyFormatted = fmt(qtyRaw);
          const qtyDisplay = unit ? `${qtyFormatted} ${unit}` : `${qtyFormatted}`;
          const bqEntries = Object.entries(r.baseQuantities || {}).map(([k, v]: any) => {
            const valRaw = (v && typeof v === 'object') ? v.value : v;
            const val = fmt(valRaw);
            const u = (v && typeof v === 'object' && v.unit) ? ` ${v.unit}` : '';
            return `${k}: ${val}${u}`;
          });
          const baseQuantitiesDisplay = bqEntries.join('<br/>');
          return `
            <tr style="border-bottom:1px solid var(--bim-border-color,#555)">
              <td style="padding:8px 12px; color:var(--bim-text-color,#999); font-size:12px">${talo}</td>
              <td style="padding:8px 12px; color:var(--bim-text-color,#999); font-size:12px">${idOrName}</td>
              <td style="padding:8px 12px; color:var(--bim-text-color,#999); font-size:12px">${type}</td>
              <td style="padding:8px 12px; color:var(--bim-text-color,#999); font-size:12px; text-align:right">${qtyDisplay}</td>
              <td style="padding:8px 12px; color:var(--bim-text-color,#999); font-size:12px">${baseQuantitiesDisplay}</td>
            </tr>
          `;
        }).join('');

        costContent.innerHTML = `
          <div class="content" style="padding:12px;">
            <div style="margin:0 0 8px 0; color:var(--bim-text-color, #999); font-size:13px;">Cost Results</div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
              <thead>
                <tr style="border-bottom:1px solid var(--bim-border-color,#555)">
                  <th style="text-align:left; padding:8px; color:var(--bim-text-color, #999); font-size:12px; font-weight:normal">TALO</th>
                  <th style="text-align:left; padding:8px; color:var(--bim-text-color, #999); font-size:12px; font-weight:normal">ID/Name</th>
                  <th style="text-align:left; padding:8px; color:var(--bim-text-color, #999); font-size:12px; font-weight:normal">IFC Type</th>
                  <th style="text-align:right; padding:8px; color:var(--bim-text-color, #999); font-size:12px; font-weight:normal">Quantity</th>
                  <th style="text-align:left; padding:8px; color:var(--bim-text-color, #999); font-size:12px; font-weight:normal">Base Quantities</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            <!-- Botón 'Send to Cost Analysis' desactivado temporalmente
            <button 
              id="send-to-cost-page-btn"
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
              <span style="font-size: 18px;">💰</span>
              Send to Cost Analysis
            </button>
            -->
          </div>
        `;
        console.log('[Cost] 🔍 Injected minimal table into #cost-content');
        
        // Botón 'Send to Cost Analysis' desactivado temporalmente: no se añade listener
      }
    } catch (err) {
      console.warn('[Cost] ⚠️ Could not inject minimal table into panel:', err);
    }
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
              if (quantityData) {
                const qNameRaw = quantityData.Name?.value ?? quantityData.Name ?? '';
                const qName = String(qNameRaw);
                let value: number | undefined;
                let unit = '';
                // Volume
                const volRaw = (quantityData.VolumeValue?.value ?? quantityData.VolumeValue ?? quantityData.Volume?.value ?? quantityData.Volume);
                if (typeof volRaw === 'number') {
                  value = volRaw; unit = 'm3';
                }
                // Area
                if (value === undefined) {
                  const areaRaw = (quantityData.AreaValue?.value ?? quantityData.AreaValue ?? quantityData.Area?.value ?? quantityData.Area);
                  if (typeof areaRaw === 'number') { value = areaRaw; unit = 'm2'; }
                }
                // Linear (Length/Height/Width/Thickness)
                if (value === undefined) {
                  const lenRaw = (quantityData.LengthValue?.value ?? quantityData.LengthValue ?? quantityData.Length?.value ?? quantityData.Length);
                  const hRaw = (quantityData.HeightValue?.value ?? quantityData.HeightValue ?? quantityData.Height?.value ?? quantityData.Height);
                  const wRaw = (quantityData.WidthValue?.value ?? quantityData.WidthValue ?? quantityData.Width?.value ?? quantityData.Width ?? quantityData.ThicknessValue?.value ?? quantityData.ThicknessValue ?? quantityData.Thickness?.value ?? quantityData.Thickness);
                  const scalar = [lenRaw, hRaw, wRaw].find(v => typeof v === 'number') as number | undefined;
                  if (typeof scalar === 'number') { value = scalar; unit = 'm'; }
                }
                if (value !== undefined) {
                  quantities[String(qName || 'Quantity')] = { value, unit } as IFCQuantityValue;
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
      
      
      // Fallback: If direct IFC access failed, try the original approach
      if (!taloCode) {
        console.log('[Cost] 🔍 Direct IFC access failed, trying original IfcRelationsIndexer approach...');
        
          try {
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
  async sendToCostPage() {
    console.log('[Cost] 📤 Sending data to Cost Analysis page...');
    
    if (!this._lastAnalysisResult || this._lastAnalysisResult.length === 0) {
      console.warn('[Cost] ⚠️ No analysis results available. Please analyze the model first.');
      return;
    }
    
    try {
      // Extract building information
      const buildingInfo = await this.extractBuildingInfo();
      console.log('[Cost] 🏢 Extracted building info:', {
        ...buildingInfo,
        area: buildingInfo.area > 0 ? `${buildingInfo.area.toFixed(3)} m²` : 'Not found'
      });

      // Use CostStore directly
      const store = useCostStore.getState();
      
      // Set Cost data using the stored analysis results
      store.setCostData(this._lastAnalysisResult!);
      
      // Set project info with extracted building data
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
      
      // Show success message in LCA style
      const successMsg = document.createElement('div');
      successMsg.style.cssText = `
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
        opacity: 1;
        transition: opacity 0.3s;
      `;
      successMsg.innerHTML = `
        <div style="margin-bottom: 10px; font-size: 16px;">✅</div>
        <div style="margin-bottom: 8px; font-size: 15px;">Cost Analysis Data Sent</div>
        <div style="font-size: 13px; opacity: 0.9;">
          View results in the Cost Analysis page
        </div>
      `;
      document.body.appendChild(successMsg);
      
      // Remove message after delay
      setTimeout(() => {
        successMsg.style.opacity = '0';
        setTimeout(() => successMsg.remove(), 300);
      }, 3000);
      
      // Navigate to Cost page if requested
      window.location.hash = 'Cost';
    } catch (error) {
      console.error('[Cost] ❌ Error sending data to CostStore:', error);
      throw error; // Re-throw to allow proper error handling
    }
  }

  /**
   * Analyzes the complete model using getSpatialStructure to get all elements
   * @returns Promise<BaseCostElement[]> The analysis results
   * @throws Error if no models are loaded or no elements are found
   */
  async analyzeCompleteModel(): Promise<BaseCostElement[]> {
    const startTime = performance.now();
    console.log('[Cost] 🔍 Starting full model cost analysis...');
    console.log('[Cost] 🔍 CostCalculator instance:', this);
    console.log('[Cost] 🔍 Components available:', this.components);
    const fragments = this.components.get(OBC.FragmentsManager);
    // 1) Await viewer readiness if exposed
    try {
      const g: any = window as any;
      if (g && g.viewerReady && typeof g.viewerReady.then === 'function') {
        console.log('[Cost] ⏳ Waiting for viewerReady promise...');
        await g.viewerReady;
        console.log('[Cost] ✅ viewerReady resolved.');
      }
    } catch {}
    // 2) Poll for fragments.list readiness if still not ready
    if (!fragments?.list || fragments.list.size === 0) {
      console.log('[Cost] ⏳ Waiting for FragmentsManager.list to be populated...');
      let attempts = 0;
      while (attempts < 20 && (!fragments?.list || fragments.list.size === 0)) {
        await new Promise((r) => setTimeout(r, 150));
        attempts++;
      }
      console.log('[Cost] 🔍 Fragments list size after wait:', fragments?.list?.size);
      if (!fragments?.list || fragments.list.size === 0) {
        throw new Error('No IFC models loaded yet. Please wait until the model finishes loading.');
      }
    }
    
    try {
      // Show loading indicator
      this.showLoadingIndicator('Collecting model elements...', 10);
      
      const fragmentManager = fragments;
      console.log('[Cost] 🔍 FragmentManager obtained:', fragmentManager);
      console.log('[Cost] 🔍 FragmentManager list:', fragmentManager.list);
      console.log('[Cost] 🔍 FragmentManager list size:', fragmentManager.list?.size);
      
      // Check if any models are loaded
      if (!fragmentManager.list || fragmentManager.list.size === 0) {
        console.warn('[Cost] ⚠️ No models loaded after readiness wait');
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
      
      // Store the results for later use (when Send to Cost Analysis is clicked)
      // The user will need to click the "Send to Cost Analysis" button
      this._lastAnalysisResult = result;
      
      return result;
    } catch (error) {
      console.error('[Cost] ❌ Error during complete model analysis:', error);
      throw error;
    }
  }
}