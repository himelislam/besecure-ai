import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis.js';

export const scanQueue = new Queue(process.env.SCAN_QUEUE_NAME || 'scan-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: parseInt(process.env.SCAN_JOB_ATTEMPTS) || 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
    timeout: parseInt(process.env.SCAN_JOB_TIMEOUT_MS) || 600000,
  },
});

export async function enqueueScan(scanId, jobData) {
  return scanQueue.add('run-scan', jobData, { jobId: scanId.toString() });
}

export default scanQueue;
