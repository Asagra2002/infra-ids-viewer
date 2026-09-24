import * as React from "react";
import * as Router from "react-router-dom";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

interface Props {}

interface IDSReportData {
  report: any;
  results: any[];
  timestamp: string;
  modelName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  BUILDING: "Building data",
  SITE: "Site / plot",
  SPACE: "Spaces",
  DOOR: "Doors",
  WINDOW: "Windows",
  WALL: "Walls",
  SLAB: "Slabs",
  ROOF: "Roof",
  COLUMN: "Columns",
  BEAM: "Beams",
  STAIR: "Stairs",
  RAMP: "Ramps",
  FURNISHING: "Furnishing",
  ELEMENT: "Elements",
  PROJECT: "Project",
};

const USEFUL_LINKS = [
  { label: "buildingSMART IDS", href: "https://technical.buildingsmart.org/standards/ids/", icon: "open_in_new" },
  { label: "BCF (BIM Collaboration Format)", href: "https://technical.buildingsmart.org/standards/bcf/", icon: "open_in_new" },
];

function getCategoryLabel(entityType: string): string {
  const key = (entityType || "").toUpperCase().replace(/^IFC/, "");
  return CATEGORY_LABELS[key] || entityType || "Other";
}

export function IDSReportPage(props: Props) {
  const [reportData, setReportData] = React.useState<IDSReportData | null>(null);
  const [filteredFailures, setFilteredFailures] = React.useState<any[]>([]);
  const [filterEntity, setFilterEntity] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ids-last-report");
      if (stored) {
        const data = JSON.parse(stored);
        setReportData(data);
        setFilteredFailures(data.report.failures || []);
      } else {
        console.warn("No IDS report available");
      }
    } catch (error) {
      console.error("Error loading IDS report:", error);
    }
  }, []);

  React.useEffect(() => {
    if (!reportData) return;
    let filtered = [...(reportData.report.failures || [])];
    if (filterEntity !== "all") filtered = filtered.filter((f: any) => f.entityType === filterEntity);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.map((f: any) => ({
        ...f,
        checks: (f.checks || []).filter(
          (c: any) =>
            (c.specName || "").toLowerCase().includes(term) ||
            (c.details || "").toLowerCase().includes(term) ||
            (f.entityName || "").toLowerCase().includes(term) ||
            (f.entityType || "").toLowerCase().includes(term)
        ),
      })).filter((f: any) => (f.checks || []).length > 0);
    }
    setFilteredFailures(filtered);
  }, [reportData, filterEntity, searchTerm]);

  const categoryOverview = React.useMemo(() => {
    if (!reportData?.report?.failures) return [];
    const map = new Map<string, { failed: number }>();
    for (const f of reportData.report.failures) {
      const type = f.entityType || "Other";
      const cur = map.get(type) || { failed: 0 };
      cur.failed += 1;
      map.set(type, cur);
    }
    return Array.from(map.entries())
      .map(([entityType, { failed }]) => ({
        entityType,
        label: getCategoryLabel(entityType),
        failedCount: failed,
      }))
      .sort((a, b) => b.failedCount - a.failedCount);
  }, [reportData]);

  const exportChecklistExcel = () => {
    if (!reportData) return;
    const wb = XLSX.utils.book_new();
    const summary = [
      ["IDS – Project validation checklist"],
      [],
      ["Model", reportData.modelName],
      ["Date", new Date(reportData.timestamp).toLocaleString()],
      [],
      ["Total elements", reportData.report.summary.total],
      ["Passed", reportData.report.summary.passed],
      ["Failed", reportData.report.summary.failed],
      ["Pass rate", `${(reportData.report.summary.passRate ?? 0).toFixed(1)}%`],
    ];
    XLSX.utils.book_append_sheet(XLSX.utils.aoa_to_sheet(summary), wb, "Summary");

    const checklistRows = [
      ["Category", "Failed count", "Status", "Notes"],
      ...categoryOverview.map((c) => [
        c.label,
        c.failedCount,
        c.failedCount === 0 ? "Done" : "Pending",
        c.failedCount === 0 ? "" : "Fix in authoring tool and re-validate; use BCF for details.",
      ]),
    ];
    XLSX.utils.book_append_sheet(XLSX.utils.aoa_to_sheet(checklistRows), wb, "Checklist");

    const timestamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `IDS-Validation-Checklist-${timestamp}.xlsx`);
  };

  const exportChecklistPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    const date = new Date(reportData.timestamp).toLocaleString();
    doc.setFontSize(14);
    doc.text("IDS – Project validation checklist", 14, 20);
    doc.setFontSize(10);
    doc.text(`Model: ${reportData.modelName}`, 14, 28);
    doc.text(`Date: ${date}`, 14, 34);
    doc.text(`Pass rate: ${(reportData.report.summary.passRate ?? 0).toFixed(1)}% (${reportData.report.summary.passed}/${reportData.report.summary.total} passed)`, 14, 40);
    let y = 52;
    doc.setFontSize(11);
    doc.text("Category", 14, y);
    doc.text("Failed", 80, y);
    doc.text("Status", 110, y);
    y += 6;
    doc.setFontSize(10);
    for (const c of categoryOverview) {
      doc.text(c.label, 14, y);
      doc.text(String(c.failedCount), 80, y);
      doc.text(c.failedCount === 0 ? "Done" : "Pending", 110, y);
      y += 6;
    }
    const timestamp = new Date().toISOString().split("T")[0];
    doc.save(`IDS-Validation-Checklist-${timestamp}.pdf`);
  };

  const exportToJSON = () => {
    if (!reportData) return;
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IDS-Report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!reportData) {
    return (
      <div className="page">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>No report available</h2>
          <p>Run IDS validation from the viewer to generate a report.</p>
          <Router.Link to="/home">
            <button className="button-primary">Back to home</button>
          </Router.Link>
        </div>
      </div>
    );
  }

  const { report } = reportData;
  const failuresList = report.failures || [];
  const entityTypes = Array.from(new Set(failuresList.map((f: any) => f.entityType)));
  const maxFailed = Math.max(1, ...categoryOverview.map((c) => c.failedCount));

  return (
    <div className="page">
      <header style={{
        padding: "1rem 2rem",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "24px",
        flexWrap: "wrap",
      }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "1.5rem" }}>
            <span className="material-icons-round">verified</span>
            IDS Validation
          </h2>
          <p style={{ margin: "0.5rem 0 0 0", color: "var(--text-2)", fontSize: "0.875rem" }}>
            {reportData.modelName} · {new Date(reportData.timestamp).toLocaleString()}
            {(reportData as any).idsFileName ? ` · ${(reportData as any).idsFileName}` : ""}
          </p>
          <Router.Link to="/home" style={{ fontSize: "0.8rem", color: "#2196f3", textDecoration: "none", marginTop: "0.25rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span className="material-icons-round" style={{ fontSize: "1rem" }}>arrow_back</span>
            Back to project
          </Router.Link>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="button-primary" onClick={exportChecklistExcel} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-icons-round">table_chart</span>
            Checklist (Excel)
          </button>
          <button className="button-secondary" onClick={exportChecklistPDF} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-icons-round">picture_as_pdf</span>
            Checklist (PDF)
          </button>
          <button className="button-secondary" onClick={exportToJSON} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-icons-round">code</span>
            Full data (JSON)
          </button>
        </div>
      </header>

      <div className="main-page-content" style={{ padding: '2rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            padding: '1.5rem',
            background: 'var(--surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>Total elements</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{report.summary.total}</div>
          </div>
          <div style={{
            padding: '1.5rem',
            background: 'var(--surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>Passed</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>{report.summary.passed}</div>
          </div>
          <div style={{
            padding: '1.5rem',
            background: 'var(--surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>Failed</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f44336' }}>{report.summary.failed}</div>
          </div>
          <div style={{
            padding: '1.5rem',
            background: 'var(--surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>Pass rate</div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold',
              color: (report.summary.passRate ?? 0) >= 80 ? '#4caf50' : (report.summary.passRate ?? 0) >= 50 ? '#ff9800' : '#f44336'
            }}>
              {(report.summary.passRate ?? 0).toFixed(1)}%
            </div>
          </div>
        </div>

        {report.summary.viewScreenshot && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>Context at validation time</div>
            <img
              src={report.summary.viewScreenshot}
              alt="View at validation"
              style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>
        )}

        {report.summary.failed > 0 && (
          <div style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            background: "rgba(33, 150, 243, 0.08)",
            border: "1px solid rgba(33, 150, 243, 0.3)",
            borderRadius: "8px",
            borderLeft: "4px solid #2196f3",
          }}>
            <div style={{ fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="material-icons-round" style={{ fontSize: "1.1rem" }}>info</span>
              Fix issues in your authoring tool using BCF
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.5 }}>
              The BCF file is the only technical document you need for corrections. In the viewer: run validation, then open the <strong>BCF</strong> panel, click <strong>Generate BCF from IDS validation</strong>, and <strong>Download BCF for BIM tools</strong>. Open the .bcfzip in any BIM collaboration software (e.g. Archicad, Revit) to see each issue with viewpoints and fix them there.
            </div>
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "1.5rem",
          marginBottom: "1.5rem",
          alignItems: "start",
        }}>
          <div style={{
            background: "var(--surface-1)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            padding: "1rem",
          }}>
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem" }}>Overview by category</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {categoryOverview.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-2)" }}>No failures</p>
              ) : (
                categoryOverview.map((c) => (
                  <div key={c.entityType} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ width: 120, fontSize: "0.875rem" }}>{c.label}</span>
                    <div style={{ flex: 1, height: 20, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${(c.failedCount / maxFailed) * 100}%`,
                          height: "100%",
                          background: c.failedCount > 0 ? "#f44336" : "#4caf50",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, minWidth: 24 }}>{c.failedCount}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div style={{
            background: "var(--surface-1)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            padding: "1rem",
          }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Useful links</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {USEFUL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.875rem", color: "#2196f3", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <span className="material-icons-round" style={{ fontSize: "1rem" }}>open_in_new</span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--surface-1)",
              color: "var(--text-1)",
              flex: "1",
              minWidth: "180px",
            }}
          />
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--surface-1)",
              color: "var(--text-1)",
            }}
          >
            <option value="all">All categories</option>
            {entityTypes.map((type: string) => (
              <option key={type} value={type}>{getCategoryLabel(type)}</option>
            ))}
          </select>
        </div>

        <div style={{
          background: "var(--surface-1)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ margin: 0 }}>Failures detail ({filteredFailures.reduce((sum, f) => sum + (f.checks?.length ?? 0), 0)})</h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "var(--text-2)" }}>For corrections, use the BCF exported from the viewer.</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Entity</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Failed spec</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredFailures.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-2)' }}>
                      No failures match the filters
                    </td>
                  </tr>
                ) : (
                  filteredFailures.map((failure: any, idx: number) =>
                    (failure.checks || []).map((check: any, checkIdx: number) => (
                      <tr key={`${idx}-${checkIdx}`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>{failure.expressID}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: '500' }}>{failure.entityType}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{failure.entityName}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{check.specName || check.propertySet || '-'}</td>
                        <td style={{ padding: '0.75rem', maxWidth: '300px' }}>
                          <div style={{ fontSize: '0.875rem' }}>{check.details || '-'}</div>
                          {check.ravaInfo?.tayttoohje && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '0.25rem' }}>
                              {check.ravaInfo.tayttoohje}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {Array.isArray(report.koodistoReferences) && report.koodistoReferences.length > 0 && (
          <div style={{
            marginTop: '2rem',
            background: 'var(--surface-1)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            padding: '1.5rem'
          }}>
            <h3 style={{ marginTop: 0 }}>Official code list references</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {report.koodistoReferences.map((ref: any, idx: number) => (
                <div key={idx} style={{
                  padding: '0.75rem',
                  background: 'var(--surface-2)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{ref.name || 'Unnamed'}</strong>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
                      Used in {ref.usedInChecks} checks
                    </div>
                  </div>
                  <a href={ref.uri} target="_blank" rel="noopener noreferrer" style={{ color: '#64b5f6', textDecoration: 'none' }}>
                    View official code →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
