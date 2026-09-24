import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export interface CostPanelState {
  components: OBC.Components;
}

export const costPanelTemplate: BUI.StatefullComponent<CostPanelState> = (
  state,
) => {
  const { components } = state;
  // Expose updateCostDisplay to the outer scope so other handlers can call it
  let updateCostDisplay: (data: any) => void = (data: any) => {};
  // Keep a reference to the initial noop so we can detect if it was replaced
  const _initialUpdateNoop = updateCostDisplay;

  const onCreated = (e?: Element) => {
    if (!e) return;
    
    console.log("🔍 CostPanel - onCreated ejecutado");
    console.log("🔍 CostPanel - Element:", e);
    console.log("🔍 CostPanel - Element ID:", e.id);
    console.log("🔍 CostPanel - Element classes:", e.className);
    console.log("🔍 CostPanel - Timestamp:", new Date().toISOString());
    
    // Función para conectar con CostCalculator
    const connectToCostCalculator = () => {
      const costCalculator = (window as any).costCalculator;
      if (costCalculator) {
        console.log("🔍 CostPanel - CostCalculator encontrado en window:", costCalculator);
        
  // Configurar conexión con CostCalculator
  updateCostDisplay = (data: any) => {
          console.log("🔍 CostPanel - updateCostDisplay llamado con:", data);
          console.log("🔍 CostPanel - Tipo de data:", typeof data);
          console.log("🔍 CostPanel - Keys de data:", data ? Object.keys(data) : 'null');
          
          const contentDiv = document.getElementById('cost-content');
          console.log("🔍 CostPanel - contentDiv encontrado:", !!contentDiv);
          console.log("🔍 CostPanel - contentDiv elemento:", contentDiv);
          
          if (!contentDiv) {
            console.warn("⚠️ No se encontró cost-content en CostPanel");
            return;
          }

          if (!data || data.length === 0) {
            console.log("🔍 CostPanel - data vacío, mostrando mensaje por defecto");
            contentDiv.innerHTML = `
              <div style="text-align: center; color: #888; font-style: italic; padding: 20px;">
                Run Cost analysis to view material costs
              </div>
            `;
            return;
          }

          console.log("🔍 CostPanel - Generando tabla de costos...");

          // Crear tabla de costos
          let html = `
            <div style="width: 100%;">
              <div style="margin-bottom: 16px; padding: 12px; background: rgba(255, 193, 7, 0.1); border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0 0 8px 0; color: #ffc107; font-size: 16px; font-weight: 600;">Cost Analysis Results</h3>
                <p style="margin: 0; color: var(--bim-text-color, #fff); font-size: 14px; opacity: 0.8;">
                  Material costs and construction estimates from IFC model
                </p>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-family: inherit;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--bim-border-color, #333);">
                    <th style="text-align: left; padding: 12px; font-weight: 600; color: var(--bim-text-color, #fff); background: rgba(255, 193, 7, 0.1);">Element</th>
                    <th style="text-align: right; padding: 12px; font-weight: 600; color: var(--bim-text-color, #fff); background: rgba(255, 193, 7, 0.1);">Material Cost</th>
                    <th style="text-align: right; padding: 12px; font-weight: 600; color: var(--bim-text-color, #fff); background: rgba(255, 193, 7, 0.1);">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
          `;

          let totalMaterialCost = 0;
          let totalCost = 0;
          let elementCount = 0;

          for (const item of data) {
            const materialCost = item.materialCost || 0;
            const totalItemCost = item.totalCost || 0;
            
            totalMaterialCost += materialCost;
            totalCost += totalItemCost;
            elementCount++;

            html += `
              <tr style="border-bottom: 1px solid var(--bim-border-color, #333);">
                <td style="color: var(--bim-text-color, #fff); padding: 8px 12px;">
                  <div style="font-weight: 600; color: #ffc107;">${item.name}</div>
                  <div style="font-size: 12px; opacity: 0.7;">${item.type} - ${item.taloCode}</div>
                </td>
                <td style="text-align: right; color: var(--bim-text-color, #fff); padding: 8px 12px;">
                  €${materialCost.toFixed(2)}
                </td>
                <td style="text-align: right; color: #ffc107; font-weight: 600; padding: 8px 12px;">
                  €${totalItemCost.toFixed(2)}
                </td>
              </tr>
            `;
          }

          html += `
                </tbody>
              </table>
              
              <div style="margin-top: 16px; padding: 12px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; border: 1px solid var(--bim-border-color, #333);">
                <h4 style="margin: 0 0 8px 0; color: #ffc107; font-size: 14px; font-weight: 600;">Summary</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                  <div style="color: var(--bim-text-color, #fff);">Elements: <span style="color: #ffc107; font-weight: 600;">${elementCount}</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Material Cost: <span style="color: #ffc107; font-weight: 600;">€${totalMaterialCost.toFixed(2)}</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Total Cost: <span style="color: #ffc107; font-weight: 600;">€${totalCost.toFixed(2)}</span></div>
                  <div style="color: var(--bim-text-color, #fff);">Avg per Element: <span style="color: #ffc107; font-weight: 600;">€${elementCount > 0 ? (totalCost / elementCount).toFixed(2) : '0.00'}</span></div>
                </div>
              </div>
            </div>
          `;

          console.log("🔍 CostPanel - HTML generado con tabla nativa");
          contentDiv.innerHTML = html;
          console.log("✅ CostPanel - Panel actualizado directamente");
        };

        // Conectar con el evento de CostCalculator
        if (costCalculator.onMaterialCostsComputed) {
          console.log("🔍 CostPanel - Conectando con onMaterialCostsComputed...");
          costCalculator.onMaterialCostsComputed.add(updateCostDisplay);

          // Subscribe to progress updates so the UI can show the live progress bar
          if (costCalculator.onProgress) {
            console.log("🔍 CostPanel - Subscribing to onProgress updates...");
            costCalculator.onProgress.add((percent: number) => {
              try {
                const pct = Math.max(0, Math.min(100, Math.round(percent)));
                console.log('[UI] CostPanel - onProgress:', pct);
                // Prefer the instance method to render the loading indicator
                if (typeof (costCalculator as any).showLoadingIndicator === 'function') {
                  try {
                    (costCalculator as any).showLoadingIndicator('Analyzing costs and materials...', pct);
                  } catch (err) {
                    console.warn('[UI] Error calling showLoadingIndicator on costCalculator:', err);
                  }
                } else {
                  // Fallback: update DOM directly
                  const costContent = document.getElementById('cost-content');
                  if (costContent) {
                    costContent.innerHTML = `\n                      <div style="padding: 20px; text-align: center;">\n                        <div style="margin-bottom: 10px; color: var(--bim-label--c);">Analyzing costs... ${pct}%</div>\n                        <div style="width: 100%; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; overflow: hidden; height: 8px;">\n                          <div style="width: ${pct}%; background: #ffc107; height: 100%; transition: width 0.3s;"></div>\n                        </div>\n                        <div style="margin-top: 8px; color: var(--bim-label--c); font-size: 12px;">${pct}%</div>\n                      </div>\n                    `;
                  }
                }
                // If we reached 100%, ensure the results table is rendered
                try {
                  if (pct === 100) {
                    if (typeof updateCostDisplay === 'function') {
                      try {
                        // costCalculator._results should hold the final results
                            const results = (costCalculator as any)._results || [];
                            // If the inline handler already rendered, skip
                            try {
                              updateCostDisplay(results);
                            } catch (err) {
                              console.warn('[UI] updateCostDisplay threw when called at 100%:', err);
                              // Fallback: directly render a minimal table with TALO, id/name and type
                              const costContent = document.getElementById('cost-content');
                              if (costContent) {
                                const items = results.map((r: any) => ({
                                  talo: r.taloCode || '-',
                                  id: r.id || r.name || '-',
                                  type: r.type || '-'
                                }));
                                let rows = items.map((it: any) => `
                                  <tr style="border-bottom: 1px solid var(--bim-border-color, #333);">
                                    <td style="padding:8px 12px; color: var(--bim-text-color, #fff);">${it.talo}</td>
                                    <td style="padding:8px 12px; color: var(--bim-text-color, #fff);">${it.id}</td>
                                    <td style="padding:8px 12px; color: var(--bim-text-color, #fff);">${it.type}</td>
                                  </tr>
                                `).join('');
                                costContent.innerHTML = `
                                  <div style="padding: 12px;">
                                    <h3 style="color:#ffc107;">Cost Results (minimal)</h3>
                                    <table style="width:100%; border-collapse: collapse;">
                                      <thead>
                                        <tr style="border-bottom:2px solid var(--bim-border-color, #333);">
                                          <th style="text-align:left; padding:8px; color:#ffc107;">TALO</th>
                                          <th style="text-align:left; padding:8px; color:#ffc107;">ID/Name</th>
                                          <th style="text-align:left; padding:8px; color:#ffc107;">IFC Type</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${rows}
                                      </tbody>
                                    </table>
                                  </div>
                                `;
                              }
                            }
                      } catch (err) {
                        console.warn('[UI] Error calling updateCostDisplay at 100%:', err);
                      }
                    }
                  }
                } catch (e) {
                  console.error('[UI] Error checking final pct handler:', e);
                }
              } catch (e) {
                console.error('[UI] Error in onProgress handler:', e);
              }
            });
          }

          // Subscribe to errors to display them in the panel
          if (costCalculator.onError) {
            costCalculator.onError.add((err: Error) => {
              console.error('[UI] CostPanel - received error from CostCalculator:', err);
              const costContent = document.getElementById('cost-content');
              if (costContent) {
                costContent.innerHTML = `\n                  <div style="padding: 20px; text-align: center; color: #ff6b6b;">\n                    <div style="font-weight: 600; margin-bottom: 8px;">Error during cost analysis</div>\n                    <div style="font-size: 13px; opacity: 0.9;">${err?.message || String(err)}</div>\n                  </div>\n                `;
              }
            });
          }

          console.log("✅ CostPanel - Conexión establecida con CostCalculator");
          console.log("🔍 CostPanel - Handlers después de conectar:", (costCalculator.onMaterialCostsComputed as any).handlers.length);
          return true;
        } else {
          console.warn("⚠️ CostPanel - onMaterialCostsComputed no disponible");
          return false;
        }
      } else {
        console.warn("⚠️ CostPanel - CostCalculator no encontrado en window");
        return false;
      }
    };

    // Intentar conectar inmediatamente
    if (!connectToCostCalculator()) {
      // Si no está disponible, intentar cada 500ms hasta 10 segundos
      let attempts = 0;
      const maxAttempts = 20;
      const interval = setInterval(() => {
        attempts++;
        console.log(`🔍 CostPanel - Intento ${attempts}/${maxAttempts} de conectar con CostCalculator...`);
        
        if (connectToCostCalculator()) {
          console.log("✅ CostPanel - Conexión exitosa con CostCalculator");
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          console.warn("⚠️ CostPanel - No se pudo conectar con CostCalculator después de 10 segundos");
          clearInterval(interval);
        }
      }, 500);
    }
  };

  const onAnalyzeFullModel = async () => {
    console.log('[UI] Analyze Costs button clicked - invoking runFullCostAnalysis (preferred)');
    const runFull = (window as any).runFullCostAnalysis;
    const runCost = (window as any).runCostAnalysis;
    const costContent = document.getElementById('cost-content');
    // Show initial loading indicator in the panel immediately
    if (costContent) {
      costContent.innerHTML = `\n        <div style="padding: 20px; text-align: center;">\n          <div style="margin-bottom: 10px; color: var(--bim-label--c);">Preparing cost analysis...</div>\n          <div style="width: 100%; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; overflow: hidden; height: 8px;">\n            <div style="width: 10%; background: #ffc107; height: 100%; transition: width 0.3s;"></div>\n          </div>\n          <div style="margin-top: 8px; color: var(--bim-label--c); font-size: 12px;">10%</div>\n        </div>\n      `;
    }
    if (typeof runFull === 'function') {
      try {
        // Ensure we subscribe to progress events before starting
        let progressAttached = false;
        const attachProgress = () => {
          const costCalculator = (window as any).costCalculator;
          if (costCalculator && costCalculator.onProgress && !progressAttached) {
            progressAttached = true;
            console.log('[UI] Attaching onProgress listener before running full analysis');
            costCalculator.onProgress.add((pct: number) => {
              try {
                const p = Math.max(0, Math.min(100, Math.round(pct)));
                if (typeof costCalculator.showLoadingIndicator === 'function') {
                  costCalculator.showLoadingIndicator('Analyzing costs and materials...', p);
                } else if (costContent) {
                  costContent.innerHTML = `\n                    <div style="padding: 20px; text-align: center;">\n                      <div style="margin-bottom: 10px; color: var(--bim-label--c);">Analyzing costs... ${p}%</div>\n                      <div style="width: 100%; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; overflow: hidden; height: 8px;">\n                        <div style="width: ${p}%; background: #ffc107; height: 100%; transition: width 0.3s;"></div>\n                      </div>\n                      <div style="margin-top: 8px; color: var(--bim-label--c); font-size: 12px;">${p}%</div>\n                    </div>\n                  `;
                }
              } catch (e) {
                console.error('[UI] Error updating progress:', e);
              }
            });
            // Also attach to material computed to render final table when ready
            if (costCalculator.onMaterialCostsComputed) {
              // Inline handler to forward results to the shared updateCostDisplay
              costCalculator.onMaterialCostsComputed.add((data: any) => {
                try {
                  console.log('[UI] onMaterialCostsComputed (attachProgress) received', data?.length || 0, 'items');

                  const contentDiv = document.getElementById('cost-content');

                  // Try primary path: use updateCostDisplay if it's been initialized
                  if (updateCostDisplay !== _initialUpdateNoop) {
                    try {
                      updateCostDisplay(data);
                      // Add a small debug badge to confirm rendering
                      if (contentDiv) {
                        const badge = document.createElement('div');
                        badge.id = 'cost-rendered-debug';
                        badge.style.cssText = 'position:relative; margin-top:8px; color:#8bc34a; font-size:12px;';
                        badge.textContent = `Rendered ${Array.isArray(data) ? data.length : 0} items at ${new Date().toLocaleTimeString()}`;
                        contentDiv.prepend(badge);
                      }
                      return;
                    } catch (err) {
                      console.warn('[UI] updateCostDisplay threw:', err);
                    }
                  }

                  // Secondary: directly render a minimal table
                  if (!contentDiv) return;
                  if (!data || data.length === 0) {
                    contentDiv.innerHTML = `
                      <div style="text-align: center; color: #888; font-style: italic; padding: 20px;">
                        No cost data available
                      </div>
                    `;
                    return;
                  }

                  const rows = data.map((item: any) => {
                    const talo = item.taloCode || item.talo || '-';
                    const idOrName = item.id || item.name || '-';
                    const type = item.type || item.ifcType || '-';
                    return `
                      <tr style="border-bottom:1px solid var(--bim-border-color,#333)">
                        <td style="padding:8px 12px; color:var(--bim-text-color,#fff);">${talo}</td>
                        <td style="padding:8px 12px; color:var(--bim-text-color,#fff);">${idOrName}</td>
                        <td style="padding:8px 12px; color:var(--bim-text-color,#fff);">${type}</td>
                      </tr>
                    `;
                  }).join('');

                  contentDiv.innerHTML = `
                    <div style="padding:12px;">
                      <h3 style="color:#ffc107; margin:0 0 8px 0">Cost Results</h3>
                      <table style="width:100%; border-collapse:collapse;">
                        <thead>
                          <tr style="border-bottom:2px solid var(--bim-border-color,#333)">
                            <th style="text-align:left; padding:8px; color:#ffc107">TALO</th>
                            <th style="text-align:left; padding:8px; color:#ffc107">ID/Name</th>
                            <th style="text-align:left; padding:8px; color:#ffc107">IFC Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${rows}
                        </tbody>
                      </table>
                    </div>
                  `;

                      // Schedule a retry render in case some other code overwrites the panel
                  setTimeout(() => {
                    try {
                      if (updateCostDisplay !== _initialUpdateNoop) {
                        updateCostDisplay(data);
                      }
                    } catch (e) {
                      console.warn('[UI] retry render failed:', e);
                    }
                  }, 200);                } catch (err) {
                  console.error('[UI] Error in inline onMaterialCostsComputed handler:', err);
                }
              });
            }
            return true;
          }
          return false;
        };

        // Try to attach immediately, otherwise poll for a short time
        if (!attachProgress()) {
          let attempts = 0;
          const maxAttempts = 25; // 25 * 200ms = 5s
          const interval = setInterval(() => {
            attempts++;
            if (attachProgress() || attempts >= maxAttempts) {
              clearInterval(interval);
              if (!progressAttached) console.warn('[UI] Could not attach progress listener before run');
            }
          }, 200);
        }
        console.log("🔍 Ejecutando análisis de costos en TODO el modelo (runFullCostAnalysis)...");
        await runFull();
        // If no progress events were received, ensure UI shows completion
        try {
          if (!document.getElementById('cost-content')) {
            /* nothing */
          }
          if (!progressAttached && costContent) {
            costContent.innerHTML = `\n              <div style="padding: 20px; text-align: center;">\n                <div style="margin-bottom: 10px; color: var(--bim-label--c);">Analysis completed</div>\n                <div style="width: 100%; background: var(--bim-ui_bg-contrast-20); border-radius: 4px; overflow: hidden; height: 8px;">\n                  <div style="width: 100%; background: #ffc107; height: 100%;"></div>\n                </div>\n                <div style="margin-top: 8px; color: var(--bim-label--c); font-size: 12px;">100%</div>\n              </div>\n            `;
          }
        } catch (err) {
          console.warn('[UI] Error ensuring final UI state after runFull:', err);
        }
        console.log('[UI] runFullCostAnalysis completed');
        return;
      } catch (error) {
        console.error("❌ Error en runFullCostAnalysis:", error);
      }
    }

    // Fallback: try per-selection analysis
    if (typeof runCost === 'function') {
      try {
        console.log("🔍 Ejecutando análisis de costos por selección (fallback)...");
        await runCost();
        console.log('[UI] runCostAnalysis completed (fallback)');
      } catch (error) {
        console.error("❌ Error en runCostAnalysis (fallback):", error);
      }
    } else {
      console.warn("⚠️ Ninguna función de análisis de costos disponible en window");
    }
  };

  return BUI.html`
    <bim-panel-section
      name="cost"
      label="Cost Analysis"
      icon="material-symbols:euro"
      data-element="cost"
      style="max-height: calc(100vh - 120px); overflow-y: auto;"
    >
      <div style="padding: 12px; border-bottom: 1px solid var(--bim-ui_bg-contrast-20);">
        <bim-button 
          label="Analyze Costs" 
          icon="material-symbols:calculate"
          @click=${() => { console.log('[UI] Analyze Costs button (inline) clicked'); onAnalyzeFullModel(); }}
          style="width: 100%;"
        ></bim-button>
      </div>
      <div id="cost-content" style="max-height: calc(100vh - 200px); overflow-y: auto; padding: 12px;">
        <div style="text-align: center; color: #888; font-style: italic; padding: 20px;">
          Click "Analyze Costs" or select elements to view cost estimates
        </div>
      </div>
    </bim-panel-section>
  `;
};
