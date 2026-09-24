import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "../../ui-templates/components3";
import { viewportSettingsTemplate } from "../../ui-templates/components3/viewportSettings";

export const createWorld = (components: OBC.Components) => {
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<
    OBC.SimpleScene,
    OBC.OrthoPerspectiveCamera,
    OBF.PostproductionRenderer
  >();

  world.name = "Main";
  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();
  world.scene.three.background = new THREE.Color(0x1a1d23);

  const viewport = BUI.Component.create<BUI.Viewport>(() => {
    return BUI.html`<bim-viewport></bim-viewport>`;
  });

  world.renderer = new OBF.PostproductionRenderer(components, viewport);
  world.camera = new OBC.OrthoPerspectiveCamera(components);
  world.camera.threePersp.near = 0.01;
  world.camera.threePersp.updateProjectionMatrix();
  world.camera.controls.restThreshold = 0.05;

  const resizeWorld = () => {
    try {
      setTimeout(() => {
        world.renderer?.resize();
        world.camera.updateAspect();
      }, 10);
    } catch (error) {
      console.warn("Resizing the world was not possible:", error);
    }
  };

  viewport.addEventListener("resize", resizeWorld);

  // Setup post-production
  const { postproduction } = world.renderer;
  postproduction.enabled = true;
  postproduction.style = OBF.PostproductionAspect.COLOR_PEN_SHADOWS;

  const { aoPass, edgesPass } = world.renderer.postproduction;
  edgesPass.enabled = true;
  edgesPass.color = new THREE.Color(0x494b50);

  // Grid setup
  const worldGrid = components.get(OBC.Grids).create(world);
  worldGrid.material.uniforms.uColor.value = new THREE.Color(0x494b50);
  worldGrid.material.uniforms.uSize1.value = 2;
  worldGrid.material.uniforms.uSize2.value = 8;

  components.get(OBC.Raycasters).get(world);

  return { world, viewport, resizeWorld };
}
