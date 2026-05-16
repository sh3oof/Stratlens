import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { summarizeArticle, analyzeEvent, generateRegionBrief, translateText } from '../services/claudeService';

export const aiRouter = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'Too many AI requests. Please wait before retrying.' },
});

// General AI limiter — summarise, brief, analyse
aiRouter.use('/summarize', aiLimiter);
aiRouter.use('/brief',     aiLimiter);

// Translation has its own higher limit: list views can pre-warm ~10 cards at once
const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { message: 'Too many translation requests. Please wait before retrying.' },
});

const summarizeSchema = z.object({
  content: z.string().min(100).max(10_000),
  sourceName: z.string().min(1),
});

aiRouter.post('/summarize', async (req: Request, res: Response): Promise<void> => {
  const parsed = summarizeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid request body', errors: parsed.error.errors });
    return;
  }
  try {
    const summary = await summarizeArticle(parsed.data.content, parsed.data.sourceName);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

const briefSchema = z.object({
  regionName: z.string().min(1),
  events: z.array(z.object({
    title:       z.string(),
    summary:     z.string(),
    tier:        z.string(),
    published_at: z.string(),
  })).min(1).max(20),
});

// ── Translate ──────────────────────────────────────────────────────────────────

const translateSchema = z.object({
  text:           z.string().min(1).max(5000),
  targetLanguage: z.enum(['ar', 'es']),
});

aiRouter.post('/translate', translateLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = translateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid request body', errors: parsed.error.errors });
    return;
  }
  try {
    const translatedText = await translateText(parsed.data.text, parsed.data.targetLanguage);
    res.json({ translatedText });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

aiRouter.post('/brief', async (req: Request, res: Response): Promise<void> => {
  const parsed = briefSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid request body', errors: parsed.error.errors });
    return;
  }
  try {
    const brief = await generateRegionBrief(parsed.data.regionName, parsed.data.events);
    res.json({ brief });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});
