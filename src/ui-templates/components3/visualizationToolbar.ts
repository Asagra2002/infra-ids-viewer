import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";

export interface VisualizationToolbarState {
  components: OBC.Components;
}

/** Global selection updated by viewport click (IntegratedViewer). ModelIdMap or null. */
export function getViewerSelection(): OBC.ModelIdMap | null {
  return (window as any).__viewerSelectionModelIdMap ?? null;
}

export function setViewerSelection(map: OBC.ModelIdMap | null) {
  (window as any).__viewerSelectionModelIdMap = map ?? null;
}

export const visualizationToolbarTemplate: BUI.StatefullComponent<VisualizationToolbarState> = (
  state,
) => {
  const { components } = state;

  const getWorld = (): OBC.World | null => {
    try {
      const worlds = components.get(OBC.Worlds);
      const list = (worlds as any).list as Map<string, OBC.World>;
      if (!list?.size) return null;
      return list.values().next().value ?? null;
    } catch {
      return null;
    }
  };

  const fitAll = async () => {
    const world = getWorld();
    if (!world?.camera) return;
    try {
      await (world.camera as OBC.SimpleCamera).fitToItems();
    } catch (e) {
      console.warn("[VizToolbar] Fit all failed", e);
    }
  };

  const showAll = async () => {
    try {
      const hider = components.get(OBC.Hider);
      await hider.set(true);
      (window as any).__viewerIsolatedMode = false;
    } catch (e) {
      console.warn("[VizToolbar] Show all failed", e);
    }
  };

  const toggleIsolateShowAll = async () => {
    const isolated = (window as any).__viewerIsolatedMode;
    if (isolated) {
      await showAll();
    } else {
      const sel = getViewerSelection();
      if (!sel) return;
      try {
        const hider = components.get(OBC.Hider);
        await hider.isolate(sel);
        (window as any).__viewerIsolatedMode = true;
      } catch (e) {
        console.warn("[VizToolbar] Isolate failed", e);
      }
    }
  };

  const toggleSelectionVisibility = async () => {
    const sel = getViewerSelection();
    if (!sel) return;
    try {
      const hider = components.get(OBC.Hider);
      await hider.toggle(sel);
    } catch (e) {
      console.warn("[VizToolbar] Toggle selection visibility failed", e);
    }
  };

  const zoomToSelection = async () => {
    const sel = getViewerSelection();
    const world = getWorld();
    if (!world?.camera || !sel) return;
    try {
      await (world.camera as OBC.SimpleCamera).fitToItems(sel);
    } catch (e) {
      console.warn("[VizToolbar] Zoom to selection failed", e);
    }
  };

  const btnStyle = "width: 18px; height: 18px; padding: 0; min-width: 18px; min-height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;";

  return BUI.html`
    <div
      class="visualization-toolbar"
      style="
        position: absolute;
        bottom: 16px;
        left: 16px;
        z-index: 1000;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        background: rgba(32, 33, 36, 0.9);
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      "
    >
      <bim-button
        @click=${fitAll}
        icon="material-symbols:fit-screen"
        tooltip-title="Fit all"
        tooltip-text="Zoom camera to fit the entire model."
        tooltip-position="right"
        style="${btnStyle}"
      ></bim-button>
      <bim-button
        @click=${toggleIsolateShowAll}
        icon="material-symbols:filter-center-focus"
        tooltip-title="Isolate / Show all"
        tooltip-text="Isolate selection or show all elements."
        tooltip-position="right"
        style="${btnStyle}"
      ></bim-button>
      <bim-button
        @click=${zoomToSelection}
        icon="material-symbols:center-focus-strong"
        tooltip-title="Zoom to selection"
        tooltip-text="Fit camera to the selected element(s)."
        tooltip-position="right"
        style="${btnStyle}"
      ></bim-button>
      <bim-button
        @click=${toggleSelectionVisibility}
        icon="material-symbols:visibility"
        tooltip-title="Toggle selection"
        tooltip-text="Hide or show the selected element(s)."
        tooltip-position="right"
        style="${btnStyle}"
      ></bim-button>
    </div>
  `;
};
