import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import {
  getEvents,
  getEventById,
  saveEvent,
  unsaveEvent,
  getSavedEvents,
  countNewEvents,
  DbEvent,
} from '../services/supabaseService';

// ── Field mapper: snake_case AI columns → camelCase for mobile clients ─────────
// The DB stores ai_summary, why_it_matters, etc. The mobile GeopoliticalEvent
// type uses aiSummary, whyItMatters, etc. We add camelCase aliases here so
// both names are present in the JSON response — null values are omitted.
function mapEvent(row: DbEvent): DbEvent & Record<string, unknown> {
  return {
    ...row,
    aiSummary:    row.ai_summary     ?? undefined,
    whyItMatters: row.why_it_matters ?? undefined,
    riskFlags:    row.risk_flags     ?? undefined,
    keyActors:    row.key_actors     ?? undefined,
    keyDates:     row.key_dates      ?? undefined,
    marketImpact: row.market_impact  ?? undefined,
  };
}

export const eventsRouter = Router();

// Accept both old mobile-app param names (categories/riskLevels/regionCodes)
// and the new canonical names (topic/tier/country_code).
const querySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),

  // canonical new names
  tier: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v ? (Array.isArray(v) ? v : [v]) : undefined
  ),
  topic: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v ? (Array.isArray(v) ? v : [v]) : undefined
  ),
  country_code: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v ? (Array.isArray(v) ? v : [v]) : undefined
  ),

  // legacy mobile-client names (aliased internally)
  riskLevels: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v ? (Array.isArray(v) ? v : [v]) : undefined
  ),
  categories: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v ? (Array.isArray(v) ? v : [v]) : undefined
  ),
  regionCodes: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v ? (Array.isArray(v) ? v : [v]) : undefined
  ),

  searchQuery: z.string().optional(),
  // Comma-separated alternative to repeated country_code[]=X params
  // e.g. ?country_codes=AE,RU,CN
  country_codes: z.string().optional().transform(v =>
    v ? v.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : undefined
  ),
  // Banner polling: return only events published after this ISO timestamp
  after: z.string().optional(),
  // If true: return { count, hasNew } only — no full event data
  countOnly: z.string().optional().transform(v => v === 'true'),
});

eventsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid query parameters', errors: parsed.error.errors });
    return;
  }

  const {
    page, pageSize,
    tier, riskLevels,
    topic, categories,
    country_code, regionCodes, country_codes,
    searchQuery, after, countOnly,
  } = parsed.data;

  // Merge all country_code sources; deduplicate
  const allCountryCodes = [
    ...(country_code  ?? []),
    ...(regionCodes   ?? []),
    ...(country_codes ?? []),
  ].filter(Boolean);
  const mergedCountryCodes = allCountryCodes.length > 0
    ? [...new Set(allCountryCodes)]
    : undefined;

  try {
    // ── Count-only mode: used by banner polling every 2 minutes ──────────────
    if (countOnly && after) {
      const count = await countNewEvents({
        country_codes: mergedCountryCodes,
        after,
      });
      res.json({ count, hasNew: count > 0 });
      return;
    }

    const { data, count } = await getEvents({
      tier:         tier ?? riskLevels,
      topic:        topic ?? categories,
      country_code: mergedCountryCodes,
      searchQuery,
      after,
      limit:  pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({
      data:     data.map(mapEvent),
      total:    count,
      page,
      pageSize,
      hasMore:  page * pageSize < count,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

eventsRouter.get('/saved', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId as string;
  try {
    const events = await getSavedEvents(userId);
    res.json(events.map(mapEvent));
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

eventsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  try {
    const event = await getEventById(id);
    res.json(mapEvent(event));
  } catch (err) {
    res.status(404).json({ message: (err as Error).message });
  }
});

eventsRouter.patch('/:id/save', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.userId as string;
  const id     = req.params['id'] as string;
  const { isSaved } = req.body as { isSaved: boolean };

  if (typeof isSaved !== 'boolean') {
    res.status(400).json({ message: 'isSaved must be a boolean' });
    return;
  }

  try {
    if (isSaved) {
      await saveEvent(userId, id);
    } else {
      await unsaveEvent(userId, id);
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});
