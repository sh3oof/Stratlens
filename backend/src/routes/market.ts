import { Router, Request, Response } from 'express';
import { getMarketData } from '../services/supabaseService';

export const marketRouter = Router();

marketRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await getMarketData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});
