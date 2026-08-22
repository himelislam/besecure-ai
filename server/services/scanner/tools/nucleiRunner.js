import { execFile } from 'child_process';

// 5 min default — confirmed a real target running the full exposures+misconfiguration
// template set can produce zero output for the entire old 2min budget and still be
// legitimately working, not hung (deep scans are async, so this is an acceptable trade
// for staying thorough rather than narrowing which templates run).
const TIMEOUT_MS = parseInt(process.env.NUCLEI_TIMEOUT_MS, 10) || 5 * 60 * 1000;

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
