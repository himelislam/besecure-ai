import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/healthRouter.js';
import authRouter from './routes/authRouter.js';
import websiteRouter from './routes/websiteRouter.js';
import scanRouter from './routes/scanRouter.js';
import vulnerabilityRouter from './routes/vulnerabilityRouter.js';
import internalRouter from './routes/internalRouter.js';
import dashboardRouter from './routes/dashboardRouter.js';
import chatRouter from './routes/chatRouter.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(cookieParser());

// Mounted before apiLimiter's prefix match — /internal is server-to-server only
// (worker → API), authenticated via x-internal-api-key, and must never be
// throttled by the per-user/IP API rate limiter.
app.use('/internal', internalRouter);

app.use('/api/', apiLimiter);

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/websites', websiteRouter);
app.use('/api/scans', scanRouter);
app.use('/api/vulnerabilities', vulnerabilityRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/chat', chatRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
