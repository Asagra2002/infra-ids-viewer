/**
 * LCAx Exporter Tests
 * Tests for Finnish LCAx format export with OneClickLCA compatibility
 */

import { LCAxExporter } from '../services/LCAxExporter';

describe('LCAxExporter', () => {
  let exporter: LCAxExporter;

  beforeEach(() => {
    exporter = LCAxExporter.getInstance();
  });

  describe('convertToFinnishLCAx', () => {
    it('should convert materials to Finnish LCAx format', () => {
      const materials = [
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
        }
      ];

      const projectInfo = {
        name: 'Test Project',
        area: 150,
        type: 'residential',
        location: 'Helsinki'
      };

      const results = {
        impacts: {
          gwp: { total: 12.8 },
          ap: { total: 34.3 },
          ep: { total: 5.0 },
          ozone: { total: 0.000086 },
          energy: { total: 74580 }
        }
      };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument).toBeDefined();
      expect(lcaxDocument.version).toBe('1.0.0');
      expect(lcaxDocument.project.name).toBe('Test Project');
      expect(lcaxDocument.assemblies).toHaveLength(1);
      expect(lcaxDocument.finnishExtensions).toBeDefined();
      expect(lcaxDocument.finnishExtensions.en15804Compliance).toBe(true);
    });

    it('should include Finnish extensions', () => {
      const materials = [
        {
          name: 'Betoni',
          volume: 10,
          category: 'Concrete'
        }
      ];

      const projectInfo = {
        name: 'Finnish Project',
        area: 100,
        location: 'Helsinki'
      };

      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.finnishExtensions).toBeDefined();
      expect(lcaxDocument.finnishExtensions.co2dataReferences).toBeDefined();
      expect(lcaxDocument.finnishExtensions.rtsEPDs).toBeDefined();
      expect(lcaxDocument.finnishExtensions.vttFactors).toBe(true);
      expect(lcaxDocument.finnishExtensions.finnishStandards).toBeDefined();
      expect(lcaxDocument.finnishExtensions.transportFactors).toBeDefined();
    });

    it('should group materials by category', () => {
      const materials = [
        { name: 'Betoni', volume: 10, category: 'Concrete' },
        { name: 'Teräs', volume: 5, category: 'Steel' },
        { name: 'Puu', volume: 8, category: 'Wood' }
      ];

      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.assemblies).toHaveLength(3);
      expect(lcaxDocument.assemblies[0].name).toBe('Concrete');
      expect(lcaxDocument.assemblies[1].name).toBe('Steel');
      expect(lcaxDocument.assemblies[2].name).toBe('Wood');
    });
  });

  describe('validateLCAx', () => {
    it('should validate a correct LCAx document', () => {
      const materials = [
        { name: 'Betoni', volume: 10, category: 'Concrete' }
      ];

      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);
      const validation = exporter.validateLCAx(lcaxDocument);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing project information', () => {
      const invalidDocument = {
        version: '1.0.0',
        metadata: {},
        assemblies: [],
        epds: [],
        finnishExtensions: {}
      };

      const validation = exporter.validateLCAx(invalidDocument as any);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing project information');
    });

    it('should detect missing assemblies', () => {
      const invalidDocument = {
        version: '1.0.0',
        metadata: {},
        project: { name: 'Test' },
        assemblies: [],
        epds: [],
        finnishExtensions: {}
      };

      const validation = exporter.validateLCAx(invalidDocument as any);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No assemblies found');
    });

    it('should warn about missing Finnish extensions', () => {
      const incompleteDocument = {
        version: '1.0.0',
        metadata: {},
        project: { name: 'Test' },
        assemblies: [{ name: 'Test Assembly' }],
        epds: []
      };

      const validation = exporter.validateLCAx(incompleteDocument as any);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Missing Finnish extensions');
    });
  });

  describe('getOneClickLCACompatibility', () => {
    it('should return OneClickLCA compatibility information', () => {
      const compatibility = exporter.getOneClickLCACompatibility();

      expect(compatibility).toBeDefined();
      expect(compatibility.supportedFormats).toBeDefined();
      expect(compatibility.conversionNotes).toBeDefined();
      expect(compatibility.limitations).toBeDefined();

      expect(compatibility.supportedFormats).toContain('Whole life carbon assessment (GLA/RICS/Green Mark)');
      expect(compatibility.supportedFormats).toContain('Level(s) life-cycle carbon (EN15804 +A1)');
      expect(compatibility.conversionNotes).toContain('CO2Data.fi references should be mapped to OneClickLCA material database');
      expect(compatibility.limitations).toContain('OneClickLCA may not recognize Finnish-specific material IDs');
    });

    it('should include all required OneClickLCA formats', () => {
      const compatibility = exporter.getOneClickLCACompatibility();

      const expectedFormats = [
        'Whole life carbon assessment (GLA/RICS/Green Mark)',
        'LCA for BREEAM UK',
        'LCA for DGNB (DE)',
        'LCA for LEED, Int\'l (CML)',
        'Level(s) life-cycle carbon (EN15804 +A1)',
        'LCA for LEED, US (TRACI)'
      ];

      expectedFormats.forEach(format => {
        expect(compatibility.supportedFormats).toContain(format);
      });
    });
  });

  describe('Finnish standards integration', () => {
    it('should include CO2Data.fi references', () => {
      const materials = [
        { name: 'Betoni', volume: 10, category: 'Concrete' },
        { name: 'Lasi', volume: 5, category: 'Glass' }
      ];

      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.finnishExtensions.co2dataReferences).toBeDefined();
      expect(lcaxDocument.finnishExtensions.co2dataReferences.length).toBeGreaterThan(0);
    });

    it('should include RTS EPD references', () => {
      const materials = [
        { name: 'Betoni', volume: 10, category: 'Concrete' }
      ];

      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.finnishExtensions.rtsEPDs).toBeDefined();
    });

    it('should include VTT transport factors', () => {
      const materials = [
        { name: 'Betoni', volume: 10, category: 'Concrete' }
      ];

      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.finnishExtensions.transportFactors).toBeDefined();
      expect(lcaxDocument.finnishExtensions.transportFactors.truck).toBeDefined();
      expect(lcaxDocument.finnishExtensions.transportFactors.train).toBeDefined();
      expect(lcaxDocument.finnishExtensions.transportFactors.ship).toBeDefined();
      expect(lcaxDocument.finnishExtensions.transportFactors.source).toBe('VTT LIPASTO database');
    });

    it('should include Finnish building standards', () => {
      const materials = [
        { name: 'Betoni', volume: 10, category: 'Concrete' }
      ];

      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.finnishExtensions.finnishStandards).toBeDefined();
      expect(lcaxDocument.finnishExtensions.finnishStandards.buildingCode).toBe('Rakennusmääräyskokoelma');
      expect(lcaxDocument.finnishExtensions.finnishStandards.energyEfficiency).toBe('Energiatehokkuusasetus');
      expect(lcaxDocument.finnishExtensions.finnishStandards.fireSafety).toBe('Paloturvallisuusasetus');
      expect(lcaxDocument.finnishExtensions.finnishStandards.accessibility).toBe('Esteettömyysasetus');
      expect(lcaxDocument.finnishExtensions.finnishStandards.environmentalProtection).toBe('Ympäristönsuojeluasetus');
    });
  });

  describe('EN 15804 compliance', () => {
    it('should verify EN 15804 compliance', () => {
      const materials = [
        { name: 'Betoni', volume: 10, category: 'Concrete' }
      ];

      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.finnishExtensions.en15804Compliance).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle empty materials array', () => {
      const materials: any[] = [];
      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.assemblies).toHaveLength(0);
      expect(lcaxDocument.epds).toHaveLength(0);
    });

    it('should handle missing material data', () => {
      const materials = [
        { name: 'UnknownMaterial', volume: 10, category: 'Unknown' }
      ];

      const projectInfo = { name: 'Test', area: 100 };
      const results = { impacts: {} };

      const lcaxDocument = exporter.convertToFinnishLCAx(materials, projectInfo, results);

      expect(lcaxDocument.assemblies).toHaveLength(1);
      expect(lcaxDocument.assemblies[0].materials[0].source.database).toBe('Unknown');
      expect(lcaxDocument.assemblies[0].materials[0].source.verified).toBe(false);
    });
  });
});
