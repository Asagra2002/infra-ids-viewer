// Mock data types for Kunta3D
export interface Kunta3DBuilding {
  id: string;
  name: string;
  type: string;
  height: number;
  levels: number;
  footprintArea: number;
  totalArea: number;
  materials: {
    name: string;
    area: number;
    type: string;
    taloCode: string;
    taloName: string;
    lca: {
      globalWarmingPotential: number; // kg CO2 eq
      acidificationPotential: number; // kg SO2 eq
      eutrophicationPotential: number; // kg PO4 eq
      ozoneDepletionPotential: number; // kg CFC-11 eq
      embodiedEnergy: number; // MJ
    };
    costs: {
      materialCost: number; // €/m²
      laborCost: number; // €/m²
      equipmentCost: number; // €/m²
      totalCost: number; // €/m²
    };
  }[];
  energyClass: string;
  constructionYear: number;
  lastRenovation?: number;
  coordinates: {
    lat: number;
    lon: number;
  };
}

export interface Kunta3DResponse {
  buildings: Kunta3DBuilding[];
  timestamp: string;
  source: string;
}

// Mock service class
export class Kunta3DService {
  private static instance: Kunta3DService;
  private mockData: Kunta3DResponse;

  private constructor() {
    // Initialize with mock data based on real IFC files
    this.mockData = {
      buildings: [
        {
          id: "TIMBER_001",
          name: "Nordic Housing Timber",
          type: "Residential",
          height: 8.5,
          levels: 2,
          footprintArea: 120,
          totalArea: 240,
          materials: [
            { 
              name: "Timber Frame", 
              area: 140, 
              type: "Structure",
              taloCode: "1236",
              taloName: "Wooden Frame Elements",
              lca: {
                globalWarmingPotential: 8.2,
                acidificationPotential: 32.5,
                eutrophicationPotential: 4.1,
                ozoneDepletionPotential: 0.0,
                embodiedEnergy: 95000
              },
              costs: {
                materialCost: 95,
                laborCost: 55,
                equipmentCost: 20,
                totalCost: 170
              }
            },
            { 
              name: "Wood Cladding", 
              area: 100, 
              type: "Facade",
              taloCode: "1241",
              taloName: "External Wall Elements",
              lca: {
                globalWarmingPotential: 5.5,
                acidificationPotential: 25.8,
                eutrophicationPotential: 3.2,
                ozoneDepletionPotential: 0.0,
                embodiedEnergy: 65000
              },
              costs: {
                materialCost: 75,
                laborCost: 45,
                equipmentCost: 15,
                totalCost: 135
              }
            }
          ],
          energyClass: "A",
          constructionYear: 2023,
          coordinates: {
            lat: 60.1699,
            lon: 24.9384
          }
        },
        {
          id: "CONCRETE_001",
          name: "Nordic Office Concrete",
          type: "Office",
          height: 12.8,
          levels: 3,
          footprintArea: 450,
          totalArea: 1350,
          materials: [
            {
              name: "Concrete Frame",
              area: 750,
              type: "Structure",
              taloCode: "1232",
              taloName: "Concrete Frame Elements",
              lca: {
                globalWarmingPotential: 185.5,
                acidificationPotential: 450.2,
                eutrophicationPotential: 95.3,
                ozoneDepletionPotential: 0.0,
                embodiedEnergy: 1850000
              },
              costs: {
                materialCost: 850.5,
                laborCost: 650.8,
                equipmentCost: 320.4,
                totalCost: 1821.7
              }
            },
            {
              name: "Glass Facade",
              area: 600,
              type: "Facade",
              taloCode: "1242",
              taloName: "External Glass Elements",
              lca: {
                globalWarmingPotential: 165.8,
                acidificationPotential: 420.5,
                eutrophicationPotential: 85.2,
                ozoneDepletionPotential: 0.0,
                embodiedEnergy: 1650000
              },
              costs: {
                materialCost: 920.5,
                laborCost: 580.3,
                equipmentCost: 280.8,
                totalCost: 1781.6
              }
            }
          ],
          energyClass: "B",
          constructionYear: 2023,
          coordinates: {
            lat: 60.1699,
            lon: 24.9384
          }
        }
      ],
      timestamp: new Date().toISOString(),
      source: "Kunta3D Mock Service"
    };
  }

  public static getInstance(): Kunta3DService {
    if (!Kunta3DService.instance) {
      Kunta3DService.instance = new Kunta3DService();
    }
    return Kunta3DService.instance;
  }

  public async getBuildings(): Promise<Kunta3DResponse> {
    return this.mockData;
  }

  public async getBuildingById(id: string): Promise<Kunta3DBuilding | null> {
    const building = this.mockData.buildings.find(b => b.id === id);
    return building || null;
  }

  public async searchBuildings(query: string): Promise<Kunta3DBuilding[]> {
    const lowerQuery = query.toLowerCase();
    return this.mockData.buildings.filter(building => 
      building.name.toLowerCase().includes(lowerQuery) ||
      building.type.toLowerCase().includes(lowerQuery)
    );
  }
} 