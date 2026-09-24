import React, { useEffect, useState, useRef } from "react";
import * as BUI from "@thatopen/ui";
import { BCFCase, BCFCategory, BCFTool } from "../bim_components/BCF";
import * as OBC from "@thatopen/components";
import { useBCFStore } from '../stores/BCFStore';
import { useAuthStore } from '../stores/AuthStore';


interface Props {
  components?: OBC.Components;
}

export function BCFPage({ components }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const bcfToolRef = useRef<BCFTool>();
  const { isAuthenticated } = useAuthStore();
  
  const {
    categories,
    selectedCase,
    setCategories,
    setSelectedCase,
    setComponents,
    updateCaseStatus
  } = useBCFStore();

  useEffect(() => {
    if (components) {
      setComponents(components);
      let bcfTool = components.get(BCFTool);
      if (!bcfTool) {
    
        bcfTool = new BCFTool(components);
      } else {
    
      }
      bcfToolRef.current = bcfTool;
      
      // Force update categories and expand all categories by default
      const currentCategories = bcfTool.getCategories();
      setCategories(currentCategories);
      setExpandedCategories(new Set(currentCategories.map(c => c.id)));
  

      // Add event listener for BCF case creation
      window.addEventListener('bcf-case-created', ((event: CustomEvent) => {
        const { categoryId, bcfCase } = event.detail;
        const updatedCategories = bcfTool.getCategories();
        setCategories(updatedCategories);
        setSelectedCase(bcfCase);
      }) as EventListener);

      // Add event listener for IFC model loading
      window.addEventListener('ifc-model-loaded', ((event: CustomEvent) => {
        const { ifcGuid, ifcFilename } = event.detail;
        bcfTool.setIFCReference(ifcGuid, ifcFilename);
      }) as EventListener);
    }

    return () => {
      window.removeEventListener('bcf-case-created', (() => {}) as EventListener);
      window.removeEventListener('ifc-model-loaded', (() => {}) as EventListener);
      if (bcfToolRef.current) {
        bcfToolRef.current.clearHighlights();
      }
    };
  }, [components]);

  const handleFileUpload = async (file: File) => {

    if (!bcfToolRef.current) {
      console.error('[BCFPage] BCF Tool not initialized');
      return;
    }
    
    try {
  
      await bcfToolRef.current.loadBCFFile(file);
      // Force update categories after loading
      const updatedCategories = bcfToolRef.current.getCategories();
      
      setCategories(updatedCategories);
      
      // Show success message
      showMessage('BCF file loaded successfully!', 'success');
    } catch (error) {
      console.error("[BCFPage] Error loading BCF file:", error);
      showMessage(`Error loading BCF file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const showMessage = (message: string, type: 'success' | 'error') => {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)'};
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    messageDiv.innerHTML = `
      <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
      <span>${message}</span>
    `;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      messageDiv.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        if (document.body.contains(messageDiv)) {
          document.body.removeChild(messageDiv);
        }
      }, 300);
    }, type === 'success' ? 1500 : 3000);
  };

  const toggleCategory = (categoryId: string) => {

    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCaseClick = (bcfCase: BCFCase) => {
    if (!bcfToolRef.current) return;

    // Highlight elements
    bcfToolRef.current.highlightElements(bcfCase.elements);
    setSelectedCase(bcfCase);

    // If viewpoint exists, update camera
    if (bcfCase.viewpoint && components) {
      const worlds = components.get(OBC.Worlds);
      const worldKeys = Array.from(worlds.list.keys());
      if (worldKeys.length > 0) {
        const world = worlds.list.get(worldKeys[0]);
        if (world?.camera?.controls) {
          const { position, target } = bcfCase.viewpoint;
          world.camera.controls.setLookAt(
            position[0],
            position[1],
            position[2],
            target[0],
            target[1],
            target[2],
            true
          );
        }
      }
    }
  };

  const handleCaseStatusChange = (categoryId: string, caseId: string, status: BCFCase['status']) => {
    if (!bcfToolRef.current) return;
    
    bcfToolRef.current.updateCaseStatus(categoryId, caseId, status);
    updateCaseStatus(categoryId, caseId, status);
  };

  const handleExportBCF = async () => {
    if (!isAuthenticated) {
      alert('Authentication required to export BCF data. Please sign in to access this feature.');
      return;
    }
    
    if (!bcfToolRef.current) return;
    
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;
    loadingDiv.innerHTML = `
      <div>Preparing BCF file for export...</div>
      <div style="width: 100%; background: #444; height: 4px; border-radius: 2px;">
        <div style="width: 50%; height: 100%; background: #2196F3; border-radius: 2px;"></div>
      </div>
    `;
    document.body.appendChild(loadingDiv);
    
    try {
      const blob = await bcfToolRef.current.exportBCFFile();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "export.bcfzip";
      a.click();
      URL.revokeObjectURL(url);
      
      showMessage('BCF file exported successfully!', 'success');
    } catch (error) {
      console.error("Error exporting BCF file:", error);
      showMessage(`Error exporting BCF file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      if (document.body.contains(loadingDiv)) {
        document.body.removeChild(loadingDiv);
      }
    }
  };

  const bcfContent = BUI.Component.create<BUI.Panel>(() => {
    const renderCase = (bcfCase: BCFCase) => {
      const isSelected = selectedCase?.id === bcfCase.id;
      return BUI.html`
        <div 
          style="
            padding: 10px; 
            margin: 5px 0; 
            background: ${isSelected ? '#3a3a3a' : 'transparent'}; 
            border-radius: 4px; 
            cursor: pointer;
            border: 1px solid ${isSelected ? '#4a4a4a' : 'transparent'};
            border-left: 4px solid ${
              bcfCase.status === 'open' ? '#4caf50' : 
              bcfCase.status === 'in_progress' ? '#ff9800' : '#f44336'
            };
          "
          @click=${() => {
            if (bcfToolRef.current) {
              bcfToolRef.current.highlightElements(bcfCase.elements);
              setSelectedCase(bcfCase);
            }
          }}
        >
          <div style="font-weight: bold;">${bcfCase.title}</div>
          <div style="font-size: 0.9em; color: #888; margin: 5px 0;">${bcfCase.description}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
            <span style="font-size: 0.8em; color: #666;">
              ${new Date(bcfCase.createdAt).toLocaleDateString()}
            </span>
            <select 
              style="
                padding: 2px 6px;
                border-radius: 3px;
                background: transparent;
                color: ${
                  bcfCase.status === 'open' ? '#4caf50' : 
                  bcfCase.status === 'in_progress' ? '#ff9800' : '#f44336'
                };
                border: 1px solid currentColor;
                cursor: pointer;
              "
              @change=${(e: Event) => {
                const select = e.target as HTMLSelectElement;
                if (bcfToolRef.current) {
                  const category = categories.find(c => 
                    c.cases.some(cs => cs.id === bcfCase.id)
                  );
                  if (category) {
                    bcfToolRef.current.updateCaseStatus(
                      category.id,
                      bcfCase.id,
                      select.value as BCFCase['status']
                    );
                    setCategories(bcfToolRef.current.getCategories());
                  }
                }
              }}
            >
              <option value="open" ?selected=${bcfCase.status === 'open'}>Open</option>
              <option value="in_progress" ?selected=${bcfCase.status === 'in_progress'}>In Progress</option>
              <option value="closed" ?selected=${bcfCase.status === 'closed'}>Closed</option>
            </select>
          </div>
          ${bcfCase.viewpoint?.snapshot ? BUI.html`
            <div style="margin-top: 10px;">
              <img 
                src="${bcfCase.viewpoint.snapshot}" 
                style="width: 100%; border-radius: 4px; cursor: zoom-in;"
                @click=${(e: Event) => {
                  const img = e.target as HTMLImageElement;
                  const modal = document.createElement('div');
                  modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    cursor: pointer;
                  `;
                  modal.innerHTML = `
                    <img 
                      src="${bcfCase.viewpoint?.snapshot}" 
                      style="max-width: 90%; max-height: 90%; border-radius: 8px;"
                    >
                  `;
                  modal.addEventListener('click', () => {
                    document.body.removeChild(modal);
                  });
                  document.body.appendChild(modal);
                }}
              >
            </div>
          ` : ''}
        </div>
      `;
    };

    const renderCategory = (category: BCFCategory) => {
      const isExpanded = expandedCategories.has(category.id);
      return BUI.html`
        <div style="margin: 10px 0;">
          <div 
            style="
              font-weight: bold; 
              font-size: 1.1em; 
              padding: 5px 10px;
              background: #3a3a3a;
              border-radius: 4px;
              cursor: pointer;
              display: flex;
              justify-content: space-between;
              align-items: center;
            "
            @click=${() => toggleCategory(category.id)}
          >
            <span>${category.name} (${category.cases.length})</span>
            <span class="material-icons">
              ${isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </div>
          ${isExpanded ? BUI.html`
            <div style="margin-left: 10px;">
              ${category.cases.map(renderCase)}
            </div>
          ` : ''}
        </div>
      `;
    };

    return BUI.html`
      <div style="padding: 10px;">
        <div style="margin-bottom: 20px;">
          <input 
            type="file" 
            accept=".bcf,.bcfzip" 
            style="display: none;" 
            id="bcf-file-input"
            @change=${(e: Event) => {
              const input = e.target as HTMLInputElement;
              if (input.files?.length) {
                handleFileUpload(input.files[0]);
                input.value = ''; // Reset input
              }
            }}
          >
          <button 
            style="
              padding: 8px 16px;
              background: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
            "
            @click=${() => {
              document.getElementById('bcf-file-input')?.click();
            }}
          >
            <span class="material-icons">upload_file</span>
            Load BCF File
          </button>
        </div>
        ${categories.length > 0 ? BUI.html`
          <div>
            ${categories.map(renderCategory)}
          </div>
        ` : BUI.html`
          <div style="
            text-align: center;
            color: #888;
            padding: 20px;
            background: transparent;
            border-radius: 4px;
            border: 2px dashed #3a3a3a;
            margin: 20px 0;
          ">
            <span class="material-icons" style="font-size: 48px; margin-bottom: 10px; color: #666;">
              upload_file
            </span>
            <div>No BCF files loaded</div>
            <div style="font-size: 0.9em; margin-top: 5px; color: #666;">
              Click the button above to load a BCF file
            </div>
          </div>
        `}
      </div>
    `;
  });

  const sidebar = BUI.Component.create<BUI.Component>(() => {
    const buttonStyles = {
      height: "50px",
    };

    return BUI.html`
      <div style="padding: 4px; display: flex; flex-direction: column; gap: 8px;">
        <input 
          type="file" 
          accept=".bcf,.bcfzip,.json" 
          style="display: none;" 
          id="bcf-file-input"
          @change=${(e: Event) => {
            const input = e.target as HTMLInputElement;
            const file = input.files?.[0];
            if (file) {
              handleFileUpload(file);
            }
          }}
        >
        <bim-button
          style=${BUI.styleMap(buttonStyles)}
          icon="material-symbols:upload-file"
          tooltip-title="Load BCF"
          @click=${() => {
            document.getElementById("bcf-file-input")?.click();
          }}
        ></bim-button>
        <bim-button
          style=${BUI.styleMap(buttonStyles)}
          icon="uil:file-export"
          tooltip-title="Export BCF"
          @click=${handleExportBCF}
        ></bim-button>
      </div>
    `;
  });

  const footer = BUI.Component.create<BUI.Component>(() => {
    return BUI.html`
      <div style="display: flex; justify-content: center;">
        <bim-label>BCF Manager</bim-label>
      </div>
    `;
  });

  const gridLayout = {
    primary: {
      template: `
        "header header" 40px
        "content sidebar" 1fr
        "footer footer" 40px
        / 1fr 60px
      `,

      elements: {
        header: (() => {
          const inputBox = BUI.Component.create<BUI.TextInput>(() => {
            return BUI.html`
              <bim-text-input style="padding: 8px" placeholder="Search BCF Cases"></bim-text-input>
            `;
          });
          return inputBox;
        })(),
        sidebar,
        content: bcfContent,
        footer,
      },
    },
  };

  useEffect(() => {
    const grid = document.getElementById("bcfGrid") as BUI.Grid;
    if (grid) {
      grid.layouts = gridLayout;
      grid.layout = "primary";
    }
  }, []);

  return (
    <div style={{ 
      height: "100%", 
      backgroundColor: "transparent", 
      color: "white",
      display: "flex",
      flexDirection: "column"
    }}>

      <div style={{ 
        padding: "20px",
        display: "flex", 
        gap: "20px", // CAMBIO: aumentar gap
        justifyContent: "flex-start", // CAMBIO: alinear a la izquierda
        alignItems: "center", // CAMBIO: alinear verticalmente

        borderBottom: "1px solid #333"
      }}>
        <input
          type="file"
          accept=".bcf,.bcfzip,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
            }
          }}
          style={{ display: "none" }}
          id="bcf-file-input"
        />
        <button
          onClick={() => document.getElementById("bcf-file-input")?.click()}
          style={{
            padding: "12px 24px", // CAMBIO: aumentar padding
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "6px", // CAMBIO: aumentar border radius
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px", // CAMBIO: aumentar gap
            fontSize: "14px", // CAMBIO: agregar font size
            fontWeight: "500", // CAMBIO: agregar font weight
            transition: "all 0.2s ease", // CAMBIO: agregar transición
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)" // CAMBIO: agregar sombra
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
          }}
        >
          <span className="material-icons">upload_file</span>
          Load BCF File
        </button>
        <button
          onClick={handleExportBCF}
          disabled={!isAuthenticated}
          className="tooltip-enhanced"
          data-tooltip={!isAuthenticated ? "Authentication required to export BCF data. Please sign in to access this feature." : "Export BCF (BIM Collaboration Format) file with all issues and comments"}
          style={{
            padding: "12px 24px", // CAMBIO: aumentar padding
            background: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "6px", // CAMBIO: aumentar border radius
            cursor: !isAuthenticated ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px", // CAMBIO: aumentar gap
            fontSize: "14px", // CAMBIO: agregar font size
            fontWeight: "500", // CAMBIO: agregar font weight
            transition: "all 0.2s ease", // CAMBIO: agregar transición
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)", // CAMBIO: agregar sombra
            opacity: !isAuthenticated ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (isAuthenticated) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
          }}
        >
          <span className="material-icons">
            {!isAuthenticated ? 'lock' : 'file_download'}
          </span>
          {!isAuthenticated ? 'Login Required' : 'Export BCF'}
        </button>
      </div>

      <div style={{ 
        flexGrow: 1,
        overflowY: "auto",
        padding: "10px",
        maxHeight: "100%"
      }}>

        {categories.length > 0 ? (
          categories.map(category => (
            <div key={category.id} style={{ marginBottom: "15px" }}>
              <div 
                style={{
                  padding: "8px 12px",
                  backgroundColor: "transparent", // CAMBIO: de #2a2a2a a transparent
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid #3a3a3a" // CAMBIO: agregar borde
                }}
                onClick={() => {
                  const newExpanded = new Set(expandedCategories);
                  if (newExpanded.has(category.id)) {
                    newExpanded.delete(category.id);
                  } else {
                    newExpanded.add(category.id);
                  }
                  setExpandedCategories(newExpanded);
                }}
              >
                <span>{category.name} ({category.cases.length})</span>
                <span className="material-icons">
                  {expandedCategories.has(category.id) ? 'expand_less' : 'expand_more'}
                </span>
              </div>
              
              {expandedCategories.has(category.id) && (
                <div style={{ marginLeft: "15px", marginTop: "10px" }}>
                  {category.cases.map(bcfCase => (
                    <div 
                      key={bcfCase.id}
                      style={{
                        padding: "12px",
                        marginBottom: "8px",
                        backgroundColor: selectedCase?.id === bcfCase.id ? "#3a3a3a" : "transparent", // CAMBIO: de #2a2a2a a transparent
                        borderRadius: "4px",
                        cursor: "pointer",
                        border: selectedCase?.id === bcfCase.id ? "1px solid #4a4a4a" : "1px solid transparent", // CAMBIO: agregar borde
                        borderLeft: `4px solid ${
                          bcfCase.status === 'open' ? '#4caf50' : 
                          bcfCase.status === 'in_progress' ? '#ff9800' : '#f44336'
                        }`
                      }}
                      onClick={() => handleCaseClick(bcfCase)}
                    >
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{bcfCase.title}</div>
                      <div style={{ fontSize: "0.9em", color: "#aaa", marginBottom: "10px" }}>
                        {bcfCase.description}
                      </div>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center"
                      }}>
                        <span style={{ fontSize: "0.8em", color: "#888" }}>
                          {new Date(bcfCase.createdAt).toLocaleDateString()}
                        </span>
                        <select
                          value={bcfCase.status}
                          onChange={(e) => handleCaseStatusChange(
                            category.id,
                            bcfCase.id,
                            e.target.value as BCFCase['status']
                          )}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            backgroundColor: "transparent",
                            color: bcfCase.status === 'open' ? '#4caf50' : 
                                   bcfCase.status === 'in_progress' ? '#ff9800' : '#f44336',
                            border: "1px solid currentColor"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      {bcfCase.viewpoint?.snapshot && (
                        <div style={{ marginTop: "10px" }}>
                          <img
                            src={bcfCase.viewpoint.snapshot}
                            alt="BCF Snapshot"
                            style={{ 
                              width: "100%", 
                              borderRadius: "4px",
                              cursor: "zoom-in",
                              maxHeight: "200px",
                              objectFit: "cover"
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.style.cssText = `
                                position: fixed;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: rgba(0,0,0,0.9);
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                z-index: 1000;
                                cursor: pointer;
                              `;
                              modal.innerHTML = `
                                <img 
                                  src="${bcfCase.viewpoint?.snapshot}" 
                                  style="max-width: 90%; max-height: 90%; border-radius: 8px;"
                                >
                              `;
                              modal.addEventListener('click', () => {
                                document.body.removeChild(modal);
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{
            textAlign: "center",
            padding: "20px",
            color: "#888",
            backgroundColor: "transparent", // CAMBIO: de #2a2a2a a transparent
            borderRadius: "4px",
            margin: "10px 0",
            border: "2px dashed #3a3a3a" // CAMBIO: agregar borde punteado
          }}>
            <span className="material-icons" style={{ fontSize: "48px", marginBottom: "10px" }}>
              upload_file
            </span>
            <div>No BCF files loaded</div>
            <div style={{ fontSize: "0.9em", marginTop: "5px" }}>
              Click the button above to load a BCF file
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 