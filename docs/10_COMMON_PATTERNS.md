# Common Code Patterns

These patterns are used throughout the project. When Claude writes code for this project, it should always follow these patterns for consistency.

---

## Backend Patterns

### AppError Class
```javascript
// utils/AppError.js
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distinguish from programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage:
throw new AppError('Website not found', 404, 'NOT_FOUND');
throw new AppError('Premium required', 403, 'PLAN_LIMIT_REACHED');
throw new AppError('Too many requests', 429, 'RATE_LIMITED');
```

---

### Controller Pattern
```javascript
// controllers/websiteController.js
import { AppError } from '../utils/AppError.js';
import Website from '../models/Website.js';
import { createWebsiteSchema } from '../schemas/websiteSchemas.js';

export const createWebsite = async (req, res, next) => {
  try {
    // 1. Validate input
    const { url, nickname } = createWebsiteSchema.parse(req.body);
    
    // 2. Business logic checks
    const existingCount = await Website.countDocuments({ 
      userId: req.user._id, 
      isDeleted: false 
    });
    const limit = req.tier === 'premium' ? Infinity : parseInt(process.env.MAX_WEBSITES_FREE);
    if (existingCount >= limit) {
      throw new AppError('Website limit reached for your plan', 403, 'PLAN_LIMIT_REACHED');
    }
    
    // 3. Create resource (always scope to req.user._id)
    const website = await Website.create({
      userId: req.user._id,
      url: normalizeUrl(url),
      nickname,
      verificationToken: generateVerificationToken()
    });
    
    // 4. Return response
    res.status(201).json({ success: true, data: { website } });
  } catch (error) {
    next(error); // always pass to central error handler
  }
};
```

---

### Ownership Check Pattern
```javascript
// Use this exact pattern every time you fetch a resource
const resource = await Model.findOne({ 
  _id: req.params.id, 
  userId: req.user._id  // Always scope to authenticated user
});

// Return 404 regardless of whether it's "not found" or "not yours" — same response
if (!resource) {
  throw new AppError('Resource not found', 404, 'NOT_FOUND');
}
```

---

### Zod Validation Schemas
```javascript
// schemas/websiteSchemas.js — share these between routes that need same validation
import { z } from 'zod';

export const createWebsiteSchema = z.object({
  url: z.string().url('Must be a valid URL').max(500).transform(url => {
    // Normalize: ensure https, remove trailing slash
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  }),
  nickname: z.string().min(1, 'Nickname required').max(100).trim()
});

export const updateWebsiteSchema = z.object({
  nickname: z.string().min(1).max(100).trim().optional()
}).strict(); // reject unknown fields
```

---

### Mongoose Model Pattern
```javascript
// models/Website.js
import mongoose from 'mongoose';

const websiteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  url: { type: String, required: true },
  // ... all fields
}, { 
  timestamps: true,  // adds createdAt and updatedAt automatically
  toJSON: { 
    virtuals: true,
    transform(doc, ret) {
      delete ret.__v;  // remove version key from all responses
      return ret;
    }
  }
});

// Indexes defined here, not on individual fields (for compound indexes)
websiteSchema.index({ userId: 1, isDeleted: 1 });
websiteSchema.index({ userId: 1, domain: 1 }, { unique: true });

// Instance methods
websiteSchema.methods.isVerified = function() {
  return this.verified === true;
};

const Website = mongoose.model('Website', websiteSchema);
export default Website;
```

---

### Response Format
```javascript
// Always use this exact format
// Success:
res.status(200).json({ success: true, data: { website } });
res.status(201).json({ success: true, data: { scan } });
res.status(200).json({ success: true, data: { items: [], total: 100 } });

// Success with message:
res.status(200).json({ success: true, message: 'Email sent' });

// Error (via AppError + central handler):
{ success: false, error: 'Human message', code: 'MACHINE_CODE' }
```

---

### Pagination Pattern
```javascript
// In controller:
const page = Math.max(1, parseInt(req.query.page) || 1);
const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  Model.countDocuments(query)
]);

res.json({ 
  success: true, 
  data: { 
    items, 
    total, 
    page, 
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  } 
});
```

---

### BullMQ Job Pattern
```javascript
// services/queue/scanQueue.js — define queue
import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis.js';

export const scanQueue = new Queue(process.env.SCAN_QUEUE_NAME || 'scan-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
    timeout: parseInt(process.env.SCAN_JOB_TIMEOUT_MS) || 600000
  }
});

// Enqueue a scan:
await scanQueue.add('run-scan', { scanId, websiteId, userId, url, type }, {
  jobId: scanId.toString() // Use scanId as job ID to prevent duplicates
});
```

---

### Socket.io Event Pattern
```javascript
// From worker → API server → client:

// Worker calls internal endpoint:
await axios.post(`${process.env.API_INTERNAL_URL}/internal/emit`, {
  room: `user:${userId}`,
  event: 'scan:progress',
  data: { scanId, stage, progress }
}, {
  headers: { 'x-internal-key': process.env.INTERNAL_API_KEY }
});

// API server receives and emits:
app.post('/internal/emit', internalAuth, (req, res) => {
  const { room, event, data } = req.body;
  io.to(room).emit(event, data);
  res.json({ success: true });
});

// Client side (custom hook):
export function useSocket(userId) {
  useEffect(() => {
    const socket = io(process.env.VITE_SOCKET_URL, {
      auth: { token: accessToken }
    });
    
    socket.emit('join', `user:${userId}`);
    
    return () => socket.disconnect();
  }, [userId]);
}
```

---

## Frontend Patterns

### React Query + Axios Pattern
```javascript
// services/websiteService.js
import api from './api'; // Axios instance

export const websiteService = {
  getAll: () => api.get('/websites').then(r => r.data.data.websites),
  getById: (id) => api.get(`/websites/${id}`).then(r => r.data.data.website),
  create: (data) => api.post('/websites', data).then(r => r.data.data.website),
  update: (id, data) => api.patch(`/websites/${id}`, data).then(r => r.data.data.website),
  delete: (id) => api.delete(`/websites/${id}`),
  verify: (id, method) => api.post(`/websites/${id}/verify`, { method }).then(r => r.data),
};

// hooks/useWebsites.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websiteService } from '../services/websiteService';

export function useWebsites() {
  return useQuery({
    queryKey: ['websites'],
    queryFn: websiteService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateWebsite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: websiteService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast.success('Website added!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add website');
    }
  });
}
```

---

### Axios Instance with Token Refresh
```javascript
// services/api.js
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // send httpOnly cookie for refresh
});

// Attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        failedQueue.forEach(({ resolve }) => resolve(newToken));
        failedQueue = [];
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError));
        failedQueue = [];
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

### Zustand Auth Store
```javascript
// stores/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } })),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
```

---

### Protected Route
```javascript
// components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute({ children, requireVerified = true }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (requireVerified && !user?.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  
  return children;
}
```

---

### Loading and Error States (Required on Every Page)
```javascript
// Every data-fetching component must handle all states:
function WebsiteList() {
  const { data: websites, isLoading, error, isError } = useWebsites();
  
  if (isLoading) return <WebsiteListSkeleton />; // skeleton, not spinner
  if (isError) return <ErrorState message={error.message} retry={() => refetch()} />;
  if (!websites?.length) return <EmptyState message="No websites yet" action={<AddWebsiteButton />} />;
  
  return <div>{websites.map(w => <WebsiteCard key={w._id} website={w} />)}</div>;
}
```

---

### Form Pattern (React Hook Form + Zod)
```javascript
// Always use this pattern for forms:
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  url: z.string().url('Enter a valid URL'),
  nickname: z.string().min(1, 'Nickname is required').max(100)
});

function AddWebsiteForm({ onSubmit }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('url')} placeholder="https://example.com" />
      {errors.url && <span className="text-red-500 text-sm">{errors.url.message}</span>}
      
      <input {...register('nickname')} placeholder="My Website" />
      {errors.nickname && <span className="text-red-500 text-sm">{errors.nickname.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding...' : 'Add Website'}
      </button>
    </form>
  );
}
```

---

### Severity Badge Component
```javascript
// Reused in many places — define once
const SEVERITY_STYLES = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function SeverityBadge({ severity }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border uppercase ${SEVERITY_STYLES[severity]}`}>
      {severity}
    </span>
  );
}
```

---

### OWASP Category Labels
```javascript
// utils/owaspLabels.js — use this everywhere
export const OWASP_LABELS = {
  'A01': 'A01 — Broken Access Control',
  'A02': 'A02 — Cryptographic Failures',
  'A03': 'A03 — Injection',
  'A04': 'A04 — Insecure Design',
  'A05': 'A05 — Security Misconfiguration',
  'A06': 'A06 — Vulnerable and Outdated Components',
  'A07': 'A07 — Identification and Authentication Failures',
  'A08': 'A08 — Software and Data Integrity Failures',
  'A09': 'A09 — Security Logging and Monitoring Failures',
  'A10': 'A10 — Server-Side Request Forgery',
};

export const OWASP_COLORS = {
  'A01': '#ef4444',
  'A02': '#f97316',
  'A03': '#eab308',
  'A04': '#84cc16',
  'A05': '#06b6d4',
  'A06': '#8b5cf6',
  'A07': '#ec4899',
  'A08': '#14b8a6',
  'A09': '#64748b',
  'A10': '#a855f7',
};
```

---

### AI Chat API Call Pattern
```javascript
// services/ai/assistant.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function sendChatMessage({ userMessage, chatHistory, scanContext }) {
  const systemPrompt = buildSystemPrompt(scanContext); // construct from scan findings
  
  const messages = [
    ...chatHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];
  
  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: systemPrompt,
    messages
  });
  
  return {
    content: response.content[0].text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens
  };
}

function buildSystemPrompt(scanContext) {
  const base = `You are a cybersecurity assistant helping website owners understand and fix security vulnerabilities.
Explain things clearly for non-experts. When providing code examples, be specific to the technology stack mentioned.
Always caveat that automated scan results may include false positives and are not a substitute for professional penetration testing.
Label your guidance as "AI-assisted suggestions" not definitive security advice.`;

  if (!scanContext) return base;
  
  return `${base}

The user's website has the following security findings from an automated scan:
Score: ${scanContext.score}/100 (Grade: ${scanContext.grade})
Findings:
${scanContext.findings.map(f => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}`).join('\n')}

Answer questions about these findings when relevant.`;
}
```

---

### Docker Compose (Complete Reference)
```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_DATABASE: security-platform
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - app-network

  zap:
    image: ghcr.io/zaproxy/zaproxy:stable
    command: zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true
    ports:
      - "8090:8080"
    networks:
      - app-network
    profiles:
      - deep  # Only start ZAP when running: docker compose --profile deep up

volumes:
  mongo-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```
