import * as React from "react";
import * as THREE from "three";
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "../ui-templates/components3";
import { appIcons, CONTENT_GRID_ID } from "../globals";
import { viewportSettingsTemplate } from "../ui-templates/components3/viewportSettings";
import { GisLayers } from "../bim_components";
import { CostCalculator } from "../bim_components/Cost";
import { LCACalculator } from "../bim_components/LCA";
import { setupMCPWebSocket } from "../bim_components/setup";
import {
  setViewerSelection,
} from "../ui-templates/components3/visualizationToolbar";
import { setLastClipperHit } from "../ui-templates/components3/clipperToolbar";

interface IntegratedViewerProps {
  components: OBC.Components;
  ifcFilePath?: string;
  containerId: string;
  isVisible: boolean;
  projectData?: any;
  setIsEditModalOpen: (isOpen: boolean) => void;
}

export function IntegratedViewer({ components, ifcFilePath, containerId, isVisible, projectData, setIsEditModalOpen }: IntegratedViewerProps) {
  const componentsRef = React.useRef<OBC.Components>();
  const viewportSelectionTeardownRef = React.useRef<(() => void) | null>(null);
  const viewCubeTeardownRef = React.useRef<(() => void) | null>(null);
  const [isViewerReady, setIsViewerReady] = React.useState(false);

  React.useEffect(() => {
    if (!isVisible) {
      setIsViewerReady(false);
      return;
    }
    
    const initViewer = async () => {
      try {
        const container = document.getElementById(containerId);
        if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
          requestAnimationFrame(initViewer);
          return;
        }
        
        BUI.Manager.init();
        const worldComponents = new OBC.Components();
        componentsRef.current = worldComponents;
        
        try {
          const g: any = window as any;
          if (!g.viewerReady) {
            g.__viewerReadyResolved = false;
            g.viewerReady = new Promise<void>((resolve) => {
              g.__viewerReadyResolve = () => {
                if (!g.__viewerReadyResolved) {
                  g.__viewerReadyResolved = true;
                  resolve();
                }
              };
            });
          }
        } catch {}
        
        const worlds = worldComponents.get(OBC.Worlds);
        const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBF.PostproductionRenderer>();

        world.name = "Main";
        world.scene = new OBC.SimpleScene(worldComponents);
        world.scene.setup();
        world.scene.three.background = new THREE.Color(0x1a1d23);

        const viewport = BUI.Component.create<BUI.Viewport>(() => {
          return BUI.html`<bim-viewport></bim-viewport>`;
        });

        world.renderer = new OBF.PostproductionRenderer(worldComponents, viewport);
        world.camera = new OBC.OrthoPerspectiveCamera(worldComponents);
        world.camera.threePersp.near = 0.01;
        world.camera.threePersp.updateProjectionMatrix();
        world.camera.controls.restThreshold = 0.05;

        const worldGrid = worldComponents.get(OBC.Grids).create(world);
        worldGrid.material.uniforms.uColor.value = new THREE.Color(0x494b50);

        const resizeWorld = () => {
          setTimeout(() => {
            world.renderer?.resize();
            world.camera.updateAspect();
          }, 10);
        };

        viewport.addEventListener("resize", resizeWorld);
        worldComponents.init();

        // Setup MCP WebSocket connection
        setupMCPWebSocket(worldComponents);

        worldComponents.add(GisLayers.uuid, new GisLayers(worldComponents));

        // Initialize IDS Validator
        const { IDSValidator } = await import("../bim_components/IDS");
        const idsValidator = new IDSValidator(worldComponents);
        (window as any).idsValidator = idsValidator; // Expose for debugging

        const costCalculator = new CostCalculator(worldComponents);
        const lcaCalculator = new LCACalculator(worldComponents);

        (window as any).costCalculator = costCalculator;
        (window as any).lcaCalculator = lcaCalculator;
        (window as any).runFullCostAnalysis = () => costCalculator.analyzeCompleteModel();
        (window as any).runFullLCAAnalysis = () => lcaCalculator.analyzeCompleteModel();

        // Exponer referencias solo en desarrollo para diagnóstico GIS
        if (import.meta.env.DEV) {
          (window as any).OBC = OBC;
          (window as any).worldComponents = worldComponents;
          (window as any).world = world;
          (window as any).gisLayers = worldComponents.get(GisLayers);
          (window as any).scene = world.scene.three;
          (window as any).THREE = THREE;
          (window as any).worldGrid = worldGrid;
          console.log("🔎 Diagnóstico GIS listo: usa window.scene, window.gisLayers, window.worldGrid, window.OBC, window.vizDiagnose (tras cargar /diagnose-viz-toolbar.js)");
        }

        const fragments = worldComponents.get(OBC.FragmentsManager);
        fragments.init("/fragments-worker/worker.mjs");

        // 🎯 INTENTO AGRESIVO: Desactivar dispose en TODAS las propiedades posibles
        const fragsAny = fragments as any;
        
        // Intentar todas las variantes posibles de configuración
        const configPaths = [
          'config.disposeOnCheck',
          'settings.disposeOnCheck',
          'disposeOnCheck',
          'options.disposeOnCheck',
          'core.config.disposeOnCheck',
          'core.settings.disposeOnCheck'
        ];
        
        for (const path of configPaths) {
          try {
            const parts = path.split('.');
            let obj = fragsAny;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!obj[parts[i]]) obj[parts[i]] = {};
              obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = false;
            console.log(`✅ [Config] ${path} = false`);
          } catch (e) {
            // Ignorar errores silenciosamente
          }
        }
        
        // Intentar interceptar el método dispose si existe
        if (fragsAny.core && fragsAny.core.dispose) {
          const originalDispose = fragsAny.core.dispose;
          fragsAny.core.dispose = function(...args: any[]) {
            console.log("⚠️ [INTERCEPT] dispose() llamado - intentando prevenir...");
            // No llamar al dispose original
            return;
          };
        }

        // ====================================================================
        // 🎯 FUNCIÓN AUXILIAR: Extraer coordenadas IFC (adaptado de IFCMapViewer)
        // ====================================================================
        const extractIFCLocation = async (model: any): Promise<{ latitude: number; longitude: number; rotation: number; elevation: number } | null> => {
          try {
            // Esperar un poco para que el modelo esté completamente cargado
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (typeof model.getSpatialStructure !== 'function') {
              console.warn('[extractIFCLocation] getSpatialStructure no disponible');
              return null;
            }
            
            const spatial = await model.getSpatialStructure();
            if (!spatial) {
              console.warn('[extractIFCLocation] No se pudo obtener estructura espacial');
              return null;
            }
            
            // 1️⃣ ESTRATEGIA 1: Buscar IfcSite en el árbol espacial
            const findSiteInTree = (node: any): any => {
              const cat = String(node?._category?.value || node?._category || '').toUpperCase();
              const typ = String(node?.type || '').toUpperCase();
              if (cat === 'IFCSITE' || typ === 'IFCSITE' || cat.includes('SITE') || typ.includes('SITE')) return node;
              if (node?.children && Array.isArray(node.children)) {
                for (const c of node.children) {
                  const found = findSiteInTree(c);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const siteNode = findSiteInTree(spatial);
            console.log('[extractIFCLocation] Búsqueda en árbol:', { found: !!siteNode, localId: siteNode?.localId });
            
            if (siteNode?.localId) {
              try {
                const dataArr = await model.getItemsData([Number(siteNode.localId)], { attributesDefault: true });
                if (Array.isArray(dataArr) && dataArr.length > 0) {
                  const site = dataArr[0];
                  const refLatitude = Array.isArray((site as any).RefLatitude) ? (site as any).RefLatitude : (site as any).RefLatitude?.value;
                  const refLongitude = Array.isArray((site as any).RefLongitude) ? (site as any).RefLongitude : (site as any).RefLongitude?.value;
                  const elevation = (site as any).RefElevation?.value || 0;
                  
                  if (refLatitude && refLongitude) {
                    console.log('✅ [extractIFCLocation] Site encontrado en árbol');
                    const convertDMSToDecimal = (dms: any): number => {
                      if (typeof dms === 'number') return dms;
                      if (Array.isArray(dms) && dms.length >= 3) {
                        const degrees = dms[0], minutes = dms[1], seconds = dms[2], microseconds = dms[3] || 0;
                        const isNegative = degrees < 0;
                        const absDegrees = Math.abs(degrees), absMinutes = Math.abs(minutes), absSeconds = Math.abs(seconds), absMicroseconds = Math.abs(microseconds);
                        const decimalDegrees = absDegrees + (absMinutes / 60) + (absSeconds / 3600) + (absMicroseconds / 3600000000);
                        return isNegative ? -decimalDegrees : decimalDegrees;
                      }
                      return 0;
                    };
                    
                    return {
                      latitude: convertDMSToDecimal(refLatitude),
                      longitude: convertDMSToDecimal(refLongitude),
                      elevation: elevation,
                      rotation: 0
                    };
                  }
                }
              } catch (e) {
                console.warn('[extractIFCLocation] Error en getItemsData del site, intentando fallback:', e);
              }
            }
            
            // 2️⃣ ESTRATEGIA 2 (FALLBACK): Escanear TODOS los elementos buscando coordenadas
            console.log('[extractIFCLocation] 🔄 Activando fallback: escaneando todos los elementos...');
            
            const collectIds = (root: any): number[] => {
              const ids: number[] = [];
              const stack: any[] = [root];
              while (stack.length) {
                const n = stack.pop();
                const lid = Number(n?.localId);
                if (Number.isFinite(lid) && lid > 0) ids.push(lid);
                if (n?.children && Array.isArray(n.children)) stack.push(...n.children);
              }
              return ids.slice(0, 500); // Limitar a 500 para rendimiento
            };
            
            const localIds = collectIds(spatial);
            console.log(`[extractIFCLocation] Fallback: escaneando ${localIds.length} elementos...`);
            
            if (localIds.length > 0 && typeof model.getItemsData === 'function') {
              const chunkSize = 100;
              for (let i = 0; i < localIds.length; i += chunkSize) {
                const chunk = localIds.slice(i, i + chunkSize);
                try {
                  const dataArr = await model.getItemsData(chunk, { attributesDefault: true });
                  if (Array.isArray(dataArr)) {
                    for (const item of dataArr) {
                      const cat = String(item?._category?.value || item?._category || item?.type || '').toUpperCase();
                      const refLat = (item as any)?.RefLatitude?.value || (item as any)?.RefLatitude;
                      const refLon = (item as any)?.RefLongitude?.value || (item as any)?.RefLongitude;
                      
                      // Si tiene coordenadas (sea IfcSite o no), usar ese elemento
                      if (cat.includes('IFCSITE') || (Array.isArray(refLat) && Array.isArray(refLon))) {
                        console.log(`✅ [extractIFCLocation] Coordenadas encontradas en fallback (${cat})`);
                        const elevation = (item as any)?.RefElevation?.value || 0;
                        
                        const convertDMSToDecimal = (dms: any): number => {
                          if (typeof dms === 'number') return dms;
                          if (Array.isArray(dms) && dms.length >= 3) {
                            const degrees = dms[0], minutes = dms[1], seconds = dms[2], microseconds = dms[3] || 0;
                            const isNegative = degrees < 0;
                            const absDegrees = Math.abs(degrees), absMinutes = Math.abs(minutes), absSeconds = Math.abs(seconds), absMicroseconds = Math.abs(microseconds);
                            const decimalDegrees = absDegrees + (absMinutes / 60) + (absSeconds / 3600) + (absMicroseconds / 3600000000);
                            return isNegative ? -decimalDegrees : decimalDegrees;
                          }
                          return 0;
                        };
                        
                        return {
                          latitude: convertDMSToDecimal(refLat),
                          longitude: convertDMSToDecimal(refLon),
                          elevation: elevation,
                          rotation: 0
                        };
                      }
                    }
                  }
                } catch (e) {
                  console.warn(`[extractIFCLocation] Error escaneando chunk ${i}-${i+chunkSize}:`, e);
                }
              }
            }
            
            console.warn('⚠️ [extractIFCLocation] No se encontraron coordenadas IFC después del fallback');
            return null;
          } catch (error) {
            console.error('[extractIFCLocation] Error crítico:', error);
            return null;
          }
        };

        // ====================================================================
        // 🎯 GESTIÓN DE GEOMETRÍA PARA MAPA (glTF)
        // ====================================================================
        
        // Limpiar geometría previa al inicializar
        (window as any)._MAP_READY_GEOMETRY = [];
        
        // 🎯 Guardar ifcFilePath en window para que esté disponible en todos los closures
        (window as any)._CURRENT_IFC_PATH = ifcFilePath;
        
        // 🎯 Guardar ArrayBuffer del IFC para doble carga (sin necesidad del path)
        (window as any)._CURRENT_IFC_BUFFER = null;
        
        // Función para limpiar geometría previa (útil cuando se carga un nuevo modelo)
        (window as any)._clearMapGeometry = () => {
          (window as any)._MAP_READY_GEOMETRY = [];
        };

        const processFragment = (fragment: any) => {
          if (!fragment.mesh || !fragment.mesh.geometry) {
            return;
          }
          
          const mesh = fragment.mesh;
          const pos = mesh.geometry.attributes.position;
          if (!pos || pos.count === 0) {
            return;
          }

          const hasArray = pos.array !== null && pos.array !== undefined;
          const arrayLength = hasArray ? pos.array.byteLength : 0;

          try {
            const safeGeo = new THREE.BufferGeometry();
            const count = pos.count;
            const newPos = new Float32Array(count * 3);
            
            if (hasArray && arrayLength > 0) {
              newPos.set(pos.array as Float32Array);
            } else {
              try {
                const testX = pos.getX(0);
                for (let i = 0; i < count; i++) {
                  newPos[i * 3] = pos.getX(i);
                  newPos[i * 3 + 1] = pos.getY(i);
                  newPos[i * 3 + 2] = pos.getZ(i);
                }
              } catch (e) {
                return;
              }
            }
            
            safeGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
            
            if (mesh.geometry.index) {
              const idx = mesh.geometry.index;
              const hasIdxArray = idx.array !== null && idx.array !== undefined;
              const newIdx = (count > 65535) ? new Uint32Array(idx.count) : new Uint16Array(idx.count);
              
              if (hasIdxArray) {
                newIdx.set(idx.array as Uint16Array | Uint32Array);
              } else {
                for (let i = 0; i < idx.count; i++) newIdx[i] = idx.getX(i);
              }
              safeGeo.setIndex(new THREE.BufferAttribute(newIdx as any, 1));
            }
            
            const norm = mesh.geometry.attributes.normal;
            if (norm) {
              const newNorm = new Float32Array(count * 3);
              const hasNormArray = norm.array !== null && norm.array !== undefined;
              
              if (hasNormArray) {
                newNorm.set(norm.array as Float32Array);
              } else {
                for (let i = 0; i < count; i++) {
                  newNorm[i * 3] = norm.getX(i);
                  newNorm[i * 3 + 1] = norm.getY(i);
                  newNorm[i * 3 + 2] = norm.getZ(i);
                }
              }
              safeGeo.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
            }

            const name = (mesh.name || "").toLowerCase();
            const isGlass = name.includes("glass") || name.includes("window") || name.includes("vidrio") || name.includes("glazing");

            // 🎯 CORREGIR TRANSFORMACIÓN: Usar la matriz correcta del fragmento
            // Si el mesh está en la escena, usar matrixWorld (ya incluye todas las transformaciones)
            // Si no, usar la matriz del fragmento directamente
            let finalMatrix = new THREE.Matrix4();
            
            // Estrategia 1: Si el mesh está en la escena, usar matrixWorld (más confiable)
            if (mesh.matrixWorld && !mesh.matrixWorld.equals(new THREE.Matrix4())) {
              // matrixWorld ya incluye todas las transformaciones del parent
              finalMatrix.copy(mesh.matrixWorld);
            } 
            // Estrategia 2: Si el fragmento tiene su propia matriz
            else if (fragment.matrix) {
              finalMatrix.copy(fragment.matrix);
            }
            // Estrategia 3: Usar la matriz local del mesh
            else if (mesh.matrix && !mesh.matrix.equals(new THREE.Matrix4())) {
              finalMatrix.copy(mesh.matrix);
              // Si tiene parent, multiplicar
              if (mesh.parent && mesh.parent.matrixWorld) {
                finalMatrix.premultiply(mesh.parent.matrixWorld);
              }
            }
            // Estrategia 4: Matriz identidad (geometría ya en coordenadas mundiales)
            else {
              finalMatrix.identity();
            }

            if (mesh.isInstancedMesh) {
              for (let i = 0; i < mesh.count; i++) {
                const instanceMatrix = new THREE.Matrix4();
                mesh.getMatrixAt(i, instanceMatrix);
                
                // Combinar: finalMatrix * instanceMatrix
                const combinedMatrix = finalMatrix.clone().multiply(instanceMatrix);
                
                (window as any)._MAP_READY_GEOMETRY.push({
                  geometry: safeGeo.clone(), // Clonar para cada instancia
                  matrix: combinedMatrix,
                  isGlass
                });
              }
            } else {
              (window as any)._MAP_READY_GEOMETRY.push({
                geometry: safeGeo,
                matrix: finalMatrix,
                isGlass
              });
            }
          } catch (e) {
            // Error silencioso - fragmento no procesable
          }
        };

        // Escuchador seguro para la carga de fragmentos
        const setupInterceptor = () => {
          // 🎯 ESTRATEGIA PRINCIPAL: Usar onFragmentsLoaded (API 3.2.2) - CAPTURA TEMPRANA
          const frags = fragments as any;
          
          // Intentar múltiples variantes del evento
          const loadEvent = frags.onFragmentsLoaded || frags.onFragmentLoaded || frags.onLoaded || (frags.core && frags.core.onFragmentsLoaded);
          
          if (loadEvent && typeof loadEvent.add === 'function') {
            loadEvent.add((group: any) => {
              let allFragments: any[] = [];
              
              if (group.fragments) {
                const list = (group.fragments instanceof Map) 
                  ? Array.from(group.fragments.values()) 
                  : Object.values(group.fragments);
                allFragments.push(...list);
              }
              
              if (group.items && Array.isArray(group.items)) {
                allFragments.push(...group.items);
              }
              
              try {
                const allModels = Array.from(fragments.list.values());
                for (const model of allModels) {
                  const modelAny = model as any;
                  if (modelAny.fragments) {
                    const list = (modelAny.fragments instanceof Map) 
                      ? Array.from(modelAny.fragments.values()) 
                      : Object.values(modelAny.fragments);
                    allFragments.push(...list);
                  }
                }
              } catch (e) {
                // Error silencioso
              }
              
              const uniqueFragments = new Map();
              allFragments.forEach((f: any) => {
                const key = f?.mesh?.uuid || f?.uuid || Math.random();
                if (!uniqueFragments.has(key)) {
                  uniqueFragments.set(key, f);
                }
              });
              const finalList = Array.from(uniqueFragments.values());
              
              finalList.forEach((f: any) => {
                try {
                  if (f && f.mesh && f.mesh.geometry) {
                    const pos = f.mesh.geometry.attributes.position;
                    if (pos && pos.array && pos.array.byteLength > 0) {
                      processFragment(f);
                    }
                  }
                } catch (e) {
                  // Error silencioso
                }
              });
            });
          }

          // 🎯 ESTRATEGIA SECUNDARIA: Usar onItemSet y buscar en fragments.list
        fragments.list.onItemSet.add(async ({ value: model }) => {
          
          // 🎯 Intentar obtener el path del modelo si no está disponible
          if (!(window as any)._CURRENT_IFC_PATH) {
            const modelAny = model as any;
            // Intentar obtener el path de diferentes propiedades del modelo
            const possiblePath = modelAny.path || modelAny.filePath || modelAny.url || modelAny.name;
            if (possiblePath) {
              (window as any)._CURRENT_IFC_PATH = possiblePath;
            } else {
              // Si no hay path, intentar usar el ifcFilePath de props (puede estar disponible ahora)
              if (ifcFilePath) {
                (window as any)._CURRENT_IFC_PATH = ifcFilePath;
              }
            }
          }
          
          // 🌍 SINCRONIZAR COORDENADAS CON GIS
          try {
            const ifcLocation = await extractIFCLocation(model);
            if (ifcLocation) {
              const gisLayers = worldComponents.get(GisLayers);
              gisLayers.syncWithIFCLocation(
                ifcLocation.latitude,
                ifcLocation.longitude,
                ifcLocation.rotation || 0,
                ifcLocation.elevation || 0
              );
            } else {
              console.warn("⚠️ No coordinates found in IFC model. GIS will use default coordinates.");
            }
          } catch (e) {
            console.warn("⚠️ Error syncing IFC coordinates:", e);
          }
          
          // 🧹 LIMPIAR geometría previa cuando se carga un nuevo modelo
          (window as any)._MAP_READY_GEOMETRY = [];
          
          // Esperar un momento para que los fragmentos se carguen
          setTimeout(async () => {
              try {
                // Buscar en fragments.list (API 3.2.2)
                const allModels = Array.from(fragments.list.values());
                
                for (const m of allModels) {
                  const modelAny = m as any;
                  
                  
                  // Estrategia 1: model.fragments
                  if (modelAny.fragments) {
                    const list = (modelAny.fragments instanceof Map) 
                      ? Array.from(modelAny.fragments.values()) 
                      : Object.values(modelAny.fragments);
                    list.forEach((f: any) => {
                      try {
                        processFragment(f);
                      } catch (e) {
                      }
                    });
                  }
                  
                  // Estrategia 2: Buscar en model.object (Three.js scene) - solo si tiene arrays
                  if (modelAny.object) {
                    let foundWithArrays = 0;
                    let foundWithoutArrays = 0;
                    modelAny.object.traverse((child: any) => {
                      if (child.isMesh || child.isInstancedMesh) {
                        try {
                          // Solo procesar si tiene array disponible
                          const pos = child.geometry?.attributes?.position;
                          if (pos && pos.array && pos.array.byteLength > 0) {
                            const fakeFragment = { mesh: child };
                            processFragment(fakeFragment);
                            foundWithArrays++;
                          } else {
                            foundWithoutArrays++;
                          }
                        } catch (e) {
                          // Ignorar errores silenciosamente
                        }
                      }
                    });
                  }
                }
              } catch (e) {
              }
            }, 100);
          });
        };

        setupInterceptor();

        // 🎯 DOBLE CARGA: Función para cargar IFC una segunda vez solo para exportar
        (window as any)._loadIFCForExport = async (ifcPathOrBuffer?: string | ArrayBuffer) => {
          try {
            let buffer: ArrayBuffer;
            if (ifcPathOrBuffer instanceof ArrayBuffer) {
              buffer = ifcPathOrBuffer;
            } else if ((window as any)._CURRENT_IFC_BUFFER) {
              buffer = (window as any)._CURRENT_IFC_BUFFER;
            } else if (ifcPathOrBuffer) {
              const response = await fetch(ifcPathOrBuffer);
              buffer = await response.arrayBuffer();
            } else {
              throw new Error("No hay ArrayBuffer guardado ni path disponible para doble carga");
            }
            
            const tempComponents = new OBC.Components();
            const tempFragments = tempComponents.get(OBC.FragmentsManager);
            await tempFragments.init("/fragments-worker/worker.mjs");
            
            let captured = 0;
            const tempFragsAny = tempFragments as any;
            const capturePromise = new Promise<void>((resolve) => {
              if (tempFragsAny.onFragmentsLoaded && typeof tempFragsAny.onFragmentsLoaded.add === 'function') {
                const handler = (group: any) => {
                  if (group.fragments) {
                    const list = (group.fragments instanceof Map) 
                      ? Array.from(group.fragments.values()) 
                      : Object.values(group.fragments);
                    list.forEach((f: any) => {
                      try {
                        if (f && f.mesh && f.mesh.geometry) {
                          const pos = f.mesh.geometry.attributes.position;
                          if (pos && pos.array && pos.array.byteLength > 0) {
                            processFragment(f);
                            captured++;
                          }
                        }
                      } catch (e) {
                        // Ignorar errores
                      }
                    });
                  }
                  resolve();
                };
                tempFragsAny.onFragmentsLoaded.add(handler);
                setTimeout(() => resolve(), 5000);
              } else {
                resolve();
              }
            });
            
            const tempIfcLoader = tempComponents.get(OBC.IfcLoader);
            await tempIfcLoader.setup({
              autoSetWasm: false,
              wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
              webIfc: { COORDINATE_TO_ORIGIN: true, USE_FAST_BOOLS: false }
            });
            
            const uint8Array = new Uint8Array(buffer);
            const model = await tempIfcLoader.load(uint8Array, true, "export-model");
            
            if (!model) {
              throw new Error("Failed to load IFC for export");
            }
            
            await capturePromise;
            
            if (captured === 0) {
              const modelAny = model as any;
              
              if (modelAny.fragments) {
                const list = (modelAny.fragments instanceof Map) 
                  ? Array.from(modelAny.fragments.values()) 
                  : Object.values(modelAny.fragments);
                list.forEach((f: any) => {
                  try {
                    if (f && f.mesh && f.mesh.geometry) {
                      const pos = f.mesh.geometry.attributes.position;
                      if (pos && pos.array && pos.array.byteLength > 0) {
                        processFragment(f);
                        captured++;
                      }
                    }
                  } catch (e) {
                    // Ignorar errores
                  }
                });
              }
              
              if (modelAny.items && captured === 0) {
                modelAny.items.forEach((f: any) => {
                  try {
                    if (f && f.mesh && f.mesh.geometry) {
                      const pos = f.mesh.geometry.attributes.position;
                      if (pos && pos.array && pos.array.byteLength > 0) {
                        processFragment(f);
                        captured++;
                      }
                    }
                  } catch (e) {
                    // Ignorar errores
                  }
                });
              }
              
              if (modelAny.object && captured === 0) {
                modelAny.object.traverse((child: any) => {
                  if (child.isMesh || child.isInstancedMesh) {
                    try {
                      const pos = child.geometry?.attributes?.position;
                      if (pos && pos.array && pos.array.byteLength > 0) {
                        const fakeFragment = { mesh: child };
                        processFragment(fakeFragment);
                        captured++;
                      }
                    } catch (e) {
                      // Ignorar errores
                    }
                  }
                });
              }
            }
            
            model.dispose();
            tempComponents.dispose();
            
            return captured > 0;
          } catch (e) {
            return false;
          }
        };

        (window as any).exportCurrentModelToGLTF = async () => {
          let sourceData = (window as any)._MAP_READY_GEOMETRY || [];
          
          const currentIfcPath = (window as any)._CURRENT_IFC_PATH || ifcFilePath;
          const currentIfcBuffer = (window as any)._CURRENT_IFC_BUFFER;
          
          if (sourceData.length < 50 && (currentIfcPath || currentIfcBuffer)) {
            try {
              await (window as any)._loadIFCForExport(currentIfcBuffer || currentIfcPath);
              sourceData = (window as any)._MAP_READY_GEOMETRY || [];
            } catch (e) {
              // Error silencioso
            }
          }
          
          const finalData = (window as any)._MAP_READY_GEOMETRY || [];
          
          if (finalData.length < 5) {
            console.warn("⚠️ Geometría insuficiente después de todos los intentos.");
            return null;
          }

          const exportScene = new THREE.Scene();
          const solidMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee, side: THREE.DoubleSide });
          const glassMat = new THREE.MeshLambertMaterial({ color: 0xaaccff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });

          finalData.forEach((data: any) => {
            const mesh = new THREE.Mesh(data.geometry, data.isGlass ? glassMat : solidMat);
            mesh.applyMatrix4(data.matrix);
            exportScene.add(mesh);
          });

          const exporter = new GLTFExporter();
          return new Promise<Blob>((resolve, reject) => {
            exporter.parse(exportScene, (gltf) => {
              resolve(new Blob([gltf as ArrayBuffer], { type: 'application/octet-stream' }));
            }, (err) => reject(err), { binary: true });
          });
        };
        // ====================================================================

        const ifcLoader = worldComponents.get(OBC.IfcLoader);
        
        // 🎯 INTERCEPTAR ifcLoader.load para capturar ArrayBuffer de cualquier fuente
        const originalLoad = ifcLoader.load.bind(ifcLoader);
        ifcLoader.load = async (data: Uint8Array, coordinateToOrigin?: boolean, name?: string) => {
          // Guardar el ArrayBuffer antes de cargar
          const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
          (window as any)._CURRENT_IFC_BUFFER = buffer;
          
          // Llamar al método original con valores por defecto si son undefined
          return originalLoad(data, coordinateToOrigin ?? true, name ?? '');
        };
        
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
          webIfc: { 
            COORDINATE_TO_ORIGIN: true, 
            USE_FAST_BOOLS: false,
            TOLERANCE_PLANE_INTERSECTION: 0.000001
          }
        });

        const highlighter = worldComponents.get(OBF.Highlighter);
        highlighter.setup({ world });

        // Setup Raycasters (required for Clipper double-click creation)
        worldComponents.get(OBC.Raycasters).get(world);

        // Clipper: creation via toolbar (Create Clipper button after clicking a face)

        // Exponer componentes globalmente para acceso desde el panel IDS
        if (import.meta.env.DEV) {
          (window as any).worldComponents = worldComponents;
          (window as any).OBC = OBC;
          (window as any).OBF = OBF;
        }

        const { SimpleQTO } = await import("../bim_components/SimpleQTO");
        const simpleQTO = new SimpleQTO(worldComponents);
        (window as any).simpleQTO = simpleQTO;

        const bcfTopics = worldComponents.get(OBC.BCFTopics);
        const viewpoints = worldComponents.get(OBC.Viewpoints);
        if (!bcfTopics.isSetup) bcfTopics.setup({ author: "RAVA Validator", version: "2.1" });
        viewpoints.world = world;
        const { BCFTool } = await import("../bim_components/BCF");
        new BCFTool(worldComponents);

        fragments.list.onItemSet.add(async ({ value: model }) => {
          
          // 🧹 LIMPIAR geometría previa
          (window as any)._MAP_READY_GEOMETRY = [];
          
          // 🎯 INTENTAR CAPTURA ANTES de añadir a la escena (arrays pueden estar disponibles)
          try {
            const modelAny = model as any;
            if (modelAny.fragments) {
              const list = (modelAny.fragments instanceof Map) 
                ? Array.from(modelAny.fragments.values()) 
                : Object.values(modelAny.fragments);
              let preCaptured = 0;
              list.forEach((f: any) => {
                try {
                  if (f && f.mesh && f.mesh.geometry) {
                    const pos = f.mesh.geometry.attributes.position;
                    if (pos && pos.array && pos.array.byteLength > 0) {
                      processFragment(f);
                      preCaptured++;
                    }
                  }
                } catch (e) {
                  // Ignorar errores
                }
              });
            }
          } catch (e) {
          }
          
          model.useCamera(world.camera.three);
          model.getClippingPlanesEvent = () =>
            Array.from((world.renderer as any)?.three?.clippingPlanes ?? []) || [];
          world.scene.three.add(model.object);
          await fragments.core.update(true);

          // 🎯 CAPTURA DESPUÉS DEL UPDATE: Captura completa de todos los fragmentos disponibles
          try {
            const allModels = Array.from(fragments.list.values());
            
            let totalFound = 0;
            let totalCaptured = 0;
            let totalSkipped = 0;
            
            
            for (const m of allModels) {
              const modelAny = m as any;
              
              // Estrategia 1: model.fragments (directo) - solo si tiene arrays
              if (modelAny.fragments) {
                const list = (modelAny.fragments instanceof Map) 
                  ? Array.from(modelAny.fragments.values()) 
                  : Object.values(modelAny.fragments);
                totalFound += list.length;
                list.forEach((f: any) => {
                  try {
                    if (f && f.mesh && f.mesh.geometry) {
                      const pos = f.mesh.geometry.attributes.position;
                      if (pos && pos.array && pos.array.byteLength > 0) {
                        processFragment(f);
                        totalCaptured++;
                      } else {
                        totalSkipped++;
                      }
                    }
                  } catch (e) {
                    totalSkipped++;
                  }
                });
              }
              
              if (modelAny.object && modelAny.object.children) {
                try {
                  modelAny.object.traverse((child: any) => {
                    if (child.isMesh || child.isInstancedMesh) {
                      totalFound++;
                      try {
                        const pos = child.geometry?.attributes?.position;
                        if (pos && pos.array && pos.array.byteLength > 0) {
                          const fakeFragment = { mesh: child };
                          processFragment(fakeFragment);
                          totalCaptured++;
                        } else {
                          totalSkipped++;
                        }
                      } catch (e) {
                        totalSkipped++;
                      }
                    }
                  });
                } catch (e) {
                  // Error silencioso
                }
              }
              
              try {
                const core = (fragments as any).core;
                if (core && core.fragments) {
                  const coreFrags = core.fragments instanceof Map 
                    ? Array.from(core.fragments.values())
                    : Object.values(core.fragments);
                  totalFound += coreFrags.length;
                  coreFrags.forEach((f: any) => {
                    try {
                      if (f && f.mesh && f.mesh.geometry) {
                        const pos = f.mesh.geometry.attributes.position;
                        if (pos && pos.array && pos.array.byteLength > 0) {
                          processFragment(f);
                          totalCaptured++;
                        } else {
                          totalSkipped++;
                        }
                      }
                    } catch (e) {
                      totalSkipped++;
                    }
                  });
                }
              } catch (e) {
                // Error silencioso
              }
            }
            
            if (totalSkipped > 20) {
              const currentIfcBuffer = (window as any)._CURRENT_IFC_BUFFER;
              if (currentIfcBuffer) {
                setTimeout(async () => {
                  try {
                    await (window as any)._loadIFCForExport(currentIfcBuffer);
                  } catch (e) {
                    // Error silencioso
                  }
                }, 1000);
              }
            }
            
            const currentIfcPath = (window as any)._CURRENT_IFC_PATH || ifcFilePath;
            const currentIfcBuffer = (window as any)._CURRENT_IFC_BUFFER;
            
            if (totalSkipped > 20 && (currentIfcPath || currentIfcBuffer)) {
              setTimeout(async () => {
                try {
                  await (window as any)._loadIFCForExport(currentIfcBuffer || currentIfcPath);
                } catch (e) {
                  // Error silencioso
                }
              }, 500);
            }
          } catch (e) {
            // Error silencioso
          }

          try {
            const g: any = window as any;
            if (g && typeof g.__viewerReadyResolve === 'function') {
              g.__viewerReadyResolve();
              g.__viewerReadyResolve = null;
            }
          } catch {}
        });

        const viewportCardTemplate = () => BUI.html`
          <div class="dashboard-card" style="padding: 0px; height: 100%;">
            ${viewport}
          </div>
        `;

        const [contentGrid] = BUI.Component.create<BUI.Grid<any, any>, any>(TEMPLATES.contentGridTemplate, {
          components: worldComponents,
          id: CONTENT_GRID_ID,
          viewportTemplate: viewportCardTemplate,
          projectData: projectData || {},
          setIsEditModalOpen,
        });

        const [sidebarToggleToolbar] = BUI.Component.create(TEMPLATES.sidebarToggleToolbarTemplate, {
          components: worldComponents,
          gridId: CONTENT_GRID_ID,
        });
        viewport.appendChild(sidebarToggleToolbar);

        const overlayWrapper = document.createElement("div");
        overlayWrapper.style.cssText =
          "position: absolute; top: 16px; right: 31px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;";

        const { element: viewCube, teardown: viewCubeTeardown } =
          TEMPLATES.createViewCubeWithModelOrientation(worldComponents, world);
        overlayWrapper.appendChild(viewCube);

        const [overlayPanel] = BUI.Component.create(TEMPLATES.viewerOverlayPanelTemplate, {
          components: worldComponents,
        });
        overlayWrapper.appendChild(overlayPanel);
        viewCubeTeardownRef.current = viewCubeTeardown;

        viewport.appendChild(overlayWrapper);

        // Click on viewport/canvas to select element for visualization toolbar (hide/show/isolate/zoom to selection)
        const getCanvas = (): HTMLCanvasElement | null => {
          const r = world.renderer as any;
          return r?.three?.domElement ?? r?.domElement ?? viewport.querySelector?.("canvas") ?? null;
        };
        const setupViewportSelection = (): (() => void) | undefined => {
          const canvas = getCanvas();
          if (!canvas) {
            if (import.meta.env.DEV) console.log("[VizToolbar] setupViewportSelection: canvas not found yet");
            return undefined;
          }
          if (!fragments.initialized) {
            if (import.meta.env.DEV) console.log("[VizToolbar] setupViewportSelection: fragments not initialized yet");
            return undefined;
          }
          const onSelect = async (e: MouseEvent) => {
            // FragmentsManager.raycast espera mouse en coordenadas "raw" (clientX/clientY), como SimpleRaycaster.mouse.rawPosition
            const mouse = new THREE.Vector2(e.clientX, e.clientY);
            try {
              const result = await fragments.raycast({
                camera: world.camera.three,
                mouse,
                dom: canvas as HTMLCanvasElement,
              });
              if (result) {
                const highlighter = worldComponents.get(OBF.Highlighter);
                if (result.fragments?.modelId != null && result.localId != null) {
                  const modelId = result.fragments.modelId;
                  const modelIdMap = { [modelId]: new Set([result.localId]) };
                  setViewerSelection(modelIdMap);
                  // Exponer selección para el cliente WebSocket MCP
                  (window as any).__viewerSelection = modelIdMap;
                  await highlighter.highlightByID("select", modelIdMap, true, false);
                  if (import.meta.env.DEV) console.log("[VizToolbar] Selection set:", { modelId, localId: result.localId });
                } else {
                  setViewerSelection(null);
                  highlighter.clear("select");
                }
                const point = result.point?.clone?.();
                let normal = result.normal?.clone?.();
                if (point) {
                  if (!normal || normal.manhattanLength() < 0.001) {
                    const cam = world.camera.three as THREE.PerspectiveCamera;
                    normal = cam?.position
                      ? new THREE.Vector3().subVectors(point, cam.position).normalize()
                      : new THREE.Vector3(0, 1, 0);
                  }
                  setLastClipperHit({ point, normal });
                }
              } else {
                setViewerSelection(null);
                try {
                  worldComponents.get(OBF.Highlighter).clear("select");
                } catch (_) {}
              }
            } catch (err) {
              if (import.meta.env.DEV) console.warn("[VizToolbar] Raycast error", err);
            }
          };
          canvas.addEventListener("pointerdown", onSelect, { capture: true });
          if (import.meta.env.DEV) console.log("[VizToolbar] Viewport selection listener attached to canvas");
          return () => canvas.removeEventListener("pointerdown", onSelect, { capture: true });
        };
        const trySetupSelection = () => {
          viewportSelectionTeardownRef.current?.();
          viewportSelectionTeardownRef.current = null;
          const teardown = setupViewportSelection();
          if (teardown) viewportSelectionTeardownRef.current = teardown;
        };
        trySetupSelection();
        setTimeout(trySetupSelection, 500);
        setTimeout(trySetupSelection, 2000);
        fragments.list.onItemSet.add(() => {
          trySetupSelection();
        });

        const setInitialLayout = () => {
          if (window.location.hash) {
            const hash = window.location.hash.slice(1) as TEMPLATES.ContentGridLayouts[number];
            if (Object.keys(contentGrid.layouts).includes(hash)) {
              contentGrid.layout = hash;
            } else {
              contentGrid.layout = "ProjectView";
              window.location.hash = "ProjectView";
            }
          } else {
            window.location.hash = "ProjectView";
            contentGrid.layout = "ProjectView";
          }
        };
        setInitialLayout();

        const app = document.getElementById(containerId) as BUI.Grid<any, any>;
        const contentGridIcons: Record<TEMPLATES.ContentGridLayouts[number], string> = {
          Viewer: appIcons.MODEL,
          ViewerFull: appIcons.MODEL,
          Queries: appIcons.SEARCH,
          QueriesFull: appIcons.SEARCH,
          ProjectView: appIcons.MODEL,
        };

        app.elements = {
          sidebar: {
            template: TEMPLATES.gridSidebarTemplate as any, 
            initialState: { grid: contentGrid, compact: true, layoutIcons: contentGridIcons } 
          },
          contentGrid,
        };
        app.layouts = { App: { template: `"sidebar contentGrid" 1fr /auto 1fr` } };
        app.layout = "App";
        
            setTimeout(() => {
          if (contentGrid && !document.getElementById(CONTENT_GRID_ID)) {
            try { app.appendChild(contentGrid as any); } catch (err) {}
          }
         }, 100);

        if (ifcFilePath) {
          // 🎯 Actualizar el path guardado cuando se carga el archivo
          (window as any)._CURRENT_IFC_PATH = ifcFilePath;
          
          fetch(ifcFilePath).then(r => r.arrayBuffer()).then(buffer => {
            // 🎯 GUARDAR ArrayBuffer para doble carga
            (window as any)._CURRENT_IFC_BUFFER = buffer;
            
            ifcLoader.load(new Uint8Array(buffer), true, "model");
          });
        } else {
          // Si no hay ifcFilePath en props, intentar obtenerlo del modelo cargado
        }

           setTimeout(() => {
             resizeWorld();
          setIsViewerReady(true);
        }, 300);

      } catch (error) {
        console.error("Error during viewer setup:", error);
      }
    };

    initViewer();
    return () => {
      viewCubeTeardownRef.current?.();
      viewportSelectionTeardownRef.current?.();
      viewportSelectionTeardownRef.current = null;
      if (componentsRef.current) componentsRef.current.dispose();
    };
  }, [isVisible, ifcFilePath, containerId]);

  return null;
}
