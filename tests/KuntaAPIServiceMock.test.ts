import { KuntaAPIServiceMock } from '../src/KuntaAPIServiceMock';

describe('KuntaAPIServiceMock', () => {
    let mockService: KuntaAPIServiceMock;

    beforeEach(() => {
        mockService = new KuntaAPIServiceMock(0); // No delay for testing
    });

    test('should retrieve housing building data', async () => {
        const data = await mockService.getBuilding('housing_timber');
        
        expect(data).toBeDefined();
        expect(data.properties.buildingType).toBe('Residential');
        expect(data.properties.constructionType).toBe('Timber Frame');
        expect(data.classifications.code).toBe('TALO2000-A1.2');
    });

    test('should retrieve office building data', async () => {
        const data = await mockService.getBuilding('office_concrete');
        
        expect(data).toBeDefined();
        expect(data.properties.buildingType).toBe('Office');
        expect(data.properties.constructionType).toBe('Concrete Frame');
        expect(data.classifications.code).toBe('TALO2000-B1.1');
    });

    test('should retrieve multiple buildings', async () => {
        const data = await mockService.getBulkBuildings(['housing_timber', 'office_concrete']);
        
        expect(data.size).toBe(2);
        expect(data.get('housing_timber')).toBeDefined();
        expect(data.get('office_concrete')).toBeDefined();
    });

    test('should throw error for non-existent building', async () => {
        await expect(mockService.getBuilding('non_existent'))
            .rejects
            .toThrow('Building with ID non_existent not found');
    });
}); 