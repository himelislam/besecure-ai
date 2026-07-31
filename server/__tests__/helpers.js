import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Website from '../models/Website.js';
import Scan from '../models/Scan.js';
import Vulnerability from '../models/Vulnerability.js';
import { generateVerificationToken } from '../utils/tokenGenerator.js';

export const PASSWORD = 'Password123!';

export async function createVerifiedUser(email, overrides = {}) {
  return User.create({
    email,
    password: PASSWORD,
    name: 'Test User',
    emailVerified: true,
    ...overrides,
  });
}

// Fresh users default to subscription.status: 'trialing', which User.isPremium()
// treats as premium for the trial window — use this whenever a test needs
// req.tier to actually resolve to 'free'. Mirrors the identical helper in
// __tests__/rateLimiter.test.js.
export async function createFreeTierUser(email, overrides = {}) {
  return createVerifiedUser(email, {
    subscription: { status: 'canceled', plan: 'free' },
    ...overrides,
  });
}

export async function createPremiumUser(email, overrides = {}) {
  return createVerifiedUser(email, {
    subscription: { status: 'active', plan: 'premium' },
    ...overrides,
  });
}

// Mirrors authController.js's signAccessToken exactly (same secret, same
// payload shape) — mints a real, fully valid access token without going
// through POST /api/auth/login, so tests that aren't specifically about the
// login endpoint don't eat into authLimiter's budget or add unnecessary
// round trips. The token is verified by the real `protect` middleware
// identically either way.
export function signAccessTokenFor(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
}

export function authHeader(user) {
  return `Bearer ${signAccessTokenFor(user)}`;
}

export async function createWebsiteDirect(user, overrides = {}) {
  return Website.create({
    userId: user._id,
    url: 'https://example.com',
    domain: 'example.com',
    nickname: 'Test Site',
    verificationToken: generateVerificationToken(),
    ...overrides,
  });
}

export async function createScanDirect(user, website, overrides = {}) {
  return Scan.create({
    userId: user._id,
    websiteId: website._id,
    type: 'baseline',
    targetUrl: website.url,
    status: 'completed',
    score: 80,
    grade: 'B',
    completedAt: new Date(),
    ...overrides,
  });
}

let vulnCounter = 0;

export async function createVulnerabilityDirect(user, website, scan, overrides = {}) {
  vulnCounter += 1;
  return Vulnerability.create({
    userId: user._id,
    websiteId: website._id,
    scanId: scan._id,
    title: `Test Finding ${vulnCounter}`,
    description: 'A test vulnerability finding.',
    severity: 'medium',
    category: 'Security Headers',
    owaspCategory: 'A05',
    owaspTitle: 'Security Misconfiguration',
    recommendation: 'Fix it.',
    detectedBy: 'observatory',
    toolFindingId: `test-finding-${vulnCounter}`,
    status: 'open',
    ...overrides,
  });
}
