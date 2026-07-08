import { Worker } from 'bullmq';
import axios from 'axios';
import { redisConnection } from '../../config/redis.js';
import Scan from '../../models/Scan.js';
import Vulnerability from '../../models/Vulnerability.js';
import Website from '../../models/Website.js';
import { runObservatory } from '../scanner/tools/observatoryRunner.js';
import { runSSLyze } from '../scanner/tools/sslyzeRunner.js';
import { normalizeObservatory, normalizeSSLyze } from '../scanner/normalizer.js';
import { calculateScore } from '../scoring/scoreEngine.js';
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
    logger.error({ message: 'Failed to emit socket event from worker', error: err.message, event });
  }
}

async function emitProgress(userId, scanId, stage, progress) {
  await Scan.findByIdAndUpdate(scanId, { progress, progressMessage: stage });
  await emitToUserInternal(userId, 'scan:progress', { scanId, stage, progress });
}

async function processScan(job) {
  const { scanId, websiteId, userId, url } = job.data;
  const startedAt = new Date();
  const toolsRun = [];

  await Scan.findByIdAndUpdate(scanId, { status: 'running', startedAt });
  await emitProgress(userId, scanId, 'starting', 5);

  let observatoryResult = null;
  try {
    const toolStart = Date.now();
    observatoryResult = await runObservatory(url);
    toolsRun.push({ name: 'observatory', status: 'success', durationMs: Date.now() - toolStart, error: null });
  } catch (err) {
    toolsRun.push({ name: 'observatory', status: 'failed', durationMs: null, error: err.message });
    logger.error({ message: 'Observatory scan failed', error: err.message, scanId });
  }

  await emitProgress(userId, scanId, 'headers-checked', 50);

  let sslyzeResult = null;
  try {
    const toolStart = Date.now();
    sslyzeResult = await runSSLyze(url);
    toolsRun.push({ name: 'sslyze', status: 'success', durationMs: Date.now() - toolStart, error: null });
  } catch (err) {
    toolsRun.push({ name: 'sslyze', status: 'failed', durationMs: null, error: err.message });
    logger.error({ message: 'SSLyze scan failed', error: err.message, scanId });
  }

  await emitProgress(userId, scanId, 'ssl-checked', 80);

  if (!observatoryResult && !sslyzeResult) {
    const error = 'All scanner tools failed';
    const completedAt = new Date();
    await Scan.findByIdAndUpdate(scanId, {
      status: 'failed',
      error,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      toolsRun,
    });
    await emitToUserInternal(userId, 'scan:failed', { scanId, error });
    return;
  }

  const allFindings = [
    ...(observatoryResult ? normalizeObservatory(observatoryResult, url) : []),
    ...(sslyzeResult ? normalizeSSLyze(sslyzeResult, url) : []),
  ];

  const seenToolFindingIds = new Set();

  for (const finding of allFindings) {
    seenToolFindingIds.add(finding.toolFindingId);

    const existing = await Vulnerability.findOne({ websiteId, toolFindingId: finding.toolFindingId });
    if (existing) {
      existing.lastSeenAt = new Date();
      existing.lastCheckedScanId = scanId;
      existing.evidence = finding.evidence;
      await existing.save();
    } else {
      await Vulnerability.create({
        userId,
        websiteId,
        scanId,
        ...finding,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        lastCheckedScanId: scanId,
      });
    }
  }

  // Auto-verify: a previously "fixed" vuln that's no longer detected is confirmed fixed
  const fixedVulns = await Vulnerability.find({ websiteId, status: 'fixed' });
  for (const vuln of fixedVulns) {
    if (!seenToolFindingIds.has(vuln.toolFindingId)) {
      vuln.status = 'verified';
      vuln.resolvedAt = new Date();
      vuln.lastCheckedScanId = scanId;
      await vuln.save();
    }
  }

  const { score, grade, breakdown } = calculateScore(allFindings);
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();
  const someToolFailed = toolsRun.some((t) => t.status === 'failed');

  await Scan.findByIdAndUpdate(scanId, {
    status: 'completed',
    score,
    grade,
    findingCounts: breakdown,
    toolsRun,
    completedAt,
    durationMs,
    progress: 100,
    progressMessage: 'complete',
    error: someToolFailed ? 'Some checks could not complete' : null,
  });

  await Website.findByIdAndUpdate(websiteId, {
    lastScanAt: completedAt,
    lastScanId: scanId,
    lastScore: score,
    lastGrade: grade,
  });

  await emitToUserInternal(userId, 'scan:complete', { scanId, score, grade, findingCounts: breakdown });
}

export function createScanWorker() {
  const worker = new Worker(process.env.SCAN_QUEUE_NAME || 'scan-queue', processScan, {
    connection: redisConnection,
    concurrency: CONCURRENCY,
  });

  worker.on('failed', async (job, err) => {
    logger.error({ message: 'Scan job failed', error: err.message, jobId: job?.id });
    if (job?.data?.scanId) {
      await Scan.findByIdAndUpdate(job.data.scanId, {
        status: 'failed',
        error: err.message,
        completedAt: new Date(),
      });
      await emitToUserInternal(job.data.userId, 'scan:failed', { scanId: job.data.scanId, error: err.message });
    }
  });

  worker.on('completed', (job) => {
    logger.info(`Scan job completed: ${job.id}`);
  });

  return worker;
}

export default createScanWorker;
