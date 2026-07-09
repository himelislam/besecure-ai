import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../utils/logger.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 512;

const SYSTEM_PROMPT =
  'Write a 150-200 word plain English executive summary of this security scan for a non-technical audience. Mention the score, the most critical findings, and the overall risk level. Do not use jargon. Do not make guarantees. Label it AI-Assisted.';

let anthropicClient = null;
function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function buildUserPrompt(scan, openVulns) {
  const critical = openVulns.filter((v) => v.severity === 'critical');
  const high = openVulns.filter((v) => v.severity === 'high');
  const topFindings = [...critical, ...high].slice(0, 5);

  return `Website Security Score: ${scan.score}/100 (Grade: ${scan.grade})
Scan Type: ${scan.type === 'deep' ? 'Deep Scan' : 'Baseline Scan'}
Total Open Findings: ${openVulns.length}
Critical: ${critical.length}
High: ${high.length}

Most Significant Findings:
${topFindings.map((v) => `- ${v.title}: ${v.description}`).join('\n') || 'No critical or high severity findings.'}

Write the executive summary now.`;
}

// A failed AI call must never block PDF generation entirely — fall back to a
// deterministic summary so the report can still be produced.
function buildFallbackSummary(scan, openVulns) {
  return `AI-Assisted Guidance: This website scored ${scan.score}/100 (Grade ${scan.grade}) with ${openVulns.length} open finding(s) identified at the time of this scan. An AI-generated narrative summary could not be produced for this report; please review the detailed findings and score breakdown below for specifics. This is an automated assessment and should not be treated as a substitute for professional security review.`;
}

export async function generateExecutiveSummary(scan, vulnerabilities) {
  const openVulns = vulnerabilities.filter((v) => !['false_positive', 'closed'].includes(v.status));

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(scan, openVulns) }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');

    return {
      text: textBlock?.text || buildFallbackSummary(scan, openVulns),
      tokenUsage: {
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
      },
    };
  } catch (err) {
    logger.error({ message: 'Executive summary generation failed', error: err.message });
    return {
      text: buildFallbackSummary(scan, openVulns),
      tokenUsage: { inputTokens: null, outputTokens: null },
    };
  }
}

export default generateExecutiveSummary;
