declare module '*.svg' {
    const content: string;
    export default content;
}

declare module "three/examples/jsm/loaders/DRACOLoader" {
  import { Loader } from "three";
  export class DRACOLoader extends Loader {
    setDecoderPath(path: string): this;
  }
}

// 3d-tiles-renderer uses package.json "exports"; with moduleResolution "Node" TS doesn't resolve subpaths.
declare module "3d-tiles-renderer" {
  import type { Object3D } from "three";
  export class TilesRenderer {
    constructor(url?: string);
    group: Object3D;
    setCamera(camera: unknown): void;
    setResolutionFromRenderer(camera: unknown, renderer: unknown): void;
    addEventListener(event: string, fn: () => void): void;
    registerPlugin(plugin: unknown): void;
    getBoundingSphere(sphere: unknown): void;
    update(): void;
    dispose(): void;
  }
}

declare module "3d-tiles-renderer/plugins" {
  export class TilesFadePlugin {}
  export class TileCompressionPlugin {}
  export class GLTFExtensionsPlugin {
    constructor(options?: { dracoLoader?: unknown });
  }
  export class ReorientationPlugin {
    constructor(options: { lat: number; lon: number });
  }
  export class CesiumIonAuthPlugin {
    constructor(options: { apiToken?: string; assetId?: string; autoRefreshToken?: boolean });
  }
} 