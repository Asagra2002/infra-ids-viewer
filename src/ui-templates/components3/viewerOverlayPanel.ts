import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import {
  getViewerSelection,
  setViewerSelection,
} from "./visualizationToolbar";
import { getLastClipperHit, setLastClipperHit } from "./clipperToolbar";

export interface ViewerOverlayPanelState {
  components: OBC.Components;
}

const OVERLAY_STYLE = `
  background: rgba(32, 33, 36, 0.9);
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
`;

const BTN_STYLE =
  "width: 18px; height: 18px; padding: 0; min-width: 18px; min-height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;";

export const viewerOverlayPanelTemplate: BUI.StatefullComponent<ViewerOverlayPanelState> = (
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
      console.warn("[ViewerOverlay] Fit all failed", e);
    }
  };

  const showAll = async () => {
    try {
      const hider = components.get(OBC.Hider);
      await hider.set(true);
      (window as any).__viewerIsolatedMode = false;
    } catch (e) {
      console.warn("[ViewerOverlay] Show all failed", e);
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
        console.warn("[ViewerOverlay] Isolate failed", e);
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
      console.warn("[ViewerOverlay] Toggle visibility failed", e);
    }
  };

  const zoomToSelection = async () => {
    const sel = getViewerSelection();
    const world = getWorld();
    if (!world?.camera || !sel) return;
    try {
      await (world.camera as OBC.SimpleCamera).fitToItems(sel);
    } catch (e) {
      console.warn("[ViewerOverlay] Zoom to selection failed", e);
    }
  };

  const createClipper = () => {
    const world = getWorld();
    if (!world) return;
    const hit = getLastClipperHit();
    if (!hit) return;
    try {
      const clipper = components.get(OBC.Clipper);
      const normal = hit.normal.clone().negate().normalize();
      clipper.createFromNormalAndCoplanarPoint(world, normal, hit.point.clone());
      setLastClipperHit(null);
    } catch (e) {
      console.warn("[ViewerOverlay] Create clipper failed:", e);
    }
  };

  const toggleAllClippers = () => {
    const clipper = components.get(OBC.Clipper);
    for (const [, plane] of clipper.list) {
      plane.enabled = !plane.enabled;
    }
  };

  const deleteAllClippers = () => {
    const clipper = components.get(OBC.Clipper);
    clipper.deleteAll();
  };

  return BUI.html`
    <div
      class="viewer-overlay-buttons"
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        ${OVERLAY_STYLE}
      "
    >
        <bim-button
          @click=${fitAll}
          icon="material-symbols:fit-screen"
          tooltip-title="Fit all"
          tooltip-text="Zoom camera to fit the entire model."
          tooltip-position="left"
          style="${BTN_STYLE}"
        ></bim-button>
        <bim-button
          @click=${toggleIsolateShowAll}
          icon="material-symbols:filter-center-focus"
          tooltip-title="Isolate / Show all"
          tooltip-text="Isolate selection or show all elements."
          tooltip-position="left"
          style="${BTN_STYLE}"
        ></bim-button>
        <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.15); margin: 2px 0;"></div>
        <bim-button
          @click=${zoomToSelection}
          icon="material-symbols:center-focus-strong"
          tooltip-title="Zoom to selection"
          tooltip-text="Fit camera to the selected element(s)."
          tooltip-position="left"
          style="${BTN_STYLE}"
        ></bim-button>
        <bim-button
          @click=${toggleSelectionVisibility}
          icon="material-symbols:visibility"
          tooltip-title="Toggle selection"
          tooltip-text="Hide or show the selected element(s)."
          tooltip-position="left"
          style="${BTN_STYLE}"
        ></bim-button>
        <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.15); margin: 2px 0;"></div>
        <bim-button
          @click=${createClipper}
          icon="tabler:cut"
          tooltip-title="Create Clipper"
          tooltip-text="Click on a model face, then click here to create a clipping plane."
          tooltip-position="left"
          style="${BTN_STYLE}"
        ></bim-button>
        <bim-button
          @click=${toggleAllClippers}
          icon="material-symbols:visibility"
          tooltip-title="Toggle All Clippers"
          tooltip-text="Show or hide all clipping planes."
          tooltip-position="left"
          style="${BTN_STYLE}"
        ></bim-button>
        <bim-button
          @click=${deleteAllClippers}
          icon="material-symbols:delete-sweep"
          tooltip-title="Delete All Clippers"
          tooltip-text="Remove all clipping planes."
          tooltip-position="left"
          style="${BTN_STYLE}"
        ></bim-button>
    </div>
  `;
};
