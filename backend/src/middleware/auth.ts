import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

// ─── Dedicated auth client ────────────────────────────────────────────────────
// GoTrue's /auth/v1/user endpoint validates the `apikey` header and requires
// the PUBLISHABLE (anon) key, not the secret key. Using the secret key here
// causes "Invalid or expired token" rejections in the new sb_* key format.
//
// supabaseAdmin (secret key) → DB queries, bypasses RLS
// supabaseAuth  (anon key)   → token validation via auth.getUser()

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const supabaseUrl     = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(503).json({ message: 'Auth service misconfigured', code: 'SERVICE_UNAVAILABLE' });
    return;
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });

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
