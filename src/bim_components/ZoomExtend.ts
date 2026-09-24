import * as OBC from "@thatopen/components";
import { FragmentsGroup } from "@thatopen/fragments";
import * as THREE from "three";

export class ZoomExtendUtil extends OBC.Component {
  enabled = true;
  isDisposeable = false;
  isResizeable = false;
  isUpdateable = false;

  constructor(components: OBC.Components) {
    super(components);
  }

  async zoomToModel(model: FragmentsGroup) {
    const worlds = this.components.get(OBC.Worlds);
    const world = Object.values(worlds.list)[0];
    if (!world) return;

    const camera = world.camera;
    if (!camera) return;

    const box = new THREE.Box3();
    for (const fragment of model.items) {
      if (fragment.mesh) {
        fragment.mesh.geometry.computeBoundingBox();
        box.expandByObject(fragment.mesh);
      }
    }

    const center = box.getCenter(camera.position.clone());
    const size = box.getSize(camera.position.clone());
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan((Math.PI * camera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance);

    camera.controls.setLookAt(
      center.x + distance,
      center.y + distance,
      center.z + distance,
      center.x,
      center.y,
      center.z
    );
  }

  get(): void {
    // Not needed for this utility
  }

  dispose(): void {
    // Not needed for this utility
  }
} 