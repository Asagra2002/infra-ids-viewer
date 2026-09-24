import * as React from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import { PostproductionAspect } from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import { FragmentsModel } from "@thatopen/fragments";

interface Props {
  components: OBC.Components;
  isExpanded?: boolean;
  ifcFilePath?: string;
}

export function IFCViewer(props: Props) {
  const components: OBC.Components = props.components;
  const worldRef = React.useRef<OBC.World>();
  const fragmentModelRef = React.useRef<FragmentsModel>();
  
  const setViewer = () => {
    const worlds = components.get(OBC.Worlds);
    
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.OrthoPerspectiveCamera,
      OBF.PostproductionRenderer
    >();
    worldRef.current = world;

    // Setup scene
    const sceneComponent = new OBC.SimpleScene(components);
    world.scene = sceneComponent;
    world.scene.setup();
    world.scene.three.background = new THREE.Color(0x1a1d23);

    // Setup viewport
    const viewerContainer = document.getElementById("viewer-container") as HTMLElement;
    if (!viewerContainer) return;

    const viewport = BUI.Component.create<BUI.Viewport>(() => {
      return BUI.html`<bim-viewport></bim-viewport>`;
    });

    // Setup renderer
    world.renderer = new OBF.PostproductionRenderer(components, viewport);
    world.camera = new OBC.OrthoPerspectiveCamera(components);
    world.camera.threePersp.near = 0.01;
    world.camera.threePersp.updateProjectionMatrix();
    world.camera.controls.restThreshold = 0.05;

    // Setup grid
    const worldGrid = components.get(OBC.Grids).create(world);
    worldGrid.material.uniforms.uColor.value = new THREE.Color(0x494b50);
    worldGrid.material.uniforms.uSize1.value = 2;
    worldGrid.material.uniforms.uSize2.value = 8;

    // Setup resize handler
    const resizeWorld = () => {
      world.renderer?.resize();
      world.camera.updateAspect();
    };
    viewport.addEventListener("resize", resizeWorld);

    world.dynamicAnchor = false;
    components.init();

    // Setup raycasters
    components.get(OBC.Raycasters).get(world);

    // Setup postproduction
    const { postproduction } = world.renderer;
    postproduction.enabled = true;
    postproduction.style = PostproductionAspect.COLOR_PEN_SHADOWS;

    const { aoPass, edgesPass } = world.renderer.postproduction;
    edgesPass.enabled = true;
    edgesPass.color = new THREE.Color(0x494b50);

    const aoParameters = {
      radius: 0.25,
      distanceExponent: 1,
      thickness: 1,
      scale: 1,
      samples: 16,
      distanceFallOff: 1,
      screenSpaceRadius: true,
    };

    const pdParameters = {
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 4,
      radiusExponent: 1,
      rings: 2,
      samples: 16,
    };

    aoPass.updateGtaoMaterial(aoParameters);
    aoPass.updatePdMaterial(pdParameters);

    // Setup fragments manager
    const fragments = components.get(OBC.FragmentsManager);
    fragments.init("/fragments-worker/worker.mjs");

    fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
      const isLod = "isLodMaterial" in material && material.isLodMaterial;
      if (isLod) {
        world.renderer!.postproduction.basePass.isolatedMaterials.push(material);
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

    // Setup IFC loader
    const ifcLoader = components.get(OBC.IfcLoader);
    ifcLoader.setup({
      autoSetWasm: false,
      wasm: { absolute: true, path: "https://unpkg.com/web-ifc@0.0.71/" },
      webIfc: { 
        COORDINATE_TO_ORIGIN: true, 
        USE_FAST_BOOLS: false,
        TOLERANCE_PLANE_INTERSECTION: 0.000001
      }
    });

    // Setup highlighter
    const highlighter = components.get(OBF.Highlighter);
    highlighter.setup({
      world,
      selectMaterialDefinition: {
        color: new THREE.Color("#bcf124"),
        renderedFaces: 1,
        opacity: 1,
        transparent: false,
      },
    });

    // Setup clipper
    const clipper = components.get(OBC.Clipper);
    viewport.ondblclick = () => {
      if (clipper.enabled) clipper.create(world);
    };

    window.addEventListener("keydown", (event) => {
      if (event.code === "Delete" || event.code === "Backspace") {
        clipper.delete(world);
      }
    });

    // Setup length measurement
    const lengthMeasurer = components.get(OBF.LengthMeasurement);
    lengthMeasurer.world = world;
    lengthMeasurer.color = new THREE.Color("#6528d7");

    lengthMeasurer.list.onItemAdded.add((line) => {
      const center = new THREE.Vector3();
      line.getCenter(center);
      const radius = line.distance() / 3;
      const sphere = new THREE.Sphere(center, radius);
      world.camera.controls.fitToSphere(sphere, true);
    });

    viewport.addEventListener("dblclick", () => lengthMeasurer.create());

    window.addEventListener("keydown", (event) => {
      if (event.code === "Delete" || event.code === "Backspace") {
        lengthMeasurer.delete();
      }
    });

    // Setup area measurement
    const areaMeasurer = components.get(OBF.AreaMeasurement);
    areaMeasurer.world = world;
    areaMeasurer.color = new THREE.Color("#6528d7");

    areaMeasurer.list.onItemAdded.add((area) => {
      if (!area.boundingBox) return;
      const sphere = new THREE.Sphere();
      area.boundingBox.getBoundingSphere(sphere);
      world.camera.controls.fitToSphere(sphere, true);
    });

    viewport.addEventListener("dblclick", () => {
      areaMeasurer.create();
    });

    window.addEventListener("keydown", (event) => {
      if (event.code === "Enter" || event.code === "NumpadEnter") {
        areaMeasurer.endCreation();
      }
    });

    // Setup fragments loaded handler
    fragments.list.onItemSet.add(async (modelEntry) => {
      const model = modelEntry.value;
      model.useCamera(world.camera.three);
      model.getClippingPlanesEvent = () => {
        return Array.from(world.renderer!.three.clippingPlanes) || [];
      };
      world.scene.three.add(model.object);
      await fragments.core.update(true);
      fragmentModelRef.current = model;
    });

    // Setup finder
    const finder = components.get(OBC.ItemsFinder);
    finder.create("Walls", [{ categories: [/WALL/] }]);
    finder.create("Slabs", [{ categories: [/SLAB/] }]);

    // Setup UI
    setupUI(world, viewport, components);
  };

  const setupUI = (world: OBC.World, viewport: BUI.Viewport, components: OBC.Components) => {
    const viewerContainer = document.getElementById("viewer-container") as HTMLElement;
    if (!viewerContainer) return;

    // Create floating grid
    const floatingGrid = BUI.Component.create<BUI.Grid>(() => {
      return BUI.html`
        <bim-grid floating style="padding: 20px;"></bim-grid>
      `;
    });

    // Create toolbar
    const toolbar = BUI.Component.create<BUI.Toolbar>(() => {
      const [loadIfcBtn] = CUI.buttons.loadIfc({ components: components });
      loadIfcBtn.tooltipTitle = "Load IFC";
      loadIfcBtn.label = "";

      return BUI.html`
        <bim-toolbar style="justify-self: center;">
          <bim-toolbar-section label="Import">
            ${loadIfcBtn}
          </bim-toolbar-section>
          <bim-toolbar-section label="View">
            <bim-button
              tooltip-title="Zoom Extend"
              icon="tabler:arrows-maximize"
              @click=${() => {
                if (fragmentModelRef.current && world.camera.controls) {
                  const sphere = new THREE.Sphere();
                  fragmentModelRef.current.box.getBoundingSphere(sphere);
                  world.camera.controls.fitToSphere(sphere, true);
                }
              }}
            ></bim-button>
          </bim-toolbar-section>
        </bim-toolbar>
      `;
    });

    // Create element properties panel
    const elementPropertyPanel = BUI.Component.create<BUI.Panel>(() => {
      return BUI.html`
        <bim-panel>
          <bim-panel-section
            name="property"
            label="Property Information"
            icon="solar:document-bold"
            fixed
          >
            <div>Properties panel will be added later</div>
          </bim-panel-section>
        </bim-panel>
      `;
    });

    // Setup grid layouts
    floatingGrid.layouts = {
      main: {
        template: `
          "empty" 1fr
          "toolbar" auto
          /1fr
        `,
        elements: { toolbar },
      },
      second: {
        template: `
          "empty elementPropertyPanel" 1fr
          "toolbar toolbar" auto
          /1fr 20rem
        `,
        elements: { 
          toolbar,
          elementPropertyPanel
        },
      },
    };

    (floatingGrid as any).layout = "main";
    viewerContainer.appendChild(floatingGrid);
  };

  React.useEffect(() => {
    setTimeout(() => {
      setViewer();
    });

    return () => {
      if (components) {
        components.dispose();
      }
      if (fragmentModelRef.current) {
        fragmentModelRef.current.dispose();
        fragmentModelRef.current = undefined;
      }
    };
  }, []);

  React.useEffect(() => {
    if (props.ifcFilePath) {
      loadIFCFromPath(props.ifcFilePath);
    }
  }, [props.ifcFilePath]);

  const loadIFCFromPath = async (path: string) => {
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const fragments = components.get(OBC.FragmentsManager);
      const ifcLoader = components.get(OBC.IfcLoader);
      
      const model = await ifcLoader.load(uint8Array, true, "model.ifc");
      if (!model) {
        throw new Error("Failed to load IFC model");
      }

      fragmentModelRef.current = model;
      worldRef.current!.scene.three.add(model.object);
      
      // Fit to model
      const sphere = new THREE.Sphere();
      model.box.getBoundingSphere(sphere);
      if (worldRef.current!.camera.controls) {
        worldRef.current!.camera.controls.fitToSphere(sphere, true);
      }

    } catch (error) {
      console.error('Error loading IFC file:', error);
    }
  };

  return (
    <div 
      style={{
        position: props.isExpanded ? 'fixed' : 'relative',
        top: props.isExpanded ? 0 : 'auto',
        left: props.isExpanded ? '200px' : 'auto',
        right: props.isExpanded ? 0 : 'auto',
        bottom: props.isExpanded ? 0 : 'auto',
        width: props.isExpanded ? 'calc(100vw - 180px)' : '100%',
        height: props.isExpanded ? '100vh' : '100%',
        zIndex: props.isExpanded ? 1000 : 'auto',
        transition: 'all 0.3s ease-in-out',
        backgroundColor: '#1a1d23'
      }}
    >
      <div 
        id="viewer-container" 
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1d23'
        }}
      >
      </div>
    </div>
  );
}
