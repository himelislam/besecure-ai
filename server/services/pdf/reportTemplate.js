const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
};

const GRADE_COLORS = {
  'A+': '#16a34a',
  A: '#16a34a',
  B: '#65a30d',
  C: '#eab308',
  D: '#f97316',
  F: '#dc2626',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function severityBadge(severity) {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;
  return `<span class="badge" style="background:${color}">${escapeHtml(String(severity).toUpperCase())}</span>`;
}

function buildCoverSection(website, scan, generatedAt) {
  const gradeColor = GRADE_COLORS[scan.grade] || '#6b7280';
  return `
  <section class="cover">
    <div class="logo">🛡 Security Audit Platform</div>
    <h1>Web Security Audit Report</h1>
    <p class="cover-website">${escapeHtml(website?.domain || scan.targetUrl)}</p>
    <p class="cover-date">Report generated ${formatDate(generatedAt)}</p>
    <div class="score-circle" style="border-color:${gradeColor}">
      <div class="score-value">${scan.score ?? '—'}</div>
      <div class="score-label">/ 100</div>
    </div>
    <div class="grade-badge" style="background:${gradeColor}">Grade ${escapeHtml(scan.grade || 'N/A')}</div>
    <p class="cover-meta">Scan type: ${scan.type === 'deep' ? 'Deep Scan (Active)' : 'Baseline Scan (Passive)'}</p>
    <p class="disclaimer">Automated scanning only. Results may include false positives. Not a substitute for professional penetration testing.</p>
  </section>`;
}

function buildExecutiveSummarySection(executiveSummary) {
  return `
  <section class="page">
    <h2>Executive Summary</h2>
    <span class="ai-badge">AI-Assisted Guidance</span>
    <p class="summary-text">${escapeHtml(executiveSummary || 'No summary available.').replace(/\n+/g, '</p><p class="summary-text">')}</p>
  </section>`;
}

function buildScoreBreakdownSection(scan) {
  const counts = scan.findingCounts || {};
  const rows = ['critical', 'high', 'medium', 'low', 'info']
    .map(
      (sev) => `
      <tr>
        <td>${severityBadge(sev)}</td>
        <td class="count-cell">${counts[sev] ?? 0}</td>
      </tr>`
    )
    .join('');

  return `
  <section class="page">
    <h2>Security Score Breakdown</h2>
    <table class="data-table">
      <thead><tr><th>Severity</th><th>Count</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function buildVulnerabilityTableSection(vulnerabilities) {
  const rows = vulnerabilities
    .map(
      (v) => `
      <tr>
        <td>${severityBadge(v.severity)}</td>
        <td>${escapeHtml(v.title)}</td>
        <td>${escapeHtml(v.owaspCategory)}</td>
        <td>${escapeHtml(v.status)}</td>
      </tr>`
    )
    .join('');

  return `
  <section class="page">
    <h2>Vulnerability Findings</h2>
    <table class="data-table">
      <thead><tr><th>Severity</th><th>Title</th><th>OWASP</th><th>Status</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">No findings recorded.</td></tr>'}</tbody>
    </table>
  </section>`;
}

function buildDetailedFindingSection(title, findings) {
  if (findings.length === 0) return '';

  const cards = findings
    .map(
      (v) => `
      <div class="finding-card" style="border-left-color:${SEVERITY_COLORS[v.severity] || '#6b7280'}">
        <h3>${severityBadge(v.severity)} ${escapeHtml(v.title)}</h3>
        <p><strong>Category:</strong> ${escapeHtml(v.category)} &nbsp;|&nbsp; <strong>OWASP:</strong> ${escapeHtml(v.owaspCategory)} — ${escapeHtml(v.owaspTitle)}</p>
        <p>${escapeHtml(v.description)}</p>
        ${v.evidence ? `<p><strong>Evidence:</strong> ${escapeHtml(v.evidence)}</p>` : ''}
        <p><strong>Recommendation:</strong> ${escapeHtml(v.recommendation)}</p>
      </div>`
    )
    .join('');

  return `
  <section class="page">
    <h2>${escapeHtml(title)}</h2>
    ${cards}
  </section>`;
}

function buildOwaspBreakdownSection(vulnerabilities) {
  const counts = {};
  for (const v of vulnerabilities) {
    counts[v.owaspCategory] = (counts[v.owaspCategory] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const rows = entries
    .map(
      ([owasp, count]) => `
      <tr>
        <td>${escapeHtml(owasp)}</td>
        <td class="count-cell">${count}</td>
      </tr>`
    )
    .join('');

  return `
  <section class="page">
    <h2>OWASP Top 10 Category Breakdown</h2>
    <table class="data-table">
      <thead><tr><th>OWASP Category</th><th>Findings</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="2">No findings recorded.</td></tr>'}</tbody>
    </table>
  </section>`;
}

function buildRoadmapSection(roadmap) {
  if (!roadmap || !Array.isArray(roadmap.steps) || roadmap.steps.length === 0) return '';

  const items = roadmap.steps
    .map(
      (s) => `
      <li>
        <strong>Week ${escapeHtml(s.week)}:</strong> ${escapeHtml(s.title)}
        ${s.severity ? severityBadge(s.severity) : ''}
        <p>${escapeHtml(s.why)}</p>
      </li>`
    )
    .join('');

  return `
  <section class="page">
    <h2>AI Recommendations Summary</h2>
    <span class="ai-badge">AI-Assisted Guidance</span>
    ${roadmap.summary ? `<p class="summary-text">${escapeHtml(roadmap.summary)}</p>` : ''}
    <ol class="roadmap-list">${items}</ol>
  </section>`;
}

function buildRemediationChecklistSection(vulnerabilities) {
  const openFindings = vulnerabilities.filter((v) => !['closed', 'false_positive', 'verified'].includes(v.status));

  const items = openFindings
    .map(
      (v) => `
      <li class="checklist-item">
        <span class="checkbox"></span>
        <span>${severityBadge(v.severity)} ${escapeHtml(v.title)} — ${escapeHtml(v.recommendation)}</span>
      </li>`
    )
    .join('');

  return `
  <section class="page">
    <h2>Remediation Checklist</h2>
    <ul class="checklist">${items || '<li>No open findings — nothing to remediate.</li>'}</ul>
  </section>`;
}

export function buildReportHtml(reportData) {
  const { website, scan, vulnerabilities = [], roadmap, executiveSummary, generatedAt } = reportData;

  const critical = vulnerabilities.filter((v) => v.severity === 'critical');
  const high = vulnerabilities.filter((v) => v.severity === 'high');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1f2937;
    margin: 0;
    padding: 0;
    font-size: 12px;
    line-height: 1.5;
  }
  h1 { font-size: 26px; margin: 16px 0 4px; }
  h2 { font-size: 18px; margin: 0 0 12px; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
  h3 { font-size: 14px; margin: 0 0 6px; }
  p { margin: 0 0 8px; }
  .page { page-break-before: always; padding-top: 8px; }
  .cover { text-align: center; padding: 60px 20px; }
  .logo { font-size: 16px; font-weight: bold; color: #111827; margin-bottom: 40px; }
  .cover-website { font-size: 20px; font-weight: bold; color: #374151; margin: 8px 0; }
  .cover-date { color: #6b7280; margin-bottom: 40px; }
  .cover-meta { color: #6b7280; margin-top: 16px; }
  .score-circle {
    width: 140px; height: 140px; border-radius: 50%; border: 8px solid #e5e7eb;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }
  .score-value { font-size: 40px; font-weight: bold; color: #111827; }
  .score-label { font-size: 12px; color: #6b7280; }
  .grade-badge {
    display: inline-block; color: #fff; font-weight: bold; font-size: 16px;
    padding: 6px 20px; border-radius: 999px; margin-bottom: 24px;
  }
  .disclaimer { font-size: 10px; color: #9ca3af; margin-top: 60px; max-width: 420px; margin-left: auto; margin-right: auto; }
  .badge {
    display: inline-block; color: #fff; font-size: 10px; font-weight: bold;
    padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;
  }
  .ai-badge {
    display: inline-block; background: #ede9fe; color: #6d28d9; font-size: 10px; font-weight: bold;
    padding: 3px 10px; border-radius: 999px; margin-bottom: 12px;
  }
  .summary-text { text-align: justify; }
  .data-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .data-table th, .data-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  .data-table th { background: #f9fafb; font-size: 11px; text-transform: uppercase; color: #6b7280; }
  .count-cell { font-weight: bold; }
  .finding-card {
    border-left: 4px solid #6b7280; background: #f9fafb; padding: 12px 16px; margin-bottom: 14px; border-radius: 4px;
  }
  .roadmap-list { padding-left: 20px; }
  .roadmap-list li { margin-bottom: 12px; }
  .checklist { list-style: none; padding: 0; }
  .checklist-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
  .checkbox { width: 12px; height: 12px; border: 2px solid #9ca3af; border-radius: 2px; margin-top: 2px; flex-shrink: 0; }
  footer { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 30px; }
</style>
</head>
<body>
  ${buildCoverSection(website, scan, generatedAt)}
  ${buildExecutiveSummarySection(executiveSummary)}
  ${buildScoreBreakdownSection(scan)}
  ${buildVulnerabilityTableSection(vulnerabilities)}
  ${buildDetailedFindingSection('Detailed Findings — Critical Severity', critical)}
  ${buildDetailedFindingSection('Detailed Findings — High Severity', high)}
  ${buildOwaspBreakdownSection(vulnerabilities)}
  ${buildRoadmapSection(roadmap)}
  ${buildRemediationChecklistSection(vulnerabilities)}
</body>
</html>`;
}

export default buildReportHtml;
