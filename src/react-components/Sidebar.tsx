import * as React from "react";
import * as Router from "react-router-dom";
import { useAuthStore } from '../stores/AuthStore';

export function Sidebar() {
  const { isAuthenticated, user } = useAuthStore();
  
  return (
    <aside id="sidebar">
      <Router.Link to="/home" style={{ textDecoration: 'none' }}>
        <div style={{ padding: "15px 0", cursor: 'pointer', transition: 'transform 0.2s ease' }} 
             onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <svg width="160" height="120" viewBox="0 0 160 120">
            <defs>
              <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#2196f3" }} />
                <stop offset="100%" style={{ stopColor: "#1e88e5" }} />
              </linearGradient>
            </defs>
            {/* Grupo central con cubo y texto */}
            <g transform="translate(60, 10)">
              {/* Cubo más simple */}
              <g transform="scale(0.8)">
                <path d="M20,0 L40,10 L20,20 L0,10 Z" fill="#1e88e5" />
                <path d="M40,10 L40,30 L20,40 L20,20 Z" fill="#1976d2" />
                <path d="M20,20 L20,40 L0,30 L0,10 Z" fill="#2196f3" />
              </g>
              
              {/* Texto centrado y ajustado */}
              <text 
                x="20" 
                y="65" 
                style={{ 
                  fontFamily: "Arial", 
                  fontSize: "24px", 
                  fontWeight: "bold", 
                  fill: "#ffffff",
                  textAnchor: "middle" 
                }}
              >
                BSOTO
              </text>
              <text 
                x="20" 
                y="85" 
                style={{ 
                  fontFamily: "Arial", 
                  fontSize: "10px", 
                  letterSpacing: "0.5px", 
                  fill: "#ffffff",
                  textAnchor: "middle" 
                }}
              >
                BIM with Fragments 3
              </text>
            </g>
          </svg>
        </div>
      </Router.Link>
      
      {/* Authentication Status */}
      <div style={{
        padding: '15px',
        marginBottom: '20px',
        borderRadius: '8px',
        backgroundColor: isAuthenticated ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
        border: `1px solid ${isAuthenticated ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: isAuthenticated ? '#4CAF50' : '#F44336'
          }}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </span>
        </div>
        
        {isAuthenticated && user && (
          <div style={{
            fontSize: '12px',
            color: 'var(--text-2)',
            marginBottom: '4px'
          }}>
            {user.name}
          </div>
        )}
        
        {isAuthenticated ? (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-3)',
            lineHeight: '1.3'
          }}>
            Full access to export features
          </div>
        ) : (
          <Router.Link to="/home" style={{ textDecoration: 'none' }}>
            <button style={{
              width: '100%',
              padding: '8px 12px',
              marginTop: '8px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '8px',
              fontWeight: '500',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-400)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
              e.currentTarget.style.transform = 'scale(1)';
            }}>
              <span className="material-icons-round" style={{ fontSize: '12px' }}>lock</span>
              Sign in with Google
            </button>
          </Router.Link>
        )}
      </div>
      
      <ul id="nav-buttons">

        <Router.Link to="/users">
          <li>
            <bim-label style={{ color: "#fff" }} icon="mdi:users">Users</bim-label>
          </li>
        </Router.Link>
        <Router.Link to="/projects">
          <li>
            <bim-label style={{ color: "#fff" }} icon="material-symbols:apartment">Projects</bim-label>
          </li>
        </Router.Link>
        <Router.Link to="/sijaintikartta">
          <li>
            <bim-label style={{ color: "#fff" }} icon="material-symbols:map">Site Plan</bim-label>
          </li>
        </Router.Link>
        <Router.Link to="/materials">
            <li>
              <bim-label style={{ color: "#fff" }} icon="material-symbols:folder">LCA Evaluation</bim-label>
            </li>
          </Router.Link>
          <Router.Link to="/ids-report">
            <li>
              <bim-label style={{ color: "#fff" }} icon="material-symbols:verified">IDS Validation</bim-label>
            </li>
          </Router.Link>
          <Router.Link to="/about">
            <li>
              <bim-label style={{ color: "#fff" }} icon="material-symbols:info">About</bim-label>
            </li>
          </Router.Link>
      </ul>
    </aside>
  )
}