import Anthropic from '@anthropic-ai/sdk';
import { SUMMARIZE_SYSTEM_PROMPT, buildSummarizePrompt } from '../prompts/summarize';
import { ANALYZE_SYSTEM_PROMPT, buildAnalyzePrompt, AnalysisResult } from '../prompts/analyze';
import { BRIEF_SYSTEM_PROMPT, buildRegionBriefPrompt } from '../prompts/brief';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

export async function summarizeArticle(rawContent: string, sourceName: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: SUMMARIZE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildSummarizePrompt(rawContent, sourceName) }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text.trim();
}

export async function analyzeEvent(title: string, summary: string): Promise<AnalysisResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: ANALYZE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildAnalyzePrompt(title, summary) }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');

  try {
    return JSON.parse(block.text) as AnalysisResult;
  } catch {
    throw new Error(`Failed to parse analysis JSON: ${block.text}`);
  }
}

const TRANSLATE_LANGUAGE_NAMES: Record<'ar' | 'es', string> = {
  ar: 'Arabic',
  es: 'Spanish',
};

const TRANSLATE_REGISTER_NOTES: Record<'ar' | 'es', string> = {
  ar: 'Use formal Gulf Arabic (Modern Standard Arabic with Gulf register).',
  es: 'Use formal Latin American Spanish.',
};

export async function translateText(
  text: string,
  targetLanguage: 'ar' | 'es'
): Promise<string> {
  const langName = TRANSLATE_LANGUAGE_NAMES[targetLanguage];
  const register = TRANSLATE_REGISTER_NOTES[targetLanguage];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: `You are a professional translator specialising in geopolitical and intelligence content. Translate the following text to ${langName}. ${register} Return ONLY the translated text — no preamble, no explanation, no quotation marks around the output. Preserve proper nouns, organisation names, country names, and technical terms as-is.`,
    messages: [{ role: 'user', content: text }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text.trim();
}

// ── Event enrichment ──────────────────────────────────────────────────────────

export interface EnrichmentResult {
  aiSummary:    string;
  whyItMatters: string;
  riskFlags:    string[];
  keyActors:    string[];
  keyDates:     string[];
  marketImpact: string | null;
}

const ENRICH_SYSTEM = `You are a senior geopolitical intelligence analyst producing structured briefs for C-suite executives and institutional investors. Analyze the following news event and return ONLY a valid JSON object — no markdown fences, no explanation, no trailing text outside the JSON.`;

function extractJSON(raw: string): string {
  const trimmed = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` wrappers Claude sometimes adds
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find the first { ... } block in case there is any preamble
  const braceStart = trimmed.indexOf('{');
  const braceEnd   = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }
  return trimmed;
}

export async function enrichEvent(
  event: { id: string; title: string; summary: string; body?: string | null; source_name: string }
): Promise<EnrichmentResult> {
  const userContent = [
    `Title: ${event.title}`,
    `Source: ${event.source_name}`,
    `Summary: ${event.summary}`,
    event.body ? `Full text:\n${event.body}` : '',
  ].filter(Boolean).join('\n\n');

  const prompt = `${userContent}

Return this exact JSON structure (all fields required; use null for marketImpact if not applicable):
{
  "aiSummary": "3-5 sentences executive summary for senior decision-makers",
  "whyItMatters": "single sentence on strategic significance",
  "riskFlags": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "keyActors": ["Person or organisation 1", "Person or organisation 2"],
  "keyDates": ["Specific date or timeframe"],
  "marketImpact": "single sentence on market/financial implications, or null"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: ENRICH_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');

  let parsed: EnrichmentResult;
  try {
    parsed = JSON.parse(extractJSON(block.text)) as EnrichmentResult;
  } catch {
    throw new Error(`JSON parse failed for event ${event.id}.\nRaw response: ${block.text.slice(0, 300)}`);
  }

  // Normalise: ensure arrays, coerce marketImpact null
  return {
    aiSummary:    String(parsed.aiSummary    ?? '').trim(),
    whyItMatters: String(parsed.whyItMatters ?? '').trim(),
    riskFlags:    Array.isArray(parsed.riskFlags)  ? parsed.riskFlags.map(String)  : [],
    keyActors:    Array.isArray(parsed.keyActors)   ? parsed.keyActors.map(String)  : [],
    keyDates:     Array.isArray(parsed.keyDates)    ? parsed.keyDates.map(String)   : [],
    marketImpact: parsed.marketImpact ? String(parsed.marketImpact).trim() : null,
  };
}

export async function generateRegionBrief(
  regionName: string,
  events: Array<{ title: string; summary: string; tier: string; published_at: string }>
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: BRIEF_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildRegionBriefPrompt(regionName, events) }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text.trim();
}
