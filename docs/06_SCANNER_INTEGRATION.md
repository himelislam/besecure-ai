# Scanner Integration Guide

## Overview

The scanner layer runs in the BullMQ worker process (separate from the API server). Every scanner tool produces different output formats — all output flows through the **normalizer** before hitting the database.

## Unified Finding Schema (normalizer output)

Every finding, regardless of which tool detected it, must be normalized to this shape before saving:

```javascript
{
  title: String,           // e.g. "Missing Content-Security-Policy Header"
  description: String,     // plain English, what this means
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
  category: String,        // e.g. "Security Headers", "SSL/TLS", "XSS", "Injection"
  owaspCategory: String,   // e.g. "A05"
  owaspTitle: String,      // e.g. "Security Misconfiguration"
  evidence: String | null, // what was found or not found
  affectedUrl: String | null,
  recommendation: String,  // what to do about it
  references: [String],    // links to OWASP, MDN, etc.
  detectedBy: 'observatory' | 'sslyze' | 'testssl' | 'zap' | 'nuclei' | 'custom',
  toolFindingId: String | null, // original ID from the tool (for deduplication)
}
```

---

## Tool 1: MDN HTTP Observatory (Headers, Cookies, CSP)

**Package:** `mdn-http-observatory` (npm)
**Used for:** Baseline and Deep scans
**Runs:** In-process (npm package, not subprocess)

### Setup
```bash
npm install mdn-http-observatory
```

### Integration (observatoryRunner.js)
```javascript
import { scan } from 'mdn-http-observatory';

export async function runObservatory(url) {
  const domain = new URL(url).hostname;
  const result = await scan(domain, { rescanIfStale: true });
  return result; // JSON with tests, grade, score
}
```

### Key output fields
```json
{
  "grade": "B+",
  "score": 75,
  "tests": {
    "content-security-policy": {
      "pass": false,
      "score_modifier": -25,
      "result": "csp-not-implemented",
      "recommendation": "..."
    },
    "strict-transport-security": { "pass": true, ... },
    "x-frame-options": { "pass": true, ... }
  }
}
```

### Normalization map
| Observatory test | Severity | OWASP | Category |
|---|---|---|---|
| content-security-policy (fail) | medium | A05 | Security Headers |
| strict-transport-security (fail) | high | A02 | Security Headers |
| x-frame-options (fail) | medium | A05 | Security Headers |
| x-content-type-options (fail) | low | A05 | Security Headers |
| referrer-policy (fail) | low | A05 | Security Headers |
| cookies (fail) | high | A07 | Cookie Security |

---

## Tool 2: SSLyze (TLS/SSL Analysis)

**Language:** Python
**Used for:** Baseline and Deep scans
**Runs:** Python subprocess

### Setup
```bash
pip install sslyze
```

### Integration (sslyzeRunner.js)
```javascript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function runSSLyze(url) {
  const hostname = new URL(url).hostname;
  
  const { stdout, stderr } = await execFileAsync('python3', [
    '-m', 'sslyze',
    '--json_out=-',          // output JSON to stdout
    '--regular',             // standard checks
    hostname
  ], { timeout: 60000 });
  
  if (!stdout) throw new Error(`SSLyze failed: ${stderr}`);
  return JSON.parse(stdout);
}
```

### Key output fields to check
```json
{
  "server_scan_results": [{
    "scan_result": {
      "certificate_info": {
        "result": {
          "certificate_deployments": [{
            "leaf_certificate_is_ev": false,
            "verified_chain": [...],
            "leaf_certificate_not_before": "...",
            "leaf_certificate_not_after": "...",
            "leaf_certificate_subject": { "common_name": "example.com" }
          }]
        }
      },
      "ssl_2_0_cipher_suites": { "result": { "accepted_cipher_suites": [] } },
      "ssl_3_0_cipher_suites": { "result": { "accepted_cipher_suites": [] } },
      "tls_1_0_cipher_suites": { "result": { "accepted_cipher_suites": [...] } },
      "tls_1_1_cipher_suites": { "result": { "accepted_cipher_suites": [...] } },
      "tls_1_2_cipher_suites": { "result": { "accepted_cipher_suites": [...] } },
      "tls_1_3_cipher_suites": { "result": { "accepted_cipher_suites": [...] } }
    }
  }]
}
```

### Normalization rules
- SSL 2.0 or 3.0 accepted → severity: critical, OWASP: A02
- TLS 1.0 or 1.1 accepted → severity: high, OWASP: A02
- Certificate expired → severity: critical, OWASP: A02
- Certificate expiring within 30 days → severity: high, OWASP: A02
- Certificate expiring 30-90 days → severity: medium, OWASP: A02
- Self-signed or untrusted cert → severity: high, OWASP: A02

---

## Tool 3: testssl.sh (TLS Vulnerability Checks)

**Language:** Bash
**Used for:** Deep scans only
**Runs:** Bash subprocess (Docker container or system install)

### Setup (via Docker)
```yaml
# docker-compose.yml
testssl:
  image: drwetter/testssl.sh
  volumes:
    - ./results:/results
```

### Setup (direct)
```bash
git clone --depth 1 https://github.com/drwetter/testssl.sh
chmod +x testssl.sh/testssl.sh
```

### Integration (testsslRunner.js)
```javascript
import { spawn } from 'child_process';
import path from 'path';

export async function runTestssl(url) {
  const hostname = new URL(url).hostname;
  
  return new Promise((resolve, reject) => {
    const proc = spawn('./testssl.sh/testssl.sh', [
      '--jsonfile-pretty', '/tmp/testssl-output.json',
      '--fast',            // skip time-consuming checks for MVP
      '--vulnerable',      // include vulnerability checks
      '--quiet',
      hostname
    ], { timeout: 120000 });
    
    proc.on('close', (code) => {
      try {
        const output = JSON.parse(fs.readFileSync('/tmp/testssl-output.json', 'utf8'));
        resolve(output);
      } catch (e) {
        reject(new Error('testssl.sh output parse failed'));
      }
    });
    
    proc.on('error', reject);
  });
}
```

### Key vulnerabilities testssl.sh detects
Map these to severity/OWASP A02:
- `heartbleed` → critical
- `ccs` (CCS Injection) → high
- `ticketbleed` → high
- `robot` → high
- `secure_renego` → high
- `secure_client_renego` → medium
- `crime_tls` → medium
- `breach` → medium
- `poodle_ssl` → high
- `fallback_scsv` → medium
- `sweet32` → medium
- `beast` → medium
- `lucky13` → medium
- `rc4` → medium
- `drown` → critical
- `logjam` → high
- `beast_beast` → medium
- `freak` → high

---

## Tool 4: OWASP ZAP (Active Scanning — Deep Scans Only)

**License:** Apache 2.0
**Used for:** Deep scans only (verified domains only)
**Runs:** Docker container with REST API

### Docker Setup
```yaml
# docker-compose.yml
zap:
  image: ghcr.io/zaproxy/zaproxy:stable
  command: zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true
  ports:
    - "8090:8080"  # Internal port 8090 to avoid conflicts
  networks:
    - app-network
```

### ZAP Automation Framework (Preferred over API for scans)
Create `/docker/zap/baseline.yaml`:
```yaml
env:
  contexts:
    - name: "target"
      urls:
        - "${TARGET_URL}"

jobs:
  - type: passiveScan-config
    parameters:
      maxDuration: 0
  - type: spider
    parameters:
      maxDuration: 2
      maxDepth: 5
  - type: passiveScan-wait
  - type: report
    parameters:
      reportTitle: "ZAP Baseline Scan"
      reportDescription: ""
      reportDir: "/zap/results"
      reportFile: "report"
      template: "traditional-json"
```

### Integration (zapRunner.js)
```javascript
import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';

const ZAP_API = 'http://localhost:8090';

export async function runZapBaseline(url) {
  // Option A: Use ZAP REST API directly
  // 1. Start new session
  await axios.get(`${ZAP_API}/JSON/core/action/newSession/`);
  
  // 2. Set target
  await axios.get(`${ZAP_API}/JSON/spider/action/scan/`, {
    params: { url, maxChildren: 10, recurse: true }
  });
  
  // 3. Wait for spider to complete (poll status)
  let spiderStatus = 0;
  while (spiderStatus < 100) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await axios.get(`${ZAP_API}/JSON/spider/view/status/`);
    spiderStatus = parseInt(res.data.status);
  }
  
  // 4. Run passive scan wait
  await axios.get(`${ZAP_API}/JSON/pscan/action/enableAllScanners/`);
  
  // 5. Get alerts
  const alertsRes = await axios.get(`${ZAP_API}/JSON/core/view/alerts/`, {
    params: { baseurl: url, start: 0, count: 500 }
  });
  
  return alertsRes.data.alerts;
}
```

### ZAP Alert → Normalized Finding Map
ZAP returns alerts with `risk` (High/Medium/Low/Informational) and `pluginId`.

Key ZAP Plugin IDs to map:
| pluginId | Title | Severity | OWASP |
|---|---|---|---|
| 10038 | CSP Scanner | medium | A05 |
| 10020 | X-Frame-Options | medium | A05 |
| 10021 | X-Content-Type-Options | low | A05 |
| 10023 | Information Disclosure - Debug Errors | medium | A05 |
| 10027 | Information Disclosure - Suspicious Comments | info | A05 |
| 10035 | Strict-Transport-Security | high | A02 |
| 10040 | Secure Pages Include Mixed Content | high | A02 |
| 90022 | Application Error Disclosure | medium | A05 |
| 40012 | Cross Site Scripting (Reflected) | high | A03 |
| 40014 | Cross Site Scripting (Persistent) | high | A03 |
| 40018 | SQL Injection | critical | A03 |
| 40009 | Server Side Include | high | A03 |
| 10104 | User Agent Fuzzer | info | A05 |

ZAP `risk` → severity:
- `High` → `high`
- `Medium` → `medium`
- `Low` → `low`
- `Informational` → `info`
- **Exception:** SQLi always `critical`; XSS always `high`

---

## Tool 5: Nuclei (CVE and Misconfiguration Templates)

**License:** MIT
**Used for:** Deep scans only
**Runs:** Binary subprocess

### Setup
```bash
# Linux
wget -q https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip
unzip nuclei_linux_amd64.zip
mv nuclei /usr/local/bin/
nuclei -update-templates  # download community templates
```

### Integration (nucleiRunner.js)
```javascript
import { spawn } from 'child_process';

export async function runNuclei(url) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    const proc = spawn('nuclei', [
      '-u', url,
      '-t', 'http/exposures/',          // exposed sensitive files
      '-t', 'http/misconfiguration/',   // misconfigurations
      '-t', 'http/technologies/',       // tech detection
      '-severity', 'critical,high,medium', // skip info for MVP
      '-json',                          // JSON output per line
      '-silent',
      '-no-interactsh',                 // disable out-of-band testing for SaaS
      '-timeout', '30',
    ], { timeout: 90000 });
    
    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          results.push(JSON.parse(line));
        } catch {}
      }
    });
    
    proc.on('close', () => resolve(results));
    proc.on('error', reject);
  });
}
```

### Nuclei output shape (one per finding)
```json
{
  "template-id": "exposed-git-config",
  "info": {
    "name": "Exposed Git Config",
    "severity": "medium",
    "tags": ["exposure", "git"],
    "reference": ["https://..."]
  },
  "host": "https://example.com",
  "matched-at": "https://example.com/.git/config",
  "type": "http",
  "severity": "medium"
}
```

### Normalization
- Use `info.severity` for severity
- Map to OWASP: exposures → A05, CVEs → A06, misconfigs → A05
- `template-id` as `toolFindingId` for deduplication
- `info.name` as title
- `matched-at` as `affectedUrl`

---

## Normalizer (normalizer.js)

Central function that takes raw output from all tools and returns an array of normalized findings:

```javascript
export function normalizeResults({ observatoryResult, sslyzeResult, testsslResult, zapAlerts, nucleiResults }) {
  const findings = [];
  
  if (observatoryResult) findings.push(...normalizeObservatory(observatoryResult));
  if (sslyzeResult) findings.push(...normalizeSSLyze(sslyzeResult));
  if (testsslResult) findings.push(...normalizeTestssl(testsslResult));
  if (zapAlerts) findings.push(...normalizeZAP(zapAlerts));
  if (nucleiResults) findings.push(...normalizeNuclei(nucleiResults));
  
  // Deduplicate: same toolFindingId + websiteId → skip
  // (handled at DB write time, not here)
  
  return findings;
}
```

---

## Score Engine (scoreEngine.js)

```javascript
const SEVERITY_DEDUCTIONS = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  info: 0
};

const GRADE_THRESHOLDS = [
  { min: 95, grade: 'A+' },
  { min: 85, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 30, grade: 'D' },
  { min: 0, grade: 'F' }
];

export function calculateScore(findings) {
  let score = 100;
  
  for (const finding of findings) {
    score -= SEVERITY_DEDUCTIONS[finding.severity] ?? 0;
  }
  
  score = Math.max(0, score); // floor at 0
  
  const grade = GRADE_THRESHOLDS.find(t => score >= t.min)?.grade ?? 'F';
  
  const riskLevel = score >= 70 ? 'low'
    : score >= 50 ? 'medium'
    : score >= 30 ? 'high'
    : 'critical';
  
  return { score, grade, riskLevel };
}
```

---

## Scanner Worker (scanWorker.js)

The BullMQ worker that ties everything together:

```javascript
import { Worker } from 'bullmq';
import { runObservatory } from './tools/observatoryRunner.js';
import { runSSLyze } from './tools/sslyzeRunner.js';
import { runTestssl } from './tools/testsslRunner.js';
import { runZapBaseline } from './tools/zapRunner.js';
import { runNuclei } from './tools/nucleiRunner.js';
import { normalizeResults } from './normalizer.js';
import { calculateScore } from '../scoring/scoreEngine.js';
import Scan from '../../models/Scan.js';
import Vulnerability from '../../models/Vulnerability.js';

const worker = new Worker('scan-queue', async (job) => {
  const { scanId, websiteId, userId, url, type } = job.data;
  
  await emitProgress(userId, scanId, 'starting', 0);
  await Scan.findByIdAndUpdate(scanId, { status: 'running', startedAt: new Date() });
  
  const rawResults = {};
  
  // Always run baseline tools
  try {
    rawResults.observatory = await runObservatory(url);
    await emitProgress(userId, scanId, 'headers', 25);
  } catch (e) { rawResults.observatoryError = e.message; }
  
  try {
    rawResults.sslyze = await runSSLyze(url);
    await emitProgress(userId, scanId, 'ssl', 45);
  } catch (e) { rawResults.sslyzeError = e.message; }
  
  // Deep scan only
  if (type === 'deep') {
    try {
      rawResults.testssl = await runTestssl(url);
      await emitProgress(userId, scanId, 'tls-vulns', 60);
    } catch (e) { rawResults.testsslError = e.message; }
    
    try {
      rawResults.zap = await runZapBaseline(url);
      await emitProgress(userId, scanId, 'active-scan', 80);
    } catch (e) { rawResults.zapError = e.message; }
    
    try {
      rawResults.nuclei = await runNuclei(url);
      await emitProgress(userId, scanId, 'cve-check', 92);
    } catch (e) { rawResults.nucleiError = e.message; }
  }
  
  // Normalize and score
  const findings = normalizeResults({
    observatoryResult: rawResults.observatory,
    sslyzeResult: rawResults.sslyze,
    testsslResult: rawResults.testssl,
    zapAlerts: rawResults.zap,
    nucleiResults: rawResults.nuclei
  });
  
  const { score, grade, riskLevel } = calculateScore(findings);
  
  // Save vulnerabilities (deduplication logic here)
  // ... (upsert logic based on toolFindingId)
  
  // Update scan
  await Scan.findByIdAndUpdate(scanId, {
    status: 'complete',
    score, grade, riskLevel,
    rawResults,
    completedAt: new Date(),
    // ... counts
  });
  
  await emitProgress(userId, scanId, 'complete', 100);
  await emitComplete(userId, scanId, { score, grade });
  
}, { connection: redisConnection });
```

---

## Error Handling in Scanner

Each tool runs in a try/catch. If one tool fails:
- Log the error with the tool name
- Store error in `rawResults.<toolName>Error`
- Continue with other tools
- If ALL tools fail → mark scan as "failed"
- If SOME tools fail → mark scan as "complete" but add a warning: "Some checks could not complete"

Never let one failing scanner tool kill the entire scan.

---

## Timeouts

| Tool | Timeout |
|---|---|
| Observatory | 30 seconds |
| SSLyze | 60 seconds |
| testssl.sh (--fast) | 120 seconds |
| ZAP baseline | 180 seconds |
| Nuclei | 90 seconds |
| Total scan budget | 10 minutes |

If total scan exceeds 10 minutes, mark as failed with timeout error.
