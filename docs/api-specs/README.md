# API Specifications

## Core Endpoints

### Building Data
```http
GET /api/buildings/{buildingId}
GET /api/buildings/bulk?ids={id1,id2,id3}
```

### Material Properties
```http
GET /api/materials/{materialId}
```

## Data Structures

### Building Response
```json
{
  "buildingId": "string",
  "geometry": {
    "surfaces": [],
    "volumes": [],
    "preCalculatedArea": "number",
    "preCalculatedVolume": "number"
  },
  "properties": {
    "ifcType": "string",
    "materialLayers": [],
    "classifications": []
  }
}
```

### Material Response
```json
{
  "materialId": "string",
  "properties": {
    "density": "number",
    "thermalConductivity": "number",
    "environmentalImpact": {}
  }
}
```

## Error Handling
- Standard HTTP status codes
- JSON error responses with code and message
- Rate limiting: 100 requests/minute
- Bearer token authentication required 