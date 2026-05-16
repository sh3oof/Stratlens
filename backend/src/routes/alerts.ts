import { Router, Request, Response } from 'express';
import { getAlertsByUser, markAlertRead } from '../services/supabaseService';

export const alertsRouter = Router();

alertsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId as string;
  try {
    const alerts = await getAlertsByUser(userId);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

alertsRouter.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    await markAlertRead(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});
