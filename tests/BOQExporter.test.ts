/**
 * BOQ Exporter Tests
 * Tests for Finnish BOQ format export with Admicom/Quantima compatibility
 */

import { BOQExporter } from '../src/services/BOQExporter';
import { BaseCostElement } from '../src/types/cost';

describe('BOQExporter', () => {
  let exporter: BOQExporter;

  beforeEach(() => {
    exporter = BOQExporter.getInstance();
  });

  describe('convertToFinnishBOQ', () => {
    it('should convert cost data to Finnish BOQ format', () => {
      const costData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Concrete Wall',
          type: 'IfcWall',
          taloCode: '1.2.3',
          taloName: 'Kantavat rakenteet',
          quantity: 1,
          baseQuantities: {
            'm²': { value: 25.5, unit: 'm²' }
          },
          costs: {
            material: 1275,
            labor: 637.5,
            equipment: 191.25,
            overhead: 318.75,
            total: 2422.5
          }
        },
        {
          id: 2,
          name: 'Gypsum Wall',
          type: 'IfcWall',
          taloCode: '1.3.2',
          taloName: 'Sisäseinät',
          quantity: 1,
          baseQuantities: {
            'm²': { value: 15.0, unit: 'm²' }
          },
          costs: {
            material: 450,
            labor: 300,
            equipment: 30,
            overhead: 120,
            total: 900
          }
        }
      ];

      const projectInfo = {
        name: 'Test Project',
        location: 'Helsinki',
        buildingType: 'residential',
        constructionMethod: 'traditional',
        area: 150,
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      const boqDocument = exporter.convertToFinnishBOQ(costData, projectInfo);

      expect(boqDocument).toBeDefined();
      expect(boqDocument.version).toBe('1.0.0');
      expect(boqDocument.project.name).toBe('Test Project');
      expect(boqDocument.items).toHaveLength(2);
      expect(boqDocument.finnishExtensions).toBeDefined();
      expect(boqDocument.finnishExtensions.talo2000Compliance).toBe(true);
    });

    it('should handle RT-kortti references when available', () => {
      const costData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Concrete Wall',
          type: 'IfcWall',
          taloCode: '1.2.3',
          taloName: 'Kantavat rakenteet',
          quantity: 1,
          baseQuantities: {
            'm²': { value: 25.5, unit: 'm²' }
          },
          costs: {
            material: 1275,
            labor: 637.5,
            equipment: 191.25,
            overhead: 318.75,
            total: 2422.5
          }
        }
      ];

      const projectInfo = { name: 'Test Project' };

      const boqDocument = exporter.convertToFinnishBOQ(costData, projectInfo, {
        includeRTKortti: true
      });

      // RT-kortti info would be populated from the database lookup
      expect(boqDocument.items[0].taloCode).toBe('1.2.3');
      expect(boqDocument.items[0].quantity).toBe(25.5);
    });

    it('should exclude RT-kortti references when disabled', () => {
      const costData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Concrete Wall',
          type: 'IfcWall',
          taloCode: '1.2.3',
          taloName: 'Kantavat rakenteet',
          quantity: 1,
          baseQuantities: {
            'm²': { value: 25.5, unit: 'm²' }
          },
          costs: {
            material: 1275,
            labor: 637.5,
            equipment: 191.25,
            overhead: 318.75,
            total: 2422.5
          }
        }
      ];

      const projectInfo = { name: 'Test Project' };

      const boqDocument = exporter.convertToFinnishBOQ(costData, projectInfo, {
        includeRTKortti: false
      });

      expect(boqDocument.items[0].rtKortti).toBeUndefined();
    });
  });

  describe('validateBOQ', () => {
    it('should validate BOQ document against Finnish standards', () => {
      const costData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Concrete Wall',
          type: 'IfcWall',
          taloCode: '1.2.3',
          taloName: 'Kantavat rakenteet',
          quantity: 1,
          baseQuantities: {
            'm²': { value: 25.5, unit: 'm²' }
          },
          costs: {
            material: 1275,
            labor: 637.5,
            equipment: 191.25,
            overhead: 318.75,
            total: 2422.5
          }
        }
      ];

      const projectInfo = { name: 'Test Project' };
      const boqDocument = exporter.convertToFinnishBOQ(costData, projectInfo);
      const validationResult = exporter.validateBOQ(boqDocument);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.compliance.talo2000).toBe(true);
      expect(validationResult.compliance.admicom).toBe(true);
      expect(validationResult.compliance.quantima).toBe(true);
    });

    it('should detect invalid TALO 2000 codes', () => {
      const costData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Invalid Element',
          type: 'IfcWall',
          taloCode: 'INVALID-CODE',
          taloName: 'Invalid',
          quantity: 1,
          baseQuantities: {
            'm²': { value: 25.5, unit: 'm²' }
          },
          costs: {
            material: 1275,
            labor: 637.5,
            equipment: 191.25,
            overhead: 318.75,
            total: 2422.5
          }
        }
      ];

      const projectInfo = { name: 'Test Project' };
      const boqDocument = exporter.convertToFinnishBOQ(costData, projectInfo);
      const validationResult = exporter.validateBOQ(boqDocument);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some((e: string) => e.includes('TALO 2000'))).toBe(true);
    });

    it('should detect cost calculation errors', () => {
      // Create a BOQ document with manually incorrect totals to test validation
      const boqDocument = {
        version: '1.0.0',
        metadata: {
          created: new Date().toISOString(),
          creator: 'Test',
          version: '1.0.0',
          source: 'Test',
          standards: []
        },
        project: {
          name: 'Test Project',
          location: 'Helsinki',
          buildingType: 'residential',
          constructionMethod: 'traditional',
          totalArea: 100,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          client: 'Test',
          contractor: 'Test'
        },
        items: [
          {
            taloCode: '1.2.3',
            taloCategory: 'concrete',
            taloSubcategory: '1.2',
            itemNumber: '001',
            description: { fi: 'Test', en: 'Test' },
            quantity: 25.5,
            unit: 'm³',
            unitPrice: 95,
            totalPrice: 3000, // Incorrect total (should be 2422.5)
            materialCost: 1275,
            laborCost: 637.5,
            equipmentCost: 191.25,
            overheadCost: 318.75,
            rtKortti: undefined,
            specifications: undefined,
            notes: 'Test'
          }
        ],
        summary: {
          totalItems: 1,
          totalQuantity: 25.5,
          totalMaterialCost: 1275,
          totalLaborCost: 637.5,
          totalEquipmentCost: 191.25,
          totalOverheadCost: 318.75,
          grandTotal: 3000,
          costPerM2: 30,
          taloBreakdown: {},
          rtKorttiSummary: {}
        },
        finnishExtensions: {
          talo2000Compliance: true,
          rtKorttiReferences: [],
          co2DataReferences: [],
          vttFactors: true,
          admicomCompatibility: exporter.getAdmicomCompatibility(),
          quantimaCompatibility: exporter.getQuantimaCompatibility()
        }
      };

      const validationResult = exporter.validateBOQ(boqDocument);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some((e: string) => e.includes('Total price mismatch'))).toBe(true);
    });
  });

  describe('getAdmicomCompatibility', () => {
    it('should return Admicom compatibility information', () => {
      const compatibility = exporter.getAdmicomCompatibility();

      expect(compatibility.supported).toBe(true);
      expect(compatibility.version).toBe('2024.1');
      expect(compatibility.importFormat).toBe('Excel (.xlsx)');
      expect(compatibility.conversionNotes).toHaveLength(4);
      expect(compatibility.limitations).toHaveLength(3);
    });
  });

  describe('getQuantimaCompatibility', () => {
    it('should return Quantima compatibility information', () => {
      const compatibility = exporter.getQuantimaCompatibility();

      expect(compatibility.supported).toBe(true);
      expect(compatibility.version).toBe('2024.1');
      expect(compatibility.importFormat).toBe('CSV (.csv)');
      expect(compatibility.conversionNotes).toHaveLength(4);
      expect(compatibility.limitations).toHaveLength(3);
    });
  });

  describe('CSV export', () => {
    it('should create valid CSV content', () => {
      const costData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Concrete Wall',
          type: 'IfcWall',
          taloCode: '1.2.3',
          taloName: 'Kantavat rakenteet',
          quantity: 1,
          baseQuantities: {
            'm²': { value: 25.5, unit: 'm²' }
          },
          costs: {
            material: 1275,
            labor: 637.5,
            equipment: 191.25,
            overhead: 318.75,
            total: 2422.5
          }
        }
      ];

      const projectInfo = { name: 'Test Project' };
      const boqDocument = exporter.convertToFinnishBOQ(costData, projectInfo);

      // Test CSV creation (without actual file download)
      const csvContent = (exporter as any).createCSVContent(boqDocument);
      
      expect(csvContent).toContain('Item_No');
      expect(csvContent).toContain('TALO_Code');
      expect(csvContent).toContain('Description_FI');
      expect(csvContent).toContain('Description_EN');
      expect(csvContent).toContain('Quantity');
      expect(csvContent).toContain('Unit');
      expect(csvContent).toContain('Unit_Price_EUR');
      expect(csvContent).toContain('Total_Price_EUR');
      expect(csvContent).toContain('1.2.3');
      expect(csvContent).toContain('25.5');
    });
  });

  describe('Finnish standards integration', () => {
    it('should include Finnish extensions', () => {
      const costData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Concrete Wall',
          type: 'IfcWall',
          taloCode: '1.2.3',
          taloName: 'Kantavat rakenteet',
          quantity: 1,
          baseQuantities: {
            'm²': { value: 25.5, unit: 'm²' }
          },
          costs: {
            material: 1275,
            labor: 637.5,
            equipment: 191.25,
            overhead: 318.75,
            total: 2422.5
          }
        }
      ];

      const projectInfo = { name: 'Test Project' };
      const boqDocument = exporter.convertToFinnishBOQ(costData, projectInfo);

      expect(boqDocument.finnishExtensions.talo2000Compliance).toBe(true);
      expect(boqDocument.finnishExtensions.rtKorttiReferences).toBeDefined();
      expect(boqDocument.finnishExtensions.co2DataReferences).toBeDefined();
      expect(boqDocument.finnishExtensions.vttFactors).toBe(true);
      expect(boqDocument.finnishExtensions.admicomCompatibility.supported).toBe(true);
      expect(boqDocument.finnishExtensions.quantimaCompatibility.supported).toBe(true);
    });
  });

  describe('Real-world issues', () => {
    it('should handle empty TALO codes and zero quantities gracefully', () => {
      const testData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Test Wall',
          type: 'IfcWall',
          taloCode: '', // Empty TALO code
          taloName: 'Test Wall',
          quantity: 0, // Zero quantity
          baseQuantities: {},
          costs: {
            material: 100,
            labor: 50,
            equipment: 20,
            overhead: 30,
            total: 200
          }
        },
        {
          id: 2,
          name: 'Test Electrical',
          type: 'IfcElectricAppliance',
          taloCode: '2.4', // Valid TALO code
          taloName: 'Test Electrical',
          quantity: 0, // Zero quantity
          baseQuantities: {},
          costs: {
            material: 200,
            labor: 100,
            equipment: 40,
            overhead: 60,
            total: 400
          }
        }
      ];

      const projectInfo = {
        name: 'Test Project',
        location: 'Helsinki',
        buildingType: 'residential',
        constructionMethod: 'traditional',
        area: 100,
        type: 'residential' as const
      };

      const boqDocument = exporter.convertToFinnishBOQ(testData, projectInfo);
      
      // Should derive TALO codes from element types
      expect(boqDocument.items[0].taloCode).toBe('1.3.1'); // Derived from IfcWall
      expect(boqDocument.items[1].taloCode).toBe('2.4'); // Valid code
      
      // Should have valid quantities (estimated from costs)
      expect(boqDocument.items[0].quantity).toBeGreaterThan(0);
      expect(boqDocument.items[1].quantity).toBeGreaterThan(0);
      
      // Should pass validation
      const validation = exporter.validateBOQ(boqDocument);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle TALO code "1.1" correctly', () => {
      const testData: BaseCostElement[] = [
        {
          id: 1,
          name: 'Site Preparation',
          type: 'IfcSite',
          taloCode: '1.1', // TALO code that was causing issues
          taloName: 'Site Preparation',
          quantity: 150,
          baseQuantities: { 'Area': { value: 150, unit: 'm²' } },
          costs: {
            material: 500,
            labor: 300,
            equipment: 100,
            overhead: 150,
            total: 1050
          }
        }
      ];

      const projectInfo = {
        name: 'Test Project',
        location: 'Helsinki',
        buildingType: 'residential',
        constructionMethod: 'traditional',
        area: 150,
        type: 'residential' as const
      };

      const boqDocument = exporter.convertToFinnishBOQ(testData, projectInfo);
      
      // Should accept TALO code "1.1"
      expect(boqDocument.items[0].taloCode).toBe('1.1');
      expect(boqDocument.items[0].taloCategory).toBe('structure');
      expect(boqDocument.items[0].taloSubcategory).toBe('1.1');
      
      // Should pass validation
      const validation = exporter.validateBOQ(boqDocument);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
