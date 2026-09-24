import { jest } from '@jest/globals';
import { Event } from '@thatopen/components';
import { MockLCACalculator } from '../test-environment/src/mocks/MockLCACalculator';
import { MockCostCalculator } from '../test-environment/src/mocks/MockCostCalculator';
import { defaultTestConfig } from '../test-environment/src/mocks/test-data/mock-ifc-data';

// Mock Components class
class MockComponents {
  private components = new Map();
  
  add(uuid: string, component: any) {
    this.components.set(uuid, component);
  }
  
  get(type: any) {
    return Array.from(this.components.values()).find(comp => comp instanceof type);
  }
}

describe('LCA Component Tests', () => {
  let components: MockComponents;
  let lcaCalculator: MockLCACalculator;

  beforeEach(() => {
    components = new MockComponents();
    lcaCalculator = new MockLCACalculator(components as any);
  });

  test('should calculate material quantities', async () => {
    let resultReceived = false;
    
    lcaCalculator.onResultsComputed.add((result) => {
      expect(result.materialQuantities).toBeDefined();
      expect(result.environmentalImpacts).toBeDefined();
      resultReceived = true;
    });

    await lcaCalculator.calculateMaterialQuantities({ 'fragment-001': new Set([1, 2]) });
    expect(resultReceived).toBe(true);
  });
});

describe('Cost Component Tests', () => {
  let components: MockComponents;
  let costCalculator: MockCostCalculator;

  beforeEach(() => {
    components = new MockComponents();
    costCalculator = new MockCostCalculator(components as any);
  });

  test('should calculate costs', async () => {
    let resultReceived = false;
    
    costCalculator.onResultsComputed.add((result) => {
      expect(result.elementCosts).toBeDefined();
      expect(result.totalCost).toBeDefined();
      resultReceived = true;
    });

    await costCalculator.calculateCosts(defaultTestConfig.mockResponses.materialQuantities!);
    expect(resultReceived).toBe(true);
  });
}); 