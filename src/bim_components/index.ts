import * as OBC from "@thatopen/components";
import { TodoCreator } from "./TodoCreator";
import { SimpleQTO } from "./SimpleQTO";
import { MaterialQTO } from "./Materials";
import { LCACalculator } from "./LCA";
import { ZoomExtendUtil } from "./ZoomExtend";

import { BCFTool } from "./BCF";
import { CostCalculator } from "./Cost";
import { Kunta3DViewer } from "./Kunta3D";

import { GisLayers } from "./GisLayers";

// Memory Optimization Components
import { MemoryManager } from "../utils/MemoryManager";
import { DisposalManager } from "../utils/DisposalManager";
import { IFCLoaderOptimized } from "../utils/IFCLoaderOptimized";
import { MemoryOptimizationManager } from "../utils/MemoryOptimizationManager";

export function registerComponents(components: OBC.Components) {
  // Register existing components
  components.add("TodoCreator", new TodoCreator(components));
  components.add("SimpleQTO", new SimpleQTO(components));
  components.add("MaterialQTO", new MaterialQTO(components));
  components.add(LCACalculator.uuid, new LCACalculator(components));
  components.add("ZoomExtendUtil", new ZoomExtendUtil(components));

  components.add("BCFTool", new BCFTool(components));
  components.add("CostCalculator", new CostCalculator(components));
  
  // Register Kunta3D component
  components.add("Kunta3DViewer", new Kunta3DViewer(components));

  // Register GisLayers for 3D Tiles / Cesium Ion
  components.add(GisLayers.uuid, new GisLayers(components));

  // Register Memory Optimization Components
  components.add(MemoryManager.uuid, new MemoryManager(components));
  components.add(DisposalManager.uuid, new DisposalManager(components));
  components.add(IFCLoaderOptimized.uuid, new IFCLoaderOptimized(components));
  components.add(MemoryOptimizationManager.uuid, new MemoryOptimizationManager(components));
  
  console.log('[ComponentRegistry] All components registered, including Memory Optimization System');
}

export { GisLayers };
export const GIS_LAYERS_UUID = GisLayers.uuid; 