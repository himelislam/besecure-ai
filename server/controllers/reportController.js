import Report from '../models/Report.js';
import Scan from '../models/Scan.js';
import { AppError } from '../utils/AppError.js';
import { enqueueReport } from '../services/queue/reportQueue.js';

export const generateReport = async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.scanId, userId: req.user._id, isDeleted: false });
    if (!scan) {
      throw new AppError('Scan not found', 404, 'NOT_FOUND');
    }

    // Cached: a completed report already exists — return it instead of regenerating.
    const existingCompleted = await Report.findOne({
      scanId: scan._id,
      userId: req.user._id,
      status: 'completed',
    });
    if (existingCompleted) {
      return res.status(200).json({
        success: true,
        data: { reportId: existingCompleted._id, status: existingCompleted.status },
      });
    }

    // Free tier: only one non-failed report attempt allowed per scan.
    if (req.tier !== 'premium') {
      const activeCount = await Report.countDocuments({
        scanId: scan._id,
        userId: req.user._id,
        status: { $ne: 'failed' },
      });
      if (activeCount >= 1) {
        throw new AppError('Report limit reached for your plan', 403, 'PLAN_LIMIT_REACHED');
      }
    }

    const report = await Report.create({
      userId: req.user._id,
      scanId: scan._id,
      websiteId: scan.websiteId,
      status: 'generating',
    });

    await enqueueReport(report._id, {
      reportId: report._id.toString(),
      scanId: scan._id.toString(),
      userId: req.user._id.toString(),
    });

    res.status(201).json({ success: true, data: { reportId: report._id, status: 'generating' } });
  } catch (err) {
    next(err);
  }
};

export const getReport = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
    if (!report) {
      throw new AppError('Report not found', 404, 'NOT_FOUND');
    }
    res.status(200).json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
};

export const listReports = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id };

    const [reports, total] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Report.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { reports, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};
