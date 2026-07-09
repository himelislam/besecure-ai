import Roadmap from '../models/Roadmap.js';
import Scan from '../models/Scan.js';
import Vulnerability from '../models/Vulnerability.js';
import { AppError } from '../utils/AppError.js';
import { generateRoadmap as callRoadmapGenerator } from '../services/ai/roadmapGenerator.js';

export const generateRoadmap = async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.scanId, userId: req.user._id, isDeleted: false });
    if (!scan) {
      throw new AppError('Scan not found', 404, 'NOT_FOUND');
    }

    const existing = await Roadmap.findOne({ scanId: scan._id, userId: req.user._id });
    if (existing && existing.status === 'completed') {
      return res.status(200).json({ success: true, data: { roadmap: existing } });
    }

    // Reuse the existing document (retry after a prior failure/interruption) or start fresh.
    const roadmapDoc =
      existing ||
      (await Roadmap.create({
        userId: req.user._id,
        scanId: scan._id,
        websiteId: scan.websiteId,
        status: 'generating',
      }));

    if (existing) {
      roadmapDoc.status = 'generating';
      roadmapDoc.error = null;
      await roadmapDoc.save();
    }

    const vulnerabilities = await Vulnerability.find({
      isDeleted: false,
      $or: [{ scanId: scan._id }, { lastCheckedScanId: scan._id }],
    }).lean();

    try {
      const result = await callRoadmapGenerator(scan, vulnerabilities);

      roadmapDoc.summary = result.summary;
      roadmapDoc.estimatedStartScore = result.estimatedStartScore;
      roadmapDoc.estimatedEndScore = result.estimatedEndScore;
      roadmapDoc.steps = result.steps;
      roadmapDoc.status = 'completed';
      roadmapDoc.error = null;
      roadmapDoc.generatedAt = new Date();
      roadmapDoc.tokenUsage = result.tokenUsage;
      await roadmapDoc.save();

      res.status(201).json({ success: true, data: { roadmap: roadmapDoc } });
    } catch (genErr) {
      roadmapDoc.status = 'failed';
      roadmapDoc.error = genErr.message;
      await roadmapDoc.save();
      throw genErr;
    }
  } catch (err) {
    next(err);
  }
};

export const getRoadmap = async (req, res, next) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.scanId, userId: req.user._id, isDeleted: false });
    if (!scan) {
      throw new AppError('Scan not found', 404, 'NOT_FOUND');
    }

    const roadmap = await Roadmap.findOne({ scanId: scan._id, userId: req.user._id });
    if (!roadmap) {
      throw new AppError('Roadmap not found', 404, 'NOT_FOUND');
    }

    res.status(200).json({ success: true, data: { roadmap } });
  } catch (err) {
    next(err);
  }
};

export const updateStep = async (req, res, next) => {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.roadmapId, userId: req.user._id });
    if (!roadmap) {
      throw new AppError('Roadmap not found', 404, 'NOT_FOUND');
    }

    const step = roadmap.steps.id(req.params.stepId);
    if (!step) {
      throw new AppError('Step not found', 404, 'NOT_FOUND');
    }

    step.isDone = !step.isDone;
    step.completedAt = step.isDone ? new Date() : null;

    await roadmap.save();

    res.status(200).json({ success: true, data: { roadmap } });
  } catch (err) {
    next(err);
  }
};
