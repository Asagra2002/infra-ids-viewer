import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { template } from "./template";
import { types } from "./types";

export interface QueriesListState {
  components: OBC.Components;
}

export const queriesListTemplate: BUI.StatefullComponent<QueriesListState> = (
  state,
) => {
  const { components } = state;
  const finder = components.get(OBC.ItemsFinder);

  const table = BUI.Component.create<BUI.Table<types.QueriesListTableData>>(() => {
    return BUI.html`
      <bim-table 
        .data=${Array.from(finder.list.entries()).map(([name, finder]) => ({
          name,
          count: finder.size,
        }))}
        .columns=${[
          {
            id: "name",
            header: "Name",
            element: (row: types.QueriesListTableData) => BUI.html`<bim-label>${row.name}</bim-label>`,
          },
          {
            id: "count", 
            header: "Count",
            element: (row: types.QueriesListTableData) => BUI.html`<bim-label>${row.count}</bim-label>`,
          },
        ]}
        .config=${{
          multiSelection: true,
        }}
      ></bim-table>
    `;
  });

  const onRowCreated = (e: any) => {
    const { row } = e.detail;
    row.addEventListener("click", async () => {
      const finderName = row.data.name;
      const finderInstance = finder.list.get(finderName);
      if (finderInstance) {
        await finderInstance.find();
      }
    });
  };

  table.addEventListener("rowcreated", onRowCreated);

  return BUI.html`${table}`;
};
