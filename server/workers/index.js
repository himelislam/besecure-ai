import 'dotenv/config';
import { validateEnv } from '../config/validateEnv.js';

validateEnv();

const { connectDB, disconnectDB } = await import('../config/db.js');
const { getRedisClient } = await import('../config/redis.js');
const { createScanWorker } = await import('../services/queue/scanWorker.js');
const { logger } = await import('../utils/logger.js');

await connectDB();
getRedisClient();

const worker = createScanWorker();
logger.info('Scan worker started');

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down scan worker`);
  try {
    await worker.close();
    await disconnectDB();
    logger.info('Scan worker shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ message: 'Error during worker shutdown', error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ message: 'Unhandled promise rejection in worker', reason: reason?.message || reason });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ message: 'Uncaught exception in worker', error: err.message, stack: err.stack });
  process.exit(1);
});
