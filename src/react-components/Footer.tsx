import React, { useState } from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <footer style={{
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      padding: '1rem 0',
      borderTop: '1px solid #333',
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <span style={{
            color: '#cccccc',
            fontSize: '14px'
          }}>
            © {currentYear} BSOTO. BIM with Fragments 3.
          </span>
          <span style={{
            color: '#888888',
            fontSize: '12px'
          }}>
            Version 1.1.0
          </span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span 
            style={{
              padding: '4px 8px',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#ff9800',
              border: '1px solid #404040',
              cursor: 'help',
              position: 'relative'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span className="material-icons-round" style={{ fontSize: '12px', marginRight: '4px' }}>engineering</span>
            In Development
            {showTooltip && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                maxWidth: '280px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                zIndex: 1001,
                fontSize: '12px',
                color: '#ffffff',
                marginBottom: '8px',
                whiteSpace: 'nowrap'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#ff9800' }}>Preloaded Projects Available!</strong>
                </div>
                <div style={{ fontSize: '11px', lineHeight: '1.4', color: '#e0e0e0' }}>
                  Test the app with sample projects from BIM4LCA.
                  <br />
                  <span style={{ color: '#4fc3f7', fontSize: '10px' }}>
                    Source: Nordic Sustainable Construction
                  </span>
                </div>
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgba(0, 0, 0, 0.9)'
                }} />
              </div>
            )}
          </span>
          <span style={{
            padding: '4px 8px',
            backgroundColor: '#2a2a2a',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#4fc3f7',
            border: '1px solid #404040'
          }}>
            <span className="material-icons-round" style={{ fontSize: '12px', marginRight: '4px' }}>verified</span>
            MIT License
          </span>
        </div>
      </div>
    </footer>
  );
}
