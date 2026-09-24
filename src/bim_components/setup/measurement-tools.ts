import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

export const setupMeasurementTools = (
  components: OBC.Components,
  world: OBC.SimpleWorld<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>,
  viewport: any
) => {
  // Length Measurement Setup
  const lengthMeasurer = components.get(OBF.LengthMeasurement);
  lengthMeasurer.world = world;
  lengthMeasurer.color = new THREE.Color("#6528d7");

  lengthMeasurer.list.onItemAdded.add((line) => {
    try {
      const center = new THREE.Vector3();
      line.getCenter(center);
      const radius = line.distance() / 3;
      const sphere = new THREE.Sphere(center, radius);
      world.camera.controls.fitToSphere(sphere, true);
    } catch (error) {
      console.warn("Error handling length measurement:", error);
    }
  });

  viewport.addEventListener("dblclick", () => lengthMeasurer.create());

  // Area Measurement Setup
  const areaMeasurer = components.get(OBF.AreaMeasurement);
  areaMeasurer.world = world;
  areaMeasurer.color = new THREE.Color("#6528d7");

  areaMeasurer.list.onItemAdded.add((area) => {
    try {
      if (!area.boundingBox) return;
      const sphere = new THREE.Sphere();
      area.boundingBox.getBoundingSphere(sphere);
      world.camera.controls.fitToSphere(sphere, true);
    } catch (error) {
      console.warn("Error handling area measurement:", error);
    }
  });

  viewport.addEventListener("dblclick", () => {
    areaMeasurer.create();
  });

  // Global event listeners for measurements
  window.addEventListener("keydown", (event) => {
    if (event.code === "Delete" || event.code === "Backspace") {
      lengthMeasurer.delete();
      areaMeasurer.delete();
    }
    if (event.code === "Enter" || event.code === "NumpadEnter") {
      areaMeasurer.endCreation();
    }
  });

  return { lengthMeasurer, areaMeasurer };
}
