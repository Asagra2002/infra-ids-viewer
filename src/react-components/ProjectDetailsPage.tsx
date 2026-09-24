import * as React from "react";
import * as Router from "react-router-dom";
import { ProjectsManager, ProjectStatus, UserRole } from "../class/ProjectsManager";
import { IntegratedViewer } from "./IntegratedViewer";
import { deleteDocument, updateDocument } from "../firebase";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import { TodoCreator, todoTool } from "../bim_components/TodoCreator/";
import { TodoData } from "../bim_components/TodoCreator/base-types";
import { BCFPage } from "./BCFPage";

const PROTECTED_PROJECT_IDS = [
  "rVY8PWGeY7XWl7kQHYrY",
];

interface Props {
  projectsManager: ProjectsManager;
}

export function ProjectDetailsPage(props: Props) {
  const routeParams = Router.useParams<{ id: string }>();
  if (!routeParams.id) {
    return <p>Project ID is needed to see this page</p>;
  }

  const project = props.projectsManager.getProject(routeParams.id);
  if (!project) {
    return <p>The project with ID {routeParams.id} wasn't found.</p>;
  }

  const components: OBC.Components = new OBC.Components();
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const dashboard = React.useRef<HTMLDivElement>(null);
  const todoContainer = React.useRef<HTMLDivElement>(null);


  const navigateTo = Router.useNavigate();
  props.projectsManager.onProjectDeleted = async (id) => {
    await deleteDocument("/projects", id);
    navigateTo("/");
  };

  const onRowCreated = (event: any) => {
    event.stopImmediatePropagation();
    const { row } = event.detail;
    row.addEventListener("click", async () => {
      todoCreator.highlightTodo({
        name: row.data.Name,
        task: row.data.Task,
        priority: row.data.Priority,
        ifcGuids: JSON.parse(row.data.Guids),
        camera: JSON.parse(row.data.Camera),
      });
    });
  };

  const todoTable = BUI.Component.create<BUI.Table>(() => {
    return BUI.html`
      <bim-table @rowcreated=${onRowCreated}></bim-table>`;
  });

  const addTodo = (data: TodoData) => {
    const newData = {
      data: {
        Name: data.name,
        Task: data.task,
        Date: new Date().toDateString(),
        Guids: JSON.stringify(data.ifcGuids),
        Camera: data.camera ? JSON.stringify(data.camera) : "",
        Actions: "",
      },
    };
    todoTable.data = [...todoTable.data, newData];

    todoTable.dataTransform = {
      Actions: () => {
        return BUI.html`
          <div>
            <button style="background-color: red; color: white;">Delete</button>
          </div>
          <div>
            <button style="background-color: green; color: white;" @click=${() =>
              todoCreator.addTodoMarker(data)}>
              Navigate
            </button>
          </div>
        `;
      },
    };
    todoTable.hiddenColumns = ["Guids", "Camera"];
  };

  const todoCreator = components.get(TodoCreator);
  todoCreator.onTodoCreated.add((data) => addTodo(data));

  React.useEffect(() => {
    dashboard.current?.appendChild(todoTable);
    const [todoButton, todoPriorityButton] = todoTool({ components });
    todoContainer.current?.appendChild(todoButton);
    todoContainer.current?.appendChild(todoPriorityButton);

    todoCreator.onDisposed.add(() => {
      todoTable.data = [];
      todoTable.remove();
    });
  }, []);

  // Efecto para loggear la estructura de la página después del montaje
  React.useEffect(() => {
    // Usar setTimeout para asegurar que el DOM está completamente renderizado
    setTimeout(() => {
      console.log("🔍 Page Structure:", {
        mainContent: document.querySelector(".main-page-content"),
        overlayElements: document.querySelectorAll('[style*="position: fixed"]'),
        zIndexElements: document.querySelectorAll('[style*="z-index"]')
      });
    }, 100);
  }, []);


  const onEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const editForm = document.getElementById("edit-project-form") as HTMLFormElement;
    const formData = new FormData(editForm);

    const updatedProject = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      status: formData.get("status") as ProjectStatus,
      userRole: formData.get("userRole") as UserRole, // Cast correcto
      finishDate: new Date(formData.get("finishDate") as string),
      cost: Number(formData.get("cost")),
      progress: Number(formData.get("progress")) / 100,
    };

    try {
      await updateDocument("projects", project.id, updatedProject);
      props.projectsManager.updateProject(project.id, updatedProject);
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err);
    }
  };

  const initials = project.name.substring(0, 2).toUpperCase();

  return (
    <div className="page" id="project-details">
      <header style={{ 
        padding: "16px 24px", 
        marginBottom: "16px",
        backgroundColor: "#2a2a2a",
        borderRadius: "8px",
        border: "1px solid #404040"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          width: "100%"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: "1.5rem", 
              fontWeight: "600",
              color: "#ffffff"
            }}>
              Project Details
            </h2>
            <span style={{ 
              color: "#969696", 
              fontSize: "0.9rem",
              fontStyle: "italic"
            }}>
              {project.name}
            </span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const panel = document.getElementById('project-info-panel');
                const viewport = document.querySelector('bim-viewport');
                if (panel && viewport) {
                  panel.classList.toggle('minimized');
                  viewport.classList.toggle('full-view');
                  // Disparar evento de redimensionamiento
                  window.dispatchEvent(new Event('resize'));
                }
              }}
              style={{ 
                backgroundColor: '#3498db',
                cursor: 'pointer',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2980b9';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3498db';
              }}
              title="Toggle Fullscreen"
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>fullscreen</span>
              Fullscreen
            </button>
            {!PROTECTED_PROJECT_IDS.includes(project.id) && (
              <button
                onClick={async () => {
                  try {
                    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                      await props.projectsManager.deleteProject(project.id);
                      window.location.href = '/';
                    }
                  } catch (error) {
                    console.error('Error deleting project:', error);
                    alert('Error deleting project: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }}
                style={{ 
                  backgroundColor: '#e74c3c',
                  cursor: 'pointer',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#c0392b';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#e74c3c';
                }}
                title="Delete project"
              >
                <span className="material-icons-round" style={{ fontSize: "18px" }}>delete</span>
                Delete project
              </button>
            )}
          </div>
        </div>
      </header>
      <div 
        id="integrated-viewer-container"
        style={{ 
          width: "100%",
          height: "calc(100vh - 120px)",
          overflow: "hidden",
          backgroundColor: "#1a1d23",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          margin: "0 8px 8px 8px"
        }}
      >
        <IntegratedViewer
          components={components}
          ifcFilePath={project?.ifcFilePath}
          containerId="integrated-viewer-container"
          isVisible={true}
          projectData={project}
          setIsEditModalOpen={setIsEditModalOpen}
        />
      </div>


      {isEditModalOpen && (
        <>
          <div
            className="overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setIsEditModalOpen(false)}
          >
            <dialog
              open
              className="edit-project-modal"
              style={{
                width: "80%",
                maxWidth: "400px",
                backgroundColor: "white",
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                zIndex: 1001,
                margin: "auto",
                padding: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <form
                id="edit-project-form"
                onSubmit={onEditFormSubmit}
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  padding: "20px",
                }}
              >
                <h2>Edit Project</h2>
                <div className="input-list">
                  <div className="form-field-container">
                    <label>
                      <span className="material-icons-round">apartment</span>Name
                    </label>
                    <input
                      name="name"
                      type="text"
                      defaultValue={project.name}
                    />
                    <p
                      style={{
                        color: "gray",
                        fontSize: "var(--font-sm)",
                        marginTop: 5,
                        fontStyle: "italic",
                      }}
                    >
                      TIP: Give it a short name
                    </p>
                  </div>
                  <div className="form-field-container">
                    <label>
                      <span className="material-icons-round">subject</span>Description
                    </label>
                    <textarea
                      name="description"
                      cols={30}
                      rows={5}
                      defaultValue={project.description}
                    />
                  </div>
                  <div className="form-field-container">
                    <label>
                      <span className="material-icons-round">person</span>Role
                    </label>
                    <select name="userRole" defaultValue={project.userRole}>
                      <option value="Architect">Architect</option>
                      <option value="Engineer">Engineer</option>
                      <option value="Developer">Developer</option>
                    </select>
                  </div>
                  <div className="form-field-container">
                    <label>
                      <span className="material-icons-round">not_listed_location</span>Status
                    </label>
                    <select name="status" defaultValue={project.status}>
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Finished">Finished</option>
                    </select>
                  </div>
                  <div className="form-field-container">
                    <label htmlFor="finishDate">
                      <span className="material-icons-round">calendar_month</span>Finish Date
                    </label>
                    <input
                      name="finishDate"
                      type="date"
                      defaultValue={project.finishDate.toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="form-field-container">
                    <label>
                      <span className="material-icons-round">euro</span>Cost
                    </label>
                    <input
                      name="cost"
                      type="number"
                      defaultValue={project.cost}
                    />
                  </div>
                  <div className="form-field-container">
                    <label>
                      <span className="material-icons-round">percent</span>Progress
                    </label>
                    <input
                      name="progress"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      defaultValue={project.progress * 100} // Multiply by 100 to show as percentage
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 20,
                    justifyContent: "flex-end",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      backgroundColor: "transparent",
                    }}
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "rgb(18, 145, 18)"
                    }}
                  >
                    Save
                  </button>
                </div>
              </form>
            </dialog>
          </div>
        </>
      )}

    </div>
  );
}
