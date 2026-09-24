import * as BUI from "@thatopen/ui";
import * as CUI from "@thatopen/ui-obc";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";

export interface ElementsDataPanelState {
  components: OBC.Components;
}

export const elementsDataPanelTemplate: BUI.StatefullComponent<
  ElementsDataPanelState
> = (state) => {
  const { components } = state;

  const highlighter = components.get(OBF.Highlighter);

  const [propsTable, updatePropsTable] = CUI.tables.itemsData({
    components,
    modelIdMap: {},
  });

  propsTable.preserveStructureOnFilter = true;

  highlighter.events.select.onHighlight.add((modelIdMap) => {
    updatePropsTable({ modelIdMap });
  });

  highlighter.events.select.onClear.add(() => {
    updatePropsTable({ modelIdMap: {} });
  });

  const search = (e: Event) => {
    const input = e.target as BUI.TextInput;
    propsTable.queryString = input.value;
  };

  const toggleExpanded = () => {
    propsTable.expanded = !propsTable.expanded;
  };

  return BUI.html`
    <bim-panel-section fixed icon="material-symbols:task" label="Selection Data">
      <div style="display: flex; gap: 0.375rem;">
        <bim-text-input @input=${search} vertical placeholder="Search..." debounce="200"></bim-text-input>
        <bim-button style="flex: 0;" @click=${toggleExpanded} icon="eva:expand-fill"></bim-button>
        <bim-button style="flex: 0;" @click=${() => propsTable.downloadData("ElementData", "tsv")} icon="ph:export-fill" tooltip-title="Export Data" tooltip-text="Export the shown properties to TSV."></bim-button>
      </div>
      ${propsTable}
    </bim-panel-section> 
  `;
};
