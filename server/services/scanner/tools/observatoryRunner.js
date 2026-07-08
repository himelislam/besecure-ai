const TIMEOUT_MS = 30000;

// The installable package is `@mdn/mdn-http-observatory` (the bare `mdn-http-observatory`
// name referenced in docs/06 does not exist on npm). Its scan() expects a `Site` instance,
// not a raw hostname string, so we build one via Site.fromSiteString() first.
export async function runObservatory(targetUrl) {
  const start = Date.now();
  const hostname = new URL(targetUrl).hostname;

  const { scan } = await import('@mdn/mdn-http-observatory');
  const { Site } = await import('@mdn/mdn-http-observatory/src/site.js');

  const site = Site.fromSiteString(hostname);

  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Observatory scan timed out')), TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([scan(site, { rescanIfStale: true }), timeout]);
    return { ...result, _durationMs: Date.now() - start };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default runObservatory;
