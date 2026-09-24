/**
 * Building Dimension Service
 * Manejo especializado de dimensiones para diferentes tipos de edificios y software BIM
 */

export interface BuildingDimensions {
  width: number;
  length: number;
  height: number;
  surface: number;
  volume: number;
  floors: number;
  source: string;
  buildingType: string;
  confidence: number; // 0-1, qué tan confiables son las dimensiones
}

export interface DimensionValidation {
  isValid: boolean;
  warnings: string[];
  suggestedCorrections: {
    factor?: number;
    reason: string;
  }[];
  buildingType: string;
  estimatedFloors: number;
}

export class BuildingDimensionService {
  private static instance: BuildingDimensionService;
  
  // Límites realistas por tipo de edificio
  private readonly BUILDING_LIMITS = {
    residential: {
      minArea: 20, maxArea: 1000, // m²
      minHeight: 2.4, maxHeight: 30, // m
      minVolume: 50, maxVolume: 30000, // m³
      typicalFloors: { min: 1, max: 10 }
    },
    commercial: {
      minArea: 50, maxArea: 50000, // m²
      minHeight: 3, maxHeight: 100, // m
      minVolume: 150, maxVolume: 1500000, // m³
      typicalFloors: { min: 1, max: 30 }
    },
    industrial: {
      minArea: 100, maxArea: 1000000, // m²
      minHeight: 4, maxHeight: 200, // m
      minVolume: 400, maxVolume: 200000000, // m³
      typicalFloors: { min: 1, max: 15 }
    },
    warehouse: {
      minArea: 200, maxArea: 500000, // m²
      minHeight: 6, maxHeight: 150, // m
      minVolume: 1200, maxVolume: 75000000, // m³
      typicalFloors: { min: 1, max: 8 }
    },
    factory: {
      minArea: 500, maxArea: 2000000, // m²
      minHeight: 8, maxHeight: 300, // m
      minVolume: 4000, maxVolume: 600000000, // m³
      typicalFloors: { min: 1, max: 20 }
    }
  };

  // Factores de corrección por software y tipo de edificio
  private readonly CORRECTION_FACTORS = {
    revit: {
      residential: { min: 0.001, max: 1.0, typical: 0.001 },
      commercial: { min: 0.0001, max: 1.0, typical: 0.001 },
      industrial: { min: 0.00001, max: 0.001, typical: 0.0001 },
      warehouse: { min: 0.00001, max: 0.001, typical: 0.0001 },
      factory: { min: 0.000001, max: 0.0001, typical: 0.00001 }
    },
    archicad: {
      residential: { min: 0.001, max: 1.0, typical: 0.001 },
      commercial: { min: 0.0001, max: 1.0, typical: 0.001 },
      industrial: { min: 0.00001, max: 0.001, typical: 0.0001 },
      warehouse: { min: 0.00001, max: 0.001, typical: 0.0001 },
      factory: { min: 0.000001, max: 0.0001, typical: 0.00001 }
    },
    sketchup: {
      residential: { min: 1.0, max: 1000, typical: 100 },
      commercial: { min: 1.0, max: 1000, typical: 100 },
      industrial: { min: 1.0, max: 10000, typical: 1000 },
      warehouse: { min: 1.0, max: 10000, typical: 1000 },
      factory: { min: 1.0, max: 100000, typical: 10000 }
    },
    unknown: {
      residential: { min: 0.0001, max: 1.0, typical: 0.001 },
      commercial: { min: 0.00001, max: 0.1, typical: 0.001 },
      industrial: { min: 0.000001, max: 0.01, typical: 0.0001 },
      warehouse: { min: 0.000001, max: 0.01, typical: 0.0001 },
      factory: { min: 0.0000001, max: 0.001, typical: 0.00001 }
    }
  };

  private constructor() {}

  static getInstance(): BuildingDimensionService {
    if (!BuildingDimensionService.instance) {
      BuildingDimensionService.instance = new BuildingDimensionService();
    }
    return BuildingDimensionService.instance;
  }

  /**
   * Analiza y corrige dimensiones de edificio
   */
  analyzeAndCorrectDimensions(
    rawDimensions: { width: number; length: number; height: number },
    source: string,
    modelName?: string
  ): BuildingDimensions {
    // Detectar tipo de edificio
    const buildingType = this.detectBuildingType(rawDimensions, modelName);
    // Validar dimensiones
    const validation = this.validateDimensions(rawDimensions, source, buildingType);

    // Aplicar correcciones si es necesario
    let correctedDimensions = { ...rawDimensions };
    let correctionFactor = 1.0;
    let confidence = 1.0;

    if (!validation.isValid && validation.suggestedCorrections.length > 0) {
      const bestCorrection = validation.suggestedCorrections[0];
      if (bestCorrection.factor) {
        correctionFactor = bestCorrection.factor;
        correctedDimensions = {
          width: rawDimensions.width * correctionFactor,
          length: rawDimensions.length * correctionFactor,
          height: rawDimensions.height * correctionFactor
        };
        confidence = 0.8; // Reducir confianza después de corrección
        console.log('[BuildingDimensionService] Applied correction factor:', correctionFactor);
      }
    }

    // Calcular dimensiones derivadas
    const surface = correctedDimensions.width * correctedDimensions.length;
    const volume = surface * correctedDimensions.height;
    const floors = this.estimateFloors(correctedDimensions.height, buildingType);

    const result: BuildingDimensions = {
      ...correctedDimensions,
      surface,
      volume,
      floors,
      source,
      buildingType,
      confidence
    };

    console.log(`✅ [dims/result] type=${result.buildingType} size=${result.width.toFixed(1)}×${result.length.toFixed(1)}×${result.height.toFixed(1)}m floors=${result.floors} surface=${result.surface.toFixed(1)}m² volume=${result.volume.toFixed(1)}m³ conf=${result.confidence}`);
    return result;
  }

  /**
   * Detecta el tipo de edificio basado en dimensiones y nombre
   */
  private detectBuildingType(
    dimensions: { width: number; length: number; height: number },
    modelName?: string
  ): string {
    const area = dimensions.width * dimensions.length;
    const volume = area * dimensions.height;
    const name = modelName?.toLowerCase() || '';

    // 1. Detectar por palabras clave generales en el nombre
    const buildingTypeKeywords = {
      factory: ['factory', 'industrial', 'manufacturing', 'production', 'plant'],
      warehouse: ['warehouse', 'storage', 'logistics', 'distribution'],
      commercial: ['office', 'commercial', 'business', 'retail', 'shopping', 'mall'],
      residential: ['residential', 'house', 'apartment', 'home', 'dwelling', 'housing']
    };

    for (const [buildingType, keywords] of Object.entries(buildingTypeKeywords)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return buildingType;
      }
    }

    // 2. Detectar por dimensiones (más confiable)
    if (area > 100000 || volume > 10000000) return 'factory';
    if (area > 10000 || volume > 1000000) return 'warehouse';
    if (area > 1000 || volume > 100000) return 'commercial';
    if (area > 100 || volume > 10000) return 'residential';

    // 3. Detectar por proporciones geométricas
    const heightToAreaRatio = dimensions.height / area;
    const widthToLengthRatio = dimensions.width / dimensions.length;
    
    if (heightToAreaRatio > 0.1) return 'commercial'; // Edificios altos
    if (heightToAreaRatio < 0.01) return 'warehouse'; // Edificios bajos y anchos
    if (widthToLengthRatio > 3 || widthToLengthRatio < 0.33) return 'warehouse'; // Alargados

    // 4. Default basado en tamaño
    if (area > 500) return 'commercial';
    else return 'residential';
  }

  /**
   * Valida dimensiones contra límites realistas
   */
  private validateDimensions(
    dimensions: { width: number; length: number; height: number },
    source: string,
    buildingType: string
  ): DimensionValidation {
    const area = dimensions.width * dimensions.length;
    const volume = area * dimensions.height;
    const limits = this.BUILDING_LIMITS[buildingType as keyof typeof this.BUILDING_LIMITS];
    const corrections = this.CORRECTION_FACTORS[source as keyof typeof this.CORRECTION_FACTORS];
    
    const warnings: string[] = [];
    const suggestedCorrections: { factor?: number; reason: string }[] = [];

    // Validar área
    if (area < limits.minArea) {
      warnings.push(`Area (${area.toFixed(2)}m²) is too small for ${buildingType} (min: ${limits.minArea}m²)`);
      suggestedCorrections.push({
        factor: Math.sqrt(limits.minArea / area),
        reason: `Increase area to minimum ${limits.minArea}m²`
      });
    }
    if (area > limits.maxArea) {
      warnings.push(`Area (${area.toFixed(2)}m²) is too large for ${buildingType} (max: ${limits.maxArea}m²)`);
      suggestedCorrections.push({
        factor: Math.sqrt(limits.maxArea / area),
        reason: `Reduce area to maximum ${limits.maxArea}m²`
      });
    }

    // Validar altura
    if (dimensions.height < limits.minHeight) {
      warnings.push(`Height (${dimensions.height.toFixed(2)}m) is too small for ${buildingType} (min: ${limits.minHeight}m)`);
      suggestedCorrections.push({
        factor: limits.minHeight / dimensions.height,
        reason: `Increase height to minimum ${limits.minHeight}m`
      });
    }
    if (dimensions.height > limits.maxHeight) {
      warnings.push(`Height (${dimensions.height.toFixed(2)}m) is too large for ${buildingType} (max: ${limits.maxHeight}m)`);
      suggestedCorrections.push({
        factor: limits.maxHeight / dimensions.height,
        reason: `Reduce height to maximum ${limits.maxHeight}m`
      });
    }

    // Validar volumen
    if (volume < limits.minVolume) {
      warnings.push(`Volume (${volume.toFixed(2)}m³) is too small for ${buildingType} (min: ${limits.minVolume}m³)`);
    }
    if (volume > limits.maxVolume) {
      warnings.push(`Volume (${volume.toFixed(2)}m³) is too large for ${buildingType} (max: ${limits.maxVolume}m³)`);
    }

    // Sugerir correcciones basadas en software
    if (corrections && corrections[buildingType as keyof typeof corrections]) {
      const typicalFactor = corrections[buildingType as keyof typeof corrections].typical;
      if (Math.abs(typicalFactor - 1.0) > 0.1) {
        suggestedCorrections.push({
          factor: typicalFactor,
          reason: `Typical correction factor for ${source} ${buildingType}`
        });
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      suggestedCorrections,
      buildingType,
      estimatedFloors: this.estimateFloors(dimensions.height, buildingType)
    };
  }

  /**
   * Estima el número de pisos basado en la altura
   */
  private estimateFloors(height: number, buildingType: string): number {
    const floorHeights = {
      residential: 2.8,
      commercial: 3.5,
      industrial: 4.5,
      warehouse: 6.0,
      factory: 8.0
    };

    const typicalFloorHeight = floorHeights[buildingType as keyof typeof floorHeights] || 3.0;
    const estimatedFloors = Math.round(height / typicalFloorHeight);
    
    return Math.max(1, Math.min(estimatedFloors, 50)); // Entre 1 y 50 pisos
  }

  /**
   * Obtiene información detallada sobre las dimensiones
   */
  getDimensionInfo(dimensions: BuildingDimensions): any {
    const limits = this.BUILDING_LIMITS[dimensions.buildingType as keyof typeof this.BUILDING_LIMITS];
    
    return {
      dimensions,
      limits,
      analysis: {
        areaEfficiency: dimensions.surface / dimensions.volume,
        heightToAreaRatio: dimensions.height / dimensions.surface,
        typicalFloorHeight: dimensions.height / dimensions.floors,
        isWithinLimits: {
          area: dimensions.surface >= limits.minArea && dimensions.surface <= limits.maxArea,
          height: dimensions.height >= limits.minHeight && dimensions.height <= limits.maxHeight,
          volume: dimensions.volume >= limits.minVolume && dimensions.volume <= limits.maxVolume
        }
      },
      recommendations: this.generateRecommendations(dimensions, limits)
    };
  }

  /**
   * Genera recomendaciones basadas en las dimensiones
   */
  private generateRecommendations(dimensions: BuildingDimensions, limits: any): string[] {
    const recommendations: string[] = [];

    if (dimensions.confidence < 0.9) {
      recommendations.push('Dimensions have been corrected - verify accuracy');
    }

    if (dimensions.surface < limits.minArea) {
      recommendations.push(`Consider increasing building area to at least ${limits.minArea}m²`);
    }

    if (dimensions.height < limits.minHeight) {
      recommendations.push(`Consider increasing building height to at least ${limits.minHeight}m`);
    }

    if (dimensions.floors > 1) {
      recommendations.push(`Multi-story building detected (${dimensions.floors} floors)`);
    }

    return recommendations;
  }
}
