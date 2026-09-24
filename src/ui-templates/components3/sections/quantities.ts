import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export interface QuantitiesPanelState {
  components: OBC.Components;
}

export const quantitiesPanelTemplate: BUI.StatefullComponent<QuantitiesPanelState> = (
  state,
) => {
  const { components } = state;

  const onCreated = (e?: Element) => {
    if (!e) return;
    
    console.log("🔍 QuantitiesPanel - onCreated ejecutado");
    
    // Function to connect to SimpleQTO
    const connectToSimpleQTO = () => {
      try {
        // First try to get from components - use window as fallback since we can't access by UUID directly
        const simpleQTO = null; // components.get() doesn't work with UUID strings
        
        if (simpleQTO) {
          console.log("🔍 QuantitiesPanel - SimpleQTO encontrado en components:", simpleQTO);
          setupSimpleQTOConnection(simpleQTO);
          return true;
        }
        
        // Try to get from window
        const windowSimpleQTO = (window as any).simpleQTO;
        if (windowSimpleQTO) {
          console.log("🔍 QuantitiesPanel - SimpleQTO encontrado en window:", windowSimpleQTO);
          setupSimpleQTOConnection(windowSimpleQTO);
          return true;
        }
        
        return false;
      } catch (error) {
        console.error("❌ Error accediendo a SimpleQTO:", error);
        return false;
      }
    };
    
    // Function to setup the connection
    const setupSimpleQTOConnection = (simpleQTO: any) => {
      console.log("🔍 QuantitiesPanel - Configurando conexión con SimpleQTO");
      
      // Listen for quantity updates
      simpleQTO.onQuantitiesComputed.add((result: any) => {
        console.log("🔍 QuantitiesPanel - Cantidades actualizadas:", result);
        updateQuantitiesDisplay(result);
      });
      
      // Initial update
      updateQuantitiesDisplay(simpleQTO.qtoResult || {});
      
      console.log("✅ QuantitiesPanel - Conexión establecida con SimpleQTO");
    };
    
    // Try to connect immediately
    if (!connectToSimpleQTO()) {
      console.log("🔍 QuantitiesPanel - SimpleQTO no disponible, esperando...");
      
      // Retry with intervals
      const retryInterval = setInterval(() => {
        if (connectToSimpleQTO()) {
          clearInterval(retryInterval);
        }
      }, 500);
      
      // Stop retrying after 10 seconds
      setTimeout(() => {
        clearInterval(retryInterval);
        console.warn("⚠️ QuantitiesPanel - No se pudo conectar con SimpleQTO después de 10 segundos");
      }, 10000);
    }
  };

  const updateQuantitiesDisplay = (qtoResult: any) => {
    console.log("🔍 QuantitiesPanel - updateQuantitiesDisplay llamado con:", qtoResult);
    
    const contentDiv = document.getElementById('quantities-content');
    console.log("🔍 QuantitiesPanel - contentDiv encontrado:", !!contentDiv);
    
    if (!contentDiv) {
      console.warn("⚠️ No se encontró quantities-content en QuantitiesPanel");
      return;
    }

    if (Object.keys(qtoResult).length === 0) {
      console.log("🔍 QuantitiesPanel - qtoResult vacío, mostrando mensaje por defecto");
      contentDiv.innerHTML = `
        <div style="text-align: center; color: #888; font-style: italic; padding: 20px;">
          Select an element to view its quantities
        </div>
      `;
      return;
    }

    console.log("🔍 QuantitiesPanel - Generando tabla de cantidades...");

    // Crear datos para la tabla
    const tableData = [];
    
    for (const setName in qtoResult) {
      const properties = qtoResult[setName];
      for (const qtoName in properties) {
        const value = properties[qtoName];
        if (value !== null && !isNaN(value)) {
          const formattedValue = Number(value).toFixed(2);
          const unit = getUnitForQuantity(qtoName);
          
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
        <table style="width: 100%; border-collapse: collapse; font-family: inherit;">
          <thead>
            <tr style="border-bottom: 1px solid var(--bim-border-color, #333);">
              <th style="text-align: left; padding: 8px 12px; font-weight: 600; color: var(--bim-text-color, #fff);">Property</th>
              <th style="text-align: left; padding: 8px 12px; font-weight: 600; color: var(--bim-text-color, #fff);">Value</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const item of tableData) {
      html += `
        <tr style="border-bottom: 1px solid var(--bim-border-color, #333);">
          <td style="padding: 8px 12px; color: var(--bim-text-color, #fff);">${item.property}</td>
          <td style="padding: 8px 12px; color: var(--bim-text-color, #fff); font-weight: 500;">${item.value}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    console.log("🔍 QuantitiesPanel - HTML generado con tabla nativa");
    contentDiv.innerHTML = html;
    console.log("✅ QuantitiesPanel - Display actualizado");
  };

  const getUnitForQuantity = (quantityName: string): string => {
    const name = quantityName.toLowerCase();
    
    if (name.includes('area') || name.includes('surface')) return 'm²';
    if (name.includes('volume')) return 'm³';
    if (name.includes('length') || name.includes('height') || name.includes('width') || 
        name.includes('depth') || name.includes('perimeter')) return 'm';
    if (name.includes('weight') || name.includes('mass')) return 'kg';
    if (name.includes('count') || name.includes('number')) return 'units';
    
    return '';
  };

  console.log("🔍 QuantitiesPanel - Creando template HTML");
  
  return BUI.html`
    <bim-panel-section 
      fixed 
      icon="solar:ruler-bold" 
      label="Element Quantities" 
      ${BUI.ref(onCreated)}
      style="max-height: calc(100vh - 120px); overflow-y: auto;"
    >
      <div id="quantities-content" style="padding: 10px; max-height: calc(100vh - 200px); overflow-y: auto;">
        <div style="text-align: center; color: #888; font-style: italic; padding: 20px;">
          Select an element to view its quantities
        </div>
      </div>
    </bim-panel-section>
  `;
};
