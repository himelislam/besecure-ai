import { execFile } from 'child_process';

const TIMEOUT_MS = 120000;

export async function runNuclei(targetUrl) {
  const start = Date.now();
  const parsedUrl = new URL(targetUrl); // throws on an invalid URL — never pass raw input to execFile

  return new Promise((resolve, reject) => {
    const child = execFile(
      process.env.NUCLEI_BINARY_PATH,
      [
        '-u',
        parsedUrl.toString(),
        // Nuclei 3.x renamed the stdout JSON flag from -json to -jsonl (still one JSON object per line).
        '-jsonl',
        '-no-interactsh',
        '-t',
        'http/exposures/',
        '-t',
        'http/misconfiguration/',
        '-silent',
      ],
      { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        // Nuclei exits non-zero in some environments even on a clean run with findings;
        // what matters is whether we got parseable JSONL output on stdout.
        const results = [];
        for (const line of (stdout || '').split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            results.push(JSON.parse(trimmed));
          } catch {
            // ignore non-JSON noise lines
          }
        }

        if (error && results.length === 0) {
          return reject(error);
        }

        resolve({ results, _durationMs: Date.now() - start });
      }
    );

    child.on('error', reject);
  });
}

export default runNuclei;
