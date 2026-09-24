import * as THREE from 'three';
import proj4 from 'proj4';
import { FragmentsGroup } from "@thatopen/fragments";

export interface FinnishBuildingDocumentation {
  location: {
    etrs89: {
      n: number;
      e: number;
      zone: "ETRS-TM35FIN";
    };
    elevation: {
      n2000: number;
      groundLevel: number;
    };
  };
  building: {
    type: string;
    mainUse: string;
    floorArea: number;
    volume: number;
    height: number;
    stories: number;
    energyClass: string;
  };
  plot: {
    identifier: string;
    municipality: {
      code: string;
      name: string;
    };
    area: number;
    buildingCoverage: number;
  };
  documentation: {
    sitePlan: string;  // Base64 encoded image
    floorPlans: string[];  // Base64 encoded images
    sections: string[];    // Base64 encoded images
    elevations: string[]; // Base64 encoded images
  };
}

interface IFCSite {
  type?: string;
  RefLatitude?: { value: any } | any[];
  RefLongitude?: { value: any } | any[];
  RefElevation?: { value: number };
}

export class BuildingDocumentationService {
  private static instance: BuildingDocumentationService;
  private finnishMunicipalityCodes: { [key: string]: string } = {
    'Helsinki': '091',
    'Espoo': '049',
    'Vantaa': '092',
    // Add more as needed
  };

  private constructor() {}

  public static getInstance(): BuildingDocumentationService {
    if (!BuildingDocumentationService.instance) {
      BuildingDocumentationService.instance = new BuildingDocumentationService();
    }
    return BuildingDocumentationService.instance;
  }

  private async detectSourceSoftware(model: FragmentsGroup): Promise<'ArchiCAD' | 'Revit' | 'Unknown'> {
    try {
      if (!model.hasProperties) {
        return 'Unknown';
      }

      // Try to find application info in model metadata
      const propertyIds = await model.getAllPropertiesIDs();
      for (const id of propertyIds) {
        const props = await model.getProperties(id);
        if (props?.ApplicationFullName?.value) {
          const appName = props.ApplicationFullName.value.toLowerCase();
          if (appName.includes('archicad')) {
            return 'ArchiCAD';
          } else if (appName.includes('revit')) {
            return 'Revit';
          }
        }
      }
    } catch (error) {
      console.error('Error detecting source software:', error);
    }
    return 'Unknown';
  }

  private getScaleFactor(sourceSoftware: 'ArchiCAD' | 'Revit' | 'Unknown'): number {
    switch (sourceSoftware) {
      case 'Revit':
        return 0.3048; // Convert feet to meters
      case 'ArchiCAD':
        return 0.001;  // Convert mm to meters
      default:
        return 1;      // Assume meters
    }
  }

  private convertToFinnishCoordinates(lat: number, lon: number): { n: number, e: number } {
    const wgs84ToEtrs89 = proj4(
      'EPSG:4326',
      '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
    );
    
    const [e, n] = wgs84ToEtrs89.forward([lon, lat]);
    return { n, e };
  }

  private async extractBuildingMetrics(model: FragmentsGroup, scaleFactor: number): Promise<any> {
    const metrics = {
      floorArea: 0,
      volume: 0,
      height: 0,
      stories: 0
    };

    try {
      // Extract geometry for calculations
      const bbox = new THREE.Box3();
      model.items.forEach(item => {
        if (item.mesh) {
          bbox.expandByObject(item.mesh);
        }
      });

      // Calculate basic metrics
      const size = new THREE.Vector3();
      bbox.getSize(size);
      
      metrics.height = size.y * scaleFactor;
      metrics.volume = size.x * size.y * size.z * Math.pow(scaleFactor, 3);
      metrics.stories = Math.max(1, Math.round(metrics.height / 3)); // Assume 3m per story
      metrics.floorArea = size.x * size.z * Math.pow(scaleFactor, 2);

    } catch (error) {
      console.error('Error extracting building metrics:', error);
    }

    return metrics;
  }

  public async generateDocumentation(
    model: FragmentsGroup, 
    sitePlanImage: string,
    municipality: string = 'Helsinki'
  ): Promise<FinnishBuildingDocumentation> {
    const sourceSoftware = await this.detectSourceSoftware(model);
    const scaleFactor = this.getScaleFactor(sourceSoftware);
    
    // Extract site information
    const site = await this.findSite(model);
    if (!site) {
      throw new Error('No site information found in the model');
    }

    // Convert coordinates
    const lat = this.convertDMSToDecimal(site.RefLatitude);
    const lon = this.convertDMSToDecimal(site.RefLongitude);
    const finnishCoords = this.convertToFinnishCoordinates(lat, lon);

    // Extract building metrics
    const metrics = await this.extractBuildingMetrics(model, scaleFactor);

    return {
      location: {
        etrs89: {
          n: finnishCoords.n,
          e: finnishCoords.e,
          zone: "ETRS-TM35FIN"
        },
        elevation: {
          n2000: (site.RefElevation?.value || 0) * scaleFactor,
          groundLevel: 0 // This should be extracted from the model if available
        }
      },
      building: {
        type: 'residential', // Default value, should be extracted from IFC if available
        mainUse: 'residential',
        floorArea: metrics.floorArea,
        volume: metrics.volume,
        height: metrics.height,
        stories: metrics.stories,
        energyClass: 'B' // Default value, should be extracted from IFC if available
      },
      plot: {
        identifier: '', // Should be provided by user
        municipality: {
          code: this.finnishMunicipalityCodes[municipality] || '091',
          name: municipality
        },
        area: metrics.floorArea * 1.5, // Estimated plot area
        buildingCoverage: 66.67 // (floorArea / plotArea) * 100
      },
      documentation: {
        sitePlan: sitePlanImage,
        floorPlans: [],  // Should be generated from the model
        sections: [],    // Should be generated from the model
        elevations: []   // Should be generated from the model
      }
    };
  }

  private async findSite(model: FragmentsGroup): Promise<IFCSite | undefined> {
    try {
      if (!model.hasProperties) {
        return undefined;
      }

      // Try to find IFCSITE in properties
      const propertyIds = await model.getAllPropertiesIDs();
      for (const id of propertyIds) {
        const props = await model.getProperties(id);
        if (props?.type === 'IFCSITE') {
          return props as IFCSite;
        }
      }

      return undefined;
    } catch (error) {
      console.error('Error finding site:', error);
      return undefined;
    }
  }

  private convertDMSToDecimal(dms: any): number {
    if (typeof dms === 'number') return dms;
    
    if (Array.isArray(dms) && dms.length >= 3) {
      const degrees = Math.abs(dms[0]);
      const minutes = Math.abs(dms[1]);
      const seconds = Math.abs(dms[2]);
      const microseconds = Math.abs(dms[3] || 0);

      let decimal = degrees + (minutes / 60) + (seconds / 3600) + (microseconds / 3600000000);
      return dms[0] < 0 ? -decimal : decimal;
    }

    return 0;
  }
}

export const buildingDocumentationService = BuildingDocumentationService.getInstance(); 