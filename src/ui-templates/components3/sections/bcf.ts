import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { BCFTool } from "../../../bim_components/BCF";
import type { Topic } from "@thatopen/components";

export interface BCFPanelState {
  components: OBC.Components;
}

const IDS_LAST_REPORT_KEY = "ids-last-report";

export const bcfPanelTemplate: BUI.StatefullComponent<BCFPanelState> = (state) => {
  const { components } = state;

  const getBCFTool = (): BCFTool | null => {
    let bcf = components.get(BCFTool);
    if (!bcf) {
      bcf = new BCFTool(components);
    }
    return bcf;
  };

  const getWorld = () => {
    const worlds = components.get(OBC.Worlds);
    const keys = Array.from(worlds.list.keys());
    return keys.length > 0 ? worlds.list.get(keys[0]) : null;
  };

  const refreshList = () => {
    const container = document.getElementById("bcf-cases-container");
    if (!container) return;
    const bcf = getBCFTool();
    if (!bcf) return;

    const categories = bcf.getCategories();
    container.innerHTML = "";

    if (categories.length === 0) {
      const empty = document.createElement("p");
      empty.style.cssText = "font-size: 0.85rem; color: rgba(255,255,255,0.5); margin: 0.5rem 0;";
      empty.textContent = "No BCF topics yet. Run RAVA 3.5 validation and click «Generate BCF from RAVA validation».";
      container.appendChild(empty);
      return;
    }

    for (const cat of categories) {
      const catTitle = document.createElement("div");
      catTitle.style.cssText = "font-weight: 600; font-size: 0.8rem; color: rgba(255,255,255,0.8); margin: 0.75rem 0 0.25rem 0;";
      catTitle.textContent = cat.name;
      container.appendChild(catTitle);

      for (const topic of cat.cases) {
        const card = document.createElement("div");
        card.style.cssText = `
          padding: 8px 10px; margin: 4px 0; background: rgba(255,255,255,0.06);
          border-radius: 4px; cursor: pointer; border-left: 4px solid #f44336;
          font-size: 0.8rem;
        `;
        card.dataset.categoryId = cat.id;
        card.dataset.caseId = topic.guid;
        card.innerHTML = `
          <div style="font-weight: 600;">${escapeHtml(topic.title)}</div>
          <div style="color: rgba(255,255,255,0.6); margin-top: 4px; max-height: 2.4em; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(topic.description || "")}</div>
        `;
        card.addEventListener("click", async () => {
          const tool = getBCFTool();
          if (!tool) return;
          await tool.highlightTopic(topic);
        });
        container.appendChild(card);
      }
    }
  };

  const onGenerateFromRAVA = async (e: Event) => {
    const btn = (e.target as HTMLElement).closest("bim-button") as any;
    if (btn) btn.loading = true;
    try {
      const raw = sessionStorage.getItem(IDS_LAST_REPORT_KEY);
      if (!raw) {
        alert("No RAVA validation result saved. Run «Validate RAVA» in the IDS Validation panel first.");
        return;
      }
      const data = JSON.parse(raw);
      const report = data?.report ?? data;
      if (!report?.failures?.length) {
        alert("The last RAVA report has no failures (or no 'failures' array). Run validation and ensure some elements fail.");
        return;
      }
      const bcf = getBCFTool();
      if (!bcf) throw new Error("BCF Tool not available.");
      await bcf.createTopicsFromRAVAValidationReport(report, "RAVA Validator");
      refreshList();
    } catch (err) {
      console.error("[BCFPanel] Error generating BCF from RAVA:", err);
      alert(`Error generating BCF: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      if (btn) btn.loading = false;
    }
  };

  const onDownload = async (e: Event) => {
    const btn = (e.target as HTMLElement).closest("bim-button") as any;
    if (btn) btn.loading = true;
    try {
      const bcf = getBCFTool();
      if (!bcf) throw new Error("BCF Tool not available.");
      const blob = await bcf.exportBCFFile();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rava-validation-export.bcfzip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[BCFPanel] Error exporting BCF:", err);
      alert(`Error downloading BCF: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      if (btn) btn.loading = false;
    }
  };

  return BUI.html`
    <bim-panel-section fixed icon="mdi:file-document-multiple-outline" label="BCF (RAVA 3.5)" data-element="bcf">
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <bim-button
          label="Generate BCF from RAVA validation"
          icon="mdi:lightning-bolt"
          @click=${onGenerateFromRAVA}
        ></bim-button>
        <bim-button
          label="Download BCF for BIM tools"
          icon="mdi:download"
          @click=${onDownload}
        ></bim-button>
      </div>
      <p style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin: 0.5rem 0 0 0;">
        Generate topics from IDS validation failures, view them here and download the .bcfzip to open in any BIM collaboration software (e.g. Archicad, Revit).
      </p>
      <div id="bcf-cases-container" style="margin-top: 0.75rem; max-height: 280px; overflow-y: auto;" ${BUI.ref(() => refreshList())}></div>
    </bim-panel-section>
  `;
};

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
