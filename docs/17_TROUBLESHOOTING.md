# Troubleshooting Guide

Common problems encountered during development and how to solve them.
Reference this file when things break before asking Claude for help.

---

## Authentication Issues

### Problem: "jwt malformed" or "invalid signature" error
**Cause:** JWT secret mismatch, or trying to verify an access token with the refresh secret (or vice versa).
**Fix:**
```javascript
// Verify you are using the RIGHT secret for each token type:
// Access token → JWT_ACCESS_SECRET
// Refresh token → JWT_REFRESH_SECRET
// Email tokens → JWT_EMAIL_SECRET
// Never cross the secrets
```

### Problem: Login works but all subsequent requests return 401
**Cause:** Axios interceptor not attaching token, or token stored in wrong place.
**Debug:**
```javascript
// Add this temporarily to check what's happening:
api.interceptors.request.use((config) => {
  console.log('Token:', useAuthStore.getState().accessToken?.slice(0, 20));
  console.log('Auth header:', config.headers.Authorization);
  return config;
});
```
**Fix:** Confirm Zustand store is updating on login, and that the interceptor reads from the store.

### Problem: Refresh token cookie not being sent
**Cause:** `withCredentials: true` missing on Axios instance, or CORS not allowing credentials.
**Fix:**
```javascript
// Axios instance:
const api = axios.create({ withCredentials: true }); // must be true

// Express CORS:
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true })); // credentials: true required
// Never use origin: '*' when credentials: true — this is a CORS error
```

### Problem: Email verification link says "Token expired" immediately
**Cause:** JWT_EMAIL_EXPIRES_IN is too short, or system clock difference.
**Fix:** Set `JWT_EMAIL_EXPIRES_IN=24h` in .env. Confirm server clock is correct.

---

## Database Issues

### Problem: Mongoose "buffering timed out" error
**Cause:** MongoDB not running or wrong connection string.
**Fix:**
```bash
# Check if MongoDB is running:
docker ps | grep mongo
# or:
mongosh --eval "db.adminCommand('ping')"

# Check MONGODB_URI in .env:
echo $MONGODB_URI
```

### Problem: Duplicate key error on email field
**Cause:** User tried to register with an existing email. The unique index caught it.
**Fix in controller:** Catch `error.code === 11000` (MongoDB duplicate key error):
```javascript
if (error.code === 11000) {
  throw new AppError('An account with this email already exists', 409, 'DUPLICATE_EMAIL');
}
```

### Problem: Mongoose "Cast to ObjectId failed"
**Cause:** Invalid MongoDB ObjectId passed as route parameter.
**Fix:** Add Zod validation on route params:
```javascript
const paramsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')
});
const { id } = paramsSchema.parse(req.params);
```

### Problem: Queries are very slow on large collections
**Cause:** Missing indexes.
**Fix:** Run this to check existing indexes:
```javascript
// In mongosh:
db.scans.getIndexes()
db.vulnerabilities.getIndexes()
// Compare against indexes defined in 04_DATABASE_SCHEMA.md
// Mongoose creates indexes on connection if { autoIndex: true } (default in dev)
// In production: create indexes manually or set autoIndex: false
```

---

## Scanner Issues

### Problem: Observatory scan returns no results / empty tests object
**Cause:** Domain unreachable from your server, or observatory rate-limited (1 scan/min per domain).
**Fix:**
```javascript
// Add delay or check last scan time:
const result = await scan(domain, { rescanIfStale: true });
if (!result || !result.tests) {
  logger.warn(`Observatory returned empty result for ${domain}`);
  return []; // Return empty findings, don't crash
}
```

### Problem: SSLyze subprocess fails with "ModuleNotFoundError"
**Cause:** SSLyze not installed or Python path wrong.
**Fix:**
```bash
pip3 install sslyze
python3 -m sslyze --version  # Should print version
# In .env:
SSLYZE_PYTHON=python3  # or python, python3.11, etc.
```

### Problem: SSLyze "Connection refused" for target
**Cause:** Target website blocks scanning IPs or doesn't have SSL.
**Fix:** Return a specific finding for unreachable SSL:
```javascript
try {
  rawResults.sslyze = await runSSLyze(url);
} catch (e) {
  if (e.message.includes('Connection refused') || e.message.includes('timed out')) {
    rawResults.sslyzeError = 'SSL scan: Could not connect to target';
    // Add a manual finding:
    rawResults.sslyzeManualFindings = [{
      title: 'SSL/TLS scan could not complete',
      severity: 'info',
      description: 'The SSL scanner could not reach the target. The site may be blocking scans or may not support HTTPS.',
      // ...
    }];
  }
}
```

### Problem: ZAP container not accessible
**Cause:** ZAP container not started or wrong port.
**Fix:**
```bash
docker ps | grep zap  # Check if running
curl http://localhost:8090/JSON/core/view/version/  # Should return ZAP version JSON

# Start ZAP:
docker compose --profile deep up -d zap

# Check ZAP logs:
docker logs <zap-container-id>
```

### Problem: Nuclei binary not found
**Cause:** Nuclei not installed or not in PATH.
**Fix:**
```bash
which nuclei  # Should show path
nuclei -version  # Should show version

# If not installed:
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
# or download binary from GitHub releases

# Update templates:
nuclei -update-templates
```

### Problem: Scan worker job stuck in "active" state (never completes)
**Cause:** Worker crashed mid-job; BullMQ considers it still running.
**Fix:**
```bash
# Open BullMQ Bull Board or use Redis CLI:
redis-cli
> KEYS bull:scan-queue:*  # See all queue keys
# Or use BullMQ API to clean stuck jobs:
```
```javascript
import { Queue } from 'bullmq';
const queue = new Queue('scan-queue', { connection });
await queue.clean(0, 100, 'active'); // Remove stuck active jobs
```

### Problem: Scan fails with "SCAN_TIMEOUT" after 10 minutes
**Cause:** ZAP active scan taking too long on large site.
**Fix:**
- Reduce ZAP spider depth: `maxDepth: 3` instead of `maxDepth: 5`
- Use `--fast` flag for testssl.sh (already set in integration)
- Consider adding URL exclusion patterns to ZAP config to skip large paths like `/api/docs`

---

## BullMQ / Queue Issues

### Problem: Jobs not being picked up by worker
**Cause:** Worker process not running, or Redis connection different from API server.
**Fix:**
```bash
# Check worker is running:
ps aux | grep "workers/index"

# Verify Redis connection:
redis-cli ping  # Should return PONG

# Check BullMQ concurrency isn't 0:
const worker = new Worker('scan-queue', processor, {
  connection: redisConnection,
  concurrency: 2  // Must be > 0
});
```

### Problem: Jobs being processed multiple times
**Cause:** Multiple worker instances with overlapping processing.
**Fix:** BullMQ handles this with Redis locks. Ensure only one worker picks up each job. If running multiple worker instances, this is normal and fine — BullMQ is designed for it.

### Problem: Redis connection errors in BullMQ
**Cause:** Redis not running, wrong URL, or Redis requires auth but URL has no password.
**Fix:**
```bash
redis-cli -u $REDIS_URL ping  # Test with actual URL

# If Redis requires auth:
REDIS_URL=redis://:password@localhost:6379
# Note the colon before password
```

---

## Socket.io Issues

### Problem: Socket events not reaching frontend
**Cause:** Client not in the correct room, or socket not authenticated.
**Debug:**
```javascript
// Server side — log room joins:
socket.on('connection', () => {
  console.log(`Socket connected: ${socket.id}, user: ${socket.userId}`);
  socket.join(`user:${socket.userId}`);
  console.log(`Joined room: user:${socket.userId}`);
});

// Check what rooms a socket is in:
console.log(socket.rooms);  // Should include `user:${userId}`

// Client side:
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
```

### Problem: Socket connects then immediately disconnects
**Cause:** Auth middleware rejecting the connection (bad/expired token).
**Fix:** The socket handshake token is the same access token used for HTTP. If it's expired, the socket rejects. Fix: refresh token before connecting socket, or handle reconnect on token refresh.

### Problem: Internal /emit endpoint not working (worker → API)
**Cause:** Wrong INTERNAL_API_KEY or API server URL from worker.
**Fix:**
```bash
# From worker process, test the endpoint:
curl -X POST http://localhost:5000/internal/emit \
  -H "Content-Type: application/json" \
  -H "x-internal-key: your_internal_key" \
  -d '{"room":"user:test","event":"test","data":{}}'
# Should return {"success":true}
```

---

## Frontend Issues

### Problem: React Query not refetching after mutation
**Cause:** Wrong query key in `invalidateQueries`.
**Fix:** Query keys must match exactly:
```javascript
// Query:
useQuery({ queryKey: ['websites'] })

// Mutation success — must match:
queryClient.invalidateQueries({ queryKey: ['websites'] }) // ✓ correct
queryClient.invalidateQueries({ queryKey: ['website'] })  // ✗ wrong (singular)
```

### Problem: Charts not rendering (Recharts)
**Cause:** Container has no height, or data is empty/wrong shape.
**Fix:**
```jsx
// Recharts needs explicit height:
<ResponsiveContainer width="100%" height={300}>  {/* height required */}
  <LineChart data={data}>
```
```javascript
// Check data shape matches chart expectation:
console.log('Chart data:', data);
// Data for LineChart: [{ date: '2025-06-01', score: 72 }, ...]
// Key names in data must match dataKey props exactly
```

### Problem: Form submitting but Zod validation not catching errors
**Cause:** zodResolver not installed or not passed to useForm.
**Fix:**
```bash
npm install @hookform/resolvers
```
```javascript
import { zodResolver } from '@hookform/resolvers/zod';
const { ... } = useForm({ resolver: zodResolver(schema) }); // Don't forget resolver
```

### Problem: Tailwind classes not applying
**Cause:** Class not included in Tailwind's content scan, or dynamic class not detected.
**Fix:**
```javascript
// tailwind.config.js — ensure content includes all component files:
content: ['./src/**/*.{js,jsx,ts,tsx}']

// Dynamic classes — Tailwind can't detect interpolated strings:
// WRONG: className={`bg-${color}-100`}  // Tailwind won't include this
// RIGHT: Use a lookup object:
const COLORS = { critical: 'bg-red-100', high: 'bg-orange-100' };
className={COLORS[severity]}
```

### Problem: "Cannot read properties of null (reading 'map')" on data load
**Cause:** Component rendering before data arrives; not handling loading state.
**Fix:** Always guard with optional chaining and loading state:
```jsx
if (isLoading) return <Skeleton />;
if (!data?.websites) return <EmptyState />;
return data.websites.map(w => <WebsiteCard key={w._id} website={w} />);
```

---

## Stripe Issues

### Problem: Webhook not receiving events
**Cause:** Wrong endpoint URL in Stripe dashboard, or express.json() before express.raw().
**Fix:**
```javascript
// CRITICAL: The Stripe webhook route MUST come before express.json()
// Because express.raw() and express.json() conflict on the same request

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// express.json() for everything else:
app.use(express.json());
app.use('/api', apiRoutes);
```

### Problem: Webhook signature verification fails
**Cause:** STRIPE_WEBHOOK_SECRET wrong, or body was parsed by express.json() before reaching webhook handler.
**Fix:** Test locally with Stripe CLI:
```bash
stripe listen --forward-to localhost:5000/webhooks/stripe
# Stripe CLI gives you a webhook secret starting with whsec_
# Use THIS secret in your .env during local development (different from dashboard secret)
stripe trigger customer.subscription.created
```

### Problem: User subscription not updating after payment
**Cause:** Webhook event not being handled, or user not found by stripeCustomerId.
**Debug:**
```javascript
// In webhook handler — log everything:
console.log('Webhook event type:', event.type);
console.log('Customer ID:', event.data.object.customer);
const user = await User.findOne({ 'subscription.stripeCustomerId': event.data.object.customer });
console.log('Found user:', user?._id);
```

---

## Cloudinary Issues

### Problem: PDF upload failing
**Cause:** File size too large, or wrong resource_type.
**Fix:**
```javascript
// PDF must use resource_type: 'raw':
cloudinary.uploader.upload_stream(
  { folder: 'reports', resource_type: 'raw' }, // 'raw' for PDFs, not 'auto'
  callback
)
```

### Problem: Avatar upload failing from frontend
**Cause:** Upload preset not configured in Cloudinary dashboard.
**Fix:**
1. Cloudinary Dashboard → Settings → Upload → Upload Presets
2. Add preset named `avatars`
3. Set signing mode: `Unsigned` (for direct browser upload)
4. Set folder: `avatars`

---

## Puppeteer Issues

### Problem: Puppeteer fails on Linux server ("error while loading shared libraries")
**Cause:** Missing system dependencies for Chromium.
**Fix:**
```bash
# Ubuntu/Debian:
sudo apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 \
  libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 \
  libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
  libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
  libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
  libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# Always use no-sandbox in containerized environments:
const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
```

### Problem: Puppeteer PDF is blank or missing styles
**Cause:** waitUntil condition not waiting long enough for styles to load.
**Fix:**
```javascript
await page.goto(templateUrl, { 
  waitUntil: 'networkidle0',  // Wait until no network requests for 500ms
  timeout: 30000 
});
// Add a small delay after navigation for dynamic content:
await page.waitForTimeout(500);
const pdf = await page.pdf({ ... });
```

---

## Environment Issues

### Problem: "Cannot find module" error on startup
**Cause:** Dependencies not installed, or ES module import path missing `.js` extension.
**Fix:**
```bash
npm install  # Re-run in both /server and /client

# ES modules require explicit .js extension in imports:
import { something } from './myFile.js'  // ✓ correct
import { something } from './myFile'     // ✗ will fail with ESM
```

### Problem: Environment variables not loading
**Cause:** .env file in wrong directory, or dotenv not called before first use.
**Fix:**
```javascript
// server.js — dotenv must be FIRST line:
import 'dotenv/config';  // ESM way
// OR
import dotenv from 'dotenv';
dotenv.config();

// .env must be in the root of /server directory
// Not /server/config/.env — just /server/.env
```

### Problem: "EADDRINUSE" error (port already in use)
**Fix:**
```bash
lsof -i :5000  # Find process using port 5000
kill -9 <PID>  # Kill it
# Or change PORT in .env
```
