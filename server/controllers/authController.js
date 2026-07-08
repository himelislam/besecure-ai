import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { getStripe } from '../config/stripe.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email/emailService.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../schemas/authSchemas.js';

const REFRESH_COOKIE_PATH = '/api/auth/refresh';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function signAccessToken(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(user) {
  return jwt.sign({ userId: user._id.toString(), tokenVersion: user.tokenVersion }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: REFRESH_COOKIE_PATH,
  };
}

async function createStripeCustomerForUser(userId, email, name) {
  const stripe = getStripe();
  if (!stripe) return;

  const customer = await stripe.customers.create({ email, name, metadata: { userId: userId.toString() } });
  await User.findByIdAndUpdate(userId, { 'subscription.stripeCustomerId': customer.id });
}

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('Email already registered', 409, 'DUPLICATE_KEY');
    }

    const userId = new mongoose.Types.ObjectId();
    const verificationToken = jwt.sign(
      { userId: userId.toString(), jti: crypto.randomUUID() },
      process.env.JWT_EMAIL_SECRET,
      { expiresIn: process.env.JWT_EMAIL_EXPIRES_IN || '24h' }
    );

    const user = await User.create({
      _id: userId,
      name,
      email,
      password,
      emailVerificationToken: verificationToken,
    });

    // Non-blocking: registration must succeed even if Stripe/email is unavailable
    createStripeCustomerForUser(user._id, user.email, user.name).catch((err) => {
      logger.error({ message: 'Failed to create Stripe customer', error: err.message, userId: user._id.toString() });
    });

    sendVerificationEmail(user.email, user.name, verificationToken).catch((err) => {
      logger.error({ message: 'Failed to send verification email', error: err.message, userId: user._id.toString() });
    });

    res.status(201).json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = verifyEmailSchema.parse(req.query);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
    } catch {
      throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN');
    }

    const user = await User.findOne({ _id: payload.userId, emailVerificationToken: token }).select(
      '+emailVerificationToken'
    );
    if (!user) {
      throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null; // one-time use
    await user.save();

    res.status(200).json({ success: true, message: 'Email verified' });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+password +tokenVersion');

    // Same error for a nonexistent user, wrong password, and an unverified email —
    // never let a caller distinguish which case they hit.
    const invalidCredentials = () => new AppError('Invalid credentials', 401, 'UNAUTHORIZED');

    if (!user) {
      throw invalidCredentials();
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches || !user.emailVerified) {
      throw invalidCredentials();
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    res.status(200).json({
      success: true,
      data: { accessToken, user: user.toJSON() },
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new AppError('Refresh token missing', 401, 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
    }

    const user = await User.findById(payload.userId).select('+tokenVersion');
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
    }

    const accessToken = signAccessToken(user);
    res.status(200).json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', { path: REFRESH_COOKIE_PATH });
    res.status(200).json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });

    if (user) {
      const resetToken = jwt.sign(
        { userId: user._id.toString(), jti: crypto.randomUUID() },
        process.env.JWT_EMAIL_SECRET,
        { expiresIn: process.env.JWT_EMAIL_EXPIRES_IN || '24h' }
      );

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_MAX_AGE);
      await user.save();

      sendPasswordResetEmail(user.email, user.name, resetToken).catch((err) => {
        logger.error({ message: 'Failed to send password reset email', error: err.message, userId: user._id.toString() });
      });
    }

    // Always the same response — never reveal whether the email exists
    res.status(200).json({ success: true, message: 'Reset link sent if email exists' });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_EMAIL_SECRET);
    } catch {
      throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN');
    }

    const user = await User.findOne({
      _id: payload.userId,
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires +tokenVersion');

    if (!user) {
      throw new AppError('Invalid or expired reset link', 400, 'INVALID_TOKEN');
    }

    user.password = newPassword; // pre-save hook re-hashes
    user.passwordResetToken = null; // one-time use
    user.passwordResetExpires = null;
    user.tokenVersion += 1; // invalidate any existing refresh tokens
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: { user: req.user.toJSON() } });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const updates = updateProfileSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.avatar !== undefined) user.avatar = updates.avatar;
    await user.save();

    res.status(200).json({ success: true, data: { user: user.toJSON() } });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await User.findById(req.user._id).select('+password +tokenVersion');
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const matches = await user.comparePassword(currentPassword);
    if (!matches) {
      throw new AppError('Current password is incorrect', 401, 'UNAUTHORIZED');
    }

    user.password = newPassword;
    user.tokenVersion += 1; // invalidates all existing refresh tokens
    await user.save();

    res.clearCookie('refreshToken', { path: REFRESH_COOKIE_PATH });

    res.status(200).json({ success: true, message: 'Password changed' });
  } catch (err) {
    next(err);
  }
};
