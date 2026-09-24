import * as OBC from "@thatopen/components";
import * as CUI from "@thatopen/ui-obc";

export type Orientation = "front" | "back" | "left" | "right" | "top" | "bottom";

const ORIENTATION_EVENTS: Record<Orientation, string> = {
  front: "frontclick",
  back: "backclick",
  left: "leftclick",
  right: "rightclick",
  top: "topclick",
  bottom: "bottomclick",
};

/**
 * Creates and configures a ViewCube with model-oriented camera views (via BoundingBoxer).
 * Returns the ViewCube element and a teardown function.
 */
export function createViewCubeWithModelOrientation(
  components: OBC.Components,
  world: OBC.World,
): { element: HTMLElement; teardown: () => void } {
  CUI.Manager.init();

  const viewCube = document.createElement("bim-view-cube") as any;
  viewCube.camera = world.camera.three;
  viewCube.style.position = "relative";
  viewCube.style.marginRight = "-25px";
  viewCube.style.marginTop = "10px";

  const viewFromOrientation = async (orientation: Orientation) => {
    if (!world?.camera) return;
    if (!(world.camera as any).hasCameraControls?.()) return;
    try {
      const boxer = components.get(OBC.BoundingBoxer);
      boxer.list.clear();
      boxer.addFromModels();
      const { position, target } = await boxer.getCameraOrientation(orientation);
      boxer.list.clear();
      await world.camera.controls.setLookAt(
        position.x,
        position.y,
        position.z,
        target.x,
        target.y,
        target.z,
        true,
      );
    } catch (e) {
      console.warn("[ViewCube] viewFromOrientation failed:", e);
    }
  };

  const handlers: Array<{ event: string; fn: () => void }> = [];
  for (const [orientation, eventName] of Object.entries(ORIENTATION_EVENTS)) {
    const handler = () => viewFromOrientation(orientation as Orientation);
    viewCube.addEventListener(eventName, handler);
    handlers.push({ event: eventName, fn: handler });
  }

  const onCameraUpdate = () => viewCube.updateOrientation?.();
  if (world.camera?.controls) {
    world.camera.controls.addEventListener("update", onCameraUpdate);
  }

  const teardown = () => {
    for (const { event, fn } of handlers) {
      viewCube.removeEventListener(event, fn);
    }
    if (world.camera?.controls) {
      world.camera.controls.removeEventListener("update", onCameraUpdate);
    }
  };

  return { element: viewCube, teardown };
}
