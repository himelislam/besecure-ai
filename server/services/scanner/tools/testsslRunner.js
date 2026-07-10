import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 180000;

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
    await execFileAsync(process.env.TESTSSL_PATH, ['--jsonfile', tmpFile, '--quiet', '--color', '0', hostAndPort], {
      timeout: TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
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

  return { results: JSON.parse(raw), _durationMs: Date.now() - start };
}

export default runTestssl;
