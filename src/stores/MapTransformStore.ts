import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MapTransform {
  // Posición del modelo
  longitude: number;
  latitude: number;
  elevation: number;
  
  // Rotación y escala
  rotation: number;
  scale: number;
  
  // Ajustes de desplazamiento (en metros)
  offsetX: number; // Este/Oeste
  offsetY: number; // Norte/Sur
  offsetZ: number; // Arriba/Abajo
  
  // Vista actual
  currentView: 'top' | 'north' | 'south' | 'east' | 'west';
  
  // Configuración de desplazamiento
  displacementStep: number; // en metros (0.01 a 1.0)
}

export interface MapTransformStore {
  // Estado
  transform: MapTransform;
  
  // Acciones
  setTransform: (transform: Partial<MapTransform>) => void;
  setView: (view: MapTransform['currentView']) => void;
  setDisplacementStep: (step: number) => void;
  
  // Desplazamientos
  moveNorth: (distance?: number) => void;
  moveSouth: (distance?: number) => void;
  moveEast: (distance?: number) => void;
  moveWest: (distance?: number) => void;
  moveUp: (distance?: number) => void;
  moveDown: (distance?: number) => void;
  
  // Reset
  resetTransform: () => void;
  resetOffsets: () => void;
}

const defaultTransform: MapTransform = {
  longitude: 24.89088102611111,
  latitude: 60.21112395305556,
  elevation: 0,
  rotation: 0,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  currentView: 'top',
  displacementStep: 0.1 // 10cm por defecto
};

export const useMapTransformStore = create<MapTransformStore>()(
  persist(
    (set, get) => ({
      transform: defaultTransform,
      
      setTransform: (newTransform) => {
        set((state) => ({
          transform: { ...state.transform, ...newTransform }
        }));
      },
      
      setView: (view) => {
        set((state) => ({
          transform: { ...state.transform, currentView: view }
        }));
      },
      
      setDisplacementStep: (step) => {
        // Validar que el paso esté entre 0.01 y 1.0 metros
        const validStep = Math.max(0.01, Math.min(1.0, step));
        set((state) => ({
          transform: { ...state.transform, displacementStep: validStep }
        }));
      },
      
      moveNorth: (distance) => {
        const { transform } = get();
        const step = distance || transform.displacementStep;
        set((state) => ({
          transform: {
            ...state.transform,
            offsetY: state.transform.offsetY + step
          }
        }));
      },
      
      moveSouth: (distance) => {
        const { transform } = get();
        const step = distance || transform.displacementStep;
        set((state) => ({
          transform: {
            ...state.transform,
            offsetY: state.transform.offsetY - step
          }
        }));
      },
      
      moveEast: (distance) => {
        const { transform } = get();
        const step = distance || transform.displacementStep;
        set((state) => ({
          transform: {
            ...state.transform,
            offsetX: state.transform.offsetX + step
          }
        }));
      },
      
      moveWest: (distance) => {
        const { transform } = get();
        const step = distance || transform.displacementStep;
        set((state) => ({
          transform: {
            ...state.transform,
            offsetX: state.transform.offsetX - step
          }
        }));
      },
      
      moveUp: (distance) => {
        const { transform } = get();
        const step = distance || transform.displacementStep;
        set((state) => ({
          transform: {
            ...state.transform,
            offsetZ: state.transform.offsetZ + step
          }
        }));
      },
      
      moveDown: (distance) => {
        const { transform } = get();
        const step = distance || transform.displacementStep;
        set((state) => ({
          transform: {
            ...state.transform,
            offsetZ: state.transform.offsetZ - step
          }
        }));
      },
      
      resetTransform: () => {
        set({ transform: defaultTransform });
      },
      
      resetOffsets: () => {
        set((state) => ({
          transform: {
            ...state.transform,
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0
          }
        }));
      }
    }),
    {
      name: 'map-transform-storage',
      partialize: (state) => ({ transform: state.transform })
    }
  )
);
