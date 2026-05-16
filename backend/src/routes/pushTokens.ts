import { Router, Request, Response } from 'express';
import { upsertPushToken } from '../services/supabaseService';

export const pushTokensRouter = Router();

pushTokensRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId as string;
  const { token, platform } = req.body as { token?: string; platform?: string };

  if (!token || typeof token !== 'string') {
    res.status(400).json({ message: 'token is required' });
    return;
  }

  try {
    await upsertPushToken(userId, token, platform);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});
