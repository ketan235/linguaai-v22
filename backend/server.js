// ═══════════════════════════════════════════════════
//  LinguaAI Backend — server.js (MongoDB + Groq)
// ═══════════════════════════════════════════════════
import express    from 'express';
import cors       from 'cors';
import dotenv     from 'dotenv';
import rateLimit  from 'express-rate-limit';
import path       from 'path';
import { fileURLToPath } from 'url';
import fs         from 'fs';
import mongoose   from 'mongoose';

import authRoutes      from './routes/auth.routes.js';
import chatRoutes      from './routes/chat.routes.js';
import translateRoutes from './routes/translate.routes.js';
import fileRoutes      from './routes/file.routes.js';
import cors from "cors";

app.use(cors({
  origin: "https://linguaai-v22.vercel.app",
  credentials: true
}));

dotenv.config();

const hasGroq   = process.env.GROQ_API_KEY   && process.env.GROQ_API_KEY   !== 'your_groq_api_key_here';
const hasGemini = process.env.GEMINI_API_KEY  && process.env.GEMINI_API_KEY  !== 'your_gemini_api_key_here';

if (!hasGroq && !hasGemini) {
  console.error('\n❌  No AI API key found! Set GROQ_API_KEY or GEMINI_API_KEY in backend/.env\n');
  process.exit(1);
}
const enabledProviders = [hasGroq && 'Groq', hasGemini && 'Gemini'].filter(Boolean);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 5000;

// Ensure upload dir exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── MongoDB ───────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linguaai';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅  MongoDB connected:', MONGODB_URI.replace(/\/\/.*@/, '//***@')))
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    console.error('   Set MONGODB_URI in backend/.env');
    console.error('   Free cloud DB: https://mongodb.com/atlas\n');
    process.exit(1);
  });

// ── Middleware ────────────────────────────────────
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(uploadDir));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { error: 'Too many requests, please try again later.' },
}));

// ── Routes ────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/chat',      chatRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/file',      fileRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', providers: enabledProviders, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', timestamp: new Date().toISOString() })
);

app.use((err, _req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🌐 LinguaAI backend running!');
  console.log(`   → http://localhost:${PORT}`);
  console.log(`✅  AI providers: ${enabledProviders.join(', ')}`);
  console.log('📦  MongoDB store active\n');
});