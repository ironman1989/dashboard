const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'fd$@#!secret2026';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const user = new User({ email, password, name, verifyToken, isVerified: false });
    await user.save();

    await sendVerificationEmail(email, verifyToken);
    console.log(`[VERIFY LINK] ${process.env.APP_URL}/api/auth/verify/${verifyToken}`);
    res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify/:token
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verifyToken: req.params.token });
    if (!user) return res.status(400).send(errorPage('Invalid or expired verification link.'));

    user.isVerified = true;
    user.verifyToken = null;
    await user.save();

    res.send(successPage('Email verified! You can now sign in.'));
  } catch (err) {
    res.status(500).send(errorPage(err.message));
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email before signing in.' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email });
    // Always return success to prevent email enumeration
    if (!user || !user.isVerified) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });

    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link.' });

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HTML helper pages for email verification redirect
function successPage(msg) {
  return `<!DOCTYPE html><html><head><title>Financial Dashboard</title>
  <style>body{background:#0d1117;color:#e6edf3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .box{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;text-align:center;max-width:400px}
  h2{color:#3fb950}a{color:#388bfd}</style></head>
  <body><div class="box"><h2>✓ ${msg}</h2><p style="color:#8b949e;margin-top:16px"><a href="/">Go to Dashboard →</a></p></div></body></html>`;
}
function errorPage(msg) {
  return `<!DOCTYPE html><html><head><title>Financial Dashboard</title>
  <style>body{background:#0d1117;color:#e6edf3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .box{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;text-align:center;max-width:400px}
  h2{color:#f85149}a{color:#388bfd}</style></head>
  <body><div class="box"><h2>✗ ${msg}</h2><p style="color:#8b949e;margin-top:16px"><a href="/">Go back →</a></p></div></body></html>`;
}

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
