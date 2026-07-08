import Website from '../models/Website.js';
import { createWebsiteSchema, updateWebsiteSchema, extractDomain } from '../schemas/websiteSchemas.js';
import { generateVerificationToken } from '../utils/tokenGenerator.js';
import { verifyDns } from '../services/verification/dnsVerifier.js';
import { verifyMetaTag } from '../services/verification/metaTagVerifier.js';
import { AppError } from '../utils/AppError.js';

export const listWebsites = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id, isDeleted: false };

    const [websites, total] = await Promise.all([
      Website.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Website.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { websites, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const createWebsite = async (req, res, next) => {
  try {
    const { url, nickname } = createWebsiteSchema.parse(req.body);
    const domain = extractDomain(url);

    const existingCount = await Website.countDocuments({ userId: req.user._id, isDeleted: false });
    const limit = req.tier === 'premium' ? Infinity : parseInt(process.env.MAX_WEBSITES_FREE) || 3;
    if (existingCount >= limit) {
      throw new AppError('Website limit reached for your plan', 403, 'PLAN_LIMIT_REACHED');
    }

    const duplicate = await Website.findOne({ userId: req.user._id, domain, isDeleted: false });
    if (duplicate) {
      throw new AppError('This domain has already been added', 409, 'DUPLICATE_KEY');
    }

    const website = await Website.create({
      userId: req.user._id,
      url,
      domain,
      nickname,
      verificationToken: generateVerificationToken(),
    });

    res.status(201).json({
      success: true,
      data: { website, verificationInstructions: website.getVerificationInstructions() },
    });
  } catch (err) {
    next(err);
  }
};

export const getWebsite = async (req, res, next) => {
  try {
    const website = await Website.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!website) {
      throw new AppError('Website not found', 404, 'NOT_FOUND');
    }
    res.status(200).json({ success: true, data: { website } });
  } catch (err) {
    next(err);
  }
};

export const updateWebsite = async (req, res, next) => {
  try {
    const updates = updateWebsiteSchema.parse(req.body);

    const website = await Website.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!website) {
      throw new AppError('Website not found', 404, 'NOT_FOUND');
    }

    if (updates.nickname !== undefined) website.nickname = updates.nickname;
    await website.save();

    res.status(200).json({ success: true, data: { website } });
  } catch (err) {
    next(err);
  }
};

export const deleteWebsite = async (req, res, next) => {
  try {
    const website = await Website.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!website) {
      throw new AppError('Website not found', 404, 'NOT_FOUND');
    }

    website.isDeleted = true;
    website.deletedAt = new Date();
    await website.save();

    res.status(200).json({ success: true, message: 'Website removed' });
  } catch (err) {
    next(err);
  }
};

export const initiateVerification = async (req, res, next) => {
  try {
    const website = await Website.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!website) {
      throw new AppError('Website not found', 404, 'NOT_FOUND');
    }

    res.status(200).json({ success: true, data: website.getVerificationInstructions() });
  } catch (err) {
    next(err);
  }
};

export const checkVerification = async (req, res, next) => {
  try {
    const website = await Website.findOne({ _id: req.params.id, userId: req.user._id, isDeleted: false });
    if (!website) {
      throw new AppError('Website not found', 404, 'NOT_FOUND');
    }

    const [dnsResult, metaResult] = await Promise.all([
      verifyDns(website.domain, website.verificationToken),
      verifyMetaTag(website.url, website.verificationToken),
    ]);

    website.lastVerificationAttempt = new Date();
    website.verificationAttempts += 1;

    const method = dnsResult.verified ? 'dns' : metaResult.verified ? 'meta_tag' : null;

    if (method) {
      website.verified = true;
      website.verificationMethod = method;
      if (!website.verifiedAt) website.verifiedAt = new Date();
    }

    await website.save();

    res.status(200).json({
      success: true,
      data: {
        verified: website.verified,
        message: website.verified
          ? `Domain verified via ${website.verificationMethod === 'dns' ? 'DNS TXT record' : 'HTML meta tag'}`
          : 'Verification failed — no matching DNS TXT record or meta tag was found',
      },
    });
  } catch (err) {
    next(err);
  }
};
