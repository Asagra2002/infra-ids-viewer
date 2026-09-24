/**
 * Ejemplo de estructura de datos para UI de validación IDS/RAVA
 * 
 * Este archivo muestra cómo se verían los datos después de ejecutar:
 * - idsValidator.load(idsContent)
 * - idsValidator.loadRAVAExcel(excelPath)
 * - const results = await idsValidator.test(model)
 * - const report = idsValidator.generateEnhancedReport(results)
 */

export const exampleReportData = {
  summary: {
    total: 3,              // Total de elementos validados (IFCBUILDING, IFCSITE, etc.)
    passed: 1,             // Elementos que pasaron todas las validaciones
    failed: 2,             // Elementos que fallaron al menos una validación
    passRate: 33.33,       // Porcentaje de éxito
    withKoodistoInfo: 5    // Checks que tienen información de koodisto disponible
  },

  failures: [
    {
      expressID: 12345,
      guid: "abc123-def456-ghi789",
      entityName: "Edificio Principal",
      entityType: "IFCBUILDING",
      checks: [
        {
          propertySet: "FI_Kohde",
          propertyName: "TietomallinLaji",
          status: "missing",
          details: "Property \"TietomallinLaji\" not found in property set \"FI_Kohde\"",
          ravaInfo: {
            luokka: "Rakennuksen tietomalli",
            attribuutti: "Rakennuksen tietomallin laji",
            kommentti: "r",
            linkki: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji",
            kayttotarkoitus: "Ydint.",
            tayttoohje: "Valitse joko 'Suunnitelmamalli' tai 'Toteumamalli'",
            koodisto: "Rakennuksen tietomallin laji",
            koodistoUri: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji"
          },
          koodistoValidation: {
            isValid: false,
            validValues: [
              { code: "Suunnitelmamalli", label: "Suunnitelmamalli" },
              { code: "Toteumamalli", label: "Toteumamalli" },
              { code: "Planmodell", label: "Planmodell" },
              { code: "Utfallsmodell", label: "Utfallsmodell" },
              { code: "Planning model", label: "Planning model" },
              { code: "As-built model", label: "As-built model" }
            ]
          }
        },
        {
          propertySet: "FI_Kohde",
          propertyName: "VastaavaSuunnittelija",
          status: "missing",
          details: "Property \"VastaavaSuunnittelija\" not found in property set \"FI_Kohde\"",
          ravaInfo: {
            luokka: "Suunnittelija",
            attribuutti: "Suunnittelijan nimi",
            kommentti: "r",
            linkki: "https://iri.suomi.fi/model/raklu/1.0.22/suunnittelijannimi",
            kayttotarkoitus: "Ydint.+RH",
            tayttoohje: "Merkitse vastaavan rakennussuunnittelijan nimi",
            koodisto: undefined,
            koodistoUri: undefined
          }
        },
        {
          propertySet: "FI_Kohde",
          propertyName: "Rakentamistoimenpide",
          status: "invalid_value",
          details: "Property \"Rakentamistoimenpide\" has incorrect value. Expected one of: Uusi rakennus tai rakennelma, Laajentaminen, ..., Found: \"Construcción nueva\"",
          ravaInfo: {
            luokka: "Rakentamistoimenpide",
            attribuutti: "Rakentamistoimenpiteen laji",
            kommentti: "",
            linkki: "https://iri.suomi.fi/model/raklu/rakentamistoimenpide",
            kayttotarkoitus: "Ydint.",
            tayttoohje: "Valitse oikea rakentamistoimenpide koodistosta",
            koodisto: "Rakentamistoimenpide",
            koodistoUri: "https://iri.suomi.fi/model/raklu/rakentamistoimenpide"
          },
          koodistoValidation: {
            isValid: false,
            validValues: [
              { code: "Uusi rakennus tai rakennelma", label: "Uusi rakennus tai rakennelma" },
              { code: "Laajentaminen", label: "Laajentaminen" },
              { code: "Uudelleen rakentamiseen verrattava muutostyö", label: "Uudelleen rakentamiseen verrattava muutostyö" },
              { code: "Muu muutostyö", label: "Muu muutostyö" },
              { code: "Purkaminen", label: "Purkaminen" },
              { code: "Rakennuksen osittainen purkaminen", label: "Rakennuksen osittainen purkaminen" },
              { code: "Kaupunkikuvatoimenpide", label: "Kaupunkikuvatoimenpide" },
              { code: "Maisemaa muuttava toimenpide", label: "Maisemaa muuttava toimenpide" },
              { code: "Rakennuksen tai rakennelman päivitys", label: "Rakennuksen tai rakennelman päivitys" }
            ]
          }
        }
      ]
    },
    {
      expressID: 67890,
      guid: "xyz789-abc123-def456",
      entityName: "Rakennuspaikka",
      entityType: "IFCSITE",
      checks: [
        {
          propertySet: "FI_Kiinteistö",
          propertyName: "Kiinteistötunnus",
          status: "missing",
          details: "Property \"Kiinteistötunnus\" not found in property set \"FI_Kiinteistö\"",
          ravaInfo: {
            luokka: "Rakennuspaikka",
            attribuutti: "Rakennuspaikan kiinteistötunnus",
            kommentti: "r",
            linkki: "https://iri.suomi.fi/model/raklu/kiinteistotunnus",
            kayttotarkoitus: "Ydint.+RH",
            tayttoohje: "Merkitse kiinteistörekisteriin merkityn rekisteriyksikön yksilöivä tunnus",
            koodisto: undefined,
            koodistoUri: undefined
          }
        },
        {
          propertySet: "FI_Kiinteistö",
          propertyName: "Kaavatilanne",
          status: "invalid_value",
          details: "Property \"Kaavatilanne\" has incorrect value. Expected one of: Asemakaava, Rakennuskaava, ..., Found: \"Otro\"",
          ravaInfo: {
            luokka: "Rakennuspaikka",
            attribuutti: "Rakennuspaikan kaavatilanne",
            kommentti: "r",
            linkki: "https://iri.suomi.fi/model/raklu/kaavatilanne",
            kayttotarkoitus: "Ydint.",
            tayttoohje: "Valitse oikea kaavatilanne koodistosta",
            koodisto: "Kaavatilanne",
            koodistoUri: "https://iri.suomi.fi/model/raklu/kaavatilanne"
          },
          koodistoValidation: {
            isValid: false,
            validValues: [
              { code: "Asemakaava", label: "Asemakaava" },
              { code: "Rakennuskaava", label: "Rakennuskaava" },
              { code: "Rantakaava", label: "Rantakaava" },
              { code: "Yleiskaava", label: "Yleiskaava" },
              { code: "Ei kaavaa", label: "Ei kaavaa" },
              { code: "Maakuntakaava", label: "Maakuntakaava" },
              { code: "Oikeusvaikutteinen yleiskaava", label: "Oikeusvaikutteinen yleiskaava" },
              { code: "Oikeusvaikutukseton yleiskaava", label: "Oikeusvaikutukseton yleiskaava" },
              { code: "Ranta-asemakaava", label: "Ranta-asemakaava" }
            ]
          }
        }
      ]
    }
  ],

  koodistoReferences: [
    {
      uri: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji",
      name: "Rakennuksen tietomallin laji",
      usedInChecks: 1
    },
    {
      uri: "https://iri.suomi.fi/model/raklu/rakentamistoimenpide",
      name: "Rakentamistoimenpide",
      usedInChecks: 1
    },
    {
      uri: "https://iri.suomi.fi/model/raklu/kaavatilanne",
      name: "Kaavatilanne",
      usedInChecks: 1
    },
    {
      uri: "http://uri.suomi.fi/codelist/rytj/Paloluokka",
      name: "Paloluokka",
      usedInChecks: 0  // No usado en este ejemplo, pero disponible
    }
  ]
};

/**
 * Ejemplo de estructura para mostrar en UI tipo tabla/lista
 */
export const exampleUIStructure = {
  // Vista resumen (dashboard)
  summaryCard: {
    title: "Validación IDS RAVA 3.5",
    stats: [
      { label: "Total elementos", value: 3, color: "neutral" },
      { label: "Pasaron", value: 1, color: "success" },
      { label: "Fallaron", value: 2, color: "error" },
      { label: "Tasa de éxito", value: "33.33%", color: "warning" }
    ],
    koodistoInfo: {
      label: "Con información de códigos",
      value: 5,
      tooltip: "Checks que tienen referencias a koodistot oficiales"
    }
  },

  // Lista de fallos expandible
  failuresList: [
    {
      id: "failure-1",
      header: {
        entityType: "IFCBUILDING",
        entityName: "Edificio Principal",
        expressID: 12345,
        guid: "abc123-def456-ghi789",
        status: "failed",
        checksCount: 3,
        expandable: true
      },
      checks: [
        {
          id: "check-1-1",
          property: {
            set: "FI_Kohde",
            name: "TietomallinLaji",
            displayName: "Tipo de modelo del edificio"
          },
          status: {
            type: "missing",
            label: "Falta",
            icon: "error",
            color: "red"
          },
          details: {
            message: "Property \"TietomallinLaji\" not found in property set \"FI_Kohde\"",
            context: {
              luokka: "Rakennuksen tietomalli",
              attribuutti: "Rakennuksen tietomallin laji",
              kommentti: "r"
            }
          },
          help: {
            linkki: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji",
            tayttoohje: "Valitse joko 'Suunnitelmamalli' tai 'Toteumamalli'",
            kayttotarkoitus: "Ydint."
          },
          koodisto: {
            name: "Rakennuksen tietomallin laji",
            uri: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji",
            validValues: [
              { code: "Suunnitelmamalli", label: "Suunnitelmamalli" },
              { code: "Toteumamalli", label: "Toteumamalli" },
              { code: "Planmodell", label: "Planmodell" },
              { code: "Utfallsmodell", label: "Utfallsmodell" },
              { code: "Planning model", label: "Planning model" },
              { code: "As-built model", label: "As-built model" }
            ],
            showDropdown: true  // Para autocompletado/corrección
          },
          actions: [
            { type: "view_docs", label: "Ver documentación", link: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji" },
            { type: "view_koodisto", label: "Ver código oficial", link: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji" },
            { type: "highlight_element", label: "Resaltar en viewer", expressID: 12345 }
          ]
        },
        {
          id: "check-1-2",
          property: {
            set: "FI_Kohde",
            name: "Rakentamistoimenpide",
            displayName: "Tipo de construcción"
          },
          status: {
            type: "invalid_value",
            label: "Valor incorrecto",
            icon: "warning",
            color: "orange"
          },
          details: {
            message: "Property \"Rakentamistoimenpide\" has incorrect value",
            expected: "Uusi rakennus tai rakennelma, Laajentaminen, ...",
            actual: "Construcción nueva",
            context: {
              luokka: "Rakentamistoimenpide",
              attribuutti: "Rakentamistoimenpiteen laji"
            }
          },
          help: {
            linkki: "https://iri.suomi.fi/model/raklu/rakentamistoimenpide",
            tayttoohje: "Valitse oikea rakentamistoimenpide koodistosta",
            kayttotarkoitus: "Ydint."
          },
          koodisto: {
            name: "Rakentamistoimenpide",
            uri: "https://iri.suomi.fi/model/raklu/rakentamistoimenpide",
            validValues: [
              { code: "Uusi rakennus tai rakennelma", label: "Uusi rakennus tai rakennelma" },
              { code: "Laajentaminen", label: "Laajentaminen" },
              // ... más valores
            ],
            showDropdown: true,
            suggestedCorrection: "Uusi rakennus tai rakennelma"  // Sugerencia basada en valor actual
          },
          actions: [
            { type: "suggest_correction", label: "Sugerir corrección", value: "Uusi rakennus tai rakennelma" },
            { type: "view_docs", label: "Ver documentación", link: "https://iri.suomi.fi/model/raklu/rakentamistoimenpide" },
            { type: "highlight_element", label: "Resaltar en viewer", expressID: 12345 }
          ]
        }
      ]
    }
  ],

  // Panel lateral con referencias a koodistot
  koodistoSidebar: {
    title: "Códigos Oficiales Referenciados",
    items: [
      {
        name: "Rakennuksen tietomallin laji",
        uri: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji",
        usedIn: 1,
        link: "https://iri.suomi.fi/model/raklu/1.0.22/rakennuksentietomallinlaji"
      },
      {
        name: "Rakentamistoimenpide",
        uri: "https://iri.suomi.fi/model/raklu/rakentamistoimenpide",
        usedIn: 1,
        link: "https://iri.suomi.fi/model/raklu/rakentamistoimenpide"
      },
      {
        name: "Kaavatilanne",
        uri: "https://iri.suomi.fi/model/raklu/kaavatilanne",
        usedIn: 1,
        link: "https://iri.suomi.fi/model/raklu/kaavatilanne"
      }
    ]
  },

  // Estructura para exportar/guardar
  exportable: {
    format: "json",  // o "excel", "pdf"
    includeKoodistoLinks: true,
    includeRAVAInfo: true,
    timestamp: "2026-02-08T12:00:00Z"
  }
};

/**
 * Tipos TypeScript sugeridos para la UI
 */
export interface UIValidationReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    withKoodistoInfo: number;
  };
  failures: UIFailure[];
  koodistoReferences: UIKoodistoReference[];
}

export interface UIFailure {
  id: string;
  header: {
    entityType: string;
    entityName: string;
    expressID: number;
    guid: string;
    status: "passed" | "failed";
    checksCount: number;
    expandable: boolean;
  };
  checks: UICheck[];
}

export interface UICheck {
  id: string;
  property: {
    set: string;
    name: string;
    displayName?: string;
  };
  status: {
    type: "missing" | "invalid" | "invalid_value" | "invalid_type";
    label: string;
    icon: "error" | "warning" | "info" | "success";
    color: "red" | "orange" | "blue" | "green";
  };
  details: {
    message: string;
    expected?: string;
    actual?: string;
    context?: {
      luokka?: string;
      attribuutti?: string;
      kommentti?: string;
    };
  };
  help?: {
    linkki?: string;
    tayttoohje?: string;
    kayttotarkoitus?: string;
  };
  koodisto?: {
    name?: string;
    uri?: string;
    validValues?: Array<{ code: string; label: string }>;
    showDropdown?: boolean;
    suggestedCorrection?: string;
  };
  actions: UIAction[];
}

export interface UIAction {
  type: "view_docs" | "view_koodisto" | "highlight_element" | "suggest_correction" | "export";
  label: string;
  link?: string;
  expressID?: number;
  value?: string;
}

export interface UIKoodistoReference {
  name?: string;
  uri: string;
  usedIn: number;
  link: string;
}
