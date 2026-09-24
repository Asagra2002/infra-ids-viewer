import * as OBC from "@thatopen/components"
import * as THREE from "three"
import { FragmentsGroup } from "@thatopen/fragments"

export class ZoomExtendUtil {
  private world?: OBC.World;

  constructor(private components: OBC.Components) {
    // Get the world instance
    const worlds = components.get(OBC.Worlds);
    if (worlds && worlds.list.size > 0) {
      this.world = worlds.list.values().next().value;
    }
  }

  private async detectSourceSoftware(model: FragmentsGroup): Promise<'ArchiCAD' | 'Revit' | 'Unknown'> {
    try {
      const firstFragment = model.items[0];
      if (!firstFragment) return 'Unknown';

      const firstId = Array.from(firstFragment.ids)[0];
      if (!firstId) return 'Unknown';

      const project = await model.getProperties(firstId);
      const application = project?.OwnerHistory?.OwningApplication;
      
      if (application) {
        const appInfo = await model.getProperties(application.value);
        const applicationName = appInfo?.ApplicationFullName?.value || '';
        
        if (applicationName.toLowerCase().includes('archicad')) return 'ArchiCAD';
        if (applicationName.toLowerCase().includes('revit')) return 'Revit';
      }
    } catch (error) {
      console.warn('[Zoom] Error detecting source software:', error);
    }

    return 'Unknown';
  }

  async zoomToModel(fragmentModel: FragmentsGroup) {
    if (!fragmentModel) {
      console.warn('[Zoom] No fragment model provided');
      return;
    }
    
    if (!this.world) {
      console.warn('[Zoom] World not found');
      return;
    }

    const camera = this.world.camera;
    if (!camera) {
      console.warn('[Zoom] Camera not found in world');
      return;
    }

    if (!camera.controls) {
      console.warn('[Zoom] Camera controls not found');
      return;
    }
    
    // Create a bounding box that contains all fragments
    const bbox = new THREE.Box3();
    let fragmentCount = 0;
    let maxCoord = 0;
    
    // Calculate the bounding box and find the maximum coordinate
    for (const fragment of fragmentModel.items) {
      if (!fragment.mesh) {
        console.warn('[Zoom] Fragment without mesh found');
        continue;
      }
      
      if (fragment.mesh.geometry.boundingBox === null) {
        fragment.mesh.geometry.computeBoundingBox();
      }
      
      if (fragment.mesh.geometry.boundingBox) {
        const box = fragment.mesh.geometry.boundingBox;
        bbox.union(box);
        fragmentCount++;
        
        maxCoord = Math.max(
          maxCoord,
          Math.abs(box.min.x), Math.abs(box.min.y), Math.abs(box.min.z),
          Math.abs(box.max.x), Math.abs(box.max.y), Math.abs(box.max.z)
        );
      }
    }

    if (bbox.isEmpty()) {
      console.warn('[Zoom] Bounding box is empty, cannot zoom');
      return;
    }
    
    // Determine if we need to scale based on the maximum coordinate
    let scaleFactor = 1;
    if (maxCoord > 1000) { // Likely in millimeters
      scaleFactor = 0.001;
    } else if (maxCoord > 100) { // Likely in centimeters
      scaleFactor = 0.01;
    }
    
    // Apply scale factor to bounding box
    bbox.min.multiplyScalar(scaleFactor);
    bbox.max.multiplyScalar(scaleFactor);
    
    // Calculate center
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    // Calculate the diagonal of the bounding box
    const diagonal = new THREE.Vector3();
    bbox.getSize(diagonal);
    const diagonalLength = diagonal.length();
    
    // Calculate distance based on diagonal length
    const distance = diagonalLength * 1.5; // Use a fixed factor for consistency
    
    // Get current camera position and target
    const currentPosition = new THREE.Vector3();
    const currentTarget = new THREE.Vector3();
    camera.controls.getPosition(currentPosition);
    camera.controls.getTarget(currentTarget);
    
    // Calculate view direction and maintain it
    const direction = new THREE.Vector3()
      .subVectors(currentPosition, currentTarget)
      .normalize();
    
    // Calculate new camera position
    const position = center.clone().add(direction.multiplyScalar(distance));
    
    try {
      // Set new camera position while maintaining view direction
      camera.controls.setLookAt(
        position.x, position.y, position.z,
        center.x, center.y, center.z,
        true // Animate
      );
    } catch (error) {
      console.error('[Zoom] Error updating camera position:', error);
    }
  }
} 