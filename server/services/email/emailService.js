import nodemailer from 'nodemailer';
import { logger } from '../../utils/logger.js';
import { verificationEmailTemplate } from './templates/verificationEmail.js';
import { passwordResetEmailTemplate } from './templates/passwordResetEmail.js';

let smtpTransport = null;

function getSmtpTransport() {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return smtpTransport;
}

async function sendViaResend({ to, subject, html }) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  // The Resend SDK resolves with { data, error } — it does NOT throw or reject on an
  // API-level failure (invalid/unverified sender domain, restricted recipient while on
  // the shared onboarding@resend.dev sender, rate limit, etc). Without checking `error`
  // here, every one of those failures was logged as "Email sent" with nothing actually
  // delivered — silently swallowing exactly the kind of failure that explains
  // "I don't receive any mail through Resend".
  const { error } = await resend.emails.send({
    from: `${process.env.EMAIL_FROM_NAME || 'Security Audit Platform'} <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(`Resend API error: ${error.name || 'unknown'} - ${error.message || JSON.stringify(error)}`);
  }
}

async function sendViaSmtp({ to, subject, html }) {
  await getSmtpTransport().sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'Security Audit Platform'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

async function send({ to, subject, html }) {
  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend({ to, subject, html });
    } else {
      await sendViaSmtp({ to, subject, html });
    }
    logger.info('Email sent', { to, subject });
  } catch (err) {
    logger.error({ message: 'Failed to send email', error: err.message, to, subject });
    throw err;
  }
}

export async function sendVerificationEmail(to, name, token) {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const html = verificationEmailTemplate({ name, verifyUrl });
  await send({ to, subject: 'Verify your email address', html });
}

export async function sendPasswordResetEmail(to, name, token) {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const html = passwordResetEmailTemplate({ name, resetUrl });
  await send({ to, subject: 'Reset your password', html });
}
