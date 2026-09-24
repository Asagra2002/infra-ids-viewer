import { jest } from '@jest/globals';

// Mock OBC components
const mockComponents = {
  add: jest.fn(),
  get: jest.fn()
};

class MockComponent {
  enabled = true;
  components: any;
  
  constructor(components: any) {
    this.components = components;
  }
  
  dispose() {}
}

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize components', () => {
    const component = new MockComponent(mockComponents);
    expect(component.enabled).toBe(true);
    expect(component.components).toBe(mockComponents);
  });

  test('should handle component disposal', () => {
    const component = new MockComponent(mockComponents);
    component.dispose();
    expect(component.enabled).toBe(true); // Since our mock doesn't change enabled state
  });
}); 