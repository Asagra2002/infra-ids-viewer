import { Kunta3DBuilding } from './Kunta3DService';
import { UNIFIED_RT_DATABASE } from '../data/unifiedRTDatabase';
import { RTKorttiDetails, MaterialCost, CalculatedCostResult } from '../types/cost';
import { BaseCostElement } from '../types/cost/shared';

export interface CrossValidationResult {
  isValid: boolean;
  matchedElements: {
    material: string;
    taloCode: string;
    rtKortti: RTKorttiDetails | null;
    validations: {
      hasValidTaloCode: boolean;
      hasMatchingRTKortti: boolean;
      hasValidQuantities: boolean;
    };
  }[];
  summary: {
    totalElements: number;
    matchedElements: number;
    unmatchedElements: number;
    validationScore: number;
  };
}

export class Kunta3DCrossValidator {
  private static instance: Kunta3DCrossValidator;

  private constructor() {}

  public static getInstance(): Kunta3DCrossValidator {
    if (!Kunta3DCrossValidator.instance) {
      Kunta3DCrossValidator.instance = new Kunta3DCrossValidator();
    }
    return Kunta3DCrossValidator.instance;
  }

  /**
   * Realiza la validación cruzada de los datos de Kunta3D
   */
  public validateKunta3DData(building: Kunta3DBuilding): CrossValidationResult {
    const result: CrossValidationResult = {
      isValid: false,
      matchedElements: [],
      summary: {
        totalElements: building.materials.length,
        matchedElements: 0,
        unmatchedElements: 0,
        validationScore: 0
      }
    };

    // Validar cada material del edificio
    for (const material of building.materials) {
      const validationResult = this.validateMaterial(material);
      result.matchedElements.push(validationResult);

      if (validationResult.rtKortti) {
        result.summary.matchedElements++;
      } else {
        result.summary.unmatchedElements++;
      }
    }

    // Calcular puntuación de validación (0-100)
    result.summary.validationScore = (result.summary.matchedElements / result.summary.totalElements) * 100;
    result.isValid = result.summary.validationScore >= 70; // Umbral de 70% para considerar válido

    return result;
  }

  /**
   * Transforma los datos de Kunta3D en elementos de costo validados
   */
  public transformToCostElements(building: Kunta3DBuilding): BaseCostElement[] {
    return building.materials.map((material, index) => {
      const rtKortti = this.findMatchingRTKortti(material.taloCode, material.type);
      const area = parseFloat(material.area.toString()) || 0;

      // Usar costos del RT-kortti si está disponible, o costos por defecto si no
      const costs = rtKortti?.defaultCosts || {
        material: 0,
        labor: 0,
        equipment: 0,
        overhead: 0,
        total: 0
      };

      return {
        id: index + 1,
        name: material.name,
        type: material.type,
        quantity: area,
        taloCode: material.taloCode,
        taloName: material.taloName || '',
        baseQuantities: {
          'Area': {
            value: area,
            unit: 'm²'
          }
        },
        costs: {
          material: costs.material || 0,
          labor: costs.labor || 0,
          equipment: costs.equipment || 0,
          overhead: costs.overhead || 0,
          total: costs.total || 0
        }
      };
    });
  }

  private validateMaterial(material: { name: string; type: string; taloCode: string; area: number }): {
    material: string;
    taloCode: string;
    rtKortti: RTKorttiDetails | null;
    validations: {
      hasValidTaloCode: boolean;
      hasMatchingRTKortti: boolean;
      hasValidQuantities: boolean;
    };
  } {
    const rtKortti = this.findMatchingRTKortti(material.taloCode, material.type);

    return {
      material: material.name,
      taloCode: material.taloCode,
      rtKortti: rtKortti,
      validations: {
        hasValidTaloCode: Boolean(material.taloCode && material.taloCode.match(/^\d+/)),
        hasMatchingRTKortti: rtKortti !== null,
        hasValidQuantities: material.area > 0
      }
    };
  }

  private findMatchingRTKortti(taloCode: string, type: string): RTKorttiDetails | null {
    // Primero buscar por código TALO exacto
    const exactMatch = Object.values(UNIFIED_RT_DATABASE).find(
      rt => rt.code === taloCode
    );
    if (exactMatch) return exactMatch;

    // Si no hay coincidencia exacta, buscar por tipo de elemento IFC
    return Object.values(UNIFIED_RT_DATABASE).find(
      rt => rt.applicableIfcTypes?.includes(type)
    ) || null;
  }
} 