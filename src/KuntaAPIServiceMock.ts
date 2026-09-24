import { PreCalculatedGeometry, IFCProperties, MaterialProperties, TALOClassification, ValidationMetadata } from './types';

export interface EnhancedCityGMLData {
    geometry: PreCalculatedGeometry;
    properties: IFCProperties;
    materials: MaterialProperties;
    classifications: TALOClassification;
    metadata: ValidationMetadata;
}

export class KuntaAPIServiceMock {
    private mockData: Map<string, EnhancedCityGMLData>;
    private delay: number;

    constructor(simulatedDelay: number = 500) {
        this.mockData = new Map();
        this.delay = simulatedDelay;
        this.initializeMockData();
    }

    private async initializeMockData() {
        // Housing building mock data based on ARK_NordicLCA_Housing_Timber_IFC4RAVA.ifc
        const housingData: EnhancedCityGMLData = {
            geometry: {
                surfaces: [
                    {
                        id: "wall_1",
                        type: "Wall",
                        area: 24.5,
                        height: 2.8,
                        width: 8.75,
                        normal: { x: 0, y: 1, z: 0 }
                    },
                    // More surfaces will be added
                ],
                volumes: [
                    {
                        id: "room_1",
                        type: "Room",
                        volume: 68.6,
                        boundingSurfaces: ["wall_1"]
                    }
                ],
                totalArea: 245.8,
                totalVolume: 686.24
            },
            properties: {
                buildingType: "Residential",
                storeys: 2,
                constructionType: "Timber Frame",
                yearOfConstruction: 2023
            },
            materials: {
                walls: [
                    {
                        id: "timber_frame_wall",
                        layers: [
                            { material: "timber", thickness: 0.15 },
                            { material: "insulation", thickness: 0.2 },
                            { material: "gypsum_board", thickness: 0.013 }
                        ]
                    }
                ]
            },
            classifications: {
                mainGroup: "Residential Buildings",
                subGroup: "Multi-family Houses",
                detail: "Timber Construction",
                code: "TALO2000-A1.2"
            },
            metadata: {
                lastUpdated: new Date().toISOString(),
                dataQuality: "High",
                validationStatus: "Passed",
                source: "Kunta3D Mock"
            }
        };

        // Office building mock data based on ARK_NordicLCA_Office_Concrete_IFC4RAVA.ifc
        const officeData: EnhancedCityGMLData = {
            geometry: {
                surfaces: [
                    {
                        id: "wall_1",
                        type: "Wall",
                        area: 32.4,
                        height: 3.2,
                        width: 10.12,
                        normal: { x: 0, y: 1, z: 0 }
                    },
                    // More surfaces will be added
                ],
                volumes: [
                    {
                        id: "office_space_1",
                        type: "Office",
                        volume: 103.68,
                        boundingSurfaces: ["wall_1"]
                    }
                ],
                totalArea: 324.8,
                totalVolume: 1036.8
            },
            properties: {
                buildingType: "Office",
                storeys: 3,
                constructionType: "Concrete Frame",
                yearOfConstruction: 2023
            },
            materials: {
                walls: [
                    {
                        id: "concrete_wall",
                        layers: [
                            { material: "concrete", thickness: 0.2 },
                            { material: "insulation", thickness: 0.15 },
                            { material: "concrete_finish", thickness: 0.05 }
                        ]
                    }
                ]
            },
            classifications: {
                mainGroup: "Commercial Buildings",
                subGroup: "Office Buildings",
                detail: "Concrete Construction",
                code: "TALO2000-B1.1"
            },
            metadata: {
                lastUpdated: new Date().toISOString(),
                dataQuality: "High",
                validationStatus: "Passed",
                source: "Kunta3D Mock"
            }
        };

        this.mockData.set("housing_timber", housingData);
        this.mockData.set("office_concrete", officeData);
    }

    async getBuilding(id: string): Promise<EnhancedCityGMLData> {
        await this.simulateNetworkDelay();
        
        const data = this.mockData.get(id);
        if (!data) {
            throw new Error(`Building with ID ${id} not found`);
        }
        
        return data;
    }

    async getBulkBuildings(ids: string[]): Promise<Map<string, EnhancedCityGMLData>> {
        await this.simulateNetworkDelay();
        
        const result = new Map();
        for (const id of ids) {
            const data = this.mockData.get(id);
            if (data) {
                result.set(id, data);
            }
        }
        
        return result;
    }

    private async simulateNetworkDelay(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, this.delay));
    }

    // Helper methods for testing
    setDelay(ms: number) {
        this.delay = ms;
    }

    addMockData(id: string, data: EnhancedCityGMLData) {
        this.mockData.set(id, data);
    }

    clearMockData() {
        this.mockData.clear();
    }
} 