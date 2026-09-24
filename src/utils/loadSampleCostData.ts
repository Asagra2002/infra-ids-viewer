import { useCostStore } from '../stores/CostStore';
import { sampleProjectInfo, sampleCostElements } from '../data/__examples__/sampleCostData';

export function loadSampleCostData(): void {
  const setCostData = useCostStore.getState().setCostData;
  const setProjectInfo = useCostStore.getState().setProjectInfo;

  // Cargar información del proyecto
  setProjectInfo(sampleProjectInfo);

  // Cargar datos de costos
  setCostData(sampleCostElements);
} 