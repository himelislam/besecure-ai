import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 60000;

export async function runSSLyze(targetUrl) {
  const start = Date.now();
  // .hostname alone drops a non-default port (only surfaced when testing against a
  // non-443 target — see testsslRunner.js for the same fix and more detail).
  const hostAndPort = new URL(targetUrl).host;

  // SSLyze 6.x dropped the old `--regular` flag; `--mozilla_config=intermediate` is the
  // modern equivalent, queuing the standard set of certificate + protocol/cipher checks.
  const { stdout, stderr } = await execFileAsync(
    process.env.SSLYZE_PYTHON || 'python3',
    ['-m', 'sslyze', '--json_out=-', '--mozilla_config=intermediate', hostAndPort],
    { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }
  );

  if (!stdout) {
    throw new Error(`SSLyze produced no output: ${stderr}`);
  }

  const parsed = JSON.parse(stdout);
  return { ...parsed, _durationMs: Date.now() - start };
}

export default runSSLyze;
