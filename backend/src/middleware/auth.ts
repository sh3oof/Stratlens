import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

// ─── Dedicated auth client ────────────────────────────────────────────────────
// GoTrue's /auth/v1/user endpoint validates the `apikey` header and requires
// the PUBLISHABLE (anon) key, not the secret key. Using the secret key here
// causes "Invalid or expired token" rejections in the new sb_* key format.
//
// supabaseAdmin (secret key) → DB queries, bypasses RLS
// supabaseAuth  (anon key)   → token validation via auth.getUser()

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('[authMiddleware] Missing env var: SUPABASE_URL');
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('[authMiddleware] Missing env var: SUPABASE_ANON_KEY');
}

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ message: 'Invalid or expired token', code: 'UNAUTHORIZED' });
    return;
  }

  res.locals.userId = data.user.id;
  next();
}
