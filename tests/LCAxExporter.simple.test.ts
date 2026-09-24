/**
 * LCAx Exporter Simple Tests
 * Tests core functionality without complex dependencies
 */

// Mock the emission factors to avoid import.meta issues
jest.mock('../src/data/emissionFactors', () => ({
  MATERIAL_FACTORS: {
    'Betoni': {
      name: { fi: 'Betoni', en: 'Concrete' },
      source: { database: 'CO2Data.fi', id: 'test-id', version: '2024', verified: true },
      impacts: { gwp: 0.283, ap: 0.76, ep: 0.11, ozone: 1.9e-6, energy: 1650 },
      properties: { density: 2350, service_life: 50, recyclability: 95 },
      transport: { default_distance: 50, emission_factor: 0.132 },
      manufacturer: { name: 'Test Manufacturer', location: 'Helsinki', epd_number: 'RTS-EPD-12345' }
    }
  },
  FINNISH_MATERIAL_SOURCES: ['CO2Data.fi', 'RTS', 'VTT LIPASTO'],
  TRANSPORT_FACTORS: { truck: 0.132, train: 0.028, ship: 0.015, none: 0 }
}));

// Mock the file download utility
jest.mock('../src/utils/fileDownload', () => ({
  downloadJSON: jest.fn(),
  downloadBlob: jest.fn(),
  downloadText: jest.fn(),
  getFileExtension: jest.fn(),
  validateFilename: jest.fn()
}));

describe('LCAxExporter Core Functionality', () => {
  let LCAxExporter: any;
  
  beforeEach(async () => {
    // Dynamic import to avoid module issues
    const module = await import('../src/services/LCAxExporter');
    LCAxExporter = module.LCAxExporter;
  });

  it('should create LCAxExporter instance', () => {
    const exporter = LCAxExporter.getInstance();
    expect(exporter).toBeDefined();
    expect(typeof exporter.convertToFinnishLCAx).toBe('function');
    expect(typeof exporter.validateLCAx).toBe('function');
    expect(typeof exporter.exportToFile).toBe('function');
  });

  it('should convert basic data to LCAx format', () => {
    const exporter = LCAxExporter.getInstance();
    
    const materials = [
      {
        name: 'Betoni',
        volume: 45.2,
        category: 'Concrete',
        impacts: { gwp: 12.8, ap: 34.3, ep: 5.0, ozone: 0.000086, energy: 74580 },
        transport: { distance: 50, mode: 'truck' }
      }
    ];

    const projectInfo = {
      name: 'Test Project',
      type: 'residential',
      area: 500,
      location: 'Helsinki'
    };

    const results = {
      impacts: { gwp: { total: 12.8 }, ap: { total: 34.3 }, ep: { total: 5.0 }, ozone: { total: 0.000086 }, energy: { total: 74580 } },
      source: 'CO2Data.fi'
    };

    const document = exporter.convertToFinnishLCAx(materials, projectInfo, results);

    expect(document).toBeDefined();
    expect(document.version).toBe('1.0.0');
    expect(document.project.name).toBe('Test Project');
    expect(document.assemblies).toHaveLength(1);
    expect(document.finnishExtensions).toBeDefined();
  });

  it('should validate LCAx document', () => {
    const exporter = LCAxExporter.getInstance();
    
    const mockDocument = {
      version: '1.0.0',
      project: { name: 'Test' },
      assemblies: [{ id: '1', name: 'Test Assembly' }],
      finnishExtensions: {
        co2dataReferences: ['ref1'],
        en15804Compliance: true
      }
    };

    const validation = exporter.validateLCAx(mockDocument);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should provide OneClickLCA compatibility info', () => {
    const exporter = LCAxExporter.getInstance();
    const compatibility = exporter.getOneClickLCACompatibility();

    expect(compatibility.supportedFormats).toBeDefined();
    expect(compatibility.conversionNotes).toBeDefined();
    expect(compatibility.limitations).toBeDefined();
    expect(Array.isArray(compatibility.supportedFormats)).toBe(true);
  });

  it('should handle export without errors', () => {
    const exporter = LCAxExporter.getInstance();
    const { downloadJSON } = require('../src/utils/fileDownload');
    
    const mockDocument = {
      version: '1.0.0',
      project: { name: 'Test' },
      assemblies: [],
      finnishExtensions: {}
    };

    expect(() => {
      exporter.exportToFile(mockDocument, 'test.json');
    }).not.toThrow();

    expect(downloadJSON).toHaveBeenCalled();
  });
});
