import { BaseAdapter } from './BaseAdapter';
import { AdapterConfig, ExternalMaterialData } from './types';
import { BaseCostElement } from '../types/cost/shared';
import { Kunta3DBuilding } from '../services/Kunta3DService';

/**
 * Adaptador para el entorno de pruebas de Kunta3D
 * Maneja la transformación de datos para LCA y costos
 */
export class Kunta3DAdapter {
  private static instance: Kunta3DAdapter;

  private constructor() {}

  public static getInstance(): Kunta3DAdapter {
    if (!Kunta3DAdapter.instance) {
      Kunta3DAdapter.instance = new Kunta3DAdapter();
    }
    return Kunta3DAdapter.instance;
  }

  /**
   * Transforma los datos de Kunta3D para el cálculo de costos
   */
  public transformToCostElements(building: Kunta3DBuilding): BaseCostElement[] {
    return building.materials.map((material, index) => ({
      id: index + 1,
      name: material.name,
      type: material.type,
      category: material.type,
      quantity: material.area,
      unit: 'm²',
      taloCode: material.taloCode,
      taloName: material.taloName,
      baseQuantities: {
        'Area': {
          value: material.area,
          unit: 'm²'
          }
      },
      costs: {
        material: material.costs.materialCost * material.area,
        labor: material.costs.laborCost * material.area,
        equipment: material.costs.equipmentCost * material.area,
        overhead: material.costs.totalCost * material.area * 0.1,
        total: material.costs.totalCost * material.area
      }
    }));
    }

  /**
   * Transforma los datos para el análisis de ciclo de vida
   */
  public transformToLCAData(building: Kunta3DBuilding) {
    const totalArea = building.materials.reduce((sum, mat) => sum + mat.area, 0);
    
    return {
      buildingData: {
        id: building.id,
        name: building.name,
        totalArea: totalArea,
        constructionYear: building.constructionYear
      },
      materials: building.materials.map(material => ({
        name: material.name,
        area: material.area,
        type: material.type,
        impacts: {
          gwp: {
            value: material.lca.globalWarmingPotential * material.area,
            unit: 'kg CO2 eq'
          },
          ap: {
            value: material.lca.acidificationPotential * material.area,
            unit: 'kg SO2 eq'
          },
          ep: {
            value: material.lca.eutrophicationPotential * material.area,
            unit: 'kg PO4 eq'
          },
          odp: {
            value: material.lca.ozoneDepletionPotential * material.area,
            unit: 'kg CFC-11 eq'
          },
          embodiedEnergy: {
            value: material.lca.embodiedEnergy * material.area,
            unit: 'MJ'
          }
        }
      })),
      totalImpacts: this.calculateTotalImpacts(building.materials)
    };
  }

  /**
   * Calcula los impactos totales del edificio
   */
  private calculateTotalImpacts(materials: Kunta3DBuilding['materials']) {
    return materials.reduce((total, material) => ({
      gwp: total.gwp + (material.lca.globalWarmingPotential * material.area),
      ap: total.ap + (material.lca.acidificationPotential * material.area),
      ep: total.ep + (material.lca.eutrophicationPotential * material.area),
      odp: total.odp + (material.lca.ozoneDepletionPotential * material.area),
      embodiedEnergy: total.embodiedEnergy + (material.lca.embodiedEnergy * material.area)
    }), {
      gwp: 0,
      ap: 0,
      ep: 0,
      odp: 0,
      embodiedEnergy: 0
    });
  }
} 