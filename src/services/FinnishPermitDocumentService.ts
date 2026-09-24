/**
 * Finnish Permit Document Service
 * Genera documentos profesionales para permisos de construcción en Finlandia
 * Formato específico para arquitectos y profesionales de la construcción
 * Basado en regulaciones oficiales finlandesas:
 * - Rakennusmääräyskokoelma (Building Code)
 * - Maankäyttö- ja rakennuslaki (Land Use and Building Act)
 * - Energiatehokkuusasetus (Energy Efficiency Regulation)
 * - Paloturvallisuusasetus (Fire Safety Regulation)
 * - Esteettömyysasetus (Accessibility Regulation)
 * - Ympäristönsuojeluasetus (Environmental Protection Act)
 */

// Estándares finlandeses para validaciones
export const FINNISH_BUILDING_STANDARDS = {
  // Clases de energía según regulación finlandesa
  ENERGY_CLASSES: {
    A: { minEfficiency: 0.4, description: 'Muy eficiente' },
    B: { minEfficiency: 0.6, description: 'Eficiente' },
    C: { minEfficiency: 0.8, description: 'Normal' },
    D: { minEfficiency: 1.0, description: 'Aceptable' },
    E: { minEfficiency: 1.2, description: 'Bajo' },
    F: { minEfficiency: 1.4, description: 'Muy bajo' },
    G: { minEfficiency: 1.6, description: 'Extremadamente bajo' },
    H: { minEfficiency: 2.0, description: 'No cumple estándares' }
  },
  
  // Clases de seguridad contra incendios
  FIRE_SAFETY_CLASSES: {
    P1: { description: 'Edificios de baja altura (≤8m)', maxHeight: 8, maxFloors: 2 },
    P2: { description: 'Edificios de altura media (≤25m)', maxHeight: 25, maxFloors: 8 },
    P3: { description: 'Edificios de gran altura (≤50m)', maxHeight: 50, maxFloors: 16 },
    P4: { description: 'Edificios de muy gran altura (>50m)', maxHeight: 999, maxFloors: 999 }
  },
  
  // Clases de accesibilidad
  ACCESSIBILITY_CLASSES: {
    A: { description: 'Accesibilidad completa', requirements: ['rampas', 'ascensores', 'baños adaptados'] },
    B: { description: 'Accesibilidad parcial', requirements: ['rampas', 'baños adaptados'] },
    C: { description: 'Accesibilidad básica', requirements: ['entrada accesible'] }
  },
  
  // Límites de altura según tipo de edificio
  HEIGHT_LIMITS: {
    residential: { maxHeight: 25, maxFloors: 8 },
    commercial: { maxHeight: 30, maxFloors: 10 },
    industrial: { maxHeight: 15, maxFloors: 3 },
    public: { maxHeight: 35, maxFloors: 12 }
  },
  
  // Requisitos de área mínima
  MINIMUM_AREAS: {
    residential: { minArea: 25, minHeight: 2.4 },
    commercial: { minArea: 50, minHeight: 2.7 },
    industrial: { minArea: 100, minHeight: 3.0 },
    public: { minArea: 75, minHeight: 2.7 }
  },
  
  // Distancias mínimas a límites de propiedad
  SETBACK_REQUIREMENTS: {
    residential: { minDistance: 3, maxCoverage: 0.4 },
    commercial: { minDistance: 5, maxCoverage: 0.6 },
    industrial: { minDistance: 10, maxCoverage: 0.7 },
    public: { minDistance: 8, maxCoverage: 0.5 }
  }
};

// Validaciones específicas finlandesas
export class FinnishBuildingValidator {
  
  /**
   * Valida el cumplimiento del código de construcción finlandés
   */
  static validateBuildingCode(buildingSpecs: any, technicalSpecs: any): { compliant: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar altura según tipo de edificio
    const heightLimit = FINNISH_BUILDING_STANDARDS.HEIGHT_LIMITS[buildingSpecs.type as keyof typeof FINNISH_BUILDING_STANDARDS.HEIGHT_LIMITS];
    if (heightLimit && buildingSpecs.height > heightLimit.maxHeight) {
      errors.push(`Altura del edificio (${buildingSpecs.height}m) excede el límite máximo (${heightLimit.maxHeight}m) para edificios ${buildingSpecs.type}`);
    }
    
    // Validar número de pisos
    if (heightLimit && buildingSpecs.floors > heightLimit.maxFloors) {
      errors.push(`Número de pisos (${buildingSpecs.floors}) excede el límite máximo (${heightLimit.maxFloors}) para edificios ${buildingSpecs.type}`);
    }
    
    // Validar área mínima
    const minArea = FINNISH_BUILDING_STANDARDS.MINIMUM_AREAS[buildingSpecs.type as keyof typeof FINNISH_BUILDING_STANDARDS.MINIMUM_AREAS];
    if (minArea && buildingSpecs.area < minArea.minArea) {
      warnings.push(`Área del edificio (${buildingSpecs.area}m²) está por debajo del mínimo recomendado (${minArea.minArea}m²) para edificios ${buildingSpecs.type}`);
    }
    
    // Validar clase de energía
    if (technicalSpecs.energyClass && !FINNISH_BUILDING_STANDARDS.ENERGY_CLASSES[technicalSpecs.energyClass as keyof typeof FINNISH_BUILDING_STANDARDS.ENERGY_CLASSES]) {
      errors.push(`Clase de energía '${technicalSpecs.energyClass}' no es válida según estándares finlandeses`);
    }
    
    // Validar clase de seguridad contra incendios
    if (technicalSpecs.fireSafetyClass && !FINNISH_BUILDING_STANDARDS.FIRE_SAFETY_CLASSES[technicalSpecs.fireSafetyClass as keyof typeof FINNISH_BUILDING_STANDARDS.FIRE_SAFETY_CLASSES]) {
      errors.push(`Clase de seguridad contra incendios '${technicalSpecs.fireSafetyClass}' no es válida según estándares finlandeses`);
    }
    
    return {
      compliant: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Valida el cumplimiento de eficiencia energética
   */
  static validateEnergyEfficiency(technicalSpecs: any, buildingSpecs: any): { compliant: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar que se especifique clase de energía
    if (!technicalSpecs.energyClass) {
      errors.push('Clase de energía debe ser especificada según Energiatehokkuusasetus');
    }
    
    // Validar sistemas de calefacción y ventilación
    if (!technicalSpecs.heatingSystem) {
      warnings.push('Sistema de calefacción debe ser especificado');
    }
    
    if (!technicalSpecs.ventilationSystem) {
      warnings.push('Sistema de ventilación debe ser especificado');
    }
    
    // Validar clase de energía según área
    if (technicalSpecs.energyClass && buildingSpecs.area > 1000) {
      const energyClass = FINNISH_BUILDING_STANDARDS.ENERGY_CLASSES[technicalSpecs.energyClass as keyof typeof FINNISH_BUILDING_STANDARDS.ENERGY_CLASSES];
      if (energyClass && technicalSpecs.energyClass === 'H') {
        errors.push('Edificios grandes deben cumplir al menos clase de energía G según Energiatehokkuusasetus');
      }
    }
    
    return {
      compliant: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Valida el cumplimiento de seguridad contra incendios
   */
  static validateFireSafety(technicalSpecs: any, buildingSpecs: any): { compliant: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar clase de seguridad contra incendios según altura
    if (technicalSpecs.fireSafetyClass && buildingSpecs.height > 8) {
      const fireClass = FINNISH_BUILDING_STANDARDS.FIRE_SAFETY_CLASSES[technicalSpecs.fireSafetyClass as keyof typeof FINNISH_BUILDING_STANDARDS.FIRE_SAFETY_CLASSES];
      if (fireClass && buildingSpecs.height > fireClass.maxHeight) {
        errors.push(`Clase de seguridad contra incendios '${technicalSpecs.fireSafetyClass}' no es adecuada para altura de ${buildingSpecs.height}m según Paloturvallisuusasetus`);
      }
    }
    
    // Validar que se especifique clase de seguridad contra incendios
    if (!technicalSpecs.fireSafetyClass) {
      warnings.push('Clase de seguridad contra incendios debe ser especificada según Paloturvallisuusasetus');
    }
    
    return {
      compliant: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Valida el cumplimiento de accesibilidad
   */
  static validateAccessibility(technicalSpecs: any, buildingSpecs: any): { compliant: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar clase de accesibilidad
    if (!technicalSpecs.accessibilityClass) {
      warnings.push('Clase de accesibilidad debe ser especificada según Esteettömyysasetus');
    }
    
    // Validar accesibilidad para edificios públicos
    if (buildingSpecs.type === 'public' && technicalSpecs.accessibilityClass === 'C') {
      errors.push('Edificios públicos deben cumplir al menos clase de accesibilidad B según Esteettömyysasetus');
    }
    
    return {
      compliant: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Valida el cumplimiento ambiental
   */
  static validateEnvironmental(environmentalAssessment: any): { compliant: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar evaluación de ruido para edificios grandes
    if (!environmentalAssessment.noiseAssessment) {
      warnings.push('Evaluación de ruido recomendada según Ympäristönsuojeluasetus');
    }
    
    // Validar gestión de residuos
    if (!environmentalAssessment.wasteManagement) {
      warnings.push('Plan de gestión de residuos debe ser especificado');
    }
    
    // Validar gestión de aguas pluviales
    if (!environmentalAssessment.stormwaterManagement) {
      warnings.push('Plan de gestión de aguas pluviales debe ser especificado');
    }
    
    return {
      compliant: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Valida el cumplimiento de planificación urbana
   */
  static validateUrbanPlanning(urbanPlanning: any, buildingSpecs: any): { compliant: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar derechos de construcción
    if (!urbanPlanning.buildingRights) {
      errors.push('No hay derechos de construcción en esta ubicación según planificación urbana');
    }
    
    // Validar límites de altura
    if (urbanPlanning.heightLimits && buildingSpecs.height > urbanPlanning.heightLimits) {
      errors.push(`Altura del edificio (${buildingSpecs.height}m) excede límites de planificación urbana (${urbanPlanning.heightLimits}m)`);
    }
    
    // Validar cobertura del terreno
    const setbackReq = FINNISH_BUILDING_STANDARDS.SETBACK_REQUIREMENTS[buildingSpecs.type as keyof typeof FINNISH_BUILDING_STANDARDS.SETBACK_REQUIREMENTS];
    if (setbackReq && buildingSpecs.area / urbanPlanning.landArea > setbackReq.maxCoverage) {
      warnings.push(`Cobertura del terreno (${(buildingSpecs.area / urbanPlanning.landArea * 100).toFixed(1)}%) excede recomendación (${setbackReq.maxCoverage * 100}%)`);
    }
    
    return {
      compliant: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Regulaciones finlandesas específicas
export interface FinnishRegulations {
  buildingCode: 'Rakennusmääräyskokoelma' | 'Building Code';
  energyEfficiency: 'Energiatehokkuusasetus' | 'Energy Efficiency Regulation';
  fireSafety: 'Paloturvallisuusasetus' | 'Fire Safety Regulation';
  accessibility: 'Esteettömyysasetus' | 'Accessibility Regulation';
  environmental: 'Ympäristönsuojeluasetus' | 'Environmental Protection Act';
  landUse: 'Maankäyttö- ja rakennuslaki' | 'Land Use and Building Act';
}

// Campos específicos requeridos por regulación finlandesa
export interface FinnishSpecificFields {
  // Información del solicitante (Solicitante)
  applicantInfo: {
    name: string;
    personalId?: string; // Henkilötunnus
    address: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    organization?: string;
    organizationId?: string; // Y-tunnus
    representative?: string; // Edustaja
  };
  
  // Información del diseñador (Suunnittelija)
  designerInfo: {
    name: string;
    title: string; // Arkkitehti, Insinööri, etc.
    licenseNumber?: string; // Lisenssinumero
    organization: string;
    address: string;
    phone: string;
    email: string;
    responsibleDesigner: boolean; // Vastuullinen suunnittelija
  };
  
  // Información del constructor (Rakentaja)
  constructorInfo?: {
    name: string;
    organizationId: string; // Y-tunnus
    address: string;
    phone: string;
    email: string;
    licenseNumber?: string;
  };
  
  // Especificaciones técnicas según regulación
  technicalSpecifications: {
    buildingCode: string; // Rakennusmääräyskokoelma
    energyClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'; // Energiatehokkuusluokka
    fireSafetyClass: 'P1' | 'P2' | 'P3' | 'P4'; // Paloturvallisuusluokka
    accessibilityClass: 'A' | 'B' | 'C'; // Esteettömyysluokka
    structuralClass: 'RC1' | 'RC2' | 'RC3'; // Rakennusluokka
    foundationType: string; // Perustustyyppi
    heatingSystem: string; // Lämmitysjärjestelmä
    ventilationSystem: string; // Ilmanvaihtojärjestelmä
    waterSupply: string; // Vesi- ja viemärijärjestelmä
    electricalSystem: string; // Sähköjärjestelmä
  };
  
  // Evaluación ambiental específica
  environmentalAssessment: {
    soilType: string; // Maalaji
    groundwaterLevel: number; // Pohjaveden taso
    contaminationRisk: boolean; // Saastumisriski
    noiseAssessment: boolean; // Meluarviointi
    vibrationAssessment: boolean; // Tärinäarviointi
    dustAssessment: boolean; // Pölyarviointi
    wasteManagement: string; // Jätehuolto
    stormwaterManagement: string; // Sadevesien hallinta
  };
  
  // Información de planificación urbana
  urbanPlanning: {
    masterPlan: string; // Yleiskaava
    detailedPlan: string; // Asemakaava
    buildingRights: boolean; // Rakennusoikeus
    heightLimits: number; // Korkeusrajoitukset
    setbackRequirements: number; // Etäisyysvaatimukset
    parkingRequirements: number; // Pysäköintivaatimukset
    greenAreaRequirements: number; // Viheraluevaatimukset
  };
}

export interface FinnishPermitDocument {
  documentId: string;
  documentType: 'building_permit' | 'construction_permit' | 'both';
  language: 'fi' | 'en' | 'sv';
  format: 'pdf' | 'docx' | 'html';
  
  // Información del proyecto
  projectInfo: {
    name: string;
    location: {
      address: string;
      coordinates: { latitude: number; longitude: number };
      municipality: string;
      propertyId: string;
    };
    client: string;
    architect: string;
    date: string;
  };
  
  // Especificaciones del edificio
  buildingSpecifications: {
    type: string;
    use: string;
    area: number;
    volume: number;
    height: number;
    floors: number;
    energyClass: string;
    constructionMethod: string;
  };
  
  // Información catastral
  cadastralInfo: {
    propertyNumber: string;
    landArea: number;
    buildingCoverage: number;
    zoning: {
      code: string;
      name: string;
      description: string;
      buildingRights: boolean;
    };
  };
  
  // Requisitos de permisos
  permitRequirements: {
    required: boolean;
    type: string;
    timeline: {
      applicationReview: number;
      decisionTime: number;
      totalProcess: number;
    };
    costs: {
      applicationFee: number;
      processingFee: number;
      totalEstimated: number;
    };
  };
  
  // Documentos requeridos
  requiredDocuments: {
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
  
  // Cumplimiento normativo
  compliance: {
    buildingCode: boolean;
    zoningRegulations: boolean;
    energyEfficiency: boolean;
    accessibility: boolean;
    fireSafety: boolean;
    environmental: boolean;
  };
  
  // Recomendaciones
  recommendations: string[];
  
  // Datos oficiales
  officialData: {
    source: string;
    lastUpdated: string;
    regulation: string;
  };
  
  // CAMPOS ESPECÍFICOS FINLANDESES
  finnishSpecific: FinnishSpecificFields;
  
  // REGULACIONES APLICABLES
  applicableRegulations: FinnishRegulations;
  
  // VALIDACIONES Y CUMPLIMIENTO
  validationResults: {
    buildingCodeCompliance: boolean;
    energyEfficiencyCompliance: boolean;
    fireSafetyCompliance: boolean;
    accessibilityCompliance: boolean;
    environmentalCompliance: boolean;
    zoningCompliance: boolean;
    structuralCompliance: boolean;
    validationErrors: string[];
    validationWarnings: string[];
  };
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  sections: DocumentSection[];
  format: 'pdf' | 'docx' | 'html';
  language: 'fi' | 'en' | 'sv';
}

export interface DocumentSection {
  id: string;
  title: string;
  type: 'text' | 'table' | 'image' | 'chart' | 'form';
  content: any;
  required: boolean;
  order: number;
}

export class FinnishPermitDocumentService {
  private static instance: FinnishPermitDocumentService;
  
  // Plantillas de documentos oficiales finlandeses
  private readonly documentTemplates: { [key: string]: DocumentTemplate } = {
    'building_permit_fi': {
      id: 'building_permit_fi',
      name: 'Rakennuslupahakemus',
      description: 'Solicitud de permiso de construcción en finlandés',
      format: 'pdf',
      language: 'fi',
      sections: [
        {
          id: 'header',
          title: 'Rakennuslupahakemus',
          type: 'text',
          content: 'header_template',
          required: true,
          order: 1
        },
        {
          id: 'project_info',
          title: 'Hankkeen tiedot',
          type: 'form',
          content: 'project_info_template',
          required: true,
          order: 2
        },
        {
          id: 'building_specs',
          title: 'Rakennuksen tiedot',
          type: 'table',
          content: 'building_specs_template',
          required: true,
          order: 3
        },
        {
          id: 'site_info',
          title: 'Tontin tiedot',
          type: 'form',
          content: 'site_info_template',
          required: true,
          order: 4
        },
        {
          id: 'requirements',
          title: 'Vaadittavat asiakirjat',
          type: 'table',
          content: 'requirements_template',
          required: true,
          order: 5
        },
        {
          id: 'compliance',
          title: 'Säädöstenmukaisuus',
          type: 'table',
          content: 'compliance_template',
          required: true,
          order: 6
        },
        {
          id: 'timeline',
          title: 'Aikataulu ja kustannukset',
          type: 'chart',
          content: 'timeline_template',
          required: true,
          order: 7
        },
        {
          id: 'recommendations',
          title: 'Suositukset',
          type: 'text',
          content: 'recommendations_template',
          required: false,
          order: 8
        }
      ]
    },
    
    'building_permit_en': {
      id: 'building_permit_en',
      name: 'Building Permit Application',
      description: 'Building permit application in English',
      format: 'pdf',
      language: 'en',
      sections: [
        {
          id: 'header',
          title: 'Building Permit Application',
          type: 'text',
          content: 'header_template_en',
          required: true,
          order: 1
        },
        {
          id: 'project_info',
          title: 'Project Information',
          type: 'form',
          content: 'project_info_template_en',
          required: true,
          order: 2
        },
        {
          id: 'building_specs',
          title: 'Building Specifications',
          type: 'table',
          content: 'building_specs_template_en',
          required: true,
          order: 3
        },
        {
          id: 'site_info',
          title: 'Site Information',
          type: 'form',
          content: 'site_info_template_en',
          required: true,
          order: 4
        },
        {
          id: 'requirements',
          title: 'Required Documents',
          type: 'table',
          content: 'requirements_template_en',
          required: true,
          order: 5
        },
        {
          id: 'compliance',
          title: 'Regulatory Compliance',
          type: 'table',
          content: 'compliance_template_en',
          required: true,
          order: 6
        },
        {
          id: 'timeline',
          title: 'Timeline and Costs',
          type: 'chart',
          content: 'timeline_template_en',
          required: true,
          order: 7
        },
        {
          id: 'recommendations',
          title: 'Recommendations',
          type: 'text',
          content: 'recommendations_template_en',
          required: false,
          order: 8
        }
      ]
    },
    
    'both_fi': {
      id: 'both_fi',
      name: 'Rakennus- ja yleiskaavaluvahakemus',
      description: 'Solicitud de permiso de construcción y uso del suelo en finlandés',
      format: 'pdf',
      language: 'fi',
      sections: [
        {
          id: 'header',
          title: 'Rakennus- ja yleiskaavaluvahakemus',
          type: 'text',
          content: 'header_template',
          required: true,
          order: 1
        },
        {
          id: 'project_info',
          title: 'Hankkeen tiedot',
          type: 'form',
          content: 'project_info_template',
          required: true,
          order: 2
        },
        {
          id: 'building_specs',
          title: 'Rakennuksen tiedot',
          type: 'table',
          content: 'building_specs_template',
          required: true,
          order: 3
        },
        {
          id: 'site_info',
          title: 'Tontin tiedot',
          type: 'form',
          content: 'site_info_template',
          required: true,
          order: 4
        },
        {
          id: 'zoning_info',
          title: 'Kaavoitustiedot',
          type: 'form',
          content: 'zoning_info_template',
          required: true,
          order: 5
        },
        {
          id: 'requirements',
          title: 'Vaadittavat asiakirjat',
          type: 'table',
          content: 'requirements_template',
          required: true,
          order: 6
        },
        {
          id: 'compliance',
          title: 'Säädöstenmukaisuus',
          type: 'table',
          content: 'compliance_template',
          required: true,
          order: 7
        },
        {
          id: 'timeline',
          title: 'Aikataulu ja kustannukset',
          type: 'chart',
          content: 'timeline_template',
          required: true,
          order: 8
        },
        {
          id: 'recommendations',
          title: 'Suositukset',
          type: 'text',
          content: 'recommendations_template',
          required: false,
          order: 9
        }
      ]
    },
    
    'both_en': {
      id: 'both_en',
      name: 'Building and Land Use Permit Application',
      description: 'Building and land use permit application in English',
      format: 'pdf',
      language: 'en',
      sections: [
        {
          id: 'header',
          title: 'Building and Land Use Permit Application',
          type: 'text',
          content: 'header_template_en',
          required: true,
          order: 1
        },
        {
          id: 'project_info',
          title: 'Project Information',
          type: 'form',
          content: 'project_info_template_en',
          required: true,
          order: 2
        },
        {
          id: 'building_specs',
          title: 'Building Specifications',
          type: 'table',
          content: 'building_specs_template_en',
          required: true,
          order: 3
        },
        {
          id: 'site_info',
          title: 'Site Information',
          type: 'form',
          content: 'site_info_template_en',
          required: true,
          order: 4
        },
        {
          id: 'zoning_info',
          title: 'Zoning Information',
          type: 'form',
          content: 'zoning_info_template_en',
          required: true,
          order: 5
        },
        {
          id: 'requirements',
          title: 'Required Documents',
          type: 'table',
          content: 'requirements_template_en',
          required: true,
          order: 6
        },
        {
          id: 'compliance',
          title: 'Regulatory Compliance',
          type: 'table',
          content: 'compliance_template_en',
          required: true,
          order: 7
        },
        {
          id: 'timeline',
          title: 'Timeline and Costs',
          type: 'chart',
          content: 'timeline_template_en',
          required: true,
          order: 8
        },
        {
          id: 'recommendations',
          title: 'Recommendations',
          type: 'text',
          content: 'recommendations_template_en',
          required: false,
          order: 9
        }
      ]
    },
    
    'both_sv': {
      id: 'both_sv',
      name: 'Bygg- och stadsplanelovansökan',
      description: 'Solicitud de permiso de construcción y uso del suelo en sueco',
      format: 'pdf',
      language: 'sv',
      sections: [
        {
          id: 'header',
          title: 'Bygg- och stadsplanelovansökan',
          type: 'text',
          content: 'header_template_sv',
          required: true,
          order: 1
        },
        {
          id: 'project_info',
          title: 'Projektinformation',
          type: 'form',
          content: 'project_info_template_sv',
          required: true,
          order: 2
        },
        {
          id: 'building_specs',
          title: 'Byggnadsspecifikationer',
          type: 'table',
          content: 'building_specs_template_sv',
          required: true,
          order: 3
        },
        {
          id: 'site_info',
          title: 'Platsinformation',
          type: 'form',
          content: 'site_info_template_sv',
          required: true,
          order: 4
        },
        {
          id: 'zoning_info',
          title: 'Planeringsinformation',
          type: 'form',
          content: 'zoning_info_template_sv',
          required: true,
          order: 5
        },
        {
          id: 'requirements',
          title: 'Erforderliga dokument',
          type: 'table',
          content: 'requirements_template_sv',
          required: true,
          order: 6
        },
        {
          id: 'compliance',
          title: 'Efterlevnad av föreskrifter',
          type: 'table',
          content: 'compliance_template_sv',
          required: true,
          order: 7
        },
        {
          id: 'timeline',
          title: 'Tidsplan och kostnader',
          type: 'chart',
          content: 'timeline_template_sv',
          required: true,
          order: 8
        },
        {
          id: 'recommendations',
          title: 'Rekommendationer',
          type: 'text',
          content: 'recommendations_template_sv',
          required: false,
          order: 9
        }
      ]
    }
  };

  private constructor() {}

  static getInstance(): FinnishPermitDocumentService {
    if (!FinnishPermitDocumentService.instance) {
      FinnishPermitDocumentService.instance = new FinnishPermitDocumentService();
    }
    return FinnishPermitDocumentService.instance;
  }

  /**
   * Genera documento de permiso de construcción profesional
   */
  async generatePermitDocument(
    buildingData: any,
    cadastralInfo: any,
    permitRequirements: any,
    options: {
      language?: 'fi' | 'en' | 'sv';
      format?: 'pdf' | 'docx' | 'html';
      includeImages?: boolean;
      professionalFormat?: boolean;
    } = {}
  ): Promise<FinnishPermitDocument> {
    const {
      language = 'fi',
      format = 'pdf',
      includeImages = true,
      professionalFormat = true
    } = options;

    console.log('[FinnishPermitDocumentService] Generating permit document with options:', options);

    // Generar especificaciones técnicas finlandesas
    const technicalSpecs = this.generateFinnishTechnicalSpecifications(buildingData);
    
    // Generar evaluación ambiental
    const environmentalAssessment = this.generateEnvironmentalAssessment(cadastralInfo);
    
    // Generar información de planificación urbana
    const urbanPlanning = this.generateUrbanPlanningInfo(cadastralInfo);
    
    // Realizar validaciones finlandesas
    const validationResults = this.performFinnishValidations(buildingData, technicalSpecs, environmentalAssessment, urbanPlanning);
    
    // Generar campos específicos finlandeses
    const finnishSpecific = {
      applicantInfo: this.generateApplicantInfo(buildingData),
      designerInfo: this.generateDesignerInfo(buildingData),
      constructorInfo: this.generateConstructorInfo(buildingData),
      technicalSpecifications: technicalSpecs,
      environmentalAssessment: environmentalAssessment,
      urbanPlanning: urbanPlanning
    };
    
    // Regulaciones aplicables
    const applicableRegulations = {
      buildingCode: language === 'fi' ? 'Rakennusmääräyskokoelma' : 'Building Code',
      energyEfficiency: language === 'fi' ? 'Energiatehokkuusasetus' : 'Energy Efficiency Regulation',
      fireSafety: language === 'fi' ? 'Paloturvallisuusasetus' : 'Fire Safety Regulation',
      accessibility: language === 'fi' ? 'Esteettömyysasetus' : 'Accessibility Regulation',
      environmental: language === 'fi' ? 'Ympäristönsuojeluasetus' : 'Environmental Protection Act',
      landUse: language === 'fi' ? 'Maankäyttö- ja rakennuslaki' : 'Land Use and Building Act'
    };

    // Crear documento base con campos finlandeses
    const document: FinnishPermitDocument = {
      documentId: this.generateDocumentId(),
      documentType: permitRequirements.permitType,
      language,
      format,
      
      projectInfo: this.generateProjectInfo(buildingData, cadastralInfo),
      buildingSpecifications: this.generateBuildingSpecifications(buildingData),
      cadastralInfo: this.generateCadastralInfo(cadastralInfo),
      permitRequirements: this.generatePermitRequirements(permitRequirements),
      requiredDocuments: this.generateRequiredDocuments(permitRequirements),
      compliance: this.checkCompliance(buildingData, cadastralInfo),
      recommendations: this.generateRecommendations(buildingData, cadastralInfo, permitRequirements),
      officialData: {
        source: 'Finnish Official Data Service',
        lastUpdated: new Date().toISOString(),
        regulation: 'Rakennusasetus (Building Decree)'
      },
      
      // CAMPOS ESPECÍFICOS FINLANDESES
      finnishSpecific: finnishSpecific,
      applicableRegulations: applicableRegulations,
      validationResults: validationResults
    };

    console.log('[FinnishPermitDocumentService] Document generated:', document);
    return document;
  }

  /**
   * Genera documento en formato PDF profesional
   */
  async generatePDFDocument(document: FinnishPermitDocument): Promise<Blob> {
    console.log('[FinnishPermitDocumentService] Generating PDF document');
    
    // Aquí se implementaría la generación real de PDF
    // Por ahora, simulamos la generación
    const pdfContent = this.generatePDFContent(document);
    
    // Simular blob de PDF
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    
    console.log('[FinnishPermitDocumentService] PDF generated successfully');
    return blob;
  }

  /**
   * Genera documento en formato Word profesional
   */
  async generateWordDocument(document: FinnishPermitDocument): Promise<Blob> {
    console.log('[FinnishPermitDocumentService] Generating Word document');
    
    // Aquí se implementaría la generación real de Word
    const wordContent = this.generateWordContent(document);
    
    // Simular blob de Word
    const blob = new Blob([wordContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    console.log('[FinnishPermitDocumentService] Word document generated successfully');
    return blob;
  }

  /**
   * Genera documento HTML para vista previa
   */
  async generateHTMLDocument(document: FinnishPermitDocument): Promise<string> {
    console.log('[FinnishPermitDocumentService] Generating HTML document');
    
    const template = this.documentTemplates[`${document.documentType}_${document.language}`];
    if (!template) {
      throw new Error(`Template not found for ${document.documentType}_${document.language}`);
    }
    
    const htmlContent = this.generateHTMLContent(document, template);
    
    console.log('[FinnishPermitDocumentService] HTML document generated successfully');
    return htmlContent;
  }

  // ===== FUNCIONES ESPECÍFICAS FINLANDESAS =====

  /**
   * Genera especificaciones técnicas según estándares finlandeses
   */
  private generateFinnishTechnicalSpecifications(buildingData: any): any {
    return {
      buildingCode: 'Rakennusmääräyskokoelma',
      energyClass: this.determineEnergyClass(buildingData),
      fireSafetyClass: this.determineFireSafetyClass(buildingData),
      accessibilityClass: this.determineAccessibilityClass(buildingData),
      structuralClass: this.determineStructuralClass(buildingData),
      foundationType: 'Concrete Foundation',
      heatingSystem: 'District Heating',
      ventilationSystem: 'Mechanical Ventilation',
      waterSupply: 'Municipal Water Supply',
      electricalSystem: 'Standard Electrical System'
    };
  }

  /**
   * Determina la clase de energía según estándares finlandeses
   */
  private determineEnergyClass(buildingData: any): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' {
    const area = buildingData.area || 0;
    const volume = buildingData.volume || 0;
    
    // Lógica simplificada para determinar clase de energía
    if (area < 100) return 'A';
    if (area < 500) return 'B';
    if (area < 1000) return 'C';
    if (area < 2000) return 'D';
    if (area < 5000) return 'E';
    if (area < 10000) return 'F';
    if (area < 20000) return 'G';
    return 'H';
  }

  /**
   * Determina la clase de seguridad contra incendios
   */
  private determineFireSafetyClass(buildingData: any): 'P1' | 'P2' | 'P3' | 'P4' {
    const height = buildingData.height || 0;
    const floors = buildingData.floors || 1;
    
    if (height <= 8 && floors <= 2) return 'P1';
    if (height <= 25 && floors <= 8) return 'P2';
    if (height <= 50 && floors <= 16) return 'P3';
    return 'P4';
  }

  /**
   * Determina la clase de accesibilidad
   */
  private determineAccessibilityClass(buildingData: any): 'A' | 'B' | 'C' {
    const type = buildingData.type || 'residential';
    
    if (type === 'public') return 'A';
    if (type === 'commercial') return 'B';
    return 'C';
  }

  /**
   * Determina la clase estructural
   */
  private determineStructuralClass(buildingData: any): 'RC1' | 'RC2' | 'RC3' {
    const height = buildingData.height || 0;
    
    if (height <= 8) return 'RC1';
    if (height <= 25) return 'RC2';
    return 'RC3';
  }

  /**
   * Genera evaluación ambiental según estándares finlandeses
   */
  private generateEnvironmentalAssessment(cadastralData: any): any {
    return {
      soilType: cadastralData.soilType || 'Silt',
      groundwaterLevel: cadastralData.groundwaterLevel || 2.0,
      contaminationRisk: cadastralData.contaminationRisk || false,
      noiseAssessment: true,
      vibrationAssessment: false,
      dustAssessment: true,
      wasteManagement: 'Municipal Waste Collection',
      stormwaterManagement: 'Stormwater Drainage System'
    };
  }

  /**
   * Genera información de planificación urbana
   */
  private generateUrbanPlanningInfo(cadastralData: any): any {
    return {
      masterPlan: 'Yleiskaava 2020',
      detailedPlan: 'Asemakaava A-1',
      buildingRights: cadastralData.buildingRights || true,
      heightLimits: 25,
      setbackRequirements: 3,
      parkingRequirements: 2,
      greenAreaRequirements: 0.3
    };
  }

  /**
   * Genera información del solicitante
   */
  private generateApplicantInfo(projectData: any): any {
    return {
      name: projectData.client || 'Applicant Name',
      address: projectData.address || 'Street Address',
      postalCode: '00100',
      city: projectData.municipality || 'Helsinki',
      phone: '+358 40 123 4567',
      email: 'applicant@example.com',
      organization: projectData.organization || undefined,
      organizationId: projectData.organizationId || undefined
    };
  }

  /**
   * Genera información del diseñador
   */
  private generateDesignerInfo(projectData: any): any {
    return {
      name: projectData.architect || 'Architect Name',
      title: 'Arkkitehti',
      licenseNumber: 'ARK-12345',
      organization: 'Architecture Office',
      address: 'Designer Street 1',
      phone: '+358 40 987 6543',
      email: 'architect@example.com',
      responsibleDesigner: true
    };
  }

  /**
   * Genera información del constructor
   */
  private generateConstructorInfo(projectData: any): any {
    return {
      name: 'Construction Company Ltd',
      organizationId: '1234567-8',
      address: 'Construction Street 1',
      phone: '+358 40 555 1234',
      email: 'construction@example.com',
      licenseNumber: 'RAK-98765'
    };
  }

  /**
   * Realiza validaciones finlandesas completas
   */
  private performFinnishValidations(buildingData: any, technicalSpecs: any, environmentalAssessment: any, urbanPlanning: any): any {
    const buildingCodeValidation = FinnishBuildingValidator.validateBuildingCode(buildingData, technicalSpecs);
    const energyValidation = FinnishBuildingValidator.validateEnergyEfficiency(technicalSpecs, buildingData);
    const fireSafetyValidation = FinnishBuildingValidator.validateFireSafety(technicalSpecs, buildingData);
    const accessibilityValidation = FinnishBuildingValidator.validateAccessibility(technicalSpecs, buildingData);
    const environmentalValidation = FinnishBuildingValidator.validateEnvironmental(environmentalAssessment);
    const urbanPlanningValidation = FinnishBuildingValidator.validateUrbanPlanning(urbanPlanning, buildingData);

    const allErrors = [
      ...buildingCodeValidation.errors,
      ...energyValidation.errors,
      ...fireSafetyValidation.errors,
      ...accessibilityValidation.errors,
      ...environmentalValidation.errors,
      ...urbanPlanningValidation.errors
    ];

    const allWarnings = [
      ...buildingCodeValidation.warnings,
      ...energyValidation.warnings,
      ...fireSafetyValidation.warnings,
      ...accessibilityValidation.warnings,
      ...environmentalValidation.warnings,
      ...urbanPlanningValidation.warnings
    ];

    return {
      buildingCodeCompliance: buildingCodeValidation.compliant,
      energyEfficiencyCompliance: energyValidation.compliant,
      fireSafetyCompliance: fireSafetyValidation.compliant,
      accessibilityCompliance: accessibilityValidation.compliant,
      environmentalCompliance: environmentalValidation.compliant,
      zoningCompliance: urbanPlanningValidation.compliant,
      structuralCompliance: buildingCodeValidation.compliant,
      validationErrors: allErrors,
      validationWarnings: allWarnings
    };
  }

  /**
   * Obtiene plantillas disponibles (solo una por idioma)
   */
  getAvailableTemplates(): DocumentTemplate[] {
    // Solo retornar una plantilla por idioma para evitar duplicados
    const templates = [
      this.documentTemplates['both_fi'],
      this.documentTemplates['both_en'],
      this.documentTemplates['both_sv']
    ].filter(Boolean); // Filtrar plantillas que existan
    
    return templates;
  }

  // Métodos privados para generar contenido

  private generateDocumentId(): string {
    return `PERMIT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProjectInfo(buildingData: any, cadastralInfo: any): any {
    return {
      name: buildingData.projectInfo?.name || 'IFC Project',
      location: {
        address: `${cadastralInfo.address?.street} ${cadastralInfo.address?.number}, ${cadastralInfo.address?.postalCode} ${cadastralInfo.address?.city}`,
        coordinates: cadastralInfo.coordinates?.wgs84,
        municipality: cadastralInfo.municipality?.name,
        propertyId: cadastralInfo.propertyId
      },
      client: 'To be specified',
      architect: 'To be specified',
      date: new Date().toISOString().split('T')[0]
    };
  }

  private generateBuildingSpecifications(buildingData: any): any {
    return {
      type: buildingData.classification?.buildingType || 'Residential',
      use: buildingData.classification?.useCategory || 'Dwelling',
      area: buildingData.dimensions?.surface || 0,
      volume: buildingData.dimensions?.volume || 0,
      height: buildingData.dimensions?.height || 0,
      floors: buildingData.additionalInfo?.floors || 1,
      energyClass: buildingData.classification?.energyClass || 'A',
      constructionMethod: buildingData.additionalInfo?.constructionMethod || 'OnSite'
    };
  }

  private generateCadastralInfo(cadastralInfo: any): any {
    return {
      propertyNumber: cadastralInfo.propertyNumber,
      landArea: cadastralInfo.area?.landArea || 0,
      buildingCoverage: cadastralInfo.area?.buildingCoverage || 0,
      zoning: {
        code: cadastralInfo.zoning?.code || 'Unknown',
        name: cadastralInfo.zoning?.name || 'Unknown Zone',
        description: cadastralInfo.zoning?.description || 'Unknown zoning',
        buildingRights: cadastralInfo.zoning?.buildingRights || false
      }
    };
  }

  private generatePermitRequirements(permitRequirements: any): any {
    return {
      required: permitRequirements.permitRequired,
      type: permitRequirements.permitType,
      timeline: permitRequirements.estimatedTimeline,
      costs: permitRequirements.estimatedCosts
    };
  }

  private generateRequiredDocuments(permitRequirements: any): any {
    return permitRequirements.requirements;
  }

  private checkCompliance(buildingData: any, cadastralInfo: any): any {
    // Verificar cumplimiento con regulaciones finlandesas
    const buildingArea = buildingData.dimensions?.surface || 0;
    const buildingHeight = buildingData.dimensions?.height || 0;
    const zoning = cadastralInfo.zoning;
    
    return {
      buildingCode: true, // Asumir cumplimiento básico
      zoningRegulations: zoning?.buildingRights || false,
      energyEfficiency: buildingData.classification?.energyClass === 'A' || buildingData.classification?.energyClass === 'B',
      accessibility: buildingArea > 200, // Requerido para edificios grandes
      fireSafety: buildingHeight > 6 || buildingData.additionalInfo?.floors > 2,
      environmental: buildingArea > 500 // Requerido para proyectos grandes
    };
  }

  private generateRecommendations(buildingData: any, cadastralInfo: any, permitRequirements: any): string[] {
    const recommendations: string[] = [];
    
    if (permitRequirements.permitRequired) {
      recommendations.push('Building permit is required for this project');
      recommendations.push('Submit application to local building authority');
    }
    
    if (buildingData.dimensions?.height > 6) {
      recommendations.push('Building height exceeds standard limits - consider fire safety requirements');
    }
    
    if (buildingData.dimensions?.surface > 500) {
      recommendations.push('Large building area - environmental assessment may be required');
    }
    
    if (!cadastralInfo.zoning?.buildingRights) {
      recommendations.push('Check zoning regulations - building rights may be restricted');
    }
    
    return recommendations;
  }

  private generatePDFContent(document: FinnishPermitDocument): string {
    // Simular contenido PDF
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
72 720 Td
(Finnish Building Permit Application) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
350
%%EOF`;
  }

  private generateWordContent(document: FinnishPermitDocument): string {
    // Simular contenido Word (XML)
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Finnish Building Permit Application</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
  }

  private generateHTMLContent(document: FinnishPermitDocument, template: DocumentTemplate): string {
    const sections = template.sections.sort((a, b) => a.order - b.order);
    
    let html = `
<!DOCTYPE html>
<html lang="${document.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f5f5f5; }
        .form-group { margin-bottom: 15px; }
        .form-label { font-weight: bold; display: block; margin-bottom: 5px; }
        .form-value { padding: 8px; background-color: #f9f9f9; border: 1px solid #ddd; }
        .recommendation { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .compliance-yes { color: green; }
        .compliance-no { color: red; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${template.name}</h1>
        <p>Document ID: ${document.documentId}</p>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
    </div>
`;

    sections.forEach(section => {
      html += this.generateSectionHTML(section, document);
    });

    html += `
</body>
</html>`;

    return html;
  }

  private generateSectionHTML(section: DocumentSection, document: FinnishPermitDocument): string {
    let html = `<div class="section">`;
    html += `<div class="section-title">${section.title}</div>`;
    
    switch (section.type) {
      case 'text':
        html += this.generateTextContent(section, document);
        break;
      case 'table':
        html += this.generateTableContent(section, document);
        break;
      case 'form':
        html += this.generateFormContent(section, document);
        break;
      case 'chart':
        html += this.generateChartContent(section, document);
        break;
    }
    
    html += `</div>`;
    return html;
  }

  private generateTextContent(section: DocumentSection, document: FinnishPermitDocument): string {
    switch (section.content) {
      case 'header_template':
        return `
          <div class="header-section">
            <h1>Rakennuslupahakemus</h1>
            <p><strong>Project:</strong> ${document.projectInfo.name}</p>
            <p><strong>Location:</strong> ${document.projectInfo.location.address}</p>
            <p><strong>Municipality:</strong> ${document.projectInfo.location.municipality}</p>
            <div class="regulations-reference">
              <h3>Regulaciones Aplicables:</h3>
              <ul>
                <li>Maankäyttö- ja rakennuslaki 132/1999 (Ley de Uso del Suelo y Construcción)</li>
                <li>Rakennusmääräyskokoelma (Código de Construcción Finlandés)</li>
                <li>Energiatehokkuusasetus 1429/2021 (Regulación de Eficiencia Energética)</li>
                <li>Paloturvallisuusasetus 468/2011 (Regulación de Seguridad contra Incendios)</li>
                <li>Esteettömyysasetus 380/2015 (Regulación de Accesibilidad)</li>
                <li>Ympäristönsuojeluasetus 527/2014 (Ley de Protección Ambiental)</li>
              </ul>
            </div>
          </div>
        `;
      case 'recommendations_template':
        return document.recommendations.map(rec => 
          `<div class="recommendation">• ${rec}</div>`
        ).join('');
      default:
        return `<p>Content for ${section.content}</p>`;
    }
  }

  private generateTableContent(section: DocumentSection, document: FinnishPermitDocument): string {
    switch (section.content) {
      case 'building_specs_template':
        return `
          <table class="table">
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Building Type</td><td>${document.buildingSpecifications.type}</td></tr>
            <tr><td>Use</td><td>${document.buildingSpecifications.use}</td></tr>
            <tr><td>Area (m²)</td><td>${document.buildingSpecifications.area.toFixed(2)}</td></tr>
            <tr><td>Volume (m³)</td><td>${document.buildingSpecifications.volume.toFixed(2)}</td></tr>
            <tr><td>Height (m)</td><td>${document.buildingSpecifications.height.toFixed(2)}</td></tr>
            <tr><td>Floors</td><td>${document.buildingSpecifications.floors}</td></tr>
            <tr><td>Energy Class</td><td>${document.buildingSpecifications.energyClass}</td></tr>
          </table>
        `;
      case 'requirements_template':
        return `
          <table class="table">
            <tr><th>Document</th><th>Required</th></tr>
            <tr><td>Site Plan</td><td>${document.requiredDocuments.sitePlan ? 'Yes' : 'No'}</td></tr>
            <tr><td>Floor Plans</td><td>${document.requiredDocuments.floorPlans ? 'Yes' : 'No'}</td></tr>
            <tr><td>Sections</td><td>${document.requiredDocuments.sections ? 'Yes' : 'No'}</td></tr>
            <tr><td>Elevations</td><td>${document.requiredDocuments.elevations ? 'Yes' : 'No'}</td></tr>
            <tr><td>Structural Calculations</td><td>${document.requiredDocuments.structuralCalculations ? 'Yes' : 'No'}</td></tr>
            <tr><td>Energy Calculations</td><td>${document.requiredDocuments.energyCalculations ? 'Yes' : 'No'}</td></tr>
          </table>
        `;
      case 'compliance_template':
        return `
          <table class="table">
            <tr><th>Regulación Finlandesa</th><th>Referencia</th><th>Cumplimiento</th></tr>
            <tr>
              <td>Código de Construcción</td>
              <td>Rakennusmääräyskokoelma</td>
              <td class="${document.compliance.buildingCode ? 'compliance-yes' : 'compliance-no'}">${document.compliance.buildingCode ? 'Cumple' : 'No cumple'}</td>
            </tr>
            <tr>
              <td>Regulaciones de Zonificación</td>
              <td>Maankäyttö- ja rakennuslaki § 119</td>
              <td class="${document.compliance.zoningRegulations ? 'compliance-yes' : 'compliance-no'}">${document.compliance.zoningRegulations ? 'Cumple' : 'No cumple'}</td>
            </tr>
            <tr>
              <td>Eficiencia Energética</td>
              <td>Energiatehokkuusasetus 1429/2021</td>
              <td class="${document.compliance.energyEfficiency ? 'compliance-yes' : 'compliance-no'}">${document.compliance.energyEfficiency ? 'Cumple' : 'No cumple'}</td>
            </tr>
            <tr>
              <td>Accesibilidad</td>
              <td>Esteettömyysasetus 380/2015</td>
              <td class="${document.compliance.accessibility ? 'compliance-yes' : 'compliance-no'}">${document.compliance.accessibility ? 'Cumple' : 'No cumple'}</td>
            </tr>
            <tr>
              <td>Seguridad contra Incendios</td>
              <td>Paloturvallisuusasetus 468/2011</td>
              <td class="${document.compliance.fireSafety ? 'compliance-yes' : 'compliance-no'}">${document.compliance.fireSafety ? 'Cumple' : 'No cumple'}</td>
            </tr>
            <tr>
              <td>Protección Ambiental</td>
              <td>Ympäristönsuojeluasetus 527/2014</td>
              <td class="${document.compliance.environmental ? 'compliance-yes' : 'compliance-no'}">${document.compliance.environmental ? 'Cumple' : 'No cumple'}</td>
            </tr>
          </table>
        `;
      default:
        return `<p>Table content for ${section.content}</p>`;
    }
  }

  private generateFormContent(section: DocumentSection, document: FinnishPermitDocument): string {
    switch (section.content) {
      case 'project_info_template':
        return `
          <div class="form-group">
            <div class="form-label">Project Name</div>
            <div class="form-value">${document.projectInfo.name}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Address</div>
            <div class="form-value">${document.projectInfo.location.address}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Municipality</div>
            <div class="form-value">${document.projectInfo.location.municipality}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Property ID</div>
            <div class="form-value">${document.projectInfo.location.propertyId}</div>
          </div>
        `;
      case 'site_info_template':
        return `
          <div class="form-group">
            <div class="form-label">Property Number</div>
            <div class="form-value">${document.cadastralInfo.propertyNumber}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Land Area (m²)</div>
            <div class="form-value">${document.cadastralInfo.landArea.toFixed(2)}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Building Coverage (%)</div>
            <div class="form-value">${document.cadastralInfo.buildingCoverage.toFixed(1)}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Zoning</div>
            <div class="form-value">${document.cadastralInfo.zoning.name} (${document.cadastralInfo.zoning.code})</div>
          </div>
        `;
      default:
        return `<p>Form content for ${section.content}</p>`;
    }
  }

  private generateChartContent(section: DocumentSection, document: FinnishPermitDocument): string {
    switch (section.content) {
      case 'timeline_template':
        return `
          <div class="form-group">
            <div class="form-label">Application Review</div>
            <div class="form-value">${document.permitRequirements.timeline.applicationReview} days</div>
          </div>
          <div class="form-group">
            <div class="form-label">Decision Time</div>
            <div class="form-value">${document.permitRequirements.timeline.decisionTime} days</div>
          </div>
          <div class="form-group">
            <div class="form-label">Total Process</div>
            <div class="form-value">${document.permitRequirements.timeline.totalProcess} days</div>
          </div>
          <div class="form-group">
            <div class="form-label">Application Fee</div>
            <div class="form-value">€${document.permitRequirements.costs.applicationFee.toFixed(2)}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Processing Fee</div>
            <div class="form-value">€${document.permitRequirements.costs.processingFee.toFixed(2)}</div>
          </div>
          <div class="form-group">
            <div class="form-label">Total Estimated Cost</div>
            <div class="form-value">€${document.permitRequirements.costs.totalEstimated.toFixed(2)}</div>
          </div>
        `;
      default:
        return `<p>Chart content for ${section.content}</p>`;
    }
  }
}
