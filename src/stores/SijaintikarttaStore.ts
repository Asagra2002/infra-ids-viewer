import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BuildingData {
  coordinates: {
    latitude: number;
    longitude: number;
    elevation: number;
    etrsTM35FIN: {
      x: number;
      y: number;
    };
  };
  dimensions: {
    width: number;
    length: number;
    height: number;
    surface: number;
    volume: number;
  };
  source?: string; // Software origen del modelo IFC (revit, archicad, sketchup, unknown)
  cadastral: {
    propertyNumber: string;
    municipality: string;
    zoning: string;
    landUse: string;
  };
  classification: {
    buildingType: string;
    useCategory: string;
    zoning: string;
    energyClass: string;
  };
  additionalInfo: {
    floors: number;
    rooms: number;
    materials: string[];
    constructionYear: number;
    modelName: string;
    modelType: string;
  };
  // Información adicional de propiedad
  cadastralInfo: {
    propertyId: string;
    landArea: number;
    buildingArea: number;
    ownership: string;
    landUse: string;
    zoningCode: string;
    buildingPermit: string;
    constructionPermit: string;
    occupancyPermit: string;
  };
  buildingDetails: {
    totalRooms: number;
    bedrooms: number;
    bathrooms: number;
    kitchens: number;
    livingRooms: number;
    parkingSpaces: number;
    basement: boolean;
    attic: boolean;
    balcony: boolean;
    garden: boolean;
  };
  technicalInfo: {
    heatingSystem: string;
    coolingSystem: string;
    ventilationSystem: string;
    electricalSystem: string;
    plumbingSystem: string;
    fireProtection: string;
    accessibility: string;
    structuralSystem: string;
  };
}

export interface ProjectInfo {
  name: string;
  description: string;
  location: string;
  municipality: string;
  buildingType: string;
  constructionMethod: string;
  area: number;
  generatedDate: Date;
}

export interface SijaintikarttaData {
  projectInfo: ProjectInfo;
  buildingData: BuildingData;
  gisData?: any; // Datos adicionales de GIS
  lupapisteData?: any; // Datos para Lupapiste
  mapScreenshot?: string; // Base64 del screenshot del mapa para incluir en PDF
}

export interface SijaintikarttaStore {
  // Estado
  sijaintikarttaData: SijaintikarttaData | null;
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  generateSijaintikartta: (projectInfo: ProjectInfo, buildingData: BuildingData) => void;
  setBuildingData: (buildingData: BuildingData) => void;
  setProjectInfo: (projectInfo: ProjectInfo) => void;
  setGISData: (gisData: any) => void;
  setLupapisteData: (lupapisteData: any) => void;
  setMapScreenshot: (screenshot: string) => void;
  clearData: () => void;
  clearDataOnNavigation: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSijaintikarttaStore = create<SijaintikarttaStore>()(
  persist(
    (set, get) => ({
      sijaintikarttaData: null,
      isLoading: false,
      error: null,
      
      generateSijaintikartta: (projectInfo: ProjectInfo, buildingData: BuildingData) => {
        console.log('[SijaintikarttaStore] Saving data to store:');
        console.log('[SijaintikarttaStore] Project info:', projectInfo);
        console.log('[SijaintikarttaStore] Building data coordinates:', buildingData.coordinates);
        
        set({
          sijaintikarttaData: {
            projectInfo,
            buildingData,
            gisData: null,
            lupapisteData: null
          },
          isLoading: false,
          error: null
        });
      },
      
      setBuildingData: (buildingData: BuildingData) => {
        const currentData = get().sijaintikarttaData;
        if (currentData) {
          set({
            sijaintikarttaData: {
              ...currentData,
              buildingData
            }
          });
        }
      },
      
      setProjectInfo: (projectInfo: ProjectInfo) => {
        const currentData = get().sijaintikarttaData;
        if (currentData) {
          set({
            sijaintikarttaData: {
              ...currentData,
              projectInfo
            }
          });
        }
      },
      
      setGISData: (gisData: any) => {
        const currentData = get().sijaintikarttaData;
        if (currentData) {
          set({
            sijaintikarttaData: {
              ...currentData,
              gisData
            }
          });
        }
      },
      
      setLupapisteData: (lupapisteData: any) => {
        const currentData = get().sijaintikarttaData;
        if (currentData) {
          set({
            sijaintikarttaData: {
              ...currentData,
              lupapisteData
            }
          });
        }
      },
      
      setMapScreenshot: (screenshot: string) => {
        const currentData = get().sijaintikarttaData;
        if (currentData) {
          set({
            sijaintikarttaData: {
              ...currentData,
              mapScreenshot: screenshot
            }
          });
        }
      },
      
      clearData: () => {
        set({
          sijaintikarttaData: null,
          isLoading: false,
          error: null
        });
      },
      
      clearDataOnNavigation: () => {
        // Clear data when user navigates away from Site Plan page
        set({
          sijaintikarttaData: null,
          isLoading: false,
          error: null
        });
        console.log('[SijaintikarttaStore] Data cleared due to navigation');
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      setError: (error: string | null) => {
        set({ error });
      }
    }),
    {
      name: 'sijaintikartta-storage',
      partialize: (state) => ({ 
        sijaintikarttaData: state.sijaintikarttaData 
      })
    }
  )
);
