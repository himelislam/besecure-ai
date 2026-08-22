import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);
// 3 min default — configurable for the same reason ZAP_TIMEOUT_MS/NUCLEI_TIMEOUT_MS
// are, on top of the --ip one fix below.
const TIMEOUT_MS = parseInt(process.env.TESTSSL_TIMEOUT_MS, 10) || 180000;

export async function runTestssl(targetUrl) {
  const start = Date.now();
  const parsedUrl = new URL(targetUrl); // validate before use
  const hostAndPort = parsedUrl.host; // .hostname alone drops a non-default port
  const tmpFile = path.join(os.tmpdir(), `testssl-${crypto.randomUUID()}.json`);

  try {
    // testssl.sh's --jsonfile writes an *additional* copy of the results to this path —
    // it does not replace normal stdout output. Passing /dev/stdout here (as docs/06
    // literally shows) interleaves human-readable progress text into the JSON stream
    // and breaks JSON.parse(); a real temp file keeps the two streams separate.
    // --ip one: test only the first IP a hostname resolves to. Without this, testssl.sh
    // repeats the *entire* test suite once per resolved IP — any domain behind a CDN/LB
    // (i.e. most real domains) commonly resolves to 2+ IPs, which reliably pushed real
    // scans past TIMEOUT_MS (confirmed: ~110-140s per IP, so 2 IPs alone exceeds 180s).
    // When execFileAsync's timeout fires it SIGTERMs testssl.sh mid-write to --jsonfile,
    // and the fallback below (file exists -> assume it's a complete, valid result) then
    // hands JSON.parse a truncated file, which throws a SyntaxError deep in the array —
    // that's what "testssl scan failed" actually was, not a hexdump/env issue.
    await execFileAsync(
      process.env.TESTSSL_PATH,
      ['--ip', 'one', '--jsonfile', tmpFile, '--quiet', '--color', '0', hostAndPort],
      { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (err) {
    // testssl.sh commonly exits non-zero even on a successful scan (e.g. when
    // findings are present) — what matters is whether it actually wrote a result file.
    try {
      await fs.access(tmpFile);
    } catch {
      throw err;
    }
  }

  const raw = await fs.readFile(tmpFile, 'utf8');
  await fs.unlink(tmpFile).catch(() => {});

  try {
    return { results: JSON.parse(raw), _durationMs: Date.now() - start };
  } catch (err) {
    // A parse failure here almost always means the process above was killed
    // (timeout or otherwise) mid-write, leaving a truncated file rather than a
    // genuinely malformed one — say so instead of surfacing a bare SyntaxError.
    throw new Error(`testssl.sh produced invalid JSON, likely truncated by a timeout or kill: ${err.message}`);
  }
}

export default runTestssl;
