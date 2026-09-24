import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { GisLayers } from "../../bim_components";
import { CesiumUsageManager } from "../../utils/CesiumUsageManager";

export interface SidebarToggleToolbarState {
  components: OBC.Components;
  gridId: string;
}

export const sidebarToggleToolbarTemplate: BUI.StatefullComponent<SidebarToggleToolbarState> = (
  state,
) => {
  const { gridId, components } = state;

  let leftSidebarVisible = false;
  let rightSidebarVisible = false;
  let elementDataVisible = false;
  let viewpointsVisible = false;
  let quantitiesVisible = false;
  let lcaVisible = false;
  let costVisible = false;
  let gisVisible = false;
  let idsVisible = false;
  let bcfVisible = false;

  const toggleLeftSidebar = () => {
    leftSidebarVisible = !leftSidebarVisible;
    
    // Find left sidebar elements (models panel) - try multiple selectors
    let leftSidebarElements = document.querySelectorAll('[data-element="models"]');
    if (leftSidebarElements.length === 0) {
      leftSidebarElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="models"]');
    }
    if (leftSidebarElements.length === 0) {
      leftSidebarElements = document.querySelectorAll('bim-panel-section:has([data-element="models"])');
    }
    if (leftSidebarElements.length === 0) {
      // Try to find by grid area
      leftSidebarElements = document.querySelectorAll('[style*="grid-area: models"]');
    }
    
    leftSidebarElements.forEach((element: any) => {
      if (leftSidebarVisible) {
        // Show as overlay - slide in from right
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Hide overlay - slide out to right
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    
    // Update button states
    updateButtonStates();
  };

  const toggleRightSidebar = () => {
    rightSidebarVisible = !rightSidebarVisible;
    
    // Find right sidebar elements (queries panel) - try multiple selectors
    let rightSidebarElements = document.querySelectorAll('[data-element="queries"]');
    if (rightSidebarElements.length === 0) {
      rightSidebarElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="queries"]');
    }
    if (rightSidebarElements.length === 0) {
      rightSidebarElements = document.querySelectorAll('bim-panel-section:has([data-element="queries"])');
    }
    if (rightSidebarElements.length === 0) {
      // Try to find by grid area
      rightSidebarElements = document.querySelectorAll('[style*="grid-area: queries"]');
    }
    
    rightSidebarElements.forEach((element: any) => {
      if (rightSidebarVisible) {
        // Show as overlay - slide in from right
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Hide overlay - slide out to right
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    
    // Update button states
    updateButtonStates();
  };

  const toggleElementData = () => {
    elementDataVisible = !elementDataVisible;
    
    // Find elementData panel - try multiple selectors
    let elementDataElements = document.querySelectorAll('[data-element="elementData"]');
    if (elementDataElements.length === 0) {
      elementDataElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="elementData"]');
    }
    if (elementDataElements.length === 0) {
      elementDataElements = document.querySelectorAll('[style*="grid-area: elementData"]');
    }
    
    elementDataElements.forEach((element: any) => {
      if (elementDataVisible) {
        // Show as overlay - slide in from right
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Hide overlay - slide out to right
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    
    // Update button states
    updateButtonStates();
  };

  const toggleViewpoints = () => {
    viewpointsVisible = !viewpointsVisible;
    
    // Find viewpoints panel - try multiple selectors
    let viewpointsElements = document.querySelectorAll('[data-element="viewpoints"]');
    if (viewpointsElements.length === 0) {
      viewpointsElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="viewpoints"]');
    }
    if (viewpointsElements.length === 0) {
      viewpointsElements = document.querySelectorAll('[style*="grid-area: viewpoints"]');
    }
    
    viewpointsElements.forEach((element: any) => {
      if (viewpointsVisible) {
        // Show as overlay - slide in from right
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Hide overlay - slide out to right
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    
    // Update button states
    updateButtonStates();
  };

  const toggleQuantities = () => {
    quantitiesVisible = !quantitiesVisible;
    
    // Find quantities panel - try multiple selectors
    let quantitiesElements = document.querySelectorAll('[data-element="quantities"]');
    if (quantitiesElements.length === 0) {
      quantitiesElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="quantities"]');
    }
    if (quantitiesElements.length === 0) {
      quantitiesElements = document.querySelectorAll('[style*="grid-area: quantities"]');
    }
    
    quantitiesElements.forEach((element: any) => {
      if (quantitiesVisible) {
        // Show as overlay - slide in from right
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Hide overlay - slide out to right
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    
    // Update button states
    updateButtonStates();
  };

  const toggleLCA = () => {
    lcaVisible = !lcaVisible;
    
    // Find LCA panel elements using the same pattern as other panels
    let lcaElements = document.querySelectorAll('[data-element="lca"]');
    if (lcaElements.length === 0) {
      lcaElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="lca"]');
    }
    if (lcaElements.length === 0) {
      lcaElements = document.querySelectorAll('[style*="grid-area: lca"]');
    }
    
    lcaElements.forEach((element: any) => {
      if (lcaVisible) {
        // Show as overlay - slide in from right
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Hide overlay - slide out to right
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    
    // Update button states
    updateButtonStates();
  };

  const toggleCost = () => {
    costVisible = !costVisible;
    
    // Find Cost panel elements using the same pattern as other panels
    let costElements = document.querySelectorAll('[data-element="cost"]');
    if (costElements.length === 0) {
      costElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="cost"]');
    }
    if (costElements.length === 0) {
      costElements = document.querySelectorAll('[style*="grid-area: cost"]');
    }
    
    costElements.forEach((element: any) => {
      if (costVisible) {
        // Show as overlay - slide in from right
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Hide overlay - slide out to right
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    
    // Update button states
    updateButtonStates();
  };

  const toggleGIS = () => {
    gisVisible = !gisVisible;

    let gisElements = document.querySelectorAll('[data-element="gis"]');
    if (gisElements.length === 0) {
      gisElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="gis"]');
    }
    if (gisElements.length === 0) {
      gisElements = document.querySelectorAll('[style*="grid-area: gis"]');
    }

    const gisLayers = components.get(GisLayers) as InstanceType<typeof GisLayers> | undefined;

    if (gisVisible) {
      if (gisLayers && CesiumUsageManager.canUseCesium()) {
        CesiumUsageManager.incrementUsage();
        gisLayers.layer3d.enabled = true;
      }
      if (gisLayers?.layer2d?.isInitialized) {
        setTimeout(() => gisLayers.layer2d.invalidateSize(), 50);
        setTimeout(() => gisLayers.layer2d.invalidateSize(), 350);
      }
      const usageEl = document.getElementById("gis-usage-text");
      if (usageEl) {
        const info = CesiumUsageManager.getUsageInfo();
        usageEl.textContent = `GIS: ${info.current}/${info.limit} uses today`;
      }
      const limitEl = document.getElementById("gis-limit-msg");
      if (limitEl) limitEl.style.display = CesiumUsageManager.canUseCesium() ? "none" : "block";
    } else {
      if (gisLayers) {
        gisLayers.layer3d.enabled = false;
      }
    }

    gisElements.forEach((element: any) => {
      if (gisVisible) {
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflow = "hidden";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });

    updateButtonStates();
  };

  const toggleIDS = () => {
    idsVisible = !idsVisible;
    
    // Find IDS panel elements using the same pattern as other panels
    let idsElements = document.querySelectorAll('[data-element="ids"]');
    if (idsElements.length === 0) {
      idsElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="ids"]');
    }
    if (idsElements.length === 0) {
      idsElements = document.querySelectorAll('[style*="grid-area: ids"]');
    }
    
    idsElements.forEach((element: any) => {
      if (idsVisible) {
        // Show as overlay - slide in from right
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        // Hide overlay - slide out to right
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    
    // Update button states
    updateButtonStates();
  };

  const toggleBCF = () => {
    bcfVisible = !bcfVisible;
    let bcfElements = document.querySelectorAll('[data-element="bcf"]');
    if (bcfElements.length === 0) {
      bcfElements = document.querySelectorAll('bim-panel-section[data-grid-template-id*="bcf"]');
    }
    if (bcfElements.length === 0) {
      bcfElements = document.querySelectorAll('[style*="grid-area: bcf"]');
    }
    bcfElements.forEach((element: any) => {
      if (bcfVisible) {
        element.style.display = "block";
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.right = "0";
        element.style.width = "21.375rem";
        element.style.height = "calc(100% - 80px)";
        element.style.maxHeight = "calc(100vh - 80px)";
        element.style.overflowY = "auto";
        element.style.zIndex = "1001";
        element.style.backgroundColor = "#1a1d23";
        element.style.borderLeft = "1px solid #404040";
        element.style.transform = "translateX(0)";
        element.style.transition = "transform 0.3s ease-in-out";
      } else {
        element.style.transform = "translateX(100%)";
        setTimeout(() => {
          element.style.display = "none";
        }, 300);
      }
    });
    updateButtonStates();
  };

  const updateButtonStates = () => {
    const leftBtn = document.getElementById("toggle-left-sidebar");
    const rightBtn = document.getElementById("toggle-right-sidebar");
    const elementDataBtn = document.getElementById("toggle-element-data");
    const viewpointsBtn = document.getElementById("toggle-viewpoints");
    const quantitiesBtn = document.getElementById("toggle-quantities");
    const lcaBtn = document.getElementById("toggle-lca");
    const costBtn = document.getElementById("toggle-cost");

    if (leftBtn) leftBtn.setAttribute("tooltip-title", leftSidebarVisible ? "Hide Models Panel" : "Models Panel");
    if (rightBtn) rightBtn.setAttribute("tooltip-title", rightSidebarVisible ? "Hide Queries Panel" : "Queries Panel");
    if (elementDataBtn) elementDataBtn.setAttribute("tooltip-title", elementDataVisible ? "Hide Selection Data" : "Selection Data");
    if (viewpointsBtn) viewpointsBtn.setAttribute("tooltip-title", viewpointsVisible ? "Hide Viewpoints" : "Viewpoints");
    if (quantitiesBtn) quantitiesBtn.setAttribute("tooltip-title", quantitiesVisible ? "Hide Element Quantities" : "Element Quantities");
    if (lcaBtn) lcaBtn.setAttribute("tooltip-title", lcaVisible ? "Hide LCA Analysis" : "LCA Analysis");
    if (costBtn) costBtn.setAttribute("tooltip-title", costVisible ? "Hide Cost Analysis" : "Cost Analysis");

    const gisBtn = document.getElementById("toggle-gis");
    if (gisBtn) gisBtn.setAttribute("tooltip-title", gisVisible ? "Hide GIS (Cesium)" : "GIS (Cesium)");

    const idsBtn = document.getElementById("toggle-ids");
    if (idsBtn) idsBtn.setAttribute("tooltip-title", idsVisible ? "Hide IDS Validation" : "IDS Validation");

    const bcfBtn = document.getElementById("toggle-bcf");
    if (bcfBtn) bcfBtn.setAttribute("tooltip-title", bcfVisible ? "Hide BCF (RAVA 3.5)" : "BCF (RAVA 3.5)");
  };

  const onCreated = (e?: Element) => {
    if (!e) return;
    
    
    // Initial button states
    setTimeout(() => {
      updateButtonStates();
    }, 100);
    
    // Initialize panels as hidden overlays
    setTimeout(() => {
      initializePanelsAsHidden();
    }, 500);
  };
  
  const initializePanelsAsHidden = () => {
    
    // Initialize all panels as hidden overlays
    const panels = [
      { name: "models", selector: '[data-element="models"]' },
      { name: "elementData", selector: '[data-element="elementData"]' },
      { name: "viewpoints", selector: '[data-element="viewpoints"]' },
      { name: "queries", selector: '[data-element="queries"]' },
      { name: "quantities", selector: '[data-element="quantities"]' },
      { name: "lca", selector: '[data-element="lca"]' },
      { name: "cost", selector: '[data-element="cost"]' },
      { name: "gis", selector: '[data-element="gis"]' },
      { name: "ids", selector: '[data-element="ids"]' },
      { name: "bcf", selector: '[data-element="bcf"]' },
    ];
    
    panels.forEach(panel => {
      let elements = document.querySelectorAll(panel.selector);
      
      if (elements.length === 0) {
        elements = document.querySelectorAll(`bim-panel-section[data-grid-template-id*="${panel.name}"]`);
      }
      if (elements.length === 0) {
        elements = document.querySelectorAll(`[style*="grid-area: ${panel.name}"]`);
      }
      
      elements.forEach((element: any) => {
        element.style.display = "none";
        element.style.position = "absolute";
        element.style.zIndex = "1001";
      });
    });
  };

  return BUI.html`
    <div style="
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: rgba(32, 33, 36, 0.9);
      padding: 8px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    " ${BUI.ref(onCreated)}>
      <bim-button 
        id="toggle-left-sidebar"
        @click=${toggleLeftSidebar}
        icon="mage:box-3d-fill"
        tooltip-title="Models Panel"
        tooltip-text="Toggle the models panel to view and manage loaded 3D models, their properties, and visibility settings."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-right-sidebar"
        @click=${toggleRightSidebar}
        icon="gravity-ui:magnifier"
        tooltip-title="Queries Panel"
        tooltip-text="Open the queries panel to search and filter elements by properties, categories, or custom criteria."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-element-data"
        @click=${toggleElementData}
        icon="material-symbols:task"
        tooltip-title="Selection Data"
        tooltip-text="View detailed information about the currently selected elements, including properties, materials, and quantities."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-viewpoints"
        @click=${toggleViewpoints}
        icon="solar:camera-bold"
        tooltip-title="Viewpoints"
        tooltip-text="Manage saved viewpoints and camera positions to quickly navigate to specific areas of the model."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-quantities"
        @click=${toggleQuantities}
        icon="solar:ruler-bold"
        tooltip-title="Element Quantities"
        tooltip-text="View and analyze quantities of selected elements, including areas, volumes, and material takeoffs."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-lca"
        @click=${toggleLCA}
        icon="material-symbols:eco"
        tooltip-title="LCA Analysis"
        tooltip-text="Perform Life Cycle Assessment analysis on the complete loaded IFC model to calculate material quantities and environmental impact."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-cost"
        @click=${toggleCost}
        icon="material-symbols:euro"
        tooltip-title="Cost Analysis"
        tooltip-text="Perform cost analysis on selected elements to calculate material costs and construction estimates."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-gis"
        @click=${toggleGIS}
        icon="material-symbols:layers"
        tooltip-title="GIS (Cesium)"
        tooltip-text="View and position the IFC model on a 3D globe, with photorealistic terrain and 3D Tiles from Cesium Ion."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-ids"
        @click=${toggleIDS}
        icon="material-symbols:verified"
        tooltip-title="IDS Validation"
        tooltip-text="Validate IFC model against RAVA 3.5 IDS specifications. Check compliance with Finnish building permit requirements."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
      <bim-button 
        id="toggle-bcf"
        @click=${toggleBCF}
        icon="mdi:file-document-multiple-outline"
        tooltip-title="BCF (RAVA 3.5)"
        tooltip-text="Generate BCF topics from RAVA validation failures, visualize them and download .bcfzip for use in any BIM collaboration software."
        tooltip-position="right"
        style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;"
      ></bim-button>
    </div>
  `;
};
