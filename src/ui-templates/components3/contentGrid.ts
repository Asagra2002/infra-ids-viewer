import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "./sections";

type Viewer = "viewer";

type Models = {
  name: "models";
  state: TEMPLATES.ModelsPanelState;
};

type ElementData = {
  name: "elementData";
  state: TEMPLATES.ElementsDataPanelState;
};

type Queries = {
  name: "queries";
  state: TEMPLATES.QueriesPanelState;
};

type Viewpoints = { name: "viewpoints"; state: TEMPLATES.ViewpointsPanelState };

type Quantities = { name: "quantities"; state: TEMPLATES.QuantitiesPanelState };

type LCA = { name: "lca"; state: TEMPLATES.LCAPanelState };

type ProjectInfo = {
  name: "projectInfo";
  state: { 
    projectData: any;
    setIsEditModalOpen: (isOpen: boolean) => void;
    setIsEditUsersModalOpen?: (isOpen: boolean) => void;
  };
};

type GIS = {
  name: "gis";
  state: TEMPLATES.GisPanelState;
};

type IDS = {
  name: "ids";
  state: TEMPLATES.IDSPanelState;
};

type BCF = {
  name: "bcf";
  state: TEMPLATES.BCFPanelState;
};

export type ContentGridElements = [
  Viewer,
  Models,
  ElementData,
  Viewpoints,
  Quantities,
  LCA,
  Queries,
  ProjectInfo,
  GIS,
  IDS,
  BCF,
];

export type ContentGridLayouts = ["Viewer", "ViewerFull", "Queries", "QueriesFull", "ProjectView"];

export interface ContentGridState {
  components: OBC.Components;
  id: string;
  viewportTemplate: BUI.StatelessComponent;
  projectData?: any;
  setIsEditModalOpen: (isOpen: boolean) => void;
}

export const contentGridTemplate: BUI.StatefullComponent<ContentGridState> = (
  state,
) => {
  const { components } = state;


  const onCreated = (e?: Element) => {
    if (!e) return;
    const grid = e as BUI.Grid<ContentGridLayouts, ContentGridElements>;


    grid.elements = {
      queries: {
        template: TEMPLATES.queriesPanelTemplate,
        initialState: { components, isAdmin: true },
      },
      models: {
        template: TEMPLATES.modelsPanelTemplate,
        initialState: { components },
      },
      elementData: {
        template: TEMPLATES.elementsDataPanelTemplate,
        initialState: { components },
      },
      viewpoints: {
        template: TEMPLATES.viewpointsPanelTemplate,
        initialState: { components },
      },
      quantities: {
        template: TEMPLATES.quantitiesPanelTemplate,
        initialState: { components },
      },
      lca: {
        template: TEMPLATES.lcaPanelTemplate,
        initialState: { components },
      },
      cost: {
        template: TEMPLATES.costPanelTemplate,
        initialState: { components },
      },
      projectInfo: {
        template: TEMPLATES.projectInfoTemplate,
        initialState: { 
          projectData: state.projectData || {},
          setIsEditModalOpen: state.setIsEditModalOpen
        },
      },
      gis: {
        template: TEMPLATES.gisPanelTemplate,
        initialState: { components },
      },
      ids: {
        template: TEMPLATES.idsPanelTemplate,
        initialState: { components },
      },
      bcf: {
        template: TEMPLATES.bcfPanelTemplate,
        initialState: { components },
      },
      viewer: state.viewportTemplate,
    };


    grid.layouts = {
      Viewer: {
        template: `
          "models viewer elementData" 1fr
          "viewpoints viewer queries" 1fr
          ". viewer gis" 1fr
          /21.375rem 1fr 21.375rem
        `,
      },
      ViewerFull: {
        template: `
          "viewer viewer viewer" 1fr
          "viewer viewer viewer" 1fr
          /1fr 1fr 1fr
        `,
      },
      Queries: {
        template: `
          "models viewer" 1fr
          "queries viewer" 1fr
          /21.375rem 1fr
        `,
      },
      QueriesFull: {
        template: `
          "viewer viewer" 1fr
          "viewer viewer" 1fr
          /1fr 1fr
        `,
      },
      ProjectView: {
        template: `
          "projectInfo viewer models elementData viewpoints quantities lca cost queries gis ids bcf" 1fr
          "projectInfo viewer models elementData viewpoints quantities lca cost queries gis ids bcf" 1fr
          /300px 1fr 0px 0px 0px 0px 0px 0px 0px 0px 0px 0px
        `,
      },
    };

  };

  return BUI.html`
    <bim-grid id=${state.id} style="padding: 0; gap: 0; box-sizing: border-box;" ${BUI.ref(onCreated)}></bim-grid>
  `;
};
