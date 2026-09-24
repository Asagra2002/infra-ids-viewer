import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

export interface ViewportSettingsState {
  components: OBC.Components;
  world: OBC.World;
}

export const viewportSettingsTemplate: BUI.StatefullComponent<ViewportSettingsState> = (
  state,
) => {
  const { components, world } = state;

  // Get measurement tools
  const lengthMeasurer = components.get(OBF.LengthMeasurement);
  const areaMeasurer = components.get(OBF.AreaMeasurement);
  const clipper = components.get(OBC.Clipper);

  const onLengthMeasurement = () => {
    lengthMeasurer.enabled = !lengthMeasurer.enabled;
    areaMeasurer.enabled = false;
  };

  const onAreaMeasurement = () => {
    areaMeasurer.enabled = !areaMeasurer.enabled;
    lengthMeasurer.enabled = false;
  };

  const onModelSection = () => {
    clipper.enabled = !clipper.enabled;
  };

  const areMeasurementsEnabled = lengthMeasurer.enabled || areaMeasurer.enabled;

  return BUI.html`
    <bim-toolbar style="position: absolute; bottom: 16px; left: 16px; z-index: 1000;">
      <bim-toolbar-section>
        <bim-button
          icon="solar:settings-bold"
          tooltip-title="Viewport Settings"
          tooltip-text="Access viewport configuration options including rendering settings, camera controls, and display preferences."
        ></bim-button>
        <bim-button 
          @click=${onLengthMeasurement} 
          ?active=${lengthMeasurer.enabled} 
          icon="tabler:ruler"
          tooltip-title="Length Measurements"
          tooltip-text="Enable length measurement tool to measure distances between points in the 3D model. Click to start measuring."
        ></bim-button>
        <bim-button 
          @click=${onAreaMeasurement} 
          ?active=${areaMeasurer.enabled} 
          icon="tabler:square"
          tooltip-title="Area Measurements"
          tooltip-text="Enable area measurement tool to calculate surface areas by drawing polygons on the model. Click to start measuring."
        ></bim-button>
        <bim-button 
          ?active=${clipper.enabled} 
          @click=${onModelSection} 
          icon="tabler:cut"
          tooltip-title="Model Section"
          tooltip-text="Enable sectioning tool to cut through the model and view internal structures. Double-click to create section planes."
        ></bim-button>
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
