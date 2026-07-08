# Frontend UI Guide — All Pages, Components, and Routes

## Design System

### Colors (Tailwind custom config)
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        severity: {
          critical: '#dc2626', // red-600
          high:     '#ea580c', // orange-600
          medium:   '#ca8a04', // yellow-600
          low:      '#2563eb', // blue-600
          info:     '#6b7280', // gray-500
        }
      }
    }
  }
}
```

### Typography
- Headings: `font-semibold` or `font-bold`, `text-gray-900`
- Body: `text-gray-600` or `text-gray-700`
- Muted: `text-gray-400`
- Monospace (code, URLs): `font-mono text-sm`

### Spacing
- Page padding: `px-4 sm:px-6 lg:px-8 py-8`
- Card padding: `p-6`
- Section gap: `space-y-6` or `gap-6`

### Shadows / Cards
- Base card: `bg-white rounded-xl border border-gray-200 shadow-sm`
- Elevated card: `bg-white rounded-xl border border-gray-200 shadow-md`

---

## Route Structure

```javascript
// App.jsx
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/verify-email" element={<VerifyEmailPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  <Route path="/pricing" element={<PricingPage />} />

  {/* Protected routes (require auth) */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      
      {/* Websites */}
      <Route path="/websites" element={<WebsitesPage />} />
      <Route path="/websites/:id" element={<WebsiteDetailPage />} />
      <Route path="/websites/:id/verify" element={<VerifyDomainPage />} />
      
      {/* Scans */}
      <Route path="/scans/:id" element={<ScanResultsPage />} />
      <Route path="/websites/:websiteId/history" element={<ScanHistoryPage />} />
      
      {/* Vulnerabilities */}
      <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} />
      
      {/* AI */}
      <Route path="/assistant" element={<AIAssistantPage />} />
      <Route path="/roadmap/:scanId" element={<RoadmapPage />} />
      
      {/* Reports */}
      <Route path="/reports" element={<ReportsPage />} />
      
      {/* Account */}
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/billing" element={<BillingPage />} />
    </Route>
  </Route>

  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

---

## AppLayout Component

```
AppLayout
├── Sidebar (fixed, left)
│   ├── Logo
│   ├── NavLinks
│   │   ├── Dashboard (/)
│   │   ├── Websites (/websites)
│   │   ├── Vulnerabilities (/vulnerabilities)
│   │   ├── AI Assistant (/assistant)
│   │   └── Reports (/reports)
│   ├── TrialBanner (if on trial, shows days remaining)
│   └── UserMenu (avatar, name, Profile, Billing, Logout)
│
└── Main Content Area
    ├── TopBar (page title + action button)
    └── <Outlet /> (page content renders here)
```

### Sidebar NavLink style
```jsx
// Active: bg-brand-50 text-brand-700 font-medium
// Inactive: text-gray-600 hover:bg-gray-50 hover:text-gray-900
<NavLink
  to="/dashboard"
  className={({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
     ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
  }
>
  <LayoutDashboard className="w-5 h-5" />
  Dashboard
</NavLink>
```

---

## Page Specifications

### DashboardPage (`/dashboard`)

**Layout:** Grid of stat cards → Charts row → Website cards → Recent scans

**Components needed:**
- `StatCard` × 4: Total Websites, Open Vulnerabilities, Avg Security Score, Total Scans
- `ScoreTrendChart` (Recharts LineChart — last 10 scans per website)
- `RiskDistributionChart` (Recharts PieChart — Critical/High/Medium/Low counts)
- `OWASPBreakdownChart` (Recharts BarChart — finding count per OWASP category)
- `WebsiteSummaryCard` × N (score, grade, last scan date, quick scan button)
- `RecentScansList` (last 5 scans table: website, date, score, grade, status)

**Data:** `GET /api/dashboard/summary`

**Score trend chart data shape:**
```javascript
// One line per website on a shared chart
[
  { date: '2025-06-01', 'Main Site': 72, 'Blog': 85 },
  { date: '2025-06-08', 'Main Site': 78, 'Blog': 85 },
]
// Recharts: <LineChart data={data}><Line dataKey="Main Site" /></LineChart>
```

---

### WebsitesPage (`/websites`)

**Layout:** Header with "Add Website" button → Grid of WebsiteCard components

**Components:**
- `AddWebsiteModal` (form: URL + nickname, inline URL validation)
- `WebsiteCard` (domain, nickname, verified badge, score, grade, last scan, actions)
- `EmptyState` ("No websites yet. Add your first website to get started.")

**WebsiteCard actions:**
- Scan Now button (if verified or baseline-only)
- View History
- Manage / Edit nickname
- Delete (with confirmation)
- Verify Domain badge (if unverified, clickable → verify flow)

---

### WebsiteDetailPage (`/websites/:id`)

**Layout:** Website header (domain, score, grade, verified status) → Tabs

**Tabs:**
1. Overview (latest scan summary + quick stats)
2. Vulnerabilities (filtered to this website)
3. Scan History (list of scans with scores)
4. Settings (edit nickname, delete website)

---

### VerifyDomainPage (`/websites/:id/verify`)

**Layout:** Step-by-step verification wizard

**Step 1:** Choose method (DNS TXT record OR HTML meta tag)
**Step 2:** Show instructions specific to chosen method
```
DNS Method:
Add this TXT record to your DNS:
Name:  _security-audit-verify.yourdomain.com
Value: sav-verify-a1b2c3d4e5f6...
TTL:   300

HTML Method:
Add this tag to your homepage <head>:
<meta name="security-audit-verify" content="sav-verify-a1b2c3d4e5f6...">
```
**Step 3:** "Check Verification" button → calls `/api/websites/:id/verify` → shows success/fail

**Components:** `CopyToClipboard` button for token, `VerificationStatus` (checking/success/fail states)

---

### ScanResultsPage (`/scans/:id`)

**Layout:** Score hero → Findings summary → Detailed findings list → Actions

**Sections:**
1. **Score Hero**: Large score circle (87/100), grade badge (A), risk level badge, scan date/type
2. **Summary Cards**: Critical count, High count, Medium count, Low count
3. **OWASP Breakdown**: Mini bar chart of findings per category
4. **Findings List**: Full list of vulnerabilities (filterable)
5. **Action Bar**: "Generate Roadmap" button, "Generate PDF Report" button, "View in Vulnerability Manager" link

**Score Circle Component:**
```jsx
// Circular progress indicator
// Color: red (<50), orange (50-69), yellow (70-84), green (85+)
function ScoreCircle({ score, grade }) {
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#eab308' : score >= 50 ? '#f97316' : '#ef4444';
  // SVG circle with stroke-dasharray for progress
}
```

**Finding card structure:**
```
┌─────────────────────────────────────────────────────┐
│ [HIGH] Missing Strict-Transport-Security Header      │
│ Category: Security Headers  •  OWASP A02             │
│                                                      │
│ Description: Your site does not enforce HTTPS via   │
│ the HSTS header, allowing downgrade attacks.        │
│                                                      │
│ Evidence: Header not present in HTTP response       │
│                                                      │
│ ▼ Recommendation (expandable)                       │
│   Add this header to your server response:         │
│   Strict-Transport-Security: max-age=31536000;     │
│   includeSubDomains; preload                       │
└─────────────────────────────────────────────────────┘
```

---

### ScanHistoryPage (`/websites/:websiteId/history`)

**Layout:** Score trend chart (full width) → Scans table with compare feature

**Components:**
- `ScoreHistoryChart` (Recharts AreaChart)
- `ScanHistoryTable` (columns: date, type, score, grade, findings count, status, actions)
- `CompareScanModal` (select 2 scans → side by side diff of findings)

**Compare view:**
```
Left: Scan A (2025-06-01)  |  Right: Scan B (2025-06-08)
Score: 72 → 79             |
✓ Fixed: Missing CSP Header (was in A, not in B)
✓ Fixed: Weak TLS 1.0 support
⚠ New: Missing Referrer-Policy (in B but not in A)
= Same: SQL Injection risk
```

---

### VulnerabilitiesPage (`/vulnerabilities`)

**Layout:** Filters sidebar + Vulnerability list

**Filters (left sidebar or top bar on mobile):**
- Status: All / Open / In Progress / Fixed / Verified / Closed
- Severity: All / Critical / High / Medium / Low
- OWASP Category: All / A01 / A02 / ...
- Website: All / [list of user's websites]

**Table columns:** Severity badge, Title, Website, OWASP, Status, First Seen, Actions

**Row actions:** Change status (dropdown), Add note, View full detail

**VulnerabilityDetailModal:**
```
Title: Missing Content-Security-Policy
Severity: [MEDIUM]  OWASP: A05  Category: Security Headers
Website: example.com  First Seen: 2025-06-01  Last Seen: 2025-06-08

Description: ...
Evidence: Header not present
Recommendation: ...
References: [link] [link]

Status: [Open ▼] → change to: Assigned / In Progress / Fixed / False Positive
Priority: [High ▼]

Notes:
  [avatar] You — June 8, 2025
  "Assigned to dev team for review"

  [Add note input]
```

---

### AIAssistantPage (`/assistant`)

**Layout:** Chat interface (full height) with context panel

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Context Panel (collapsible left sidebar)                        │
│  "Attach a scan to give AI context"                             │
│  [Select scan dropdown]                                         │
│  Selected: example.com — June 8, 2025 (Score: 79/100)          │
│                                                                  │
│  Findings included:                                             │
│  • 2 Critical  • 4 High  • 5 Medium                            │
├─────────────────────────────────────────────────────────────────┤
│  Message History                                                 │
│                                                                  │
│  [AI] 🤖 AI-Assisted Guidance                                   │
│  Hello! I can help you understand your security findings...     │
│                                                                  │
│  [You] What is XSS and how dangerous is it?                    │
│                                                                  │
│  [AI] 🤖 AI-Assisted Guidance                                   │
│  Cross-Site Scripting (XSS) is a vulnerability that allows...  │
│                                                                  │
│  [Usage: 3/20 messages today]              [New Session]        │
├─────────────────────────────────────────────────────────────────┤
│  [Type your question...]                           [Send →]     │
└─────────────────────────────────────────────────────────────────┘
```

**Suggested questions (show when chat is empty):**
- "What is the most critical issue on my site?"
- "How do I implement a Content Security Policy?"
- "Explain SQL injection in simple terms"
- "What does OWASP A05 mean?"

**AI Message Component:**
- Always show "🤖 AI-Assisted Guidance" label above AI messages
- Render markdown in AI responses (use `react-markdown`)
- Code blocks in AI responses: syntax highlighted (`react-syntax-highlighter`)
- Loading state: animated typing indicator (3 dots)

---

### RoadmapPage (`/roadmap/:scanId`)

**Layout:** Header with score projection → Week-by-week accordion

**Header:**
```
Your Security Roadmap
Generated from scan: example.com — June 8, 2025

Current Score: 72/100 (C)  →  Projected Score: 91/100 (A)
[████████████████░░░░] 72  →  [██████████████████░░] 91
```

**Week Accordion:**
```
Week 1 — Critical & High Priority Fixes           [Expand ▼]
──────────────────────────────────────────────────
  ☐ Implement Content Security Policy            +8 pts
    Impact: High | Category: Security Headers
    "Add CSP header to prevent XSS attacks. This is..."
    → Linked findings: [Missing CSP Header]
    
  ☑ Enable HSTS                                  +5 pts  (completed)
    ~~Add Strict-Transport-Security header~~

Week 2 — Medium Priority Hardening               [Expand ▼]
...
```

**"Mark Complete" toggles task checkbox, recalculates remaining projected score improvement**

---

### ReportsPage (`/reports`)

**Layout:** "Generate Report" per scan (also accessible from scan results) → Table of generated reports

**Table columns:** Website, Scan Date, Score, Status, Generated At, Download, Actions

**Report generation states:**
- Generating (spinner + "Generating your report..." message)
- Ready (Download PDF button → opens Cloudinary URL)
- Failed (Retry button)

---

### ProfilePage (`/profile`)

**Sections:**
1. Avatar (click to upload → Cloudinary direct upload)
2. Name (editable)
3. Email (display only — changing email is complex, skip for MVP)
4. Change Password form
5. Danger Zone (Delete Account — deferred to Phase 2)

---

### BillingPage (`/billing`)

**Layout:** Current plan card → Usage stats → Manage/Upgrade

**Current Plan Card:**
```
┌──────────────────────────────────────────┐
│ Free Trial                               │
│ Expires: June 22, 2025 (8 days left)    │
│                                          │
│ Usage this period:                       │
│ Scans: 12 / 3 per day                   │
│ Websites: 2 / 3                         │
│ AI Messages: 45 / 20 per day            │
│                                          │
│ [Upgrade to Premium →]                  │
└──────────────────────────────────────────┘
```

**Premium card:** Show "Manage Subscription" button → Stripe portal

---

### PricingPage (`/pricing`)

**Layout:** Two-column comparison (Free vs Premium)

```
FREE TRIAL (14 days)          PREMIUM ($X/month)
────────────────────          ──────────────────
✓ 3 baseline scans/day        ✓ Unlimited scans
✓ 3 websites                  ✓ Unlimited websites
✓ AI Assistant (20 msgs/day)  ✓ AI Assistant (200 msgs/day)
✓ Analytics dashboard         ✓ Deep scans (ZAP + Nuclei)
✓ 1 PDF report per scan       ✓ Unlimited PDF reports
✗ Deep scans                  ✓ Domain verification
✗ Vulnerability tracking      ✓ Full vulnerability tracking
                              ✓ Priority support

[Start Free Trial]            [Subscribe Now →]
```

---

## Shared Components Checklist

### Layout
- [ ] `AppLayout` — sidebar + main content
- [ ] `Sidebar` — nav links, user menu, trial banner
- [ ] `TopBar` — page title + breadcrumb + action button slot
- [ ] `ProtectedRoute` — auth guard
- [ ] `PageContainer` — consistent padding wrapper

### Data Display
- [ ] `StatCard` — icon, label, value, trend indicator
- [ ] `ScoreCircle` — SVG circular progress with grade badge
- [ ] `SeverityBadge` — Critical/High/Medium/Low/Info badges
- [ ] `GradeBadge` — A+/A/B/C/D/F with colors
- [ ] `OWASPBadge` — A01 through A10 with tooltip
- [ ] `StatusBadge` — Open/In Progress/Fixed/Verified/Closed
- [ ] `WebsiteCard` — site summary card
- [ ] `FindingCard` — vulnerability finding with expandable recommendation
- [ ] `ScanRow` — table row for scan history
- [ ] `EmptyState` — icon + message + optional action button
- [ ] `ErrorState` — error message + retry button
- [ ] `LoadingSkeleton` — skeleton loaders for cards and tables

### Charts (Recharts)
- [ ] `ScoreTrendChart` — LineChart for score over time
- [ ] `RiskDistributionChart` — PieChart for severity distribution
- [ ] `OWASPBreakdownChart` — BarChart for OWASP category counts
- [ ] `ScoreHistoryChart` — AreaChart for single website history

### Forms & Inputs
- [ ] `FormInput` — labeled input with error message
- [ ] `FormSelect` — labeled select with error
- [ ] `FormTextarea` — labeled textarea
- [ ] `SearchInput` — debounced search input
- [ ] `FilterBar` — horizontal filter row with dropdowns
- [ ] `CopyToClipboard` — text field + copy button

### Modals & Overlays
- [ ] `Modal` — base modal wrapper (backdrop + card + close button)
- [ ] `ConfirmModal` — "Are you sure?" dialog
- [ ] `AddWebsiteModal`
- [ ] `VulnerabilityDetailModal`
- [ ] `CompareScanModal`
- [ ] `ScanProgressModal` — live progress with stages

### Feedback
- [ ] `Toast` — via react-hot-toast (already set up)
- [ ] `UpgradePrompt` — "This feature requires Premium" inline banner
- [ ] `TrialBanner` — days remaining notice in sidebar
- [ ] `LoadingButton` — button with spinner when submitting
- [ ] `AIGuidanceBadge` — "🤖 AI-Assisted Guidance" label

---

## Responsive Design Rules
- Sidebar collapses to bottom nav on mobile (`< 768px`)
- Tables convert to card list on mobile
- Charts maintain aspect ratio, reduce height on mobile
- Modals go full-screen on mobile
- Dashboard grid: 4 cols (desktop) → 2 cols (tablet) → 1 col (mobile)

## Accessibility
- All interactive elements have `aria-label` or visible label
- Color is never the only indicator of severity (always include text label)
- Focus visible styles: `focus:outline-none focus:ring-2 focus:ring-brand-500`
- ARIA roles on modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Loading states announce to screen readers via `aria-live="polite"`
