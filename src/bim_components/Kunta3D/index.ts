import * as OBC from "@thatopen/components";
import { Kunta3DService, Kunta3DBuilding } from "../../services/Kunta3DService";
import { Kunta3DAdapter } from "../../adapters/Kunta3DAdapter";
import { BaseCostElement } from "../types/cost/shared";

export class Kunta3DViewer extends OBC.Component {
  static uuid = "e8c1c8a7-7d5c-4b6d-8d1a-9b9b9b9b9b9b";
  private service: Kunta3DService;
  private adapter: Kunta3DAdapter;
  public currentBuilding: Kunta3DBuilding | null = null;
  public currentCostElements: BaseCostElement[] = [];
  public currentLCAData: any = null;
  enabled = true;

  constructor(components: OBC.Components) {
    super(components);
    this.service = Kunta3DService.getInstance();
    this.adapter = Kunta3DAdapter.getInstance();
  }

  async setup() {
    // Initial setup if needed
  }

  async loadBuildings() {
    try {
      const response = await this.service.getBuildings();
      return response.buildings;
    } catch (error) {
      console.error('Error loading Kunta3D buildings:', error);
      throw error;
    }
  }

  async loadBuildingDetails(id: string) {
    try {
      this.currentBuilding = await this.service.getBuildingById(id);
      if (this.currentBuilding) {
        // Transformar datos para costos y LCA
        this.currentCostElements = this.adapter.transformToCostElements(this.currentBuilding);
        this.currentLCAData = this.adapter.transformToLCAData(this.currentBuilding);
      }
      return this.currentBuilding;
    } catch (error) {
      console.error('Error loading building details:', error);
      throw error;
    }
  }

  async searchBuildings(query: string) {
    try {
      return await this.service.searchBuildings(query);
    } catch (error) {
      console.error('Error searching buildings:', error);
      throw error;
    }
  }

  formatBuildingData(building: Kunta3DBuilding) {
    return [
      { property: 'Building ID', value: building.id },
      { property: 'Name', value: building.name },
      { property: 'Type', value: building.type },
      { property: 'Height', value: `${building.height} m` },
      { property: 'Levels', value: building.levels },
      { property: 'Footprint Area', value: `${building.footprintArea} m²` },
      { property: 'Total Area', value: `${building.totalArea} m²` },
      { property: 'Energy Class', value: building.energyClass },
      { property: 'Construction Year', value: building.constructionYear },
      ...(building.lastRenovation ? [{ property: 'Last Renovation', value: building.lastRenovation }] : []),
      { property: 'Location', value: `${building.coordinates.lat}, ${building.coordinates.lon}` }
    ];
  }

  formatMaterialsData(building: Kunta3DBuilding) {
    return building.materials.map(material => ({
      property: material.name,
      value: `${material.area} m² (${material.type})`,
      costs: {
        total: material.costs.totalCost * material.area,
        perUnit: material.costs.totalCost
      },
      lca: {
        gwp: material.lca.globalWarmingPotential * material.area,
        embodiedEnergy: material.lca.embodiedEnergy * material.area
      }
    }));
  }

  getCostSummary() {
    if (!this.currentCostElements.length) return null;

    const totalCosts = this.currentCostElements.reduce(
      (acc, element) => ({
        material: acc.material + element.costs.material,
        labor: acc.labor + element.costs.labor,
        equipment: acc.equipment + element.costs.equipment,
        overhead: acc.overhead + element.costs.overhead,
        total: acc.total + element.costs.total
      }),
      { material: 0, labor: 0, equipment: 0, overhead: 0, total: 0 }
    );

    return {
      totalCosts,
      costByType: this.currentCostElements.reduce((acc, element) => {
        acc[element.type] = (acc[element.type] || 0) + element.costs.total;
        return acc;
      }, {} as { [key: string]: number })
    };
  }

  getLCASummary() {
    if (!this.currentLCAData) return null;

    return {
      totalImpacts: this.currentLCAData.totalImpacts,
      impactsByMaterial: this.currentLCAData.materials.map((material: {
        name: string;
        impacts: {
          gwp: { value: number; unit: string };
          ap: { value: number; unit: string };
          ep: { value: number; unit: string };
          odp: { value: number; unit: string };
          embodiedEnergy: { value: number; unit: string };
        };
      }) => ({
        name: material.name,
        impacts: material.impacts
      }))
    };
  }
} 