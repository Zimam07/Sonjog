import nodemailer from 'nodemailer';

export async function sendVerificationEmail(to, username, verifyUrl) {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) return false; // no-op when SMTP not configured

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Verify your account',
    html: `<p>Welcome ${username},</p><p>Please verify your email by clicking <a href="${verifyUrl}">here</a>.</p>`,
  });
  return true;
}
