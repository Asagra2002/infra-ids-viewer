export interface ModernCostValues {
    material: number;
    labor: number;
    equipment: number;
    overhead: number;
    total: number;
}

export interface IFCQuantityValue {
    value: number;
    unit: string;
}

export interface ElementData {
    id: number;
    name: string;
    description?: string;
    type: string;
    category: string;
    taloCode: string;
    quantity?: number;
    unit?: string;
    quantities: { [key: string]: IFCQuantityValue };
    properties: any;
    taloName?: string;
}

export interface BaseCostElement {
    id: number;
    name: string;
    type: string;
    category: string;
    quantity: number;
    taloCode: string;
    taloName: string;
    baseQuantities: {
        [key: string]: {
            value: number;
            unit: string;
        };
    };
    costs: {
        material: number;
        labor: number;
        equipment: number;
        overhead: number;
        total: number;
    };
}

export interface BaseProjectInfo {
    volume: number;
    date: string;
    currency: string;
} 