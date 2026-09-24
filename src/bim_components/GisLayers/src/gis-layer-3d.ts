import * as THREE from "three";
import * as OBC from "@thatopen/components";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader";

import { Ion } from "@cesium/engine";

import { TilesRenderer } from "3d-tiles-renderer";

import {
    TilesFadePlugin,
    TileCompressionPlugin,
    GLTFExtensionsPlugin,
    ReorientationPlugin,
} from "3d-tiles-renderer/plugins";

// CesiumIonAuthPlugin se movió a core/plugins
// @ts-ignore - TypeScript no resuelve este import con moduleResolution: node, pero funciona en runtime
import { CesiumIonAuthPlugin } from "3d-tiles-renderer/core/plugins";

export class GisLayer3D {
    latitude: number = 60.171944;  // Origen: coords del IFC (automático)
    longitude: number = 24.941389;
    rotation: number = 0;
    elevation: number = 0;  // Elevación en metros
    
    // 🎯 Offsets en metros para ajuste manual
    offsetX: number = 0;  // Desplazamiento Este-Oeste en metros
    offsetZ: number = 0;  // Desplazamiento Norte-Sur en metros
    
    private _hasIFCCoordinates: boolean = false;  // Flag para saber si ya se sincronizó con IFC

    private _enabled = false;
    private _resolutionSet = false;
    private _initialized = false;
    private _reorientationPlugin?: ReorientationPlugin;
    private _tilesRenderer?: TilesRenderer;
    public _tilesParentGroup?: THREE.Group;  // Grupo padre para aplicar transformaciones sin tocar el grupo interno (public para autoAlignGround)
    private _updateInterval?: NodeJS.Timeout;
    private _components?: OBC.Components;
    
    // Callback para auto-alinear cuando se cargan los tiles
    onTilesLoaded?: () => void;
    
    // Callback para notificar cambios de coordenadas al UI
    onCoordinatesChanged?: (lat: number, lon: number, rotation: number, elevation: number, offsetX: number, offsetZ: number) => void;

    get enabled() {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
        
        // Si no se ha inicializado aún, inicializar primero
        if (!this._initialized && value) {
            if (!this._hasIFCCoordinates) {
                console.warn("⚠️ GIS initialized with default coordinates (Helsinki). Will update when IFC is detected.");
            }
            this.notifyTokenChanged();
            return;
        }
        
        if (!this._initialized) return;
        
        const world = this.getWorld();
        if (value) {
            world.scene.three.add(this._tilesParentGroup as THREE.Object3D);
            this.updateTiles();
        } else {
            world.scene.three.remove(this._tilesParentGroup as THREE.Object3D);
        }
    }

    constructor(components: OBC.Components) {
        this._components = components;

        this._updateInterval = setInterval(() => {
            this.updateTiles();
        }, 300);

        const world = this.getWorld();
        world.camera.controls.maxDistance = 1000000;
        world.camera.controls.addEventListener("control", () => {
            this.updateTiles();
        });
    }

    dispose() {
        if (!this._updateInterval) {
            clearInterval(this._updateInterval);
        }
        if (this._tilesRenderer) {
            this._tilesRenderer.dispose();
        }
    }

    updateTiles() {
        if (!this._enabled) return;
        if (!this._initialized) return;
        if (!this._resolutionSet) {
            const world = this.getWorld();
            this._tilesRenderer!.setResolutionFromRenderer(
                world.camera.three,
                world.renderer!.three
            );
            this._resolutionSet = true;
        }
        this._tilesRenderer!.update();
    }

    /**
     * Actualiza las coordenadas y reorienta los tiles
     */
    setCoordinates(latitude: number, longitude: number, rotation: number = 0, elevation: number = 0, offsetX: number = 0, offsetZ: number = 0) {
        const geoChanged = 
            this.latitude !== latitude || 
            this.longitude !== longitude || 
            this.rotation !== rotation ||
            this.offsetX !== offsetX ||
            this.offsetZ !== offsetZ;
            
        const elevationChanged = this.elevation !== elevation;
            
        this.latitude = latitude;
        this.longitude = longitude;
        this.rotation = rotation;
        this.elevation = elevation;
        this.offsetX = offsetX;
        this.offsetZ = offsetZ;
        this._hasIFCCoordinates = true;  // Marcar que ya tenemos coords del IFC
        
        // Notificar al UI si hay callback
        if (this.onCoordinatesChanged) {
            this.onCoordinatesChanged(latitude, longitude, rotation, elevation, offsetX, offsetZ);
        }
        
        // Si cambió lat/lon/rotation, recrear tileset completo
        if (this._initialized && geoChanged) {
            this.notifyTokenChanged();
        }
        // Si solo cambió elevación, solo actualizar position.y del grupo padre (sin recrear tileset)
        else if (this._initialized && elevationChanged && this._tilesParentGroup) {
            this._tilesParentGroup.position.y = elevation;
            this._tilesParentGroup.updateMatrixWorld(true);
        }
        // Si NO está inicializado pero está habilitado, inicializar ahora
        else if (!this._initialized && this._enabled) {
            this.notifyTokenChanged();
        }
    }

    notifyTokenChanged() {
        console.log("🔄 [GisLayer3D] Recreating tileset...");

        if (this._tilesRenderer) {
            this._tilesRenderer.dispose();
        }
        
        // Crear grupo padre para transformaciones (si no existe)
        if (!this._tilesParentGroup) {
            this._tilesParentGroup = new THREE.Group();
            this._tilesParentGroup.name = "GIS_Tiles_Parent";
        } else {
            // Limpiar tiles anteriores del grupo padre
            this._tilesParentGroup.clear();
        }
        
        this._tilesRenderer = new TilesRenderer();

        const world = this.getWorld();


        const cesiumIonPlugin = new CesiumIonAuthPlugin(
            {
                apiToken: Ion.defaultAccessToken,
                assetId: "2275207",
                autoRefreshToken: true,
            }
        );

        // 🎯 Convertir offsets (metros) a grados
        const latWithOffset = this.latitude + this.metersToLatDegrees(this.offsetZ);
        const lonWithOffset = this.longitude + this.metersToLonDegrees(this.offsetX, this.latitude);
        
        this._reorientationPlugin = new ReorientationPlugin({
            lat: latWithOffset * THREE.MathUtils.DEG2RAD,
            lon: lonWithOffset * THREE.MathUtils.DEG2RAD,
        });

        const dracoloader = new DRACOLoader().setDecoderPath("/draco/");

        this._tilesRenderer.registerPlugin(cesiumIonPlugin);
        this._tilesRenderer.registerPlugin(new TileCompressionPlugin());
        this._tilesRenderer.registerPlugin(this._reorientationPlugin);
        this._tilesRenderer.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: dracoloader }));

        this._tilesRenderer.setCamera(world.camera.three);
        this._tilesRenderer.setResolutionFromRenderer(
            world.camera.three,
            world.renderer!.three
        );
        
        // 🎯 Añadir el grupo de tiles al grupo padre (no directamente a la escena)
        this._tilesParentGroup.add(this._tilesRenderer.group as THREE.Object3D);
        
        // 🎯 Mantener la elevación actual del grupo padre
        // (no resetear a this.elevation porque puede haber sido ajustado por auto-align)
        // Solo aplicar si es la primera vez o si elevation cambió explícitamente
        if (!this._initialized) {
            this._tilesParentGroup.position.y = this.elevation;
        }

        this._tilesRenderer.addEventListener("load-tileset", () => {
            const sphere = new THREE.Sphere();
            this._tilesRenderer!.getBoundingSphere(sphere);
            world.camera.three.updateProjectionMatrix();
            
            // 🎯 Aplicar rotación al grupo padre (ReorientationPlugin no la soporta)
            if (this.rotation !== 0) {
                this._tilesParentGroup!.rotation.y = this.rotation * THREE.MathUtils.DEG2RAD;
                console.log(`🔄 [GisLayer3D] Rotation applied: ${this.rotation}°`);
            }
            
            console.log("✅ [GisLayer3D] Tileset loaded");
            
            // 🎯 Ejecutar callback para auto-alineación solo una vez
            if (this.onTilesLoaded) {
                if (!(this._tilesRenderer as any).userData) {
                    (this._tilesRenderer as any).userData = {};
                }
                
                if (!(this._tilesRenderer as any).userData.autoAlignExecuted) {
                    (this._tilesRenderer as any).userData.autoAlignExecuted = true;
                    setTimeout(() => {
                        this.onTilesLoaded!();
                    }, 2000);
                }
            }
        });

        // 🎯 Asegurar que el grupo padre esté en la escena
        if (this._enabled && !this._tilesParentGroup.parent) {
            world.scene.three.add(this._tilesParentGroup as THREE.Object3D);
        }

        this._initialized = true;
    }

    private getWorld() {
        if (!this._components) {
            throw new Error("Components not initialized");
        }
        const worlds = this._components.get(OBC.Worlds);
        return worlds.list.values().next().value as OBC.SimpleWorld<
            OBC.SimpleScene,
            OBC.OrthoPerspectiveCamera,
            OBC.SimpleRenderer
        >;
    }
    
    /**
     * Convierte metros a grados de latitud
     * 1° latitud ≈ 111,000 metros
     */
    private metersToLatDegrees(meters: number): number {
        return meters / 111000;
    }
    
    /**
     * Convierte metros a grados de longitud
     * 1° longitud ≈ 111,000 × cos(latitud) metros
     */
    private metersToLonDegrees(meters: number, latitude: number): number {
        const latRad = latitude * THREE.MathUtils.DEG2RAD;
        return meters / (111000 * Math.cos(latRad));
    }
}