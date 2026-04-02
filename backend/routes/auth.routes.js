// routes/auth.routes.js — MongoDB + Google OAuth + Password Reset
import express  from 'express';
import passport from 'passport';
import crypto   from 'crypto';
import nodemailer from 'nodemailer';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User       from '../models/User.js';
import { makeToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ── Google OAuth setup ─────────────────────────────
const GOOGLE_CONFIGURED =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here';

if (GOOGLE_CONFIGURED) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  `${process.env.FRONTEND_URL?.replace(':5173', ':5000') || 'http://localhost:5000'}/api/auth/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email   = profile.emails?.[0]?.value?.toLowerCase();
      const picture = profile.photos?.[0]?.value;
      const name    = profile.displayName;
      let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
      if (user) {
        if (!user.googleId) { user.googleId = profile.id; user.picture = picture; }
        user.provider = 'google';
        await user.save();
      } else {
        user = await User.create({ googleId: profile.id, email, name, picture, provider: 'google', avatar: '🌟', plan: 'Free' });
      }
      done(null, user);
    } catch (err) { done(err, null); }
  }));
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try { done(null, await User.findById(id)); } catch(e) { done(e); }
  });
  router.use(passport.initialize());
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?auth=error` }),
    (req, res) => {
      const token = makeToken(req.user._id);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?token=${token}&login=google`);
    }
  );
}

router.get('/google/status', (_req, res) => res.json({ enabled: GOOGLE_CONFIGURED }));

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });
    const user = await User.create({ name: name.trim(), email, password, provider: 'local' });
    const token = makeToken(user._id);
    res.status(201).json({ token, user: user.toSafe() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Incorrect email or password.' });
    const token = makeToken(user._id);
    const safeUser = await User.findById(user._id);
    res.json({ token, user: safeUser.toSafe() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toSafe() }));

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 — don't leak whether the email exists
    if (!user || user.provider === 'google') return res.json({ ok: true });

    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await User.findByIdAndUpdate(user._id, { resetToken: token, resetExpiry: expiry });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?reset=${token}`;

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"LinguaAI" <${process.env.SMTP_USER}>`,
      to:      user.email,
      subject: 'Reset your LinguaAI password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a14;color:#e0e0e0;border-radius:16px">
          <h2 style="color:#00e5ff;margin-bottom:8px">🌐 LinguaAI</h2>
          <h3 style="margin-bottom:16px">Password Reset Request</h3>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:linear-gradient(135deg,#00e5ff,#00b8cc);color:#050515;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
            Reset My Password →
          </a>
          <p style="color:#666;font-size:13px">Or copy this link:<br><a href="${resetUrl}" style="color:#00e5ff;word-break:break-all">${resetUrl}</a></p>
          <p style="color:#555;font-size:12px;margin-top:24px;border-top:1px solid #222;padding-top:16px">
            If you didn't request a password reset, you can safely ignore this email. Your account is secure.
          </p>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to send reset email. Check SMTP settings in .env' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const user = await User.findOne({
      resetToken:  token,
      resetExpiry: { $gt: new Date() },
    }).select('+resetToken +resetExpiry +password');

    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });

    user.password    = password;       // pre-save hook will hash it
    user.resetToken  = undefined;
    user.resetExpiry = undefined;
    await user.save();

    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
