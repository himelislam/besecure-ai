# Database Schema — MongoDB Collections

All collections use Mongoose. Timestamps (createdAt, updatedAt) enabled on all models.

---

## Collection: users

```javascript
{
  _id: ObjectId,
  email: { type: String, required, unique, lowercase, trim },
  password: { type: String, required }, // bcrypt hash — never return this field
  name: { type: String, required, trim },
  avatar: { type: String, default: null }, // Cloudinary URL
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null }, // temporary, cleared after use
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  subscription: {
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    status: { type: String, enum: ['trialing', 'active', 'past_due', 'canceled', 'incomplete'], default: 'trialing' },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    currentPeriodEnd: { type: Date, default: null },
    trialEnd: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }, // 14 days
  },
  aiMessagesUsedToday: { type: Number, default: 0 },
  aiMessagesResetAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// email: unique index
// subscription.stripeCustomerId: index (for webhook lookups)
```

---

## Collection: websites

```javascript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required }, // owner
  url: { type: String, required }, // normalized: "https://example.com" (no trailing slash)
  domain: { type: String, required }, // "example.com" extracted from URL
  nickname: { type: String, required }, // user-defined label
  verified: { type: Boolean, default: false }, // domain ownership verified
  verifiedAt: { type: Date, default: null },
  verificationToken: { type: String, required }, // UUID for DNS/meta tag verification
  verificationMethod: { type: String, enum: ['dns', 'meta', null], default: null },
  lastScannedAt: { type: Date, default: null },
  latestScanId: { type: ObjectId, ref: 'Scan', default: null },
  latestScore: { type: Number, default: null }, // denormalized for fast dashboard load
  latestGrade: { type: String, default: null },
  isDeleted: { type: Boolean, default: false }, // soft delete
  deletedAt: { type: Date, default: null },
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// { userId: 1, isDeleted: 1 } — list user's websites
// { userId: 1, domain: 1 } — unique per user (prevent duplicate domains)
// verificationToken: index
```

---

## Collection: scans

```javascript
{
  _id: ObjectId,
  websiteId: { type: ObjectId, ref: 'Website', required },
  userId: { type: ObjectId, ref: 'User', required },
  url: { type: String, required }, // URL that was scanned (snapshot — URL may change)
  type: { type: String, enum: ['baseline', 'deep'], required },
  status: { type: String, enum: ['queued', 'running', 'complete', 'failed'], default: 'queued' },
  
  // Results
  score: { type: Number, default: null }, // 0-100
  grade: { type: String, default: null }, // 'A+', 'A', 'B', 'C', 'D', 'F'
  riskLevel: { type: String, enum: ['critical', 'high', 'medium', 'low', null], default: null },
  
  // Finding counts (denormalized for dashboard)
  findingCounts: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
    info: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // OWASP distribution (denormalized for charts)
  owaspDistribution: {
    type: Map,
    of: Number,
    default: {}
  }, // e.g. { "A05": 3, "A03": 1 }
  
  // Raw tool outputs (stored for debugging, not shown to users)
  rawResults: {
    observatory: { type: Object, default: null },
    sslyze: { type: Object, default: null },
    testssl: { type: Object, default: null },
    zap: { type: Object, default: null },
    nuclei: { type: Object, default: null }
  },
  
  // Error info
  errorMessage: { type: String, default: null },
  errorStage: { type: String, default: null }, // which tool failed
  
  // Timing
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  durationMs: { type: Number, default: null },
  
  // Relations
  reportId: { type: ObjectId, ref: 'Report', default: null },
  roadmapId: { type: ObjectId, ref: 'Roadmap', default: null },
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// { websiteId: 1, createdAt: -1 } — scan history per website
// { userId: 1, createdAt: -1 } — user's recent scans
// { status: 1 } — find queued/running scans
```

---

## Collection: vulnerabilities

```javascript
{
  _id: ObjectId,
  scanId: { type: ObjectId, ref: 'Scan', required }, // scan that first detected this
  websiteId: { type: ObjectId, ref: 'Website', required },
  userId: { type: ObjectId, ref: 'User', required },
  
  // Finding details
  title: { type: String, required }, // e.g. "Missing Content-Security-Policy Header"
  description: { type: String, required }, // plain English explanation
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'], required },
  category: { type: String, required }, // e.g. "Security Headers", "SSL/TLS", "XSS"
  
  // OWASP mapping
  owaspCategory: { type: String, required }, // e.g. "A05"
  owaspTitle: { type: String, required }, // e.g. "Security Misconfiguration"
  
  // Technical details
  evidence: { type: String, default: null }, // what was found/not found
  affectedUrl: { type: String, default: null },
  recommendation: { type: String, required }, // what to do about it
  references: [{ type: String }], // links to docs/standards
  
  // Source tool
  detectedBy: { type: String, enum: ['observatory', 'sslyze', 'testssl', 'zap', 'nuclei', 'custom'], required },
  toolFindingId: { type: String, default: null }, // original ID from the tool (for deduplication)
  
  // Vulnerability Management workflow
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'fixed', 'verified', 'closed', 'false_positive'],
    default: 'open'
  },
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: null },
  // Note: priority can differ from severity (user may reprioritize)
  
  notes: [{
    text: { type: String },
    addedBy: { type: ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  
  assignedTo: { type: ObjectId, ref: 'User', default: null }, // Phase 2: team
  
  // Tracking
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now }, // updated each scan it appears in
  resolvedAt: { type: Date, default: null },
  
  // Re-scan tracking
  lastCheckedScanId: { type: ObjectId, ref: 'Scan', default: null },
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// { websiteId: 1, status: 1, severity: 1 } — filtered vuln list
// { userId: 1, status: 1 } — user's open vulns
// { scanId: 1 } — all vulns from a scan
// { websiteId: 1, toolFindingId: 1 } — deduplication check
```

---

## Collection: chatmessages

```javascript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required },
  sessionId: { type: String, required }, // UUID — groups messages in a conversation
  
  role: { type: String, enum: ['user', 'assistant'], required },
  content: { type: String, required },
  
  // Context attached to this message
  attachedScanId: { type: ObjectId, ref: 'Scan', default: null },
  
  // Token usage (for monitoring AI costs)
  inputTokens: { type: Number, default: null },
  outputTokens: { type: Number, default: null },
  
  createdAt: Date
}

// Indexes:
// { userId: 1, sessionId: 1, createdAt: 1 } — fetch conversation history
// TTL index: createdAt with expireAfterSeconds: 7776000 (90 days auto-cleanup)
```

---

## Collection: roadmaps

```javascript
{
  _id: ObjectId,
  scanId: { type: ObjectId, ref: 'Scan', required, unique }, // one roadmap per scan
  userId: { type: ObjectId, ref: 'User', required },
  websiteId: { type: ObjectId, ref: 'Website', required },
  
  currentScore: { type: Number, required },
  projectedScore: { type: Number, required },
  
  weeks: [{
    weekNumber: { type: Number, required },
    title: { type: String, required },
    description: { type: String, required },
    tasks: [{
      taskId: { type: String, required }, // UUID
      title: { type: String, required },
      description: { type: String, required },
      impact: { type: String, enum: ['high', 'medium', 'low'], required },
      scoreImpact: { type: Number, required }, // estimated score points gained
      linkedVulnIds: [{ type: ObjectId, ref: 'Vulnerability' }],
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null }
    }]
  }],
  
  // AI generation metadata
  model: { type: String, default: 'claude-sonnet-4-6' },
  generatedAt: { type: Date, default: Date.now },
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// scanId: unique index
// { userId: 1 } — user's roadmaps
```

---

## Collection: reports

```javascript
{
  _id: ObjectId,
  scanId: { type: ObjectId, ref: 'Scan', required },
  userId: { type: ObjectId, ref: 'User', required },
  websiteId: { type: ObjectId, ref: 'Website', required },
  
  status: { type: String, enum: ['generating', 'ready', 'failed'], default: 'generating' },
  
  // Cloudinary
  cloudinaryPublicId: { type: String, default: null },
  cloudinaryUrl: { type: String, default: null },
  downloadUrl: { type: String, default: null }, // signed or direct URL
  fileSizeBytes: { type: Number, default: null },
  
  // AI executive summary (stored to avoid re-generating)
  executiveSummary: { type: String, default: null },
  
  errorMessage: { type: String, default: null },
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// { scanId: 1 } — find report for a scan
// { userId: 1, createdAt: -1 } — user's reports list
```

---

## Collection: scanratelimits

```javascript
// Tracks daily scan usage per user for rate limiting
// (Alternative: use Redis — either works, DB is simpler for MVP)
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required },
  date: { type: String, required }, // "2025-06-15" ISO date string
  websiteId: { type: ObjectId, ref: 'Website', required },
  scanCount: { type: Number, default: 0 },
  createdAt: Date
}

// TTL index: createdAt expireAfterSeconds: 172800 (2 days auto-cleanup)
// Compound index: { userId: 1, websiteId: 1, date: 1 } unique
```

---

## Key Relationships Summary

```
User (1) ─── has many ──→ Website (many)
Website (1) ─── has many ──→ Scan (many)
Scan (1) ─── has many ──→ Vulnerability (many)
Scan (1) ─── has one ──→ Roadmap (1)
Scan (1) ─── has one ──→ Report (1)
User (1) ─── has many ──→ ChatMessage (many, grouped by sessionId)
```

## Notes on Data Design Decisions

1. **Denormalized counts on Scan** — `findingCounts` and `owaspDistribution` are calculated and stored at scan time. This avoids expensive aggregations on the dashboard. Trade-off: slightly more data written at scan complete.

2. **latestScore on Website** — stored directly on the Website document for instant dashboard loading without joining to Scan collection.

3. **Vulnerability deduplication** — `toolFindingId` prevents creating duplicate vulnerability records when the same issue appears in multiple consecutive scans. On re-scan, if same `toolFindingId` found: update `lastSeenAt`, don't create new document. If a "fixed" vuln is NOT found in new scan: update status to "verified".

4. **rawResults on Scan** — stored for debugging scanner integration issues. Not shown in UI. Consider compressing (JSON → Buffer) if storage becomes a concern.

5. **Chat sessions** — `sessionId` is generated client-side (UUID) per conversation. Users can start a new session to clear context. Sessions auto-expire via MongoDB TTL index after 90 days.
