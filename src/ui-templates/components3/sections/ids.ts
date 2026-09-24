import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { parseIDSSpecList, type IDSSpecItem } from "../../../utils/idsSpecList";

export interface IDSPanelState {
  components: OBC.Components;
}

type FailureRow = {
  modelId: string;
  expressID: number;
  entityType: string;
  entityName: string;
  checks: Array<{ type: string; specName?: string; details: string }>;
};

function clearIDSList(officialIds: OBC.IDSSpecifications) {
  for (const key of [...officialIds.list.keys()]) {
    officialIds.list.delete(key);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const idsPanelTemplate: BUI.StatefullComponent<IDSPanelState> = (state) => {
  const { components } = state;
  const fragments = components.get(OBC.FragmentsManager);

  let currentResults: any = null;
  let currentReport: any = null;
  let isRunning = false;
  let loadedXml: string | null = null;
  let loadedFileName: string | null = null;
  let specsSummary: IDSSpecItem[] = [];

  const updateSpecsDisplay = () => {
    const el = document.getElementById("ids-specs-list");
    if (!el) return;
    el.innerHTML = "";

    if (!loadedFileName || specsSummary.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText =
        "padding: 0.75rem; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.8rem;";
      empty.textContent = "Load an IDS (.ids / .xml) file to see its rules.";
      el.appendChild(empty);
      return;
    }

    const header = document.createElement("div");
    header.style.cssText = "font-size: 0.75rem; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;";
    header.textContent = `${loadedFileName} — ${specsSummary.length} rule${specsSummary.length === 1 ? "" : "s"}`;
    el.appendChild(header);

    const list = document.createElement("div");
    list.style.cssText =
      "max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.35rem;";

    for (const spec of specsSummary) {
      const row = document.createElement("div");
      row.style.cssText =
        "padding: 0.4rem 0.5rem; background: rgba(255,255,255,0.04); border-radius: 4px; border-left: 3px solid #64b5f6;";
      const nameEl = document.createElement("div");
      nameEl.style.cssText = "font-size: 0.8rem; font-weight: 600;";
      nameEl.textContent = `${spec.index}. ${spec.name || "(unnamed)"}`;
      row.appendChild(nameEl);
      if (spec.description) {
        const desc = document.createElement("div");
        desc.style.cssText =
          "font-size: 0.7rem; color: rgba(255,255,255,0.55); margin-top: 0.15rem; white-space: pre-wrap; line-height: 1.25;";
        desc.textContent =
          spec.description.length > 180 ? spec.description.slice(0, 180) + "…" : spec.description;
        row.appendChild(desc);
      }
      list.appendChild(row);
    }
    el.appendChild(list);
  };

  const setValidateEnabled = (enabled: boolean) => {
    const btn = document.getElementById("ids-validate-btn") as any;
    if (btn) btn.disabled = !enabled;
  };

  const updateResultsDisplay = () => {
    if (!currentReport) return;
    const summaryContainer = document.getElementById("ids-summary");
    if (!summaryContainer) return;

    summaryContainer.innerHTML = "";
    const summaryDiv = document.createElement("div");
    summaryDiv.style.cssText =
      "display: flex; flex-direction: column; gap: 0.45rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 4px;";

    const s = currentReport.summary;
    const fileHint = s.idsFileName ? ` · ${s.idsFileName}` : "";
    const modelHint = s.modelName ? ` · Model: ${s.modelName}` : "";

    const title = document.createElement("div");
    title.style.cssText = "font-size: 0.8rem; font-weight: 600; margin-bottom: 0.15rem;";
    title.textContent = "Validation summary";
    summaryDiv.appendChild(title);

    const meta = document.createElement("p");
    meta.style.cssText =
      "font-size: 0.72rem; color: rgba(255,255,255,0.55); margin: 0 0 0.35rem 0; line-height: 1.3;";
    meta.textContent = `${s.specCount ?? 0} IDS rule(s)${fileHint}${modelHint}`;
    summaryDiv.appendChild(meta);

    const addRow = (label: string, value: string, color?: string) => {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; justify-content: space-between; font-size: 0.85rem;";
      if (color) row.style.color = color;
      row.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
      summaryDiv.appendChild(row);
    };

    addRow("Elements checked", String(s.total ?? 0));
    addRow("Passed", String(s.passed ?? 0), "#4caf50");
    addRow("Failed", String(s.failed ?? 0), "#f44336");
    const rateColor =
      (s.passRate ?? 0) >= 80 ? "#4caf50" : (s.passRate ?? 0) >= 50 ? "#ff9800" : "#f44336";
    addRow("Pass rate", `${(s.passRate ?? 0).toFixed(1)}%`, rateColor);

    const hint = document.createElement("p");
    hint.style.cssText =
      "font-size: 0.7rem; color: rgba(255,255,255,0.5); margin: 0.5rem 0 0 0; line-height: 1.3; border-left: 3px solid #64b5f6; padding-left: 0.5rem;";
    hint.textContent =
      s.failed > 0
        ? "Open the BCF panel to review failed elements, highlight them in the viewer, and download Excel / BCF."
        : "All checked elements passed.";
    summaryDiv.appendChild(hint);

    summaryContainer.appendChild(summaryDiv);
  };

  const loadIDSFromText = async (xml: string, fileName: string): Promise<boolean> => {
    const officialIds = components.get(OBC.IDSSpecifications);
    clearIDSList(officialIds);

    let loaded: OBC.IDSSpecification[] = [];
    try {
      loaded = officialIds.load(xml);
    } catch (e) {
      console.error("[IDSPanel] OBC.IDSSpecifications.load() failed:", e);
      alert(`Could not parse IDS file: ${e instanceof Error ? e.message : "Unknown error"}`);
      return false;
    }

    if (!loaded.length && officialIds.list.size === 0) {
      alert("No specifications found in this IDS file.");
      return false;
    }

    try {
      specsSummary = parseIDSSpecList(xml);
    } catch {
      specsSummary = [];
    }

    if (specsSummary.length === 0 && officialIds.list.size > 0) {
      let i = 0;
      for (const [, spec] of officialIds.list) {
        i += 1;
        specsSummary.push({
          index: i,
          name: spec.name || "",
          description: spec.description || "",
        });
      }
    }

    loadedXml = xml;
    loadedFileName = fileName;
    currentReport = null;
    currentResults = null;
    updateSpecsDisplay();
    setValidateEnabled(true);

    const summaryContainer = document.getElementById("ids-summary");
    if (summaryContainer) {
      summaryContainer.innerHTML = `<div style="padding: 0.75rem; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.8rem;">IDS loaded (${escapeHtml(String(specsSummary.length))} rules). Click Validate for a pass/fail summary.</div>`;
    }

    console.log("[IDSPanel] Loaded", officialIds.list.size, "spec(s) from", fileName);
    return true;
  };

  const onIDSFileSelected = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const xml = await file.text();
      await loadIDSFromText(xml, file.name);
    } catch (err) {
      console.error("[IDSPanel] Error reading IDS file:", err);
      alert(`Error reading file: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      input.value = "";
    }
  };

  const openFilePicker = () => {
    document.getElementById("ids-file-input")?.click();
  };

  const runValidation = async () => {
    if (isRunning) return;
    if (!loadedXml || specsSummary.length === 0) {
      alert("Load an IDS file first.");
      return;
    }

    isRunning = true;
    const validateBtn = document.getElementById("ids-validate-btn");
    if (validateBtn) {
      (validateBtn as any).disabled = true;
      (validateBtn as any).label = "Validating…";
    }

    try {
      const modelsEntries = Array.from(fragments.list.entries());
      if (modelsEntries.length === 0) {
        alert("No IFC models loaded. Please load a model first.");
        return;
      }

      const officialIds = components.get(OBC.IDSSpecifications);
      if (officialIds.list.size === 0) {
        const ok = await loadIDSFromText(loadedXml, loadedFileName || "ids.xml");
        if (!ok) throw new Error("Could not load IDS specifications");
      }

      const [modelId, model] = modelsEntries[modelsEntries.length - 1] as [string, { name?: string }];
      const modelName = model.name || "Unknown";
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

      const { pass, fail } = officialIds.getModelIdMap(merged as any);
      const totalPass = Object.values(pass).reduce((s, set) => s + (set?.size ?? 0), 0);
      const totalFail = Object.values(fail).reduce((s, set) => s + (set?.size ?? 0), 0);
      const total = totalPass + totalFail;
      const passRate = total > 0 ? Math.round((totalPass / total) * 100) : 0;

      const failures: FailureRow[] = [];
      const fragModel = fragments.list.get(modelId);
      if (fragModel && typeof (fragModel as any).getItemsData === "function" && totalFail > 0) {
        const failedLocalIds: number[] = [];
        const failSet = fail[modelId];
        if (failSet) for (const id of failSet) failedLocalIds.push(id);
        if (failedLocalIds.length > 0) {
          const perModelFailed = failedBySpec.get(modelId);
          const pushFailure = (id: number, entityType: string, entityName: string) => {
            const specList = perModelFailed?.get(id) ?? [];
            failures.push({
              modelId,
              expressID: id,
              entityType,
              entityName,
              checks: specList.map((specName) => ({
                type: "spec",
                specName,
                details: `Failed specification: ${specName}`,
              })),
            });
          };
          try {
            const itemsData = await (fragModel as any).getItemsData(failedLocalIds, {
              attributesDefault: true,
            });
            const seenIds = new Set<number>();
            for (const item of itemsData || []) {
              const localId =
                (item as any)._localId?.value ?? (item as any).expressID ?? (item as any)._localId;
              const id = typeof localId === "number" ? localId : Number(localId);
              seenIds.add(id);
              const entityType = (item as any)._category?.value ?? (item as any).type ?? "Unknown";
              const entityName =
                (item as any).Name?.value ?? (item as any).Name ?? (item as any).name ?? "Unnamed";
              pushFailure(
                id,
                String(entityType).replace(/^IFC/, ""),
                String(entityName ?? "Unnamed")
              );
            }
            for (const id of failedLocalIds) {
              if (!seenIds.has(id)) pushFailure(id, "Element", "ID " + id);
            }
          } catch (e) {
            console.warn("[IDSPanel] Could not get item data for failure details:", e);
            for (const id of failedLocalIds) pushFailure(id, "Element", "ID " + id);
          }
        }
      }

      currentResults = { merged, pass, fail };
      currentReport = {
        summary: {
          total,
          passed: totalPass,
          failed: totalFail,
          passRate,
          specCount: officialIds.list.size,
          idsFileName: loadedFileName,
          modelName,
          modelId,
        },
        failModelIdMap: fail,
        failures,
        specifications: specsSummary,
      };

      try {
        sessionStorage.setItem(
          "ids-last-report",
          JSON.stringify({
            report: currentReport,
            results: currentResults,
            timestamp: new Date().toISOString(),
            modelName,
            idsFileName: loadedFileName,
          })
        );
      } catch (e) {
        console.warn("[IDSPanel] Could not save report to sessionStorage:", e);
      }

      updateResultsDisplay();
    } catch (error) {
      console.error("[IDSPanel] Error running validation:", error);
      alert(`Error running validation: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      isRunning = false;
      if (validateBtn) {
        (validateBtn as any).disabled = false;
        (validateBtn as any).label = "Validate";
      }
    }
  };

  const loadButton = BUI.Component.create<BUI.Button>(() => {
    return BUI.html`
      <bim-button
        id="ids-load-btn"
        label="Load IDS"
        icon="material-symbols:upload-file"
        @click=${openFilePicker}
        style="width: auto; min-width: 0; padding: 0.35rem 0.6rem; font-size: 0.8rem;"
      ></bim-button>
    `;
  });

  const validateButton = BUI.Component.create<BUI.Button>(() => {
    return BUI.html`
      <bim-button
        id="ids-validate-btn"
        label="Validate"
        icon="material-symbols:verified"
        @click=${runValidation}
        ?disabled=${true}
        style="width: auto; min-width: 0; padding: 0.35rem 0.6rem; font-size: 0.8rem;"
      ></bim-button>
    `;
  });

  const specsSection = BUI.Component.create(() => {
    return BUI.html`
      <div id="ids-specs-list" style="margin-bottom: 0.5rem;">
        <div style="padding: 0.75rem; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.8rem;">
          Load an IDS (.ids / .xml) file to see its rules.
        </div>
      </div>
    `;
  });

  const summarySection = BUI.Component.create(() => {
    return BUI.html`
      <div id="ids-summary" style="margin-bottom: 0.25rem;">
        <div style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.5); font-size: 0.8rem;">
          Load an IDS file, then validate for a brief pass/fail summary of the IFC model.
        </div>
      </div>
    `;
  });

  return BUI.html`
    <bim-panel-section
      data-element="ids"
      fixed
      label="IDS Validation"
      style="display: flex; flex-direction: column; overflow: hidden; min-height: 0; padding: 0.5rem; box-sizing: border-box;">
      <input
        id="ids-file-input"
        type="file"
        accept=".ids,.xml,application/xml,text/xml"
        style="display: none;"
        @change=${onIDSFileSelected}
      />
      <div style="display: flex; flex-direction: column; gap: 0.5rem; overflow: hidden; min-width: 0; flex: 1 1 auto; min-height: 0;">
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;">
          ${loadButton}
          ${validateButton}
        </div>
        <div style="flex-shrink: 1; min-height: 0; padding-top: 0.25rem;">
          <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 0.35rem;">Rules</div>
          ${specsSection}
        </div>
        <div style="flex-shrink: 0; padding-top: 0.5rem; border-top: 1px solid var(--bim-ui_bg-contrast-20, rgba(255,255,255,0.1));">
          ${summarySection}
        </div>
      </div>
    </bim-panel-section>
  `;
};
