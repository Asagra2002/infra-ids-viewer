import * as OBC from "@thatopen/components";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import * as OBCF from "@thatopen/components-front";
import type { Topic } from "@thatopen/components";
import { setViewerSelection } from "../../ui-templates/components3/visualizationToolbar";

/**
 * BCF tool that uses official That Open BCFTopics + Viewpoints.
 * See: https://docs.thatopen.com/Tutorials/Components/Core/BCFTopics
 */

export type BCFCase = Topic;
export interface BCFCategory {
  id: string;
  name: string;
  cases: Topic[];
}

export interface BCFMetadata {
  ifcGuid?: string;
  ifcFilename?: string;
  projectName?: string;
  createdAt: string;
}

export class BCFTool extends OBC.Component {
  static uuid = "2bfa3a13-033e-4998-9fe3-d0a545c3931e" as const;
  /** @deprecated Use IDS_CATEGORY_NAME */
  static RAVA_CATEGORY_NAME = "IDS Validation";
  static IDS_CATEGORY_NAME = "IDS Validation";
  static readonly GHOST_CONTEXT_OPACITY = 0.2;
  static readonly HIGHLIGHT_STYLE = "ids-validation-fails";

  enabled = true;
  private fragments?: OBC.FragmentsManager;
  private ghostRestoreMap = new Map<any, { color: number; transparent: boolean; opacity: number }>();

  constructor(components: OBC.Components) {
    super(components);
    components.add(BCFTool.uuid, this);
    this.fragments = components.get(OBC.FragmentsManager);
    this.ensureBCFSetup();
  }

  private ensureBCFSetup() {
    const bcfTopics = this.components.get(OBC.BCFTopics);
    if (bcfTopics && !bcfTopics.isSetup) {
      bcfTopics.setup({
        author: "IDS Validator",
        version: "2.1",
        types: new Set([...bcfTopics.config.types, "Error", "Warning", "Info"]),
        statuses: new Set(["open", "in_progress", "closed"]),
        users: new Set(["IDS Validator"]),
      });
    }
    const viewpoints = this.components.get(OBC.Viewpoints);
    const worlds = this.components.get(OBC.Worlds);
    if (viewpoints && worlds && viewpoints.world === null && worlds.list.size > 0) {
      const worldKeys = Array.from(worlds.list.keys());
      viewpoints.world = worlds.list.get(worldKeys[0]) ?? null;
    }
  }

  setIFCReference(_ifcGuid: string, _ifcFilename: string, _projectName?: string) {
    // Kept for API compatibility; BCFTopics/Viewpoints handle project ref in export
  }

  getMetadata(): BCFMetadata {
    return { createdAt: new Date().toISOString() };
  }

  private getWorld() {
    const worlds = this.components.get(OBC.Worlds);
    const keys = Array.from(worlds.list.keys());
    return keys.length > 0 ? worlds.list.get(keys[0]) : null;
  }

  private async getElementGlobalId(modelId: string, expressID: number): Promise<string | undefined> {
    const model = this.fragments?.list.get(modelId) as any;
    if (!model) return undefined;
    const norm = (g: unknown) => {
      const s = typeof g === "string" ? g : (g as any)?.value;
      return typeof s === "string" && s.length >= 22 ? s.substring(0, 22) : undefined;
    };
    try {
      if (typeof model.getGuidsByLocalIds === "function") {
        const result = await model.getGuidsByLocalIds([expressID]);
        const guid = Array.isArray(result) ? result[0] : null;
        if (guid && typeof guid === "string") return norm(guid) ?? guid;
      }
      if (typeof model.getItem === "function") {
        const item = model.getItem(expressID);
        if (item && typeof item.getGuid === "function") {
          const guid = await item.getGuid();
          if (guid) return norm(guid) ?? guid;
        }
      }
      if (typeof model.getProperties === "function") {
        const el = await model.getProperties(expressID);
        const guid = norm(el?.GlobalId ?? el?.globalId);
        if (guid) return guid;
      }
      if (typeof model.getItemsData === "function") {
        const opts = { attributes: ["GlobalId"] as string[] };
        const arr = await model.getItemsData([expressID], opts);
        const item = Array.isArray(arr) ? arr[0] : undefined;
        if (item) {
          const guid = norm((item as any).GlobalId ?? (item as any).globalId ?? (item as any).GlobalId?.value);
          if (guid) return guid;
        }
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  private async getViewpointPositionFromElement(modelId: string, localId: number): Promise<{ position: THREE.Vector3; target: THREE.Vector3 } | undefined> {
    const model = this.fragments?.list.get(modelId);
    if (!model || typeof (model as any).getMergedBox !== "function") return undefined;
    try {
      const box = await (model as any).getMergedBox([localId]);
      if (!box?.getCenter) return undefined;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const distance = Math.max(size.x, size.y, size.z, 2) * 2;
      const offset = new THREE.Vector3(1, 1, 0.5).normalize().multiplyScalar(distance);
      const position = center.clone().add(offset);
      return { position, target: center };
    } catch {
      return undefined;
    }
  }

  /**
   * Creates BCF topics from an IDS validation report (official BCFTopics + Viewpoints).
   */
  async createTopicsFromValidationReport(
    report: {
      failures?: Array<{
        modelId?: string;
        expressID: number;
        entityType?: string;
        entityName?: string;
        checks?: Array<{ specName?: string; details?: string }>;
      }>;
    },
    author: string = "IDS Validator"
  ): Promise<Topic[]> {
    const failures = report.failures ?? [];
    if (failures.length === 0) return [];

    this.ensureBCFSetup();
    const bcfTopics = this.components.get(OBC.BCFTopics);
    const viewpoints = this.components.get(OBC.Viewpoints);
    const world = this.getWorld();
    if (!bcfTopics || !viewpoints) throw new Error("BCFTopics or Viewpoints not available");
    if (!world) throw new Error("No world available for viewpoints");

    viewpoints.world = world;
    const firstModelId =
      this.fragments && this.fragments.list.size > 0
        ? Array.from(this.fragments.list.keys())[0]
        : undefined;
    const created: Topic[] = [];

    const toRemove: string[] = [];
    for (const [guid, topic] of bcfTopics.list) {
      if (topic.labels?.has(BCFTool.IDS_CATEGORY_NAME)) toRemove.push(guid);
    }
    for (const guid of toRemove) bcfTopics.list.delete(guid);

    for (const failure of failures) {
      const modelId = failure.modelId ?? firstModelId;
      if (!modelId) continue;

      const globalId = await this.getElementGlobalId(modelId, failure.expressID);
      if (!globalId) {
        console.warn(
          `[BCFTool] No IFC GlobalId for element ${failure.expressID} (${failure.entityType ?? "Element"}). Authoring tools may not highlight it.`
        );
      }
      const cam = await this.getViewpointPositionFromElement(modelId, failure.expressID);

      const viewpoint = viewpoints.create({
        orthogonal_camera: cam
          ? {
              camera_view_point: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
              camera_direction: {
                x: cam.target.x - cam.position.x,
                y: cam.target.y - cam.position.y,
                z: cam.target.z - cam.position.z,
              },
              camera_up_vector: { x: 0, y: 0, z: 1 },
              aspect_ratio: 16 / 9,
              view_to_world_scale: 1,
            }
          : undefined,
      });
      viewpoint.world = world;
      if (globalId) viewpoint.selectionComponents.add(globalId);

      if (world.camera?.controls && cam) {
        world.camera.controls.setLookAt(
          cam.position.x,
          cam.position.y,
          cam.position.z,
          cam.target.x,
          cam.target.y,
          cam.target.z,
          true
        );
        await viewpoint.updateCamera(true);
      }

      const specNames = (failure.checks ?? []).map((c) => c.specName ?? "spec").filter(Boolean);
      const specList = specNames.length > 0 ? specNames.join(", ") : "IDS specification";
      const elementLine = `Element: ${failure.entityType ?? "Element"} "${failure.entityName ?? ""}" (Express ID: ${failure.expressID})`;
      const propsLine = `Specifications to add or fix: ${specList}`;
      const actionLine =
        "In your IFC authoring tool: fix these properties for the highlighted element, re-export IFC and re-validate.";
      const description = [elementLine, "", propsLine, "", actionLine].join("\n");
      const commentBody = `What to modify: ${specList}.\n\n${actionLine}`;

      const topic = bcfTopics.create({
        title: `IDS: ${failure.entityType ?? "Element"} ${failure.entityName ?? ""} – ${specList}`,
        description,
        type: "Error",
        status: "open",
        priority: "High",
        labels: new Set([BCFTool.IDS_CATEGORY_NAME]),
        creationAuthor: author,
      });
      topic.viewpoints.add(viewpoint.guid);
      topic.createComment(commentBody, viewpoint.guid);
      created.push(topic);
    }
    return created;
  }

  /** @deprecated Use createTopicsFromValidationReport */
  async createTopicsFromRAVAValidationReport(
    report: {
      failures?: Array<{
        modelId?: string;
        expressID: number;
        entityType?: string;
        entityName?: string;
        checks?: Array<{ specName?: string; details?: string }>;
      }>;
    },
    author: string = "IDS Validator"
  ): Promise<Topic[]> {
    return this.createTopicsFromValidationReport(report, author);
  }

  /** Highlight a model element (camera + red selection + ghost context). Used by BCF panel table rows. */
  async highlightElement(modelId: string, expressID: number): Promise<void> {
    const highlighter = this.components.get(OBCF.Highlighter);
    if (!highlighter) return;

    if (!highlighter.styles.get(BCFTool.HIGHLIGHT_STYLE)) {
      highlighter.styles.set(BCFTool.HIGHLIGHT_STYLE, {
        color: new THREE.Color("#f44336"),
        renderedFaces: FRAGS.RenderedFaces.ONE,
        opacity: 1,
        transparent: false,
      });
    }

    highlighter.clear();
    this.applyGhostContext();

    const cam = await this.getViewpointPositionFromElement(modelId, expressID);
    const world = this.getWorld();
    if (world?.camera?.controls && cam) {
      world.camera.controls.setLookAt(
        cam.position.x,
        cam.position.y,
        cam.position.z,
        cam.target.x,
        cam.target.y,
        cam.target.z,
        true
      );
    }

    const selection: Record<string, Set<number>> = { [modelId]: new Set([expressID]) };
    await highlighter.highlightByID(BCFTool.HIGHLIGHT_STYLE, selection);
    await highlighter.highlightByID("select", selection, true, false);
    setViewerSelection(selection);
  }

  async exportBCFFile(): Promise<Blob> {
    this.ensureBCFSetup();
    const bcfTopics = this.components.get(OBC.BCFTopics);
    if (!bcfTopics) throw new Error("BCFTopics not available");
    return bcfTopics.export();
  }

  getCategories(): BCFCategory[] {
    const bcfTopics = this.components.get(OBC.BCFTopics);
    if (!bcfTopics) return [];
    const topics = Array.from(bcfTopics.list.values()).filter((t) =>
      t.labels?.has(BCFTool.IDS_CATEGORY_NAME)
    );
    if (topics.length === 0) return [];
    return [{ id: "ids", name: BCFTool.IDS_CATEGORY_NAME, cases: topics }];
  }

  getCaseById(_categoryId: string, caseId: string): Topic | undefined {
    return this.components.get(OBC.BCFTopics)?.list.get(caseId);
  }

  /** Highlight and move camera to the topic's first viewpoint. Uses official Viewpoint. */
  async highlightTopic(topic: Topic): Promise<void> {
    const viewpoints = this.components.get(OBC.Viewpoints);
    const highlighter = this.components.get(OBCF.Highlighter);
    if (!viewpoints || !highlighter) return;

    const guid = topic.viewpoints.values().next().value;
    if (!guid) return;
    const viewpoint = viewpoints.list.get(guid);
    if (!viewpoint) return;

    if (!highlighter.styles.get(BCFTool.HIGHLIGHT_STYLE)) {
      highlighter.styles.set(BCFTool.HIGHLIGHT_STYLE, {
        color: new THREE.Color("#f44336"),
        renderedFaces: FRAGS.RenderedFaces.ONE,
        opacity: 1,
        transparent: false,
      });
    }
    highlighter.clear();
    this.applyGhostContext();
    try {
      await viewpoint.go({ transition: true, applyVisibility: true });
      const selectionMap = await viewpoint.getSelectionMap();
      if (selectionMap && Object.keys(selectionMap).length > 0) {
        highlighter.highlightByID(BCFTool.HIGHLIGHT_STYLE, selectionMap);
        await highlighter.highlightByID("select", selectionMap, true, false);
        setViewerSelection(selectionMap);
      }
    } catch (e) {
      console.warn("[BCFTool] highlightTopic:", e);
    }
  }

  /** Legacy: highlight by fragmentId + expressIds (e.g. after loading old BCF). */
  highlightElements(elements: { fragmentId: string; expressIds: number[] }[]) {
    if (!this.fragments) return;
    const highlighter = this.components.get(OBCF.Highlighter);
    if (!highlighter) return;
    if (!highlighter.styles.get(BCFTool.HIGHLIGHT_STYLE)) {
      highlighter.styles.set(BCFTool.HIGHLIGHT_STYLE, {
        color: new THREE.Color("#f44336"),
        renderedFaces: FRAGS.RenderedFaces.ONE,
        opacity: 1,
        transparent: false,
      });
    }
    highlighter.clear();
    this.applyGhostContext();
    const selection: Record<string, Set<number>> = {};
    for (const el of elements) {
      if (!selection[el.fragmentId]) selection[el.fragmentId] = new Set<number>();
      el.expressIds.forEach((id) => selection[el.fragmentId].add(id));
    }
    highlighter.highlightByID(BCFTool.HIGHLIGHT_STYLE, selection);
    highlighter.highlightByID("select", selection, true, false);
    setViewerSelection(selection);
  }

  private applyGhostContext(): void {
    const fragments = this.fragments as any;
    const list = fragments?.core?.models?.materials?.list;
    if (!list || typeof list.values !== "function") return;
    this.restoreContext();
    const materials = [...list.values()];
    for (const material of materials) {
      if (material?.userData?.customId) continue;
      let color: number;
      if (material.color != null) color = material.color.getHex ? material.color.getHex() : material.color;
      else if (material.lodColor != null) color = material.lodColor.getHex ? material.lodColor.getHex() : material.lodColor;
      else continue;
      this.ghostRestoreMap.set(material, { color, transparent: !!material.transparent, opacity: material.opacity ?? 1 });
      material.transparent = true;
      material.opacity = BCFTool.GHOST_CONTEXT_OPACITY;
      material.needsUpdate = true;
      if (material.color?.setHex) material.color.setHex(0xffffff);
      if (material.lodColor?.setHex) material.lodColor.setHex(0xffffff);
    }
  }

  restoreContext(): void {
    for (const [material, data] of this.ghostRestoreMap) {
      if (!material) continue;
      material.transparent = data.transparent;
      material.opacity = data.opacity;
      material.needsUpdate = true;
      if (material.color?.setHex) material.color.setHex(data.color);
      if (material.lodColor?.setHex) material.lodColor.setHex(data.color);
    }
    this.ghostRestoreMap.clear();
  }

  setGhostContext(enable: boolean): void {
    if (enable) this.applyGhostContext();
    else this.restoreContext();
  }

  clearHighlights(): void {
    const highlighter = this.components.get(OBCF.Highlighter);
    if (highlighter) highlighter.clear();
    setViewerSelection(null);
    this.restoreContext();
  }

  async loadBCFFile(file: File): Promise<void> {
    this.ensureBCFSetup();
    const bcfTopics = this.components.get(OBC.BCFTopics);
    if (!bcfTopics) throw new Error("BCFTopics not available");
    const buffer = await file.arrayBuffer();
    await bcfTopics.load(new Uint8Array(buffer));
  }
}
