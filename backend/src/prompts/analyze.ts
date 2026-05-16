// Types defined locally so this file stays self-contained within the backend.
type RiskLevel    = 'critical' | 'high' | 'medium' | 'low' | 'info';
type EventTopic   = 'conflict' | 'diplomacy' | 'economy' | 'elections' | 'sanctions'
                  | 'terrorism' | 'humanitarian' | 'energy' | 'cyber' | 'other';

export interface AnalysisResult {
  topic:      EventTopic;
  tier:       RiskLevel;
  regions:    string[];  // ISO 3166-1 alpha-2 codes
  confidence: number;    // 0–100
}

export const ANALYZE_SYSTEM_PROMPT = `You are a geopolitical risk analyst. Classify events by topic and risk tier.

Respond with valid JSON only. No markdown, no explanation.`;

export function buildAnalyzePrompt(title: string, summary: string): string {
  return `Classify this geopolitical event:

Title: ${title}
Summary: ${summary}

Return JSON matching this schema exactly:
{
  "topic":   "conflict|diplomacy|economy|elections|sanctions|terrorism|humanitarian|energy|cyber|other",
  "tier":    "critical|high|medium|low|info",
  "regions": ["ISO-2 codes of directly affected countries, max 5"],
  "confidence": 0-100
}`;
}
