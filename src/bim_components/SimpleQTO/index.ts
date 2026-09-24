import * as WEBIFC from "web-ifc"
import * as OBC from "@thatopen/components"
import * as FRAGS from "@thatopen/fragments"
import * as BUI from "@thatopen/ui"

type QtoResult = {[setName: string]: {[qtoName: string]: number}}

interface TableRow {
  property: string;
  value: string | number;
  isHeader?: boolean;
}

interface QuantityValue {
  value: number | null;
  name: string | null;
}

export class SimpleQTO extends OBC.Component implements OBC.Disposable {
  static uuid = "3d80c464-633c-48f4-8561-cc213870d28c"
  enabled = true
  onDisposed: OBC.Event<any> = new OBC.Event<any>()
  qtoResult: QtoResult = {}
  onQuantitiesComputed = new OBC.Event<QtoResult>()

  constructor(components: OBC.Components) {
    super(components)
    this.components.add(SimpleQTO.uuid, this)
  }

  resetQuantities(): void {
    this.qtoResult = {}
  }

  private updatePanelDirectly(): void {
    const contentDiv = document.getElementById('quantities-content')
    if (!contentDiv) {
      return
    }

    if (Object.keys(this.qtoResult).length === 0) {
      contentDiv.innerHTML = `
        <div style="text-align: center; color: var(--bim-text-color, #999); font-size: 12px; padding: 16px;">
          Select an element to view its quantities
        </div>
      `
      return
    }

    // Crear datos para la tabla
    const tableData = []
    
    for (const setName in this.qtoResult) {
      const properties = this.qtoResult[setName];
      for (const qtoName in properties) {
        const value = properties[qtoName];
        if (value !== null && !isNaN(value)) {
          const formattedValue = Number(value).toFixed(2);
          const unit = this.getUnitForQuantity(qtoName);
          
          tableData.push({
            property: qtoName,
            value: `${formattedValue} ${unit}`,
            setName: setName
          });
        }
      }
    }

    // Crear tabla simple usando HTML estándar con estilo nativo
    let html = `
      <div style="width: 100%;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--bim-border-color, #555);">
              <th style="text-align: left; padding: 8px 12px; font-weight: normal; color: var(--bim-text-color, #999); font-size: 12px;">Property</th>
              <th style="text-align: left; padding: 8px 12px; font-weight: normal; color: var(--bim-text-color, #999); font-size: 12px;">Value</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const item of tableData) {
      html += `
        <tr style="border-bottom: 1px solid var(--bim-border-color, #555);">
          <td style="padding: 8px 12px; color: var(--bim-text-color, #999); font-size: 12px;">${item.property}</td>
          <td style="padding: 8px 12px; color: var(--bim-text-color, #999); font-size: 12px;">${item.value}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    contentDiv.innerHTML = html;
  }

  private getUnitForQuantity(quantityName: string): string {
    const name = quantityName.toLowerCase()
    
    if (name.includes('area') || name.includes('surface')) return 'm²'
    if (name.includes('volume')) return 'm³'
    if (name.includes('length') || name.includes('height') || name.includes('width') || 
        name.includes('depth') || name.includes('perimeter')) return 'm'
    if (name.includes('weight') || name.includes('mass')) return 'kg'
    if (name.includes('count') || name.includes('number')) return 'units'
    
    return ''
  }


  // MÉTODO ORIGINAL COMENTADO - Usa API de Fragments 2.4
  // private async getQuantityValue(model: any, qtoID: number): Promise<QuantityValue> {
  //   try {
  //     const { name } = await OBC.IfcPropertiesUtils.getEntityName(model, qtoID)
  //     const { value } = await OBC.IfcPropertiesUtils.getQuantityValue(model, qtoID)
  //     return { name, value }
  //   } catch (error) {
  //     console.error(`Error getting quantity value for ID ${qtoID}:`, error)
  //     return { name: null, value: null }
  //   }
  // }

  // MÉTODO ORIGINAL COMENTADO - Usa API de Fragments 2.4
  // async sumQuantities(fragmentIdMap: OBC.ModelIdMap): Promise<void> {
  //   // Este método usa la API antigua de Fragments 2.4
  //   // Ahora usamos sumQuantitiesV2 que funciona con Fragments 3.1
  //   console.warn('sumQuantities está obsoleto, usa sumQuantitiesV2')
  //   await this.sumQuantitiesV2(fragmentIdMap)
  // }

  async sumQuantitiesV2(fragmentIdMap: OBC.ModelIdMap): Promise<QtoResult> {
    try {
      this.qtoResult = {}
      const fragmentManager = this.components.get(OBC.FragmentsManager)
      const modelIdMap = fragmentIdMap
      
      for (const [modelId, expressIDs] of Object.entries(modelIdMap)) {
        const model = fragmentManager.list.get(modelId)
        if (!model) {
          continue
        }
        const localIds = Array.from(expressIDs)
        // Configuración para obtener cantidades usando ItemsDataConfig
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
        const itemsData = await model.getItemsData(localIds, config)
        const quantitiesFound: any[] = []
        for (const [localId, itemData] of itemsData.entries()) {
          if ((itemData as any).IsDefinedBy && Array.isArray((itemData as any).IsDefinedBy)) {
            const isDefinedBy = (itemData as any).IsDefinedBy
            for (const item of isDefinedBy) {
              // Buscar elementos de cantidad (IFCELEMENTQUANTITY)
              if (item._category?.value === "IFCELEMENTQUANTITY" || 
                  (item.Name?.value && item.Name.value.includes('Qto'))) {
                
                const setName = item.Name?.value || 'Unknown'

            if (!(setName in this.qtoResult)) {
              this.qtoResult[setName] = {}
            }

                if (item.Quantities && Array.isArray(item.Quantities)) {
                  for (const qty of item.Quantities) {
                    // Verificar diferentes estructuras posibles para el nombre y valor
                    let qtyName = null
                    let qtyValue = null
                    
                    // Obtener el nombre
                    if (qty.Name && qty.Name.value) {
                      qtyName = qty.Name.value
                    }
                    
                    // Obtener el valor según el tipo de cantidad
                    if (qty.LengthValue && qty.LengthValue.value !== undefined) {
                      qtyValue = qty.LengthValue.value
                    }
                    else if (qty.AreaValue && qty.AreaValue.value !== undefined) {
                      qtyValue = qty.AreaValue.value
                    }
                    else if (qty.VolumeValue && qty.VolumeValue.value !== undefined) {
                      qtyValue = qty.VolumeValue.value
                    }
                    else if (qty.WeightValue && qty.WeightValue.value !== undefined) {
                      qtyValue = qty.WeightValue.value
                    }
                    else if (qty.CountValue && qty.CountValue.value !== undefined) {
                      qtyValue = qty.CountValue.value
                    }
                    // Fallback para otras estructuras
                    else if (qty.value !== undefined) {
                      qtyValue = qty.value
                    }
                    else if (qty.Value !== undefined) {
                      qtyValue = qty.Value
                    }
                    
                    // Determinar el tipo de cantidad
                    let quantityType = qty._category?.value || 'Unknown'
                    if (qty.LengthValue) quantityType = 'Length'
                    else if (qty.AreaValue) quantityType = 'Area'
                    else if (qty.VolumeValue) quantityType = 'Volume'
                    else if (qty.WeightValue) quantityType = 'Weight'
                    else if (qty.CountValue) quantityType = 'Count'
                    
                    if (qtyName && qtyValue !== null && qtyValue !== undefined && !isNaN(qtyValue)) {
                      // Acumular cantidades
                      if (!(qtyName in this.qtoResult[setName])) {
                        this.qtoResult[setName][qtyName] = 0
                      }
                      this.qtoResult[setName][qtyName] += Number(qtyValue)
                      
                      const quantityInfo = {
                        elementId: localId,
                        setName: setName,
                        quantityName: qtyName,
                        quantityValue: Number(qtyValue),
                        quantityType: quantityType
                      }
                      
                      quantitiesFound.push(quantityInfo)
                    } else {
                      // cantidad no válida, sin log
                    }
                  }
                }
              }
            }
          } else {
            // sin IsDefinedBy
          }
        }
      }
      
      this.onQuantitiesComputed.trigger(this.qtoResult)
      
      // Actualizar panel directamente si está disponible
      this.updatePanelDirectly()
      
      return this.qtoResult
    } catch (error) {
      throw error
    }
  }

  async dispose(): Promise<void> {
    this.enabled = false
    this.resetQuantities()
  }
}