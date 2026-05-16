export const BRIEF_SYSTEM_PROMPT = `You are a senior geopolitical analyst preparing an intelligence brief. You synthesize multiple events into a coherent regional or thematic picture. Be analytical, structured, and actionable. Use professional intelligence writing style.`;

export function buildRegionBriefPrompt(
  regionName: string,
  events: Array<{ title: string; summary: string; tier: string; published_at: string }>
): string {
  const eventList = events
    .map((e, i) => `${i + 1}. [${e.tier.toUpperCase()}] ${e.title} (${e.published_at})\n   ${e.summary}`)
    .join('\n\n');

  return `Generate a concise intelligence brief for ${regionName} based on the following recent events:

${eventList}

Structure your brief as:
1. SITUATION OVERVIEW (2-3 sentences)
2. KEY DEVELOPMENTS (bullet points)
3. RISK ASSESSMENT (1-2 sentences)
4. WATCH POINTS (2-3 things to monitor)

Keep the entire brief under 300 words.`;
}
