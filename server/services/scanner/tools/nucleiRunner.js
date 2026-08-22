import { execFile } from 'child_process';

// 2 min default — configurable for the same reason ZAP_TIMEOUT_MS is: a real external
// target with many matching exposure/misconfiguration templates can genuinely take
// longer than a fast, mostly-empty test target does.
const TIMEOUT_MS = parseInt(process.env.NUCLEI_TIMEOUT_MS, 10) || 120000;

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
      (error, stdout, stderr) => {
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
          // execFile's default error.message is just "Command failed: <cmd>" with no
          // indication of *why* — attach stderr/signal so a real failure is diagnosable
          // instead of an opaque message (this is also exactly what a killed/SIGTERM'd
          // process looks like, e.g. if TIMEOUT_MS is too short for the target).
          if (stderr) error.message += `\nstderr: ${stderr}`;
          if (error.signal) error.message += ` (killed by signal ${error.signal})`;
          return reject(error);
        }

        resolve({ results, _durationMs: Date.now() - start });
      }
    );

    child.on('error', reject);
  });
}

export default runNuclei;
