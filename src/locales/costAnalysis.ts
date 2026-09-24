type Language = 'en' | 'fi';

interface TranslationTree {
  [key: string]: string | TranslationTree;
}

interface CostTranslations {
  en: TranslationTree;
  fi: TranslationTree;
}

export const costAnalysisTranslations: CostTranslations = {
  en: {
    pageTitle: 'Cost Analysis',
    projectInfo: {
      title: 'Project Information',
      name: 'Name',
      area: 'Area',
      location: 'Location',
      buildingType: 'Type of Building',
      constructionType: 'Type of Construction'
    },
    constructionMethods: {
      traditional: 'Traditional',
      prefabricated: 'Prefabricated',
      modular: 'Modular',
      renovation: 'Renovation'
    },
    locations: {
      helsinki: 'Helsinki',
      tampere: 'Tampere',
      oulu: 'Oulu',
      other: 'Other'
    },
    noDataMessage: 'No cost data available',
    noDataMessageFi: 'Please use the "Cost Analysis" button in the viewer toolbar to extract cost data.',
    actions: {
      loadSample: 'Load Sample Data',
      calculate: 'Calculate Costs',
      export: 'Export Data'
    },
    costTypes: {
      material: 'Material',
      labor: 'Labor',
      equipment: 'Equipment',
      overhead: 'Overhead',
      total: 'Total'
    },
    analysisSections: {
      summary: 'Cost Summary',
      breakdown: 'Cost Breakdown',
      details: 'Detailed Analysis'
    },
    tableHeaders: {
      code: 'TALO Code',
      name: 'Element Name',
      type: 'Type',
      quantity: 'Quantity',
      unit: 'Unit',
      baseQuantities: 'Base Quantities'
    },
    units: {
      currency: '€',
      area: 'm²',
      volume: 'm³',
      length: 'm',
      pieces: 'pcs'
    },
    comparison: {
      title: {
        en: 'Cost Comparison with Finnish Building Standards',
        fi: 'Kustannusvertailu suomalaisten rakennusstandardien kanssa'
      },
      yourProject: {
        en: 'Your Project',
        fi: 'Sinun projektisi'
      },
      finnishAverage: {
        en: 'Finnish Average',
        fi: 'Suomen keskiarvo'
      },
      note: {
        en: 'Reference Data',
        fi: 'Viitetiedot'
      },
      noteData: {
        en: 'Based on Finnish Construction Cost Index',
        fi: 'Perustuu Suomen rakennuskustannusindeksiin'
      },
      noteRange: {
        en: 'Typical cost range',
        fi: 'Tyypillinen kustannusalue'
      },
      noteLocation: {
        en: 'Costs may vary by region and specific project requirements',
        fi: 'Kustannukset voivat vaihdella alueittain ja projektikohtaisesti'
      }
    },
    schedule: {
      title: 'Construction Schedule',
      startDate: 'Start Date',
      endDate: 'End Date',
      duration: 'Total Duration',
      workers: 'Workers',
      equipment: 'Equipment',
      criticalPath: 'Critical Path',
      note: 'Note: This schedule is an estimate based on Finnish construction standards and may vary depending on several factors:',
      noteWeather: 'Weather conditions and seasonal adjustments',
      noteResources: 'Resource availability and allocation',
      notePermits: 'Permit processing times and local regulations'
    },
    phases: {
      preparation: 'Site Preparation',
      foundation: 'Foundation',
      structure: 'Structure',
      envelope: 'Building Envelope',
      interior: 'Interior Works',
      mep: 'MEP Systems',
      finishes: 'Finishes'
    },
    export: {
      ifcTaskTitle: 'IFC Task Export',
      ifcTaskDescription: 'Export IFC-compatible task schedule data',
      ifcTaskDetails: 'Generate comprehensive IFC task schedule data that can be imported into BIM software for 4D construction planning and project management. The export includes detailed resource allocation, cost breakdowns, and Finnish TALO 2000 classification codes.',
      readyToExport: 'Ready to Export',
      exportDescription: 'Export IFC task schedule data in multiple formats for BIM integration and project management',
      exportButton: 'Export IFC Tasks'
    }
  },
  fi: {
    pageTitle: 'Kustannusanalyysi',
    projectInfo: {
      title: 'Projektin tiedot',
      name: 'Nimi',
      area: 'Pinta-ala',
      location: 'Sijainti',
      buildingType: 'Rakennustyyppi',
      constructionType: 'Rakentamistapa'
    },
    constructionMethods: {
      traditional: 'Perinteinen',
      prefabricated: 'Esivalmistettu',
      modular: 'Modulaarinen',
      renovation: 'Saneeraus'
    },
    locations: {
      helsinki: 'Helsinki',
      tampere: 'Tampere',
      oulu: 'Oulu',
      other: 'Muu'
    },
    noDataMessage: 'Kustannustietoja ei ole saatavilla',
    noDataMessageFi: 'Käytä "Kustannusanalyysi"-painiketta katseluohjelman työkalupalkissa kustannustietojen hakemiseen.',
    actions: {
      loadSample: 'Lataa esimerkkidata',
      calculate: 'Laske kustannukset',
      export: 'Vie data'
    },
    costTypes: {
      material: 'Materiaali',
      labor: 'Työ',
      equipment: 'Laitteet',
      overhead: 'Yleiskulut',
      total: 'Yhteensä'
    },
    analysisSections: {
      summary: 'Kustannusyhteenveto',
      breakdown: 'Kustannuserittely',
      details: 'Yksityiskohtainen analyysi'
    },
    tableHeaders: {
      code: 'TALO-koodi',
      name: 'Elementin nimi',
      type: 'Tyyppi',
      quantity: 'Määrä',
      unit: 'Yksikkö',
      baseQuantities: 'Perusmäärät'
    },
    units: {
      currency: '€',
      area: 'm²',
      volume: 'm³',
      length: 'm',
      pieces: 'kpl'
    },
    comparison: {
      title: {
        en: 'Cost Comparison with Finnish Building Standards',
        fi: 'Kustannusvertailu suomalaisten rakennusstandardien kanssa'
      },
      yourProject: {
        en: 'Your Project',
        fi: 'Sinun projektisi'
      },
      finnishAverage: {
        en: 'Finnish Average',
        fi: 'Suomen keskiarvo'
      },
      note: {
        en: 'Reference Data',
        fi: 'Viitetiedot'
      },
      noteData: {
        en: 'Based on Finnish Construction Cost Index',
        fi: 'Perustuu Suomen rakennuskustannusindeksiin'
      },
      noteRange: {
        en: 'Typical cost range',
        fi: 'Tyypillinen kustannusalue'
      },
      noteLocation: {
        en: 'Costs may vary by region and specific project requirements',
        fi: 'Kustannukset voivat vaihdella alueittain ja projektikohtaisesti'
      }
    },
    schedule: {
      title: 'Rakentamisaikataulu',
      startDate: 'Aloituspäivä',
      endDate: 'Lopetuspäivä',
      duration: 'Kokonaiskesto',
      workers: 'Työntekijät',
      equipment: 'Kalusto',
      criticalPath: 'Kriittinen polku',
      note: 'Huom: Tämä aikataulu on arvio, joka perustuu suomalaisiin rakennusstandardeihin ja voi vaihdella useiden tekijöiden mukaan:',
      noteWeather: 'Sääolosuhteet ja vuodenaikavaihtelut',
      noteResources: 'Resurssien saatavuus ja kohdentaminen',
      notePermits: 'Lupakäsittelyajat ja paikalliset määräykset'
    },
    phases: {
      preparation: 'Pohjatyöt',
      foundation: 'Perustukset',
      structure: 'Runko',
      envelope: 'Ulkovaippa',
      interior: 'Sisätyöt',
      mep: 'LVIS-järjestelmät',
      finishes: 'Viimeistely'
    },
    export: {
      ifcTaskTitle: 'IFC-tehtävävienti',
      ifcTaskDescription: 'Vie IFC-yhteensopivaa tehtäväaikataulutietoa',
      ifcTaskDetails: 'Luo kattava IFC-tehtäväaikataulutieto, joka voidaan tuoda BIM-ohjelmistoihin 4D-rakennussuunnitteluun ja projektinhallintaan. Vienti sisältää yksityiskohtaisen resurssikohdentamisen, kustannuserittelyn ja suomalaiset TALO 2000 -luokittelukoodit.',
      readyToExport: 'Valmis vientiin',
      exportDescription: 'Vie IFC-tehtäväaikataulutieto useassa muodossa BIM-integraatiota ja projektinhallintaa varten',
      exportButton: 'Vie IFC-tehtävät'
    }
  }
};

export function getTranslation(path: string[], language: Language): string {
  let current = costAnalysisTranslations[language] as TranslationTree;
  
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key] as TranslationTree;
    } else {
      console.warn(`Translation not found for path: ${path.join('.')} in language: ${language}`);
      return path[path.length - 1];
    }
  }
  
  return typeof current === 'string' ? current : path[path.length - 1];
} 