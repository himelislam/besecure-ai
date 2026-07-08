# SETUP.md — How to Use This With Claude Code in VS Code

Follow these steps exactly, in order.

---

## Step 1: Install Prerequisites

```bash
# Node.js 20 LTS
https://nodejs.org/en/download (choose LTS)

# Docker Desktop
https://www.docker.com/products/docker-desktop

# VS Code
https://code.visualstudio.com

# Claude Code extension for VS Code
# Open VS Code → Extensions (Ctrl+Shift+X) → search "Claude Code" → Install
```

---

## Step 2: Create Your Project Folder

```bash
mkdir security-audit-platform
cd security-audit-platform
```

---

## Step 3: Copy These Files Into the Project Root

Copy every file from this package into `security-audit-platform/`:

```
security-audit-platform/
├── CLAUDE.md           ← Claude Code reads this automatically
├── PHASES.md           ← Phase checklist (Claude Code updates this)
├── DECISIONS.md        ← Architecture decisions (Claude Code reads this)
├── PHASE_PROMPTS.md    ← All your prompts (you copy from here)
├── SETUP.md            ← This file
└── .claude/
    └── settings.json   ← Claude Code permissions
```

---

## Step 4: Copy Your Reference Docs

Copy all 18 reference files from your project into a `docs/` folder:

```
security-audit-platform/docs/
├── 01_PLATFORM_OVERVIEW.md
├── 02_TECH_STACK.md
├── 03_ARCHITECTURE.md
├── 04_DATABASE_SCHEMA.md
├── 05_API_REFERENCE.md
├── 06_SCANNER_INTEGRATION.md
├── 07_BUILD_ORDER.md
├── 08_ENV_AND_SECRETS.md
├── 09_SECURITY_RULES.md
├── 10_COMMON_PATTERNS.md
├── 11_FRONTEND_UI_GUIDE.md
├── 12_DEPLOYMENT.md
├── 13_TESTING.md
├── 14_PROMPT_SHEET.md
├── 15_AI_PROMPTS.md
├── 16_DATA_FLOWS.md
├── 17_TROUBLESHOOTING.md
└── 18_GLOSSARY.md
```

---

## Step 5: Open in VS Code

```bash
code security-audit-platform
```

---

## Step 6: Open Claude Code

- Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- Type "Claude Code" and press Enter
- OR look for the Claude Code icon in the sidebar

---

## Step 7: Start Phase 1

1. Open `PHASE_PROMPTS.md`
2. Find the **PHASE 1 — Foundation** section
3. Copy the entire prompt inside the triple backtick block
4. Paste it into the Claude Code chat
5. Wait for Claude Code to finish creating all files
6. Follow the "Done When" instructions to verify it worked

---

## Step 8: Test Phase 1 Before Continuing

```bash
# In a terminal inside VS Code:
cd server
npm install

# In a second terminal:
cd docker
docker compose -f docker-compose.dev.yml up -d

# Back in first terminal:
npm run dev

# Test:
curl http://localhost:5000/api/health
```

Should return: `{ "success": true, "data": { "status": "ok" } }`

---

## Step 9: Continue Phase by Phase

For every subsequent phase:
1. Copy the phase prompt from `PHASE_PROMPTS.md`
2. Paste into Claude Code
3. Let it finish completely
4. Test the "Done When" condition
5. Mark completed tasks in `PHASES.md`
6. Move to next phase

**Never skip phases — each one depends on the previous.**

---

## How Claude Code Reads the Project

When you paste a prompt, Claude Code automatically reads:
- `CLAUDE.md` — project rules, folder structure, tech stack
- `PHASES.md` — what's been built, what's next
- `DECISIONS.md` — why architecture was designed this way
- All files in `docs/` — the detailed reference specs

You don't need to paste these manually. Claude Code sees them because they're in the workspace.

---

## Running the Project (Once Built)

You always need **3 terminals** running:

```bash
# Terminal 1 — Start MongoDB + Redis
cd docker
docker compose -f docker-compose.dev.yml up -d

# Terminal 2 — Start API server
cd server
npm run dev

# Terminal 3 — Start scan worker (separate process)
cd server
npm run worker
```

---

## Environment Variables

```bash
# After Phase 1 creates server/.env.example:
cd server
cp .env.example .env
# Fill in real values — see docs/08_ENV_AND_SECRETS.md for instructions
```

Minimum required for Phase 1–3 to work:
```
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/security-platform
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=   # openssl rand -hex 64
JWT_REFRESH_SECRET=  # openssl rand -hex 64 (different from above)
JWT_EMAIL_SECRET=    # openssl rand -hex 64 (different from above two)
INTERNAL_API_KEY=    # openssl rand -hex 32
```

Generate secrets:
```bash
openssl rand -hex 64   # Run 3 times for 3 JWT secrets
openssl rand -hex 32   # Once for INTERNAL_API_KEY
```

---

## Useful Commands

```bash
# Start Docker services
docker compose -f docker/docker-compose.dev.yml up -d

# Stop Docker services
docker compose -f docker/docker-compose.dev.yml down

# View Docker logs
docker compose -f docker/docker-compose.dev.yml logs -f

# Reset Docker (deletes all local data)
docker compose -f docker/docker-compose.dev.yml down -v

# Install server dependencies
cd server && npm install

# Run API server
cd server && npm run dev

# Run worker (separate terminal)
cd server && npm run worker

# Run tests (Phase 11)
cd server && npm test
```
