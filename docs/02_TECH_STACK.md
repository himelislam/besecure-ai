# Technology Stack Reference

## Frontend

| Technology | Version | Purpose | Why chosen |
|---|---|---|---|
| React | 18.3.x | UI framework | Specified in proposal; strong ecosystem |
| Vite | 5.x | Build tool | Faster than CRA; better DX |
| Tailwind CSS | 3.4.x | Styling | Specified in proposal; rapid UI development |
| Recharts | 2.x | Charts & analytics | Specified in proposal; React-native, good docs |
| TanStack Query (React Query) | 5.x | Server state management | Caching, background refetch, loading/error states |
| Zustand | 4.x | Client state | Lightweight; simpler than Redux for this scope |
| React Router | 6.x | Client routing | Industry standard |
| Axios | 1.x | HTTP client | Interceptors for token refresh; better than fetch for this use case |
| Socket.io-client | 4.x | Real-time scan updates | Pairs with backend Socket.io |
| React Hook Form | 7.x | Form state | Performance; integrates with Zod |
| Zod | 3.x | Schema validation (frontend + shared) | Type-safe; reusable between FE and BE |
| React Hot Toast | 2.x | Toast notifications | Lightweight |
| Lucide React | latest | Icons | Open-source; clean set |
| date-fns | 3.x | Date formatting | Tree-shakeable; no moment.js |

**Alternatives rejected:**
- Next.js: overkill for SaaS app with auth; SSR not needed; adds complexity
- Redux Toolkit: too verbose for this data complexity; Zustand + React Query covers needs
- Chart.js: less composable in React than Recharts

---

## Backend

| Technology | Version | Purpose | Why chosen |
|---|---|---|---|
| Node.js | 20 LTS | Runtime | Specified; LTS for stability |
| Express.js | 4.x | HTTP framework | Specified; mature ecosystem |
| Mongoose | 8.x | MongoDB ODM | Specified; schema validation at ODM level |
| MongoDB | 7.x | Primary database | Specified; flexible schema for scan results |
| jsonwebtoken | 9.x | JWT generation/verification | Standard |
| bcryptjs | 2.x | Password hashing | Pure JS; no native dependency issues |
| BullMQ | 5.x | Job queue for async scans | Built on Redis; reliable; good UI dashboard |
| ioredis | 5.x | Redis client | Supports clusters; BullMQ peer dep |
| Socket.io | 4.x | Real-time push to frontend | Scan progress events |
| Nodemailer | 6.x | Email sending | Verification emails, password reset |
| Stripe | latest Node SDK | Subscription billing | Industry standard |
| Puppeteer | 22.x | PDF generation | Renders HTML → PDF; full browser |
| Cloudinary SDK | 2.x | PDF + avatar file storage | Easy file upload/URL management |
| express-rate-limit | 7.x | Rate limiting | Simple middleware |
| helmet | 7.x | Security headers for the platform itself | Essential |
| cors | 2.x | CORS configuration | |
| morgan | 1.x | HTTP request logging | Dev only |
| winston | 3.x | Application logging | Structured logs; never log secrets |
| zod | 3.x | Request body validation | Shared with frontend schemas |
| dotenv | 16.x | Environment variables | |
| node-cron | 3.x | Scheduled jobs (Phase 2 monitoring) | |

**Alternatives rejected:**
- Fastify: faster than Express but less familiar; team knows Express
- PostgreSQL/MySQL: MongoDB chosen per proposal; scan results are semi-structured JSON, fits document DB
- Agenda.js: BullMQ is more reliable and actively maintained
- Passport.js: adds abstraction layer; JWT middleware is straightforward to write directly

---

## Scanner Tools (Open Source — Run as Docker Services or Subprocesses)

| Tool | License | Purpose | Integration Method |
|---|---|---|---|
| OWASP ZAP 2.15+ | Apache 2.0 | Passive baseline + active scanning (XSS, SQLi, open redirect) | Docker container, ZAP Automation Framework via REST API |
| MDN HTTP Observatory | MPL-2.0 | Security headers, cookies, CSP, HSTS, SRI | npm package (`mdn-http-observatory`) called directly in Node.js |
| SSLyze 5.x | AGPL-3.0 | TLS/SSL certificate and cipher analysis | Python subprocess, JSON output parsed |
| testssl.sh 3.x | GPLv2 | TLS vulnerability checks (Heartbleed, POODLE, BEAST, CRIME) | Bash subprocess, JSON output parsed |
| Nuclei 3.x | MIT | CVE checks, exposed files, misconfiguration templates | Binary subprocess, JSON output parsed |

### License Notes
- **Apache 2.0** (ZAP): permissive, fine for commercial SaaS — calling via API is not distribution
- **MPL-2.0** (Observatory): file-level copyleft; you can use as a library without open-sourcing your code
- **AGPL-3.0** (SSLyze): this is the restrictive one — **call it as a separate process/subprocess only**, never import its Python code into your app. Running it as an independent subprocess means you're not distributing a modified version, so AGPL does not force you to open-source your platform. Seek legal advice before commercializing if uncertain.
- **GPLv2** (testssl.sh): same rule — run as subprocess, do not incorporate source
- **MIT** (Nuclei): fully permissive

---

## AI

| Service | Model | Purpose |
|---|---|---|
| Anthropic Claude API | claude-sonnet-4-6 | Security assistant chat, roadmap generation, PDF executive summary |

**Why Claude over OpenAI GPT-4o:**
- Better at following structured output instructions (OWASP mapping, JSON roadmap format)
- Stronger reasoning for technical security explanations
- OpenAI kept as fallback — keep both API keys in .env

**Cost management:**
- Cache system prompt + scan context per session using Claude's prompt caching feature
- Limit chat history sent to API to last 10 messages
- Roadmap generation: one API call per scan (not per message)
- PDF executive summary: one API call per PDF generation

---

## Infrastructure

| Service | Purpose | Notes |
|---|---|---|
| Docker + Docker Compose | Local dev; scanner service isolation | All scanners run in containers |
| Redis 7.x | BullMQ queue + rate limit store | Required — not optional |
| Cloudinary | PDF report storage, user avatars | Free tier: 25GB storage, sufficient for MVP |
| Stripe | Subscription billing | Test mode during development |
| SMTP (Resend or SendGrid) | Transactional email | Free tier: Resend 3000 emails/month |

---

## Project Structure

```
/
├── client/                   # React frontend (Vite)
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── pages/            # Route-level page components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── stores/           # Zustand stores
│   │   ├── services/         # Axios API call functions
│   │   ├── utils/            # Helpers, formatters
│   │   └── schemas/          # Zod schemas (shared with backend via copy or monorepo)
│   └── vite.config.js
│
├── server/                   # Node.js + Express backend
│   ├── config/               # DB connection, Redis, Stripe, Cloudinary init
│   ├── controllers/          # Route handler logic
│   ├── middleware/            # Auth, rate limit, error handler, subscription check
│   ├── models/               # Mongoose models
│   ├── routes/               # Express routers
│   ├── services/
│   │   ├── scanner/          # Scanner orchestrator + normalizer
│   │   │   ├── orchestrator.js       # Decides which tools to run
│   │   │   ├── normalizer.js         # Maps all tool outputs to unified schema
│   │   │   ├── tools/
│   │   │   │   ├── zapRunner.js
│   │   │   │   ├── observatoryRunner.js
│   │   │   │   ├── sslyzeRunner.js
│   │   │   │   ├── testsslRunner.js
│   │   │   │   └── nucleiRunner.js
│   │   ├── scoring/
│   │   │   └── scoreEngine.js        # Score calculation logic
│   │   ├── ai/
│   │   │   ├── assistant.js          # AI chat handler
│   │   │   └── roadmapGenerator.js   # AI roadmap generation
│   │   ├── pdf/
│   │   │   └── reportGenerator.js    # Puppeteer PDF generation
│   │   ├── email/
│   │   │   └── emailService.js       # Nodemailer wrappers
│   │   └── queue/
│   │       ├── scanQueue.js          # BullMQ queue definition
│   │       └── scanWorker.js         # BullMQ worker (runs scanner tools)
│   ├── workers/              # Entry point for worker process
│   └── app.js / server.js
│
├── docker/
│   ├── docker-compose.yml    # All services: app, worker, redis, zap, mongo
│   ├── zap/
│   │   └── zap-baseline.yaml # ZAP Automation Framework config
│   └── Dockerfile.worker     # Scanner worker Dockerfile
│
└── shared/                   # Shared types/schemas (copy to both if not monorepo)
    └── schemas/
```

---

## Development Environment Setup Order
1. Install Node.js 20 LTS
2. Install Docker Desktop
3. Clone repo, run `npm install` in `/client` and `/server`
4. Copy `.env.example` to `.env` in `/server`, fill in values (see `08_ENV_AND_SECRETS.md`)
5. Run `docker compose up -d` — starts MongoDB, Redis, ZAP container
6. Run `npm run dev` in `/server` (starts Express + Socket.io)
7. Run `npm run worker` in `/server` (starts BullMQ worker in separate process)
8. Run `npm run dev` in `/client` (starts Vite dev server)
9. Visit `http://localhost:5173`

The worker runs as a **separate process** from the API server. In production, they run as separate containers/dynos.
