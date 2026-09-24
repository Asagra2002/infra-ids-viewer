import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as XLSX from "xlsx";
import { BCFTool } from "../../../bim_components/BCF";

export interface BCFPanelState {
  components: OBC.Components;
}

const IDS_LAST_REPORT_KEY = "ids-last-report";

type FailureRow = {
  modelId?: string;
  expressID: number;
  entityType?: string;
  entityName?: string;
  checks?: Array<{ specName?: string; details?: string }>;
};

export const bcfPanelTemplate: BUI.StatefullComponent<BCFPanelState> = (state) => {
  const { components } = state;

  let lastReport: any = null;
  let lastMeta: { modelName?: string; idsFileName?: string; timestamp?: string } = {};

  const getBCFTool = (): BCFTool | null => {
    let bcf = components.get(BCFTool);
    if (!bcf) bcf = new BCFTool(components);
    return bcf;
  };

  const readStoredReport = (): { report: any; meta: typeof lastMeta } | null => {
    try {
      const raw = sessionStorage.getItem(IDS_LAST_REPORT_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const report = data?.report ?? data;
      return {
        report,
        meta: {
          modelName: data?.modelName ?? report?.summary?.modelName,
          idsFileName: data?.idsFileName ?? report?.summary?.idsFileName,
          timestamp: data?.timestamp,
        },
      };
    } catch {
      return null;
    }
  };

  const refreshTable = () => {
    const container = document.getElementById("bcf-failures-table");
    const statusEl = document.getElementById("bcf-status-line");
    if (!container) return;

    const stored = readStoredReport();
    container.innerHTML = "";

    if (!stored?.report) {
      lastReport = null;
      if (statusEl) {
        statusEl.textContent = "No IDS validation result yet. Run Validate in the IDS panel first.";
      }
      const empty = document.createElement("p");
      empty.style.cssText = "font-size: 12px; color: rgba(255,255,255,0.5); margin: 0.5rem 0;";
      empty.textContent = "No failures to show.";
      container.appendChild(empty);
      return;
    }

    lastReport = stored.report;
    lastMeta = stored.meta;
    const failures: FailureRow[] = Array.isArray(stored.report.failures) ? stored.report.failures : [];
    const s = stored.report.summary ?? {};

    if (statusEl) {
      const parts = [
        failures.length === 0 ? "No failures" : `${failures.length} failed element(s)`,
        s.passRate != null ? `pass rate ${s.passRate}%` : null,
        lastMeta.modelName ? `model ${lastMeta.modelName}` : null,
        lastMeta.idsFileName ? lastMeta.idsFileName : null,
      ].filter(Boolean);
      statusEl.textContent = parts.join(" · ");
    }

    if (failures.length === 0) {
      const ok = document.createElement("p");
      ok.style.cssText = "font-size: 12px; color: #4caf50; margin: 0.5rem 0;";
      ok.textContent = "Last validation had no failures.";
      container.appendChild(ok);
      return;
    }

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "overflow-x: auto; max-height: 260px; overflow-y: auto; font-size: 12px; line-height: 1.3; color: var(--bim-text-color, rgba(255,255,255,0.85));";

    const table = document.createElement("table");
    table.style.cssText =
      "width: 100%; border-collapse: collapse; font-size: 12px; font-family: inherit; table-layout: fixed;";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr style="text-align: left; color: var(--bim-text-color, #999); border-bottom: 1px solid rgba(255,255,255,0.15);">
        <th style="padding: 6px 8px; width: 18%; font-size: 12px; font-weight: normal; font-family: inherit;">Type</th>
        <th style="padding: 6px 8px; width: 22%; font-size: 12px; font-weight: normal; font-family: inherit;">Name</th>
        <th style="padding: 6px 8px; width: 12%; font-size: 12px; font-weight: normal; font-family: inherit;">ID</th>
        <th style="padding: 6px 8px; width: 48%; font-size: 12px; font-weight: normal; font-family: inherit;">Failed specs</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    failures.forEach((failure, idx) => {
      const specs = (failure.checks ?? [])
        .map((c) => c.specName || c.details || "")
        .filter(Boolean)
        .join(", ");
      const tr = document.createElement("tr");
      tr.style.cssText =
        "cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.06); border-left: 3px solid transparent;";
      tr.title = "Click to highlight element in viewer";
      tr.innerHTML = `
        <td style="padding: 6px 8px; vertical-align: top; word-break: break-word; font-size: 12px; font-family: inherit; color: var(--bim-text-color, #999);">${escapeHtml(failure.entityType || "Element")}</td>
        <td style="padding: 6px 8px; vertical-align: top; word-break: break-word; font-size: 12px; font-family: inherit; color: var(--bim-text-color, #999);">${escapeHtml(failure.entityName || "Unnamed")}</td>
        <td style="padding: 6px 8px; vertical-align: top; font-size: 12px; font-family: inherit; color: var(--bim-text-color, #999);">${escapeHtml(String(failure.expressID))}</td>
        <td style="padding: 6px 8px; vertical-align: top; word-break: break-word; font-size: 12px; font-family: inherit; color: var(--bim-text-color, #999); opacity: 0.85;">${escapeHtml(specs || "—")}</td>`;

      tr.addEventListener("mouseenter", () => {
        tr.style.background = "rgba(255,255,255,0.06)";
      });
      tr.addEventListener("mouseleave", () => {
        if (tr.dataset.active !== "1") tr.style.background = "transparent";
      });
      tr.addEventListener("click", async () => {
        for (const row of Array.from(tbody.querySelectorAll("tr"))) {
          (row as HTMLElement).dataset.active = "";
          (row as HTMLElement).style.background = "transparent";
          (row as HTMLElement).style.borderLeftColor = "transparent";
        }
        tr.dataset.active = "1";
        tr.style.background = "rgba(244,67,54,0.12)";
        tr.style.borderLeftColor = "#f44336";

        const tool = getBCFTool();
        if (!tool) return;
        const modelId =
          failure.modelId ||
          stored.report.summary?.modelId ||
          Array.from(components.get(OBC.FragmentsManager).list.keys())[0];
        if (!modelId) {
          alert("No model id available for highlighting.");
          return;
        }
        try {
          await tool.highlightElement(modelId, failure.expressID);
        } catch (e) {
          console.warn("[BCFPanel] highlightElement:", e);
        }
      });
      tbody.appendChild(tr);
      void idx;
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  };

  const onRefresh = () => {
    refreshTable();
  };

  const onDownloadExcel = (e: Event) => {
    const btn = (e.target as HTMLElement).closest("bim-button") as any;
    if (btn) btn.loading = true;
    try {
      const stored = readStoredReport();
      if (!stored?.report) {
        alert("No IDS validation result. Run Validate in the IDS panel first.");
        return;
      }
      const failures: FailureRow[] = stored.report.failures ?? [];
      const s = stored.report.summary ?? {};
      const wb = XLSX.utils.book_new();
      const summaryRows = [
        ["IDS validation report"],
        ["Model", stored.meta.modelName ?? s.modelName ?? ""],
        ["IDS file", stored.meta.idsFileName ?? s.idsFileName ?? ""],
        ["Date", stored.meta.timestamp ? new Date(stored.meta.timestamp).toLocaleString() : ""],
        [],
        ["Total elements", s.total ?? ""],
        ["Passed", s.passed ?? ""],
        ["Failed", s.failed ?? ""],
        ["Pass rate %", s.passRate ?? ""],
        ["Specs / rules", s.specCount ?? ""],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

      const failRows = [
        ["Type", "Name", "Express ID", "Model ID", "Failed specifications"],
        ...failures.map((f) => [
          f.entityType ?? "",
          f.entityName ?? "",
          f.expressID,
          f.modelId ?? "",
          (f.checks ?? []).map((c) => c.specName || c.details || "").filter(Boolean).join("; "),
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(failRows), "Failures");

      const stamp = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `ids-validation-${stamp}.xlsx`);
    } catch (err) {
      console.error("[BCFPanel] Excel export:", err);
      alert(`Error exporting Excel: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      if (btn) btn.loading = false;
    }
  };

  const onDownloadBCF = async (e: Event) => {
    const btn = (e.target as HTMLElement).closest("bim-button") as any;
    if (btn) btn.loading = true;
    try {
      const stored = readStoredReport();
      if (!stored?.report?.failures?.length) {
        alert("No failures to export as BCF. Run IDS validation with failing elements first.");
        return;
      }
      const bcf = getBCFTool();
      if (!bcf) throw new Error("BCF Tool not available.");
      await bcf.createTopicsFromValidationReport(stored.report, "IDS Validator");
      const blob = await bcf.exportBCFFile();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ids-validation-export.bcfzip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[BCFPanel] BCF export:", err);
      alert(`Error downloading BCF: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      if (btn) btn.loading = false;
    }
  };

  return BUI.html`
    <bim-panel-section
      fixed
      icon="mdi:file-document-multiple-outline"
      label="BCF"
      data-element="bcf"
      style="display: flex; flex-direction: column; overflow: hidden; min-height: 0; padding: 0.5rem; box-sizing: border-box;">
      <div style="display: flex; flex-direction: column; gap: 0.5rem; min-height: 0; flex: 1 1 auto;">
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
          <bim-button
            label="Refresh"
            icon="material-symbols:refresh"
            @click=${onRefresh}
            style="width: auto; padding: 0.3rem 0.5rem; font-size: 0.75rem;"
          ></bim-button>
          <bim-button
            label="Excel"
            icon="material-symbols:table-chart"
            @click=${onDownloadExcel}
            style="width: auto; padding: 0.3rem 0.5rem; font-size: 0.75rem;"
          ></bim-button>
          <bim-button
            label="Download BCF"
            icon="mdi:download"
            @click=${onDownloadBCF}
            style="width: auto; padding: 0.3rem 0.5rem; font-size: 0.75rem;"
          ></bim-button>
        </div>
        <p id="bcf-status-line" style="font-size: 12px; color: rgba(255,255,255,0.55); margin: 0; line-height: 1.3;"></p>
        <p style="font-size: 12px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.3;">
          Click a row to highlight the related element in the viewer. Download Excel or BCF for the full failure report.
        </p>
        <div id="bcf-failures-table" style="flex: 1 1 auto; min-height: 0;" ${BUI.ref(() => refreshTable())}></div>
      </div>
    </bim-panel-section>
  `;
};

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
