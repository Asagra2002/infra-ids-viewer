import React, { useState, useEffect, useRef } from 'react';
import { useSijaintikarttaStore } from '../stores/SijaintikarttaStore';
import { useAuthStore } from '../stores/AuthStore';
import { useLocation } from 'react-router-dom';
import { CadastralService, CadastralProperty, BuildingPermitRequirements } from '../services/CadastralService';
import CoordinateSyncInfo from './CoordinateSyncInfo';
import PermitDocumentGenerator from './PermitDocumentGenerator';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';

// --- Consulta WFS para obtener información adicional de la parcela ---
const fetchParcelInfo = async (latitude: number, longitude: number) => {
  // Define un bbox pequeño alrededor del punto
  const delta = 0.001;
  const bbox = [
    longitude - delta, latitude - delta,
    longitude + delta, latitude + delta
  ].join(',');
  
  // URL del servicio WFS de Maanmittauslaitos para límites de propiedad
  const wfsUrl = `https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=kiinteistot&bbox=${bbox}&outputFormat=application/json`;
  
  try {
    const res = await fetch(wfsUrl);
    if (!res.ok) {
      console.warn('[SijaintikarttaPage] WFS request failed:', res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    
    // Devuelve el primer feature si existe
    const parcelInfo = data.features?.[0]?.properties || null;
    return parcelInfo;
  } catch (error) {
    console.error('[SijaintikarttaPage] Error fetching parcel info:', error);
    return null;
  }
};

// --- Función para obtener dirección real usando geocodificación inversa ---
const fetchRealAddress = async (latitude: number, longitude: number) => {
  try {
    // Usar Nominatim (OpenStreetMap) para geocodificación inversa
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const res = await fetch(nominatimUrl);
    
    if (!res.ok) {
      console.warn('[SijaintikarttaPage] Nominatim request failed:', res.status, res.statusText);
      return null;
    }
    
    const data = await res.json();
    
    if (data.address) {
      const address = data.address;
      const realAddress = {
        street: address.road || address.street || 'Unknown Street',
        number: address.house_number || 'N/A',
        postalCode: address.postcode || 'N/A',
        city: address.city || address.town || address.village || 'Unknown City',
        country: address.country || 'Finland',
        // Formato simple para mostrar en Location
        displayAddress: `${address.road || 'Unknown'} ${address.house_number || ''}, ${address.postcode || ''} ${address.city || 'Unknown'}`
      };
      
      return realAddress;
    }
    
    return null;
  } catch (error) {
    console.error('[SijaintikarttaPage] Error fetching real address:', error);
    return null;
  }
};

// Capas base: MapTiler (siempre) + Maanmittauslaitos WMTS (si hay API key)
const getMapLayers = () => {
  const apiKey = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MAANMITTLAITOS_API_KEY;
  const mmlKey = typeof apiKey === 'string' && apiKey.length > 0 ? apiKey : undefined;
  const base = 'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0';

  const layers: { key: string; label: string; url: string; attribution: string }[] = [
    { key: 'maptiler_topo', label: 'Finnish Topographic (MapTiler)', url: 'https://api.maptiler.com/maps/topo/{z}/{x}/{y}.png?key=7QjgSjx55hW489tQSL7w', attribution: '© MapTiler © OpenStreetMap contributors' },
    { key: 'maptiler_basic', label: 'Property Boundaries (MapTiler)', url: 'https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=7QjgSjx55hW489tQSL7w', attribution: '© MapTiler © OpenStreetMap contributors' },
    { key: 'maptiler_streets', label: 'Streets (MapTiler)', url: 'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=7QjgSjx55hW489tQSL7w', attribution: '© MapTiler © OpenStreetMap contributors' },
    { key: 'maptiler_hybrid', label: 'Hybrid (Satellite + Labels)', url: 'https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=7QjgSjx55hW489tQSL7w', attribution: '© MapTiler © OpenStreetMap contributors' },
    { key: 'maptiler_satellite', label: 'Satellite View (MapTiler)', url: 'https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=7QjgSjx55hW489tQSL7w', attribution: '© MapTiler © OpenStreetMap contributors' },
  ];

  if (mmlKey) {
    layers.push(
      { key: 'mml_maastokartta', label: 'Maastokartta (Maanmittauslaitos)', url: `${base}/maastokartta/default/WGS84_Pseudo-Mercator/{z}/{x}/{y}.png?api-key=${mmlKey}`, attribution: '© Maanmittauslaitos' },
      { key: 'mml_taustakartta', label: 'Taustakartta (Maanmittauslaitos)', url: `${base}/taustakartta/default/WGS84_Pseudo-Mercator/{z}/{x}/{y}.png?api-key=${mmlKey}`, attribution: '© Maanmittauslaitos' },
      { key: 'mml_ortokuva', label: 'Ortokuva (Maanmittauslaitos)', url: `${base}/ortokuva/default/WGS84_Pseudo-Mercator/{z}/{x}/{y}.jpg?api-key=${mmlKey}`, attribution: '© Maanmittauslaitos' }
    );
  }
  return layers;
};

const SijaintikarttaMap: React.FC<{
  latitude?: number,
  longitude?: number,
  address?: string,
  realAddress?: any,
  parcelInfo?: any,
  cadastralInfo?: any,
  permitRequirements?: any,
  isAuthenticated: boolean
}> = ({
  latitude,
  longitude,
  address,
  realAddress,
  parcelInfo,
  cadastralInfo,
  permitRequirements,
  isAuthenticated
}) => {
  // State for toggling layers - start with no additional layers (OSM is base)
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleToggleLayer = (layerKey: string) => {
    setActiveLayers(prev => {
      const newLayers = prev.includes(layerKey)
        ? prev.filter(key => key !== layerKey)
        : [...prev, layerKey];
      return newLayers;
    });
  };

  const handleCaptureMap = async () => {
    if (!isAuthenticated) {
      alert('Authentication required to capture map data. Please sign in to access this feature.');
      return;
    }
    
    if (!mapContainerRef.current) return;
    
    setIsCapturing(true);
    try {
      console.log('[SijaintikarttaPage] Capturing map screenshot...');
      
      const canvas = await html2canvas(mapContainerRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: mapContainerRef.current.offsetWidth,
        height: mapContainerRef.current.offsetHeight
      });
      
      // Convertir a base64 para guardar en el store
      const base64Image = canvas.toDataURL('image/png');
      useSijaintikarttaStore.getState().setMapScreenshot(base64Image);
      
      // Crear blob y descargar
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `sijaintikartta_map_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          console.log('[SijaintikarttaPage] Map screenshot saved to store and downloaded successfully');
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('[SijaintikarttaPage] Error capturing map:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Validar que las coordenadas existan
  if (!latitude || !longitude) {
    return (
      <div style={{ 
        width: '100%', 
        height: '600px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'var(--surface-2)',
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <span className="material-icons-round" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>
            location_off
          </span>
          <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No Coordinates Available</h3>
          <p>Map cannot be displayed without valid coordinates.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      {/* Layer toggles */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        background: 'rgba(255,255,255,0.95)',
        padding: '10px 16px',
        borderRadius: '8px',
        zIndex: 1001,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <strong style={{ color: 'black' }}>Map Layers</strong>
        <div style={{ marginTop: 8 }}>
          {getMapLayers().map(layer => (
            <label key={layer.key} style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={activeLayers.includes(layer.key)}
                onChange={() => handleToggleLayer(layer.key)}
                style={{ marginRight: 6 }}
              />
              {layer.label}
              <span style={{ 
                marginLeft: 8, 
                fontSize: 11, 
                color: activeLayers.includes(layer.key) ? 'green' : 'gray' 
              }}>
                {activeLayers.includes(layer.key) ? '✓ Active' : 'Inactive'}
              </span>
            </label>
          ))}
        </div>
        
        {/* Capture Map Button */}
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #ddd' }}>
                      <button
              onClick={handleCaptureMap}
              disabled={isCapturing || !isAuthenticated}
              className="tooltip-enhanced"
              data-tooltip={!isAuthenticated ? "Authentication required to capture map data. Please sign in to access this feature." : "📸 Capture current map view with all active layers (topographic, property boundaries, etc.). This exact map view will be included in the PDF document with the same layers and zoom level you see now."}
              style={{
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: isCapturing || !isAuthenticated ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                width: '100%',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.2s ease',
                opacity: !isAuthenticated ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (isAuthenticated) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '14px' }}>
                {isCapturing ? 'refresh' : !isAuthenticated ? 'lock' : 'camera_alt'}
              </span>
              {isCapturing ? 'Capturing...' : !isAuthenticated ? 'Login Required' : 'Capture Map (for PDF)'}
            </button>
        </div>
      </div>

      {/* Active layers info */}
      <div style={{ marginTop: 8, fontSize: 11, color: '#666' }}>
        Active: {activeLayers.length > 0 ? activeLayers.join(', ') : 'OpenStreetMap (Base)'}
      </div>
      
      {/* Map Container - Solo esto se captura */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={16}
          minZoom={10}
          maxZoom={21}
          style={{ width: '100%', height: '100%' }}
        >
        {/* Base OpenStreetMap layer (always present) with overzooming support */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
          maxZoom={21}
          maxNativeZoom={19}
        />
        
        {/* Dynamic TileLayers based on active layers with overzooming support */}
        {activeLayers.map(layerKey => {
          const layer = getMapLayers().find(l => l.key === layerKey);
          return layer ? (
            <TileLayer
              key={layer.key}
              url={layer.url}
              attribution={layer.attribution}
              maxZoom={21}
              maxNativeZoom={19}
            />
          ) : null;
        })}
        <Marker position={[latitude, longitude]}>
          <Popup>
            <strong>IFC Project</strong><br />
            {latitude.toFixed(4)}, {longitude.toFixed(4)}<br />
            {address}<br />
            <hr />
            {parcelInfo && (
              <div>
                <strong>🏠 Property Information (WFS):</strong><br />
                <strong>Property ID:</strong> {parcelInfo.KIINTEISTOTUNNUS || 'N/A'}<br />
                <strong>Municipality:</strong> {parcelInfo.KUNTA || 'N/A'}<br />
                <strong>Property Name:</strong> {parcelInfo.NIMI || 'N/A'}<br />
                <strong>Area:</strong> {parcelInfo.PINTA_ALA ? `${parcelInfo.PINTA_ALA} m²` : 'N/A'}<br />
                <strong>Property Type:</strong> {parcelInfo.KIINTEISTOTYYPPI || 'N/A'}<br />
                <strong>Land Use:</strong> {parcelInfo.MAAINKAYTTO || 'N/A'}<br />
              </div>
            )}
            {cadastralInfo && (
              <div>
                <strong>Parcel:</strong> {cadastralInfo.propertyNumber}<br />
                <strong>Zoning:</strong> {cadastralInfo.zoning.name}<br />
                <strong>Area:</strong> {cadastralInfo.area.landArea.toFixed(2)} m²<br />
                <strong>Restrictions:</strong> {
                  Array.isArray(cadastralInfo.restrictions)
                    ? cadastralInfo.restrictions.join(', ')
                    : (typeof cadastralInfo.restrictions === 'string'
                        ? cadastralInfo.restrictions
                        : 'None')
                }
              </div>
            )}
            {permitRequirements && (
              <div>
                <hr />
                <strong>Permit required:</strong> {permitRequirements.permitRequired ? 'Yes' : 'No'}<br />
                <strong>Permit type:</strong> {permitRequirements.permitType}<br />
                <strong>Documents:</strong>
                <ul>
                  {Object.entries(permitRequirements.requirements).map(([key, required]) =>
                    required ? <li key={key}>{key}</li> : null
                  )}
                </ul>
              </div>
            )}
          </Popup>
        </Marker>
      </MapContainer>
      </div>
      
            {/* Project Location Info - No se incluye en la captura */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(25, 118, 210, 0.9)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000
      }}>
          <div>
            <strong>📍 Project location:</strong>
            <br />
            {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
          </div>
          {address && (
            <div style={{ marginTop: '4px' }}>
              <strong>Address:</strong> {address}
            </div>
          )}
          {parcelInfo && (
            <div style={{ marginTop: '4px', fontSize: '11px' }}>
              <strong>🏠 Property detected:</strong> {parcelInfo.KIINTEISTOTUNNUS || 'N/A'}
            </div>
          )}
        </div>
    </div>
  );
};

const SijaintikarttaPage: React.FC = () => {
  const { sijaintikarttaData, clearData, clearDataOnNavigation } = useSijaintikarttaStore();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const [physicalAddress, setPhysicalAddress] = useState<string>('');
  const [cadastralInfo, setCadastralInfo] = useState<CadastralProperty | null>(null);
  const [permitRequirements, setPermitRequirements] = useState<BuildingPermitRequirements | null>(null);
  const [permitDocumentation, setPermitDocumentation] = useState<any>(null);
  const [isLoadingCadastral, setIsLoadingCadastral] = useState<boolean>(false);
  const [parcelInfo, setParcelInfo] = useState<any>(null);
  const [realAddress, setRealAddress] = useState<any>(null);
  const [showClearedMessage, setShowClearedMessage] = useState<boolean>(false);

  // Check if project data is available
  const hasProjectData = sijaintikarttaData && sijaintikarttaData.projectInfo && sijaintikarttaData.buildingData;

  // Effect to detect when data is cleared and show message
  useEffect(() => {
    if (!hasProjectData && sijaintikarttaData === null) {
      setShowClearedMessage(true);
      const timer = setTimeout(() => {
        setShowClearedMessage(false);
      }, 5000); // Hide message after 5 seconds
      
      return () => clearTimeout(timer);
    } else {
      setShowClearedMessage(false);
    }
  }, [hasProjectData, sijaintikarttaData]);

  // Effect to clear data when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Clear data when component unmounts
      clearDataOnNavigation();
      console.log('[SijaintikarttaPage] Component unmounted - cleared Site Plan data');
    };
  }, [clearDataOnNavigation]);

  // Effect to clear data when user navigates to a different route
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearDataOnNavigation();
      console.log('[SijaintikarttaPage] Page unload detected - cleared Site Plan data');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearDataOnNavigation();
        console.log('[SijaintikarttaPage] Page hidden - cleared Site Plan data');
      }
    };

    // Listen for page unload events
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearDataOnNavigation]);

  // Obtén las coordenadas del proyecto desde el store
  const latitude = sijaintikarttaData?.buildingData?.coordinates?.latitude;
  const longitude = sijaintikarttaData?.buildingData?.coordinates?.longitude;
  const address = realAddress?.displayAddress || physicalAddress || sijaintikarttaData?.projectInfo?.location || '';

  // Validar si las coordenadas están en Finlandia (solo si existen coordenadas)
  const hasCoordinates = latitude !== undefined && longitude !== undefined;
  const isInFinland = hasCoordinates && latitude >= 59.0 && latitude <= 71.0 && longitude >= 19.0 && longitude <= 32.0;

  // Cargar información catastral y permisos (solo si está en Finlandia)
  useEffect(() => {
    if (hasCoordinates && isInFinland) {
      const loadCadastralInformation = async () => {
        try {
          setIsLoadingCadastral(true);
          const cadastralService = CadastralService.getInstance();
          const cadastralData = await cadastralService.getCadastralInfo(latitude, longitude);
          setCadastralInfo(cadastralData);
          if (cadastralData.address) {
            const addr = `${cadastralData.address.street} ${cadastralData.address.number}, ${cadastralData.address.postalCode} ${cadastralData.address.city}`;
            setPhysicalAddress(addr);
          }
          const requirements = await cadastralService.getBuildingPermitRequirements(
            sijaintikarttaData!.buildingData,
            cadastralData
          );
          setPermitRequirements(requirements);
          
          const documentation = await cadastralService.generatePermitDocumentation(
            sijaintikarttaData!.buildingData,
            cadastralData,
            requirements
          );
          setPermitDocumentation(documentation);
          
          // Log de información de permisos de construcción para Finlandia
          console.log('[SijaintikarttaPage] Finnish Building Permit Information:', {
            source: sijaintikarttaData!.buildingData.source || 'unknown',
            property: {
              id: cadastralData.propertyId,
              number: cadastralData.propertyNumber,
              municipality: cadastralData.municipality.name,
              address: `${cadastralData.address.street} ${cadastralData.address.number}, ${cadastralData.address.postalCode} ${cadastralData.address.city}`
            },
            zoning: {
              code: cadastralData.zoning.code,
              name: cadastralData.zoning.name,
              buildingRights: cadastralData.zoning.buildingRights,
              maxHeight: cadastralData.zoning.maxHeight,
              maxFloors: cadastralData.zoning.maxFloors,
              maxCoverage: cadastralData.zoning.maxCoverage
            },
            permit: {
              required: requirements.permitRequired,
              type: requirements.permitType,
              timeline: requirements.estimatedTimeline.totalProcess + ' days',
              cost: '€' + requirements.estimatedCosts.totalEstimated.toFixed(2)
            },
            building: {
              area: sijaintikarttaData!.buildingData.dimensions.surface.toFixed(2) + ' m²',
              height: sijaintikarttaData!.buildingData.dimensions.height.toFixed(1) + ' m',
              floors: sijaintikarttaData!.buildingData.additionalInfo.floors
            }
          });
        } catch (error) {
          setCadastralInfo(null);
        } finally {
          setIsLoadingCadastral(false);
        }
      };
      loadCadastralInformation();

      // --- Consulta WFS para obtener información de la parcela ---
      fetchParcelInfo(latitude!, longitude!).then(setParcelInfo);
      
      // --- Consulta para obtener dirección postal real ---
      fetchRealAddress(latitude!, longitude!).then(setRealAddress);
    }
  }, [latitude, longitude, sijaintikarttaData, isInFinland]);

  if (!hasProjectData) {
    return (
      <div className="page">
        <header style={{ 
          padding: '1rem 2rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            margin: 0,
            fontSize: '1.5rem'
          }}>
            <span className="material-icons-round">map</span>
            Site Plan
          </h2>
        </header>
        <div className="main-page-content" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="dashboard-card" style={{ margin: '40px', padding: '40px', textAlign: 'center' }}>
          <span className="material-icons-round" style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '16px' }}>
            map
          </span>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '24px' }}>
            No Site Plan Data Available
          </h2>
            <p style={{ marginBottom: '24px', fontSize: '16px', lineHeight: '1.5', maxWidth: '600px', margin: '0 auto 24px', color: 'var(--text-secondary)' }}>
              To use the Site Plan feature for building permit documentation, please:
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px', 
              marginBottom: '30px',
              maxWidth: '800px',
              margin: '0 auto 30px'
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-icons-round" style={{ color: 'var(--primary)' }}>upload_file</span>
                  <strong>1. Load IFC Model</strong>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                  Upload or load an IFC model with valid coordinates in Finland.
                </p>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-icons-round" style={{ color: 'var(--primary)' }}>send</span>
                  <strong>2. Extract GIS Data</strong>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                  Use the "Send GIS Data" button in the map interface to extract location data.
                </p>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-icons-round" style={{ color: 'var(--primary)' }}>description</span>
                  <strong>3. Generate Documents</strong>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                  Access cadastral information and building permit documentation.
                </p>
              </div>
            </div>
                         <div style={{ 
               padding: '16px', 
               backgroundColor: 'var(--surface-2)', 
               borderRadius: '8px',
               border: '1px solid var(--border)',
               marginBottom: '24px',
               maxWidth: '600px',
               margin: '0 auto 24px'
             }}>
               <h3 style={{ color: 'var(--warning)', marginBottom: '12px', fontSize: '16px' }}>
                 <span className="material-icons-round" style={{ fontSize: '18px', marginRight: '8px' }}>info</span>
                 Automatic Data Clearing
               </h3>
               <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                 Site Plan data is automatically cleared when you:
               </p>
               <ul style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0 0 0', paddingLeft: '20px' }}>
                 <li>Load a new IFC model</li>
                 <li>Navigate to a different page</li>
                 <li>Close or refresh the browser tab</li>
               </ul>
               <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                 This ensures data consistency and prevents showing outdated information.
               </p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si las coordenadas no están en Finlandia
  if (!isInFinland) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '30px' }}>Sijaintikartta - Official Site Plan</h1>
        <div className="dashboard-card" style={{ margin: '40px', padding: '40px', textAlign: 'center' }}>
          <span className="material-icons-round" style={{ fontSize: '48px', color: 'var(--error)', marginBottom: '16px' }}>
            location_off
          </span>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '24px' }}>
            Location Outside Finland
          </h2>
          <p style={{ marginBottom: '24px', fontSize: '16px', lineHeight: '1.5', maxWidth: '600px', margin: '0 auto 24px', color: 'var(--text-secondary)' }}>
            This page is only available for projects located in Finland. The current model coordinates 
            {hasCoordinates && latitude && longitude ? ` (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` : ''} are outside the Finnish territory.
          </p>
          <div style={{ 
            padding: '16px', 
            backgroundColor: 'var(--surface-2)', 
            borderRadius: '8px',
            border: '1px solid var(--border)',
            marginBottom: '24px'
          }}>
            <h3 style={{ color: 'var(--warning)', marginBottom: '12px', fontSize: '18px' }}>
              Finnish Territory Boundaries:
            </h3>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <div><strong>Latitude:</strong> 59.0° - 71.0° N</div>
              <div><strong>Longitude:</strong> 19.0° - 32.0° E</div>
              <div style={{ marginTop: '8px', fontSize: '13px', fontStyle: 'italic' }}>
                Please use a model with coordinates within these boundaries to access Finnish cadastral data and building permit information.
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              clearData();
              window.location.reload();
            }}
            className="button-primary"
            style={{
              padding: '12px 24px',
              fontSize: '16px'
            }}
          >
            <span className="material-icons-round" style={{ marginRight: '8px', fontSize: '20px' }}>refresh</span>
            Load Different Model
          </button>
        </div>
      </div>
    );
  }

  // Show notification when data is cleared
  if (showClearedMessage) {
  return (
      <div className="page">
        <header style={{ 
          padding: '1rem 2rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            margin: 0,
            fontSize: '1.5rem'
          }}>
            <span className="material-icons-round">map</span>
            Site Plan
          </h2>
        </header>
        <div className="main-page-content" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div className="dashboard-card" style={{ margin: '40px', padding: '40px', textAlign: 'center' }}>
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '8px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <span className="material-icons-round" style={{ color: 'var(--success)', fontSize: '24px' }}>
                check_circle
              </span>
              <div>
                <h3 style={{ color: 'var(--success)', margin: '0 0 8px 0', fontSize: '18px' }}>
                  Site Plan Data Cleared
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                  Previous data has been automatically cleared for the new IFC model.
                </p>
              </div>
            </div>
            <span className="material-icons-round" style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '16px' }}>
              map
            </span>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '24px' }}>
              Ready for New Site Plan Data
            </h2>
            <p style={{ marginBottom: '24px', fontSize: '16px', lineHeight: '1.5', maxWidth: '600px', margin: '0 auto 24px', color: 'var(--text-secondary)' }}>
              The new IFC model has been loaded. To generate site plan documentation:
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px', 
              marginBottom: '30px',
              maxWidth: '800px',
              margin: '0 auto 30px'
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-icons-round" style={{ color: 'var(--primary)' }}>send</span>
                  <strong>Extract GIS Data</strong>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                  Use the "Send GIS Data" button in the map interface to extract location data from the new model.
                </p>
              </div>
              <div style={{
                padding: '20px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-icons-round" style={{ color: 'var(--primary)' }}>description</span>
                  <strong>Generate Documents</strong>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                  Access cadastral information and building permit documentation for the new location.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header style={{ 
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px'
      }}>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          margin: 0,
          fontSize: '1.5rem'
        }}>
          <span className="material-icons-round">map</span>
          Site Plan
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {hasProjectData && (
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
        <button 
          onClick={() => {
            clearData();
            window.location.reload();
          }}
          className="button-danger"
          style={{
            padding: '8px 16px',
            fontSize: '14px'
          }}
        >
          <span className="material-icons-round" style={{ marginRight: '4px', fontSize: '16px' }}>refresh</span>
          Reload Data
        </button>
      </div>
      </header>
      <div className="main-page-content" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Project Information */}
      <div className="dashboard-card" style={{ marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>
          <span className="material-icons-round" style={{ marginRight: '8px' }}>business</span>
          Project Information
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ color: 'var(--primary)', marginBottom: '12px' }}>Project Details</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <div><strong>Name:</strong> {sijaintikarttaData?.projectInfo.name || "Unnamed Project"}</div>
              <div><strong>Description:</strong> {sijaintikarttaData?.projectInfo.description || "No description available"}</div>
              <div><strong>Location:</strong> {realAddress?.displayAddress || physicalAddress || sijaintikarttaData?.projectInfo.location || "Unknown"}</div>
              <div><strong>Municipality:</strong> {sijaintikarttaData?.projectInfo.municipality || "Unknown"}</div>
              <div><strong>Building Type:</strong> {sijaintikarttaData?.projectInfo.buildingType || "Unknown"}</div>
              <div><strong>Area:</strong> {(sijaintikarttaData?.projectInfo.area || 0).toFixed(2)} m²</div>
            </div>
          </div>
          <div>
            <h4 style={{ color: 'var(--primary)', marginBottom: '12px' }}>Building Information</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <div><strong>Floors:</strong> {sijaintikarttaData?.buildingData.additionalInfo?.floors || 1}</div>
              <div><strong>Height:</strong> {(sijaintikarttaData?.buildingData.dimensions?.height || 0).toFixed(1)} m</div>
              <div><strong>Width:</strong> {(sijaintikarttaData?.buildingData.dimensions?.width || 0).toFixed(1)} m</div>
              <div><strong>Length:</strong> {(sijaintikarttaData?.buildingData.dimensions?.length || 0).toFixed(1)} m</div>
              <div><strong>Volume:</strong> {(sijaintikarttaData?.buildingData.dimensions?.volume || 0).toFixed(1)} m³</div>
            </div>
          </div>
        </div>
      </div>

      {/* Coordinate Synchronization Information */}
      <CoordinateSyncInfo />

      {/* Mapa oficial con React-Leaflet y capas WMS/WFS de Finlandia */}
      <div className="dashboard-card" style={{ marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>
          <span className="material-icons-round" style={{ marginRight: '8px' }}>public</span>
          🗺️ Finnish Cadastral Map (MapTiler{typeof (import.meta as any).env?.VITE_MAANMITTLAITOS_API_KEY === 'string' ? ' + Maanmittauslaitos' : ''} + OpenStreetMap)
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          This map shows Finnish cadastral data using MapTiler services, OpenStreetMap{typeof (import.meta as any).env?.VITE_MAANMITTLAITOS_API_KEY === 'string' ? ', and official Maanmittauslaitos layers (maastokartta, taustakartta, ortokuva)' : ''}. The map is centered on your project coordinates 
          with multiple layer options including topographic, satellite, and property boundary views. 
          The marker indicates your project location and displays official parcel and permit data.
        </p>
        <SijaintikarttaMap
          latitude={latitude}
          longitude={longitude}
          address={address}
          realAddress={realAddress}
          parcelInfo={parcelInfo}
          cadastralInfo={cadastralInfo}
          permitRequirements={permitRequirements}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Map Information - Moved outside map container */}
      <div style={{
        marginTop: '15px',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: 'var(--surface-2)',
        borderRadius: '6px',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          <strong>Fuente:</strong> MapTiler • OpenStreetMap{typeof (import.meta as any).env?.VITE_MAANMITTLAITOS_API_KEY === 'string' ? ' • Maanmittauslaitos' : ''} • Finnish Cadastral Data
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          💡 <strong>Tip:</strong> OpenStreetMap is always visible as base layer. Add layers for property boundaries and cadastral details. Zoom up to level 21 for enhanced detail (overzooming enabled).
        </div>
      </div>

      {/* Cadastral Information */}
      {cadastralInfo && (
        <div className="dashboard-card" style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>
            <span className="material-icons-round" style={{ marginRight: '8px' }}>gps_fixed</span>
            Cadastral Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4 style={{ color: 'var(--success)', marginBottom: '12px' }}>Property Details</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                <div><strong>Property ID:</strong> {cadastralInfo.propertyId}</div>
                <div><strong>Property Number:</strong> {cadastralInfo.propertyNumber}</div>
                <div><strong>Municipality:</strong> {cadastralInfo.municipality.name} ({cadastralInfo.municipality.code})</div>
                <div><strong>Location:</strong> {realAddress?.displayAddress || `${cadastralInfo.address.street} ${cadastralInfo.address.number}, ${cadastralInfo.address.postalCode} ${cadastralInfo.address.city}`}</div>
                <div><strong>Land Area:</strong> {cadastralInfo.area.landArea.toFixed(2)} m²</div>
                <div><strong>Building Coverage:</strong> {cadastralInfo.area.buildingCoverage.toFixed(1)}%</div>
              </div>
            </div>
            <div>
              <h4 style={{ color: 'var(--success)', marginBottom: '12px' }}>Zoning & Restrictions</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                <div><strong>Zoning Code:</strong> {cadastralInfo.zoning.code}</div>
                <div><strong>Zoning Type:</strong> {cadastralInfo.zoning.name}</div>
                <div><strong>Building Rights:</strong> {cadastralInfo.zoning.buildingRights ? 'Yes' : 'No'}</div>
                <div><strong>Max Height:</strong> {cadastralInfo.zoning.maxHeight || 'No limit'} m</div>
                <div><strong>Max Floors:</strong> {cadastralInfo.zoning.maxFloors || 'No limit'}</div>
                <div><strong>Max Coverage:</strong> {cadastralInfo.zoning.maxCoverage || 'No limit'}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Building Permit Requirements */}
      {permitRequirements && (
        <div className="dashboard-card" style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--warning)', marginBottom: '15px' }}>
            <span className="material-icons-round" style={{ marginRight: '8px' }}>assignment</span>
            Building Permit Requirements
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4 style={{ color: 'var(--warning)', marginBottom: '12px' }}>Permit Status</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                <div><strong>Permit Required:</strong> {permitRequirements.permitRequired ? 'Yes' : 'No'}</div>
                <div><strong>Permit Type:</strong> {permitRequirements.permitType.toUpperCase()}</div>
                <div><strong>Estimated Timeline:</strong> {permitRequirements.estimatedTimeline.totalProcess} days</div>
                <div><strong>Estimated Cost:</strong> €{permitRequirements.estimatedCosts.totalEstimated.toFixed(2)}</div>
              </div>
            </div>
            <div>
              <h4 style={{ color: 'var(--warning)', marginBottom: '12px' }}>Required Documentation</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {Object.entries(permitRequirements.requirements).map(([key, required]) => (
                  <div key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: required ? 'var(--error)' : 'var(--text-secondary)'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                      {required ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Analysis */}
      {permitDocumentation && (
        <div className="dashboard-card" style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--success)', marginBottom: '15px' }}>
            <span className="material-icons-round" style={{ marginRight: '8px' }}>verified</span>
            Compliance Analysis
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4 style={{ color: 'var(--success)', marginBottom: '12px' }}>Regulatory Compliance</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {Object.entries(permitDocumentation.compliance).map(([key, compliant]) => (
                  <div key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: compliant ? 'var(--success)' : 'var(--error)'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '16px' }}>
                      {compliant ? 'check_circle' : 'error'}
                    </span>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ color: 'var(--success)', marginBottom: '12px' }}>Recommendations</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                {permitDocumentation.recommendations.map((recommendation: string, index: number) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '8px',
                    color: 'var(--text-secondary)'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '16px', color: 'var(--warning)' }}>
                      info
                    </span>
                    <span>{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator for cadastral data */}
      {isLoadingCadastral && (
        <div className="dashboard-card" style={{ marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span className="material-icons-round" style={{ animation: 'spin 1s linear infinite' }}>
              refresh
            </span>
            Loading cadastral information and permit requirements...
          </div>
        </div>
      )}

      {/* Permit Document Generator */}
      {sijaintikarttaData && cadastralInfo && permitRequirements && !isLoadingCadastral && (
        <PermitDocumentGenerator
          buildingData={sijaintikarttaData.buildingData}
          cadastralInfo={cadastralInfo}
          permitRequirements={permitRequirements}
        />
      )}
      </div>
    </div>
  );
};

export default SijaintikarttaPage;
