import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { IDSValidator } from "../../../bim_components/IDS";
import { UIDataTransformer } from "../../../bim_components/IDS/ui-data-transformer";
import { BCFTool } from "../../../bim_components/BCF";

export interface IDSPanelState {
  components: OBC.Components;
}

export const idsPanelTemplate: BUI.StatefullComponent<IDSPanelState> = (state) => {
  const { components } = state;
  
  const idsValidator = components.get(IDSValidator);
  const fragments = components.get(OBC.FragmentsManager);
  const highlighter = components.get(OBF.Highlighter);
  
  let currentResults: any = null;
  let currentReport: any = null;
  let isRunning = false;
  let idsLoaded = false;

  // Estado del panel
  let showPassed = false;
  let selectedFailureId: string | null = null;

  const loadIDSFiles = async (): Promise<boolean> => {
    if (idsLoaded) return true;

    try {
      const idsResponse = await fetch('/assets/IFC example/RAVA3x5_asetuksen_liite1_tarkastus_v1_0.ids');
      if (!idsResponse.ok) {
        throw new Error(`Failed to load IDS: ${idsResponse.status}`);
      }
      const idsContent = await idsResponse.text();
      await idsValidator.load(idsContent);

      // Sincronizar con el componente oficial OBC.IDSSpecifications (docs That Open)
      const officialIds = components.get(OBC.IDSSpecifications);
      try {
        const loadedSpecs = officialIds.load(idsContent);
        if (loadedSpecs.length === 0) {
          idsValidator.syncToOfficialIDS(officialIds);
        } else {
          console.log('[IDSPanel] Loaded', loadedSpecs.length, 'spec(s) via OBC.IDSSpecifications.load()');
        }
      } catch {
        idsValidator.syncToOfficialIDS(officialIds);
      }

      const excelPath = '/assets/IFC example/RAVA3.5-ydintietojen ja rakennuksen suunnitelmamallin tekniset määritykset v1_0.xlsx';
      const excelLoaded = await idsValidator.loadRAVAExcel(encodeURI(excelPath));
      if (excelLoaded) {
        console.log('[IDSPanel] RAVA Excel loaded successfully');
      } else {
        console.warn('[IDSPanel] Could not load RAVA Excel (continuing without it). Check URL and that the file is served.');
      }

      idsLoaded = true;
      console.log('[IDSPanel] RAVA3.5 IDS loaded successfully');
      return true;
    } catch (error) {
      console.error('[IDSPanel] Error loading IDS/RAVA files:', error);
      return false;
    }
  };

  const validateRAVA = async () => {
    if (isRunning) return;

    isRunning = true;
    const validateBtn = document.getElementById("ids-validate-btn");
    if (validateBtn) {
      (validateBtn as any).disabled = true;
      (validateBtn as any).label = "Validating RAVA 3.5...";
    }

    try {
      if (!idsLoaded) {
        const loaded = await loadIDSFiles();
        if (!loaded) {
          throw new Error("Could not load RAVA3.5 IDS");
        }
      }

      const modelsEntries = Array.from(fragments.list.entries());
      if (modelsEntries.length === 0) {
        alert("No IFC models loaded. Please load a model first.");
        return;
      }

      // Usar el último modelo cargado (igual que en runRavaValidationLocal)
      const [modelId, model] = modelsEntries[modelsEntries.length - 1] as [string, FRAGS.FragmentsGroup];
      const officialIds = components.get(OBC.IDSSpecifications);
      const modelIdsRegex = [new RegExp(String(modelId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")];

      const failedBySpec = new Map<string, Map<number, string[]>>();
      const merged = new Map<string, Map<number, { pass: boolean }>>();

      for (const [, spec] of officialIds.list) {
        const result = await spec.test(modelIdsRegex);
        for (const [mid, items] of result) {
          if (!merged.has(mid)) merged.set(mid, new Map());
          const map = merged.get(mid)!;
          if (!failedBySpec.has(mid)) failedBySpec.set(mid, new Map());
          const perModel = failedBySpec.get(mid)!;
          for (const [localId, r] of items) {
            const cur = map.get(localId);
            map.set(localId, { pass: (cur?.pass !== false) && r.pass });
            if (!r.pass) {
              const list = perModel.get(localId) ?? [];
              list.push(spec.name);
              perModel.set(localId, list);
            }
          }
        }
      }

      const { pass, fail } = officialIds.getModelIdMap(merged);
      const totalPass = Object.values(pass).reduce((s, set) => s + (set?.size ?? 0), 0);
      const totalFail = Object.values(fail).reduce((s, set) => s + (set?.size ?? 0), 0);
      const total = totalPass + totalFail;
      const passRate = total > 0 ? Math.round((totalPass / total) * 100) : 0;

      const failures: Array<{ modelId: string; expressID: number; entityType: string; entityName: string; checks: Array<{ type: string; specName?: string; details: string }> }> = [];
      const fragModel = fragments.list.get(modelId);
      if (fragModel && typeof (fragModel as any).getItemsData === "function" && totalFail > 0) {
        const failedLocalIds: number[] = [];
        const failSet = fail[modelId];
        if (failSet) for (const id of failSet) failedLocalIds.push(id);
        if (failedLocalIds.length > 0) {
          const perModelFailed = failedBySpec.get(modelId);
          try {
            const itemsData = await (fragModel as any).getItemsData(failedLocalIds, { attributesDefault: true });
            const seenIds = new Set<number>();
            for (const item of itemsData || []) {
              const localId = (item as any)._localId?.value ?? (item as any).expressID ?? (item as any)._localId;
              const id = typeof localId === "number" ? localId : Number(localId);
              seenIds.add(id);
              const entityType = (item as any)._category?.value ?? (item as any).type ?? "Unknown";
              const entityName = (item as any).Name?.value ?? (item as any).Name ?? (item as any).name ?? "Unnamed";
              const specList = perModelFailed?.get(id) ?? [];
              failures.push({
                modelId,
                expressID: id,
                entityType: String(entityType).replace(/^IFC/, ""),
                entityName: String(entityName ?? "Unnamed"),
                checks: specList.map((specName) => ({ type: "spec", specName, details: `Failed specification: ${specName}` })),
              });
            }
            for (const id of failedLocalIds) {
              if (seenIds.has(id)) continue;
              const specList = perModelFailed?.get(id) ?? [];
              failures.push({
                modelId,
                expressID: id,
                entityType: "Element",
                entityName: "ID " + id,
                checks: specList.map((specName) => ({ type: "spec", specName, details: `Failed specification: ${specName}` })),
              });
            }
          } catch (e) {
            console.warn("[IDSPanel] Could not get item data for failure details:", e);
            for (const id of failedLocalIds) {
              const specList = perModelFailed?.get(id) ?? [];
              failures.push({
                modelId,
                expressID: id,
                entityType: "Element",
                entityName: "ID " + id,
                checks: specList.map((specName) => ({ type: "spec", specName, details: `Failed specification: ${specName}` })),
              });
            }
          }
        }
      }

      currentResults = { merged, pass, fail };
      currentReport = {
        summary: { total, passed: totalPass, failed: totalFail, passRate, withKoodistoInfo: 0, specCount: officialIds.list.size },
        failModelIdMap: fail,
        failures,
      };

      let viewScreenshot: string | undefined;
      try {
        const worlds = components.get(OBC.Worlds);
        const worldKeys = Array.from(worlds.list.keys());
        const world = worldKeys.length > 0 ? worlds.list.get(worldKeys[0]) : null;
        const renderer = (world as any)?.renderer;
        const canvas = renderer?.domElement ?? renderer?.get?.()?.domElement ?? document.querySelector("canvas");
        if (canvas && typeof (canvas as HTMLCanvasElement).toDataURL === "function") {
          const c = canvas as HTMLCanvasElement;
          const maxW = 800;
          let dataUrl = c.toDataURL("image/png");
          if (c.width > maxW) {
            const off = document.createElement("canvas");
            off.width = maxW;
            off.height = Math.round((c.height * maxW) / c.width);
            const ctx = off.getContext("2d");
            if (ctx) {
              ctx.drawImage(c, 0, 0, off.width, off.height);
              dataUrl = off.toDataURL("image/jpeg", 0.85);
            }
          }
          viewScreenshot = dataUrl;
          currentReport.summary.viewScreenshot = viewScreenshot;
        }
      } catch (e) {
        console.warn("[IDSPanel] Could not capture view screenshot:", e);
      }

      try {
        sessionStorage.setItem(
          "ids-last-report",
          JSON.stringify({
            report: currentReport,
            results: currentResults,
            timestamp: new Date().toISOString(),
            modelName: model.name || "Unknown",
          })
        );
      } catch (e) {
        console.warn("[IDSPanel] Could not save report to sessionStorage:", e);
      }

      if (highlighter) {
        if (!OBC.ModelIdMapUtils.isEmpty(fail)) {
          const styleName = "ids-validation-fails";
          if (!highlighter.styles.get(styleName)) {
            highlighter.styles.set(styleName, {
              color: new THREE.Color("#f44336"),
              renderedFaces: FRAGS.RenderedFaces.ONE,
              opacity: 1,
              transparent: false,
            });
          }
          highlighter.clear();
          try { components.get(BCFTool)?.setGhostContext(false); } catch { /* BCFTool not registered */ }
          await highlighter.highlightByID(styleName, fail);
          try { components.get(BCFTool)?.setGhostContext(true); } catch { /* BCFTool not registered */ }
        } else {
          highlighter.clear();
          try { components.get(BCFTool)?.setGhostContext(false); } catch { }
        }
      }

      updateResultsDisplay();
    } catch (error) {
      console.error("[IDSPanel] Error running validation:", error);
      alert(`Error running validation: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      isRunning = false;
      if (validateBtn) {
        (validateBtn as any).disabled = false;
        (validateBtn as any).label = "Validate RAVA";
      }
    }
  };

  const openDetailedReport = () => {
    if (!currentReport) {
      alert("No report available. Run validation first.");
      return;
    }
    const w = typeof window !== "undefined" ? (window.top ?? window) : null;
    if (w?.location) w.location.href = "/ids-report";
  };

  const updateResultsDisplay = () => {
    if (!currentReport) return;

    const summaryContainer = document.getElementById("ids-summary");
    if (summaryContainer) {
      summaryContainer.innerHTML = "";
      const summaryDiv = document.createElement("div");
      summaryDiv.style.cssText = "display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 4px;";

      const specCount = currentReport.summary.specCount ?? 0;
      const explainP = document.createElement("p");
      explainP.style.cssText = "font-size: 0.75rem; color: rgba(255,255,255,0.7); margin: 0 0 0.5rem 0; line-height: 1.3;";
      explainP.textContent = "Elements checked against " + specCount + " RAVA 3.5 specs. Red = failed one or more. Click a row to see which spec(s) failed.";
      summaryDiv.appendChild(explainP);

      const actionP = document.createElement("p");
      actionP.style.cssText = "font-size: 0.7rem; color: rgba(255,255,255,0.55); margin: 0.25rem 0 0.5rem 0; line-height: 1.3; border-left: 3px solid #ff9800; padding-left: 0.5rem;";
      actionP.textContent = "To pass: add or fix the required properties for each failed specification in your IFC authoring tool (e.g. Archicad, Revit), then re-run validation.";
      summaryDiv.appendChild(actionP);

      const totalRow = document.createElement("div");
      totalRow.style.cssText = "display: flex; justify-content: space-between;";
      totalRow.innerHTML = "<span>Total elements checked:</span><strong>" + currentReport.summary.total + "</strong>";
      summaryDiv.appendChild(totalRow);

      const passedRow = document.createElement("div");
      passedRow.style.cssText = "display: flex; justify-content: space-between; color: #4caf50;";
      passedRow.innerHTML = "<span>Passed:</span><strong>" + currentReport.summary.passed + "</strong>";
      summaryDiv.appendChild(passedRow);

      const failedRow = document.createElement("div");
      failedRow.style.cssText = "display: flex; justify-content: space-between; color: #f44336;";
      failedRow.innerHTML = "<span>Failed (highlighted in red):</span><strong>" + currentReport.summary.failed + "</strong>";
      summaryDiv.appendChild(failedRow);

      const rateRow = document.createElement("div");
      rateRow.style.cssText = "display: flex; justify-content: space-between;";
      const rateColor = currentReport.summary.passRate >= 80 ? "#4caf50" : currentReport.summary.passRate >= 50 ? "#ff9800" : "#f44336";
      rateRow.innerHTML = "<span>Pass rate:</span><strong style=\"color: " + rateColor + "\">" + (currentReport.summary.passRate ?? 0).toFixed(1) + "%</strong>";
      summaryDiv.appendChild(rateRow);

      const fullReportLink = document.createElement("a");
      fullReportLink.href = "#";
      fullReportLink.id = "ids-view-report-btn";
      fullReportLink.style.cssText = "display: inline-block; margin-top: 0.5rem; font-size: 0.8rem; color: #64b5f6; text-decoration: none;";
      fullReportLink.textContent = "View Full Report →";
      fullReportLink.onclick = (e) => {
        e.preventDefault();
        openDetailedReport();
      };
      summaryDiv.appendChild(fullReportLink);
      summaryContainer.appendChild(summaryDiv);
    }
    const fullReportBtn = document.getElementById("ids-view-report-btn-top");
    if (fullReportBtn && (fullReportBtn as HTMLButtonElement).disabled !== undefined) {
      (fullReportBtn as HTMLButtonElement).disabled = false;
    }

    const failuresEl = document.getElementById("ids-failures-list");
    if (failuresEl) {
      failuresEl.innerHTML = "";
      if (currentReport.failures?.length > 0) {
        const list = Array.isArray(currentReport.failures) ? currentReport.failures : [];
        list.forEach((failure: any, idx: number) => {
          const failureId = "failure-" + idx;
          const failureDiv = document.createElement("div");
          failureDiv.style.cssText = "border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 0.5rem; overflow: hidden;";

          const headerDiv = document.createElement("div");
          headerDiv.style.cssText = "padding: 0.5rem 0.75rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center;";
          headerDiv.onclick = () => {
            const content = document.getElementById(failureId + "-content");
            if (content) {
              const isHidden = content.style.display === "none";
              content.style.display = isHidden ? "block" : "none";
              headerDiv.style.background = isHidden ? "rgba(255,255,255,0.05)" : "transparent";
            }
          };

          const headerLeft = document.createElement("div");
          const entityTypeStrong = document.createElement("strong");
          entityTypeStrong.style.fontSize = "0.875rem";
          entityTypeStrong.textContent = failure.entityType || "Element";
          headerLeft.appendChild(entityTypeStrong);
          const entityNameDiv = document.createElement("div");
          entityNameDiv.style.cssText = "font-size: 0.75rem; color: rgba(255,255,255,0.7);";
          entityNameDiv.textContent = (failure.entityName || "Unnamed") + " (ID " + failure.expressID + ")";
          headerLeft.appendChild(entityNameDiv);
          headerDiv.appendChild(headerLeft);

          const headerRight = document.createElement("div");
          headerRight.style.cssText = "color: #f44336; font-weight: bold; font-size: 0.75rem;";
          headerRight.textContent = (failure.checks?.length ?? 0) + " failed";
          headerDiv.appendChild(headerRight);

          failureDiv.appendChild(headerDiv);

          const contentDiv = document.createElement("div");
          contentDiv.id = failureId + "-content";
          contentDiv.style.cssText = "padding: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1);" + (idx > 0 ? " display: none;" : "");
          const checks = Array.isArray(failure.checks) ? failure.checks : [];
          checks.forEach((check: any) => {
          const checkDiv = document.createElement("div");
          checkDiv.style.cssText = "margin-bottom: 0.75rem; padding: 0.5rem; background: rgba(255,0,0,0.1); border-radius: 4px; border-left: 3px solid #f44336;";
          
          const propNameDiv = document.createElement("div");
          propNameDiv.style.cssText = "font-weight: bold; margin-bottom: 0.25rem; font-size: 0.875rem;";
          propNameDiv.textContent = check.specName ? "Spec: " + check.specName : (check.propertySet || check.propertyName ? `${check.propertySet || ""}.${check.propertyName || ""}` : check.details || "Failed");
          checkDiv.appendChild(propNameDiv);

          const detailsDiv = document.createElement("div");
          detailsDiv.style.cssText = "font-size: 0.875rem; color: rgba(255,255,255,0.8); margin-bottom: 0.5rem;";
          detailsDiv.textContent = check.details || "";
          checkDiv.appendChild(detailsDiv);
          
          if (check.ravaInfo) {
            const ravaDiv = document.createElement('div');
            ravaDiv.style.cssText = 'font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 0.25rem;';
            ravaDiv.textContent = `📋 ${check.ravaInfo.luokka}: ${check.ravaInfo.attribuutti}`;
            checkDiv.appendChild(ravaDiv);
            
            if (check.ravaInfo.tayttoohje) {
              const instructionDiv = document.createElement('div');
              instructionDiv.style.cssText = 'font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-bottom: 0.25rem;';
              instructionDiv.textContent = `💡 ${check.ravaInfo.tayttoohje}`;
              checkDiv.appendChild(instructionDiv);
            }
            
            if (check.ravaInfo.linkki) {
              const linkA = document.createElement('a');
              linkA.href = check.ravaInfo.linkki;
              linkA.target = '_blank';
              linkA.style.cssText = 'font-size: 0.75rem; color: #64b5f6; text-decoration: none;';
              linkA.textContent = '🔗 View documentation';
              checkDiv.appendChild(linkA);
            }
          }
          
          if (check.koodistoValidation?.validValues) {
            const koodistoDiv = document.createElement('div');
            koodistoDiv.style.cssText = 'margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1);';
            
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = 'font-size: 0.75rem; color: rgba(255,255,255,0.7); margin-bottom: 0.25rem;';
            labelDiv.textContent = 'Valid values:';
            koodistoDiv.appendChild(labelDiv);
            
            const valuesDiv = document.createElement('div');
            valuesDiv.style.cssText = 'display: flex; flex-wrap: wrap; gap: 0.25rem;';
            check.koodistoValidation.validValues.forEach((v: any) => {
              const valueSpan = document.createElement('span');
              valueSpan.style.cssText = 'padding: 0.25rem 0.5rem; background: rgba(76,175,80,0.2); border-radius: 3px; font-size: 0.75rem;';
              valueSpan.textContent = v.label;
              valuesDiv.appendChild(valueSpan);
            });
            koodistoDiv.appendChild(valuesDiv);
            checkDiv.appendChild(koodistoDiv);
          }
          
          const highlightBtn = document.createElement("button");
          highlightBtn.style.cssText = "margin-top: 0.5rem; padding: 0.2rem 0.4rem; background: #2196f3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.7rem;";
          highlightBtn.textContent = "Highlight in viewer";
          const mid = failure.modelId;
          const eid = failure.expressID;
          highlightBtn.onclick = () => {
            if (!highlighter || !mid) return;
            const styleName = "ids-validation-fails";
            if (!highlighter.styles.get(styleName)) {
              highlighter.styles.set(styleName, {
                color: new THREE.Color("#f44336"),
                renderedFaces: FRAGS.RenderedFaces.ONE,
                opacity: 1,
                transparent: false,
              });
            }
            const selection: Record<string, Set<number>> = { [mid]: new Set([eid]) };
            highlighter.clear();
            try { components.get(BCFTool)?.setGhostContext(false); } catch { }
            highlighter.highlightByID(styleName, selection);
            try { components.get(BCFTool)?.setGhostContext(true); } catch { }
          };
          checkDiv.appendChild(highlightBtn);

          contentDiv.appendChild(checkDiv);
        });
          failureDiv.appendChild(contentDiv);
          failuresEl.appendChild(failureDiv);
        });
      } else {
        const noFailuresDiv = document.createElement("div");
        noFailuresDiv.style.cssText = "padding: 1rem; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.875rem;";
        noFailuresDiv.textContent = "No failures. All elements passed.";
        failuresEl.appendChild(noFailuresDiv);
      }
    }
  };

  const validateButton = BUI.Component.create<BUI.Button>(() => {
    return BUI.html`
      <bim-button
        id="ids-validate-btn"
        label="Validate RAVA"
        icon="material-symbols:verified"
        @click=${validateRAVA}
        style="width: auto; min-width: 0; padding: 0.35rem 0.6rem; font-size: 0.8rem; margin-bottom: 0.5rem;"
      ></bim-button>
    `;
  });

  const viewReportButton = BUI.Component.create<BUI.Button>(() => {
    return BUI.html`
      <bim-button
        id="ids-view-report-btn-top"
        label="Full Report"
        icon="material-symbols:description"
        @click=${openDetailedReport}
        style="width: auto; padding: 0.3rem 0.5rem; font-size: 0.75rem; margin-top: 0.5rem;"
        ?disabled=${!currentReport}
      ></bim-button>
    `;
  });

  const summarySection = BUI.Component.create(() => {
    return BUI.html`
      <div id="ids-summary" style="margin-bottom: 0.75rem;">
        <div style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.5);">Run validation to check the model against 123 RAVA 3.5 specifications.</div>
      </div>
    `;
  });

  const failuresSection = BUI.Component.create(() => {
    return BUI.html`
      <div id="ids-failures-list" style="max-height: 160px; overflow-y: auto; overflow-x: hidden;">
        ${currentReport ? '' : ''}
      </div>
    `;
  });

  return BUI.html`
    <bim-panel-section 
      data-element="ids"
      fixed 
      label="IDS Validation RAVA 3.5" 
      style="display: flex; flex-direction: column; overflow: hidden; min-height: 0; padding: 0.5rem; box-sizing: border-box;">
      <div style="display: flex; flex-direction: column; gap: 0.5rem; overflow: hidden; min-width: 0; flex: 1 1 auto; min-height: 0;">
        ${validateButton}
        ${summarySection}
        <div style="flex-shrink: 1; min-height: 0; padding-top: 0.5rem; border-top: 1px solid var(--bim-ui_bg-contrast-20, rgba(255,255,255,0.1));">
          <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem;">Failed elements</div>
          ${failuresSection}
        </div>
        <div style="flex-shrink: 0; margin-top: auto; padding-top: 0.5rem; border-top: 1px solid var(--bim-ui_bg-contrast-20, rgba(255,255,255,0.1));">
          ${viewReportButton}
        </div>
      </div>
    </bim-panel-section>
  `;
};
