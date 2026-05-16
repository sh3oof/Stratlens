import { spawn } from 'child_process';
import path from 'path';

// Both scripts call process.exit(), so they must run as isolated child processes.
// stdio: 'inherit' pipes their output directly into Railway's log stream.

const SCRIPTS_DIR       = path.join(__dirname, '..', 'scripts');
const TS_NODE           = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'ts-node');
const PIPELINE_TIMEOUT  = 20 * 60 * 1000;   // 20 min hard ceiling for the whole pipeline
const ENRICH_DELAY      =  2 * 60 * 1000;   // 2 min gap between fetch and enrich

function runScript(script: string, timeoutMs: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, script);
    const proc = spawn(TS_NODE, ['--transpile-only', scriptPath], {
      stdio: 'inherit',
      env:   process.env,
      cwd:   path.join(__dirname, '..', '..'),  // backend root
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`${script} timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    proc.on('close', code => { clearTimeout(timer); resolve(code ?? 0); });
    proc.on('error', err  => { clearTimeout(timer); reject(err); });
  });
}

export async function runFullPipeline(): Promise<void> {
  const pipelineStart = Date.now();
  const elapsed = () => Math.round((Date.now() - pipelineStart) / 1000);

  console.log(`[scheduler] ── Pipeline started at ${new Date().toISOString()} ──`);

  // ── Step 1: fetch from RSS feeds ────────────────────────────────────────────
  let fetchExitCode = -1;
  try {
    fetchExitCode = await runScript('fetchAndIngest.ts', PIPELINE_TIMEOUT);
    if (fetchExitCode !== 0) {
      console.error(`[scheduler] fetchAndIngest finished with exit code ${fetchExitCode}`);
    }
  } catch (err) {
    console.error(`[scheduler] fetchAndIngest error: ${(err as Error).message}`);
  }

  // ── Step 2: wait before enriching (let DB writes settle) ────────────────────
  const remainingAfterFetch = PIPELINE_TIMEOUT - (Date.now() - pipelineStart);
  if (remainingAfterFetch <= ENRICH_DELAY) {
    console.error(`[scheduler] Pipeline timeout reached before enrichment — skipping (${elapsed()}s elapsed)`);
    return;
  }

  console.log(`[scheduler] Waiting 2 minutes before AI enrichment…`);
  await new Promise<void>(r => setTimeout(r, ENRICH_DELAY));

  // ── Step 3: enrich with AI summaries (runs even if fetch had errors) ────────
  const enrichTimeout = PIPELINE_TIMEOUT - (Date.now() - pipelineStart);
  try {
    const enrichExitCode = await runScript('enrichEvents.ts', enrichTimeout);
    if (enrichExitCode !== 0) {
      console.error(`[scheduler] enrichEvents finished with exit code ${enrichExitCode}`);
    }
  } catch (err) {
    console.error(`[scheduler] enrichEvents error: ${(err as Error).message}`);
  }

  console.log(`[scheduler] ── Pipeline complete in ${elapsed()}s ──`);
}
