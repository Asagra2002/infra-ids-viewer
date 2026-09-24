import * as React from "react"
import * as ReactDOM from "react-dom/client"
import * as Router from "react-router-dom"
import { Sidebar } from "./react-components/Sidebar"
import { ProjectsPage } from "./react-components/ProjectsPage"
import { ProjectDetailsPage } from "./react-components/ProjectDetailsPage"
import { ProjectsManager } from "./class/ProjectsManager"
import { UsersPage } from "./react-components/UserPage"
import { MaterialsPage } from "./react-components/MaterialsPage"
import { CostPage } from "./react-components/CostPage"
import SijaintikarttaPage from "./react-components/SijaintikarttaPage"
import { HomePage } from "./react-components/HomePage"
import { AboutPage } from "./react-components/AboutPage"
import { IDSReportPage } from "./react-components/IDSReportPage"
import { Footer } from "./react-components/Footer"
import * as BUI from "@thatopen/ui"
import * as OBC from "@thatopen/components"
import "./styles/style.css";
import { useBCFStore } from './stores/BCFStore';

BUI.Manager.init()

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "bim-grid": any;
      "bim-text-input": any;
      "bim-button": any;
      "bim-label": any;
      "bim-panel": any;
      "bim-panel-section": any;
      "bim-table": any;
      "bim-dropdown": any;
      "bim-option": any;
      "bim-toolbar": any;
      "bim-toolbar-section": any;
      "bim-toolbar-group": any;
      "bim-viewport": any;
    }
  }
}

const projectsManager = new ProjectsManager()
const components = new OBC.Components()

const rootElement = document.getElementById("app") as HTMLDivElement
const appRoot = ReactDOM.createRoot(rootElement)
appRoot.render(
  <>
    <Router.BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div style={{ 
          gridArea: 'content',
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '100vh',
          paddingBottom: '80px' /* Space for fixed footer */
        }}>
          <Router.Routes>
            <Router.Route path="/" element={<HomePage />}></Router.Route>
            <Router.Route path="/home" element={<HomePage />}></Router.Route>
            <Router.Route path="/projects" element={<ProjectsPage projectsManager={projectsManager} />}></Router.Route>
            <Router.Route path="/project/:id" element={<ProjectDetailsPage projectsManager={projectsManager} />}></Router.Route>
            <Router.Route path="/materials" element={<MaterialsPage />}></Router.Route>
            <Router.Route path="/users" element={<UsersPage />}></Router.Route>
            <Router.Route path="/costs" element={<CostPage />}></Router.Route>
            <Router.Route path="/sijaintikartta" element={<SijaintikarttaPage />}></Router.Route>
            <Router.Route path="/ids-report" element={<IDSReportPage />}></Router.Route>
            <Router.Route path="/about" element={<AboutPage />}></Router.Route>
          </Router.Routes>
        </div>
      </div>
      <Footer />
    </Router.BrowserRouter>
  </>
)
