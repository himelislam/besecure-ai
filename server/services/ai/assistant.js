import Anthropic from '@anthropic-ai/sdk';
import Scan from '../../models/Scan.js';
import Vulnerability from '../../models/Vulnerability.js';
import Website from '../../models/Website.js';
import ChatMessage from '../../models/ChatMessage.js';
import { buildAssistantSystemPrompt } from './promptBuilder.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const AI_ERROR_MESSAGES = {
  overloaded_error: 'The AI is currently busy. Please try again in a moment.',
  rate_limit_error: 'AI message limit reached. Please wait before sending another message.',
  invalid_api_key: 'AI service configuration error. Please contact support.',
  // The Anthropic API actually returns this type for a bad/missing key — docs/15's
  // `invalid_api_key` key is kept above for compatibility but never matches in practice.
  authentication_error: 'AI service configuration error. Please contact support.',
  default: 'AI assistant is temporarily unavailable. Please try again.',
};

let anthropicClient = null;
function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// Ownership-scoped: a scanId the caller doesn't own (or that doesn't exist) simply
// yields no context rather than failing the chat request.
async function buildScanContext(userId, scanId) {
  const scan = await Scan.findOne({ _id: scanId, userId, isDeleted: false }).lean();
  if (!scan) return null;

  const website = await Website.findById(scan.websiteId).lean();

  const vulnerabilities = await Vulnerability.find({
    isDeleted: false,
    $or: [{ scanId: scan._id }, { lastCheckedScanId: scan._id }],
  })
    .limit(100)
    .lean();

  vulnerabilities.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));

  return {
    url: website?.url || scan.targetUrl,
    createdAt: scan.createdAt,
    type: scan.type,
    score: scan.score,
    grade: scan.grade,
    findingCounts: scan.findingCounts,
    vulnerabilities,
  };
}

export async function sendMessage(userId, content, options = {}) {
  const { scanId } = options;

  const scanContext = scanId ? await buildScanContext(userId, scanId) : null;
  const systemPrompt = buildAssistantSystemPrompt({ _id: userId }, scanContext);

  const historyDocs = await ChatMessage.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();
  const history = historyDocs.reverse().map((m) => ({ role: m.role, content: m.content }));

  const messages = [...history, { role: 'user', content }];

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');

    return {
      content: textBlock?.text || '',
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    };
  } catch (err) {
    logger.error({ message: 'Claude API call failed', error: err.message });
    // The SDK's thrown error nests the actual API error type two levels deep:
    // { status, error: { type: 'error', error: { type: 'authentication_error', ... } } }
    const errorType = err?.error?.error?.type || err?.error?.type || err?.type || 'default';
    const userMessage = AI_ERROR_MESSAGES[errorType] || AI_ERROR_MESSAGES.default;
    throw new AppError(userMessage, 503, 'AI_UNAVAILABLE');
  }
}

export default sendMessage;
