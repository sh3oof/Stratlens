import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../services/supabaseService';

export const watchlistRouter = Router();

watchlistRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId as string;
  try {
    const codes = await getWatchlist(userId);
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

const addSchema = z.object({
  country_code: z.string().length(2).toUpperCase(),
});

watchlistRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId as string;
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'country_code must be a 2-letter ISO code' });
    return;
  }
  try {
    await addToWatchlist(userId, parsed.data.country_code);
    res.status(201).json({ country_code: parsed.data.country_code });
  } catch (err) {
    const msg = (err as Error).message;
    // Unique constraint violation = already in watchlist
    if (msg.includes('duplicate') || msg.includes('unique')) {
      res.status(409).json({ message: 'Country already in watchlist' });
    } else {
      res.status(500).json({ message: msg });
    }
  }
});

watchlistRouter.delete('/:code', async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId as string;
  const code   = (req.params['code'] as string).toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    res.status(400).json({ message: 'country_code must be a 2-letter ISO code' });
    return;
  }
  try {
    await removeFromWatchlist(userId, code);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});
