/**
 * LCAx Exporter Integration Tests
 * Tests the complete export workflow including file download
 */

import { LCAxExporter } from '../services/LCAxExporter';

// Mock the file download utility
jest.mock('../utils/fileDownload', () => ({
  downloadJSON: jest.fn(),
  downloadBlob: jest.fn(),
  downloadText: jest.fn(),
  getFileExtension: jest.fn(),
  validateFilename: jest.fn()
}));

describe('LCAxExporter Integration', () => {
  let exporter: LCAxExporter;
  
  const mockMaterials = [
    {
      name: 'Betoni',
      volume: 45.2,
      category: 'Concrete',
      impacts: {
        gwp: 12.8,
        ap: 34.3,
        ep: 5.0,
        ozone: 0.000086,
        energy: 74580
      },
      transport: {
        distance: 50,
        mode: 'truck'
      }
    },
    {
      name: 'Teräs',
      volume: 12.5,
      category: 'Steel',
      impacts: {
        gwp: 8.2,
        ap: 12.1,
        ep: 2.3,
        ozone: 0.000045,
        energy: 45620
      },
      transport: {
        distance: 120,
        mode: 'truck'
      }
    }
  ];

  const mockProjectInfo = {
    name: 'Test Project',
    type: 'residential',
    area: 500,
    location: 'Helsinki'
  };

  const mockResults = {
    impacts: {
      gwp: { total: 21.0 },
      ap: { total: 46.4 },
      ep: { total: 7.3 },
      ozone: { total: 0.000131 },
      energy: { total: 120200 }
    },
    source: 'CO2Data.fi',
    validationMetrics: {
      buildingType: 'residential',
      area: 500
    }
  };

  beforeEach(() => {
    exporter = LCAxExporter.getInstance();
    jest.clearAllMocks();
  });

  describe('Complete Export Workflow', () => {
    it('should convert materials to Finnish LCAx format successfully', () => {
      const document = exporter.convertToFinnishLCAx(
        mockMaterials,
        mockProjectInfo,
        mockResults
      );

      expect(document).toBeDefined();
      expect(document.version).toBe('1.0.0');
      expect(document.project.name).toBe('Test Project');
      expect(document.assemblies).toHaveLength(2);
      expect(document.finnishExtensions).toBeDefined();
      expect(document.finnishExtensions.co2dataReferences).toBeDefined();
    });

    it('should validate LCAx document correctly', () => {
      const document = exporter.convertToFinnishLCAx(
        mockMaterials,
        mockProjectInfo,
        mockResults
      );

      const validation = exporter.validateLCAx(document);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should export file without errors', () => {
      const { downloadJSON } = require('../utils/fileDownload');
      
      const document = exporter.convertToFinnishLCAx(
        mockMaterials,
        mockProjectInfo,
        mockResults
      );

      const filename = 'test-export.json';
      
      expect(() => {
        exporter.exportToFile(document, filename);
      }).not.toThrow();

      expect(downloadJSON).toHaveBeenCalledWith(document, {
        filename: filename,
        mimeType: 'application/json'
      });
    });

    it('should provide OneClickLCA compatibility information', () => {
      const compatibility = exporter.getOneClickLCACompatibility();

      expect(compatibility.supportedFormats).toContain(
        'Level(s) life-cycle carbon (EN15804 +A1)'
      );
      expect(compatibility.conversionNotes).toContain(
        'CO2Data.fi references should be mapped to OneClickLCA material database'
      );
      expect(compatibility.limitations).toBeDefined();
    });
  });

  describe('Finnish Extensions', () => {
    it('should include CO2Data.fi references', () => {
      const document = exporter.convertToFinnishLCAx(
        mockMaterials,
        mockProjectInfo,
        mockResults
      );

      expect(document.finnishExtensions.co2dataReferences).toBeDefined();
      expect(document.finnishExtensions.co2dataReferences.length).toBeGreaterThan(0);
    });

    it('should include EN 15804 compliance information', () => {
      const document = exporter.convertToFinnishLCAx(
        mockMaterials,
        mockProjectInfo,
        mockResults
      );

      expect(document.finnishExtensions.en15804Compliance).toBeDefined();
      expect(document.finnishExtensions.en15804Compliance.isCompliant).toBe(true);
    });

    it('should include VTT LIPASTO transport factors', () => {
      const document = exporter.convertToFinnishLCAx(
        mockMaterials,
        mockProjectInfo,
        mockResults
      );

      expect(document.finnishExtensions.vttLipastoFactors).toBeDefined();
      expect(document.finnishExtensions.vttLipastoFactors.transportFactors).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty materials array gracefully', () => {
      const document = exporter.convertToFinnishLCAx(
        [],
        mockProjectInfo,
        mockResults
      );

      expect(document.assemblies).toHaveLength(0);
      expect(document.epds).toHaveLength(0);
    });

    it('should handle missing project information', () => {
      const document = exporter.convertToFinnishLCAx(
        mockMaterials,
        {},
        mockResults
      );

      expect(document.project.name).toBe('Unnamed Project');
      expect(document.project.location.country).toBe('FI');
    });

    it('should handle missing results gracefully', () => {
      const document = exporter.convertToFinnishLCAx(
        mockMaterials,
        mockProjectInfo,
        {}
      );

      expect(document).toBeDefined();
      expect(document.assemblies).toHaveLength(2);
    });
  });
});
