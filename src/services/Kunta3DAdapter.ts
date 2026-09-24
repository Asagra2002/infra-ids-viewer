import { Kunta3DBuilding } from './Kunta3DService';
import { BaseCostElement } from '../types/cost/shared';

/**
 * Adaptador simple para el entorno de pruebas de Kunta3D
 * Solo maneja la transformación básica de datos sin lógica de validación
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
   * Transforma los datos básicos de Kunta3D para el cálculo de costos
   * Sin realizar validaciones complejas
   */
  public transformToCostElements(building: Kunta3DBuilding): BaseCostElement[] {
    return building.materials.map((material, index) => {
      // Calcular costos basados en el área y los costos por unidad del material
      const area = material.area || 0;
      const materialCost = material.costs.materialCost * area;
      const laborCost = material.costs.laborCost * area;
      const equipmentCost = material.costs.equipmentCost * area;
      const totalCost = material.costs.totalCost * area;
      const overheadCost = totalCost * 0.1; // 10% del costo total como overhead

      return {
        id: index + 1,
        name: material.name,
        type: material.type,
        category: material.type,
        quantity: area,
        taloCode: material.taloCode || '',
        taloName: material.taloName || '',
        baseQuantities: {
          'Area': {
            value: area,
            unit: 'm²'
          }
        },
        costs: {
          material: materialCost,
          labor: laborCost,
          equipment: equipmentCost,
          overhead: overheadCost,
          total: totalCost
        }
      };
    });
  }

  /**
   * Prepara los datos para el análisis de ciclo de vida
   * Transformación básica sin validaciones complejas
   */
  public transformToLCAData(building: Kunta3DBuilding) {
    return {
      data: building.materials.map(material => ({
        property: material.name,
        value: `${material.area} m²`,
        category: material.type,
        isHeader: false
      })),
      columns: [
        { header: 'Material', dataField: 'property', width: '60%' },
        { header: 'Area', dataField: 'value', width: '40%' }
      ]
    };
  }
} 