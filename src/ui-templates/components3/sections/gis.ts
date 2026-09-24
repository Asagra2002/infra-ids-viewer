import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { GisLayers } from "../../../bim_components";
import { CesiumUsageManager } from "../../../utils/CesiumUsageManager";
import {
  extractBuildingData,
  isInFinland,
} from "../../../services/SijaintikarttaDataExtractor";

export interface GisPanelState {
  components: OBC.Components;
}

const TOKEN_ID = "that-open-cesium-token";

function loadCesiumToken(): string {
  const envToken = typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_CESIUM_ACCESS_TOKEN;
  if (envToken && typeof envToken === "string") return envToken;
  return localStorage.getItem(TOKEN_ID) || "";
}

export const gisPanelTemplate: BUI.StatefullComponent<GisPanelState> = (state) => {
  const { components } = state;
  const worlds = components.get(OBC.Worlds);
  const world = worlds.list.values().next().value as OBC.SimpleWorld;
  const camera = world.camera.three as THREE.PerspectiveCamera;

  const gisLayers = components.get(GisLayers) as InstanceType<typeof GisLayers> | undefined;

  const token = loadCesiumToken();
  if (token && gisLayers) gisLayers.cesiumToken = token;

  // Obtener coordenadas actuales del GIS
  const currentLat = gisLayers?.layer3d.latitude || 0;
  const currentLon = gisLayers?.layer3d.longitude || 0;
  const currentRot = gisLayers?.layer3d.rotation || 0;
  const currentElev = gisLayers?.layer3d.elevation || 0;
  const currentOffsetX = gisLayers?.layer3d.offsetX || 0;
  const currentOffsetZ = gisLayers?.layer3d.offsetZ || 0;

  // Lat/Lon del IFC (editables)
  const latitudeInput = BUI.Component.create<BUI.NumberInput>(() => {
    return BUI.html`<bim-number-input
      style="max-height: min-content; min-width: 0;"
      pref="Lat"
      slider
      value="${currentLat}"
      min="-90"
      max="90"
      step="0.000001">
    </bim-number-input>
    `;
  });

  const longitudeInput = BUI.Component.create<BUI.NumberInput>(() => {
    return BUI.html`<bim-number-input
      style="max-height: min-content; min-width: 0;"
      pref="Long"
      slider
      value="${currentLon}"
      min="-180"
      max="180"
      step="0.000001">
    </bim-number-input>
    `;
  });
  
  // Offsets en metros (editables)
  const offsetXInput = BUI.Component.create<BUI.NumberInput>(() => {
    return BUI.html`<bim-number-input
      style="max-height: min-content; min-width: 0;"
      pref="Offset X (m)"
      slider
      value="${currentOffsetX}"
      min="-1000"
      max="1000"
      step="1">
    </bim-number-input>
    `;
  });

  const offsetZInput = BUI.Component.create<BUI.NumberInput>(() => {
    return BUI.html`<bim-number-input
      style="max-height: min-content; min-width: 0;"
      pref="Offset Z (m)"
      slider
      value="${currentOffsetZ}"
      min="-1000"
      max="1000"
      step="1">
    </bim-number-input>
    `;
  });
  
  const rotationInput = BUI.Component.create<BUI.NumberInput>(() => {
    return BUI.html`<bim-number-input
      style="max-height: min-content; min-width: 0;"
      pref="Rotation"
      slider
      value="${currentRot}"
      min="0"
      max="360"
      step="1">
    </bim-number-input>
    `;
  });
  
  const elevationInput = BUI.Component.create<BUI.NumberInput>(() => {
    return BUI.html`<bim-number-input
      style="max-height: min-content; min-width: 0;"
      pref="Elevation (m)"
      slider
      value="${currentElev}"
      min="-1000"
      max="1000"
      step="0.01">
    </bim-number-input>
    `;
  });
  
  // Configurar callback para actualizar UI y mapa 2D cuando cambien coordenadas
  if (gisLayers) {
    gisLayers.layer3d.onCoordinatesChanged = (lat: number, lon: number, rotation: number, elevation: number, offsetX: number, offsetZ: number) => {
      // Actualizar todos los inputs
      (latitudeInput as any).value = lat;
      (longitudeInput as any).value = lon;
      (offsetXInput as any).value = offsetX;
      (offsetZInput as any).value = offsetZ;
      (rotationInput as any).value = rotation;
      (elevationInput as any).value = elevation;
      // Actualizar mapa 2D (top view)
      if (gisLayers.layer2d?.isInitialized) {
        gisLayers.layer2d.setLocation(lat, lon);
      }
    };
  }
  
  const getUsageText = () => {
    const info = CesiumUsageManager.getUsageInfo();
    return `GIS: ${info.current}/${info.limit} uses today`;
  };

  const usageControlWrapper = document.createElement("div");
  usageControlWrapper.id = "gis-usage-control";
  usageControlWrapper.style.cssText = "display: flex; flex-direction: column; gap: 0.25rem;";

  // Solo mostrar info de uso; la activación se hace desde el botón GIS de la barra
  const span1 = document.createElement("span");
  span1.style.fontSize = "0.85em";
  span1.textContent = getUsageText();
  span1.id = "gis-usage-text";
  usageControlWrapper.appendChild(span1);
  const limitReached = !CesiumUsageManager.canUseCesium();
  const span2 = document.createElement("span");
  span2.id = "gis-limit-msg";
  span2.style.fontSize = "0.85em";
  span2.style.color = "var(--bim-ui_accent-base)";
  span2.textContent = "Daily limit reached. Try again tomorrow.";
  span2.style.display = limitReached ? "block" : "none";
  usageControlWrapper.appendChild(span2);

  const onLatLonChanged = () => {
    const latitude = Number(latitudeInput.value);
    const longitude = Number(longitudeInput.value);
    const rotation = Number(rotationInput.value);
    const elevation = Number(elevationInput.value);
    const offsetX = Number(offsetXInput.value);
    const offsetZ = Number(offsetZInput.value);
    
    if (gisLayers && !isNaN(latitude) && !isNaN(longitude)) {
      gisLayers.layer3d.setCoordinates(latitude, longitude, rotation, elevation, offsetX, offsetZ);
    }
  };
  
  const onOffsetsChanged = () => {
    const latitude = Number(latitudeInput.value);
    const longitude = Number(longitudeInput.value);
    const offsetX = Number(offsetXInput.value);
    const offsetZ = Number(offsetZInput.value);
    const rotation = Number(rotationInput.value);
    const elevation = Number(elevationInput.value);
    
    if (gisLayers && !isNaN(offsetX) && !isNaN(offsetZ)) {
      gisLayers.layer3d.setCoordinates(latitude, longitude, rotation, elevation, offsetX, offsetZ);
    }
  };

  const onRotationChanged = (e: Event) => {
    const input = e.target as BUI.NumberInput;
    const latitude = Number(latitudeInput.value);
    const longitude = Number(longitudeInput.value);
    const rotation = Number(input.value);
    const elevation = Number(elevationInput.value);
    const offsetX = Number(offsetXInput.value);
    const offsetZ = Number(offsetZInput.value);
    
    if (gisLayers && !isNaN(rotation)) {
      gisLayers.layer3d.setCoordinates(latitude, longitude, rotation, elevation, offsetX, offsetZ);
    }
  };
  
  const onElevationChanged = (e: Event) => {
    const input = e.target as BUI.NumberInput;
    const latitude = Number(latitudeInput.value);
    const longitude = Number(longitudeInput.value);
    const elevation = Number(input.value);
    const rotation = Number(rotationInput.value);
    const offsetX = Number(offsetXInput.value);
    const offsetZ = Number(offsetZInput.value);
    
    if (gisLayers && !isNaN(elevation)) {
      gisLayers.layer3d.setCoordinates(latitude, longitude, rotation, elevation, offsetX, offsetZ);
    }
  };

  const onCameraChanged = (e: Event) => {
    const input = e.target as BUI.NumberInput;
    camera.far = input.value;
    camera.updateProjectionMatrix();
  };

  const onSendGISData = async () => {
    if (!gisLayers) {
      alert("GIS not available.");
      return;
    }
    const fragments = components.get(OBC.FragmentsManager);
    const models = Array.from(fragments.list.values());
    const model = models[0];
    if (!model) {
      alert("No IFC model loaded. Please load a model first.");
      return;
    }
    const lat = gisLayers.layer3d.latitude;
    const lon = gisLayers.layer3d.longitude;
    const elev = gisLayers.layer3d.elevation;
    if (!isInFinland(lat, lon)) {
      alert(
        "This model is not located in Finland. Sijaintikartta is only available for Finnish projects.\n\nCoordinates: " +
          lat.toFixed(4) +
          ", " +
          lon.toFixed(4)
      );
      return;
    }
    const loadingDiv = document.createElement("div");
    loadingDiv.style.cssText =
      "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px;border-radius:8px;z-index:100001;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);";
    loadingDiv.innerHTML =
      "<span style='animation:spin 1s linear infinite'>⟳</span> Extracting GIS data and cadastral information...";
    document.body.appendChild(loadingDiv);
    try {
      const { useSijaintikarttaStore } = await import("../../../stores/SijaintikarttaStore");
      const { generateSijaintikartta } = useSijaintikarttaStore.getState();
      const buildingData = await extractBuildingData(model, {
        latitude: lat,
        longitude: lon,
        elevation: elev,
      });
      const { CadastralService } = await import("../../../services/CadastralService");
      const cadastralSvc = CadastralService.getInstance();
      let cadastralInfo = null;
      try {
        cadastralInfo = await cadastralSvc.getCadastralInfo(lat, lon);
      } catch {}
      const projectInfo = {
        name: (model as any).name || "IFC Project",
        description: `Building project at ${cadastralInfo?.address?.street || "Unknown location"}`,
        location: cadastralInfo?.address?.street || "Unknown",
        municipality: cadastralInfo?.municipality?.name || "Helsinki",
        buildingType: buildingData.classification.buildingType || "Residential",
        constructionMethod: "OnSite",
        area: buildingData.dimensions.surface,
        generatedDate: new Date(),
      };
      const enhancedBuildingData = {
        ...buildingData,
        coordinates: {
          ...buildingData.coordinates,
          parcelInfo: cadastralInfo
            ? {
                propertyId: cadastralInfo.propertyId,
                propertyNumber: cadastralInfo.propertyNumber,
                landArea: cadastralInfo.area?.landArea,
                buildingCoverage: cadastralInfo.area?.buildingCoverage,
                address: cadastralInfo.address,
              }
            : null,
        },
        cadastral: {
          ...buildingData.cadastral,
          propertyNumber: cadastralInfo?.propertyNumber || buildingData.cadastral.propertyNumber,
          municipality: cadastralInfo?.municipality?.name || buildingData.cadastral.municipality,
          zoning: cadastralInfo?.zoning?.code || buildingData.cadastral.zoning,
          landUse: cadastralInfo?.zoning?.name || buildingData.cadastral.landUse,
        },
        zoningCompliance: cadastralInfo
          ? {
              heightCompliance:
                buildingData.dimensions.height <= (cadastralInfo.zoning?.maxHeight ?? Infinity),
              floorCompliance:
                buildingData.additionalInfo.floors <= (cadastralInfo.zoning?.maxFloors ?? Infinity),
              coverageCompliance:
                (buildingData.dimensions.surface / (cadastralInfo.area?.landArea || 1)) * 100 <=
                (cadastralInfo.zoning?.maxCoverage ?? 100),
              buildingRights: cadastralInfo.zoning?.buildingRights,
            }
          : null,
        restrictions: cadastralInfo?.restrictions
          ? {
              heritage: cadastralInfo.restrictions.heritage,
              natureConservation: cadastralInfo.restrictions.natureConservation,
              floodRisk: cadastralInfo.restrictions.floodRisk,
              noiseRestrictions: cadastralInfo.restrictions.noiseRestrictions,
              heightRestrictions: cadastralInfo.restrictions.heightRestrictions,
            }
          : null,
        utilities: cadastralInfo?.utilities
          ? {
              water: cadastralInfo.utilities.water,
              sewage: cadastralInfo.utilities.sewage,
              electricity: cadastralInfo.utilities.electricity,
              gas: cadastralInfo.utilities.gas,
              internet: cadastralInfo.utilities.internet,
              districtHeating: cadastralInfo.utilities.districtHeating,
            }
          : null,
      };
      generateSijaintikartta(projectInfo, enhancedBuildingData as any);
      if (document.body.contains(loadingDiv)) document.body.removeChild(loadingDiv);
      const msg = document.createElement("div");
      msg.style.cssText =
        "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(76,175,80,0.95);color:white;padding:20px;border-radius:8px;z-index:100001;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);";
      msg.innerHTML =
        "<span style='font-size:24px'>✓</span><div>GIS data extracted successfully!</div><div style='font-size:12px;opacity:0.8;margin-top:10px'>You can now view the official site plan and permit requirements.</div>";
      document.body.appendChild(msg);
      setTimeout(() => {
        msg.style.opacity = "0";
        msg.style.transition = "opacity 0.3s";
        setTimeout(() => {
          if (document.body.contains(msg)) document.body.removeChild(msg);
        }, 300);
      }, 4000);
    } catch (err) {
      console.error("[GIS] Error sending GIS data:", err);
      if (document.body.contains(loadingDiv)) document.body.removeChild(loadingDiv);
      const errDiv = document.createElement("div");
      errDiv.style.cssText =
        "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(244,67,54,0.95);color:white;padding:20px;border-radius:8px;z-index:100001;box-shadow:0 4px 20px rgba(0,0,0,0.3);";
      errDiv.innerHTML = "<span style='font-size:24px'>✗</span><div>Error extracting GIS data. Please try again.</div>";
      document.body.appendChild(errDiv);
      setTimeout(() => {
        errDiv.style.opacity = "0";
        errDiv.style.transition = "opacity 0.3s";
        setTimeout(() => {
          if (document.body.contains(errDiv)) document.body.removeChild(errDiv);
        }, 300);
      }, 3000);
    }
  };

  latitudeInput.addEventListener("change", onLatLonChanged);
  longitudeInput.addEventListener("change", onLatLonChanged);
  offsetXInput.addEventListener("change", onOffsetsChanged);
  offsetZInput.addEventListener("change", onOffsetsChanged);
  rotationInput.addEventListener("change", onRotationChanged);
  elevationInput.addEventListener("change", onElevationChanged);

  // Contenedor del mapa 2D (top view) - centrado, sin desborde
  const mapWrapper = document.createElement("div");
  mapWrapper.style.cssText = "width: 100%; margin: 0.25rem 0; padding: 0; box-sizing: border-box; overflow: hidden; flex-shrink: 0; min-width: 0;";
  if (gisLayers?.layer2d) {
    mapWrapper.appendChild(gisLayers.layer2d.container);
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (gisLayers?.layer2d && !gisLayers.layer2d.isInitialized) {
          gisLayers.layer2d.initialize();
          gisLayers.layer2d.setLocation(currentLat, currentLon);
          gisLayers.layer2d.invalidateSize();
        }
      }, 150);
    });
  }

  return BUI.html`
    <bim-panel-section fixed label="GIS" style="display: flex; flex-direction: column; overflow: hidden; min-height: 0; padding: 0.5rem; box-sizing: border-box;">
      <div style="display: flex; flex-direction: column; gap: 0.35rem; overflow: hidden; min-width: 0; flex: 1 1 auto; min-height: 0;">
        ${usageControlWrapper}
        ${mapWrapper}
        <div style="display: flex; gap: 0.35rem; min-width: 0; flex-shrink: 0;">
          ${longitudeInput}
          ${latitudeInput}
        </div>
        <div style="display: flex; gap: 0.35rem; min-width: 0; flex-shrink: 0;">
          ${offsetXInput}
          ${offsetZInput}
        </div>
        <div style="display: flex; gap: 0.35rem; min-width: 0; flex-shrink: 0;">
          ${rotationInput}
          ${elevationInput}
        </div>
        <bim-number-input
          style="max-height: min-content; min-width: 0; flex-shrink: 0;"
          pref="Camera Range"
          slider
          value="${camera.far}"
          min="100"
          max="10000"
          step="50"
          @change=${onCameraChanged}>
        </bim-number-input>
        <div style="flex-shrink: 0; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--bim-ui_bg-contrast-20, rgba(255,255,255,0.1));">
          <bim-button
            label="GIS Data to Site Plan"
            icon="material-symbols:location_on"
            @click=${onSendGISData}
            style="width: 100%;">
          </bim-button>
        </div>
      </div>
    </bim-panel-section>
  `;
};