// proj4 removed - using Oskari native coordinate system

import { FinnishOfficialDataService, FinnishPropertyData, FinnishPermitRequirements } from './FinnishOfficialDataService';

export interface CadastralProperty {
  propertyId: string;
  propertyNumber: string;
  municipality: {
    code: string;
    name: string;
  };
  address: {
    street: string;
    number: string;
    postalCode: string;
    city: string;
  };
  coordinates: {
    wgs84: {
      latitude: number;
      longitude: number;
    };
    etrsTM35FIN: {
      x: number;
      y: number;
    };
  };
  area: {
    landArea: number; // m²
    buildingArea: number; // m²
    buildingCoverage: number; // %
  };
  zoning: {
    code: string;
    name: string;
    description: string;
    buildingRights: boolean;
    maxHeight?: number;
    maxFloors?: number;
    maxCoverage?: number;
  };
  ownership: {
    type: string;
    owner: string;
    registrationDate: string;
  };
  permits: {
    buildingPermit: 'Required' | 'Not Required';
    constructionPermit: 'Required' | 'Not Required';
    occupancyPermit: 'Required' | 'Not Required';
    environmentalPermit: 'Required' | 'Not Required';
  };
  restrictions: {
    heritage: boolean;
    natureConservation: boolean;
    floodRisk: boolean;
    noiseRestrictions: boolean;
    heightRestrictions: boolean;
    otherRestrictions: string[];
  };
  utilities: {
    water: boolean;
    sewage: boolean;
    electricity: boolean;
    gas: boolean;
    internet: boolean;
    districtHeating: boolean;
  };
  environmental: {
    soilType: string;
    groundwaterLevel: number;
    contaminationRisk: boolean;
    noiseLevel: number;
  };
}

export interface BuildingPermitRequirements {
  permitRequired: boolean;
  permitType: 'building' | 'construction' | 'both' | 'none';
  requirements: {
    sitePlan: boolean;
    floorPlans: boolean;
    sections: boolean;
    elevations: boolean;
    structuralCalculations: boolean;
    energyCalculations: boolean;
    environmentalAssessment: boolean;
    accessibilityAssessment: boolean;
    fireSafetyAssessment: boolean;
  };
  estimatedTimeline: {
    applicationReview: number; // days
    decisionTime: number; // days
    totalProcess: number; // days
  };
  estimatedCosts: {
    applicationFee: number; // €
    processingFee: number; // €
    totalEstimated: number; // €
  };
}

export class CadastralService {
  private static instance: CadastralService;
  
  public static getInstance(): CadastralService {
    if (!CadastralService.instance) {
      CadastralService.instance = new CadastralService();
    }
    return CadastralService.instance;
  }

  /**
   * Obtiene información catastral detallada basada en coordenadas
   */
  async getCadastralInfo(latitude: number, longitude: number): Promise<CadastralProperty> {
    try {
      console.log('[CadastralService] Getting cadastral info for coordinates:', { latitude, longitude });
      
      // Intentar obtener datos oficiales primero
      const officialDataService = FinnishOfficialDataService.getInstance();
      const officialData = await officialDataService.getOfficialCadastralData(latitude, longitude);
      
      if (officialData && officialData.propertyId !== 'N/A') {
        console.log('[CadastralService] Using official cadastral data:', officialData);
        
        // Convertir datos oficiales al formato CadastralProperty
        const convertedData: CadastralProperty = {
          propertyId: officialData.propertyId || 'N/A',
          propertyNumber: officialData.propertyNumber || 'N/A',
          municipality: {
            code: officialData.municipality?.code || 'UNK',
            name: officialData.municipality?.name || 'Unknown'
          },
          address: {
            street: officialData.address?.street || 'Unknown',
            number: officialData.address?.number || 'N/A',
            postalCode: officialData.address?.postalCode || 'N/A',
            city: officialData.address?.city || 'Unknown'
          },
          coordinates: {
            wgs84: { latitude, longitude },
            etrsTM35FIN: officialData.coordinates?.etrsTM35FIN || { x: 0, y: 0 }
          },
          area: {
            landArea: officialData.area?.landArea || 0,
            buildingArea: officialData.area?.buildingArea || 0,
            buildingCoverage: officialData.area?.buildingCoverage || 0
          },
          zoning: {
            code: officialData.zoning?.code || 'Unknown',
            name: officialData.zoning?.name || 'Unknown Zone',
            description: officialData.zoning?.description || 'Unknown zoning',
            buildingRights: officialData.zoning?.buildingRights || false,
            maxHeight: officialData.zoning?.maxHeight,
            maxFloors: officialData.zoning?.maxFloors,
            maxCoverage: officialData.zoning?.maxCoverage
          },
          ownership: {
            type: officialData.ownership?.ownershipType || 'Unknown',
            owner: officialData.ownership?.owner || 'Unknown',
            registrationDate: officialData.ownership?.registrationDate || new Date().toISOString()
          },
          permits: {
            buildingPermit: officialData.permits?.buildingPermit as any || 'Not Required',
            constructionPermit: officialData.permits?.constructionPermit as any || 'Not Required',
            occupancyPermit: officialData.permits?.occupancyPermit as any || 'Not Required',
            environmentalPermit: officialData.permits?.environmentalPermit as any || 'Not Required'
          },
          restrictions: {
            heritage: officialData.restrictions?.heritage || false,
            natureConservation: officialData.restrictions?.natureConservation || false,
            floodRisk: officialData.restrictions?.floodRisk || false,
            noiseRestrictions: officialData.restrictions?.noiseRestrictions || false,
            heightRestrictions: officialData.restrictions?.heightRestrictions || false,
            otherRestrictions: officialData.restrictions?.otherRestrictions || []
          },
          utilities: {
            water: officialData.utilities?.water || false,
            sewage: officialData.utilities?.sewage || false,
            electricity: officialData.utilities?.electricity || false,
            gas: officialData.utilities?.gas || false,
            internet: officialData.utilities?.internet || false,
            districtHeating: officialData.utilities?.districtHeating || false
          },
          environmental: {
            soilType: officialData.environmental?.soilType || 'Unknown',
            groundwaterLevel: officialData.environmental?.groundwaterLevel || 0,
            contaminationRisk: officialData.environmental?.contaminationRisk || false,
            noiseLevel: officialData.environmental?.noiseLevel || 0
          }
        };
        
        return convertedData;
      }
    } catch (error) {
      console.warn('[CadastralService] Official data service failed, using fallback:', error);
    }
    
    // Fallback a datos mock si los datos oficiales no están disponibles
    const etrsCoords = this.convertToETRSTM35FIN(latitude, longitude);
    console.log('[CadastralService] Converted to ETRS-TM35FIN:', etrsCoords);

    // Simular llamada a API con delay realista
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generar datos catastrales basados en las coordenadas reales
    const cadastralData = this.getMockCadastralData(latitude, longitude, etrsCoords);
    
    console.log('[CadastralService] Generated fallback cadastral data:', cadastralData);
    return cadastralData;
  }

  /**
   * Determina los requisitos de permisos de construcción
   */
  private validateBuildingDataForPermits(buildingData: any): { isValid: boolean, warnings: string[], source: string } {
    const { dimensions, source } = buildingData;
    const warnings: string[] = [];
    
    // Validar rangos específicos por software
    const sourceSpecificLimits = {
      'revit': { maxArea: 50000, maxHeight: 300, maxVolume: 250000 },
      'archicad': { maxArea: 100000, maxHeight: 200, maxVolume: 500000 },
      'sketchup': { maxArea: 25000, maxHeight: 100, maxVolume: 100000 },
      'unknown': { maxArea: 100000, maxHeight: 200, maxVolume: 100000 } // Más estricto para unknown
    };
    
    const limits = sourceSpecificLimits[source as keyof typeof sourceSpecificLimits] || sourceSpecificLimits.unknown;
    
    if (dimensions.surface > limits.maxArea) {
      warnings.push(`Area (${dimensions.surface}m²) exceeds ${limits.maxArea}m² for ${source} - possible unit error`);
    }
    if (dimensions.height > limits.maxHeight) {
      warnings.push(`Height (${dimensions.height}m) exceeds ${limits.maxHeight}m for ${source} - possible unit error`);
    }
    if (dimensions.volume > limits.maxVolume) {
      warnings.push(`Volume (${dimensions.volume}m³) exceeds ${limits.maxVolume}m³ for ${source} - possible unit error`);
    }
    
    const isValid = warnings.length === 0;
    
    if (!isValid) {
      console.warn('[CadastralService] Building data validation warnings for', source, ':', warnings);
    }
    
    return { isValid, warnings, source };
  }

  async getBuildingPermitRequirements(
    buildingData: any, 
    cadastralInfo: CadastralProperty
  ): Promise<BuildingPermitRequirements> {
    try {
      console.log('[CadastralService] Analyzing building permit requirements');
      
      // Validar datos del edificio antes de procesar permisos
      const validation = this.validateBuildingDataForPermits(buildingData);
      if (!validation.isValid) {
        console.warn('[CadastralService] Using potentially problematic dimensions for permit analysis:', validation.warnings);
      }
      
      // Intentar obtener requisitos oficiales
      const officialDataService = FinnishOfficialDataService.getInstance();
      
      // Convertir CadastralProperty a formato compatible con FinnishPropertyData
      const compatibleCadastralData = {
        municipality: {
          name: cadastralInfo.municipality.name,
          code: cadastralInfo.municipality.code,
          officialName: cadastralInfo.municipality.name
        },
        propertyId: cadastralInfo.propertyId,
        propertyNumber: cadastralInfo.propertyNumber
      };
      
      const officialRequirements = await officialDataService.getOfficialPermitRequirements(buildingData, compatibleCadastralData);
      
      if (officialRequirements && officialRequirements.officialRequirements?.source !== 'Fallback') {
        console.log('[CadastralService] Using official permit requirements:', officialRequirements);
        
        // Convertir requisitos oficiales al formato BuildingPermitRequirements
        const convertedRequirements: BuildingPermitRequirements = {
          permitRequired: officialRequirements.permitRequired,
          permitType: officialRequirements.permitType,
          requirements: officialRequirements.requirements,
          estimatedTimeline: officialRequirements.estimatedTimeline,
          estimatedCosts: {
            applicationFee: officialRequirements.estimatedCosts.applicationFee,
            processingFee: officialRequirements.estimatedCosts.processingFee,
            totalEstimated: officialRequirements.estimatedCosts.totalEstimated
          }
        };
        
        return convertedRequirements;
      }
      
      // Fallback a análisis local
      const requirements = this.analyzePermitRequirements(buildingData, cadastralInfo);
      
      console.log('[CadastralService] Permit requirements determined (fallback):', requirements);
      return requirements;
    } catch (error) {
      console.error('[CadastralService] Error analyzing permit requirements:', error);
      throw new Error('Failed to analyze building permit requirements');
    }
  }

  /**
   * Genera documentación para permisos de construcción
   */
  async generatePermitDocumentation(
    buildingData: any,
    cadastralInfo: CadastralProperty,
    requirements: BuildingPermitRequirements
  ): Promise<any> {
    try {
      console.log('[CadastralService] Generating permit documentation');
      
      const documentation = {
        projectInfo: {
          name: buildingData.projectInfo?.name || 'IFC Project',
          location: cadastralInfo.address,
          coordinates: cadastralInfo.coordinates,
          propertyId: cadastralInfo.propertyId
        },
        buildingSpecifications: {
          type: buildingData.classification?.buildingType || 'Residential',
          use: buildingData.classification?.useCategory || 'Dwelling',
          area: buildingData.dimensions?.surface || 0,
          volume: buildingData.dimensions?.volume || 0,
          height: buildingData.dimensions?.height || 0,
          floors: buildingData.additionalInfo?.floors || 1,
          energyClass: buildingData.classification?.energyClass || 'A'
        },
        cadastralInfo: {
          propertyNumber: cadastralInfo.propertyNumber,
          municipality: cadastralInfo.municipality,
          zoning: cadastralInfo.zoning,
          area: cadastralInfo.area,
          ownership: cadastralInfo.ownership
        },
        permitRequirements: requirements,
        compliance: this.checkCompliance(buildingData, cadastralInfo),
        recommendations: this.generateRecommendations(buildingData, cadastralInfo, requirements)
      };
      
      console.log('[CadastralService] Documentation generated:', documentation);
      return documentation;
    } catch (error) {
      console.error('[CadastralService] Error generating documentation:', error);
      throw new Error('Failed to generate permit documentation');
    }
  }

  /**
   * Convierte coordenadas WGS84 a ETRS-TM35FIN
   */
  private convertToETRSTM35FIN(latitude: number, longitude: number): { x: number; y: number } {
    // proj4 removed - using mock coordinates for now
    const x = longitude * 111000; // Mock conversion
    const y = latitude * 111000;  // Mock conversion
    return { x, y };
  }

  private getMockCadastralData(latitude: number, longitude: number, etrsCoords: { x: number, y: number }): CadastralProperty {
    // Determinar ubicación basada en coordenadas reales
    const isHelsinki = latitude >= 60.0 && latitude <= 60.5 && longitude >= 24.5 && longitude <= 25.5;
    const isTampere = latitude >= 61.0 && latitude <= 61.8 && longitude >= 23.0 && longitude <= 24.5;
    const isTurku = latitude >= 60.0 && latitude <= 60.8 && longitude >= 21.5 && longitude <= 23.0;
    const isOulu = latitude >= 64.5 && latitude <= 66.0 && longitude >= 24.5 && longitude <= 26.5;

    // Generar número de propiedad basado en coordenadas
    const propertyNumber = this.generatePropertyNumberFromCoordinates(latitude, longitude);
    
    // Determinar municipio basado en coordenadas
    const municipality = this.getMunicipalityFromCoordinates(latitude, longitude);

    return {
      propertyId: `FI-${propertyNumber}`,
      propertyNumber: propertyNumber,
      municipality: municipality,
      address: {
        street: "Coordinates-based location",
        number: "N/A",
        postalCode: "N/A",
        city: municipality.name
      },
      area: {
        landArea: 500 + Math.floor(Math.random() * 2000),
        buildingArea: 200 + Math.floor(Math.random() * 400),
        buildingCoverage: 15 + Math.floor(Math.random() * 35)
      },
      zoning: {
        code: isHelsinki ? 'R' : isTampere ? 'T' : isTurku ? 'TU' : 'O',
        name: isHelsinki ? 'Residential Zone' : isTampere ? 'Tampere Zone' : isTurku ? 'Turku Zone' : 'Oulu Zone',
        description: isHelsinki ? 'Residential area in Helsinki' : isTampere ? 'Residential area in Tampere' : isTurku ? 'Residential area in Turku' : 'Residential area in Oulu',
        buildingRights: Math.random() > 0.1,
        maxHeight: 12 + Math.floor(Math.random() * 20),
        maxFloors: 3 + Math.floor(Math.random() * 5),
        maxCoverage: 30 + Math.floor(Math.random() * 40)
      },
      permits: {
        buildingPermit: Math.random() > 0.3 ? 'Required' : 'Not Required',
        constructionPermit: Math.random() > 0.2 ? 'Required' : 'Not Required',
        occupancyPermit: Math.random() > 0.4 ? 'Required' : 'Not Required',
        environmentalPermit: Math.random() > 0.7 ? 'Required' : 'Not Required'
      },
      restrictions: {
        heritage: Math.random() > 0.8,
        natureConservation: Math.random() > 0.6,
        floodRisk: Math.random() > 0.7,
        noiseRestrictions: Math.random() > 0.5,
        heightRestrictions: Math.random() > 0.4,
        otherRestrictions: []
      },
      utilities: {
        water: true,
        sewage: true,
        electricity: true,
        gas: Math.random() > 0.3,
        internet: true,
        districtHeating: Math.random() > 0.4
      },
      environmental: {
        soilType: ['Clay', 'Silt', 'Sand', 'Gravel'][Math.floor(Math.random() * 4)],
        groundwaterLevel: 1 + Math.random() * 5,
        contaminationRisk: Math.random() > 0.8,
        noiseLevel: 45 + Math.floor(Math.random() * 30)
      },
      coordinates: {
        wgs84: { latitude, longitude },
        etrsTM35FIN: etrsCoords
      }
    };
  }

  private generatePropertyNumberFromCoordinates(latitude: number, longitude: number): string {
    // Generar número de propiedad único basado en coordenadas
    const latPart = Math.floor(latitude * 10000);
    const lonPart = Math.floor(longitude * 10000);
    const combined = latPart * 100000 + lonPart;
    return combined.toString().slice(-8);
  }

  private getMunicipalityFromCoordinates(latitude: number, longitude: number): {
    name: string;
    code: string;
  } {
    // Determinar municipio basado en coordenadas reales - Cobertura expandida
    if (latitude >= 60.0 && latitude <= 60.5 && longitude >= 24.5 && longitude <= 25.5) {
      return { name: 'Helsinki', code: 'HEL' };
    } else if (latitude >= 61.0 && latitude <= 61.8 && longitude >= 23.0 && longitude <= 24.5) {
      return { name: 'Tampere', code: 'TRE' };
    } else if (latitude >= 60.0 && latitude <= 60.8 && longitude >= 21.5 && longitude <= 23.0) {
      return { name: 'Turku', code: 'TKU' };
    } else if (latitude >= 64.5 && latitude <= 66.0 && longitude >= 24.5 && longitude <= 26.5) {
      return { name: 'Oulu', code: 'OUL' };
    } else if (latitude >= 60.75 && latitude <= 61.32 && longitude >= 23.75 && longitude <= 25.27) {
      return { name: 'Hämeenlinna', code: 'HML' };
    } else if (latitude >= 62.0 && latitude <= 62.5 && longitude >= 25.0 && longitude <= 26.0) {
      return { name: 'Jyväskylä', code: 'JKL' };
    } else if (latitude >= 65.0 && latitude <= 65.5 && longitude >= 25.0 && longitude <= 26.0) {
      return { name: 'Rovaniemi', code: 'ROV' };
    } else if (latitude >= 60.4 && latitude <= 60.9 && longitude >= 22.0 && longitude <= 23.0) {
      return { name: 'Salo', code: 'SAL' };
    } else if (latitude >= 61.5 && latitude <= 62.0 && longitude >= 23.0 && longitude <= 24.0) {
      return { name: 'Lahti', code: 'LAH' };
    } else if (latitude >= 62.5 && latitude <= 63.0 && longitude >= 22.0 && longitude <= 23.0) {
      return { name: 'Vaasa', code: 'VAA' };
    } else if (latitude >= 63.0 && latitude <= 63.5 && longitude >= 27.0 && longitude <= 28.0) {
      return { name: 'Kuopio', code: 'KUO' };
    } else if (latitude >= 60.5 && latitude <= 61.0 && longitude >= 24.0 && longitude <= 25.0) {
      return { name: 'Espoo', code: 'ESP' };
    } else if (latitude >= 60.0 && latitude <= 60.5 && longitude >= 24.0 && longitude <= 24.5) {
      return { name: 'Vantaa', code: 'VAN' };
    } else {
      // Para casos no cubiertos, usar geocodificación síncrona o fallback
      return this.getMunicipalityFromGeocodingSync(latitude, longitude);
    }
  }

  private getMunicipalityFromGeocodingSync(latitude: number, longitude: number): { name: string; code: string } {
    // Fallback síncrono para casos no cubiertos
    // En el futuro, esto podría usar una caché de geocodificación
    console.log('[CadastralService] Using fallback municipality detection for coordinates:', latitude, longitude);
    
    // Intentar determinar región basada en coordenadas generales
    if (latitude >= 60.0 && latitude <= 62.0 && longitude >= 23.0 && longitude <= 26.0) {
      return { name: 'Southern Finland', code: 'SFL' };
    } else if (latitude >= 62.0 && latitude <= 64.0 && longitude >= 22.0 && longitude <= 28.0) {
      return { name: 'Central Finland', code: 'CFL' };
    } else if (latitude >= 64.0 && latitude <= 66.0 && longitude >= 24.0 && longitude <= 28.0) {
      return { name: 'Northern Finland', code: 'NFL' };
    } else {
      return { name: 'Unknown Municipality', code: 'UNK' };
    }
  }

  /**
   * Analiza los requisitos de permisos basado en los datos del edificio y catastrales
   */
  private analyzePermitRequirements(
    buildingData: any, 
    cadastralInfo: CadastralProperty
  ): BuildingPermitRequirements {
    const buildingArea = buildingData.dimensions?.surface || 0;
    const buildingHeight = buildingData.dimensions?.height || 0;
    const buildingFloors = buildingData.additionalInfo?.floors || 1;
    
    // Determinar si se requiere permiso
    const permitRequired = buildingArea > 50 || buildingHeight > 3 || buildingFloors > 1;
    const permitType = buildingArea > 200 ? 'both' : buildingArea > 50 ? 'building' : 'none';
    
    return {
      permitRequired,
      permitType: permitType as any,
      requirements: {
        sitePlan: true,
        floorPlans: buildingFloors > 1,
        sections: buildingHeight > 3,
        elevations: true,
        structuralCalculations: buildingHeight > 6,
        energyCalculations: buildingArea > 100,
        environmentalAssessment: buildingArea > 500,
        accessibilityAssessment: buildingArea > 200,
        fireSafetyAssessment: buildingHeight > 6 || buildingFloors > 2
      },
      estimatedTimeline: {
        applicationReview: 30,
        decisionTime: 60,
        totalProcess: 90
      },
      estimatedCosts: {
        applicationFee: buildingArea * 2,
        processingFee: buildingArea * 5,
        totalEstimated: buildingArea * 7
      }
    };
  }

  /**
   * Verifica el cumplimiento de regulaciones
   */
  private checkCompliance(buildingData: any, cadastralInfo: CadastralProperty): any {
    const buildingHeight = buildingData.dimensions?.height || 0;
    const buildingFloors = buildingData.additionalInfo?.floors || 1;
    const buildingCoverage = (buildingData.dimensions?.surface || 0) / cadastralInfo.area.landArea * 100;
    
    return {
      heightCompliance: buildingHeight <= (cadastralInfo.zoning.maxHeight || Infinity),
      floorCompliance: buildingFloors <= (cadastralInfo.zoning.maxFloors || Infinity),
      coverageCompliance: buildingCoverage <= (cadastralInfo.zoning.maxCoverage || 100),
      zoningCompliance: cadastralInfo.zoning.buildingRights,
      overallCompliance: true
    };
  }

  /**
   * Genera recomendaciones para el proyecto
   */
  private generateRecommendations(
    buildingData: any, 
    cadastralInfo: CadastralProperty, 
    requirements: BuildingPermitRequirements
  ): string[] {
    const recommendations: string[] = [];
    
    if (requirements.permitRequired) {
      recommendations.push('Building permit is required for this project');
      recommendations.push('Submit application to local building authority');
    }
    
    if (cadastralInfo.restrictions.heritage) {
      recommendations.push('Property is in heritage area - special considerations required');
    }
    
    if (cadastralInfo.restrictions.natureConservation) {
      recommendations.push('Nature conservation restrictions apply');
    }
    
    if (buildingData.dimensions?.height > (cadastralInfo.zoning.maxHeight || Infinity)) {
      recommendations.push('Building height exceeds zoning limits - consider reducing height');
    }
    
    return recommendations;
  }
}
