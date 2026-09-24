import { ElementData, IFCQuantityValue } from '../types/cost';
import {
  Talo2000Unit,
  Talo2000MeasurementType,
  Talo2000Measurement,
  Talo2000Element,
  Talo2000QuantityValue
} from '../types/talo2000';

export const IFC_TYPE_MEASUREMENTS: { [key: string]: Talo2000Measurement } = {
  // Elementos estructurales
  'IfcWall': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: [Talo2000Unit.CUBIC_METERS]
  },
  'IFCWALL': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: [Talo2000Unit.CUBIC_METERS]
  },
  'IfcSlab': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: [Talo2000Unit.CUBIC_METERS]
  },
  'IFCSLAB': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: [Talo2000Unit.CUBIC_METERS]
  },
  'IfcColumn': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },
  'IFCCOLUMN': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },
  'IfcBeam': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },
  'IFCBEAM': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },

  // Aberturas
  'IfcWindow': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },
  'IFCWINDOW': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },
  'IfcDoor': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },
  'IFCDOOR': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },

  // Equipamiento
  'IfcFurniture': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IFCFURNITURE': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IfcSanitaryTerminal': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IFCSANITARYTERMINAL': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },

  // Elementos MEP
  'IfcFlowTerminal': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IFCFLOWTERMINAL': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IfcDistributionFlowElement': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  'IFCDISTRIBUTIONFLOWELEMENT': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },

  // Missing IFC types that were causing errors
  'IfcBuildingElementProxy': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: [Talo2000Unit.CUBIC_METERS]
  },
  'IFCBUILDINGELEMENTPROXY': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: [Talo2000Unit.CUBIC_METERS]
  },
  'IfcElectricAppliance': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IFCELECTRICAPPLIANCE': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IfcCovering': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  'IFCCOVERING': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  'IfcCommunicationsAppliance': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IFCCOMMUNICATIONSAPPLIANCE': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },

  // Additional IFC types
  'IfcPipeSegment': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  'IFCPIPESEGMENT': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  'IfcDuctSegment': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  'IFCDUCTSEGMENT': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  'IfcCableSegment': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  'IFCCABLESEGMENT': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },

  // Elementos de sitio y otros
  'IfcRailing': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  'IFCRAILING': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  'IfcRoof': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  'IFCROOF': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  'IfcGeographicElement': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  'IFCGEOGRAPHICELEMENT': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  'IfcSite': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  'IFCSITE': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  'IfcWasteTerminal': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IFCWASTETERMINAL': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  'IfcFooting': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: []
  },
  'IFCFOOTING': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: []
  }
};

// Actualizar TALO_2000_MEASUREMENTS para incluir medidas específicas por código Talo
export const TALO_2000_MEASUREMENTS: { [key: string]: Talo2000Measurement } = {
  // Elementos de sitio y preparación
  '1.1': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  // Elementos estructurales
  '1.2.1': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: [Talo2000Unit.SQUARE_METERS]
  },
  '1.2.2': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: [Talo2000Unit.CUBIC_METERS]
  },
  '1.2.3': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: []
  },
  '1.2.4': {
    primary: Talo2000MeasurementType.VOLUME,
    unit: Talo2000Unit.CUBIC_METERS,
    alternativeUnits: []
  },
  '1.2.6': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  // Elementos de cerramiento
  '1.3': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  '1.3.1': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  '1.3.2': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  '1.3.3': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  '1.3.4': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  '1.3.5': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: []
  },
  // Elementos MEP
  '2.1': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  '2.2': {
    primary: Talo2000MeasurementType.LENGTH,
    unit: Talo2000Unit.METERS,
    alternativeUnits: []
  },
  '2.3': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  '2.4': {
    primary: Talo2000MeasurementType.COUNT,
    unit: Talo2000Unit.PIECES,
    alternativeUnits: []
  },
  // Default para otros códigos
  'default': {
    primary: Talo2000MeasurementType.AREA,
    unit: Talo2000Unit.SQUARE_METERS,
    alternativeUnits: [Talo2000Unit.CUBIC_METERS, Talo2000Unit.METERS]
  }
};

export const TALO_ELEMENTS: { [key: string]: Talo2000Element } = {
  // 1. Perustukset (Foundations)
  '1.2.1': {
    code: '1.2.1',
    category: 'concrete',
    name: {
      fi: 'Perustukset',
      en: 'Foundations'
    },
    description: {
      fi: 'Perustukset',
      en: 'Foundations'
    },
    costs: {
      material: 150,
      labor: 60,
      equipment: 20,
      overhead: 30,
      total: 260
    },
    measurementUnit: Talo2000Unit.CUBIC_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-1', 'RT-3']
  },

  '1.2.2': {
    code: '1.2.2',
    category: 'concrete',
    name: {
      fi: 'Alapohjat',
      en: 'Base floors'
    },
    description: {
      fi: 'Alapohjat',
      en: 'Base floors'
    },
    costs: {
      material: 180,
      labor: 70,
      equipment: 25,
      overhead: 35,
      total: 310
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-1', 'RT-4']
  },

  // 2. Kantavat rakenteet (Load-bearing structures)
  '1.2.3': {
    code: '1.2.3',
    category: 'concrete',
    name: {
      fi: 'Kantavat rakenteet',
      en: 'Load-bearing structures'
    },
    description: {
      fi: 'Kantavat rakenteet',
      en: 'Load-bearing structures'
    },
    costs: {
      material: 120,
      labor: 45,
      equipment: 15,
      overhead: 25,
      total: 205
    },
    measurementUnit: Talo2000Unit.CUBIC_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-1', 'RT-2', 'RT-5', 'RT-6']
  },

  // 3. Välipohjat (Intermediate floors)
  '1.2.4': {
    code: '1.2.4',
    category: 'concrete',
    name: {
      fi: 'Välipohjat',
      en: 'Intermediate floors'
    },
    description: {
      fi: 'Välipohjat',
      en: 'Intermediate floors'
    },
    costs: {
      material: 160,
      labor: 65,
      equipment: 20,
      overhead: 30,
      total: 275
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-1', 'RT-7']
  },

  // 4. Vesikatot (Roofs)
  '1.2.6': {
    code: '1.2.6',
    category: 'concrete',
    name: {
      fi: 'Vesikatot',
      en: 'Roofs'
    },
    description: {
      fi: 'Vesikatot',
      en: 'Roofs'
    },
    costs: {
      material: 140,
      labor: 55,
      equipment: 20,
      overhead: 30,
      total: 245
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-1', 'RT-8']
  },

  // 5. Elementos de cerramiento (Enclosure elements)
  '1.3': {
    code: '1.3',
    category: 'enclosure',
    name: {
      fi: 'Elementos de cerramiento',
      en: 'Enclosure elements'
    },
    description: {
      fi: 'Elementos de cerramiento',
      en: 'Enclosure elements'
    },
    costs: {
      material: 120,
      labor: 50,
      equipment: 15,
      overhead: 25,
      total: 210
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-15', 'RT-16']
  },
  '1.3.1': {
    code: '1.3.1',
    category: 'enclosure',
    name: {
      fi: 'Muros exteriores',
      en: 'External walls'
    },
    description: {
      fi: 'Muros exteriores',
      en: 'External walls'
    },
    costs: {
      material: 150,
      labor: 60,
      equipment: 20,
      overhead: 30,
      total: 260
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-15', 'RT-16']
  },
  '1.3.2': {
    code: '1.3.2',
    category: 'enclosure',
    name: {
      fi: 'Muros interiores',
      en: 'Internal walls'
    },
    description: {
      fi: 'Muros interiores',
      en: 'Internal walls'
    },
    costs: {
      material: 100,
      labor: 40,
      equipment: 10,
      overhead: 20,
      total: 170
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-17', 'RT-18']
  },
  '1.3.3': {
    code: '1.3.3',
    category: 'enclosure',
    name: {
      fi: 'Techos',
      en: 'Ceilings'
    },
    description: {
      fi: 'Techos',
      en: 'Ceilings'
    },
    costs: {
      material: 80,
      labor: 35,
      equipment: 10,
      overhead: 15,
      total: 140
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-19', 'RT-20']
  },
  '1.3.4': {
    code: '1.3.4',
    category: 'enclosure',
    name: {
      fi: 'Complementos',
      en: 'Accessories'
    },
    description: {
      fi: 'Complementos',
      en: 'Accessories'
    },
    costs: {
      material: 90,
      labor: 30,
      equipment: 8,
      overhead: 12,
      total: 140
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-21', 'RT-22']
  },
  '1.3.5': {
    code: '1.3.5',
    category: 'enclosure',
    name: {
      fi: 'Elementos especiales',
      en: 'Special elements'
    },
    description: {
      fi: 'Elementos especiales',
      en: 'Special elements'
    },
    costs: {
      material: 200,
      labor: 80,
      equipment: 25,
      overhead: 40,
      total: 345
    },
    measurementUnit: Talo2000Unit.SQUARE_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-23', 'RT-24']
  },

  // 5. Putkiosat (Pipe components)
  '2.1': {
    code: '2.1',
    category: 'metal',
    name: {
      fi: 'Putkiosat',
      en: 'Pipe components'
    },
    description: {
      fi: 'Putkiosat',
      en: 'Pipe components'
    },
    costs: {
      material: 3000,
      labor: 200,
      equipment: 100,
      overhead: 150,
      total: 3450
    },
    measurementUnit: Talo2000Unit.CUBIC_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-9', 'RT-10']
  },

  // 6. LVI-järjestelmät (HVAC systems)
  'T2000-801': {
    code: 'T2000-801',
    category: 'metal',
    name: {
      fi: 'Vesi- ja viemärijärjestelmät',
      en: 'Water and sewage systems'
    },
    description: {
      fi: 'Vesi- ja viemärijärjestelmät',
      en: 'Water and sewage systems'
    },
    costs: {
      material: 3000,
      labor: 200,
      equipment: 100,
      overhead: 150,
      total: 3450
    },
    measurementUnit: Talo2000Unit.CUBIC_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-9', 'RT-10']
  },
  'T2000-802': {
    code: 'T2000-802',
    category: 'metal',
    name: {
      fi: 'Lämmitysjärjestelmät',
      en: 'Heating systems'
    },
    description: {
      fi: 'Lämmitysjärjestelmät',
      en: 'Heating systems'
    },
    costs: {
      material: 2500,
      labor: 180,
      equipment: 90,
      overhead: 130,
      total: 2900
    },
    measurementUnit: Talo2000Unit.CUBIC_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-11', 'RT-12']
  },
  'T2000-803': {
    code: 'T2000-803',
    category: 'metal',
    name: {
      fi: 'Ilmanvaihtojärjestelmät',
      en: 'Ventilation systems'
    },
    description: {
      fi: 'Ilmanvaihtojärjestelmät',
      en: 'Ventilation systems'
    },
    costs: {
      material: 2800,
      labor: 190,
      equipment: 95,
      overhead: 140,
      total: 3225
    },
    measurementUnit: Talo2000Unit.CUBIC_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-13', 'RT-14']
  },
  '2.4': {
    code: '2.4',
    category: 'electrical',
    name: {
      fi: 'Sähköjärjestelmät',
      en: 'Electrical systems'
    },
    description: {
      fi: 'Sähköjärjestelmät',
      en: 'Electrical systems'
    },
    costs: {
      material: 2500,
      labor: 180,
      equipment: 90,
      overhead: 130,
      total: 2900
    },
    measurementUnit: Talo2000Unit.CUBIC_METERS,
    measurements: TALO_2000_MEASUREMENTS['default'],
    rtComponents: ['RT-25', 'RT-26']
  }
};

/**
 * Obtiene la cantidad según las reglas de medición de Talo 2000
 */
export function getTalo2000Quantity(element: ElementData, taloCode: string): Talo2000QuantityValue | null {
  const measurement = TALO_2000_MEASUREMENTS[taloCode] || TALO_2000_MEASUREMENTS['default'];
  
  // Intentar obtener la cantidad primaria
  let quantity = getQuantityByType(element, measurement.primary);
  if (quantity) {
    return {
      value: quantity.value,
      unit: measurement.unit,
      measurementType: measurement.primary
    };
  }

  // Si hay un tipo secundario y no se encontró el primario, intentar con el secundario
  if (measurement.secondary) {
    quantity = getQuantityByType(element, measurement.secondary);
    if (quantity) {
      return {
        value: quantity.value,
        unit: measurement.unit,
        measurementType: measurement.secondary
      };
    }
  }

  return null;
}

/**
 * Obtiene una cantidad específica según el tipo de medición
 */
function getQuantityByType(element: ElementData, type: Talo2000MeasurementType): IFCQuantityValue | null {
  switch (type) {
    case Talo2000MeasurementType.VOLUME:
      return element.quantities['Volume'] || element.quantities['NetVolume'];
    case Talo2000MeasurementType.AREA:
      return element.quantities['Area'] || element.quantities['NetArea'];
    case Talo2000MeasurementType.LENGTH:
      return element.quantities['Length'];
    case Talo2000MeasurementType.COUNT:
      return { value: 1, unit: Talo2000Unit.PIECES };
    case Talo2000MeasurementType.WEIGHT:
      return element.quantities['Weight'];
    default:
      return null;
  }
}

/**
 * Valida si un código Talo 2000 es válido
 */
export function isValidTalo2000Code(code: string): boolean {
  return code in TALO_ELEMENTS || code in TALO_2000_MEASUREMENTS;
}

/**
 * Convierte una cantidad entre diferentes unidades Talo 2000
 */
export function convertTalo2000Units(
  value: number,
  fromUnit: Talo2000Unit,
  toUnit: Talo2000Unit
): number | null {
  // Por ahora solo soportamos conversiones simples
  if (fromUnit === toUnit) return value;
  
  // Conversiones básicas
  const conversions: { [key: string]: number } = {
    'm2_to_m3': 0.3, // Altura típica de 0.3m
    'm3_to_m2': 3.33, // Inverso de la altura típica
  };

  const conversionKey = `${fromUnit}_to_${toUnit}`;
  const factor = conversions[conversionKey];
  
  if (factor) {
    return value * factor;
  }

  return null;
}

/**
 * Obtiene la unidad de medida correcta basada en el tipo IFC y código Talo
 */
export function getCorrectUnit(ifcType: string, taloCode: string, rtDetails?: any): Talo2000Unit {
  // 1. Prioridad: RT-kortti
  if (rtDetails?.measurementUnit) {
    return rtDetails.measurementUnit;
  }

  // 2. Prioridad: Código Talo - búsqueda recursiva
  if (taloCode) {
    let currentTaloCode = taloCode;
    while (currentTaloCode && currentTaloCode.length > 0) {
      const taloMeasurement = TALO_2000_MEASUREMENTS[currentTaloCode];
  if (taloMeasurement) {
    return taloMeasurement.unit;
      }
      // Remover el último nivel del código
      currentTaloCode = currentTaloCode.split('.').slice(0, -1).join('.');
    }
  }

  // 3. Prioridad: Tipo IFC
  const normalizedIfcType = ifcType.toLowerCase();
  const ifcKeys = Object.keys(IFC_TYPE_MEASUREMENTS);
  const matchingIfcKey = ifcKeys.find(k => k.toLowerCase() === normalizedIfcType);

  // Log para diagnóstico de tipos IFC no encontrados (solo en desarrollo)
  if (!matchingIfcKey && process.env.NODE_ENV === 'development') {
    console.log('IFC Type not found in mappings:', {
      originalType: ifcType,
      normalizedType: normalizedIfcType,
      availableTypes: ifcKeys.map(k => k.toLowerCase())
    });
  }

  if (matchingIfcKey) {
    return IFC_TYPE_MEASUREMENTS[matchingIfcKey].unit;
  }

  // 4. Default
  return Talo2000Unit.SQUARE_METERS;
}

/**
 * Obtiene la cantidad correcta basada en la unidad de medida
 */
export function getCorrectQuantity(element: any, unit: Talo2000Unit): number {
  if (!element.baseQuantities) return 0;

  switch(unit) {
    case Talo2000Unit.CUBIC_METERS:
      return element.baseQuantities['GrossVolume']?.value || 
             element.baseQuantities['NetVolume']?.value || 0;
    
    case Talo2000Unit.SQUARE_METERS:
      return element.baseQuantities['GrossSideArea']?.value || 
             element.baseQuantities['NetSideArea']?.value || 
             element.baseQuantities['GrossArea']?.value || 
             element.baseQuantities['NetArea']?.value || 0;
    
    case Talo2000Unit.METERS:
      return element.baseQuantities['Length']?.value || 0;
    
    case Talo2000Unit.PIECES:
      return 1;
    
    default:
      return 0;
  }
} 