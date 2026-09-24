/**
 * Dimension Test Suite
 * Pruebas para validar el manejo de dimensiones de diferentes tipos de edificios
 */

import { BuildingDimensionService } from '../services/BuildingDimensionService';

export interface TestCase {
  name: string;
  modelName: string;
  source: string;
  rawDimensions: { width: number; length: number; height: number };
  expectedBuildingType: string;
  expectedCorrection?: number;
}

export class DimensionTestSuite {
  private dimensionService = BuildingDimensionService.getInstance();

  private testCases: TestCase[] = [
    // Caso Factory Industrial (Archicad)
    {
      name: "Large Factory - Archicad Factory",
      modelName: "Industrial_Manufacturing_Plant",
      source: "archicad",
      rawDimensions: { width: 234498, length: 234498, height: 174400 },
      expectedBuildingType: "factory",
      expectedCorrection: 0.00001
    },
    
    // Caso Residential Building (Revit)
    {
      name: "Residential Building - Revit Residential",
      modelName: "Housing_Project_Residential",
      source: "revit",
      rawDimensions: { width: 22200, length: 22200, height: 1350 },
      expectedBuildingType: "residential",
      expectedCorrection: 0.001
    },
    
    // Caso Housing Project (Archicad)
    {
      name: "Housing Project - Archicad Residential",
      modelName: "Housing_Development_Timber_IFC4RAVA",
      source: "archicad",
      rawDimensions: { width: 15000, length: 12000, height: 6000 },
      expectedBuildingType: "residential",
      expectedCorrection: 0.001
    },
    
    // Caso Industrial Warehouse
    {
      name: "Industrial Warehouse - Unknown Source",
      modelName: "Warehouse_Industrial_Complex",
      source: "unknown",
      rawDimensions: { width: 500000, length: 300000, height: 15000 },
      expectedBuildingType: "warehouse",
      expectedCorrection: 0.00001
    },
    
    // Caso Commercial Office
    {
      name: "Commercial Office - SketchUp",
      modelName: "Office_Building_Commercial",
      source: "sketchup",
      rawDimensions: { width: 0.5, length: 0.8, height: 0.12 },
      expectedBuildingType: "commercial",
      expectedCorrection: 100
    }
  ];

  /**
   * Ejecuta todas las pruebas
   */
  runAllTests(): void {
    console.log('🏗️  Dimension Test Suite - Starting Tests');
    console.log('==========================================');
    
    let passedTests = 0;
    let totalTests = this.testCases.length;
    
    this.testCases.forEach((testCase, index) => {
      console.log(`\n📋 Test ${index + 1}/${totalTests}: ${testCase.name}`);
      console.log('─'.repeat(50));
      
      const result = this.runSingleTest(testCase);
      
      if (result.passed) {
        passedTests++;
        console.log('✅ PASSED');
      } else {
        console.log('❌ FAILED');
        console.log('   Expected:', result.expected);
        console.log('   Actual:', result.actual);
      }
    });
    
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Dimension handling is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the results above.');
    }
  }

  /**
   * Ejecuta una prueba individual
   */
  private runSingleTest(testCase: TestCase): { passed: boolean; expected: any; actual: any } {
    try {
      // Ejecutar análisis de dimensiones
      const result = this.dimensionService.analyzeAndCorrectDimensions(
        testCase.rawDimensions,
        testCase.source,
        testCase.modelName
      );
      
      // Verificar tipo de edificio
      const buildingTypeCorrect = result.buildingType === testCase.expectedBuildingType;
      
      // Verificar corrección aplicada
      let correctionApplied = false;
      if (testCase.expectedCorrection) {
        const originalArea = testCase.rawDimensions.width * testCase.rawDimensions.length;
        const correctedArea = result.width * result.length;
        const actualCorrection = correctedArea / originalArea;
        correctionApplied = Math.abs(actualCorrection - testCase.expectedCorrection) < 0.1;
      } else {
        correctionApplied = true; // No se esperaba corrección
      }
      
      // Verificar que las dimensiones son realistas
      const dimensionsRealistic = this.validateRealisticDimensions(result);
      
      const passed = buildingTypeCorrect && correctionApplied && dimensionsRealistic;
      
      return {
        passed,
        expected: {
          buildingType: testCase.expectedBuildingType,
          correctionFactor: testCase.expectedCorrection || 'none',
          realistic: true
        },
        actual: {
          buildingType: result.buildingType,
          correctionFactor: this.calculateCorrectionFactor(testCase.rawDimensions, result),
          realistic: dimensionsRealistic,
          confidence: result.confidence,
          dimensions: {
            width: result.width.toFixed(2),
            length: result.length.toFixed(2),
            height: result.height.toFixed(2),
            surface: result.surface.toFixed(2),
            volume: result.volume.toFixed(2),
            floors: result.floors
          }
        }
      };
      
    } catch (error) {
      console.error('Test execution error:', error);
      return {
        passed: false,
        expected: 'Test execution',
        actual: `Error: ${error}`
      };
    }
  }

  /**
   * Valida que las dimensiones son realistas
   */
  private validateRealisticDimensions(result: any): boolean {
    const { width, length, height, surface, volume, buildingType } = result;
    
    // Límites básicos de realidad
    if (width <= 0 || length <= 0 || height <= 0) return false;
    if (surface <= 0 || volume <= 0) return false;
    
    // Límites por tipo de edificio
    const limits = {
      residential: { maxArea: 10000, maxHeight: 100, maxVolume: 100000 },
      commercial: { maxArea: 100000, maxHeight: 200, maxVolume: 2000000 },
      industrial: { maxArea: 1000000, maxHeight: 300, maxVolume: 300000000 },
      warehouse: { maxArea: 500000, maxHeight: 200, maxVolume: 100000000 },
      factory: { maxArea: 2000000, maxHeight: 400, maxVolume: 800000000 }
    };
    
    const buildingLimits = limits[buildingType as keyof typeof limits] || limits.commercial;
    
    return (
      surface <= buildingLimits.maxArea &&
      height <= buildingLimits.maxHeight &&
      volume <= buildingLimits.maxVolume
    );
  }

  /**
   * Calcula el factor de corrección aplicado
   */
  private calculateCorrectionFactor(original: any, corrected: any): string {
    const originalArea = original.width * original.length;
    const correctedArea = corrected.width * corrected.length;
    const factor = correctedArea / originalArea;
    
    if (Math.abs(factor - 1.0) < 0.01) {
      return 'none (1.0)';
    }
    
    return factor.toFixed(6);
  }

  /**
   * Ejecuta pruebas de rendimiento
   */
  runPerformanceTests(): void {
    console.log('\n⚡ Performance Tests');
    console.log('===================');
    
    const iterations = 1000;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      this.dimensionService.analyzeAndCorrectDimensions(
        { width: 100000, length: 80000, height: 15000 },
        'archicad',
        'Test_Model_' + i
      );
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`⏱️  Processed ${iterations} models in ${totalTime.toFixed(2)}ms`);
    console.log(`📊 Average time per model: ${avgTime.toFixed(4)}ms`);
    console.log(`🚀 Performance: ${(1000 / avgTime).toFixed(0)} models/second`);
  }
}

// Función para ejecutar las pruebas desde la consola
export function runDimensionTests(): void {
  const testSuite = new DimensionTestSuite();
  testSuite.runAllTests();
  testSuite.runPerformanceTests();
}
