import React from 'react';
import { useSijaintikarttaStore } from '../stores/SijaintikarttaStore';

const CoordinateSyncInfo: React.FC = () => {
  const { sijaintikarttaData } = useSijaintikarttaStore();

  const hasProjectData = sijaintikarttaData && sijaintikarttaData.projectInfo && sijaintikarttaData.buildingData;

  if (!hasProjectData) {
    return null;
  }

  const buildingData = sijaintikarttaData.buildingData;
  const projectInfo = sijaintikarttaData.projectInfo;

  // Verificar si las coordenadas existen
  const coordinates = buildingData.coordinates;
  const hasCoordinates = coordinates && coordinates.latitude && coordinates.longitude;
  
  // Verificar si las coordenadas están en Finlandia (solo para información)
  const isInFinland = hasCoordinates && 
    coordinates.latitude >= 59.0 && coordinates.latitude <= 71.0 && 
    coordinates.longitude >= 19.0 && coordinates.longitude <= 32.0;

  // Determinar el estado de sincronización
  const getSyncStatus = () => {
    if (!hasCoordinates) return { status: 'error', message: 'No coordinates available in IFC model' };
    if (!isInFinland) return { status: 'warning', message: 'Coordinates are outside Finland (may affect cadastral data accuracy)' };
    return { status: 'success', message: 'Coordinates synchronized with IFC model' };
  };

  const syncStatus = getSyncStatus();

  return (
    <div className="dashboard-card" style={{ marginBottom: '20px' }}>
      <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>
        <span className="material-icons-round" style={{ marginRight: '8px' }}>gps_fixed</span>
        Coordinate Synchronization Status
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h4 style={{ color: 'var(--primary)', marginBottom: '12px' }}>Coordinate Information</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <div><strong>WGS84 (GPS):</strong></div>
            <div style={{ marginLeft: '10px', fontFamily: 'monospace' }}>
              Lat: {coordinates?.latitude?.toFixed(6) || 'N/A'}°<br/>
              Lon: {coordinates?.longitude?.toFixed(6) || 'N/A'}°
            </div>
            <div style={{ marginTop: '8px' }}><strong>ETRS-TM35FIN:</strong></div>
            <div style={{ marginLeft: '10px', fontFamily: 'monospace' }}>
              X: {coordinates?.etrsTM35FIN?.x?.toFixed(2) || 'N/A'} m<br/>
              Y: {coordinates?.etrsTM35FIN?.y?.toFixed(2) || 'N/A'} m
            </div>
            <div style={{ marginTop: '8px' }}><strong>Elevation:</strong> {coordinates?.elevation?.toFixed(2) || 'N/A'} m</div>
          </div>
        </div>

        <div>
          <h4 style={{ color: 'var(--primary)', marginBottom: '12px' }}>Synchronization Status</h4>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '12px',
            color: syncStatus.status === 'success' ? 'var(--success)' : 
                   syncStatus.status === 'warning' ? 'var(--warning)' : 'var(--error)'
          }}>
            <span className="material-icons-round" style={{ fontSize: '20px' }}>
              {syncStatus.status === 'success' ? 'check_circle' : 
               syncStatus.status === 'warning' ? 'warning' : 'error'}
            </span>
            <span style={{ fontWeight: 'bold' }}>
              {syncStatus.status === 'success' ? 'Synchronized' : 
               syncStatus.status === 'warning' ? 'Warning' : 'Error'}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {syncStatus.message}
          </div>

          {/* Información adicional */}
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div><strong>Source:</strong> {hasCoordinates ? 'IFC Model Site Data' : 'No coordinates available'}</div>
            <div><strong>Location:</strong> {hasCoordinates ? (isInFinland ? 'Finland' : 'Outside Finland') : 'Unknown'}</div>
            <div><strong>Map Integration:</strong> {hasCoordinates ? 'Active' : 'Not available'}</div>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      {!hasCoordinates && (
        <div style={{ 
          marginTop: '15px', 
          padding: '12px', 
          backgroundColor: 'var(--surface-2)', 
          borderRadius: '6px',
          border: '1px solid var(--border)'
        }}>
          <h5 style={{ color: 'var(--warning)', marginBottom: '8px' }}>Recommendations:</h5>
          <ul style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px' }}>
            <li>Check if the IFC model contains proper site coordinates (IFCSITE entity)</li>
            <li>Verify that the coordinates are in WGS84 format</li>
            <li>Ensure the model is georeferenced correctly in the original BIM software</li>
            <li>Consider using a different IFC model with valid Finnish coordinates</li>
          </ul>
        </div>
      )}

      {/* Información técnica */}
      <div style={{ 
        marginTop: '15px', 
        padding: '12px', 
        backgroundColor: 'var(--surface-1)', 
        borderRadius: '6px',
        border: '1px solid var(--border)',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Technical Information:</div>
        <div>• IFC coordinates are extracted from IFCSITE entity in the model</div>
        <div>• Coordinates are converted from DMS (Degrees, Minutes, Seconds) to decimal degrees</div>
        <div>• ETRS-TM35FIN projection is used for Finnish cadastral data</div>
        <div>• Map overlay is positioned based on extracted coordinates</div>
      </div>
    </div>
  );
};

export default CoordinateSyncInfo;
