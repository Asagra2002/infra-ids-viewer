import * as OBC from "@thatopen/components";
import {
  runRavaValidationLocal,
  applyRavaAreaPerOccupant,
  applyRavaProjectInfo,
  exportCurrentFragmentsModel,
} from "../../services/ravaService";

const MCP_WS_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_MCP_WS_URL;

export const setupMCPWebSocket = (components: OBC.Components) => {
  // Solo conectar si hay URL configurada (en producción no usar localhost)
  if (!MCP_WS_URL || typeof WebSocket === "undefined") return null;
  const ws = new WebSocket(MCP_WS_URL);

  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    console.log("✅ Connected to MCP WebSocket");
  };

  ws.onmessage = async (event) => {
    try {
      // 1) IFC binario enviado desde el MCP
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        console.log("📦 Received IFC data from MCP");

        const ifcLoader = components.get(OBC.IfcLoader);

        let uint8Array: Uint8Array;
        if (event.data instanceof ArrayBuffer) {
          uint8Array = new Uint8Array(event.data);
        } else {
          const arrayBuffer = await event.data.arrayBuffer();
          uint8Array = new Uint8Array(arrayBuffer);
        }

        await ifcLoader.load(uint8Array, true, "mcp-loaded-model");
        console.log("✅ IFC file loaded successfully from MCP");
        return;
      }

      // 2) Mensajes JSON para orquestar herramientas dentro de la app
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);

        if (msg.type === "run-rava-validation") {
          const report = await runRavaValidationLocal(components);
          ws.send(
            JSON.stringify({
              type: "run-rava-validation:result",
              report,
              requestId: msg.requestId,
            })
          );
          return;
        }

        if (msg.type === "apply-rava-area-per-occupant") {
          const { targets, dryRun } = msg;
          const result = await applyRavaAreaPerOccupant(components, {
            targets,
            dryRun,
          });
          ws.send(
            JSON.stringify({
              type: "apply-rava-area-per-occupant:result",
              result,
              requestId: msg.requestId,
            })
          );
          return;
        }

        if (msg.type === "apply-rava-project-info") {
          const { payload } = msg;
          const result = await applyRavaProjectInfo(components, payload);
          ws.send(
            JSON.stringify({
              type: "apply-rava-project-info:result",
              result,
              requestId: msg.requestId,
            })
          );
          return;
        }

        if (msg.type === "export-fragments-model") {
          const result = await exportCurrentFragmentsModel(components);
          ws.send(
            JSON.stringify({
              type: "export-fragments-model:result",
              result,
              requestId: msg.requestId,
            })
          );
          return;
        }

        if (msg.type === "get-viewer-selection") {
          const fragments = components.get(OBC.FragmentsManager);
          const selectionMap = (window as any).__viewerSelection as Record<string, Set<number>> | null;

          if (!selectionMap || Object.keys(selectionMap).length === 0) {
            ws.send(JSON.stringify({
              type: "get-viewer-selection:result",
              requestId: msg.requestId,
              selection: null,
              message: "No hay ningún elemento seleccionado en el viewer",
            }));
            return;
          }

          const modelId = Object.keys(selectionMap)[0];
          const localIds = Array.from(selectionMap[modelId]);
          const localId = localIds[0];
          const model = fragments.list.get(modelId) as any;

          if (!model) {
            ws.send(JSON.stringify({
              type: "get-viewer-selection:result",
              requestId: msg.requestId,
              selection: null,
              message: "Modelo no encontrado",
            }));
            return;
          }

          try {
            let globalId: string | null = null;
            if (typeof model.getGuidsByLocalIds === "function") {
              const guids = await model.getGuidsByLocalIds([localId]);
              globalId = Array.isArray(guids) ? (guids[0] ?? null) : null;
            }

            let entityType = "Unknown";
            let entityName = "";
            if (typeof model.getItemsData === "function") {
              const data = await model.getItemsData([localId], { attributesDefault: true });
              if (Array.isArray(data) && data.length > 0) {
                const item = data[0] as any;
                entityType = item?._category?.value || item?.type || "Unknown";
                entityName = item?.Name?.value || item?.Name || "";
              }
            }

            ws.send(JSON.stringify({
              type: "get-viewer-selection:result",
              requestId: msg.requestId,
              selection: { globalId, localId, modelId, entityType, entityName },
            }));
          } catch (e) {
            ws.send(JSON.stringify({
              type: "get-viewer-selection:result",
              requestId: msg.requestId,
              selection: null,
              error: String(e),
            }));
          }
          return;
        }
      }
    } catch (error) {
      console.error("❌ Error handling MCP WebSocket message:", error);
    }
  };

  ws.onerror = (error) => {
    console.error("❌ MCP WebSocket error:", error);
  };

  ws.onclose = () => {
    console.log("🔌 Disconnected from MCP WebSocket");
    if (MCP_WS_URL) {
      setTimeout(() => setupMCPWebSocket(components), 5000);
    }
  };

  (window as any).mcpWebSocket = ws;
  return ws;
};

