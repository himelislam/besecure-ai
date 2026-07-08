# Testing Strategy

## Testing Philosophy for This Project

This is a security product — bugs here have real consequences (false confidence, missed vulnerabilities). Testing priority:

1. **Scanner normalizer** — most critical, produces all user-facing data
2. **Score engine** — deterministic, must be exactly right
3. **Auth flows** — security bugs are catastrophic
4. **API controllers** — business logic correctness
5. **Frontend** — user-facing correctness
6. **Integration** — end-to-end scan flow

---

## Tools

| Layer | Tool | Why |
|---|---|---|
| Backend unit tests | Vitest or Jest | Fast, ESM support |
| Backend integration | Supertest + Vitest | HTTP layer testing |
| Frontend unit | Vitest + React Testing Library | Same runner as backend |
| Frontend E2E | Playwright | Real browser, tests full flows |
| API mocking | MSW (Mock Service Worker) | Frontend tests without real API |
| DB mocking | mongodb-memory-server | Real MongoDB, no external dep |
| Test coverage | Vitest coverage (v8) | Built in |

---

## Backend Testing Setup

```bash
cd server
npm install -D vitest supertest mongodb-memory-server @vitest/coverage-v8
```

```javascript
// vitest.config.js (server)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/config/**', 'src/models/**'] // models are schema, not logic
    }
  }
});
```

```javascript
// tests/setup.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Clean all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

---

## What to Test: Backend

### 1. Score Engine (scoreEngine.test.js) — CRITICAL
The most important test file. Score must be deterministic and correct.

```javascript
import { describe, it, expect } from 'vitest';
import { calculateScore } from '../../services/scoring/scoreEngine.js';

describe('calculateScore', () => {
  it('returns 100 with no findings', () => {
    const { score, grade, riskLevel } = calculateScore([]);
    expect(score).toBe(100);
    expect(grade).toBe('A+');
    expect(riskLevel).toBe('low');
  });

  it('deducts 20 for each critical finding', () => {
    const findings = [
      { severity: 'critical' },
      { severity: 'critical' },
    ];
    expect(calculateScore(findings).score).toBe(60);
  });

  it('deducts correctly for mixed severities', () => {
    const findings = [
      { severity: 'critical' }, // -20
      { severity: 'high' },     // -10
      { severity: 'medium' },   // -5
      { severity: 'low' },      // -2
      { severity: 'info' },     // -0
    ];
    expect(calculateScore(findings).score).toBe(63);
  });

  it('floors score at 0 with many findings', () => {
    const findings = Array(10).fill({ severity: 'critical' }); // -200 pts
    expect(calculateScore(findings).score).toBe(0);
    expect(calculateScore(findings).grade).toBe('F');
  });

  it('assigns correct grades', () => {
    expect(calculateScore([]).grade).toBe('A+');                        // 100
    expect(calculateScore(Array(1).fill({ severity: 'high' })).grade).toBe('A');  // 90
    expect(calculateScore(Array(3).fill({ severity: 'high' })).grade).toBe('B'); // 70
    expect(calculateScore(Array(5).fill({ severity: 'high' })).grade).toBe('C'); // 50
  });
});
```

---

### 2. Scanner Normalizer (normalizer.test.js) — CRITICAL
Test that raw tool output maps correctly to unified schema.

```javascript
describe('normalizeObservatory', () => {
  it('creates finding for missing CSP header', () => {
    const rawOutput = {
      tests: {
        'content-security-policy': {
          pass: false,
          result: 'csp-not-implemented',
        }
      }
    };
    const findings = normalizeObservatory(rawOutput);
    
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      title: expect.stringContaining('Content-Security-Policy'),
      severity: 'medium',
      owaspCategory: 'A05',
      detectedBy: 'observatory',
    });
  });

  it('creates no findings when all headers pass', () => {
    const rawOutput = {
      tests: {
        'content-security-policy': { pass: true },
        'strict-transport-security': { pass: true },
        'x-frame-options': { pass: true },
      }
    };
    expect(normalizeObservatory(rawOutput)).toHaveLength(0);
  });
});

describe('normalizeSSLyze', () => {
  it('creates critical finding for expired certificate', () => {
    const rawOutput = {
      server_scan_results: [{
        scan_result: {
          certificate_info: {
            result: {
              certificate_deployments: [{
                leaf_certificate_not_after: '2020-01-01T00:00:00' // expired
              }]
            }
          }
        }
      }]
    };
    const findings = normalizeSSLyze(rawOutput);
    expect(findings.some(f => f.severity === 'critical' && f.title.includes('expired'))).toBe(true);
  });
});
```

---

### 3. Auth Controller (auth.test.js)

```javascript
import request from 'supertest';
import app from '../../app.js';

describe('POST /api/auth/register', () => {
  it('registers user and sends verification email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'Password123!' });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Password should NOT be in response:
    expect(res.body.data?.user?.password).toBeUndefined();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'Password123!' });
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INPUT');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'User 1', email: 'dupe@example.com', password: 'Password123!' });
    
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'User 2', email: 'dupe@example.com', password: 'Password123!' });
    
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Create and verify a user
    await createVerifiedUser({ email: 'login@example.com', password: 'Password123!' });
  });

  it('returns access token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'Password123!' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined(); // refresh token cookie
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPassword!' });
    
    expect(res.status).toBe(401);
  });
});
```

---

### 4. Website Controller (websites.test.js)

```javascript
describe('POST /api/websites', () => {
  let authToken;

  beforeEach(async () => {
    authToken = await getAuthToken(); // helper that creates user and returns JWT
  });

  it('creates website with verification token', async () => {
    const res = await request(app)
      .post('/api/websites')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ url: 'https://example.com', nickname: 'My Site' });
    
    expect(res.status).toBe(201);
    expect(res.body.data.website.verified).toBe(false);
    expect(res.body.data.website.verificationToken).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/websites')
      .send({ url: 'https://example.com', nickname: 'My Site' });
    
    expect(res.status).toBe(401);
  });

  it('enforces 3 website limit for free tier', async () => {
    // Create 3 websites
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/websites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: `https://example${i}.com`, nickname: `Site ${i}` });
    }
    
    // 4th should fail
    const res = await request(app)
      .post('/api/websites')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ url: 'https://example4.com', nickname: 'Site 4' });
    
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAN_LIMIT_REACHED');
  });
});
```

---

### 5. Ownership Checks (security.test.js) — CRITICAL

These tests verify that users cannot access other users' data:

```javascript
describe('Resource ownership enforcement', () => {
  let user1Token, user2Token, user1WebsiteId;

  beforeEach(async () => {
    user1Token = await getAuthToken('user1@test.com');
    user2Token = await getAuthToken('user2@test.com');
    
    // User 1 creates a website
    const res = await request(app)
      .post('/api/websites')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ url: 'https://private.com', nickname: 'Private' });
    user1WebsiteId = res.body.data.website._id;
  });

  it('user2 cannot see user1 website', async () => {
    const res = await request(app)
      .get(`/api/websites/${user1WebsiteId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    
    expect(res.status).toBe(404); // 404, not 403 — don't reveal existence
  });

  it('user2 cannot delete user1 website', async () => {
    const res = await request(app)
      .delete(`/api/websites/${user1WebsiteId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    
    expect(res.status).toBe(404);
  });

  it('user2 cannot trigger scan on user1 website', async () => {
    const res = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ websiteId: user1WebsiteId, type: 'baseline' });
    
    expect(res.status).toBe(404);
  });
});
```

---

## Frontend Testing Setup

```bash
cd client
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom msw jsdom
```

```javascript
// vitest.config.js (client)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  }
});
```

```javascript
// tests/setup.js
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## What to Test: Frontend

### Component Tests

```javascript
// SeverityBadge.test.jsx
import { render, screen } from '@testing-library/react';
import { SeverityBadge } from '../../components/SeverityBadge';

describe('SeverityBadge', () => {
  it('renders correct label', () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('applies correct color class for critical', () => {
    const { container } = render(<SeverityBadge severity="critical" />);
    expect(container.firstChild).toHaveClass('bg-red-100');
  });
});
```

```javascript
// ScoreCircle.test.jsx
describe('ScoreCircle', () => {
  it('displays score and grade', () => {
    render(<ScoreCircle score={87} grade="A" />);
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
```

### Integration Tests with MSW

```javascript
// tests/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/websites', () => {
    return HttpResponse.json({
      success: true,
      data: {
        websites: [
          { _id: '1', domain: 'example.com', nickname: 'My Site', latestScore: 87, verified: true }
        ]
      }
    });
  }),

  http.post('/api/websites', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        website: { _id: '2', ...body, verified: false, verificationToken: 'token123' }
      }
    }, { status: 201 });
  }),
];
```

```javascript
// WebsitesPage.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { WebsitesPage } from '../../pages/WebsitesPage';

const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('WebsitesPage', () => {
  it('displays list of websites', async () => {
    renderWithProviders(<WebsitesPage />);
    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('My Site')).toBeInTheDocument();
    });
  });

  it('shows empty state when no websites', async () => {
    // Override handler for this test
    server.use(
      http.get('/api/websites', () => HttpResponse.json({ success: true, data: { websites: [] } }))
    );
    renderWithProviders(<WebsitesPage />);
    await waitFor(() => {
      expect(screen.getByText(/No websites yet/i)).toBeInTheDocument();
    });
  });
});
```

---

## E2E Testing with Playwright

```bash
cd client
npm install -D @playwright/test
npx playwright install chromium
```

```javascript
// tests/e2e/auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('user can register and login', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', 'e2e@example.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Scan Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login helper
    await loginAs(page, 'test@example.com', 'Password123!');
  });

  test('user can add a website and trigger scan', async ({ page }) => {
    await page.goto('/websites');
    await page.click('text=Add Website');
    await page.fill('[name="url"]', 'https://example.com');
    await page.fill('[name="nickname"]', 'Test Site');
    await page.click('button:has-text("Add")');
    
    await expect(page.getByText('Test Site')).toBeVisible();
    
    // Trigger scan
    await page.click('button:has-text("Scan Now")');
    await expect(page.getByText(/scanning/i)).toBeVisible();
  });
});
```

---

## Running Tests

```bash
# Backend
cd server
npm test                    # run all tests
npm test -- --watch        # watch mode
npm test -- --coverage     # with coverage report
npm test auth.test.js      # single file

# Frontend unit
cd client
npm test
npm test -- --coverage

# Frontend E2E
cd client
npx playwright test
npx playwright test --headed  # see browser
npx playwright test --ui      # Playwright UI mode
```

---

## Test Coverage Targets

| Layer | Target | Priority |
|---|---|---|
| Score engine | 100% | Critical |
| Normalizer | 95%+ | Critical |
| Auth controllers | 90%+ | High |
| Website/Scan controllers | 80%+ | High |
| Middleware | 90%+ | High |
| Frontend components | 70%+ | Medium |
| E2E critical paths | Auth + Add Website + Scan | High |

---

## Helper Functions for Tests

```javascript
// tests/helpers.js

// Create a user and return JWT token
export async function getAuthToken(email = 'test@example.com', password = 'Password123!') {
  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({
    name: 'Test User',
    email,
    password: hashedPassword,
    emailVerified: true,
    subscription: { status: 'trialing', plan: 'free', trialEnd: new Date(Date.now() + 14 * 86400000) }
  });
  
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  
  return response.body.data.accessToken;
}

// Create a verified website for a user
export async function createWebsite(userId, url = 'https://example.com') {
  return Website.create({
    userId,
    url,
    domain: 'example.com',
    nickname: 'Test Site',
    verified: true,
    verificationToken: 'test-token'
  });
}
```
