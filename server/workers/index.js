import 'dotenv/config';
import { validateEnv } from '../config/validateEnv.js';

validateEnv();

const { connectDB, disconnectDB } = await import('../config/db.js');
const { getRedisClient } = await import('../config/redis.js');
const { initCloudinary } = await import('../config/cloudinary.js');
const { createScanWorker } = await import('../services/queue/scanWorker.js');
const { createReportWorker } = await import('../services/queue/reportWorker.js');
const { logger } = await import('../utils/logger.js');

await connectDB();
getRedisClient();
initCloudinary(); // needed by reportWorker's Cloudinary upload step

const scanWorker = createScanWorker();
const reportWorker = createReportWorker();
logger.info('Scan worker started');
logger.info('Report worker started');

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down workers`);
  try {
    await Promise.all([scanWorker.close(), reportWorker.close()]);
    await disconnectDB();
    logger.info('Worker shutdown complete');
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
