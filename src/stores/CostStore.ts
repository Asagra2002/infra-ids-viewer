import { create } from 'zustand';
import { BaseCostElement, CostAnalysisResult, BaseProjectInfo, ElementData } from '../types/cost';
import { UnifiedCostService } from '../services/UnifiedCostService';

export type Language = 'en' | 'fi';

type CostInfo = BaseProjectInfo;

interface CostState {
  language: Language;
  costData: BaseCostElement[];
  projectInfo: CostInfo | null;
  analysisResult: CostAnalysisResult | null;
  setLanguage: (lang: Language) => void;
  setCostData: (data: BaseCostElement[]) => void;
  setProjectInfo: (info: CostInfo) => void;
  analyzeCosts: () => void;
  setAnalysisResult: (result: CostAnalysisResult | null) => void;
}

/**
 * Convierte un BaseCostElement a ElementData
 */
const convertToElementData = (element: BaseCostElement): ElementData => ({
  id: element.id,
  type: element.type,
  name: element.name,
  objectType: element.type,
  taloClassification: {
    code: element.taloCode,
    name: element.taloName,
    identification: element.taloCode
  },
  quantities: element.baseQuantities || {},
  properties: {}
});

export const useCostStore = create<CostState>((set, get) => ({
  language: 'en',
  costData: [],
  projectInfo: null,
  analysisResult: null,

  setLanguage: (lang: Language) => set({ language: lang }),
  
  setCostData: (data: BaseCostElement[]) => {
    set({ costData: data });
    // Realizar análisis automáticamente cuando se actualizan los datos
    const state = get();
    if (state.projectInfo) {
      const costService = UnifiedCostService.getInstance();
      const elementData = data.map(convertToElementData);
      const result = costService.analyzeCosts(elementData);
      set({ analysisResult: result });
    }
  },

  setProjectInfo: (info: CostInfo) => {
    set({ projectInfo: info });
    // Realizar análisis si hay datos disponibles
    const state = get();
    if (state.costData.length > 0) {
      const costService = UnifiedCostService.getInstance();
      const elementData = state.costData.map(convertToElementData);
      const result = costService.analyzeCosts(elementData);
      set({ analysisResult: result });
    }
  },

  analyzeCosts: () => {
    const state = get();
    if (state.costData.length > 0 && state.projectInfo) {
      const costService = UnifiedCostService.getInstance();
      const elementData = state.costData.map(convertToElementData);
      const result = costService.analyzeCosts(elementData);
      set({ analysisResult: result });
    }
  },

  setAnalysisResult: (result: CostAnalysisResult | null) => set({ analysisResult: result })
})); 