import { z } from 'zod';
import ChatMessage from '../models/ChatMessage.js';
import { AppError } from '../utils/AppError.js';
import { sendMessage as callAssistant } from '../services/ai/assistant.js';

const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message is required').max(2000, 'Message must be 2000 characters or fewer'),
  scanId: z.string().optional(),
});

export const sendMessage = async (req, res, next) => {
  try {
    const { content, scanId } = sendMessageSchema.parse(req.body);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const messagesToday = await ChatMessage.countDocuments({
      userId: req.user._id,
      role: 'user',
      createdAt: { $gte: startOfDay },
    });

    const limit =
      req.tier === 'premium'
        ? parseInt(process.env.PREMIUM_AI_MESSAGES_PER_DAY) || 200
        : parseInt(process.env.FREE_AI_MESSAGES_PER_DAY) || 20;

    if (messagesToday >= limit) {
      throw new AppError('Daily AI message limit reached', 429, 'RATE_LIMITED');
    }

    const { content: replyContent, inputTokens, outputTokens } = await callAssistant(req.user._id, content, {
      scanId,
      tier: req.tier,
    });

    await ChatMessage.create({
      userId: req.user._id,
      scanId: scanId || null,
      role: 'user',
      content,
      tier: req.tier,
    });

    const assistantMessage = await ChatMessage.create({
      userId: req.user._id,
      scanId: scanId || null,
      role: 'assistant',
      content: replyContent,
      tokenUsage: { inputTokens, outputTokens },
      tier: req.tier,
    });

    res.status(200).json({
      success: true,
      data: {
        message: assistantMessage,
        aiAssisted: true,
        inputTokens,
        outputTokens,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const messages = await ChatMessage.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();

    res.status(200).json({ success: true, data: { messages: messages.reverse() } });
  } catch (err) {
    next(err);
  }
};

export const clearHistory = async (req, res, next) => {
  try {
    await ChatMessage.deleteMany({ userId: req.user._id });
    res.status(200).json({ success: true, message: 'Chat history cleared' });
  } catch (err) {
    next(err);
  }
};
