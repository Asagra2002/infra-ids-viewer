import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapLayerDef {
  key: string;
  label: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

function getDefaultLayers(apiKey?: string): MapLayerDef[] {
  const layers: MapLayerDef[] = [
    { key: "osm", label: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap", maxZoom: 19 },
    { key: "maptiler_topo", label: "Finnish Topo (MapTiler)", url: "https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=7QjgSjx55hW489tQSL7w", attribution: "© MapTiler © OSM", maxZoom: 19 },
    { key: "maptiler_satellite", label: "Satellite (MapTiler)", url: "https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=7QjgSjx55hW489tQSL7w", attribution: "© MapTiler © OSM", maxZoom: 19 },
  ];
  if (apiKey && apiKey.length > 0) {
    const base = "https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0";
    layers.push(
      { key: "mml_maastokartta", label: "Maastokartta (MML)", url: `${base}/maastokartta/default/WGS84_Pseudo-Mercator/{z}/{x}/{y}.png?api-key=${apiKey}`, attribution: "© Maanmittauslaitos", maxZoom: 16 },
      { key: "mml_taustakartta", label: "Taustakartta (MML)", url: `${base}/taustakartta/default/WGS84_Pseudo-Mercator/{z}/{x}/{y}.png?api-key=${apiKey}`, attribution: "© Maanmittauslaitos", maxZoom: 16 },
      { key: "mml_ortokuva", label: "Ortokuva (MML)", url: `${base}/ortokuva/default/WGS84_Pseudo-Mercator/{z}/{x}/{y}.jpg?api-key=${apiKey}`, attribution: "© Maanmittauslaitos", maxZoom: 16 }
    );
  }
  return layers;
}

export interface GisLayer2DOptions {
  initialLat?: number;
  initialLon?: number;
  zoom?: number;
  height?: string;
}

export class GisLayer2D {
  container: HTMLDivElement;
  private _map: L.Map | null = null;
  private _marker: L.Marker | null = null;
  private _initialLat: number;
  private _initialLon: number;
  private _zoom: number;
  private _height: string;
  private _baseLayer: L.TileLayer | null = null;
  private _layers: MapLayerDef[] = [];
  private _currentLayerKey = "osm";

  constructor(options: GisLayer2DOptions = {}) {
    const apiKey = typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_MAANMITTLAITOS_API_KEY;
    this._layers = getDefaultLayers(typeof apiKey === "string" ? apiKey : undefined);
    this._initialLat = options.initialLat ?? 60.211124;
    this._initialLon = options.initialLon ?? 24.890881;
    this._zoom = options.zoom ?? 16;
    this._height = options.height ?? "140px";

    this.container = document.createElement("div");
    this.container.style.cssText = `
      width: 100% !important;
      height: ${this._height} !important;
      min-height: 100px;
      border-radius: 6px;
      overflow: hidden;
      background: #1e293b;
      display: block;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    `;
    this.container.className = "gis-layer-2d-map";
  }

  /**
   * Inicializa el mapa (llamar cuando el contenedor esté en el DOM)
   */
  initialize(): void {
    if (this._map) return;

    this._map = L.map(this.container, {
      center: [this._initialLat, this._initialLon],
      zoom: this._zoom,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(this._map);

    this._setBaseLayer("osm");

    // Marcador
    const icon = L.divIcon({
      html: `<div style="
        width: 24px; height: 24px;
        background: #2196F3;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      className: "gis-layer-2d-marker",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    this._marker = L.marker([this._initialLat, this._initialLon], { icon }).addTo(this._map);

    // Forzar invalidateSize para que el mapa llene y centre correctamente
    const refreshMap = () => {
      this._map?.invalidateSize();
      this._map?.setView([this._initialLat, this._initialLon], this._zoom);
    };
    setTimeout(refreshMap, 100);
    setTimeout(refreshMap, 400);
  }

  /**
   * Actualiza la posición del marcador y centra el mapa
   */
  setLocation(latitude: number, longitude: number): void {
    this._initialLat = latitude;
    this._initialLon = longitude;

    if (this._marker) {
      this._marker.setLatLng([latitude, longitude]);
    }

    if (this._map) {
      this._map.setView([latitude, longitude], this._map.getZoom());
    }
  }

  /**
   * Indica si el mapa está inicializado
   */
  get isInitialized(): boolean {
    return this._map !== null;
  }

  /**
   * Refresca el tamaño del mapa (útil cuando el contenedor cambia de tamaño)
   */
  invalidateSize(): void {
    this._map?.invalidateSize();
  }

  getAvailableLayers(): MapLayerDef[] {
    return [...this._layers];
  }

  getCurrentLayerKey(): string {
    return this._currentLayerKey;
  }

  setBaseLayer(key: string): boolean {
    if (!this._map) return false;
    const def = this._layers.find((l) => l.key === key);
    if (!def) return false;
    this._setBaseLayer(key);
    return true;
  }

  private _setBaseLayer(key: string): void {
    const def = this._layers.find((l) => l.key === key);
    if (!def || !this._map) return;
    if (this._baseLayer) this._map.removeLayer(this._baseLayer);
    const opts: L.TileLayerOptions = {
      maxZoom: def.maxZoom ?? 19,
      attribution: def.attribution,
    };
    if (def.url.includes("{s}")) opts.subdomains = "abc";
    this._baseLayer = L.tileLayer(def.url, opts);
    this._baseLayer.addTo(this._map);
    this._currentLayerKey = key;
  }

  /**
   * Limpieza
   */
  dispose(): void {
    if (this._map) {
      this._map.remove();
      this._map = null;
      this._marker = null;
    }
  }
}
