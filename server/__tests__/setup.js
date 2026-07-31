import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { getBullMQConnection } from '../config/redis.js';

// Redirect to an isolated database so the test suite never touches real dev data,
// even though it runs against the same local MongoDB instance used for development.
const TEST_DB_NAME = 'security-platform-test';
process.env.MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/security-platform').replace(
  /\/([^/?]+)(\?|$)/,
  `/${TEST_DB_NAME}$2`
);

// authLimiter (middleware/rateLimiter.js) is a module-level singleton keyed by
// IP with a default ceiling of 5 register/login calls per 15 minutes — real
// and correct in production, but integration tests that exercise many real
// register/login flows in one file would trip it on requests that have
// nothing to do with the auth rate limit itself. Raised here, once, for the
// whole test process; no existing test asserts against the default ceiling.
process.env.RATE_LIMIT_MAX_AUTH = '1000';

beforeAll(async () => {
  await connectDB();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
  // Close BullMQ's Redis connection too, or Vitest hangs waiting for the open socket.
  await getBullMQConnection().quit();
});
