import dns from 'dns';

export async function verifyDns(domain, token) {
  try {
    const records = await dns.promises.resolveTxt(`_security-audit-verify.${domain}`);
    const flattened = records.map((chunks) => chunks.join(''));
    const match = flattened.find((record) => record.includes(token));
    return { verified: Boolean(match), record: match || null };
  } catch {
    return { verified: false, record: null };
  }
}

export default verifyDns;
