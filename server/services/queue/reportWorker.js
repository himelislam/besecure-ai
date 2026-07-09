import { Worker } from 'bullmq';
import axios from 'axios';
import { redisConnection } from '../../config/redis.js';
import Report from '../../models/Report.js';
import Scan from '../../models/Scan.js';
import Website from '../../models/Website.js';
import Vulnerability from '../../models/Vulnerability.js';
import Roadmap from '../../models/Roadmap.js';
import { generateExecutiveSummary } from '../ai/executiveSummaryGenerator.js';
import { generatePDF } from '../pdf/reportGenerator.js';
import { uploadPDF } from '../pdf/cloudinaryUploader.js';
import { logger } from '../../utils/logger.js';

const CONCURRENCY = 2;

async function emitToUserInternal(userId, event, data) {
  try {
    const baseUrl = process.env.API_INTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;
    await axios.post(
      `${baseUrl}/internal/emit`,
      { userId, event, data },
      { headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
    );
  } catch (err) {
    logger.error({ message: 'Failed to emit socket event from report worker', error: err.message, event });
  }
}

async function processReport(job) {
  const { reportId, scanId, userId } = job.data;

  const scan = await Scan.findById(scanId).lean();
  if (!scan) {
    throw new Error('Scan not found');
  }

  const [website, vulnerabilities, roadmap] = await Promise.all([
    Website.findById(scan.websiteId).lean(),
    Vulnerability.find({
      isDeleted: false,
      $or: [{ scanId: scan._id }, { lastCheckedScanId: scan._id }],
    }).lean(),
    Roadmap.findOne({ scanId: scan._id }).lean(),
  ]);

  const summaryResult = await generateExecutiveSummary(scan, vulnerabilities);

  const reportData = {
    website,
    scan,
    vulnerabilities,
    roadmap,
    executiveSummary: summaryResult.text,
    generatedAt: new Date(),
  };

  const pdfBuffer = await generatePDF(reportData);
  const upload = await uploadPDF(pdfBuffer, scanId);

  await Report.findByIdAndUpdate(reportId, {
    status: 'completed',
    error: null,
    cloudinaryUrl: upload.url,
    cloudinaryPublicId: upload.publicId,
    fileSizeBytes: upload.bytes,
    generatedAt: reportData.generatedAt,
    tokenUsage: summaryResult.tokenUsage,
  });

  await emitToUserInternal(userId, 'report:complete', {
    reportId,
    scanId,
    downloadUrl: upload.url,
  });
}

export function createReportWorker() {
  const worker = new Worker('report-queue', processReport, {
    connection: redisConnection,
    concurrency: CONCURRENCY,
  });

  worker.on('failed', async (job, err) => {
    logger.error({ message: 'Report job failed', error: err.message, jobId: job?.id });
    if (job?.data?.reportId) {
      await Report.findByIdAndUpdate(job.data.reportId, { status: 'failed', error: err.message });
      await emitToUserInternal(job.data.userId, 'report:failed', {
        reportId: job.data.reportId,
        error: err.message,
      });
    }
  });

  worker.on('completed', (job) => {
    logger.info(`Report job completed: ${job.id}`);
  });

  return worker;
}

export default createReportWorker;
