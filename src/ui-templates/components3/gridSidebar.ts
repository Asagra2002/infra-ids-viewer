import * as BUI from "@thatopen/ui";
import * as TEMPLATES from "./contentGrid";

export interface GridSidebarState {
  grid: BUI.Grid<TEMPLATES.ContentGridLayouts, TEMPLATES.ContentGridElements>;
  compact: boolean;
  layoutIcons: Record<TEMPLATES.ContentGridLayouts[number], string>;
}

export const gridSidebarTemplate: BUI.StatefullComponent<GridSidebarState> = (
  state,
) => {
  const { grid, compact, layoutIcons } = state;

  return BUI.html`
    <bim-toolbar vertical style="width: ${compact ? "3rem" : "auto"};">
      <bim-toolbar-section>
        ${Object.entries(layoutIcons).map(([layout, icon]) => 
          BUI.html`
            <bim-button 
              ?active=${grid.layout === layout}
              icon=${icon}
              @click=${() => grid.layout = layout as TEMPLATES.ContentGridLayouts[number]}
              tooltip-title=${layout}
            ></bim-button>
          `
        )}
      </bim-toolbar-section>
    </bim-toolbar>
  `;
};
