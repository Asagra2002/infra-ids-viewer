import * as BUI from "@thatopen/ui";

interface ProjectInfoState {
  projectData: {
    name: string;
    description: string;
    status: string;
    userRole: string;
    cost: number;
    progress: number;
    finishDate: Date;
  };
  setIsEditModalOpen: (isOpen: boolean) => void;
}

export const projectInfoTemplate: BUI.StatefullComponent<ProjectInfoState> = (state) => {
  const onCreated = (element?: Element) => {
    // Component created
  };

  try {
    const progressPercentage = (state.projectData.progress * 100).toFixed(1);
    const formattedCost = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(state.projectData.cost);
    const formattedDate = new Date(state.projectData.finishDate).toLocaleDateString();

    return BUI.html`
      <div class="project-info-panel" ${BUI.ref(onCreated)} id="project-info-panel">
        <div class="project-header">
          <h3>${state.projectData.name || 'Unnamed Project'}</h3>
          <div class="header-buttons">
            <button 
              @click=${(e: Event) => {
                e.stopPropagation();
                state.setIsEditModalOpen(true);
              }}
              class="icon-button"
              title="Edit Project"
            >
              <span class="material-icons">edit</span>
            </button>
          </div>
        </div>
        <div class="project-details">
          <div class="detail-item">
            <span class="label">Status</span>
            <span class="value status-${state.projectData.status?.toLowerCase()}">${state.projectData.status}</span>
          </div>
          <div class="detail-item">
            <span class="label">Role</span>
            <span class="value">${state.projectData.userRole}</span>
            </div>
          <div class="detail-item">
            <span class="label">Progress</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercentage}%"></div>
              <span class="progress-text">${progressPercentage}%</span>
            </div>
          </div>
          <div class="detail-item">
            <span class="label">Cost</span>
            <span class="value">${formattedCost}</span>
          </div>
          <div class="detail-item">
            <span class="label">Finish Date</span>
            <span class="value">${formattedDate}</span>
          </div>
          <div class="detail-item description">
            <span class="label">Description</span>
            <p class="value">${state.projectData.description || 'No description provided'}</p>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error rendering project info:', error);
    return BUI.html`
      <div class="project-info-panel error">
        <p>Error loading project information</p>
      </div>
    `;
  }
};

// Add styles
const style = document.createElement('style');
style.textContent = `
  .project-info-panel {
    padding: 1.5rem;
    background: #1a1d23;
    color: #ffffff;
    height: 100%;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    position: relative;
    z-index: 10;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .project-header h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #ffffff;
  }

  .header-buttons {
    display: flex;
    gap: 8px;
  }

  .icon-button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #90caf9;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    transition: all 0.2s ease;
    padding: 0;
  }

  .icon-button:hover {
    background: rgba(144, 202, 249, 0.2);
  }

  .icon-button .material-icons {
    font-size: 18px;
  }

  .fullscreen-toggle {
    position: relative;
  }

  .project-info-panel.minimized {
    display: none;
    transition: all 0.3s ease;
  }

  bim-viewport.full-view {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 5 !important;
    transition: all 0.3s ease;
  }

  .detail-item {
    margin-bottom: 1.25rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .detail-item .label {
    display: block;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.5rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .detail-item .value {
    font-size: 1rem;
    color: #ffffff;
    font-weight: 400;
  }

  .progress-bar {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    height: 24px;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .progress-fill {
    background: linear-gradient(90deg, #2ecc71, #27ae60);
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 5px;
  }

  .progress-text {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .status-active { 
    color: #2ecc71; 
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    background: rgba(46, 204, 113, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(46, 204, 113, 0.3);
  }
  .status-pending { 
    color: #f1c40f; 
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    background: rgba(241, 196, 15, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(241, 196, 15, 0.3);
  }
  .status-finished { 
    color: #3498db; 
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    background: rgba(52, 152, 219, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(52, 152, 219, 0.3);
  }

  .description .value {
    white-space: pre-wrap;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.8);
  }

  .project-info-panel.error {
    display: flex;
    justify-content: center;
    align-items: center;
    color: #e74c3c;
    background: rgba(231, 76, 60, 0.1);
    border-color: rgba(231, 76, 60, 0.3);
  }

  /* Scrollbar styling */
  .project-info-panel::-webkit-scrollbar {
    width: 6px;
  }

  .project-info-panel::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .project-info-panel::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .project-info-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

document.head.appendChild(style);