import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: config.email.user
    ? { user: config.email.user, pass: config.email.pass }
    : undefined,
});

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!config.email.user) {
    console.log('\n========================================');
    console.log(`[DEV EMAIL] To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('========================================\n');
    return false;
  }
  await transporter.sendMail({
    from: config.email.user,
    to,
    subject,
    html,
  });
  return true;
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await sendEmail(
    to,
    'SafarX Verification Code',
    `<p>Your SafarX verification code is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`
  );
}

export async function sendVerificationLink(to: string, token: string): Promise<void> {
  const link = `${config.clientUrl}/verify-email?token=${token}`;
  await sendEmail(
    to,
    'Verify your SafarX email',
    `<p>Click to verify your email:</p><a href="${link}">${link}</a>`
  );
}
