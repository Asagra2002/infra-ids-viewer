import * as React from "react";
import * as Router from "react-router-dom";
import { getDocs, Timestamp } from "firebase/firestore";
import { IProject, Project, ProjectStatus, UserRole } from "../class/Project";
import { ProjectsManager } from "../class/ProjectsManager";
import { ProjectCard } from "./ProjectCard";
import { SearchBox } from "./SearchBox";
import { getCollection, addDocument } from "../firebase";

interface Props {
  projectsManager: ProjectsManager;
}

export function ProjectsPage(props: Props) {
  const [projects, setProjects] = React.useState<Project[]>(props.projectsManager.list);

  props.projectsManager.onProjectCreated = () => {
    setProjects([...props.projectsManager.list]);
  };

  const getFirestoreProjects = async () => {
    const projectsCollection = getCollection<IProject>("/projects");
    const firebaseProjects = await getDocs(projectsCollection);
    for (const doc of firebaseProjects.docs) {
      const data = doc.data();
      const project: IProject = {
        ...data,
        finishDate: (data.finishDate as unknown as Timestamp).toDate(),
      };
      try {
        props.projectsManager.newProject(project, doc.id);
      } catch (error) {
        console.error("Error loading project from Firestore:", error);
      }
    }
    setProjects([...props.projectsManager.list]);
  };

  React.useEffect(() => {
    getFirestoreProjects();
  }, []);

  const projectCards = projects.map((project) => {
    return (
      <Router.Link to={`/project/${project.id}`} key={project.id}>
        <ProjectCard project={project} />
      </Router.Link>
    );
  });

  React.useEffect(() => {
    
  }, [projects]);

  const onNewProjectClicked = () => {
    const modal = document.getElementById("new-project-modal");
    if (!(modal && modal instanceof HTMLDialogElement)) {
      console.error("Modal not found or not an HTMLDialogElement.");
      return;
    }
    modal.showModal();
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const projectForm = document.getElementById("new-project-form");
    if (!(projectForm && projectForm instanceof HTMLFormElement)) {
      console.error("Form not found or not an HTMLFormElement.");
      return;
    }

    const formData = new FormData(projectForm);
    const projectData: IProject = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      status: formData.get("status") as ProjectStatus,
      userRole: formData.get("userRole") as UserRole,
      finishDate: new Date(formData.get("finishDate") as string),
      cost: parseFloat(formData.get("cost") as string) || 0,
      progress: parseFloat(formData.get("progress") as string) || 0,
    };

    try {
      // Crear proyecto localmente
      props.projectsManager.newProject(projectData);

      // Guardar proyecto en Firestore
      const newProjectId = await addDocument("/projects", projectData);

      

      projectForm.reset();
      const modal = document.getElementById("new-project-modal");
      if (modal && modal instanceof HTMLDialogElement) {
        modal.close();
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error creating project. Please check the input.");
    }
  };

  const onProjectSearch = (value: string) => {
    setProjects(props.projectsManager.filterProjects(value));
  };

  return (
    <div className="page" id="projects-page" style={{ display: "flex" }}>
      <dialog id="new-project-modal">
        <form
          onSubmit={onFormSubmit}
          id="new-project-form"
          style={{
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          <h2>New Project</h2>
          <div className="input-list">
            <div className="form-field-container">
              <label>
                <span className="material-icons-round">apartment</span>Name
              </label>
              <input
                name="name"
                type="text"
                placeholder="What's the name of your project?"
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
                placeholder="Give your project a nice description! So people are jealous about it."
                defaultValue={""}
              />
            </div>
            <div className="form-field-container">
              <label>
                <span className="material-icons-round">person</span>Role
              </label>
              <select name="userRole">
                <option>Architect</option>
                <option>Engineer</option>
                <option>Developer</option>
              </select>
            </div>
            <div className="form-field-container">
              <label>
                <span className="material-icons-round">not_listed_location</span>Status
              </label>
              <select name="status">
                <option>Pending</option>
                <option>Active</option>
                <option>Finished</option>
              </select>
            </div>
            <div className="form-field-container">
              <label htmlFor="finishDate">
                <span className="material-icons-round">calendar_month</span>Finish Date
              </label>
              <input name="finishDate" type="date" />
            </div>
            <div
              style={{
                display: "flex",
                margin: "10px 0px 10px auto",
                columnGap: 10,
              }}
            >
              <button type="button" style={{ backgroundColor: "transparent" }}>
                Cancel
              </button>
              <button
                type="submit"
                style={{ backgroundColor: "rgb(18, 145, 18)" }}
              >
                Accept
              </button>
            </div>
          </div>
        </form>
      </dialog>
      <header>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          margin: 0,
          fontSize: '1.5rem'
        }}>
          <span className="material-icons-round">apartment</span>
          Projects
        </h2>
        <SearchBox onChange={onProjectSearch} />
        <div style={{ display: "flex", alignItems: "center", columnGap: 15 }}>
          <span
            id="import-projects-btn"
            className="material-icons-round action-icon"
            onClick={() => {
              props.projectsManager.importFromJSON();
            }}
          >
            file_upload
          </span>
          <span
            id="export-projects-btn"
            className="material-icons-round action-icon"
            onClick={() => {
              props.projectsManager.exportToJSON();
            }}
          >
            file_download
          </span>
          <button onClick={onNewProjectClicked} id="new-project-btn">
            <span className="material-icons-round">add</span>New Project
          </button>
        </div>
      </header>
      {projects.length > 0 ? (
        <div id="projects-list">{projectCards}</div>
      ) : (
        <p>No projects found</p>
      )}
    </div>
  );
}
