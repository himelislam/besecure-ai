import 'dotenv/config';
import http from 'http';
import { validateEnv } from './config/validateEnv.js';

validateEnv();

const { default: app } = await import('./app.js');
const { connectDB } = await import('./config/db.js');
const { getRedisClient } = await import('./config/redis.js');
const { initCloudinary } = await import('./config/cloudinary.js');
const { initSocket } = await import('./config/socket.js');
const { logger } = await import('./utils/logger.js');

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

httpServer.on('error', (err) => {
  logger.error({ message: 'HTTP server error', error: err.message, code: err.code });
  process.exit(1);
});

async function start() {
  initSocket(httpServer);
  await connectDB();
  getRedisClient();
  initCloudinary();

  httpServer.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT} (${process.env.NODE_ENV})`);
  });
}

start().catch((err) => {
  logger.error({ message: 'Failed to start server', error: err.message, stack: err.stack });
  process.exit(1);
});

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  const { disconnectDB } = await import('./config/db.js');
  const { getRedisClient: getClient } = await import('./config/redis.js');

  httpServer.close(async () => {
    try {
      await disconnectDB();
      await getClient().quit();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ message: 'Error during shutdown', error: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ message: 'Unhandled promise rejection', reason: reason?.message || reason, stack: reason?.stack });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ message: 'Uncaught exception', error: err.message, stack: err.stack });
  process.exit(1);
});
