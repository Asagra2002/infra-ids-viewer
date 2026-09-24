import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import { QueriesListState } from "./types";

export const queriesListTemplate: BUI.StatefullComponent<QueriesListState> = (
  state,
) => {
  const { components } = state;
  const finder = components.get(OBC.ItemsFinder);
  const highlighter = components.get(OBF.Highlighter);

  const onCreated = (e?: Element) => {
    if (!e) return;
    const table = e as BUI.Table;
    table.columns = ["Name", { name: "Actions", width: "auto" }];
    table.headersHidden = true;
    table.noIndentation = true;
    table.data = [...finder.list.keys()].map((key) => {
      return {
        data: {
          Name: key,
          Actions: "",
        },
      };
    });

    table.dataTransform = {
      Actions: (_, rowData) => {
        const onClick = async () => {
          const { Name } = rowData;
          if (typeof Name !== "string") return;
          const finderQuery = finder.list.get(Name);
          if (!finderQuery) return;
          const items = await finderQuery.test();
          if (OBC.ModelIdMapUtils.isEmpty(items)) return;
          await highlighter.highlightByID("select", items);
        };

        return BUI.html`<bim-button @click=${onClick} icon="gravity-ui:check"></bim-button>`;
      },
    };
  };

  return BUI.html`
    <bim-table ${BUI.ref(onCreated)}></bim-table>
  `;
};
