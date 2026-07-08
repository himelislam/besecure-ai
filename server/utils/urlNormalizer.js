export function normalizeUrl(rawUrl) {
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const parsed = new URL(withProtocol);
  return `https://${parsed.hostname.toLowerCase()}`;
}

export default normalizeUrl;
