import React from 'react';

export function AboutPage() {
  return (
    <div className="page">
      <div className="main-page-content" style={{
        background: `
          linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%),
          url('/images/background.png') center/cover no-repeat,
          radial-gradient(circle at 20% 80%, rgba(2, 154, 224, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(2, 154, 224, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(2, 154, 224, 0.02) 0%, transparent 50%)
        `,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 1rem'
      }}>
        

        
        {/* About Content */}
        <div style={{
          position: 'relative',
          maxWidth: '1200px',
          width: '100%'
        }}>
          

          
          {/* Project Overview */}
          <div style={{
            backgroundColor: 'rgba(38, 38, 38, 0.9)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              color: 'var(--primary)',
              marginBottom: '1rem',
              fontSize: '1.2rem',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              BSOTO - BIM with Fragments 3
            </h2>
            <p style={{
              color: 'var(--text-2)',
              lineHeight: '1.6',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              textAlign: 'center',
              maxWidth: '900px',
              margin: '0 auto 1.5rem'
            }}>
              BSOTO is a comprehensive BIM development platform built with That Open Company Fragments 3 components, designed specifically for Finnish construction projects. 
              It integrates Life Cycle Assessment (LCA), cost estimation, project management, and official documentation 
              for building permits, all within a unified, professional-grade application.
            </p>
            
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 193, 7, 0.15)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                color: '#ffc107',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                <span className="material-icons-round" style={{ fontSize: '1rem' }}>info</span>
                <strong>Status: Evaluation Phase</strong>
              </div>
              <p style={{
                color: 'var(--text-2)',
                fontSize: '0.9rem',
                margin: 0,
                lineHeight: '1.4'
              }}>
                This application is currently in evaluation and development phase. 
                Features may be subject to changes and continuous improvements.
              </p>
            </div>
          </div>

          {/* Key Features */}
          <div style={{
            backgroundColor: 'rgba(38, 38, 38, 0.9)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              color: 'var(--primary)',
              marginBottom: '1.5rem',
              fontSize: '1.2rem',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Key Features
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}>
              <div>
                <h3 style={{
                  color: 'var(--text-1)',
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  Project Management
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    User and Project Management
                  </li>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    BIM Visualization (IFC 4.3)
                  </li>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    Document Management
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 style={{
                  color: 'var(--text-1)',
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  Analysis & Assessment
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    Life Cycle Assessment (LCA)
                  </li>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    Cost Estimation (TALO 2000, RT-kortti)
                  </li>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    Environmental Impact Analysis
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 style={{
                  color: 'var(--text-1)',
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  Documentation & Export
                </h3>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    Professional BOQ Export
                  </li>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    Site Plans & Cadastral Data
                  </li>
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>check_circle</span>
                    Building Permit Documentation
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Data Sources & Credits */}
          <div style={{
            backgroundColor: 'rgba(38, 38, 38, 0.9)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              color: 'var(--primary)',
              marginBottom: '1.5rem',
              fontSize: '1.2rem',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Data Sources & Credits
            </h2>
            <p style={{
              color: 'var(--text-2)',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              This application uses data from the following providers for mapping, cadastral information, and geospatial visualization:
            </p>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-2)', fontSize: '0.9rem' }}>
                <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>map</span>
                <strong>OpenStreetMap</strong> — © OpenStreetMap contributors
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-2)', fontSize: '0.9rem' }}>
                <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>map</span>
                <strong>MapTiler</strong> — © MapTiler © OpenStreetMap contributors
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-2)', fontSize: '0.9rem' }}>
                <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>terrain</span>
                <strong>Maanmittauslaitos (MML)</strong> — © Maanmittauslaitos — Finnish National Land Survey, topographic maps, orthophotos and cadastral data
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-2)', fontSize: '0.9rem' }}>
                <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>public</span>
                <strong>Cesium</strong> — 3D geospatial visualization and terrain
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-2)', fontSize: '0.9rem' }}>
                <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>eco</span>
                <strong>CO2data.fi</strong> — Environmental impact database
              </li>
            </ul>
          </div>

          {/* Technical Stack & Developer Information */}
          <div style={{
            backgroundColor: 'rgba(38, 38, 38, 0.9)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem'
          }}>
            <h2 style={{
              color: 'var(--primary)',
              marginBottom: '1.5rem',
              fontSize: '1.2rem',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Technical Stack & Developer Information
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '2rem'
            }}>
              
              {/* Technical Stack Section */}
              <div>
                <h3 style={{
                  color: 'var(--primary)',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  textAlign: 'left'
                }}>
                  Core Technologies
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1.2rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '500', minWidth: '90px', fontSize: '0.9rem' }}>Frontend:</span>
                    <span style={{ fontSize: '0.9rem' }}>React 18.2.0</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '500', minWidth: '90px', fontSize: '0.9rem' }}>Language:</span>
                    <span style={{ fontSize: '0.9rem' }}>TypeScript 5.4.2</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '500', minWidth: '90px', fontSize: '0.9rem' }}>Build Tool:</span>
                    <span style={{ fontSize: '0.9rem' }}>Vite 4.5.3</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '500', minWidth: '90px', fontSize: '0.9rem' }}>State Management:</span>
                    <span style={{ fontSize: '0.9rem' }}>Zustand 5.0.3</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '500', minWidth: '90px', fontSize: '0.9rem' }}>Backend:</span>
                    <span style={{ fontSize: '0.9rem' }}>Firebase 10.5.2</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{ color: 'var(--primary)', fontWeight: '500', minWidth: '90px', fontSize: '0.9rem' }}>BIM Framework:</span>
                    <span style={{ fontSize: '0.9rem' }}>@thatopen 2.4.0</span>
                  </div>
                </div>
                
                
              </div>
              
              {/* Developer Information Section */}
              <div>
                <h3 style={{
                  color: 'var(--primary)',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  textAlign: 'left'
                }}>
                  Developer Information
                </h3>
                
                {/* Contact Details */}
                <div style={{
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{
                    color: 'var(--text-1)',
                    marginBottom: '0.8rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    textAlign: 'left'
                  }}>
                    Contact Details
                  </h4>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    color: 'var(--text-2)',
                    fontSize: '0.9rem',
                    justifyContent: 'center'
                  }}>
                    <span className="material-icons-round" style={{ fontSize: '1rem', color: 'var(--primary)' }}>person</span>
                    Bruno Soto Robles
                  </div>
                </div>
                
                {/* Professional Links */}
                <div>
                  <h4 style={{
                    color: 'var(--text-1)',
                    marginBottom: '0.8rem',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    textAlign: 'left'
                  }}>
                    Professional Links
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    alignItems: 'flex-start'
                  }}>
                    <a href="https://www.linkedin.com/in/bruno-soto-robles/" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         gap: '0.5rem',
                         color: 'var(--primary)',
                         textDecoration: 'none',
                         fontSize: '0.9rem',
                         transition: 'all 0.2s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.opacity = '0.8';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.opacity = '1';
                       }}>
                      <span className="material-icons-round" style={{ fontSize: '1rem' }}>link</span>
                      LinkedIn Profile
                    </a>
                    <a href="https://github.com/Asagra2002" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         gap: '0.5rem',
                         color: 'var(--primary)',
                         textDecoration: 'none',
                         fontSize: '0.9rem',
                         transition: 'all 0.2s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.opacity = '0.8';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.opacity = '1';
                       }}>
                      <span className="material-icons-round" style={{ fontSize: '1rem' }}>link</span>
                      GitHub Repository
                    </a>
                    <a href="https://co2data.fi/" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       style={{
                         display: 'flex',
                         alignItems: 'center',
                         gap: '0.5rem',
                         color: 'var(--primary)',
                         textDecoration: 'none',
                         fontSize: '0.9rem',
                         transition: 'all 0.2s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.opacity = '0.8';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.opacity = '1';
                       }}>
                      <span className="material-icons-round" style={{ fontSize: '1rem' }}>link</span>
                      CO2Data.fi Database
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
