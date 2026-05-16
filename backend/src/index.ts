import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { eventsRouter }    from './routes/events';
import { regionsRouter }   from './routes/regions';
import { alertsRouter }    from './routes/alerts';
import { aiRouter }        from './routes/ai';
import { marketRouter }    from './routes/market';
import { watchlistRouter }  from './routes/watchlist';
import { pushTokensRouter }  from './routes/pushTokens';
import { authMiddleware } from './middleware/auth';
import { pingSupabase } from './services/supabaseService';
import { startScheduler } from './services/scheduler';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' }));
app.use(express.json({ limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  const supabaseOk = await pingSupabase().catch(() => false);
  res.status(supabaseOk ? 200 : 503).json({
    status:    supabaseOk ? 'ok' : 'degraded',
    supabase:  supabaseOk ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
});

// ─── Public API ───────────────────────────────────────────────────────────────
// GET /api/events and GET /api/regions require no auth so the feed loads
// for unauthenticated users. Save/unsave and /saved are guarded inside the router.

app.use('/api/events',  eventsRouter);
app.use('/api/regions', regionsRouter);
app.use('/api/market',  marketRouter);   // public — no auth required

// ─── Protected API ────────────────────────────────────────────────────────────

app.use('/api/alerts',    authMiddleware, alertsRouter);
app.use('/api/watchlist',    authMiddleware, watchlistRouter);
app.use('/api/push-tokens', authMiddleware, pushTokensRouter);
app.use('/api/ai',        authMiddleware, aiRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StratLens API running on port ${PORT}`);

  if (process.env.NODE_ENV === 'production') {
    startScheduler();
  } else {
    console.log('Scheduler disabled in development');
  }
});

export default app;
