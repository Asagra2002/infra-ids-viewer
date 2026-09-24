import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as THREE from "three";

export interface ClipperToolbarState {
  components: OBC.Components;
}

export interface ClipperHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

/** Last raycast hit for clipper creation (set on viewport click). */
export function getLastClipperHit(): ClipperHit | null {
  return (window as any).__lastClipperHit ?? null;
}

export function setLastClipperHit(hit: ClipperHit | null) {
  (window as any).__lastClipperHit = hit ?? null;
}

export const clipperToolbarTemplate: BUI.StatefullComponent<ClipperToolbarState> = (
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
      console.warn("[ClipperToolbar] Create failed:", e);
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

  const btnStyle =
    "width: 18px; height: 18px; padding: 0; min-width: 18px; min-height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;";

  return BUI.html`
    <div
      class="clipper-toolbar"
      style="
        position: absolute;
        bottom: 16px;
        right: 16px;
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
        @click=${createClipper}
        icon="tabler:cut"
        tooltip-title="Create Clipper"
        tooltip-text="Click on a model face, then click here to create a clipping plane at that face."
        tooltip-position="left"
        style="${btnStyle}"
      ></bim-button>
      <bim-button
        @click=${toggleAllClippers}
        icon="material-symbols:visibility"
        tooltip-title="Toggle All"
        tooltip-text="Show or hide all clipping planes."
        tooltip-position="left"
        style="${btnStyle}"
      ></bim-button>
      <bim-button
        @click=${deleteAllClippers}
        icon="material-symbols:delete-sweep"
        tooltip-title="Delete All"
        tooltip-text="Remove all clipping planes."
        tooltip-position="left"
        style="${btnStyle}"
      ></bim-button>
    </div>
  `;
};
