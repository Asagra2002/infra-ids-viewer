import React, { useState } from 'react';
import { useAuthStore } from '../stores/AuthStore';

export function HomePage() {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const { isAuthenticated, user, login, logout, isLoading } = useAuthStore();

  const tooltipData = {
    users: {
      title: "User Management",
      description: "Manage project users, roles, and permissions. Create, edit, and organize team members with different access levels.",
      features: ["User profiles", "Role assignment", "Team organization", "Access control"]
    },
    projects: {
      title: "Project Management", 
      description: "Create and manage construction projects. Track project details, status, and progress throughout the development lifecycle.",
      features: ["Project creation", "Status tracking", "Progress monitoring", "Document management"]
    },
    siteplan: {
      title: "Site Plan & Cadastral",
      description: "Generate official site plans for Finnish building permits. Access cadastral data, zoning information, and permit requirements.",
      features: ["Cadastral maps", "Zoning analysis", "Permit requirements", "Official documentation"]
    },
    cost: {
      title: "Cost Analysis",
      description: "Analyze construction costs using Finnish standards (TALO 2000, RT-kortti). Generate detailed BOQ reports and cost estimates.",
      features: ["Cost estimation", "BOQ generation", "Finnish standards", "Regional factors"]
    },
    lca: {
      title: "LCA Evaluation",
      description: "Evaluate environmental impacts of building materials throughout their lifecycle. Generate sustainability reports and recommendations.",
      features: ["Environmental analysis", "Material impacts", "Sustainability reports", "AI recommendations"]
    }
  };

  const Tooltip = ({ data, isVisible, position }: { 
    data: any; 
    isVisible: boolean; 
    position: { x: number; y: number } 
  }) => {
    if (!isVisible || !data) return null;

    return (
      <div style={{
        position: 'fixed',
        left: position.x + 10,
        top: position.y - 10,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '300px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        fontSize: '14px',
        color: '#ffffff',
        pointerEvents: 'none'
      }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          color: '#4fc3f7', 
          fontSize: '16px',
          fontWeight: '600'
        }}>
          {data.title}
        </h4>
        <p style={{ 
          margin: '0 0 12px 0', 
          color: '#e0e0e0', 
          lineHeight: '1.4',
          fontSize: '13px'
        }}>
          {data.description}
        </p>
        <div style={{ marginTop: '8px' }}>
          <strong style={{ color: '#ffffff', fontSize: '12px' }}>Key Features:</strong>
          <ul style={{ 
            margin: '4px 0 0 0', 
            paddingLeft: '16px',
            fontSize: '12px',
            color: '#cccccc'
          }}>
            {data.features.map((feature: string, index: number) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
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
          <span className="material-icons-round">home</span>
          Welcome
        </h2>
      </header>
      <div className="main-page-content" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)',
        background: `
          linear-gradient(135deg, rgba(32, 33, 36, 0.4) 0%, rgba(38, 40, 43, 0.3) 100%),
          url('/images/background.png')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(2, 154, 224, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(2, 154, 224, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(2, 154, 224, 0.02) 0%, transparent 50%)
          `,
          zIndex: 1
        }} />
        
        {/* Welcome Content */}
        <div style={{
          textAlign: 'center',
          zIndex: 2,
          position: 'relative',
          maxWidth: '600px',
          padding: '2rem'
        }}>
          <div style={{
            fontSize: '4rem',
            color: 'var(--primary)',
            marginBottom: '1rem',
            opacity: 0.8
          }}>
            <span className="material-icons-round" style={{ fontSize: 'inherit' }}>
              apartment
            </span>
          </div>
          
          <h1 style={{
            fontSize: '2.5rem',
            color: 'var(--text-1)',
            marginBottom: '1rem',
            fontWeight: '300'
          }}>
            Welcome to BSOTO
          </h1>
          
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-2)',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            BIM Development Platform for Finnish Construction Projects
          </p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div 
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--surface-1)',
                borderRadius: '8px',
                textAlign: 'center',
                minWidth: '120px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                setActiveTooltip('users');
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div style={{
                fontSize: '2rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem'
              }}>
                <span className="material-icons-round" style={{ fontSize: 'inherit' }}>
                  people
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Users</div>
            </div>
            
            <div 
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--surface-1)',
                borderRadius: '8px',
                textAlign: 'center',
                minWidth: '120px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                setActiveTooltip('projects');
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div style={{
                fontSize: '2rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem'
              }}>
                <span className="material-icons-round" style={{ fontSize: 'inherit' }}>
                  apartment
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Projects</div>
            </div>
            
            <div 
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--surface-1)',
                borderRadius: '8px',
                textAlign: 'center',
                minWidth: '120px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                setActiveTooltip('lca');
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div style={{
                fontSize: '2rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem'
              }}>
                <span className="material-icons-round" style={{ fontSize: 'inherit' }}>
                  folder
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>LCA</div>
            </div>
            
            <div 
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--surface-1)',
                borderRadius: '8px',
                textAlign: 'center',
                minWidth: '120px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                setActiveTooltip('cost');
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div style={{
                fontSize: '2rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem'
              }}>
                <span className="material-icons-round" style={{ fontSize: 'inherit' }}>
                  euro
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Cost</div>
            </div>
            
            <div 
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--surface-1)',
                borderRadius: '8px',
                textAlign: 'center',
                minWidth: '120px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                setActiveTooltip('siteplan');
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div style={{
                fontSize: '2rem',
                color: 'var(--primary)',
                marginBottom: '0.5rem'
              }}>
                <span className="material-icons-round" style={{ fontSize: 'inherit' }}>
                  map
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Site Plan</div>
            </div>
          </div>
          
          {/* Authentication Section */}
          {!isAuthenticated ? (
            <div style={{
              marginTop: '2rem',
              padding: '2rem',
              backgroundColor: 'rgba(38, 38, 38, 0.8)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: '500px',
              margin: '2rem auto 0'
            }}>
              <p style={{
                fontSize: '1rem',
                color: 'var(--text-2)',
                marginBottom: '1.5rem',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Authenticate to unlock all export and download features
              </p>
              
              <div style={{
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  className="google-auth-button tooltip-enhanced"
                  onClick={() => login('google')}
                  disabled={isLoading}
                  data-tooltip="Authenticate with Google to unlock all export features including IFC tasks, BOQ reports, LCAx files, BCF exports, and permit document generation"
                >
                  <span className="material-icons-round">login</span>
                  {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              maxWidth: '400px',
              margin: '2rem auto 0',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '1rem'
              }}>
                <span className="material-icons-round" style={{ color: '#4CAF50' }}>check_circle</span>
                <h3 style={{
                  color: '#4CAF50',
                  margin: 0,
                  fontSize: '1.2rem',
                  fontWeight: '600'
                }}>
                  Welcome, {user?.name}!
                </h3>
              </div>
              
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-2)',
                marginBottom: '1rem',
                lineHeight: '1.4'
              }}>
                You have full access to all export and download features. 
                Select a module from the sidebar to get started.
              </p>
              
              <button
                onClick={logout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                  e.currentTarget.style.borderColor = '#F44336';
                  e.currentTarget.style.color = '#F44336';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-2)';
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '16px', marginRight: '4px' }}>logout</span>
                Sign Out
              </button>
            </div>
          )}
          
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-3)',
            marginTop: '2rem',
            fontStyle: 'italic'
          }}>
            Select a module from the sidebar to get started
          </p>
        </div>
      </div>
      
      {/* Tooltip Component */}
      <Tooltip 
        data={activeTooltip ? tooltipData[activeTooltip as keyof typeof tooltipData] : null}
        isVisible={!!activeTooltip}
        position={tooltipPosition}
      />
    </div>
  );
}
