import cron from 'node-cron';
import { runFullPipeline } from './schedulerService';

const CRON_EXPRESSION  = '*/30 * * * *';  // every 30 minutes
const STARTUP_DELAY_MS = 10 * 1000;        // 10 seconds after boot

/** Returns the ISO timestamp of the next 30-minute boundary. */
function nextRunTime(): string {
  const now  = new Date();
  const next = new Date(now);
  const m    = now.getMinutes();
  if (m < 30) {
    next.setMinutes(30, 0, 0);
  } else {
    next.setHours(next.getHours() + 1, 0, 0, 0);
  }
  return next.toISOString();
}

let isRunning = false;

async function safeRunPipeline(): Promise<void> {
  if (isRunning) {
    console.log('[scheduler] Pipeline already running — skipping this tick');
    return;
  }
  isRunning = true;
  try {
    await runFullPipeline();
  } finally {
    isRunning = false;
    console.log(`[scheduler] Next ingestion scheduled for: ${nextRunTime()}`);
  }
}

export function startScheduler(): void {
  cron.schedule(CRON_EXPRESSION, safeRunPipeline);

  console.log('📡 News ingestion scheduler started');
  console.log(`[scheduler] Next ingestion scheduled for: ${nextRunTime()}`);

  // Initial run shortly after server boot so Railway deploy immediately seeds news
  setTimeout(() => {
    console.log('[scheduler] Running initial pipeline on startup…');
    safeRunPipeline();
  }, STARTUP_DELAY_MS);
}
