import { 
    UnifiedCostValues,
    BaseCostElement, 
    CostAnalysisResult,
    ElementData,
    CostData,
    RTKorttiDetails,
    CostValue,
    ModernCostValues
} from '../types/cost';
import { TALO_ELEMENTS } from '../constants/talo2000';
import { FINNISH_COSTS, REGIONAL_FACTORS, BUILDING_TYPE_FACTORS, TRANSPORT_FACTORS } from '../data/finnishCostDatabase';

type ConversionFactor = {
    from: string;
    to: string;
    factor: number;
    description?: string;
};

// Definición temporal del tipo RT_KORTTI_DATABASE hasta que se cree el archivo
const RT_KORTTI_DATABASE: Record<string, CostData> = {};

export class UnifiedCostService {
    private static instance: UnifiedCostService;
    private conversionFactors: ConversionFactor[] = [
        // Área a volumen (para cimientos y estructuras)
        {
            from: 'm²',
            to: 'm³',
            factor: 0.3, // Profundidad típica de cimientos
            description: 'Typical foundation depth'
        },
        // Longitud a área (para ventanas)
        {
            from: 'kpl',
            to: 'm²',
            factor: 1.5, // Área típica de ventana
            description: 'Typical window area'
        },
        // Área bruta a área neta
        {
            from: 'brm²',
            to: 'm²',
            factor: 0.85,
            description: 'Gross to net area ratio'
        },
        // Longitud a unidades (para mobiliario)
        {
            from: 'jm',
            to: 'kpl',
            factor: 0.5, // 2m por unidad de mobiliario
            description: 'Linear meters to furniture units'
        }
    ];

    private constructor() {}

    public static getInstance(): UnifiedCostService {
        if (!UnifiedCostService.instance) {
            UnifiedCostService.instance = new UnifiedCostService();
        }
        return UnifiedCostService.instance;
    }

    /**
     * Convierte una cantidad de una unidad a otra
     */
    public convertUnit(
        value: number,
        fromUnit: string,
        toUnit: string
    ): number | null {
        // Si las unidades son iguales, retornar el mismo valor
        if (fromUnit === toUnit) return value;

        // Buscar factor de conversión directo
        const directConversion = this.conversionFactors.find(
            cf => cf.from === fromUnit && cf.to === toUnit
        );

        if (directConversion) {
            return value * directConversion.factor;
        }

        // Buscar conversión inversa
        const inverseConversion = this.conversionFactors.find(
            cf => cf.from === toUnit && cf.to === fromUnit
        );

        if (inverseConversion) {
            return value / inverseConversion.factor;
        }

        // No se encontró conversión
        return null;
    }

    /**
     * Verifica si es posible convertir entre dos unidades
     */
    public canConvertUnit(fromUnit: string, toUnit: string): boolean {
        return (
            fromUnit === toUnit ||
            this.conversionFactors.some(
                cf =>
                    (cf.from === fromUnit && cf.to === toUnit) ||
                    (cf.from === toUnit && cf.to === fromUnit)
            )
        );
    }

    /**
     * Obtiene el factor de conversión entre dos unidades
     */
    public getUnitConversionFactor(
        fromUnit: string,
        toUnit: string
    ): ConversionFactor | null {
        const directConversion = this.conversionFactors.find(
            cf => cf.from === fromUnit && cf.to === toUnit
        );

        if (directConversion) {
            return directConversion;
        }

        const inverseConversion = this.conversionFactors.find(
            cf => cf.from === toUnit && cf.to === fromUnit
        );

        if (inverseConversion) {
            return {
                from: fromUnit,
                to: toUnit,
                factor: 1 / inverseConversion.factor,
                description: `Inverse of: ${inverseConversion.description}`
            };
        }

        return null;
    }

    /**
     * Calcula el costo total para un elemento dado
     */
    public calculateElementCost(
        taloCode: string,
        quantity: number,
        region: keyof typeof REGIONAL_FACTORS = 'helsinki'
    ): BaseCostElement | null {
        const costData = FINNISH_COSTS[taloCode];
        if (!costData) return null;

        const regionalFactor = REGIONAL_FACTORS[region];
        const unifiedCosts = this.calculateTotalCosts(costData.costs, quantity, regionalFactor);
        
        // Convertir UnifiedCostValues a ModernCostValues para BaseCostElement
        const costs: ModernCostValues = {
            material: unifiedCosts.material,
            labor: unifiedCosts.labor,
            equipment: unifiedCosts.equipment || 0,
            overhead: unifiedCosts.overhead,
            total: unifiedCosts.total
        };

        return {
            id: Date.now(),
            quantity,
            name: costData.name.en,
            type: costData.talo2000.category,
            taloCode: costData.talo2000.code,
            taloName: costData.talo2000.category,
            baseQuantities: {
                [costData.properties.mainUnit]: {
                    value: quantity,
                    unit: costData.properties.mainUnit
                }
            },
            costs,
            rtDetails: this.convertToRTKorttiDetails(costData)
        };
    }

    /**
     * Convierte CostData a RTKorttiDetails
     */
    private convertToRTKorttiDetails(costData: CostData): RTKorttiDetails {
        return {
            code: costData.rtKortti?.code || '',
            materials: costData.composition?.materials.map(m => m.name.en) || [],
            workPhases: costData.composition?.labor.specialization || [],
            requirements: costData.technicalDetails?.fireRating || '',
            name: costData.name,
            source: costData.source,
            talo2000: costData.talo2000,
            technicalDetails: costData.technicalDetails,
            composition: costData.composition,
            maintenance: costData.maintenance
        };
    }

    /**
     * Calcula los costos totales aplicando cantidad y factor regional
     */
    private calculateTotalCosts(
        costs: CostData['costs'],
        quantity: number,
        regionalFactor: number
    ): UnifiedCostValues {
        const material = this.adjustCost(costs.material, quantity, regionalFactor);
        const labor = this.adjustCost(costs.labor, quantity, regionalFactor);
        const equipment = this.adjustCost(costs.equipment, quantity, regionalFactor);
        const overhead = this.calculateOverhead(costs.overhead, material + labor + equipment);

        const total = material + labor + equipment + overhead;

        return {
            material,
            labor,
            equipment,
            overhead,
            total
        };
    }

    /**
     * Ajusta un costo individual según cantidad y factor regional
     */
    private adjustCost(
        cost: CostValue,
        quantity: number,
        regionalFactor: number
    ): number {
        return cost.value * quantity * regionalFactor;
    }

    /**
     * Calcula el overhead basado en un porcentaje del costo base
     */
    private calculateOverhead(
        overhead: CostValue,
        baseCost: number
    ): number {
        if (overhead.unit === '%') {
            return (baseCost * overhead.value) / 100;
        }
        return overhead.value;
    }

    /**
     * Analiza los costos de una lista de elementos
     */
    public analyzeCosts(elements: ElementData[]): CostAnalysisResult {
        const result: CostAnalysisResult = {
            elementCosts: [],
            totalCosts: {
                material: 0,
                labor: 0,
                equipment: 0,
                overhead: 0,
                total: 0
            },
            costByCategory: {},
            costByTaloCode: {},
            metrics: {
                costPerArea: 0,
                percentageByCategory: {}
            }
        };

        let totalArea = 0;

        for (const element of elements) {
            const rtKortti = this.findMatchingRTKortti(element);
            if (!rtKortti) continue;

            const quantity = Object.values(element.quantities)[0]?.value || 0;
            if (quantity === 0) continue;

            const costs = this.calculateTotalCosts(rtKortti.costs, quantity, 1);
            const costElement = this.createBaseCostElement(element, rtKortti, quantity, costs);

            this.updateAnalysisResults(result, costElement, element);
            
            if (element.quantities['Area']?.value) {
                totalArea += element.quantities['Area'].value;
            }
        }

        this.calculateMetrics(result, totalArea);
        return result;
    }

    /**
     * Busca el RT-kortti correspondiente a un elemento
     */
    private findMatchingRTKortti(element: ElementData): CostData | null {
        if (element.taloClassification?.code) {
            const rtKortti = Object.values(RT_KORTTI_DATABASE).find(
                (rt: CostData) => rt.talo2000.code === element.taloClassification?.code
            );
            if (rtKortti) return rtKortti;
        }

        return Object.values(RT_KORTTI_DATABASE).find((rt: CostData) => {
            const matchesType = rt.applicableIfcTypes?.includes(element.type);
            if (!matchesType) return false;

            const elementName = element.name.toLowerCase();
            return rt.applicableNames?.some((pattern: string) => 
                elementName.includes(pattern.toLowerCase())
            );
        }) || null;
    }

    /**
     * Crea un elemento de costo base
     */
    private createBaseCostElement(
        element: ElementData,
        rtKortti: CostData,
        quantity: number,
        unifiedCosts: UnifiedCostValues
    ): BaseCostElement {
        // Convertir UnifiedCostValues a ModernCostValues
        const costs: ModernCostValues = {
            material: unifiedCosts.material,
            labor: unifiedCosts.labor,
            equipment: unifiedCosts.equipment || 0,
            overhead: unifiedCosts.overhead,
            total: unifiedCosts.total
        };

        return {
            id: element.id,
            name: element.name,
            type: element.type,
            taloCode: rtKortti.talo2000.code,
            taloName: rtKortti.talo2000.category,
            quantity: quantity,
            baseQuantities: element.quantities,
            costs,
            rtDetails: this.convertToRTKorttiDetails(rtKortti)
        };
    }

    /**
     * Actualiza los resultados del análisis con un nuevo elemento
     */
    private updateAnalysisResults(
        result: CostAnalysisResult,
        costElement: BaseCostElement,
        element: ElementData
    ): void {
        result.elementCosts.push(costElement);
        this.updateTotalCosts(result.totalCosts, costElement.costs);
        this.updateCostByCategory(result.costByCategory, element.type, costElement.costs);
        this.updateCostByTaloCode(result.costByTaloCode, costElement.taloCode, costElement.costs);
    }

    /**
     * Actualiza los costos totales
     */
    private updateTotalCosts(totalCosts: UnifiedCostValues, costs: UnifiedCostValues): void {
        totalCosts.material += costs.material;
        totalCosts.labor += costs.labor;
        totalCosts.equipment = (totalCosts.equipment || 0) + (costs.equipment || 0);
        totalCosts.overhead += costs.overhead;
        totalCosts.total += costs.total;
    }

    /**
     * Actualiza los costos por categoría
     */
    private updateCostByCategory(
        costByCategory: { [category: string]: UnifiedCostValues },
        category: string,
        costs: UnifiedCostValues
    ): void {
        if (!costByCategory[category]) {
            costByCategory[category] = {
                material: 0,
                labor: 0,
                equipment: 0,
                overhead: 0,
                total: 0
            };
        }
        this.updateTotalCosts(costByCategory[category], costs);
    }

    /**
     * Actualiza los costos por código Talo
     */
    private updateCostByTaloCode(
        costByTaloCode: { [taloCode: string]: UnifiedCostValues },
        taloCode: string,
        costs: UnifiedCostValues
    ): void {
        if (!costByTaloCode[taloCode]) {
            costByTaloCode[taloCode] = {
                material: 0,
                labor: 0,
                equipment: 0,
                overhead: 0,
                total: 0
            };
        }
        this.updateTotalCosts(costByTaloCode[taloCode], costs);
    }

    /**
     * Calcula las métricas finales
     */
    private calculateMetrics(result: CostAnalysisResult, totalArea: number): void {
        if (totalArea > 0) {
            result.metrics.costPerArea = result.totalCosts.total / totalArea;
        }

        Object.keys(result.costByCategory).forEach(category => {
            result.metrics.percentageByCategory[category] = 
                (result.costByCategory[category].total / result.totalCosts.total) * 100;
        });
    }

    /**
     * Obtiene los costos de referencia para un código Talo
     */
    public getReferenceCosts(taloCode: string): UnifiedCostValues | null {
        const rtKortti = Object.values(RT_KORTTI_DATABASE).find(
            (rt: CostData) => rt.talo2000.code === taloCode
        );
        if (rtKortti) {
            return this.calculateTotalCosts(rtKortti.costs, 1, 1);
        }
        return null;
    }

    /**
     * Estima la cantidad típica basada en el tamaño del proyecto
     */
    public getTypicalQuantity(
        taloCode: string,
        size: 'small' | 'medium' | 'large'
    ): number {
        const costData = FINNISH_COSTS[taloCode];
        if (!costData) return 0;

        return costData.properties.typicalQuantities[size];
    }

    /**
     * Valida si una cantidad está dentro de los rangos típicos
     */
    public validateQuantity(
        taloCode: string,
        quantity: number
    ): boolean {
        const costData = FINNISH_COSTS[taloCode];
        if (!costData) return false;

        const { small, large } = costData.properties.typicalQuantities;
        return quantity >= small * 0.5 && quantity <= large * 1.5;
    }

    /**
     * Obtiene las unidades alternativas disponibles para un código Talo
     */
    public getAvailableUnits(taloCode: string): string[] {
        const costData = FINNISH_COSTS[taloCode];
        if (!costData) return [];

        return [costData.properties.mainUnit, ...costData.properties.alternativeUnits];
    }
} 