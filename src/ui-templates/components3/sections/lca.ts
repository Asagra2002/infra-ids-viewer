import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export interface LCAPanelState {
  components: OBC.Components;
}

export const lcaPanelTemplate: BUI.StatefullComponent<LCAPanelState> = (
  state,
) => {
  const { components } = state;

  const onCreated = (e?: Element) => {
    if (!e) return;
    
    console.log("🔍 LCAPanel - onCreated ejecutado");
    console.log("🔍 LCAPanel - Element:", e);
    console.log("🔍 LCAPanel - Element ID:", e.id);
    console.log("🔍 LCAPanel - Element classes:", e.className);
    console.log("🔍 LCAPanel - Timestamp:", new Date().toISOString());
    
    // Función para conectar con LCACalculator
    const connectToLCACalculator = () => {
      const lcaCalculator = (window as any).lcaCalculator;
      if (lcaCalculator) {
        console.log("🔍 LCAPanel - LCACalculator encontrado en window:", lcaCalculator);
        
        // Configurar conexión con LCACalculator
        const updateLCADisplay = (data: any) => {
          console.log("🔍 LCAPanel - updateLCADisplay llamado con:", data);
          console.log("🔍 LCAPanel - Tipo de data:", typeof data);
          console.log("🔍 LCAPanel - Keys de data:", data ? Object.keys(data) : 'null');
          
          const contentDiv = document.getElementById('lca-content');
          console.log("🔍 LCAPanel - contentDiv encontrado:", !!contentDiv);
          console.log("🔍 LCAPanel - contentDiv elemento:", contentDiv);
          
          if (!contentDiv) {
            console.warn("⚠️ No se encontró lca-content en LCAPanel");
            return;
          }

          if (!data || Object.keys(data).length === 0) {
            console.log("🔍 LCAPanel - data vacío, mostrando mensaje por defecto");
            contentDiv.innerHTML = `
              <div style="text-align: center; color: #888; font-style: italic; padding: 20px;">
                Run LCA analysis to view material quantities
              </div>
            `;
            return;
          }

          console.log("🔍 LCAPanel - Generando tabla de materiales...");

          // Crear datos para la tabla
          const tableData = [];
          
          for (const elementType in data) {
            const materials = data[elementType];
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

          // Obtener datos de emisiones si están disponibles
          const lcaCalculator = (window as any).lcaCalculator;
          const emissionsData = lcaCalculator ? lcaCalculator.getCarbonFootprint() : null;

          // Crear tabla mejorada con más información
          let html = `
            <div style="width: 100%;">
              <div style="margin-bottom: 16px; padding: 12px; background: rgba(188, 241, 36, 0.1); border-radius: 8px; border-left: 4px solid #bcf124;">
                <h3 style="margin: 0 0 8px 0; color: #bcf124; font-size: 16px; font-weight: 600;">LCA Analysis Results</h3>
                <p style="margin: 0; color: var(--bim-text-color, #fff); font-size: 14px; opacity: 0.8;">
                  Material quantities and carbon emissions from IFC model
                </p>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-family: inherit;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--bim-border-color, #333);">
                    <th style="text-align: left; padding: 12px; font-weight: 600; color: var(--bim-text-color, #fff); background: rgba(188, 241, 36, 0.1);">Element/Material</th>
                    <th style="text-align: right; padding: 12px; font-weight: 600; color: var(--bim-text-color, #fff); background: rgba(188, 241, 36, 0.1);">Volume (m³)</th>
                  </tr>
                </thead>
                <tbody>
          `;

          for (const item of tableData) {
            const isHeader = item.isHeader;
            const style = isHeader 
              ? "font-weight: 600; color: #bcf124; background: rgba(188, 241, 36, 0.1); padding: 12px;"
              : "color: var(--bim-text-color, #fff); padding: 8px 12px;";
            
            const valueStyle = isHeader 
              ? "text-align: right; font-weight: 600; color: #bcf124;"
              : "text-align: right; color: var(--bim-text-color, #fff);";
              
            html += `
              <tr style="border-bottom: 1px solid var(--bim-border-color, #333);">
                <td style="${style}">${item.property}</td>
                <td style="${valueStyle}">${item.value}</td>
              </tr>
            `;
          }

          // Calcular estadísticas
          let totalElements = 0;
          let totalMaterials = 0;
          let totalVolume = 0;
          
          for (const elementType in data) {
            const materials = data[elementType];
            let elementVolume = 0;
            let materialCount = 0;
            
            for (const material in materials) {
              const volume = materials[material].NetVolume;
              elementVolume += volume;
              materialCount++;
            }
            
            if (elementVolume > 0) {
              totalElements++;
              totalMaterials += materialCount;
              totalVolume += elementVolume;
            }
          }

          html += `
                </tbody>
              </table>
              
              ${emissionsData ? `
              <div style="margin-top: 16px; padding: 12px; background: rgba(255, 99, 132, 0.1); border-radius: 8px; border: 1px solid rgba(255, 99, 132, 0.3);">
                <h4 style="margin: 0 0 8px 0; color: #ff6384; font-size: 14px; font-weight: 600;">Carbon Emissions</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                  <div style="color: var(--bim-text-color, #fff);">Total CO₂: <span style="color: #ff6384; font-weight: 600;">${emissionsData.totalCO2.toFixed(3)} t CO₂ eq</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Total Energy: <span style="color: #ff6384; font-weight: 600;">${emissionsData.totalEnergy.toFixed(0)} MJ</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Carbon Intensity: <span style="color: #ff6384; font-weight: 600;">${emissionsData.carbonIntensity.toFixed(3)} t CO₂ eq/m³</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Materials: <span style="color: #ff6384; font-weight: 600;">${emissionsData.materials.length}</span></div>
                </div>
              </div>
              ` : ''}
              
              <div style="margin-top: 16px; padding: 12px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; border: 1px solid var(--bim-border-color, #333);">
                <h4 style="margin: 0 0 8px 0; color: #bcf124; font-size: 14px; font-weight: 600;">Summary</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                  <div style="color: var(--bim-text-color, #fff);">Elements: <span style="color: #bcf124; font-weight: 600;">${totalElements}</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Materials: <span style="color: #bcf124; font-weight: 600;">${totalMaterials}</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Total Volume: <span style="color: #bcf124; font-weight: 600;">${totalVolume.toFixed(2)} m³</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Avg per Element: <span style="color: #bcf124; font-weight: 600;">${totalElements > 0 ? (totalVolume / totalElements).toFixed(2) : '0.00'} m³</span></div>
                </div>
              </div>
            </div>
          `;

          console.log("🔍 LCAPanel - HTML generado con tabla nativa");
          contentDiv.innerHTML = html;
          console.log("✅ LCAPanel - Panel actualizado directamente");
        };

        // Conectar con el evento de LCACalculator
        if (lcaCalculator.onMaterialQuantitiesComputed) {
          console.log("🔍 LCAPanel - Conectando con onMaterialQuantitiesComputed...");
          lcaCalculator.onMaterialQuantitiesComputed.add(updateLCADisplay);
          console.log("✅ LCAPanel - Conexión establecida con LCACalculator");
          console.log("🔍 LCAPanel - Handlers después de conectar:", (lcaCalculator.onMaterialQuantitiesComputed as any).handlers.length);
          return true;
        } else {
          console.warn("⚠️ LCAPanel - onMaterialQuantitiesComputed no disponible");
          return false;
        }
      } else {
        console.warn("⚠️ LCAPanel - LCACalculator no encontrado en window");
        return false;
      }
    };

    // Intentar conectar inmediatamente
    if (!connectToLCACalculator()) {
      // Si no está disponible, intentar cada 500ms hasta 10 segundos
      let attempts = 0;
      const maxAttempts = 20;
      const interval = setInterval(() => {
        attempts++;
        console.log(`🔍 LCAPanel - Intento ${attempts}/${maxAttempts} de conectar con LCACalculator...`);
        
        if (connectToLCACalculator()) {
          console.log("✅ LCAPanel - Conexión exitosa con LCACalculator");
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          console.warn("⚠️ LCAPanel - No se pudo conectar con LCACalculator después de 10 segundos");
          clearInterval(interval);
        }
      }, 500);
    }
  };

  const onAnalyzeFullModel = async () => {
    const runFullLCAAnalysis = (window as any).runFullLCAAnalysis;
    if (runFullLCAAnalysis) {
      try {
        console.log("🔍 Ejecutando análisis completo del modelo...");
        await runFullLCAAnalysis();
      } catch (error) {
        console.error("❌ Error en análisis completo:", error);
      }
    } else {
      console.warn("⚠️ runFullLCAAnalysis no disponible");
    }
  };

  return BUI.html`
    <bim-panel-section
      name="lca"
      label="LCA Analysis"
      icon="material-symbols:eco"
      data-element="lca"
      style="max-height: calc(100vh - 120px); overflow-y: auto;"
    >
      <div style="padding: 12px; border-bottom: 1px solid var(--bim-ui_bg-contrast-20);">
        <bim-button 
          label="Analyze Full Model" 
          icon="material-symbols:analytics"
          @click=${onAnalyzeFullModel}
          style="width: 100%;"
        ></bim-button>
      </div>
      <div id="lca-content" style="max-height: calc(100vh - 200px); overflow-y: auto; padding: 12px;">
        <div style="text-align: center; color: #888; font-style: italic; padding: 20px;">
          Click "Analyze Full Model" or select elements to view material quantities
        </div>
      </div>
    </bim-panel-section>
  `;
};
