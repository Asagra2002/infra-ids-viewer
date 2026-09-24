import { Kunta3DAdapter } from '../adapters/Kunta3DAdapter';
import { ExternalSystemData, TransformationResult } from '../adapters/types';
import { BaseCostElement } from '../types/cost/shared';

export class ExternalDataService {
  private static instance: ExternalDataService;
  private kunta3dAdapter: Kunta3DAdapter;

  private constructor() {
    this.kunta3dAdapter = Kunta3DAdapter.getInstance();
  }

  public static getInstance(): ExternalDataService {
    if (!ExternalDataService.instance) {
      ExternalDataService.instance = new ExternalDataService();
    }
    return ExternalDataService.instance;
  }

  /**
   * Transforma datos de Kunta3D al formato interno
   */
  public async transformKunta3DData(data: ExternalSystemData): Promise<TransformationResult> {
    try {
      return await this.kunta3dAdapter.transform(data);
    } catch (error) {
      console.error('Error transforming Kunta3D data:', error);
      return {
        elements: [],
        validation: {
          isValid: false,
          errors: [{
            code: 'TRANSFORMATION_ERROR',
            message: 'Error transforming Kunta3D data',
            field: 'general',
            value: error
          }],
          warnings: []
        },
        metadata: {
          transformedAt: new Date(),
          source: 'kunta3d',
          originalCount: data.elements.length,
          transformedCount: 0
        }
      };
    }
  }

  /**
   * Valida y procesa los resultados de la transformación
   */
  public async processTransformationResult(result: TransformationResult): Promise<BaseCostElement[]> {
    if (!result.validation.isValid) {
      console.warn('Transformation validation failed:', result.validation.errors);
      // Puedes decidir si continuar con los elementos transformados o no
      if (result.validation.errors.some(e => e.code === 'CRITICAL_ERROR')) {
        throw new Error('Critical validation errors found');
      }
    }

    if (result.validation.warnings.length > 0) {
      console.warn('Transformation warnings:', result.validation.warnings);
    }

    // Aquí podrías agregar lógica adicional de procesamiento si es necesario
    return result.elements;
  }

  /**
   * Método de utilidad para validar datos antes de la transformación
   */
  public validateExternalData(data: ExternalSystemData): boolean {
    if (!data || !Array.isArray(data.elements)) {
      return false;
    }

    // Validación básica de la estructura
    return data.elements.every(element => 
      element &&
      typeof element === 'object' &&
      typeof element.name === 'string' &&
      typeof element.type === 'string'
    );
  }

  /**
   * Método para manejar errores específicos de transformación
   */
  public handleTransformationError(error: any): TransformationResult {
    return {
      elements: [],
      validation: {
        isValid: false,
        errors: [{
          code: 'TRANSFORMATION_ERROR',
          message: error.message || 'Unknown transformation error',
          field: 'general',
          value: error
        }],
        warnings: []
      },
      metadata: {
        transformedAt: new Date(),
        source: 'error',
        originalCount: 0,
        transformedCount: 0
      }
    };
  }
} 