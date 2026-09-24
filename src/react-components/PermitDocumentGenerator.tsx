import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FinnishPermitDocumentService, FinnishPermitDocument, DocumentTemplate } from '../services/FinnishPermitDocumentService';
import { useSijaintikarttaStore } from '../stores/SijaintikarttaStore';
import { useAuthStore } from '../stores/AuthStore';

interface PermitDocumentGeneratorProps {
  buildingData: any;
  cadastralInfo: any;
  permitRequirements: any;
}

const PermitDocumentGenerator: React.FC<PermitDocumentGeneratorProps> = ({
  buildingData,
  cadastralInfo,
  permitRequirements
}) => {
  const [documentService] = useState(() => FinnishPermitDocumentService.getInstance());
  const [availableTemplates, setAvailableTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [documentOptions, setDocumentOptions] = useState({
    language: 'fi' as 'fi' | 'en' | 'sv'
  });
  const [generatedDocument, setGeneratedDocument] = useState<FinnishPermitDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { sijaintikarttaData } = useSijaintikarttaStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Cargar plantillas disponibles
    const templates = documentService.getAvailableTemplates();
    setAvailableTemplates(templates);
    if (templates.length > 0) {
      setSelectedTemplate(templates[0].id);
    }
  }, [documentService]);

  const handleGenerateDocument = async () => {
    if (!isAuthenticated) {
      alert('Authentication required to generate permit documents. Please sign in to access this feature.');
      return;
    }
    
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      console.log('[PermitDocumentGenerator] Generating document with options:', documentOptions);

      const document = await documentService.generatePermitDocument(
        buildingData,
        cadastralInfo,
        permitRequirements,
        { ...documentOptions, format: 'pdf' }
      );

      setGeneratedDocument(document);
      console.log('[PermitDocumentGenerator] Document generated successfully:', document);
    } catch (error) {
      console.error('[PermitDocumentGenerator] Error generating document:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!isAuthenticated) {
      alert('Authentication required to download permit documents. Please sign in to access this feature.');
      return;
    }
    
    if (!generatedDocument) return;

    setIsGenerating(true);
    try {
      console.log('[PermitDocumentGenerator] Downloading PDF document');

      const blob = await generatePDFDocument(generatedDocument);
      const filename = `permit_application_${generatedDocument.documentId}.pdf`;

      // Verificar que el blob no esté vacío
      if (blob.size === 0) {
        throw new Error('Generated PDF document is empty');
      }

      console.log('[PermitDocumentGenerator] Document blob size:', blob.size, 'bytes');

      // Descargar archivo
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('[PermitDocumentGenerator] Document downloaded successfully:', filename);
    } catch (error) {
      console.error('[PermitDocumentGenerator] Error downloading document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error downloading document: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Función para generar PDF usando jsPDF con texto directo y mapa
  const generatePDFDocument = async (permitDocument: FinnishPermitDocument): Promise<Blob> => {
    console.log('[PermitDocumentGenerator] Generating PDF document with direct text and map');
    
    try {
      // Crear PDF en formato A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configuración de página A4
      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const margin = 20; // mm
      const contentWidth = pageWidth - (2 * margin);
      let currentY = margin + 20; // Posición Y inicial

      // Configurar fuentes
      pdf.setFont('helvetica');
      
      // TÍTULO PRINCIPAL
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const title = getDocumentTitle(permitDocument);
      const titleWidth = pdf.getTextWidth(title);
      const titleX = (pageWidth - titleWidth) / 2;
      pdf.text(title, titleX, currentY);
      currentY += 15;

      // Información del documento
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Document ID: ${permitDocument.documentId}`, margin, currentY);
      currentY += 8;
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, currentY);
      currentY += 20;

      // INFORMACIÓN DEL PROYECTO
      currentY = addSection(pdf, 'Project Information', currentY, margin, contentWidth);
      currentY = addProjectInfo(pdf, permitDocument.projectInfo, currentY, margin, contentWidth);
      currentY += 10;



      // Verificar si necesitamos nueva página
      if (currentY > pageHeight - 100) {
        pdf.addPage();
        currentY = margin + 20;
      }

      // ESPECIFICACIONES DEL EDIFICIO
      currentY = addSection(pdf, 'Building Specifications', currentY, margin, contentWidth);
      currentY = addBuildingSpecs(pdf, permitDocument.buildingSpecifications, currentY, margin, contentWidth);
      currentY += 10;

      // Verificar si necesitamos nueva página
      if (currentY > pageHeight - 100) {
        pdf.addPage();
        currentY = margin + 20;
      }

      // INFORMACIÓN CATASTRAL
      currentY = addSection(pdf, 'Cadastral Information', currentY, margin, contentWidth);
      currentY = addCadastralInfo(pdf, permitDocument.cadastralInfo, currentY, margin, contentWidth);
      currentY += 10;

      // Verificar si necesitamos nueva página
      if (currentY > pageHeight - 100) {
        pdf.addPage();
        currentY = margin + 20;
      }

      // MAPA DEL PROYECTO (si está disponible)
      if (sijaintikarttaData?.mapScreenshot) {
        currentY = addSection(pdf, 'Project Location Map', currentY, margin, contentWidth);
        currentY = await addMapToPDF(pdf, sijaintikarttaData.mapScreenshot, currentY, margin, contentWidth);

        // Verificar si necesitamos nueva página
        if (currentY > pageHeight - 100) {
          pdf.addPage();
          currentY = margin + 20;
        }
      }

      // REQUISITOS DE PERMISOS
      currentY = addSection(pdf, 'Permit Requirements', currentY, margin, contentWidth);
      currentY = addPermitRequirements(pdf, permitDocument.permitRequirements, currentY, margin, contentWidth);
      currentY += 10;

      // Verificar si necesitamos nueva página
      if (currentY > pageHeight - 100) {
        pdf.addPage();
        currentY = margin + 20;
      }

      // CUMPLIMIENTO NORMATIVO FINLANDÉS
      currentY = addSection(pdf, 'Regulatory Compliance (Finnish Standards)', currentY, margin, contentWidth);
      currentY = addCompliance(pdf, permitDocument.compliance, currentY, margin, contentWidth);
      currentY += 10;

      // VALIDACIONES FINLANDESAS
      if (permitDocument.validationResults) {
        currentY = addSection(pdf, 'Finnish Building Standards Validation', currentY, margin, contentWidth);
        currentY = addFinnishValidations(pdf, permitDocument.validationResults, currentY, margin, contentWidth);
        currentY += 10;
      }

      // ESPECIFICACIONES TÉCNICAS FINLANDESAS
      if (permitDocument.finnishSpecific?.technicalSpecifications) {
        currentY = addSection(pdf, 'Technical Specifications (Finnish Standards)', currentY, margin, contentWidth);
        currentY = addFinnishTechnicalSpecs(pdf, permitDocument.finnishSpecific.technicalSpecifications, currentY, margin, contentWidth);
        currentY += 10;
      }

      // Verificar si necesitamos nueva página
      if (currentY > pageHeight - 100) {
        pdf.addPage();
        currentY = margin + 20;
      }

      // DOCUMENTOS REQUERIDOS
      currentY = addSection(pdf, 'Required Documents', currentY, margin, contentWidth);
      currentY = addRequiredDocuments(pdf, permitDocument.requiredDocuments, currentY, margin, contentWidth);
      currentY += 10;

      // Verificar si necesitamos nueva página
      if (currentY > pageHeight - 100) {
        pdf.addPage();
        currentY = margin + 20;
      }

      // RECOMENDACIONES
      if (permitDocument.recommendations.length > 0) {
        currentY = addSection(pdf, 'Recommendations', currentY, margin, contentWidth);
        currentY = addRecommendations(pdf, permitDocument.recommendations, currentY, margin, contentWidth);
      }

      // Convertir a blob
      const pdfBlob = pdf.output('blob');
      
      console.log('[PermitDocumentGenerator] PDF generated successfully, size:', pdfBlob.size, 'bytes');
      
      if (pdfBlob.size === 0) {
        throw new Error('Generated PDF is empty');
      }
      
      return pdfBlob;
    } catch (error) {
      console.error('[PermitDocumentGenerator] Error generating PDF:', error);
      throw error;
    }
  };

  // Funciones auxiliares para generar contenido
  const getDocumentTitle = (document: FinnishPermitDocument): string => {
    const titles = {
      'building_permit': {
        'fi': 'Rakennuslupahakemus',
        'en': 'Building Permit Application',
        'sv': 'Bygglovsansökan'
      },
      'construction_permit': {
        'fi': 'Rakennuslupahakemus',
        'en': 'Construction Permit Application',
        'sv': 'Bygglovsansökan'
      },
      'both': {
        'fi': 'Rakennus- ja yleiskaavaluvahakemus',
        'en': 'Building and Land Use Permit Application',
        'sv': 'Bygg- och stadsplanelovansökan'
      }
    };
    return titles[document.documentType]?.[document.language] || 'Permit Application';
  };

  const addSection = (pdf: jsPDF, title: string, currentY: number, margin: number, contentWidth: number): number => {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, currentY);
    currentY += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    return currentY;
  };

  const addProjectInfo = (pdf: jsPDF, projectInfo: any, currentY: number, margin: number, contentWidth: number): number => {
    const data: [string, string][] = [
      ['Project Name', projectInfo.name],
      ['Address', projectInfo.location.address],
      ['Municipality', projectInfo.location.municipality],
      ['Property ID', projectInfo.location.propertyId],
      ['Client', projectInfo.client],
      ['Architect', projectInfo.architect],
      ['Date', projectInfo.date]
    ];

    return addDataTable(pdf, data, currentY, margin, contentWidth);
  };

  const addBuildingSpecs = (pdf: jsPDF, specs: any, currentY: number, margin: number, contentWidth: number): number => {
    const data: [string, string][] = [
      ['Building Type', specs.type],
      ['Use Category', specs.use],
      ['Area', `${specs.area.toFixed(2)} m²`],
      ['Volume', `${specs.volume.toFixed(2)} m³`],
      ['Height', `${specs.height.toFixed(2)} m`],
      ['Floors', specs.floors.toString()],
      ['Energy Class', specs.energyClass],
      ['Construction Method', specs.constructionMethod]
    ];

    return addDataTable(pdf, data, currentY, margin, contentWidth);
  };

  const addCadastralInfo = (pdf: jsPDF, cadastral: any, currentY: number, margin: number, contentWidth: number): number => {
    const data: [string, string][] = [
      ['Property Number', cadastral.propertyNumber],
      ['Land Area', `${cadastral.landArea.toFixed(2)} m²`],
      ['Building Coverage', `${cadastral.buildingCoverage.toFixed(2)}%`],
      ['Zoning Code', cadastral.zoning.code],
      ['Zoning Name', cadastral.zoning.name],
      ['Building Rights', cadastral.zoning.buildingRights ? 'Yes' : 'No']
    ];

    return addDataTable(pdf, data, currentY, margin, contentWidth);
  };

  const addPermitRequirements = (pdf: jsPDF, requirements: any, currentY: number, margin: number, contentWidth: number): number => {
    const data: [string, string][] = [
      ['Permit Required', requirements.required ? 'Yes' : 'No'],
      ['Permit Type', requirements.type],
      ['Application Review', `${requirements.timeline.applicationReview} days`],
      ['Decision Time', `${requirements.timeline.decisionTime} days`],
      ['Total Process', `${requirements.timeline.totalProcess} days`],
      ['Application Fee', `€${requirements.costs.applicationFee.toFixed(2)}`],
      ['Processing Fee', `€${requirements.costs.processingFee.toFixed(2)}`],
      ['Total Estimated', `€${requirements.costs.totalEstimated.toFixed(2)}`]
    ];

    return addDataTable(pdf, data, currentY, margin, contentWidth);
  };

  const addCompliance = (pdf: jsPDF, compliance: any, currentY: number, margin: number, contentWidth: number): number => {
    const data: [string, string][] = [
      ['Building Code', compliance.buildingCode ? '✓ Compliant' : '✗ Non-compliant'],
      ['Zoning Regulations', compliance.zoningRegulations ? '✓ Compliant' : '✗ Non-compliant'],
      ['Energy Efficiency', compliance.energyEfficiency ? '✓ Compliant' : '✗ Non-compliant'],
      ['Accessibility', compliance.accessibility ? '✓ Compliant' : '✗ Non-compliant'],
      ['Fire Safety', compliance.fireSafety ? '✓ Compliant' : '✗ Non-compliant'],
      ['Environmental', compliance.environmental ? '✓ Compliant' : '✗ Non-compliant']
    ];

    return addDataTable(pdf, data, currentY, margin, contentWidth);
  };

  const addFinnishValidations = (pdf: jsPDF, validationResults: any, currentY: number, margin: number, contentWidth: number): number => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Mostrar errores de validación
    if (validationResults.validationErrors && validationResults.validationErrors.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 0, 0);
      pdf.text('Validation Errors:', margin, currentY);
      currentY += 8;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      validationResults.validationErrors.forEach((error: string) => {
        pdf.text(`• ${error}`, margin + 5, currentY);
        currentY += 5;
      });
      currentY += 5;
    }
    
    // Mostrar advertencias
    if (validationResults.validationWarnings && validationResults.validationWarnings.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 165, 0);
      pdf.text('Validation Warnings:', margin, currentY);
      currentY += 8;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      validationResults.validationWarnings.forEach((warning: string) => {
        pdf.text(`• ${warning}`, margin + 5, currentY);
        currentY += 5;
      });
      currentY += 5;
    }
    
    pdf.setTextColor(0, 0, 0);
    return currentY;
  };

  const addFinnishTechnicalSpecs = (pdf: jsPDF, technicalSpecs: any, currentY: number, margin: number, contentWidth: number): number => {
    const data: [string, string][] = [
      ['Building Code', technicalSpecs.buildingCode],
      ['Energy Class', technicalSpecs.energyClass],
      ['Fire Safety Class', technicalSpecs.fireSafetyClass],
      ['Accessibility Class', technicalSpecs.accessibilityClass],
      ['Structural Class', technicalSpecs.structuralClass],
      ['Foundation Type', technicalSpecs.foundationType],
      ['Heating System', technicalSpecs.heatingSystem],
      ['Ventilation System', technicalSpecs.ventilationSystem],
      ['Water Supply', technicalSpecs.waterSupply],
      ['Electrical System', technicalSpecs.electricalSystem]
    ];

    return addDataTable(pdf, data, currentY, margin, contentWidth);
  };

  const addRequiredDocuments = (pdf: jsPDF, documents: any, currentY: number, margin: number, contentWidth: number): number => {
    const data: [string, string][] = [
      ['Site Plan', documents.sitePlan ? 'Required' : 'Not Required'],
      ['Floor Plans', documents.floorPlans ? 'Required' : 'Not Required'],
      ['Sections', documents.sections ? 'Required' : 'Not Required'],
      ['Elevations', documents.elevations ? 'Required' : 'Not Required'],
      ['Structural Calculations', documents.structuralCalculations ? 'Required' : 'Not Required'],
      ['Energy Calculations', documents.energyCalculations ? 'Required' : 'Not Required'],
      ['Environmental Assessment', documents.environmentalAssessment ? 'Required' : 'Not Required'],
      ['Accessibility Assessment', documents.accessibilityAssessment ? 'Required' : 'Not Required'],
      ['Fire Safety Assessment', documents.fireSafetyAssessment ? 'Required' : 'Not Required']
    ];

    return addDataTable(pdf, data, currentY, margin, contentWidth);
  };

  const addRecommendations = (pdf: jsPDF, recommendations: string[], currentY: number, margin: number, contentWidth: number): number => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    recommendations.forEach((rec, index) => {
      if (currentY > 270) { // Nueva página si no hay espacio
        pdf.addPage();
        currentY = 40;
      }
      
      pdf.text(`${index + 1}. ${rec}`, margin, currentY);
      currentY += 6;
    });
    
    return currentY;
  };

  const addDataTable = (pdf: jsPDF, data: [string, string][], currentY: number, margin: number, contentWidth: number): number => {
    const labelWidth = contentWidth * 0.4;
    const valueWidth = contentWidth * 0.6;
    const lineHeight = 6;
    
    data.forEach(([label, value]) => {
      if (currentY > 270) { // Nueva página si no hay espacio
        pdf.addPage();
        currentY = 40;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, margin, currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, margin + labelWidth, currentY);
      currentY += lineHeight;
    });
    
    return currentY;
  };

  const addMapToPDF = (pdf: jsPDF, mapScreenshot: string, currentY: number, margin: number, contentWidth: number): Promise<number> => {
    try {
      // Crear una imagen temporal para obtener las dimensiones reales
      return new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            // Obtener dimensiones reales de la imagen
            const originalWidth = img.width;
            const originalHeight = img.height;
            const originalAspectRatio = originalWidth / originalHeight;
            
            // Calcular dimensiones para el PDF
            const maxWidth = contentWidth;
            const maxHeight = 100; // Altura máxima para el mapa
            
            let mapWidth = maxWidth;
            let mapHeight = mapWidth / originalAspectRatio;
            
            // Si la altura es mayor que el máximo, ajustar manteniendo proporción
            if (mapHeight > maxHeight) {
              mapHeight = maxHeight;
              mapWidth = mapHeight * originalAspectRatio;
            }
            
            // Centrar el mapa horizontalmente
            const mapX = margin + (contentWidth - mapWidth) / 2;
            
            // Agregar imagen al PDF con las dimensiones calculadas
            pdf.addImage(mapScreenshot, 'PNG', mapX, currentY, mapWidth, mapHeight);
            
            // Agregar descripción y créditos del mapa
            const finalY = currentY + mapHeight + 8;
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Project location map with cadastral boundaries and IFC marker', margin, finalY);
            pdf.setFontSize(7);
            pdf.text('© OpenStreetMap contributors • © MapTiler • © Maanmittauslaitos', margin, finalY + 5);
            
            resolve(finalY + 14);
          } catch (error) {
            console.error('[PermitDocumentGenerator] Error adding map to PDF:', error);
            // Si falla, agregar texto descriptivo
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Map image could not be included in the document', margin, currentY);
            resolve(currentY + 15);
          }
        };
        
        img.onerror = () => {
          // Si no se puede cargar la imagen, usar dimensiones por defecto
          const defaultWidth = contentWidth;
          const defaultHeight = 60;
          const mapX = margin + (contentWidth - defaultWidth) / 2;
          
          try {
            pdf.addImage(mapScreenshot, 'PNG', mapX, currentY, defaultWidth, defaultHeight);
            const finalY = currentY + defaultHeight + 8;
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Project location map with cadastral boundaries and IFC marker', margin, finalY);
            pdf.setFontSize(7);
            pdf.text('© OpenStreetMap contributors • © MapTiler • © Maanmittauslaitos', margin, finalY + 5);
            resolve(finalY + 14);
          } catch (error) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Map image could not be included in the document', margin, currentY);
            resolve(currentY + 15);
          }
        };
        
        img.src = mapScreenshot;
      });
    } catch (error) {
      console.error('[PermitDocumentGenerator] Error in addMapToPDF:', error);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Map image could not be included in the document', margin, currentY);
      return Promise.resolve(currentY + 15);
    }
  };



  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = availableTemplates.find(t => t.id === templateId);
    if (template) {
      setDocumentOptions(prev => ({
        ...prev,
        language: template.language
      }));
    }
  };

  return (
    <div className="dashboard-card" style={{ marginBottom: '20px' }}>
      <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>
        <span className="material-icons-round" style={{ marginRight: '8px' }}>description</span>
        Permit Document Generator
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Generate professional building permit documents for Finnish authorities
      </p>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <label style={{ display: 'block', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Document Template:
          </label>
          <select 
            value={selectedTemplate} 
            onChange={(e) => handleTemplateChange(e.target.value)}
            disabled={isGenerating}
            style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '14px' }}
          >
            {availableTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.language.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-start', marginBottom: '30px' }}>
        <button 
          onClick={handleGenerateDocument}
          disabled={isGenerating || !selectedTemplate || !isAuthenticated}
          className="button-primary tooltip-enhanced"
          data-tooltip={!isAuthenticated ? "Authentication required to generate permit documents. Please sign in to access this feature." : "Generate Finnish building permit application document with all required sections and data"}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: !isAuthenticated ? 0.6 : 1,
            cursor: !isAuthenticated ? 'not-allowed' : 'pointer'
          }}
        >
          <span className="material-icons-round" style={{ fontSize: '20px' }}>
            {isGenerating ? 'refresh' : !isAuthenticated ? 'lock' : 'description'}
          </span>
          {isGenerating ? 'Generating...' : !isAuthenticated ? 'Login Required' : 'Generate Document'}
        </button>

        {generatedDocument && (
          <button 
            onClick={handleDownloadDocument}
            disabled={isGenerating || !isAuthenticated}
            className="button-success tooltip-enhanced"
            data-tooltip={!isAuthenticated ? "Authentication required to download permit documents. Please sign in to access this feature." : "Download the generated permit application as a PDF document"}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: !isAuthenticated ? 0.6 : 1,
              cursor: !isAuthenticated ? 'not-allowed' : 'pointer'
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '20px' }}>
              {isGenerating ? 'refresh' : !isAuthenticated ? 'lock' : 'download'}
            </span>
            {isGenerating ? 'Downloading...' : !isAuthenticated ? 'Login Required' : 'Download PDF'}
          </button>
        )}
      </div>

      {generatedDocument && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: 'var(--surface-2)', 
          borderRadius: '6px',
          border: '1px solid var(--border)',
          marginBottom: '20px',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--success)' }}>check_circle</span>
            <strong>Document Ready for Download</strong>
          </div>
          <div>PDF document generated successfully.</div>
        </div>
      )}
    </div>
  );
};

export default PermitDocumentGenerator;
