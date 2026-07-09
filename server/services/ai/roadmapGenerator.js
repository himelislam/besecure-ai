import Anthropic from '@anthropic-ai/sdk';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 2000;

// Findings already resolved (fixed and confirmed, false positives, or manually closed)
// don't belong in a forward-looking remediation plan.
const EXCLUDED_STATUSES = ['false_positive', 'closed', 'verified'];
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

let anthropicClient = null;
function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function buildSystemPrompt() {
  return `You are a cybersecurity consultant generating a personalized security improvement roadmap for a website owner.

You will be given a list of security findings from an automated scan. Your job is to create a realistic, week-by-week remediation plan that:
1. Prioritizes the most impactful fixes first (Critical and High severity)
2. Groups related fixes together when it makes sense
3. Provides realistic time estimates (most individual fixes take 1-4 hours)
4. Estimates score improvement per step based on severity weights:
   - Critical finding fixed: +20 points
   - High finding fixed: +10 points
   - Medium finding fixed: +5 points
   - Low finding fixed: +2 points

## Output Requirements
You MUST respond with ONLY valid JSON — no markdown, no explanation, no preamble.
The JSON must exactly match this schema:

{
  "summary": "One paragraph summary of the roadmap and expected outcome",
  "estimatedStartScore": 72,
  "estimatedEndScore": 91,
  "steps": [
    {
      "week": 1,
      "title": "Task title (concise, action-oriented)",
      "why": "Why this matters and what risk it addresses (2-3 sentences)",
      "how": "Specific, practical steps to fix it (2-4 sentences)",
      "estimatedScoreGain": 20,
      "severity": "critical|high|medium|low"
    }
  ]
}

## Rules
- Generate steps across 2-5 weeks maximum (don't overwhelm the user)
- Each week should have 2-4 steps (not more)
- Week 1 must address all Critical severity findings
- Week 2 addresses High severity
- Remaining weeks handle Medium and Low
- If there are no Critical/High findings, compress into fewer weeks
- estimatedEndScore = estimatedStartScore + sum of estimatedScoreGain for all steps (cap at 98 — perfect security doesn't exist)
- Do not include findings marked as "false_positive" or "closed" in the plan
- Keep descriptions practical — assume the user is a developer, not a security expert`;
}

function buildUserPrompt(scan, vulnerabilities) {
  const openVulns = vulnerabilities.filter((v) => !EXCLUDED_STATUSES.includes(v.status));

  const bySeverity = SEVERITY_ORDER.reduce((acc, sev) => {
    acc[sev] = openVulns.filter((v) => v.severity === sev);
    return acc;
  }, {});

  const findingsBlock = SEVERITY_ORDER.filter((sev) => bySeverity[sev].length > 0)
    .map(
      (sev) =>
        `${sev.toUpperCase()} (${bySeverity[sev].length}):\n` +
        bySeverity[sev]
          .map(
            (v) =>
              `- ${v.title}\n   OWASP: ${v.owaspCategory} | Category: ${v.category}\n   Description: ${v.description}\n   Recommendation: ${v.recommendation}`
          )
          .join('\n\n')
    )
    .join('\n\n');

  return `Generate a security improvement roadmap for this website.

Current Security Score: ${scan.score}/100 (Grade: ${scan.grade})

Open Findings to Address (grouped by severity):
${findingsBlock || 'No open findings!'}

${openVulns.length === 0 ? 'No open findings! Generate a maintenance roadmap focusing on proactive security improvements.' : ''}

Respond with ONLY the JSON object. No other text.`;
}

function parseRoadmapResponse(rawText) {
  // .trim() must run first — the fence regexes are anchored with ^/$, so any
  // leading/trailing whitespace around the fences would otherwise stop them matching.
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    logger.error({ message: 'Roadmap JSON parse failed', rawText, error: parseError.message });
    throw new AppError(
      'Failed to generate roadmap — AI response was not valid JSON. Please try again.',
      500,
      'AI_PARSE_ERROR'
    );
  }

  if (!Array.isArray(parsed.steps)) {
    throw new AppError('Roadmap generation returned unexpected format. Please try again.', 500, 'AI_FORMAT_ERROR');
  }

  return parsed;
}

export async function generateRoadmap(scan, vulnerabilities) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(scan, vulnerabilities);

  let response;
  try {
    response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (err) {
    logger.error({ message: 'Roadmap Claude API call failed', error: err.message });
    throw new AppError('AI assistant is temporarily unavailable. Please try again.', 503, 'AI_UNAVAILABLE');
  }

  const textBlock = response.content.find((block) => block.type === 'text');
  const parsed = parseRoadmapResponse(textBlock?.text || '');

  return {
    summary: parsed.summary,
    estimatedStartScore: parsed.estimatedStartScore,
    estimatedEndScore: parsed.estimatedEndScore,
    steps: parsed.steps.map((s) => ({
      week: s.week,
      title: s.title,
      why: s.why,
      how: s.how,
      estimatedScoreGain: s.estimatedScoreGain,
      severity: s.severity,
      isDone: false,
      completedAt: null,
    })),
    tokenUsage: {
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    },
  };
}

export default generateRoadmap;
