import { Router, Request, Response } from 'express';
import { getRegions, getRegionByCode } from '../services/supabaseService';

export const regionsRouter = Router();

regionsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const regions = await getRegions();
    res.json(regions);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

regionsRouter.get('/:code', async (req: Request, res: Response): Promise<void> => {
  const code = (req.params['code'] as string).toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    res.status(400).json({ message: 'country_code must be a 2-letter ISO-3166-1 alpha-2 code' });
    return;
  }
  try {
    const region = await getRegionByCode(code);
    res.json(region);
  } catch (err) {
    res.status(404).json({ message: (err as Error).message });
  }
});
