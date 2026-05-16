import { RiskLevel, EventCategory } from '../../src/types';

export const ANALYZE_SYSTEM_PROMPT = `You are a geopolitical risk analyst. Classify events by category and risk level.

Respond with valid JSON only. No markdown, no explanation.`;

export interface AnalysisResult {
  category: EventCategory;
  riskLevel: RiskLevel;
  regions: string[];   // ISO 3166-1 alpha-2 codes
  tags: string[];
  confidence: number;  // 0-1
}

export function buildAnalyzePrompt(title: string, summary: string): string {
  return `Classify this geopolitical event:

Title: ${title}
Summary: ${summary}

Return JSON matching this schema exactly:
{
  "category": "conflict|diplomacy|economy|elections|sanctions|terrorism|humanitarian|energy|cyber|other",
  "riskLevel": "critical|high|medium|low|info",
  "regions": ["ISO-2 codes of directly affected countries"],
  "tags": ["up to 5 relevant keyword tags"],
  "confidence": 0.0-1.0
}`;
}
