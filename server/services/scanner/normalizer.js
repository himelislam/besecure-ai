import crypto from 'crypto';

export const OWASP_CATEGORIES = {
  A01: 'Broken Access Control',
  A02: 'Cryptographic Failures',
  A03: 'Injection',
  A04: 'Insecure Design',
  A05: 'Security Misconfiguration',
  A06: 'Vulnerable and Outdated Components',
  A07: 'Identification and Authentication Failures',
  A08: 'Software and Data Integrity Failures',
  A09: 'Security Logging and Monitoring Failures',
  A10: 'Server-Side Request Forgery',
};

const HEADER_TEST_DEFINITIONS = {
  'content-security-policy': {
    title: 'Missing or Weak Content-Security-Policy Header',
    severity: 'medium',
    owaspCategory: 'A05',
    category: 'Security Headers',
    description:
      'The Content-Security-Policy header restricts which sources of content (scripts, styles, images, etc.) a browser is allowed to load, mitigating XSS and data-injection attacks.',
    recommendation:
      'Add a Content-Security-Policy header that restricts script, style, and other resource origins to trusted sources.',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy'],
  },
  'strict-transport-security': {
    title: 'Missing Strict-Transport-Security (HSTS) Header',
    severity: 'high',
    owaspCategory: 'A02',
    category: 'Security Headers',
    description:
      'HSTS instructs browsers to only connect to the site over HTTPS, preventing protocol downgrade and cookie hijacking attacks.',
    recommendation:
      'Add a Strict-Transport-Security header with a long max-age (e.g. 1 year) and includeSubDomains.',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'],
  },
  'x-frame-options': {
    title: 'Missing X-Frame-Options Header',
    severity: 'medium',
    owaspCategory: 'A05',
    category: 'Security Headers',
    description:
      'X-Frame-Options prevents the page from being embedded in an iframe on another site, protecting against clickjacking attacks.',
    recommendation: 'Add X-Frame-Options: DENY or SAMEORIGIN (or use CSP frame-ancestors).',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options'],
  },
  'x-content-type-options': {
    title: 'Missing X-Content-Type-Options Header',
    severity: 'low',
    owaspCategory: 'A05',
    category: 'Security Headers',
    description:
      'This header prevents browsers from MIME-sniffing a response away from the declared Content-Type, reducing exposure to drive-by download attacks.',
    recommendation: 'Add X-Content-Type-Options: nosniff to all responses.',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
  },
  'referrer-policy': {
    title: 'Missing or Weak Referrer-Policy Header',
    severity: 'low',
    owaspCategory: 'A05',
    category: 'Security Headers',
    description:
      'The Referrer-Policy header controls how much referrer information is included with requests, preventing sensitive URL data from leaking to third parties.',
    recommendation: 'Add Referrer-Policy: strict-origin-when-cross-origin or stricter.',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy'],
  },
  cookies: {
    title: 'Insecure Cookie Configuration',
    severity: 'high',
    owaspCategory: 'A07',
    category: 'Cookie Security',
    description:
      'Cookies missing Secure, HttpOnly, or SameSite attributes can be intercepted or exploited via cross-site scripting/request forgery.',
    recommendation: 'Set Secure, HttpOnly, and SameSite attributes on all session and sensitive cookies.',
    references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies'],
  },
  redirection: {
    title: 'Insecure HTTP-to-HTTPS Redirection',
    severity: 'medium',
    owaspCategory: 'A02',
    category: 'Transport Security',
    description:
      'The site does not properly redirect HTTP requests to HTTPS, leaving initial requests exposed to interception.',
    recommendation:
      'Ensure all HTTP requests are redirected to HTTPS with a 301/308 redirect before any sensitive data is exchanged.',
    references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'],
  },
  'subresource-integrity': {
    title: 'Missing Subresource Integrity (SRI) on External Scripts',
    severity: 'low',
    owaspCategory: 'A08',
    category: 'Software and Data Integrity',
    description:
      'Subresource Integrity ensures externally hosted scripts/styles have not been tampered with by verifying a cryptographic hash before executing them.',
    recommendation:
      'Add integrity and crossorigin attributes to script/link tags that load resources from third-party origins.',
    references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity'],
  },
};

export function normalizeObservatory(result, targetUrl) {
  if (!result?.tests) return [];

  const findings = [];

  for (const [testKey, definition] of Object.entries(HEADER_TEST_DEFINITIONS)) {
    const test = result.tests[testKey];
    if (!test || test.pass) continue;

    findings.push({
      toolFindingId: `observatory:${testKey}`,
      title: definition.title,
      description: definition.description,
      severity: definition.severity,
      category: definition.category,
      owaspCategory: definition.owaspCategory,
      owaspTitle: OWASP_CATEGORIES[definition.owaspCategory],
      evidence: test.result || 'Check failed',
      affectedUrl: targetUrl,
      recommendation: definition.recommendation,
      references: definition.references,
      detectedBy: 'observatory',
    });
  }

  return findings;
}

function daysUntil(dateStr) {
  const target = new Date(dateStr).getTime();
  return Math.floor((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export function normalizeSSLyze(result, targetUrl) {
  const findings = [];
  const serverResult = result?.server_scan_results?.[0]?.scan_result;
  if (!serverResult) return findings;

  const certDeployment = serverResult.certificate_info?.result?.certificate_deployments?.[0];
  if (certDeployment) {
    const isTrusted = certDeployment.path_validation_results?.some((r) => r.was_validation_successful);
    if (!isTrusted) {
      findings.push({
        toolFindingId: 'sslyze:certificate-untrusted',
        title: 'SSL Certificate Not Trusted',
        description:
          'The SSL/TLS certificate presented by the server could not be validated against a trusted certificate authority, or is self-signed.',
        severity: 'high',
        category: 'SSL/TLS',
        owaspCategory: 'A02',
        owaspTitle: OWASP_CATEGORIES.A02,
        evidence: 'Certificate chain failed validation against all trust stores checked',
        affectedUrl: targetUrl,
        recommendation: 'Install a certificate issued by a publicly trusted Certificate Authority.',
        references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'],
        detectedBy: 'sslyze',
      });
    }

    const notAfter = certDeployment.received_certificate_chain?.[0]?.not_valid_after;
    if (notAfter) {
      const days = daysUntil(notAfter);
      if (days < 0) {
        findings.push({
          toolFindingId: 'sslyze:certificate-expired',
          title: 'SSL Certificate Has Expired',
          description: 'The SSL/TLS certificate presented by the server has passed its expiry date.',
          severity: 'critical',
          category: 'SSL/TLS',
          owaspCategory: 'A02',
          owaspTitle: OWASP_CATEGORIES.A02,
          evidence: `Certificate expired on ${notAfter}`,
          affectedUrl: targetUrl,
          recommendation: 'Renew the SSL/TLS certificate immediately.',
          references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'],
          detectedBy: 'sslyze',
        });
      } else if (days < 30) {
        findings.push({
          toolFindingId: 'sslyze:certificate-expiring-soon',
          title: 'SSL Certificate Expiring Soon',
          description: 'The SSL/TLS certificate presented by the server will expire within 30 days.',
          severity: 'medium',
          category: 'SSL/TLS',
          owaspCategory: 'A02',
          owaspTitle: OWASP_CATEGORIES.A02,
          evidence: `Certificate expires on ${notAfter} (${days} days remaining)`,
          affectedUrl: targetUrl,
          recommendation: 'Renew the SSL/TLS certificate before it expires.',
          references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'],
          detectedBy: 'sslyze',
        });
      }
    }
  }

  const acceptedCount = (key) => serverResult[key]?.result?.accepted_cipher_suites?.length || 0;

  if (acceptedCount('ssl_2_0_cipher_suites') > 0 || acceptedCount('ssl_3_0_cipher_suites') > 0) {
    findings.push({
      toolFindingId: 'sslyze:ssl-2-3-enabled',
      title: 'Deprecated SSL 2.0/3.0 Protocol Supported',
      description:
        'The server accepts connections using SSL 2.0 and/or SSL 3.0, both of which are cryptographically broken and deprecated.',
      severity: 'critical',
      category: 'SSL/TLS',
      owaspCategory: 'A02',
      owaspTitle: OWASP_CATEGORIES.A02,
      evidence: 'Server accepted at least one SSL 2.0 or SSL 3.0 cipher suite',
      affectedUrl: targetUrl,
      recommendation: 'Disable SSL 2.0 and SSL 3.0 support on the server entirely.',
      references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'],
      detectedBy: 'sslyze',
    });
  }

  if (acceptedCount('tls_1_0_cipher_suites') > 0 || acceptedCount('tls_1_1_cipher_suites') > 0) {
    findings.push({
      toolFindingId: 'sslyze:tls-1.0-1.1-enabled',
      title: 'Deprecated TLS 1.0/1.1 Protocol Supported',
      description:
        'The server accepts connections using TLS 1.0 and/or TLS 1.1, both of which are deprecated and vulnerable to known attacks (e.g. BEAST, POODLE).',
      severity: 'high',
      category: 'SSL/TLS',
      owaspCategory: 'A02',
      owaspTitle: OWASP_CATEGORIES.A02,
      evidence: 'Server accepted at least one TLS 1.0 or TLS 1.1 cipher suite',
      affectedUrl: targetUrl,
      recommendation: 'Disable TLS 1.0 and TLS 1.1, supporting only TLS 1.2 and above.',
      references: ['https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'],
      detectedBy: 'sslyze',
    });
  }

  return findings;
}

function hashUrl(url) {
  return crypto
    .createHash('md5')
    .update(url || '')
    .digest('hex')
    .slice(0, 8);
}

// docs/06's table of well-known ZAP plugin IDs — used when available since it's more
// accurate than the generic riskcode/CWE mapping below.
const ZAP_PLUGIN_DEFINITIONS = {
  10038: { title: 'Content Security Policy (CSP) Header Not Set', severity: 'medium', owaspCategory: 'A05', category: 'Security Headers' },
  10020: { title: 'X-Frame-Options Header Not Set', severity: 'medium', owaspCategory: 'A05', category: 'Security Headers' },
  10021: { title: 'X-Content-Type-Options Header Missing', severity: 'low', owaspCategory: 'A05', category: 'Security Headers' },
  10023: { title: 'Information Disclosure — Debug Error Messages', severity: 'medium', owaspCategory: 'A05', category: 'Information Disclosure' },
  10027: { title: 'Information Disclosure — Suspicious Comments', severity: 'info', owaspCategory: 'A05', category: 'Information Disclosure' },
  10035: { title: 'Strict-Transport-Security Header Not Set', severity: 'high', owaspCategory: 'A02', category: 'Security Headers' },
  10040: { title: 'Secure Pages Include Mixed Content', severity: 'high', owaspCategory: 'A02', category: 'Transport Security' },
  90022: { title: 'Application Error Disclosure', severity: 'medium', owaspCategory: 'A05', category: 'Information Disclosure' },
  40012: { title: 'Cross Site Scripting (Reflected)', severity: 'high', owaspCategory: 'A03', category: 'Injection' },
  40014: { title: 'Cross Site Scripting (Persistent)', severity: 'high', owaspCategory: 'A03', category: 'Injection' },
  40018: { title: 'SQL Injection', severity: 'critical', owaspCategory: 'A03', category: 'Injection' },
  40009: { title: 'Server Side Include', severity: 'high', owaspCategory: 'A03', category: 'Injection' },
  10104: { title: 'User Agent Fuzzer', severity: 'info', owaspCategory: 'A05', category: 'Security Misconfiguration' },
};

const ZAP_RISKCODE_SEVERITY = { 0: 'info', 1: 'low', 2: 'medium', 3: 'high' };
const ZAP_RISK_SEVERITY = { High: 'high', Medium: 'medium', Low: 'low', Informational: 'info' };

// Small, pragmatic CWE→OWASP fallback for ZAP alerts whose plugin ID isn't in the
// curated table above. Not exhaustive — defaults to A05 (Security Misconfiguration)
// for anything unmapped, which is the most common bucket for passive/active scan noise.
const ZAP_CWE_OWASP_MAP = {
  79: 'A03',
  89: 'A03',
  352: 'A01',
  200: 'A05',
  284: 'A01',
  287: 'A07',
  295: 'A02',
  310: 'A02',
  319: 'A02',
  326: 'A02',
  327: 'A02',
  614: 'A05',
  693: 'A05',
  1021: 'A05',
};

function zapSeverity(alert, pluginId) {
  // Exceptions from docs/06: SQLi is always critical, XSS is always high, regardless
  // of what ZAP itself reported as the risk level.
  if (pluginId === '40018') return 'critical';
  if (pluginId === '40012' || pluginId === '40014') return 'high';

  const definition = ZAP_PLUGIN_DEFINITIONS[pluginId];
  if (definition) return definition.severity;

  if (alert.riskcode !== undefined && ZAP_RISKCODE_SEVERITY[Number(alert.riskcode)]) {
    return ZAP_RISKCODE_SEVERITY[Number(alert.riskcode)];
  }
  return ZAP_RISK_SEVERITY[alert.risk] || 'info';
}

export function normalizeZAP(zapAlerts, targetUrl) {
  if (!Array.isArray(zapAlerts)) return [];

  const findings = [];
  for (const alert of zapAlerts) {
    const pluginId = String(alert.pluginId ?? alert.pluginid ?? '');
    const definition = ZAP_PLUGIN_DEFINITIONS[pluginId];
    const severity = zapSeverity(alert, pluginId);
    const owaspCategory = definition?.owaspCategory || ZAP_CWE_OWASP_MAP[parseInt(alert.cweid, 10)] || 'A05';
    const affectedUrl = alert.url || targetUrl;

    findings.push({
      toolFindingId: `zap-${pluginId}-${hashUrl(affectedUrl)}`,
      title: definition?.title || alert.name || alert.alert || 'ZAP Finding',
      description: alert.description || 'No description provided by ZAP.',
      severity,
      category: definition?.category || 'Web Application Security',
      owaspCategory,
      owaspTitle: OWASP_CATEGORIES[owaspCategory],
      evidence: alert.evidence || null,
      affectedUrl,
      recommendation: alert.solution || 'Review the finding and remediate according to OWASP guidance.',
      references: (alert.reference || '')
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean),
      detectedBy: 'zap',
    });
  }

  return findings;
}

const NUCLEI_SEVERITY_MAP = { critical: 'critical', high: 'high', medium: 'medium', low: 'low', info: 'info' };

function nucleiOwaspCategory(item) {
  const tags = item.info?.tags || [];
  const hasCve = Boolean(item.info?.classification?.['cve-id']) || tags.includes('cve');
  if (hasCve) return 'A06'; // Vulnerable and Outdated Components
  return 'A05'; // exposures + misconfigurations both land here
}

export function normalizeNuclei(nucleiResults, targetUrl) {
  if (!Array.isArray(nucleiResults)) return [];

  const findings = [];
  for (const item of nucleiResults) {
    const severity = NUCLEI_SEVERITY_MAP[item.info?.severity] || 'info';
    const owaspCategory = nucleiOwaspCategory(item);
    const matchedAt = item['matched-at'] || item.host || targetUrl;
    const templateId = item['template-id'] || 'unknown-template';
    const matcherName = item['matcher-name'];
    const baseName = item.info?.name || templateId;

    // Some templates (e.g. "missing security headers") report multiple distinct matches
    // per target under the same template-id and matched-at URL — confirmed against a
    // real scan, where 10 different missing headers all shared one toolFindingId and
    // silently collapsed into a single stored finding. matcher-name disambiguates them.
    const uniqueSuffix = matcherName || hashUrl(matchedAt);
    const title = matcherName ? `${baseName}: ${matcherName}` : baseName;

    findings.push({
      toolFindingId: `nuclei-${templateId}-${uniqueSuffix}`,
      title,
      description: item.info?.description || 'No description provided by the Nuclei template.',
      severity,
      category: (item.info?.tags || []).slice(0, 2).join(', ') || 'Exposure',
      owaspCategory,
      owaspTitle: OWASP_CATEGORIES[owaspCategory],
      evidence: matcherName ? `Matcher: ${matcherName}` : null,
      affectedUrl: matchedAt,
      recommendation: `Review and remediate the "${title}" finding identified by Nuclei.`,
      references: Array.isArray(item.info?.reference) ? item.info.reference : [],
      detectedBy: 'nuclei',
    });
  }

  return findings;
}

const TESTSSL_SEVERITY_MAP = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };
// testssl.sh's raw JSON dumps every check it runs, not just problems — hundreds of
// "info" entries are diagnostic metadata (cipher lists, cert fingerprints, client
// simulation matrices, scoring breakdowns), not security findings. Confirmed against
// a real scan: filtering only OK/WARN/DEBUG left 212 "findings", almost all noise.
// Unlike ZAP/Nuclei (whose "info" alerts are meaningful discrete items), testssl's
// info bucket is excluded entirely — real issues here always come back LOW or above.
const TESTSSL_SKIP_SEVERITIES = new Set(['ok', 'warn', 'debug', 'info']);

function humanizeTestsslId(id) {
  return String(id)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeTestssl(testsslResults, targetUrl) {
  if (!Array.isArray(testsslResults)) return [];

  const findings = [];
  for (const item of testsslResults) {
    const severity = String(item.severity || '').toLowerCase();
    if (TESTSSL_SKIP_SEVERITIES.has(severity) || !TESTSSL_SEVERITY_MAP[severity]) continue;

    const title = humanizeTestsslId(item.id);

    findings.push({
      toolFindingId: `testssl-${item.id}`,
      title,
      description: item.finding || 'No description provided by testssl.sh',
      severity: TESTSSL_SEVERITY_MAP[severity],
      category: 'SSL/TLS',
      owaspCategory: 'A02',
      owaspTitle: OWASP_CATEGORIES.A02,
      evidence: item.finding || null,
      affectedUrl: targetUrl,
      recommendation: `Review and remediate the "${title}" TLS/SSL issue reported by testssl.sh.`,
      references: ['https://testssl.sh/'],
      detectedBy: 'testssl',
    });
  }

  return findings;
}

export function normalizeResults({
  observatoryResult,
  sslyzeResult,
  zapAlerts,
  nucleiResults,
  testsslResults,
  targetUrl,
}) {
  const findings = [];
  if (observatoryResult) findings.push(...normalizeObservatory(observatoryResult, targetUrl));
  if (sslyzeResult) findings.push(...normalizeSSLyze(sslyzeResult, targetUrl));
  if (zapAlerts) findings.push(...normalizeZAP(zapAlerts, targetUrl));
  if (nucleiResults) findings.push(...normalizeNuclei(nucleiResults, targetUrl));
  if (testsslResults) findings.push(...normalizeTestssl(testsslResults, targetUrl));
  return findings;
}
