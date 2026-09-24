import * as React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, RadialLinearScale } from 'chart.js';
import { Doughnut, Bar, Radar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useCostStore } from '../stores/CostStore';
import { useAuthStore } from '../stores/AuthStore';
import type { Language } from '../stores/CostStore';
import type { BaseCostElement, RTKorttiDetails, CostFactors, ModernCostValues, UnifiedCostValues, ConstructionPhase } from '../types/cost';
import { fromUnifiedCostValues } from '../types/cost';
import { costAnalysisTranslations, getTranslation } from '../locales/costAnalysis';
import { loadSampleCostData } from '../utils/loadSampleCostData';
import { UNIFIED_RT_DATABASE, findRTKortti } from '../data/unifiedRTDatabase';
import { FINNISH_COST_SOURCES, REGIONAL_FACTORS } from '../data/finnishCostDatabase';
import { TALO_2000_MEASUREMENTS } from '../constants/talo2000';
import { getCorrectUnit, getCorrectQuantity } from '../constants/talo2000';
import { Talo2000Unit } from '../types/talo2000';
import { TimeAnalysisService } from '../services/TimeAnalysisService';
import { BOQExportComponent } from './BOQExportComponent';
import { EnhancedBOQExportComponent } from './EnhancedBOQExportComponent';
import * as XLSX from 'xlsx';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  RadialLinearScale
);

interface Props {}

interface CostAnalysisResult {
  metrics: {
    costPerArea: number;
    costPerVolume?: number;
    percentageByCategory: { [category: string]: number };
  };
}

type ProjectType = 'residential' | 'commercial' | 'industrial' | 'infrastructure';

interface BaseProjectInfo {
  name: string;
  area: number;
  type: ProjectType;
  location: string;
  buildingType: string;
  constructionMethod: string;
}

interface ProjectInfo extends BaseProjectInfo {
  type: ProjectType;
  buildingType: string;
  constructionMethod: string;
  area: number;
  location: string;
}

interface ConstructionSchedule {
  startDate: Date;
  endDate: Date;
  totalDuration: number;
  phases: ConstructionPhase[];
  criticalPath: string[];
}

const LoadingState = () => (
  <div className="loading-container">
    <div className="spinner"></div>
    <p>Loading cost data...</p>
  </div>
);

const EmptyState = ({ language }: { language: Language }) => (
  <div className="main-page-content" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
    <div className="empty-state-cost">
      <span className="material-icons-round empty-state-cost-icon">
        monetization_on
      </span>
      <h2 className="empty-state-cost-title">
        No Cost Data Available
      </h2>
      <p className="empty-state-cost-description">
        To use the Cost Analysis feature for construction cost estimation, please:
      </p>
      <div className="instructions-grid">
        <div className="instruction-card">
          <div className="instruction-header">
            <span className="material-icons-round instruction-icon">upload_file</span>
            <strong className="instruction-title">1. Load IFC Model</strong>
          </div>
          <p className="instruction-text">
            Upload or load an IFC model with detailed building elements and quantities.
          </p>
        </div>
        <div className="instruction-card">
          <div className="instruction-header">
            <span className="material-icons-round instruction-icon">calculate</span>
            <strong className="instruction-title">2. Extract Cost Data</strong>
          </div>
          <p className="instruction-text">
            Use the "Cost Data" button in the viewer toolbar to extract quantity data.
          </p>
        </div>
        <div className="instruction-card">
          <div className="instruction-header">
            <span className="material-icons-round instruction-icon">analytics</span>
            <strong className="instruction-title">3. Analyze Costs</strong>
          </div>
          <p className="instruction-text">
            View cost breakdowns and generate detailed BOQ reports.
          </p>
        </div>
      </div>
      <div className="info-box">
        <h3 className="info-title">
          <span className="material-icons-round" style={{ fontSize: '18px' }}>info</span>
          Finnish Cost Analysis
        </h3>
        <p className="info-text">
          Cost analysis uses Finnish construction standards (TALO 2000, RT-kortti) and regional cost factors 
          to provide accurate cost estimates for construction projects in Finland.
        </p>
      </div>
      <button 
        onClick={loadSampleCostData}
        className="action-button"
      >
        <span className="material-icons-round">dataset</span>
        {getTranslation(['actions', 'loadSample'], language)}
      </button>
    </div>
  </div>
);

const CostSummaryCard = ({ 
  summary, 
  language 
}: { 
  summary: { 
    totalMaterial: number;
    totalLabor: number;
    totalEquipment: number;
    totalOverhead: number;
    grandTotal: number;
  };
  language: Language;
}) => (
  <div className="dashboard-card">
    <div className="card-header">
      <h3>{getTranslation(['analysisSections', 'summary'], language)}</h3>
    </div>
    <div className="data-cards-grid">
      <div className="data-card cost-material-card">
        <div className="data-card-header">
          <h4 className="data-card-title">{getTranslation(['costTypes', 'material'], language)}</h4>
        </div>
        <div className="data-card-content">
          <div className="metrics-container">
            <div className="metric-item">
              <div className="metric-label">Cost</div>
              <div className="metric-value">
                {summary.totalMaterial.toFixed(2)}
                <span className="metric-unit">€</span>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Percentage</div>
              <div className="metric-value">
                {((summary.totalMaterial / summary.grandTotal) * 100).toFixed(1)}
                <span className="metric-unit">% of total</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="data-card cost-labor-card">
        <div className="data-card-header">
          <h4 className="data-card-title">{getTranslation(['costTypes', 'labor'], language)}</h4>
        </div>
        <div className="data-card-content">
          <div className="metrics-container">
            <div className="metric-item">
              <div className="metric-label">Cost</div>
              <div className="metric-value">
                {summary.totalLabor.toFixed(2)}
                <span className="metric-unit">€</span>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Work Hours</div>
              <div className="metric-value">
                {summary.totalLabor > 0 ? (summary.totalLabor / 45).toFixed(1) : '0.0'}
                <span className="metric-unit">hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="data-card cost-equipment-card">
        <div className="data-card-header">
          <h4 className="data-card-title">{getTranslation(['costTypes', 'equipment'], language)}</h4>
        </div>
        <div className="data-card-content">
          <div className="metrics-container">
            <div className="metric-item">
              <div className="metric-label">Cost</div>
              <div className="metric-value">
                {summary.totalEquipment.toFixed(2)}
                <span className="metric-unit">€</span>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Percentage</div>
              <div className="metric-value">
                {((summary.totalEquipment / summary.grandTotal) * 100).toFixed(1)}
                <span className="metric-unit">% of total</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="data-card cost-overhead-card">
        <div className="data-card-header">
          <h4 className="data-card-title">{getTranslation(['costTypes', 'overhead'], language)}</h4>
        </div>
        <div className="data-card-content">
          <div className="metrics-container">
            <div className="metric-item">
              <div className="metric-label">Cost</div>
              <div className="metric-value">
                {summary.totalOverhead.toFixed(2)}
                <span className="metric-unit">€</span>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Percentage</div>
              <div className="metric-value">
                {((summary.totalOverhead / summary.grandTotal) * 100).toFixed(1)}
                <span className="metric-unit">% of total</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="data-card cost-total-card" style={{ gridColumn: 'span 2' }}>
        <div className="data-card-header">
          <h4 className="data-card-title">Total Project Cost</h4>
        </div>
        <div className="data-card-content">
          <div className="metrics-container">
            <div className="metric-item">
              <div className="metric-label">Grand Total</div>
              <div className="metric-value">
                {summary.grandTotal.toFixed(2)}
                <span className="metric-unit">€</span>
              </div>
            </div>
            <div className="metric-item">
              <div className="metric-label">Total Work Hours</div>
              <div className="metric-value">
                {summary.totalLabor > 0 ? (summary.totalLabor / 45).toFixed(1) : '0.0'}
                <span className="metric-unit">hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CostBreakdownChart = ({ 
  elements, 
  language 
}: { 
  elements: BaseCostElement[];
  language: Language;
}) => {
  const data = {
    labels: [
      getTranslation(['costTypes', 'material'], language),
      getTranslation(['costTypes', 'labor'], language),
      getTranslation(['costTypes', 'equipment'], language),
      getTranslation(['costTypes', 'overhead'], language)
    ],
    datasets: [{
      data: [
        elements.reduce((sum, el) => sum + el.costs.material, 0),
        elements.reduce((sum, el) => sum + el.costs.labor, 0),
        elements.reduce((sum, el) => sum + el.costs.equipment, 0),
        elements.reduce((sum, el) => sum + el.costs.overhead, 0)
      ],
      backgroundColor: [
        'rgba(54, 162, 235, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(255, 99, 132, 0.8)'
      ]
    }]
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 12
          },
          padding: 10
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value.toFixed(2)}€ (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <Doughnut data={data} options={options} />
    </div>
  );
};

interface GroupedElement {
  taloCode: string;
  name: string;
  quantity: number;
  unit: string;
  baseQuantities: BaseCostElement['baseQuantities'];
  costs: BaseCostElement['costs'];
  items: BaseCostElement[];
}

const CostTable = ({ 
  data, 
  language,
  onEdit,
  setCostData 
}: { 
  data: BaseCostElement[];
  language: Language;
  onEdit: (elementId: number, costType: keyof BaseCostElement['costs'], value: number) => void;
  setCostData: (data: BaseCostElement[]) => void;
}) => {
  const [collapsedSections, setCollapsedSections] = React.useState<{ [key: string]: boolean}>(() => {
    const initialState: { [key: string]: boolean } = {};
    data.forEach(element => {
      if (!initialState[element.type]) {
        initialState[element.type] = true;
      }
    });
    return initialState;
  });

  const toggleSection = (type: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Group elements by IFC type and then by name
  const groupedElements = data.reduce((acc, element) => {
    if (!acc[element.type]) {
      acc[element.type] = {
        elements: {},
        summary: {
          material: 0,
          labor: 0,
          equipment: 0,
          overhead: 0,
          total: 0,
          count: 0
        }
      };
    }

    const key = `${element.taloCode}-${element.name}`;
    if (!acc[element.type].elements[key]) {
      const groupedElement: GroupedElement = {
        taloCode: element.taloCode || '',
        name: element.name,
        quantity: 0,
        unit: Object.values(element.baseQuantities || {})[0]?.unit || 'm²',
        baseQuantities: element.baseQuantities || {},
        costs: {
          material: 0,
          labor: 0,
          equipment: 0,
          overhead: 0,
          total: 0
        },
        items: [],
      };
      acc[element.type].elements[key] = groupedElement;
    }

    acc[element.type].elements[key].quantity += 1;
    acc[element.type].elements[key].costs.material += element.costs.material;
    acc[element.type].elements[key].costs.labor += element.costs.labor;
    acc[element.type].elements[key].costs.equipment += element.costs.equipment;
    acc[element.type].elements[key].costs.overhead += element.costs.overhead;
    acc[element.type].elements[key].costs.total += element.costs.total;
    acc[element.type].elements[key].items.push(element);

    acc[element.type].summary.material += element.costs.material;
    acc[element.type].summary.labor += element.costs.labor;
    acc[element.type].summary.equipment += element.costs.equipment;
    acc[element.type].summary.overhead += element.costs.overhead;
    acc[element.type].summary.total += element.costs.total;
    acc[element.type].summary.count += 1;

    return acc;
  }, {} as { 
    [key: string]: { 
      elements: {
        [key: string]: GroupedElement
      },
      summary: { 
        material: number;
        labor: number;
        equipment: number;
        overhead: number;
        total: number;
        count: number;
      }
    }
  });

  const findRTKortti = (type: string, taloCode: string, name: string): RTKorttiDetails | null => {
    // Primero intentamos encontrar por nombre exacto
    const exactMatch = UNIFIED_RT_DATABASE[name];
    if (exactMatch) {
      const measurementUnit = getMeasurementUnit(type, taloCode);
      const modernCosts: ModernCostValues | undefined = exactMatch.defaultCosts ? {
        material: exactMatch.defaultCosts.material,
        labor: exactMatch.defaultCosts.labor,
        equipment: exactMatch.defaultCosts.equipment || 0,
        overhead: exactMatch.defaultCosts.overhead,
        total: exactMatch.defaultCosts.total
      } : undefined;
      return {
        ...exactMatch,
        defaultCosts: modernCosts
      };
    }

    // Si no hay coincidencia exacta, buscamos por tipo de elemento
    const typePrefix = name.split('.')[0];
    const possibleMatches = Object.entries(UNIFIED_RT_DATABASE).filter(([key]) => key.startsWith(typePrefix));
    
    if (possibleMatches.length > 0) {
      const [_, match] = possibleMatches[0];
      const measurementUnit = getMeasurementUnit(type, taloCode);
      const modernCosts: ModernCostValues | undefined = match.defaultCosts ? {
        material: match.defaultCosts.material,
        labor: match.defaultCosts.labor,
        equipment: match.defaultCosts.equipment || 0,
        overhead: match.defaultCosts.overhead,
        total: match.defaultCosts.total
      } : undefined;
      return {
        ...match,
        defaultCosts: modernCosts
      };
    }

    return null;
  };

  // Función para obtener costos predeterminados
  const getDefaultCosts = (type: string, taloCode: string, name: string): ModernCostValues => {
    // Costos específicos por RT-kortti
    const rtSpecificCosts: { [key: string]: ModernCostValues } = {
      'US-1': {
        material: 145,    // Aislamiento, estructura, acabados
        labor: 65,       // Instalación compleja
        equipment: 25,    // Equipo especializado
        overhead: 35,     // Gastos generales
        total: 270       // Total por m²
      },
      'VS-3': {
        material: 85,     // Materiales más ligeros
        labor: 45,       // Instalación estándar
        equipment: 15,    // Equipo básico
        overhead: 25,     // Gastos generales
        total: 170       // Total por m²
      },
      'KS-1': {
        material: 180,    // Hormigón, refuerzo
        labor: 85,       // Trabajo especializado
        equipment: 45,    // Equipo pesado
        overhead: 40,     // Gastos generales
        total: 350       // Total por m³
      }
    };

    // Si existe un costo específico para el RT-kortti, usarlo
    if (rtSpecificCosts[name]) {
      return rtSpecificCosts[name];
    }

    // Costos base por tipo de elemento si no hay RT-kortti específico
    const baseCosts: { [key: string]: ModernCostValues } = {
      'IfcWall': {
        material: 125,    // Actualizado para muros
        labor: 55,
        equipment: 20,
        overhead: 30,
        total: 230
      },
      'IfcSlab': {
        material: 110,
        labor: 50,
        equipment: 25,
        overhead: 25,
        total: 210
      },
      'IfcColumn': {
        material: 160,
        labor: 75,
        equipment: 35,
        overhead: 40,
        total: 310
      },
      'IfcBeam': {
        material: 150,
        labor: 70,
        equipment: 30,
        overhead: 35,
        total: 285
      }
    };

    // Factores de ajuste por código Talo
    const taloFactors: { [key: string]: number } = {
      '1.2.3': 1.2,  // Elementos estructurales
      '1.2.4': 1.1,  // Elementos de cimentación
      '1.3.1': 1.3,  // Muros exteriores
      '1.3.2': 1.0,  // Muros interiores
      '1.3.3': 1.2,  // Techos
      '1.3.4': 0.9,  // Complementos
      '1.3.5': 1.1   // Elementos especiales
    };

    const baseCost = baseCosts[type] || baseCosts['IfcWall'];
    const taloPrefix = taloCode.split('.').slice(0, 3).join('.');
    const factor = taloFactors[taloPrefix] || 1.0;

    return {
      material: baseCost.material * factor,
      labor: baseCost.labor * factor,
      equipment: baseCost.equipment * factor,
      overhead: baseCost.overhead * factor,
      total: (baseCost.material + baseCost.labor + baseCost.equipment + baseCost.overhead) * factor
    };
  };

  const getTalo2000Unit = (taloCode: string): string => {
    // Usar la implementación de TALO_2000_MEASUREMENTS
    const measurement = TALO_2000_MEASUREMENTS[taloCode] || TALO_2000_MEASUREMENTS['default'];
    return measurement.unit;
  };

  const getMeasurementUnit = (type: string, taloCode: string): Talo2000Unit => {
    return getCorrectUnit(type, taloCode);
  };

  const getElementQuantity = (element: BaseCostElement): number => {
    const unit = getCorrectUnit(element.type, element.taloCode);
    return getCorrectQuantity(element, unit);
  };

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>{getTranslation(['analysisSections', 'costBreakdown'], language)}</h3>
      </div>
      <div className="table-container">
        <table className="lca-table">
          <tbody>
            {Object.entries(groupedElements)
              .sort(([typeA], [typeB]) => {
                const elementA = Object.values(groupedElements[typeA].elements)[0];
                const elementB = Object.values(groupedElements[typeB].elements)[0];
                const taloCompare = elementA.taloCode.localeCompare(elementB.taloCode);
                return taloCompare !== 0 ? taloCompare : typeA.localeCompare(typeB);
              })
              .map(([type, { elements, summary }]) => (
                <React.Fragment key={type}>
                  {/* IFC Type Header */}
                  <tr 
                    onClick={() => toggleSection(type)}
              style={{ 
                cursor: 'pointer',
                      backgroundColor: 'var(--surface-3)',
                      borderBottom: '2px solid var(--border)'
                    }}
                  >
                    <td colSpan={9}>
                      <div style={{ 
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span className="material-icons-round">
                          {collapsedSections[type] ? 'chevron_right' : 'expand_more'}
                        </span>
                        <strong>{type}</strong>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-2)' }}>
                          {summary.count} {getTranslation(['tableHeaders', summary.count === 1 ? 'element' : 'elements'], language)}
                        </span>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '16px',
                        padding: '0 16px 12px 40px',
                        fontSize: '0.9em'
                      }}>
                        <div>
                          <div style={{ color: 'var(--text-2)' }}>{getTranslation(['costTypes', 'material'], language)}</div>
                          <div style={{ fontWeight: '500' }}>{summary.material.toFixed(2)} €</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-2)' }}>{getTranslation(['costTypes', 'labor'], language)}</div>
                          <div style={{ fontWeight: '500' }}>{summary.labor.toFixed(2)} €</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-2)' }}>{getTranslation(['costTypes', 'equipment'], language)}</div>
                          <div style={{ fontWeight: '500' }}>{summary.equipment.toFixed(2)} €</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-2)' }}>tth</div>
                          <div style={{ fontWeight: '500' }}>{(summary.labor / 45).toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-2)' }}>{getTranslation(['costTypes', 'total'], language)}</div>
                          <div style={{ fontWeight: '500' }}>{summary.total.toFixed(2)} €</div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {!collapsedSections[type] && (
                    <>
                      {/* Column Headers */}
                      <tr style={{ backgroundColor: 'var(--surface-2)' }}>
                        <th style={{ padding: '8px' }}>
                          {getTranslation(['tableHeaders', 'taloCode'], language)}
                        </th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>
                          {getTranslation(['tableHeaders', 'count'], language)}
                        </th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>
                          {getTranslation(['tableHeaders', 'description'], language)}
                        </th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>
                          {getTranslation(['tableHeaders', 'unit'], language)}
                        </th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>
                          {getTranslation(['tableHeaders', 'totalQuantity'], language)}
                        </th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>
                          {getTranslation(['costTypes', 'material'], language)} (€)
                        </th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>
                          {getTranslation(['costTypes', 'labor'], language)} (€)
                        </th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>
                          {getTranslation(['costTypes', 'equipment'], language)} (€)
                        </th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>tth</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>
                          {getTranslation(['costTypes', 'total'], language)} (€)
                        </th>
                      </tr>

                      {/* Element Rows */}
                      {Object.values(elements)
                        .sort((a, b) => a.taloCode.localeCompare(b.taloCode))
                        .map((groupedElement) => {
                          const rtKortti = findRTKortti(type, groupedElement.taloCode, groupedElement.name);
                          console.log('Processing element:', {
                            type,
                            taloCode: groupedElement.taloCode,
                            name: groupedElement.name,
                            rtKortti,
                            typeUpperCase: type.toUpperCase(),
                            typeLowerCase: type.toLowerCase(),
                            isWindow: type === 'IfcWindow',
                            isDoor: type === 'IfcDoor',
                            isBeam: type === 'IfcBEAM',
                            matchesBeam: type === 'IfcBeam'
                          });
                          
                          // Calculate total quantity for all items in the group
                          const totalQuantity = groupedElement.items.reduce((acc, item) => {
                            return acc + getElementQuantity(item);
                          }, 0);
                          
                          const unit = getMeasurementUnit(type, groupedElement.taloCode);
                          console.log('Determined unit:', { unit, type, taloCode: groupedElement.taloCode });
                          
                          if (rtKortti?.defaultCosts && 
                              groupedElement.costs.material === 0 && 
                              groupedElement.costs.labor === 0 && 
                              groupedElement.costs.equipment === 0) {
                            groupedElement.costs = rtKortti.defaultCosts;
                          }
                          return (
                            <React.Fragment key={`${groupedElement.taloCode}-${groupedElement.name}`}>
                              <tr style={{ borderBottom: rtKortti ? '1px solid var(--primary-100)' : '1px solid var(--border)' }}>
                                <td>{groupedElement.taloCode || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{groupedElement.quantity}</td>
                                <td style={{ textAlign: 'left' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {groupedElement.name}
                                    {rtKortti && (
                                      <span className="material-icons-round" style={{ 
                                        fontSize: '16px', 
                                        color: 'var(--primary)',
                                        cursor: 'pointer'
                                      }}>
                                        description
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {(() => {
                                    switch(unit) {
                                      case Talo2000Unit.CUBIC_METERS:
                                        return 'm³';
                                      case Talo2000Unit.SQUARE_METERS:
                                        return 'm²';
                                      case Talo2000Unit.METERS:
                                        return 'm';
                                      case Talo2000Unit.PIECES:
                                        return 'kpl';
                                      default:
                                        return '-';
                                    }
                                  })()}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {totalQuantity.toFixed(2)}
                                </td>
                                <td style={{ padding: '4px' }}>
                                  <div style={{
                                    position: 'relative',
                                    width: '90px',
                                    margin: '0 auto'
                                  }}>
                                    <input
                                      type="text"
                                      defaultValue={groupedElement.costs.material.toFixed(2)}
                                      onBlur={(e) => {
                                        const materialValue = parseFloat(e.target.value) || 0;
                                        const materialPerElement = materialValue / groupedElement.quantity;
                                        groupedElement.items.forEach(element => {
                                          onEdit(element.id, 'material', materialPerElement);
                                        });
                                      }}
                                      style={{ 
                                        width: '100%',
                                        padding: '4px 8px',
                                        backgroundColor: 'var(--surface-2)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '4px',
                                        color: 'var(--text-1)',
                                        textAlign: 'right',
                                        fontSize: '0.9em'
                                      }}
                                    />
                                  </div>
                                </td>
                                <td style={{ padding: '4px' }}>
                                  <div style={{
                                    position: 'relative',
                                    width: '90px',
                                    margin: '0 auto'
                                  }}>
                                    <input
                                      type="text"
                                      defaultValue={groupedElement.costs.labor.toFixed(2)}
                                      onBlur={(e) => {
                                        const laborValue = parseFloat(e.target.value) || 0;
                                        const laborPerElement = laborValue / groupedElement.quantity;
                                        groupedElement.items.forEach(element => {
                                          onEdit(element.id, 'labor', laborPerElement);
                                        });
                                      }}
                                      style={{ 
                                        width: '100%',
                                        padding: '4px 8px',
                                        backgroundColor: 'var(--surface-2)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '4px',
                                        color: 'var(--text-1)',
                                        textAlign: 'right',
                                        fontSize: '0.9em'
                                      }}
                                    />
                                  </div>
                                </td>
                                <td style={{ padding: '4px' }}>
                                  <div style={{
                                    position: 'relative',
                                    width: '90px',
                                    margin: '0 auto'
                                  }}>
                                    <input
                                      type="text"
                                      defaultValue={groupedElement.costs.equipment.toFixed(2)}
                                      onBlur={(e) => {
                                        const equipmentValue = parseFloat(e.target.value) || 0;
                                        const equipmentPerElement = equipmentValue / groupedElement.quantity;
                                        groupedElement.items.forEach(element => {
                                          onEdit(element.id, 'equipment', equipmentPerElement);
                                        });
                                      }}
                                      style={{ 
                                        width: '100%',
                                        padding: '4px 8px',
                                        backgroundColor: 'var(--surface-2)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '4px',
                                        color: 'var(--text-1)',
                                        textAlign: 'right',
                                        fontSize: '0.9em'
                                      }}
                                    />
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {(groupedElement.costs.labor / 45).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: '600', padding: '4px' }}>
                                  <div style={{
                                    width: '90px',
                                    margin: '0 auto',
                                    backgroundColor: 'var(--surface-1)',
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    {(Number(groupedElement.costs.material) + 
                                      Number(groupedElement.costs.labor) + 
                                      Number(groupedElement.costs.equipment)).toFixed(2)}
                                  </div>
                                </td>
                              </tr>
                              {rtKortti && (
                                <tr className="rt-details-row" style={{ backgroundColor: 'var(--surface-1)' }}>
                                  <td colSpan={9} style={{ padding: '12px 40px' }}>
                                    <div style={{ 
                                      borderLeft: '3px solid var(--primary)',
                                      paddingLeft: '16px'
                                    }}>
                                      <div style={{ 
                                        fontSize: '0.95em',
                                        color: 'var(--text-1)',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                      }}>
                                        <span className="material-icons-round" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                                          description
                                        </span>
                                        <span>
                                          RT {rtKortti.code} - {rtKortti.name?.fi || groupedElement.name}
                                          {rtKortti.source && (
                                            <span style={{ fontSize: '0.85em', color: 'var(--text-2)', marginLeft: '8px' }}>
                                              (v{rtKortti.source.version})
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                      <div style={{ 
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                        gap: '16px',
                                        color: 'var(--text-2)',
                                        fontSize: '0.9em'
                                      }}>
                                        <div>
                                          <strong>Materiaalit: </strong>
                                          <div style={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: '4px',
                                            marginTop: '4px'
                                          }}>
                                            {rtKortti.materials.map((material, index) => (
                                              <span key={index} style={{
                                                backgroundColor: 'var(--surface-2)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.9em'
                                              }}>
                                                {material}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                        <div>
                                          <strong>Työvaiheet: </strong>
                                          <div style={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: '4px',
                                            marginTop: '4px'
                                          }}>
                                            {rtKortti.workPhases.map((phase, index) => (
                                              <span key={index} style={{
                                                backgroundColor: 'var(--surface-2)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.9em'
                                              }}>
                                                {phase}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                        <div>
                                          <strong>Laatuvaatimukset: </strong>
                                          <span style={{
                                            backgroundColor: 'var(--surface-2)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.9em'
                                          }}>
                                            {rtKortti.requirements}
                                          </span>
                                        </div>
                                        {rtKortti.technicalDetails && (
                                          <div>
                                            <strong>Tekniset tiedot: </strong>
                                            <div style={{ 
                                              display: 'flex', 
                                              flexWrap: 'wrap', 
                                              gap: '4px',
                                              marginTop: '4px'
                                            }}>
                                              {Object.entries(rtKortti.technicalDetails).map(([key, value]) => (
                                                value && (
                                                  <span key={key} style={{
                                                    backgroundColor: 'var(--surface-2)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.9em'
                                                  }}>
                                                    {key}: {value}
                                                  </span>
                                                )
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {rtKortti.maintenance && (
                                          <div>
                                            <strong>Huolto: </strong>
                                            <div style={{ 
                                              display: 'flex', 
                                              flexDirection: 'column',
                                              gap: '4px',
                                              marginTop: '4px'
                                            }}>
                                              <span style={{
                                                backgroundColor: 'var(--surface-2)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.9em'
                                              }}>
                                                Käyttöikä: {rtKortti.maintenance.estimatedLifespan} vuotta
                                              </span>
                                              <span style={{
                                                backgroundColor: 'var(--surface-2)',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.9em'
                                              }}>
                                                Tarkastusväli: {rtKortti.maintenance.inspectionInterval} kk
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </>
                  )}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DatabaseInfo = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.9em',
    color: 'var(--text-2)',
    backgroundColor: 'var(--surface-2)',
    padding: '8px 16px',
    borderRadius: '8px',
    marginRight: 'auto'
  }}>
    <span className="material-icons-round" style={{ fontSize: '20px' }}>database</span>
    <div>
      Finnish Construction Cost Database
      <div style={{ fontSize: '0.9em', color: 'var(--text-3)' }}>v2024.1 - 2024-03</div>
    </div>
  </div>
);

const LanguageSelector = ({ language, setLanguage }: { language: Language, setLanguage: (lang: Language) => void }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--surface-2)',
    padding: '4px',
    borderRadius: '6px'
  }}>
    <span style={{ fontSize: '0.85em', color: 'var(--text-2)', marginRight: '4px' }}>Language:</span>
    <button
      className={`language-button ${language === 'en' ? 'active' : ''}`}
      onClick={() => setLanguage('en')}
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        border: 'none',
        background: language === 'en' ? 'var(--primary)' : 'transparent',
        color: language === 'en' ? 'white' : 'var(--text-2)',
        cursor: 'pointer',
        fontSize: '0.9em'
      }}
    >
      EN
    </button>
    <button
      className={`language-button ${language === 'fi' ? 'active' : ''}`}
      onClick={() => setLanguage('fi')}
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        border: 'none',
        background: language === 'fi' ? 'var(--primary)' : 'transparent',
        color: language === 'fi' ? 'white' : 'var(--text-2)',
        cursor: 'pointer',
        fontSize: '0.9em'
      }}
    >
      FI
    </button>
  </div>
);

// Factores de costo por defecto
const DEFAULT_COST_FACTORS: CostFactors = {
  location: {
    helsinki: 1.15,
    espoo: 1.12,
    vantaa: 1.10,
    tampere: 1.05,
    turku: 1.03,
    oulu: 1.00,
    other: 0.95
  },
  buildingType: {
    residential: 1.00,
    office: 1.10,
    commercial: 1.15,
    industrial: 0.90,
    public: 1.05
  },
  constructionMethod: {
    traditional: 1.00,
    prefabricated: 0.95,
    modular: 0.90,
    renovation: 1.20
  },
  projectSize: {
    small: 1.15,    // < 1000m²
    medium: 1.00,   // 1000-5000m²
    large: 0.90     // > 5000m²
  }
};

// Componente para seleccionar factores de costo
const CostFactorsSelector = ({ 
  factors, 
  onChange 
}: { 
  factors: CostFactors, 
  onChange: (factors: CostFactors) => void 
}) => (
  <div className="cost-factors">
    <div className="factor-group">
      <label>Location:</label>
      <select 
        onChange={(e) => onChange({
          ...factors,
          location: { ...factors.location, selected: e.target.value }
        })}
      >
        {Object.keys(factors.location).map(city => (
          <option key={city} value={city}>
            {city.charAt(0).toUpperCase() + city.slice(1)}
          </option>
        ))}
      </select>
      </div>
    <div className="factor-group">
      <label>Building Type:</label>
      <select
        onChange={(e) => onChange({
          ...factors,
          buildingType: { ...factors.buildingType, selected: e.target.value }
        })}
      >
        {Object.keys(factors.buildingType).map(type => (
          <option key={type} value={type}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </option>
        ))}
      </select>
    </div>
    <div className="factor-group">
      <label>Construction Method:</label>
      <select
        onChange={(e) => onChange({
          ...factors,
          constructionMethod: { ...factors.constructionMethod, selected: e.target.value }
        })}
      >
        {Object.keys(factors.constructionMethod).map(method => (
          <option key={method} value={method}>
            {method.charAt(0).toUpperCase() + method.slice(1)}
          </option>
        ))}
      </select>
      </div>
    </div>
  );

// Función para calcular el costo total con factores
const calculateAdjustedCost = (baseCost: number, factors: CostFactors, area: number) => {
  const locationFactor = Number(factors.location[factors.location.selected as keyof typeof factors.location] ?? factors.location.oulu);
  const typeFactor = Number(factors.buildingType[factors.buildingType.selected as keyof typeof factors.buildingType] ?? factors.buildingType.residential);
  const methodFactor = Number(factors.constructionMethod[factors.constructionMethod.selected as keyof typeof factors.constructionMethod] ?? factors.constructionMethod.traditional);
  const sizeFactor = area < 1000 ? factors.projectSize.small :
                    area > 5000 ? factors.projectSize.large :
                    factors.projectSize.medium;
  
  return baseCost * locationFactor * typeFactor * methodFactor * sizeFactor;
};

const BuildingTypeSelector = ({ value, onChange, language }: { 
  value: string;
  onChange: (value: string) => void;
  language: Language;
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--surface-2)',
    padding: '8px 16px',
    borderRadius: '8px'
  }}>
    <span className="material-icons-round" style={{ fontSize: '20px' }}>apartment</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--text-2)',
        fontSize: '0.9em',
        cursor: 'pointer'
      }}
    >
      <option value="residential">Residential</option>
      <option value="commercial">Commercial</option>
      <option value="industrial">Industrial</option>
      <option value="infrastructure">Infrastructure</option>
    </select>
  </div>
);

const ConstructionMethodSelector = ({ value, onChange, language }: { 
  value: string;
  onChange: (value: string) => void;
  language: Language;
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--surface-2)',
    padding: '8px 16px',
    borderRadius: '8px'
  }}>
    <span className="material-icons-round" style={{ fontSize: '20px' }}>construction</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--text-2)',
        fontSize: '0.9em',
        cursor: 'pointer'
      }}
    >
      <option value="traditional">{getTranslation(['constructionMethods', 'traditional'], language)}</option>
      <option value="prefabricated">{getTranslation(['constructionMethods', 'prefabricated'], language)}</option>
      <option value="modular">{getTranslation(['constructionMethods', 'modular'], language)}</option>
      <option value="renovation">{getTranslation(['constructionMethods', 'renovation'], language)}</option>
    </select>
  </div>
);

const FINNISH_BUILDING_BENCHMARKS = {
  residential: {
    material: { avg: 1250, min: 1000, max: 1500 },
    labor: { avg: 850, min: 700, max: 1000 },
    equipment: { avg: 200, min: 150, max: 250 },
    overhead: { avg: 150, min: 100, max: 200 },
    total: { avg: 2300, min: 1850, max: 2750 }
  },
  commercial: {
    material: { avg: 1400, min: 1200, max: 1600 },
    labor: { avg: 950, min: 800, max: 1100 },
    equipment: { avg: 250, min: 200, max: 300 },
    overhead: { avg: 200, min: 150, max: 250 },
    total: { avg: 2600, min: 2200, max: 3000 }
  },
  industrial: {
    material: { avg: 1000, min: 800, max: 1200 },
    labor: { avg: 700, min: 600, max: 800 },
    equipment: { avg: 300, min: 250, max: 350 },
    overhead: { avg: 180, min: 150, max: 200 },
    total: { avg: 2000, min: 1650, max: 2350 }
  }
};

const REGIONAL_BENCHMARKS = {
  capital: {
    material: 1300,
    labor: 900,
    equipment: 210,
    overhead: 160
  }
};

const CostComparisonChart = ({ 
  costSummary,
  projectInfo,
  language 
}: { 
  costSummary: {
    totalMaterial: number;
    totalLabor: number;
    totalEquipment: number;
    totalOverhead: number;
    grandTotal: number;
  };
  projectInfo: ProjectInfo | null;
  language: Language;
}) => {
  const buildingType = projectInfo?.buildingType?.toLowerCase() || 'residential';
  const benchmark = FINNISH_BUILDING_BENCHMARKS[buildingType as keyof typeof FINNISH_BUILDING_BENCHMARKS] || FINNISH_BUILDING_BENCHMARKS.residential;
  const projectArea = projectInfo?.area || 1;

  // Calcular costos por m²
  const projectCosts = {
    material: costSummary.totalMaterial / projectArea,
    labor: costSummary.totalLabor / projectArea,
    equipment: costSummary.totalEquipment / projectArea,
    overhead: costSummary.totalOverhead / projectArea
  };

  const data = {
    labels: [
      getTranslation(['costTypes', 'material'], language),
      getTranslation(['costTypes', 'labor'], language),
      getTranslation(['costTypes', 'equipment'], language),
      getTranslation(['costTypes', 'overhead'], language)
    ],
    datasets: [
      {
        label: getTranslation(['comparison', 'yourProject'], language),
        data: [
          projectCosts.material,
          projectCosts.labor,
          projectCosts.equipment,
          projectCosts.overhead
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
      },
      {
        label: getTranslation(['comparison', 'finnishAverage'], language),
        data: [
          benchmark.material.avg,
          benchmark.labor.avg,
          benchmark.equipment.avg,
          benchmark.overhead.avg
        ],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
      },
      {
        label: language === 'fi' ? 'Pääkaupunkiseutu' : 'Capital Region',
        data: [
          REGIONAL_BENCHMARKS.capital.material,
          REGIONAL_BENCHMARKS.capital.labor,
          REGIONAL_BENCHMARKS.capital.equipment,
          REGIONAL_BENCHMARKS.capital.overhead
        ],
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 206, 86, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 206, 86, 1)'
      }
    ]
  };

  const options: ChartOptions<'radar'> = {
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(33, 33, 33, 0.95)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            return `${context.dataset.label}: ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} €/m²`;
          }
        }
      },
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      datalabels: {
        display: false // Asegura que no se muestren los valores en los nodos
      }
    },
    scales: {
      r: {
        angleLines: {
          color: 'rgba(200, 200, 200, 0.2)'
        },
        grid: {
          color: 'rgba(200, 200, 200, 0.2)'
        },
        pointLabels: {
          font: {
            size: 12
        }
        },
        ticks: {
          backdropColor: 'transparent',
          color: 'rgba(200, 200, 200, 0.8)',
          font: {
            size: 11
          },
          callback: function(value) {
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' €/m²';
          }
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  // Notas mejoradas
  const notes = [
    language === 'fi'
      ? 'Arvot perustuvat Suomen rakennuskustannusindeksiin (2024).' 
      : 'Values based on the Finnish Construction Cost Index (2024).',
    language === 'fi'
      ? `Tyypillinen kokonaiskustannusalue: ${benchmark.total.min} - ${benchmark.total.max} €/m².`
      : `Typical total cost range: ${benchmark.total.min} - ${benchmark.total.max} €/m².`,
    language === 'fi'
      ? 'Kustannukset voivat vaihdella sijainnin, rakentamistavan ja projektin koon mukaan.'
      : 'Costs may vary depending on location, construction method, and project size.',
    language === 'fi'
      ? 'Yleiskulut sisältävät hallinnon ja projektin yleiset menot.'
      : 'Overhead includes administration and general project expenses.',
    language === 'fi'
      ? 'Pääkaupunkiseudun arvot ovat esimerkinomaisia ja voivat muuttua.'
      : 'Capital Region values are for reference only and may change.'
  ];

  // Obtener el título correcto según idioma
  const chartTitle = language === 'fi' 
    ? 'Kustannusvertailu suomalaisten rakennusstandardien kanssa'
    : 'Cost Comparison with Finnish Building Standards';

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>{chartTitle}</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{ height: '500px' }}>
          <Radar data={data} options={options} />
        </div>
        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--surface-2)',
          borderRadius: '8px',
          fontSize: '0.95em',
          color: 'var(--text-2)'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>
            {language === 'fi' ? 'Huom:' : 'Note:'}
          </p>
          <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
            {notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const CostAnalysisSection = ({ 
  costSummary,
  analysisResult,
  projectArea,
  language,
  elements
}: { 
  costSummary: {
    totalMaterial: number;
    totalLabor: number;
    totalEquipment: number;
    totalOverhead: number;
    grandTotal: number;
  };
  analysisResult: CostAnalysisResult | null;
  projectArea: number;
  language: Language;
  elements: BaseCostElement[];
}) => {
  const costPerM2 = projectArea ? costSummary.grandTotal / projectArea : 0;
  
  // Calcular costos por tipo de elemento IFC
  const ifcTypeCosts = elements.reduce((acc, element) => {
    if (!acc[element.type]) {
      acc[element.type] = {
        count: 0,
        material: 0,
        labor: 0,
        equipment: 0,
        overhead: 0,
        total: 0
      };
    }
    acc[element.type].count++;
    acc[element.type].material += element.costs.material;
    acc[element.type].labor += element.costs.labor;
    acc[element.type].equipment += element.costs.equipment;
    acc[element.type].overhead += element.costs.overhead;
    acc[element.type].total += element.costs.total;
    return acc;
  }, {} as { [key: string]: { 
    count: number;
    material: number;
    labor: number;
    equipment: number;
    overhead: number;
    total: number;
  }});

  // Datos para el gráfico de barras apiladas
  const stackedBarOptions: ChartOptions<'bar'> = {
    plugins: {
      title: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(33, 33, 33, 0.95)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const value = context.raw as number;
            return `${context.dataset.label}: ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} €/m²`;
          }
        }
      },
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      datalabels: {
        display: false
      }
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(200, 200, 200, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value) {
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ' €/m²';
          }
        }
      }
    }
  };

  const stackedBarData = {
    labels: Object.keys(ifcTypeCosts).map(type => type.replace('Ifc', '')),
    datasets: [
      {
        label: 'Material',
        data: Object.values(ifcTypeCosts).map(cost => cost.material),
        backgroundColor: 'rgba(54, 162, 235, 0.85)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Labor',
        data: Object.values(ifcTypeCosts).map(cost => cost.labor),
        backgroundColor: 'rgba(75, 192, 192, 0.85)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      },
      {
        label: 'Equipment',
        data: Object.values(ifcTypeCosts).map(cost => cost.equipment),
        backgroundColor: 'rgba(255, 206, 86, 0.85)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1
      },
      {
        label: 'Overhead',
        data: Object.values(ifcTypeCosts).map(cost => cost.overhead),
        backgroundColor: 'rgba(255, 99, 132, 0.85)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>{getTranslation(['analysisSections', 'analysis'], language)}</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        <h4>{getTranslation(['comparison', 'title'], language)}</h4>
        <div style={{ height: '400px' }}>
          <Bar data={stackedBarData} options={stackedBarOptions} />
        </div>
        <div className="data-cards-grid">
          <div className="data-card cost-metrics-card">
            <div className="data-card-header">
              <h4 className="data-card-title">{getTranslation(['metrics', 'costPerArea'], language)}</h4>
            </div>
            <div className="data-card-content">
              <div className="metrics-container">
                <div className="metric-item">
                  <div className="metric-label">Cost per m²</div>
                  <div className="metric-value">
                    {costPerM2.toFixed(2)}
                    <span className="metric-unit">€/m²</span>
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Benchmark</div>
                  <div className="metric-value">
                    {costPerM2 < 2000 ? 'Below' : costPerM2 > 3000 ? 'Above' : 'Average'}
                    <span className="metric-unit">Finnish standard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="data-card cost-metrics-card">
            <div className="data-card-header">
              <h4 className="data-card-title">{getTranslation(['metrics', 'laborCostRatio'], language)}</h4>
            </div>
            <div className="data-card-content">
              <div className="metrics-container">
                <div className="metric-item">
                  <div className="metric-label">Percentage</div>
                  <div className="metric-value">
                    {((costSummary.totalLabor / costSummary.grandTotal) * 100).toFixed(1)}
                    <span className="metric-unit">%</span>
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Standard</div>
                  <div className="metric-value">
                    35-45%
                    <span className="metric-unit">Finnish range</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="data-card cost-metrics-card">
            <div className="data-card-header">
              <h4 className="data-card-title">{getTranslation(['metrics', 'materialCostRatio'], language)}</h4>
            </div>
            <div className="data-card-content">
              <div className="metrics-container">
                <div className="metric-item">
                  <div className="metric-label">Percentage</div>
                  <div className="metric-value">
                    {((costSummary.totalMaterial / costSummary.grandTotal) * 100).toFixed(1)}
                    <span className="metric-unit">%</span>
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Standard</div>
                  <div className="metric-value">
                    40-50%
                    <span className="metric-unit">Finnish range</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="data-card cost-metrics-card">
            <div className="data-card-header">
              <h4 className="data-card-title">{getTranslation(['metrics', 'equipmentCostRatio'], language)}</h4>
            </div>
            <div className="data-card-content">
              <div className="metrics-container">
                <div className="metric-item">
                  <div className="metric-label">Percentage</div>
                  <div className="metric-value">
                    {((costSummary.totalEquipment / costSummary.grandTotal) * 100).toFixed(1)}
                    <span className="metric-unit">%</span>
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Standard</div>
                  <div className="metric-value">
                    10-15%
                    <span className="metric-unit">Finnish range</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* IFC Element Type Analysis con el mismo estilo que los otros cuadros */}
        <div className="data-cards-grid" style={{ marginTop: '2rem' }}>
          {Object.entries(ifcTypeCosts).map(([type, costs]) => (
            <div key={type} className="data-card ifc-cost-card">
              <div className="data-card-header">
                <h4 className="data-card-title">{type.replace('Ifc', '')}</h4>
              </div>
              <div className="data-card-content">
                <div className="metrics-container">
                  <div className="metric-item">
                    <div className="metric-label">Total Cost</div>
                    <div className="metric-value">
                      {costs.total.toFixed(2)}
                      <span className="metric-unit">€</span>
                    </div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Elements</div>
                    <div className="metric-value">
                      {costs.count}
                      <span className="metric-unit">count</span>
                    </div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-label">Percentage</div>
                    <div className="metric-value">
                      {((costs.total / costSummary.grandTotal) * 100).toFixed(1)}
                      <span className="metric-unit">% of total</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="charts-grid" style={{ marginTop: '2rem' }}>
          <div className="chart-wrapper">
            <h4>Cost Distribution Overview</h4>
            <CostBreakdownChart elements={elements} language={language} />
          </div>
          <div className="chart-wrapper">
            <h4>Element Type Cost Distribution</h4>
            <div style={{ height: '400px' }}>
              <Bar data={stackedBarData} options={stackedBarOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const getPhaseColor = (phase: string): string => {
  const colors: { [key: string]: string } = {
    preparation: '#4A90E2',
    foundation: '#F5A623',
    structure: '#7ED321',
    envelope: '#50E3C2',
    interior: '#B8E986',
    mep: '#9013FE',
    finishes: '#BD10E0'
  };
  return colors[phase] || '#D8D8D8';
};

const ConstructionSchedule = ({ schedule, language }: { schedule: ConstructionSchedule; language: Language }) => {
  const timelineWidth = 100; // percentage
  const startTimestamp = schedule.startDate.getTime();
  const totalDuration = schedule.totalDuration;

  const getPhasePosition = (phase: ConstructionPhase): { left: string; width: string } => {
    const phaseStart = phase.startDate.getTime();
    const phaseEnd = phase.endDate.getTime();
    
    const left = ((phaseStart - startTimestamp) / (totalDuration * 24 * 60 * 60 * 1000)) * timelineWidth;
    const width = ((phaseEnd - phaseStart) / (totalDuration * 24 * 60 * 60 * 1000)) * timelineWidth;
    
    return {
      left: `${left}%`,
      width: `${width}%`
    };
  };

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>{getTranslation(['schedule', 'title'], language)}</h3>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div>
              <strong>{getTranslation(['schedule', 'startDate'], language)}:</strong> {formatDate(schedule.startDate)}
            </div>
            <div>
              <strong>{getTranslation(['schedule', 'endDate'], language)}:</strong> {formatDate(schedule.endDate)}
            </div>
            <div>
              <strong>{getTranslation(['schedule', 'duration'], language)}:</strong> {schedule.totalDuration} days
            </div>
          </div>
        </div>

        <div className="timeline-container" style={{ 
          position: 'relative',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          {schedule.phases.map((phase: ConstructionPhase, index: number) => (
            <div key={phase.name} style={{ 
              marginBottom: '1rem',
              position: 'relative',
              height: '60px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{ 
                width: '150px',
                paddingRight: '1rem',
                textAlign: 'right',
                fontWeight: 500
              }}>
                {getTranslation(['phases', phase.name], language)}
              </div>
              
              <div style={{ 
                flex: 1,
                position: 'relative',
                height: '40px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: '4px'
              }}>
                <div style={{
                  position: 'absolute',
                  height: '100%',
                  backgroundColor: getPhaseColor(phase.name),
                  borderRadius: '4px',
                  ...getPhasePosition(phase),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.85em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '0 8px'
                }}>
                  {phase.duration} days
                </div>
              </div>

              <div style={{ 
                width: '200px',
                paddingLeft: '1rem',
                fontSize: '0.9em',
                color: 'var(--text-2)'
              }}>
                <div>
                  {getTranslation(['schedule', 'workers'], language)}: {phase.resources.labor}
                </div>
                <div>
                  {getTranslation(['schedule', 'equipment'], language)}: {phase.resources.equipment}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'var(--surface-2)',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>
            {getTranslation(['schedule', 'criticalPath'], language)}
          </h4>
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {schedule.criticalPath.map((phase: string, index: number) => (
              <React.Fragment key={phase}>
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: getPhaseColor(phase),
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}>
                  {getTranslation(['phases', phase], language)}
                </span>
                {index < schedule.criticalPath.length - 1 && (
                  <span className="material-icons-round" style={{ color: 'var(--text-2)' }}>
                    arrow_forward
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ 
          marginTop: '1rem',
          fontSize: '0.9em',
          color: 'var(--text-2)'
        }}>
          <p>
            {getTranslation(['schedule', 'note'], language)}
          </p>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            <li>{getTranslation(['schedule', 'noteWeather'], language)}</li>
            <li>{getTranslation(['schedule', 'noteResources'], language)}</li>
            <li>{getTranslation(['schedule', 'notePermits'], language)}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

interface ScheduleExportData {
  ID: string;
  Name: string;
  Description: string;
  Start: string;
  Finish: string;
}

interface ConsolidatedExportData {
  projectId: number;
  projectName: string;
  projectDate: string;
  projectLocation: string;
  buildingType: string;
  constructionMethod: string;
  totalArea: number;
  projectStartDate: string;
  projectEndDate: string;
  projectDuration: number;
  elementId: number;
  taloCode: string;
  taloCategory: string;
  taloSubcategory: string;
  elementName: string;
  quantity: number;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  overheadCost: number;
  totalCost: number;
  costPerUnit: number;
  laborHours: number;
  costPerArea: number;
  materialCostPercent: string;
  laborCostPercent: string;
  equipmentCostPercent: string;
  overheadCostPercent: string;
  projectTotalCost: number;
  projectCostPerSquareMeter: string | number;
  projectLaborCostRatio: string;
  projectMaterialCostRatio: string;
  projectEquipmentCostRatio: string;
}

interface IfcTaskResources {
    labor: {
        count: number;
        cost: number;
        hours: number;
        type: string;
    };
    equipment: {
        count: number;
        cost: number;
        type: string;
    };
    materials: {
        cost: number;
        type: string;
    };
}

interface IfcTaskRelations {
    relatedElements: {
        elementId: string;
        ifcType: string;
        taloCode: string;
    }[];
    predecessors: string[];
    successors: string[];
}

interface IfcTaskCosts {
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    overheadCost: number;
    totalCost: number;
    costPerDay: number;
}

interface IfcTaskMetrics {
    progress: number;
    duration: number;
    criticalPath: boolean;
    riskLevel: string;
    productivity: number;
    efficiency: number;
}

interface EnhancedScheduleExportData {
    // Datos básicos
    ID: string;
    Name: string;
    Description: string;
    Start: string;
    Finish: string;
    
    // Recursos
    LaborCount: number;
    LaborCost: number;
    LaborHours: number;
    EquipmentCount: number;
    EquipmentCost: number;
    MaterialCost: number;
    
    // Relaciones
    RelatedElements: string;
    Predecessors: string;
    Successors: string;
    
    // Costos
    TotalCost: number;
    CostPerDay: number;
    OverheadCost: number;
    
    // Métricas
    Duration: number;
    IsCriticalPath: boolean;
    RiskLevel: string;
    Productivity: number;
    
    // Metadata del proyecto
    ProjectArea: number;
    BuildingType: string;
    Location: string;
    ConstructionMethod: string;
    
    // Información Talo
    TaloCodes: string;
    ElementTypes: string;
    
    // Notas y documentación
    Notes: string;
    References: string;
}

interface IfcScheduleData {
    // Datos IFC básicos
    GlobalId: string;
    Name: string;
    Description: string;
    ObjectType: string;
    Identification: string;
    
    // Jerarquía y relaciones
    children?: IfcScheduleData[];
    parentId?: string;
    relatedElements: {
        GlobalId: string;
        Name: string;
        ObjectType: string;
        TaloCode: string;
        PropertySets: {
            name: string;
            properties: {
                name: string;
                value: string | number;
                unit?: string;
            }[];
        }[];
    }[];
    
    // Tiempos
    CreationDate: string;
    StartTime: string;
    FinishTime: string;
    Duration: number;
    WorkingTime: number;
    
    // Recursos y costos
    Resources: {
        Labor: {
            Count: number;
            Cost: number;
            Hours: number;
            Type: string;
            UnitCost: number;
        };
        Equipment: {
            Count: number;
            Cost: number;
            Type: string;
            UnitCost: number;
        };
        Material: {
            Cost: number;
            Type: string;
            Quantity: number;
            UnitCost: number;
        };
    };
    
    // Control y estado
    Status: string;
    Priority: number;
    Completion: number;
    IsMilestone: boolean;
    IsCritical: boolean;
    
    // Metadatos del proyecto
    ProjectProperties: {
        BuildingType: string;
        Location: string;
        ConstructionMethod: string;
        TotalArea: number;
        ExpectedDuration: number;
    };
}

const createHierarchicalSchedule = (
    phases: ConstructionPhase[], 
    costData: BaseCostElement[],
    projectInfo: BaseProjectInfo | null
): IfcScheduleData[] => {
    return phases.map((phase, index) => {
        // Calcular duración y costos
        const duration = Math.ceil((phase.endDate.getTime() - phase.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const laborCost = phase.resources.labor * 45 * duration * 8; // 45€/hora, 8 horas/día
        const equipmentCost = phase.resources.equipment * 100 * duration; // 100€/día
        
        // Encontrar elementos relacionados
        const relatedElements = costData
            .filter(element => {
                const elementType = element.type.toLowerCase();
                const phaseMatch = phase.name.toLowerCase();
                return elementType.includes(phaseMatch) || phaseMatch.includes(elementType);
            })
            .map(element => ({
                GlobalId: crypto.randomUUID(),
                Name: element.name,
                ObjectType: element.type,
                TaloCode: element.taloCode,
                PropertySets: [
                    {
                        name: "CostProperties",
                        properties: [
                            { name: "MaterialCost", value: element.costs.material, unit: "EUR" },
                            { name: "LaborCost", value: element.costs.labor, unit: "EUR" },
                            { name: "EquipmentCost", value: element.costs.equipment, unit: "EUR" }
                        ]
                    },
                    {
                        name: "Quantities",
                        properties: [
                            { name: "Quantity", value: element.quantity, unit: "m2" }
                        ]
                    }
                ]
            }));

        // Crear la estructura de datos IFC
        const ifcScheduleData: IfcScheduleData = {
            GlobalId: crypto.randomUUID(),
            Name: phase.name,
            Description: `Construction phase: ${phase.name}`,
            ObjectType: "TASK",
            Identification: `PHASE_${index + 1}`,
            
            relatedElements,
            
            CreationDate: new Date().toISOString(),
            StartTime: phase.startDate.toISOString(),
            FinishTime: phase.endDate.toISOString(),
            Duration: duration,
            WorkingTime: duration * 8, // 8 horas por día
            
            Resources: {
                Labor: {
                    Count: phase.resources.labor,
                    Cost: laborCost,
                    Hours: phase.resources.labor * duration * 8,
                    Type: "GENERAL_LABOR",
                    UnitCost: 45
                },
                Equipment: {
                    Count: phase.resources.equipment,
                    Cost: equipmentCost,
                    Type: "CONSTRUCTION_EQUIPMENT",
                    UnitCost: 100
                },
                Material: {
                    Cost: laborCost * 0.4, // Estimado como 40% del costo laboral
                    Type: "CONSTRUCTION_MATERIAL",
                    Quantity: 1,
                    UnitCost: laborCost * 0.4
                }
            },
            
            Status: "SCHEDULED",
            Priority: 1,
            Completion: 0,
            IsMilestone: false,
            IsCritical: Boolean(phase.isCritical),
            
            ProjectProperties: {
                BuildingType: (projectInfo?.type || "residential").toLowerCase(),
                Location: projectInfo?.location || "Helsinki",
                ConstructionMethod: projectInfo?.constructionMethod || "traditional",
                TotalArea: projectInfo?.area || 0,
                ExpectedDuration: duration
            }
        };

        return ifcScheduleData;
    });
};

// Función para descargar archivo
const downloadFile = (content: string, fileName: string, contentType: string): void => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

const IFCTaskExportComponent = ({ 
  costData, 
  projectInfo, 
  constructionSchedule, 
  language 
}: { 
  costData: BaseCostElement[];
  projectInfo: BaseProjectInfo | null;
  constructionSchedule: ConstructionSchedule | null;
  language: Language;
}) => {
  const [isExporting, setIsExporting] = React.useState(false);
  const { isAuthenticated } = useAuthStore();

  const handleExport = () => {
    if (!isAuthenticated) {
      alert('Authentication required to export IFC task data. Please sign in to access this feature.');
      return;
    }
    
    if (!costData || costData.length === 0) {
      alert('No cost data available for IFC task export');
      return;
    }

    setIsExporting(true);
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Preparar datos consolidados para Power BI
    const consolidatedData: ConsolidatedExportData[] = costData.map(element => ({
      projectId: 1,
      projectName: projectInfo?.name || "Unnamed Project",
      projectDate: currentDate,
      projectLocation: projectInfo?.location || "Helsinki",
      buildingType: projectInfo?.buildingType || "residential",
      constructionMethod: projectInfo?.constructionMethod || "traditional",
      totalArea: projectInfo?.area || 0,
      projectStartDate: constructionSchedule?.startDate.toISOString() || "",
      projectEndDate: constructionSchedule?.endDate.toISOString() || "",
      projectDuration: constructionSchedule?.totalDuration || 0,
      elementId: element.id,
      taloCode: element.taloCode,
      taloCategory: element.taloCode.split('.')[0],
      taloSubcategory: element.taloCode.split('.').slice(0, 2).join('.'),
      elementName: element.name,
      quantity: element.quantity,
      materialCost: element.costs.material,
      laborCost: element.costs.labor,
      equipmentCost: element.costs.equipment,
      overheadCost: element.costs.overhead,
      totalCost: element.costs.total,
      costPerUnit: element.costs.total / element.quantity,
      laborHours: element.costs.labor / 45,
      costPerArea: element.costs.total / (projectInfo?.area || 1),
      materialCostPercent: (element.costs.material / element.costs.total * 100).toFixed(2),
      laborCostPercent: (element.costs.labor / element.costs.total * 100).toFixed(2),
      equipmentCostPercent: (element.costs.equipment / element.costs.total * 100).toFixed(2),
      overheadCostPercent: (element.costs.overhead / element.costs.total * 100).toFixed(2),
      projectTotalCost: costData.reduce((sum, el) => sum + el.costs.total, 0),
      projectCostPerSquareMeter: projectInfo?.area ? (costData.reduce((sum, el) => sum + el.costs.total, 0) / projectInfo.area).toFixed(2) : 0,
      projectLaborCostRatio: (costData.reduce((sum, el) => sum + el.costs.labor, 0) / costData.reduce((sum, el) => sum + el.costs.total, 0) * 100).toFixed(2),
      projectMaterialCostRatio: (costData.reduce((sum, el) => sum + el.costs.material, 0) / costData.reduce((sum, el) => sum + el.costs.total, 0) * 100).toFixed(2),
      projectEquipmentCostRatio: (costData.reduce((sum, el) => sum + el.costs.equipment, 0) / costData.reduce((sum, el) => sum + el.costs.total, 0) * 100).toFixed(2)
    }));

    // Crear estructura jerárquica para IFC
    const ifcScheduleData = createHierarchicalSchedule(
        constructionSchedule?.phases || [],
        costData,
        projectInfo
    );

    // Función para convertir a CSV
    const convertToCSV = (data: any[]): string => {
        if (data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' && value.includes(',') 
                        ? `"${value}"` 
                        : value;
                }).join(',')
            )
        ];
        return csvRows.join('\n');
    };

    try {
        // Exportar JSON para IFC
        downloadFile(
            JSON.stringify(ifcScheduleData, null, 2),
            `schedule-ifc-${currentDate}.json`,
            'application/json'
        );

        // Exportar CSV para Power BI
        downloadFile(
            convertToCSV(consolidatedData),
            `cost-analysis-powerbi-${currentDate}.csv`,
            'text/csv'
        );

        // Exportar CSV para IFC Task
        const ifcTaskData = ifcScheduleData.map(task => ({
            TaskID: task.GlobalId,
            TaskName: task.Name,
            TaskType: task.ObjectType,
            StartDate: task.StartTime,
            EndDate: task.FinishTime,
            Duration: task.Duration,
            WorkingHours: task.WorkingTime,
            Status: task.Status,
            Priority: task.Priority,
            IsCritical: task.IsCritical ? "Yes" : "No",
            LaborCount: task.Resources.Labor.Count,
            LaborCost: task.Resources.Labor.Cost,
            EquipmentCount: task.Resources.Equipment.Count,
            EquipmentCost: task.Resources.Equipment.Cost,
            MaterialCost: task.Resources.Material.Cost,
            TotalCost: task.Resources.Labor.Cost + task.Resources.Equipment.Cost + task.Resources.Material.Cost,
            RelatedElements: task.relatedElements.map(el => el.GlobalId).join(';'),
            TaloCodes: task.relatedElements.map(el => el.TaloCode).join(';')
        }));

        downloadFile(
            convertToCSV(ifcTaskData),
            `ifc-task-schedule-${currentDate}.csv`,
            'text/csv'
        );

        alert('Files exported successfully:\n- JSON format (for IFC conversion)\n- CSV format (for Power BI)\n- CSV format (for IFC Task)');
    } catch (error) {
        console.error('Error exporting files:', error);
        alert('Error exporting files. Please try again.');
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3>
          <span className="material-icons-round" style={{ marginRight: '8px' }}>schedule</span>
          {getTranslation(['export', 'ifcTaskTitle'], language)}
        </h3>
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ 
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--surface-2)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <h4 style={{ 
            margin: '0 0 0.75rem 0', 
            color: 'var(--text-1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span className="material-icons-round" style={{ fontSize: '20px', color: 'var(--primary)' }}>
              info
            </span>
            {getTranslation(['export', 'ifcTaskDescription'], language)}
          </h4>
          <p style={{ 
            margin: '0 0 1rem 0', 
            color: 'var(--text-2)',
            lineHeight: '1.5',
            fontSize: '0.95em'
          }}>
            {getTranslation(['export', 'ifcTaskDetails'], language)}
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              padding: '0.75rem',
              backgroundColor: 'var(--surface-1)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginBottom: '4px',
                color: 'var(--primary)',
                fontSize: '0.9em',
                fontWeight: '500'
              }}>
                <span className="material-icons-round" style={{ fontSize: '16px' }}>code</span>
                JSON Format
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-2)' }}>
                IFC-compatible schedule data for BIM integration
              </div>
            </div>
            
            <div style={{
              padding: '0.75rem',
              backgroundColor: 'var(--surface-1)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginBottom: '4px',
                color: 'var(--primary)',
                fontSize: '0.9em',
                fontWeight: '500'
              }}>
                <span className="material-icons-round" style={{ fontSize: '16px' }}>analytics</span>
                Power BI CSV
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-2)' }}>
                Consolidated data for business intelligence analysis
              </div>
            </div>
            
            <div style={{
              padding: '0.75rem',
              backgroundColor: 'var(--surface-1)',
              borderRadius: '6px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginBottom: '4px',
                color: 'var(--primary)',
                fontSize: '0.9em',
                fontWeight: '500'
              }}>
                <span className="material-icons-round" style={{ fontSize: '16px' }}>assignment</span>
                IFC Task CSV
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-2)' }}>
                Detailed task schedule with resource allocation
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '0.75rem',
            fontSize: '0.85em'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--success)' }}>check_circle</span>
              <span>{costData.length} cost elements</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--success)' }}>check_circle</span>
              <span>{constructionSchedule?.phases.length || 0} construction phases</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--success)' }}>check_circle</span>
              <span>Finnish TALO 2000 codes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--success)' }}>check_circle</span>
              <span>Resource allocation data</span>
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--surface-1)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div>
            <div style={{ 
              fontSize: '0.9em', 
              color: 'var(--text-1)', 
              marginBottom: '4px',
              fontWeight: '500'
            }}>
              {getTranslation(['export', 'readyToExport'], language)}
            </div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-2)' }}>
              {getTranslation(['export', 'exportDescription'], language)}
            </div>
          </div>
          
          <button 
            className="button-primary tooltip-enhanced"
            onClick={handleExport}
            disabled={isExporting || !costData || costData.length === 0 || !isAuthenticated}
            data-tooltip={!isAuthenticated ? "Authentication required to export IFC task data. Please sign in to access this feature." : "Export IFC task schedule data in multiple formats for BIM integration and project management"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              fontSize: '0.95em',
              minWidth: '180px',
              justifyContent: 'center',
              alignSelf: 'flex-start',
              opacity: !isAuthenticated ? 0.6 : 1,
              cursor: !isAuthenticated ? 'not-allowed' : 'pointer'
            }}
          >
            <span className="material-icons-round">
              {isExporting ? 'hourglass_empty' : !isAuthenticated ? 'lock' : 'download'}
            </span>
            {isExporting ? 'Exporting...' : !isAuthenticated ? 'Login Required' : getTranslation(['export', 'exportButton'], language)}
          </button>
        </div>
      </div>
    </div>
  );
};

export function CostPage(props: Props) {
  const { 
    language, 
    setLanguage, 
    costData, 
    setCostData, 
    analysisResult, 
    setAnalysisResult,
    projectInfo,
    setProjectInfo 
  } = useCostStore();
  const [isLoading, setIsLoading] = React.useState(true);
  const [editedElements, setEditedElements] = React.useState<{[key: number]: BaseCostElement}>({});
  const [costSummary, setCostSummary] = React.useState({
    totalMaterial: 0,
    totalLabor: 0,
    totalEquipment: 0,
    totalOverhead: 0,
    grandTotal: 0
  });
  const [costFactors, setCostFactors] = React.useState<CostFactors>(DEFAULT_COST_FACTORS);
  const [buildingType, setBuildingType] = React.useState('residential');
  const [constructionMethod, setConstructionMethod] = React.useState('traditional');
  const [constructionSchedule, setConstructionSchedule] = React.useState<ConstructionSchedule | null>(null);
  const [startDate, setStartDate] = React.useState<Date>(new Date());
  // Manual classification state
  const [selectedElementId, setSelectedElementId] = React.useState<number | null>(null);
  const [selectedTaloCode, setSelectedTaloCode] = React.useState<string>('');
  const [selectedRTKey, setSelectedRTKey] = React.useState<string>('');

  // Type→TALO fallback (aligned with exporters)
  const typeToTaloMap: { [key: string]: string } = {
    'IfcWall': '1.3.1',
    'IfcSlab': '1.2.4',
    'IfcColumn': '1.2.3',
    'IfcBeam': '1.2.3',
    'IfcWindow': '1.3.1',
    'IfcDoor': '1.3.1',
    'IfcFurniture': '1.3.4',
    'IfcSanitaryTerminal': '2.1',
    'IfcFlowTerminal': '2.1',
    'IfcDistributionFlowElement': '2.2',
    'IfcBuildingElementProxy': '1.3.1',
    'IfcElectricAppliance': '2.4',
    'IfcCovering': '1.3.3',
    'IfcCommunicationsAppliance': '2.4',
    'IfcPipeSegment': '2.2',
    'IfcDuctSegment': '2.2',
    'IfcCableSegment': '2.4',
    'IfcRailing': '1.3.4',
    'IfcRoof': '1.2.6',
    'IfcSite': '1.1',
    'IfcFooting': '1.2.1'
  };

  const getTaloSuggestions = (el: BaseCostElement): string[] => {
    const suggestions: string[] = [];
    if (el.taloCode) suggestions.push(el.taloCode);
    const mapped = Object.entries(typeToTaloMap).find(([k]) => el.type.toLowerCase().includes(k.toLowerCase()));
    if (mapped && !suggestions.includes(mapped[1])) suggestions.push(mapped[1]);
    // From RT DB by ifc type/name
    const nameLower = (el.name || '').toLowerCase();
    const rtCandidates = Object.entries(UNIFIED_RT_DATABASE).filter(([key, rt]: any) => {
      const okType = rt.applicableIfcTypes?.some((t: string) => t.toLowerCase() === el.type.toLowerCase());
      const okName = rt.applicableNames?.some((p: string) => nameLower.includes(p.toLowerCase()));
      return okType || okName;
    }).map(([_, rt]: any) => rt.talo2000?.code).filter(Boolean);
    for (const code of rtCandidates) {
      if (!suggestions.includes(code)) suggestions.push(code);
    }
    return suggestions.slice(0, 5);
  };

  const getRTSuggestions = (el: BaseCostElement, taloCode: string): Array<{ key: string; label: string; unit?: string }> => {
    const items: Array<{ key: string; label: string; unit?: string }> = [];
    // Exact by TALO code
    for (const [key, rt]: any of Object.entries(UNIFIED_RT_DATABASE)) {
      if (rt.talo2000?.code === taloCode) {
        items.push({ key, label: `${key} (${rt.code || ''})`, unit: rt.measurementUnit });
      }
    }
    // By IFC type / name
    const nameLower = (el.name || '').toLowerCase();
    for (const [key, rt]: any of Object.entries(UNIFIED_RT_DATABASE)) {
      const okType = rt.applicableIfcTypes?.some((t: string) => t.toLowerCase() === el.type.toLowerCase());
      const okName = rt.applicableNames?.some((p: string) => nameLower.includes(p.toLowerCase()));
      if ((okType || okName) && !items.find(i => i.key === key)) {
        items.push({ key, label: `${key} (${rt.code || ''})`, unit: rt.measurementUnit });
      }
    }
    return items.slice(0, 7);
  };

  const applyManualClassification = (applyToAllOfType: boolean = false) => {
    if (!selectedElementId) return;
    const el = costData.find(e => e.id === selectedElementId);
    if (!el) return;
    const rtDetails = selectedRTKey ? (UNIFIED_RT_DATABASE as any)[selectedRTKey] : undefined;
    const taloCode = selectedTaloCode || el.taloCode || (typeToTaloMap[el.type] ?? '');
    if (!taloCode) return;

    const updated = costData.map(e => {
      const target = applyToAllOfType ? (e.type === el.type) : (e.id === el.id);
      if (!target) return e;
      const unit = getCorrectUnit(e.type, taloCode, rtDetails);
      const qty = getCorrectQuantity(e as any, unit) ?? 0;
      return {
        ...e,
        taloCode,
        taloName: e.taloName,
        baseQuantities: e.baseQuantities || {},
        quantity: Number(qty),
        // Keep existing costs; cost services may re-evaluate elsewhere
      };
    });
    setCostData(updated);
    setSelectedRTKey('');
  };

  const exportCostListToExcel = () => {
    if (!costData || costData.length === 0) return;

    const headers = [
      'ID',
      'IFC Type',
      'Name',
      'TALO Code',
      'Unit',
      'Quantity',
      'Material (€)',
      'Labor (€)',
      'Equipment (€)',
      'Overhead (€)',
      'Total (€)'
    ];

    const unitToLabel = (unit: Talo2000Unit) => {
      switch(unit) {
        case Talo2000Unit.CUBIC_METERS: return 'm³';
        case Talo2000Unit.SQUARE_METERS: return 'm²';
        case Talo2000Unit.METERS: return 'm';
        case Talo2000Unit.PIECES: return 'kpl';
        case Talo2000Unit.KILOGRAMS: return 'kg';
        default: return '-';
      }
    };

    const rows = costData.map((el) => {
      const unit = getCorrectUnit(el.type, el.taloCode, (el as any).rtDetails);
      const qty = getCorrectQuantity(el, unit);
      return [
        el.id,
        el.type,
        el.name,
        el.taloCode || '-',
        unitToLabel(unit),
        Number(qty ?? 0),
        Number(el.costs.material || 0),
        Number(el.costs.labor || 0),
        Number(el.costs.equipment || 0),
        Number(el.costs.overhead || 0),
        Number(el.costs.total || 0)
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Cost_List');

    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, '0');
    const d = String(ts.getDate()).padStart(2, '0');
    const filename = `cost-list-${y}${m}${d}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  React.useEffect(() => {
    if (costData && costData.length > 0) {
      // Calculate cost summary
      const summary = costData.reduce((acc, element) => {
        acc.totalMaterial += element.costs.material;
        acc.totalLabor += element.costs.labor;
        acc.totalEquipment += element.costs.equipment;
        acc.totalOverhead += element.costs.overhead;
        acc.grandTotal += element.costs.total;
        return acc;
      }, {
        totalMaterial: 0,
        totalLabor: 0,
        totalEquipment: 0,
        totalOverhead: 0,
        grandTotal: 0
      });

      setCostSummary(summary);

      // Calculate construction schedule
      if (projectInfo) {
        const timeService = TimeAnalysisService.getInstance();
        const schedule = timeService.calculateConstructionSchedule(
          costData,
          projectInfo.buildingType || 'residential',
          projectInfo.area || 0,
          projectInfo.constructionMethod || 'traditional',
          startDate
        );
        setConstructionSchedule(schedule);
      }

      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [costData, projectInfo, startDate]);

  const handleCostEdit = (elementId: number, costType: keyof BaseCostElement['costs'], value: number) => {
    const element = costData.find(el => el.id === elementId);
    if (!element) return;

    const updatedElement = {
      ...element,
      costs: {
        ...element.costs,
        [costType]: value
      }
    };

    setEditedElements({
      ...editedElements,
      [elementId]: updatedElement
    });
  };

  const handleRecalculate = () => {
    const updatedElements = costData.map(element => {
      if (editedElements[element.id]) {
        const editedElement = editedElements[element.id];
        return {
          ...editedElement,
          costs: {
            ...editedElement.costs,
            total: editedElement.costs.material + 
                   editedElement.costs.labor + 
                   editedElement.costs.equipment + 
                   editedElement.costs.overhead
          }
        };
      }
      return element;
    });

    setCostData(updatedElements);
    setEditedElements({});
  };



  const calculateCategoryTotal = (category: string): number => {
    return costData
      .filter(element => element.taloCode.startsWith(category.substring(0, 1)))
      .reduce((sum, element) => sum + element.costs.total, 0);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!costData || costData.length === 0) {
    return <EmptyState language={language} />;
  }

  return (
    <div className="page">
      <header style={{ 
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          margin: 0,
          fontSize: '1.5rem'
        }}>
          <span className="material-icons-round">euro</span>
          {getTranslation(['pageTitle'], language)}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {costData && costData.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--success)'
            }}>
              <span className="material-icons-round" style={{ fontSize: '14px' }}>check_circle</span>
              Data Active
            </div>
          )}
          <DatabaseInfo />
          <LanguageSelector language={language} setLanguage={setLanguage} />
          <button
            className="button-primary"
            onClick={exportCostListToExcel}
            disabled={!costData || costData.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-icons-round">table_view</span>
            Export Cost List (Excel)
          </button>
        </div>
      </header>
      <div className="main-page-content">
        <div className="project-sidebar">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>{getTranslation(['projectInfo', 'title'], language)}</h3>
            </div>
            <div style={{
              padding: '1.5rem',
              display: 'grid',
              gap: '1.25rem',
              backgroundColor: 'var(--surface-1)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '185px 15% 1fr',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <label style={{ 
                  color: 'var(--text-2)',
                  fontSize: '0.95rem'
                }}>{getTranslation(['projectInfo', 'name'], language)}:</label>
                <span style={{
                  color: 'var(--text-1)',
                  fontSize: '0.95rem'
                }}>
                  {projectInfo?.name || 'Unnamed Project'}
                </span>
                <span></span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '185px 15% 1fr',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <label style={{ 
                  color: 'var(--text-2)',
                  fontSize: '0.95rem'
                }}>{getTranslation(['projectInfo', 'area'], language)}:</label>
                <div style={{
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="number"
                    value={projectInfo?.area ?? 0}
                    onChange={(e) => {
                      const newArea = Number(e.target.value);
                      if (projectInfo && setProjectInfo) {
                        const updatedProjectInfo = {
                          ...projectInfo,
                          area: newArea
                        };
                        setProjectInfo(updatedProjectInfo);
                        
                        // Recalcular costos cuando cambia el área
                        if (costData && costData.length > 0) {
                          const timeService = TimeAnalysisService.getInstance();
                          const newSchedule = timeService.calculateConstructionSchedule(
                            costData,
                            updatedProjectInfo.buildingType || 'residential',
                            newArea,
                            updatedProjectInfo.constructionMethod || 'traditional',
                            startDate
                          );
                          setConstructionSchedule(newSchedule);
                        }
                      }
                    }}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#2A2A2A',
                      border: '1px solid #404040',
                      borderRadius: '4px',
                      color: 'var(--text-1)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                </div>
                <span style={{ 
                  paddingLeft: '0.75rem',
                  color: 'var(--text-2)',
                  fontSize: '0.95rem'
                }}>m²</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '185px 15% 1fr',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <label style={{ 
                  color: 'var(--text-2)',
                  fontSize: '0.95rem'
                }}>{getTranslation(['projectInfo', 'location'], language)}:</label>
                <select
                  value={projectInfo?.location ?? 'Helsinki'}
                  onChange={(e) => {
                    if (projectInfo && setProjectInfo) {
                      const updatedProjectInfo = {
                        ...projectInfo,
                        location: e.target.value
                      };
                      setProjectInfo(updatedProjectInfo);
                      
                      console.log('[COST] Location changed:', {
                        oldLocation: projectInfo.location,
                        newLocation: e.target.value,
                        updatedProjectInfo
                      });
                      
                      // Recalcular costos cuando cambia la ubicación (factores regionales)
                      if (costData && costData.length > 0) {
                        console.log('[COST] Recalculating costs for location change...');
                        // Aplicar factores regionales de costo
                        const locationKey = e.target.value.toLowerCase();
                        const regionalFactor = REGIONAL_FACTORS[locationKey] || 1.0;
                        
                        console.log('[COST] Regional factor calculation:', {
                          locationKey,
                          regionalFactor,
                          availableFactors: Object.keys(REGIONAL_FACTORS)
                        });
                        
                        const updatedCostData = costData.map(element => ({
                          ...element,
                          costs: {
                            material: element.costs.material * regionalFactor,
                            labor: element.costs.labor * regionalFactor,
                            equipment: element.costs.equipment * regionalFactor,
                            overhead: element.costs.overhead * regionalFactor,
                            total: element.costs.total * regionalFactor
                          }
                        }));
                        
                        console.log('[COST] Cost data updated with regional factor:', {
                          originalTotal: costData.reduce((sum, el) => sum + el.costs.total, 0),
                          updatedTotal: updatedCostData.reduce((sum, el) => sum + el.costs.total, 0),
                          factor: regionalFactor
                        });
                        
                        setCostData(updatedCostData);
                      } else {
                        console.log('[COST] No cost data available for location recalculation');
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#2A2A2A',
                    border: '1px solid #404040',
                    borderRadius: '4px',
                    color: 'var(--text-1)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="Helsinki">Helsinki</option>
                  <option value="Tampere">Tampere</option>
                  <option value="Oulu">Oulu</option>
                </select>
                <span></span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '185px 15% 1fr',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <label style={{ 
                  color: 'var(--text-2)',
                  fontSize: '0.95rem'
                }}>{getTranslation(['projectInfo', 'buildingType'], language)}:</label>
                <select
                  value={projectInfo?.buildingType ?? 'Residential'}
                  onChange={(e) => {
                    if (projectInfo && setProjectInfo) {
                      const updatedProjectInfo = {
                        ...projectInfo,
                        buildingType: e.target.value
                      };
                      setProjectInfo(updatedProjectInfo);
                      
                      // Recalcular costos cuando cambia el tipo de edificio
                      if (costData && costData.length > 0) {
                        const buildingTypeFactor = DEFAULT_COST_FACTORS.buildingType[e.target.value.toLowerCase()] || 1.0;
                        const updatedCostData = costData.map(element => ({
                          ...element,
                          costs: {
                            material: element.costs.material * buildingTypeFactor,
                            labor: element.costs.labor * buildingTypeFactor,
                            equipment: element.costs.equipment * buildingTypeFactor,
                            overhead: element.costs.overhead * buildingTypeFactor,
                            total: element.costs.total * buildingTypeFactor
                          }
                        }));
                        setCostData(updatedCostData);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#2A2A2A',
                    border: '1px solid #404040',
                    borderRadius: '4px',
                    color: 'var(--text-1)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="Residential">{getTranslation(['buildingTypes', 'residential'], language)}</option>
                  <option value="Office">{getTranslation(['buildingTypes', 'office'], language)}</option>
                  <option value="Commercial">{getTranslation(['buildingTypes', 'commercial'], language)}</option>
                </select>
                <span></span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '185px 15% 1fr',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <label style={{ 
                  color: 'var(--text-2)',
                  fontSize: '0.95rem'
                }}>{getTranslation(['projectInfo', 'constructionMethod'], language)}:</label>
                <select
                  value={projectInfo?.constructionMethod ?? 'OnSite'}
                  onChange={(e) => {
                    if (projectInfo && setProjectInfo) {
                      const updatedProjectInfo = {
                        ...projectInfo,
                        constructionMethod: e.target.value
                      };
                      setProjectInfo(updatedProjectInfo);
                      
                      // Recalcular costos cuando cambia el método de construcción
                      if (costData && costData.length > 0) {
                        const methodFactor = DEFAULT_COST_FACTORS.constructionMethod[e.target.value.toLowerCase()] || 1.0;
                        const updatedCostData = costData.map(element => ({
                          ...element,
                          costs: {
                            material: element.costs.material * methodFactor,
                            labor: element.costs.labor * methodFactor,
                            equipment: element.costs.equipment * methodFactor,
                            overhead: element.costs.overhead * methodFactor,
                            total: element.costs.total * methodFactor
                          }
                        }));
                        setCostData(updatedCostData);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#2A2A2A',
                    border: '1px solid #404040',
                    borderRadius: '4px',
                    color: 'var(--text-1)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '16px'
                  }}
                >
                  <option value="OnSite">{getTranslation(['constructionMethods', 'onSite'], language)}</option>
                  <option value="Prefabricated">{getTranslation(['constructionMethods', 'prefabricated'], language)}</option>
                </select>
                <span></span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '185px 15% 1fr',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <label style={{ 
                  color: 'var(--text-2)',
                  fontSize: '0.95rem'
                }}>{getTranslation(['schedule', 'startDate'], language)}:</label>
                <div style={{
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="date"
                    value={startDate.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(new Date(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#2A2A2A',
                      border: '1px solid #404040',
                      borderRadius: '4px',
                      color: 'var(--text-1)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                </div>
                <span></span>
              </div>
            </div>
          </div>
        </div>
        <div className="content-area">
          {/* Manual Classification Assistant */}
          <div className="dashboard-card" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3>Manual TALO/RT Assignment</h3>
            </div>
            <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Element</label>
                  <select
                    value={selectedElementId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedElementId(isNaN(id) ? null : id);
                      setSelectedTaloCode('');
                      setSelectedRTKey('');
                    }}
                    style={{ width: '100%', padding: '8px 12px', background: '#2A2A2A', border: '1px solid #404040', borderRadius: 4, color: 'var(--text-1)' }}
                  >
                    <option value="">Select element…</option>
                    {costData.map(e => (
                      <option key={e.id} value={e.id}>{`${e.type} • ${e.name}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Suggested TALO</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedElementId && getTaloSuggestions(costData.find(e => e.id === selectedElementId) as BaseCostElement).map(code => (
                      <button key={code} className="button-secondary" onClick={() => setSelectedTaloCode(code)} style={{ padding: '6px 10px' }}>{code}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>TALO code</label>
                  <input
                    type="text"
                    value={selectedTaloCode}
                    onChange={(e) => setSelectedTaloCode(e.target.value)}
                    placeholder="e.g., 1.2.3.2"
                    style={{ width: '100%', padding: '8px 12px', background: '#2A2A2A', border: '1px solid #404040', borderRadius: 4, color: 'var(--text-1)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>RT-kortti (suggested)</label>
                  <select
                    value={selectedRTKey}
                    onChange={(e) => setSelectedRTKey(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: '#2A2A2A', border: '1px solid #404040', borderRadius: 4, color: 'var(--text-1)' }}
                  >
                    <option value="">None</option>
                    {selectedElementId && selectedTaloCode && getRTSuggestions(costData.find(e => e.id === selectedElementId) as BaseCostElement, selectedTaloCode).map(rt => (
                      <option key={rt.key} value={rt.key}>{rt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="button-primary" disabled={!selectedElementId || !selectedTaloCode} onClick={() => applyManualClassification(false)}>
                  Apply to element
                </button>
                <button className="button-secondary" disabled={!selectedElementId || !selectedTaloCode} onClick={() => applyManualClassification(true)}>
                  Apply to all of same IFC type
                </button>
              </div>
            </div>
          </div>
          <CostTable 
            data={costData} 
            language={language}
            onEdit={handleCostEdit}
            setCostData={setCostData}
          />
          <div className="actions-container" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
            <button 
              className="button-primary"
              onClick={handleRecalculate}
              disabled={Object.keys(editedElements).length === 0}
            >
              <span className="material-icons-round">calculate</span>
              {getTranslation(['actions', 'calculate'], language)}
            </button>
          </div>
          <CostSummaryCard summary={costSummary} language={language} />
          <CostAnalysisSection 
            costSummary={costSummary}
            analysisResult={analysisResult}
            projectArea={projectInfo?.area ?? 0}
            language={language}
            elements={costData}
          />
          <CostComparisonChart 
            costSummary={costSummary}
            projectInfo={projectInfo as ProjectInfo | null}
            language={language}
          />
          {constructionSchedule && (
            <ConstructionSchedule 
              schedule={constructionSchedule}
              language={language}
            />
          )}
          {/* Enhanced BOQ Export Section */}
          <EnhancedBOQExportComponent 
            costData={costData}
            projectInfo={projectInfo}
            onExport={(filename, format) => {
              console.log(`Enhanced BOQ exported: ${filename} (${format})`);
            }}
          />
          
          {/* Legacy BOQ Export Section (for comparison) */}
          <div style={{ marginTop: '2rem', opacity: 0.7 }}>
            <details>
              <summary style={{ cursor: 'pointer', fontSize: '0.9em', color: 'var(--text-2)' }}>
                Legacy BOQ Export (Basic Version)
              </summary>
              <BOQExportComponent 
                costData={costData}
                projectInfo={projectInfo}
                onExport={(filename, format) => {
                  console.log(`Legacy BOQ exported: ${filename} (${format})`);
                }}
              />
            </details>
          </div>

          {/* IFC Task Export Section */}
          <IFCTaskExportComponent
            costData={costData}
            projectInfo={projectInfo as ProjectInfo | null}
            constructionSchedule={constructionSchedule}
            language={language}
          />
        </div>
      </div>
    </div>
  );
} 