import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis.js';

export const reportQueue = new Queue('report-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

export async function enqueueReport(reportId, jobData) {
  return reportQueue.add('generate-report', jobData, { jobId: reportId.toString() });
}

export default reportQueue;
