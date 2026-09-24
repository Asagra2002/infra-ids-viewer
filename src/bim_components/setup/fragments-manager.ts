import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

export const setupFragmentsManager = (
  components: OBC.Components,
  world: OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>
) => {
  const fragments = components.get(OBC.FragmentsManager);
  fragments.init("/fragments-worker/worker.mjs");

  fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
    const isLod = "isLodMaterial" in material && material.isLodMaterial;
    if (isLod) {
      world.renderer!.postproduction.basePass.isolatedMaterials.push(material);
    }
  });

  fragments.list.onItemSet.add(async ({ value: model }) => {
    try {
      // Clear ItemsFinder cache for new model
      const finder = components.get(OBC.ItemsFinder);
      for (const [, query] of finder.list) {
        query.clearCache();
      }

      model.useCamera(world.camera.three);
      model.getClippingPlanesEvent = () => {
        return Array.from(world.renderer!.three.clippingPlanes) || [];
      };
      
      world.scene.three.add(model.object);
      await fragments.core.update(true);
    } catch (error) {
      console.error("Error setting up fragment model:", error);
    }
  });

  world.camera.projection.onChanged.add(() => {
    for (const [_, model] of fragments.list) {
      model.useCamera(world.camera.three);
    }
  });

  world.camera.controls.addEventListener("rest", () => {
    fragments.core.update(true);
  });

  return fragments;
}
