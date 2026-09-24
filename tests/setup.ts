import { jest } from '@jest/globals';

// Mock canvas element
const mockCanvas = {
  getContext: () => ({
    getExtension: () => null,
    createBuffer: () => null,
    bindBuffer: () => null,
    bufferData: () => null,
  }),
  style: {},
  addEventListener: () => {},
} as unknown as HTMLCanvasElement;

// Mock WebGL context
const mockWebGLContext = {
  canvas: mockCanvas,
  getExtension: () => null,
  createBuffer: () => null,
  bindBuffer: () => null,
  bufferData: () => null,
  getParameter: () => null,
  getShaderPrecisionFormat: () => ({
    precision: 1,
    rangeMin: 1,
    rangeMax: 1
  })
} as unknown as WebGLRenderingContext;

// Mock canvas context
const getContextMock = jest.fn((contextId: string) => {
  switch (contextId) {
    case 'webgl':
    case 'webgl2':
      return mockWebGLContext;
    case '2d':
      return null;
    default:
      return null;
  }
});

// Apply mocks to global objects
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: getContextMock
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn((id: number) => clearTimeout(id));

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver;

// Mock window properties
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window properties used by Three.js and MapLibre
Object.defineProperties(global.window, {
  URL: {
    value: {
      createObjectURL: () => '',
      revokeObjectURL: () => {},
      prototype: {} as URL,
      canParse: () => true,
      parse: () => null,
    },
    writable: true,
    configurable: true
  },
  devicePixelRatio: {
    value: 1,
    writable: true,
    configurable: true
  },
  innerWidth: {
    value: 1024,
    writable: true,
    configurable: true
  },
  innerHeight: {
    value: 768,
    writable: true,
    configurable: true
  }
});

// Add event listeners to window
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.window.requestAnimationFrame = () => 0;
global.window.cancelAnimationFrame = () => {};

// Mock document properties
Object.defineProperties(global.document, {
  createElement: {
    value: (tag: string): HTMLElement => {
      if (tag === 'canvas') return mockCanvas;
      return { style: {} } as unknown as HTMLElement;
    },
    writable: true,
    configurable: true
  },
  createElementNS: {
    value: (): Element => ({ style: {} } as unknown as Element),
    writable: true,
    configurable: true
  },
  body: {
    value: {
      appendChild: (node: Node): Node => node,
      removeChild: (node: Node): Node => node,
    },
    writable: true,
    configurable: true
  }
});

// Mock Three.js WebGLRenderer
jest.mock('three', () => ({
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: () => {},
    render: () => {},
    domElement: mockCanvas,
  })),
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(),
  Vector3: jest.fn(),
  Box3: jest.fn(),
  Group: jest.fn(),
}));

// Mock MapLibre GL
jest.mock('maplibre-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    on: () => {},
    remove: () => {},
    resize: () => {},
  })),
  Marker: jest.fn(),
  Popup: jest.fn(),
})); 