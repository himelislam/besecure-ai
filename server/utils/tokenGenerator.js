import crypto from 'crypto';

export function generateVerificationToken() {
  return `sav-verify-${crypto.randomUUID()}`;
}

export default generateVerificationToken;
