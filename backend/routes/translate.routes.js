// routes/translate.routes.js
import express from 'express';
import { translateText } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// POST /api/translate
router.post('/', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'auto', provider } = req.body;
    if (!text || !targetLanguage)
      return res.status(400).json({ error: 'text and targetLanguage are required.' });

    const result = await translateText(text, targetLanguage, sourceLanguage, provider);
    res.json({ ...result, provider: provider || 'default' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
