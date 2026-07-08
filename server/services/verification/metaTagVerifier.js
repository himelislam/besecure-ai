import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = 10000;

export async function verifyMetaTag(url, token) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) {
      return { verified: false, content: null };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const content = $('meta[name="security-audit-verify"]').attr('content') || null;

    return { verified: Boolean(content) && content === token, content };
  } catch {
    return { verified: false, content: null };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default verifyMetaTag;
