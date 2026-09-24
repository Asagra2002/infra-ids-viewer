import * as OBC from "@thatopen/components";
import * as THREE from "three";
import { Ion } from "@cesium/engine";
// widgets.css cargado desde public/cesium/ via index.html (evita depender de node_modules en Netlify)
import { GisLayer2D, GisLayer3D } from "./src";

export class GisLayers extends OBC.Component {
    static uuid = "2d73e5fd-ec03-45a3-8422-520d72868661" as const;
    enabled = true;

    layer2d: GisLayer2D;
    layer3d: GisLayer3D;
    private _cesiumToken: string | null = null;

    get cesiumToken(): string {
        if(!this._cesiumToken) {
            throw new Error("Cesium token is not initialized");
        }
        return this._cesiumToken;
    }

    set cesiumToken(value: string) {
        this._cesiumToken = value;
        Ion.defaultAccessToken = value;
        this.layer3d.notifyTokenChanged();
    }

    constructor(components: OBC.Components) {
        super(components);
        (window as any).CESIUM_BASE_URL = "/cesium/";
        
        this.layer2d = new GisLayer2D({
            initialLat: 60.211124,
            initialLon: 24.890881,
            zoom: 16,
            height: "180px",
        });
        
        this.layer3d = new GisLayer3D(components);
        
        // 🎯 Configurar auto-alineación cuando se cargan los tiles
        this.layer3d.onTilesLoaded = () => {
            this.autoAlignGround().then(offset => {
                if (offset !== null) {
                    console.log(`✅ Ground auto-aligned on tileset load: ${offset.toFixed(2)}m`);
                }
            }).catch(e => {
                console.warn("⚠️ Could not auto-align ground on load:", e);
            });
        };
    }
    
    /**
     * Sincroniza las coordenadas de GIS con las del modelo IFC
     * @param latitude Latitud en grados decimales
     * @param longitude Longitud en grados decimales
     * @param rotation Rotación en grados (opcional)
     * @param elevation Elevación en metros (opcional)
     */
    syncWithIFCLocation(latitude: number, longitude: number, rotation: number = 0, elevation: number = 0) {
        console.log(`🌍 IFC coordinates synced: lat=${latitude.toFixed(6)}, lon=${longitude.toFixed(6)}, elev=${elevation}m, rotation=${rotation}°`);
        // Mantener offsets actuales (0 si es primera vez)
        this.layer3d.setCoordinates(latitude, longitude, rotation, elevation, this.layer3d.offsetX, this.layer3d.offsetZ);
        // Actualizar mapa 2D si está inicializado
        if (this.layer2d.isInitialized) {
            this.layer2d.setLocation(latitude, longitude);
        }
    }
    
    /**
     * Auto-alinea el suelo del IFC con el terreno GIS
     * Usa el nivel Y=0 del viewer (malla de suelo) como referencia
     * @returns El offset aplicado, o null si no se pudo calcular
     */
    async autoAlignGround(): Promise<number | null> {
        try {
            // 🎯 PASO 1: Obtener la Y de la malla del viewer (worldGrid)
            const worldGrid = (window as any).worldGrid;
            
            if (!worldGrid) {
                console.warn("⚠️ World grid not found (make sure viewer is initialized)");
                return null;
            }
            
            const viewerGridY = worldGrid.three.position.y;
            console.log(`📏 Viewer grid Y: ${viewerGridY.toFixed(2)}m`);
            
            // 🎯 PASO 2: Usar raycast para encontrar la intersección exacta con el terreno GIS
            const gisGroundY = await this.getGISGroundYWithRaycast();
            
            if (gisGroundY === null) {
                console.warn("⚠️ Could not find GIS ground with raycast");
                return null;
            }
            
            console.log(`📏 GIS ground Y (raycast): ${gisGroundY.toFixed(2)}m`);
            
            // 🎯 PASO 3: Calcular offset para alinear las mallas
            const offset = viewerGridY - gisGroundY;
            
            console.log(`📐 Offset needed: ${offset.toFixed(2)}m`);
            
            // 🎯 PASO 4: Aplicar el offset (mantener offsets X/Z actuales)
            this.layer3d.setCoordinates(
                this.layer3d.latitude,
                this.layer3d.longitude,
                this.layer3d.rotation,
                offset,
                this.layer3d.offsetX,
                this.layer3d.offsetZ
            );
            
            console.log(`✅ Ground aligned: viewer=${viewerGridY.toFixed(2)}m, GIS=${gisGroundY.toFixed(2)}m → offset=${offset.toFixed(2)}m`);
            
            return offset;
        } catch (e) {
            console.error("❌ Error in autoAlignGround:", e);
            return null;
        }
    }
    
    /**
     * Calcula la altura del terreno GIS en la ubicación del edificio IFC
     * Muestrea el GIS en un radio XZ alrededor del centro del IFC
     * @returns La altura mediana del terreno bajo el edificio, o null si no está listo
     */
    /**
     * Usa raycast para encontrar la intersección exacta del terreno GIS bajo el edificio
     */
    private async getGISGroundYWithRaycast(): Promise<number | null> {
        const group = this.layer3d._tilesParentGroup;
        if (!group) {
            return null;
        }
        
        // Esperar a que los tiles se carguen
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            // 🎯 PASO 1: Calcular el centro XZ del IFC
            const worlds = this.components.get(OBC.Worlds);
            const world = worlds.list.values().next().value as OBC.SimpleWorld;
            const scene = world.scene.three;
            
            const ifcBbox = new THREE.Box3();
            let ifcMeshCount = 0;
            
            const isInGIS = (obj: any): boolean => {
                let p = obj;
                while (p) {
                    if (p === group) return true;
                    p = p.parent;
                }
                return false;
            };
            
            scene.traverse((obj: any) => {
                if (!obj.isMesh || isInGIS(obj)) return;
                const pos = obj.geometry?.attributes?.position;
                if (!pos || typeof pos.getX !== 'function') return;
                
                try {
                    for (let i = 0; i < Math.min(pos.count, 100); i++) {
                        const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
                        v.applyMatrix4(obj.matrixWorld);
                        ifcBbox.expandByPoint(v);
                    }
                    ifcMeshCount++;
                } catch (e) {}
            });
            
            if (ifcBbox.isEmpty() || ifcMeshCount === 0) {
                console.warn("⚠️ Could not calculate IFC center for raycast");
                return null;
            }
            
            const ifcCenter = new THREE.Vector3();
            ifcBbox.getCenter(ifcCenter);
            
            // 🎯 PASO 2: Resetear posición del GIS temporalmente para raycast preciso
            const originalY = group.position.y;
            group.position.y = 0;
            group.updateMatrixWorld(true);
            
            // 🎯 PASO 3: Crear raycaster desde el centro del IFC hacia abajo
            const raycaster = new THREE.Raycaster();
            const origin = new THREE.Vector3(ifcCenter.x, 1000, ifcCenter.z); // Empezar desde muy arriba
            const direction = new THREE.Vector3(0, -1, 0); // Hacia abajo
            
            raycaster.set(origin, direction);
            
            // 🎯 PASO 4: Encontrar intersecciones SOLO con el GIS (excluir IFC)
            const intersects: THREE.Intersection[] = [];
            group.traverse((obj: any) => {
                if (obj.isMesh) {
                    const hits = raycaster.intersectObject(obj, false);
                    intersects.push(...hits);
                }
            });
            
            // Ordenar por distancia (más cercana primero)
            intersects.sort((a, b) => a.distance - b.distance);
            
            // 🎯 PASO 5: Restaurar posición original del GIS
            group.position.y = originalY;
            group.updateMatrixWorld(true);
            
            if (intersects.length === 0) {
                console.warn("⚠️ Raycast did not hit GIS terrain");
                return null;
            }
            
            // La primera intersección es la más cercana (desde arriba)
            const groundY = intersects[0].point.y;
            
            console.log(`🎯 Raycast hit GIS terrain at Y=${groundY.toFixed(2)}m (${intersects.length} intersections found)`);
            
            return groundY;
        } catch (e) {
            console.error("Error in raycast:", e);
            return null;
        }
    }
    
    /**
     * Calcula la elevación Y del terreno GIS bajo el edificio IFC (método anterior con muestreo)
     * @deprecated Usar getGISGroundYWithRaycast() en su lugar
     */
    private async getGISGroundY_OLD(): Promise<number | null> {
        const group = this.layer3d._tilesParentGroup;
        if (!group) {
            return null;
        }
        
        // Esperar más tiempo para asegurar que los tiles centrales estén cargados
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            // 🎯 PASO 1: Calcular el centro XYZ del IFC
            const worlds = this.components.get(OBC.Worlds);
            const world = worlds.list.values().next().value as OBC.SimpleWorld;
            const scene = world.scene.three;
            
            const ifcBbox = new THREE.Box3();
            let ifcMeshCount = 0;
            
            const isInGIS = (obj: any): boolean => {
                let p = obj;
                while (p) {
                    if (p === group) return true;
                    p = p.parent;
                }
                return false;
            };
            
            scene.traverse((obj: any) => {
                if (!obj.isMesh || isInGIS(obj)) return;
                const pos = obj.geometry?.attributes?.position;
                if (!pos || typeof pos.getX !== 'function') return;
                
                try {
                    for (let i = 0; i < Math.min(pos.count, 100); i++) {
                        const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
                        v.applyMatrix4(obj.matrixWorld);
                        ifcBbox.expandByPoint(v);
                    }
                    ifcMeshCount++;
                } catch (e) {}
            });
            
            if (ifcBbox.isEmpty() || ifcMeshCount === 0) {
                console.warn("⚠️ Could not calculate IFC center");
                return null;
            }
            
            const ifcCenter = new THREE.Vector3();
            ifcBbox.getCenter(ifcCenter);
            
            // 🎯 PASO 2: Resetear posición del GIS temporalmente
            const originalY = group.position.y;
            group.position.y = 0;
            group.updateMatrixWorld(true);
            
            // 🎯 PASO 3: Muestrear GIS en radio XZ alrededor del IFC
            const radius = 50; // Radio de muestreo en metros
            const heightSamples: number[] = [];
            
            group.traverse((obj: any) => {
                if (!obj.isMesh) return;
                const pos = obj.geometry?.attributes?.position;
                if (!pos) return;
                
                try {
                    const step = Math.max(1, Math.floor(pos.count / 100));
                    
                    for (let i = 0; i < pos.count; i += step) {
                        const x = typeof pos.getX === 'function' ? pos.getX(i) : pos.array[i * 3];
                        const y = typeof pos.getY === 'function' ? pos.getY(i) : pos.array[i * 3 + 1];
                        const z = typeof pos.getZ === 'function' ? pos.getZ(i) : pos.array[i * 3 + 2];
                        
                        const v = new THREE.Vector3(x, y, z);
                        v.applyMatrix4(obj.matrixWorld);
                        
                        // Distancia horizontal al centro del IFC
                        const distXZ = Math.sqrt(
                            Math.pow(v.x - ifcCenter.x, 2) + 
                            Math.pow(v.z - ifcCenter.z, 2)
                        );
                        
                        if (distXZ <= radius) {
                            heightSamples.push(v.y);
                        }
                    }
                } catch (e) {}
            });
            
            // 🎯 PASO 4: Restaurar posición original del GIS
            group.position.y = originalY;
            group.updateMatrixWorld(true);
            
            if (heightSamples.length === 0) {
                console.warn(`⚠️ No GIS terrain samples found within ${radius}m of building`);
                return null;
            }
            
            // Usar mediana para robustez contra outliers
            heightSamples.sort((a, b) => a - b);
            const medianHeight = heightSamples[Math.floor(heightSamples.length / 2)];
            
            return medianHeight;
        } catch (e) {
            console.error("Error calculating GIS ground elevation:", e);
            return null;
        }
    }
}