# IDS Validator con Integración RAVA 3.5

Este módulo proporciona validación de modelos IFC usando especificaciones IDS (Information Delivery Specification) con integración mejorada para RAVA 3.5.

## Características

- ✅ Soporte para IDS 1.0, 2.1 y 3.0
- ✅ Validación de propiedades, entidades, atributos, materiales y clasificaciones
- ✅ Integración con Excel de RAVA para descripciones mejoradas
- ✅ Validación cruzada con koodistot oficiales (códigos finlandeses)
- ✅ Obtención automática de valores válidos desde URIs oficiales
- ✅ Reportes enriquecidos con contexto, documentación oficial y referencias a códigos

## Uso Básico

### 1. Cargar IDS

```typescript
import { IDSValidator } from './bim_components/IDS';

const idsValidator = components.get(IDSValidator);

// Cargar archivo IDS
const idsContent = await fetch('/assets/IFC example/RAVA3x5_asetuksen_liite1_tarkastus_v1_0.ids')
  .then(r => r.text());

await idsValidator.load(idsContent);
```

### 2. Cargar Excel de RAVA (Opcional pero recomendado)

```typescript
// Cargar Excel para enriquecer resultados con descripciones y contexto
await idsValidator.loadRAVAExcel(
  '/Users/bruno/Desktop/MigrationF3/public/assets/IFC example/RAVA3.5-ydintietojen ja rakennuksen suunnitelmamallin tekniset määritykset v1_0.xlsx'
);
```

### 3. Ejecutar Validación

```typescript
// Obtener el modelo IFC cargado
const fragments = components.get(OBC.FragmentsManager);
const model = fragments.list.values().next().value; // Primer modelo

// Ejecutar validación
const results = await idsValidator.test(model);

// Obtener mapas de fragmentos para visualización
const { pass, fail } = idsValidator.getFragmentIdMap(model, results);
```

### 4. Generar Reporte Mejorado

```typescript
// Generar reporte con información del Excel de RAVA y koodistot
const report = idsValidator.generateEnhancedReport(results);

console.log('Resumen:', report.summary);
// {
//   total: 10,
//   passed: 7,
//   failed: 3,
//   passRate: 70,
//   withKoodistoInfo: 5  // Checks con información de koodisto
// }

// Ver fallos con contexto del Excel y koodistot
report.failures.forEach(failure => {
  console.log(`\n❌ ${failure.entityType} (${failure.entityName}):`);
  failure.checks.forEach(check => {
    console.log(`  - ${check.propertySet}.${check.propertyName}: ${check.status}`);
    if (check.ravaInfo) {
      console.log(`    📋 Clase: ${check.ravaInfo.luokka}`);
      console.log(`    📝 Comentario: ${check.ravaInfo.kommentti}`);
      console.log(`    🔗 Documentación: ${check.ravaInfo.linkki}`);
      console.log(`    💡 Instrucciones: ${check.ravaInfo.tayttoohje}`);
      
      // Información de koodisto
      if (check.ravaInfo.koodistoUri) {
        console.log(`    📚 Koodisto: ${check.ravaInfo.koodisto}`);
        console.log(`    🔗 Koodisto URI: ${check.ravaInfo.koodistoUri}`);
      }
    }
    
    // Validación contra koodisto
    if (check.koodistoValidation) {
      console.log(`    ✅ Valores válidos según koodisto:`);
      check.koodistoValidation.validValues?.forEach(v => {
        console.log(`      - ${v.code}: ${v.label}`);
      });
    }
  });
});

// Ver referencias a koodistot usados
console.log('\n📚 Koodistot referenciados:');
report.koodistoReferences.forEach(ref => {
  console.log(`  - ${ref.name || 'Unknown'}: ${ref.uri} (usado en ${ref.usedInChecks} checks)`);
});
```

### 5. Validación Cruzada con Koodistot

```typescript
// La validación cruzada se ejecuta automáticamente durante test()
// Pero también puedes validar manualmente valores contra koodistot:

if (idsValidator.ravaMapper) {
  const validation = await idsValidator.ravaMapper.validateValueAgainstKoodisto(
    'http://uri.suomi.fi/codelist/rytj/Paloluokka',
    'P1'
  );
  
  if (validation.isValid) {
    console.log(`✅ Valor válido: ${validation.matchedValue?.label}`);
  } else {
    console.log(`❌ Valor inválido. Valores permitidos:`);
    validation.koodistoInfo?.values.forEach(v => {
      console.log(`  - ${v.code}: ${v.label}`);
    });
  }
}
```

### 5. Visualizar Resultados en el Viewer

```typescript
import * as OBF from "@thatopen/components-front";

const highlighter = worldComponents.get(OBF.Highlighter);

// Resaltar elementos que fallan
const { fail } = idsValidator.getFragmentIdMap(model, results);
highlighter.highlightByID('ids-validation-fails', fail);

// Opcional: resaltar elementos que pasan
const { pass } = idsValidator.getFragmentIdMap(model, results);
highlighter.highlightByID('ids-validation-passes', pass);
```

## Estructura de Resultados

### IDSCheckResult

```typescript
{
  guid: string;              // GUID del elemento IFC
  expressID: number;         // ExpressID del elemento
  pass: boolean;             // ¿Pasó todas las validaciones?
  checks: IDSCheck[];        // Lista de checks individuales
  details: {
    entityName: string;      // Nombre del elemento
    entityType: string;      // Tipo IFC (ej: "IFCBUILDING")
    location?: {
      level?: string;
      coordinates?: [number, number, number];
    };
  };
}
```

### IDSCheck (con información RAVA)

```typescript
{
  type: 'property' | 'entity' | 'attribute' | 'material' | 'classification';
  status: 'missing' | 'invalid' | 'invalid_value' | ...;
  pass: boolean;
  requirement: {
    propertySet?: string;    // ej: "FI_Kohde"
    propertyName?: string;   // ej: "TietomallinLaji"
    expected: any;
    actual?: any;
    constraints?: {
      enumValues?: string[]; // Valores permitidos
    };
  };
  details?: string;
  ravaInfo?: {              // Información del Excel de RAVA
    luokka?: string;        // Clase/Categoría
    attribuutti?: string;   // Atributo
    kommentti?: string;     // Comentario descriptivo
    linkki?: string;        // Link a documentación oficial
    kayttotarkoitus?: string; // Propósito de uso
    tayttoohje?: string;    // Instrucciones de llenado
    koodisto?: string;      // Código/estándar (nombre)
    koodistoUri?: string;   // URI completo al código oficial (uri.suomi.fi/codelist/...)
  };
  koodistoValidation?: {    // Resultado de validación contra koodisto
    isValid: boolean;
    matchedValue?: { code: string; label: string };
    validValues?: Array<{ code: string; label: string }>;
  };
}
```

## Ejemplo Completo

```typescript
// 1. Inicializar
const idsValidator = components.get(IDSValidator);

// 2. Cargar IDS y Excel
await idsValidator.load(idsContent);
await idsValidator.loadRAVAExcel(excelPath);

// 3. Validar modelo
const results = await idsValidator.test(model);

// 4. Generar reporte
const report = idsValidator.generateEnhancedReport(results);

// 5. Visualizar
const { fail } = idsValidator.getFragmentIdMap(model, results);
highlighter.highlightByID('ids-fails', fail);

// 6. Mostrar resultados en UI
console.log(`✅ Pasaron: ${report.summary.passed}/${report.summary.total}`);
console.log(`❌ Fallaron: ${report.summary.failed}`);
```

## Validación con Koodistot

Los **koodistot** son códigos oficiales finlandeses que definen valores permitidos para propiedades específicas. El validador puede:

1. **Mapear automáticamente** nombres de koodistot a sus URIs oficiales
2. **Obtener valores válidos** desde los URIs oficiales (si están disponibles)
3. **Validar valores IFC** contra los códigos oficiales
4. **Incluir referencias** a koodistot en los reportes

### Koodistot Soportados

- `Paloluokka` - Clasificación de fuego
- `Sisäänkäynnin tyyppi` - Tipo de entrada
- `Tilan käyttötarkoitus` - Propósito de uso del espacio
- `Rakenteellinen järjestelmä` - Sistema estructural
- Y muchos más códigos arquitectónicos y técnicos

## Notas

- El Excel de RAVA es **opcional** pero **altamente recomendado** para obtener descripciones mejoradas
- Los resultados incluyen información del Excel solo si se carga antes de ejecutar la validación
- El mapper busca propiedades por `propertySet.propertyName` (ej: `FI_Kohde.TietomallinLaji`)
- La validación con koodistot requiere conexión a internet para obtener valores desde URIs oficiales
- Los valores de koodistot se cachean para mejorar rendimiento
