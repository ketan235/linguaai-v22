// routes/chat.routes.js — MongoDB-backed conversations
import express      from 'express';
import { requireAuth } from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import { chatWithHistory, detectLanguage } from '../services/ai.service.js';

const router = express.Router();
router.use(requireAuth);

// POST /api/chat/message
router.post('/message', async (req, res) => {
  try {
    const { conversationId, targetLanguage, provider } = req.body;
    const content = (req.body.content || req.body.message || '').trim();
    if (!content) return res.status(400).json({ error: 'Message content is required.' });

    let conv;
    if (conversationId) {
      conv = await Conversation.findOne({ _id: conversationId, userId: req.user._id });
    }
    if (!conv) {
      conv = new Conversation({
        userId: req.user._id,
        title: content.substring(0, 60),
        targetLanguage: targetLanguage || 'English',
      });
    }

    const history = conv.messages.slice(-20);
    const langInfo = await detectLanguage(content, provider).catch(() => ({ language: 'Unknown' }));
    const aiText   = await chatWithHistory(history, content, targetLanguage || conv.targetLanguage, provider);

    const userMsg = { role: 'user',      content, detectedLanguage: langInfo.language };
    const aiMsg   = { role: 'assistant', content: aiText };
    conv.addMessages(userMsg, aiMsg);
    await conv.save();

    const saved = conv.messages;
    const savedUser = saved[saved.length - 2];
    const savedAI   = saved[saved.length - 1];

    res.json({
      conversationId: conv._id,
      reply: aiText,
      provider: provider || 'default',
      userMessage:     { id: savedUser._id, role: 'user',      content: savedUser.content,  detectedLanguage: langInfo.language, timestamp: savedUser.createdAt },
      assistantMessage:{ id: savedAI._id,   role: 'assistant', content: savedAI.content,    timestamp: savedAI.createdAt },
      detectedLanguage: langInfo.language,
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message || 'AI response failed.' });
  }
});

// GET /api/chat/conversations
router.get('/conversations', async (req, res) => {
  try {
    const convs = await Conversation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('title targetLanguage updatedAt messageCount lastMessage')
      .limit(100);
    res.json({ conversations: convs.map(c => ({ ...c.toObject(), id: c._id })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/conversations/:id
router.get('/conversations/:id', async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });
    res.json({ messages: conv.messages.map(m => ({ id: m._id, role: m.role, content: m.content, timestamp: m.createdAt })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/chat/conversations/:id
router.delete('/conversations/:id', async (req, res) => {
  try {
    await Conversation.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
