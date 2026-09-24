import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as FRAGS from "@thatopen/fragments";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { exec, spawn } from "child_process";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const APPLY_RAVA_PATCH_SCRIPT = path.join(REPO_ROOT, "scripts", "apply_rava_patch.py");
const LIST_IFC_ENTITIES_SCRIPT = path.join(REPO_ROOT, "scripts", "list_ifc_entities.py");

// MCP uses stdout for JSON-RPC. Any log/debug must go to stderr only (or client will try to parse it as JSON and fail).
function logStderr(msg: string) {
  process.stderr.write(msg + "\n");
}

function KillPort(port: number) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (error || !stdout) {
        logStderr(`Port ${port} is free`);
        return resolve(null);
      }

      const pids = stdout.trim().split("\n").filter((pid) => pid);

      if (pids.length === 0) {
        logStderr(`Port ${port} is free`);
        return resolve(null);
      }

      logStderr(`Killing processes on port ${port}: ${pids.join(", ")}`);

      const killPromises = pids.map((pid) => {
        return new Promise((res) => {
          exec(`kill -9 ${pid}`, (err) => {
            if (err) logStderr(`Failed to kill process ${pid}: ${err}`);
            res(true);
          });
        });
      });

      Promise.all(killPromises).then(() => {
        logStderr(`Port ${port} cleared`);
        resolve(true);
      });
    });
  });
}

const PORT = 8081;

await KillPort(PORT);
// Wait for port to be fully released
await new Promise(resolve => setTimeout(resolve, 1000));

const ws = new WebSocketServer({ port: PORT });

ws.on("error", (error) => {
  logStderr("WebSocket server error: " + String(error));
});

const server = new McpServer({ name: "BIM-MCP-Server", version: "1.0.0" });

let filePath: string;

function sendJsonToFirstClient(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = Array.from(ws.clients).find((c: any) => c.readyState === 1);
    if (!client) {
      return reject(new Error("No BIM viewer WebSocket client connected"));
    }

    const requestId = Math.random().toString(36).slice(2);
    const payload = { ...message, requestId };

    const onMessage = (data: any) => {
      try {
        const raw = data.toString();
        logStderr(`[WS] Message from viewer: ${raw.slice(0, 200)}`);
        const msg = JSON.parse(raw);
        if (msg.requestId === requestId) {
          client.off("message", onMessage);
          resolve(msg);
        }
      } catch {
        // Ignorar mensajes que no sean JSON o no coincidan
      }
    };

    client.on("message", onMessage);

    client.send(JSON.stringify(payload), (err: any) => {
      if (err) {
        client.off("message", onMessage);
        reject(err);
      }
    });

    // Timeout de seguridad (aumentado para dar margen a validaciones IDS)
    setTimeout(() => {
      client.off("message", onMessage);
      reject(new Error("Timeout waiting for response from BIM viewer"));
    }, 60000);
  });
}

server.registerTool(
  "load-ifc",
  {
    title: "Load IFC File",
    description:
      "Loads an IFC file into the BIM viewer. Replaces the current model. After apply-rava-ifc-patch, call load-ifc with the new file path and then run-rava-validation to verify.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("Full path of the IFC file to load"),
    }),
  },
  async ({ path }) => {
    try {
      filePath = path;
      const file = fs.readFileSync(path);

      // Send IFC file to all connected WebSocket clients
      let clientCount = 0;
      ws.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(file);
          clientCount++;
        }
      });

      return {
        content: [
          { 
            type: "text", 
            text: `✅ IFC file loaded and sent to ${clientCount} client(s): ${path}` 
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          { 
            type: "text", 
            text: `❌ Error loading IFC file: ${error instanceof Error ? error.message : 'Unknown error'}` 
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "run-rava-validation",
  {
    title: "Run RAVA validation in BIM app",
    description:
      "Runs RAVA IDS validation on the model currently loaded in the viewer (the last IFC sent with load-ifc). Returns pass/fail per specification and localId. To validate a patched file, load it first with load-ifc, then call this.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const msg = await sendJsonToFirstClient({ type: "run-rava-validation" });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(msg.report ?? msg),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text:
              "❌ Error running RAVA validation in BIM app: " +
              (error instanceof Error ? error.message : String(error)),
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "apply-rava-area-per-occupant",
  {
    title: "Apply RAVA AreaPerOccupant rules",
    description:
      "Applies or simulates RAVA area-per-occupant mapping rules on IFC spaces in the BIM viewer",
    inputSchema: z.object({
      targets: z
        .enum(["all", "spacesWithViolations"])
        .default("spacesWithViolations")
        .describe(
          "Scope of spaces to process. 'spacesWithViolations' should be used together with a prior RAVA validation."
        ),
      dryRun: z
        .boolean()
        .default(true)
        .describe(
          "If true, only simulates the changes and returns the diff without modifying the model."
        ),
    }),
  },
  async ({ targets, dryRun }) => {
    try {
      const msg = await sendJsonToFirstClient({
        type: "apply-rava-area-per-occupant",
        targets,
        dryRun,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(msg.result ?? msg),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text:
              "❌ Error applying RAVA AreaPerOccupant rules in BIM app: " +
              (error instanceof Error ? error.message : String(error)),
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "apply-rava-project-info",
  {
    title: "Apply RAVA Project Info rules",
    description:
      "Applies or simulates RAVA project metadata mapping (site, building, designer) on the IFC model in the BIM viewer",
    inputSchema: z.object({
      site: z
        .object({
          name: z.string().optional(),
          propertyId: z.string().optional(),
          subplotId: z.string().optional(),
          address: z.string().optional(),
          postalCode: z.string().optional(),
          city: z.string().optional(),
          planId: z.string().optional(),
          planStatus: z.string().optional(),
          ownershipType: z.string().optional(),
        })
        .optional(),
      building: z
        .object({
          name: z.string().optional(),
          streetAddress: z.string().optional(),
          postalCode: z.string().optional(),
          city: z.string().optional(),
          isTemporary: z.boolean().optional(),
          ownershipCategory: z.string().optional(),
          permanentBuildingId: z.string().optional(),
        })
        .optional(),
      designer: z
        .object({
          designerName: z.string().optional(),
          officeName: z.string().optional(),
        })
        .optional(),
      dryRun: z
        .boolean()
        .default(true)
        .describe(
          "If true, only simulates the changes and returns the diff without modifying the model."
        ),
    }),
  },
  async ({ site, building, designer, dryRun }) => {
    try {
      const msg = await sendJsonToFirstClient({
        type: "apply-rava-project-info",
        payload: { site, building, designer, dryRun },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(msg.result ?? msg),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text:
              "❌ Error applying RAVA Project Info rules in BIM app: " +
              (error instanceof Error ? error.message : String(error)),
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "export-fragments-model",
  {
    title: "Export current fragments model",
    description:
      "Triggers a download of the current fragments model (.frag) in the BIM viewer and returns basic metadata",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const msg = await sendJsonToFirstClient({
        type: "export-fragments-model",
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(msg.result ?? msg),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text:
              "❌ Error exporting fragments model in BIM app: " +
              (error instanceof Error ? error.message : String(error)),
          },
        ],
        isError: true,
      };
    }
  }
);

const changeSchema = z.object({
  globalId: z.string().describe("GlobalId de la entidad IFC"),
  propertySet: z.string().optional(),
  property: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  attribute: z.string().optional().describe("Atributo directo (ej. PredefinedType)"),
}).refine(
  (c) =>
    (c.propertySet != null && c.property != null && c.value !== undefined) ||
    (c.attribute != null && c.value !== undefined),
  { message: "Cada cambio debe tener (propertySet, property, value) o (attribute, value)" }
);

server.registerTool(
  "apply-rava-ifc-patch",
  {
    title: "Apply RAVA patch to IFC file (local)",
    description:
      "Aplica un patch de propiedades RAVA a un IFC en disco y guarda el resultado como *_RAVA_fixed.ifc. Solo ejecuta en local (script Python con ifcopenshell).",
    inputSchema: z.object({
      ifcPath: z.string().describe("Ruta absoluta del archivo IFC a modificar"),
      patch: z.object({
        changes: z.array(changeSchema).describe("Lista de cambios: Pset+property+value o attribute+value por globalId"),
      }),
      outputPath: z.string().optional().describe("Ruta del IFC de salida; si no se indica, se usa <ifcPath>_RAVA_fixed.ifc"),
    }),
  },
  async ({ ifcPath, patch, outputPath }) => {
    if (!fs.existsSync(APPLY_RAVA_PATCH_SCRIPT)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Script apply_rava_patch.py no encontrado",
              scriptPath: APPLY_RAVA_PATCH_SCRIPT,
              hint: "Crea scripts/apply_rava_patch.py y ejecuta: pip install -r scripts/requirements.txt",
            }),
          },
        ],
        isError: true,
      };
    }
    const patchPath = path.join(os.tmpdir(), `rava-patch-${Date.now()}.json`);
    try {
      fs.writeFileSync(patchPath, JSON.stringify(patch, null, 0), "utf-8");
      const args = [APPLY_RAVA_PATCH_SCRIPT, ifcPath, patchPath];
      if (outputPath) args.push(outputPath);
      const result = await new Promise<string>((resolve, reject) => {
        const proc = spawn("python3", args, { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (d) => { stdout += d.toString(); });
        proc.stderr?.on("data", (d) => { stderr += d.toString(); });
        proc.on("close", (code) => {
          try { fs.unlinkSync(patchPath); } catch { /* ignore */ }
          if (code !== 0) {
            reject(new Error(stderr || stdout || `Exit code ${code}`));
          } else {
            resolve(stdout.trim());
          }
        });
        proc.on("error", (err) => {
          try { fs.unlinkSync(patchPath); } catch { /* ignore */ }
          reject(err);
        });
      });
      let out: unknown;
      try {
        out = JSON.parse(result);
      } catch {
        out = { raw: result };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(out) }],
      };
    } catch (error) {
      try { fs.unlinkSync(patchPath); } catch { /* ignore */ }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Error aplicando patch RAVA al IFC",
              message: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "get-viewer-selection",
  {
    title: "Get currently selected element in BIM viewer",
    description:
      "Devuelve el GlobalId, tipo y nombre del elemento actualmente seleccionado en el viewer (el que el usuario clickeó). Usar antes de apply-geometry-patch para obtener el globalId del elemento a corregir.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const msg = await sendJsonToFirstClient({ type: "get-viewer-selection" });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(msg.selection ?? { error: msg.message ?? "Sin selección" }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: "❌ Error obteniendo selección del viewer: " +
              (error instanceof Error ? error.message : String(error)),
          },
        ],
        isError: true,
      };
    }
  }
);

const geometryChangeSchema = z.object({
  globalId: z.string().describe("GlobalId IFC del elemento a modificar"),
  operation: z.enum(["resize_door", "resize_space", "move"]).describe(
    "resize_door: modifica OverallWidth/OverallHeight + nuclear replace de geometría. " +
    "resize_space: nuclear replace con área correcta. " +
    "move: desplaza el elemento (delta x/y/z sin tocar geometría)."
  ),
  params: z.record(z.union([z.string(), z.number()])).describe(
    "resize_door: { width, height, thickness? (default 0.1) } en metros. " +
    "resize_space: { length, width, height? (default 2.5) } en metros. " +
    "move: { x?, y?, z? } deltas en metros."
  ),
});

server.registerTool(
  "apply-geometry-patch",
  {
    title: "Apply geometry patch to IFC file (local)",
    description:
      "Aplica correcciones geométricas a elementos IFC en disco usando estrategia de nuclear replace: " +
      "elimina la representación existente (independientemente de su origen — Archicad, Revit, etc.) " +
      "y la reemplaza con un sólido simple de las dimensiones correctas. " +
      "Preserva ObjectPlacement (posición en espacio). " +
      "El IFC resultante es válido para: (1) validación RAVA, (2) referencia vinculable en Archicad/Revit. " +
      "Flujo típico: get-viewer-selection → apply-geometry-patch → load-ifc → run-rava-validation.",
    inputSchema: z.object({
      ifcPath: z.string().describe("Ruta absoluta del IFC a modificar"),
      patch: z.object({
        changes: z.array(geometryChangeSchema).describe("Lista de correcciones geométricas"),
      }),
      outputPath: z.string().optional().describe(
        "Ruta del IFC corregido. Si no se indica, se usa <ifcPath>_geom_fixed.ifc"
      ),
    }),
  },
  async ({ ifcPath, patch, outputPath }) => {
    const APPLY_GEOM_PATCH_SCRIPT = path.join(REPO_ROOT, "scripts", "apply_geometry_patch.py");

    if (!fs.existsSync(APPLY_GEOM_PATCH_SCRIPT)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Script apply_geometry_patch.py no encontrado",
              scriptPath: APPLY_GEOM_PATCH_SCRIPT,
              hint: "El script debe estar en scripts/apply_geometry_patch.py",
            }),
          },
        ],
        isError: true,
      };
    }

    const patchPath = path.join(os.tmpdir(), `geom-patch-${Date.now()}.json`);
    try {
      fs.writeFileSync(patchPath, JSON.stringify(patch, null, 0), "utf-8");
      const args = [APPLY_GEOM_PATCH_SCRIPT, ifcPath, patchPath];
      if (outputPath) args.push(outputPath);

      const result = await new Promise<string>((resolve, reject) => {
        const proc = spawn("python3", args, { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (d) => { stdout += d.toString(); });
        proc.stderr?.on("data", (d) => { stderr += d.toString(); });
        proc.on("close", (code) => {
          try { fs.unlinkSync(patchPath); } catch { /* ignore */ }
          if (code !== 0) {
            reject(new Error(stderr || stdout || `Exit code ${code}`));
          } else {
            resolve(stdout.trim());
          }
        });
        proc.on("error", (err) => {
          try { fs.unlinkSync(patchPath); } catch { /* ignore */ }
          reject(err);
        });
      });

      let out: unknown;
      try {
        out = JSON.parse(result);
      } catch {
        out = { raw: result };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(out) }],
      };
    } catch (error) {
      try { fs.unlinkSync(patchPath); } catch { /* ignore */ }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Error aplicando geometry patch al IFC",
              message: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "list-ifc-entities",
  {
    title: "List IFC entities (lightweight)",
    description:
      "Devuelve solo tipo, GlobalId y nombre de entidades del IFC (IfcProject, IfcSite, IfcBuilding, IfcSpace). Usa esto en lugar de leer el IFC completo para construir patches.",
    inputSchema: z.object({
      ifcPath: z.string().describe("Ruta absoluta del archivo IFC"),
      types: z
        .string()
        .optional()
        .describe("Tipos separados por coma, ej. IfcSite,IfcBuilding,IfcSpace (por defecto: IfcProject,IfcSite,IfcBuilding,IfcSpace)"),
    }),
  },
  async ({ ifcPath, types }) => {
    if (!fs.existsSync(LIST_IFC_ENTITIES_SCRIPT)) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Script list_ifc_entities.py no encontrado",
              scriptPath: LIST_IFC_ENTITIES_SCRIPT,
            }),
          },
        ],
        isError: true,
      };
    }
    const args = [LIST_IFC_ENTITIES_SCRIPT, ifcPath];
    if (types) args.push("--types", types);
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const proc = spawn("python3", args, { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (d) => { stdout += d.toString(); });
        proc.stderr?.on("data", (d) => { stderr += d.toString(); });
        proc.on("close", (code) => {
          if (code !== 0) reject(new Error(stderr || stdout || `Exit ${code}`));
          else resolve(stdout.trim());
        });
        proc.on("error", reject);
      });
      let out: unknown;
      try {
        out = JSON.parse(result);
      } catch {
        out = { raw: result };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(out) }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Error listando entidades IFC",
              message: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);