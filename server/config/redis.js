import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient = null;
let bullMQConnection = null;

function createConnection(extraOptions = {}) {
  const client = new Redis(process.env.REDIS_URL, extraOptions);

  client.on('connect', () => logger.info('Redis connection state: connected'));
  client.on('ready', () => logger.info('Redis connection state: ready'));
  client.on('reconnecting', () => logger.warn('Redis connection state: reconnecting'));
  client.on('end', () => logger.warn('Redis connection state: closed'));
  client.on('error', (err) => logger.error({ message: 'Redis connection error', error: err.message }));

  return client;
}

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createConnection();
  }
  return redisClient;
}

// BullMQ requires its own connection with maxRetriesPerRequest: null
export function getBullMQConnection() {
  if (!bullMQConnection) {
    bullMQConnection = createConnection({ maxRetriesPerRequest: null });
  }
  return bullMQConnection;
}

export const redisConnection = getBullMQConnection();

export default getRedisClient;
