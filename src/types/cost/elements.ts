import { ElementData, BaseCostElement, BaseProjectInfo } from './shared';

export interface MaterialCostsTableData {
    id: string;
    name: string;
    description?: string;
    type: string;
    category: string;
    taloCode: string;
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    overheadCost: number;
    totalCost: number;
    baseQuantities?: string;  // JSON string containing quantity information
    primaryQuantity?: string; // String in format "value unit"
}

export type { ElementData, BaseCostElement, BaseProjectInfo };