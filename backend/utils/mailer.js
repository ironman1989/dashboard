const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM_EMAIL = 'Financial Dashboard <onboarding@resend.dev>';

async function sendVerificationEmail(email, token) {
  const link = `${APP_URL}/api/auth/verify/${token}`;
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your email — Financial Dashboard',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#161b22;color:#e6edf3;border-radius:12px">
        <h2 style="color:#388bfd;margin-bottom:8px">Financial Dashboard</h2>
        <p style="color:#8b949e;margin-bottom:24px">Verify your email address to activate your account.</p>
        <a href="${link}" style="display:inline-block;background:#388bfd;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
        <p style="color:#8b949e;font-size:12px;margin-top:24px">Or copy this link:<br/><a href="${link}" style="color:#388bfd">${link}</a></p>
        <p style="color:#8b949e;font-size:12px;margin-top:16px">This link expires in 24 hours.</p>
      </div>`
  });
  if (error) {
    console.error(`[RESEND ERROR] ${JSON.stringify(error)}`);
    throw new Error(error.message);
  }
  console.log(`[RESEND] Verification email sent to ${email} — id: ${data.id}`);
}

async function sendPasswordResetEmail(email, token) {
  const link = `${APP_URL}/#reset=${token}`;
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your password — Financial Dashboard',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#161b22;color:#e6edf3;border-radius:12px">
        <h2 style="color:#388bfd;margin-bottom:8px">Financial Dashboard</h2>
        <p style="color:#8b949e;margin-bottom:24px">Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;background:#f85149;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
        <p style="color:#8b949e;font-size:12px;margin-top:24px">Or copy this link:<br/><a href="${link}" style="color:#388bfd">${link}</a></p>
        <p style="color:#8b949e;font-size:12px;margin-top:16px">If you didn't request this, ignore this email.</p>
      </div>`
  });
  if (error) {
    console.error(`[RESEND ERROR] ${JSON.stringify(error)}`);
    throw new Error(error.message);
  }
  console.log(`[RESEND] Password reset email sent to ${email} — id: ${data.id}`);
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
