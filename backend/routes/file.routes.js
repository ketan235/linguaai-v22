// routes/file.routes.js — auth-protected file translation
import express from 'express';
import multer  from 'multer';
import path    from 'path';
import fs      from 'fs';
import { fileURLToPath } from 'url';
import { translateDocumentContent } from '../services/ai.service.js';
import { requireAuth } from '../middleware/auth.js';

const router    = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.md', '.docx', '.doc', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const buf = fs.readFileSync(filePath);
  if (['.txt', '.md', '.csv'].includes(ext)) return buf.toString('utf8');
  if (ext === '.pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    return (await pdfParse(buf)).text;
  }
  if (['.docx', '.doc'].includes(ext)) {
    const mammoth = (await import('mammoth')).default;
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

async function buildTranslatedPDF(translatedText, originalName, targetLanguage) {
  const PDFDocument = (await import('pdfkit')).default;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(10).fillColor('#666666')
       .text(`Translated by LinguaAI  ·  Target: ${targetLanguage}  ·  Source: ${originalName}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#dddddd').stroke();
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#111111');
    const paragraphs = translatedText.split(/\n{2,}/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      doc.text(trimmed, { align: 'left', lineGap: 4 });
      doc.moveDown(0.8);
    }
    doc.end();
  });
}

// POST /api/file/upload — protected
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded or unsupported type.' });
  try {
    const { targetLanguage = 'English', sourceLanguage = 'auto', provider } = req.body;
    const text = await extractText(req.file.path, req.file.originalname);
    if (!text.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not extract text from this file.' });
    }
    const translation = await translateDocumentContent(text, targetLanguage, sourceLanguage);
    const pdfBuf  = await buildTranslatedPDF(translation, req.file.originalname, targetLanguage);
    const pdfName = `translated_${Date.now()}.pdf`;
    const pdfPath = path.join(uploadDir, pdfName);
    fs.writeFileSync(pdfPath, pdfBuf);
    setTimeout(() => { try { fs.unlinkSync(pdfPath); } catch {} }, 5 * 60 * 1000);
    fs.unlinkSync(req.file.path);
    res.json({
      originalText: text.substring(0, 3000),
      translation,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      fileName: req.file.originalname,
      pdfDownloadUrl: `/uploads/${pdfName}`,
      targetLanguage
    });
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch {}
    console.error('File upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
