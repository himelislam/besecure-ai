import Scan from '../models/Scan.js';
import Website from '../models/Website.js';
import Vulnerability from '../models/Vulnerability.js';
import ScanRateLimit from '../models/ScanRateLimit.js';
import { AppError } from '../utils/AppError.js';
import { createScanSchema } from '../schemas/scanSchemas.js';
import { enqueueScan } from '../services/queue/scanQueue.js';

export const createScan = async (req, res, next) => {
  try {
    const { websiteId, type } = createScanSchema.parse(req.body);

    const website = await Website.findOne({ _id: websiteId, userId: req.user._id, isDeleted: false });
    if (!website) {
      throw new AppError('Website not found', 404, 'NOT_FOUND');
    }

    if (type === 'deep') {
      if (!website.verified) {
        throw new AppError(
          'Domain verification required before running deep scans',
          403,
          'DOMAIN_NOT_VERIFIED'
        );
      }
      if (req.tier !== 'premium') {
        throw new AppError('Deep scans require a premium subscription', 403, 'PLAN_LIMIT_REACHED');
      }
    }

    if (req.tier !== 'premium') {
      const todayCount = await ScanRateLimit.getTodayCount(req.user._id, website._id);
      const limit = parseInt(process.env.FREE_SCANS_PER_DAY) || 3;
      if (todayCount >= limit) {
        throw new AppError('Daily scan limit reached', 429, 'RATE_LIMITED');
      }
    }

    const scan = await Scan.create({
      userId: req.user._id,
      websiteId: website._id,
      type,
      targetUrl: website.url,
      status: 'queued',
    });

    await ScanRateLimit.incrementAndGet(req.user._id, website._id);

    await enqueueScan(scan._id, {
      scanId: scan._id.toString(),
      websiteId: website._id.toString(),
      userId: req.user._id.toString(),
      url: website.url,
      type,
    });

    res.status(201).json({ success: true, data: { scanId: scan._id, status: 'queued' } });
  } catch (err) {
    next(err);
  }
};

export const getScan = async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!scan) {
      throw new AppError('Scan not found', 404, 'NOT_FOUND');
    }
    res.status(200).json({ success: true, data: { scan } });
  } catch (err) {
    next(err);
  }
};

export const listScansForWebsite = async (req, res, next) => {
  try {
    const website = await Website.findOne({
      _id: req.params.websiteId,
      userId: req.user._id,
      isDeleted: false,
    });
    if (!website) {
      throw new AppError('Website not found', 404, 'NOT_FOUND');
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { websiteId: website._id, isDeleted: false };

    const [scans, total] = await Promise.all([
      Scan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Scan.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { scans, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const getScanFindings = async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!scan) {
      throw new AppError('Scan not found', 404, 'NOT_FOUND');
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // A vuln "belongs" to this scan if it was either first detected here or
    // re-confirmed here — scanId only tracks the former.
    const query = {
      isDeleted: false,
      $or: [{ scanId: scan._id }, { lastCheckedScanId: scan._id }],
    };

    const [vulnerabilities, total] = await Promise.all([
      Vulnerability.find(query).sort({ severity: 1, createdAt: -1 }).skip(skip).limit(limit),
      Vulnerability.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { vulnerabilities, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};
