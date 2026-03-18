import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/** Strip markdown code fences then extract the first JSON object from AI text */
export function extractJSON(text: string): any {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

export function isAIAvailable(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!(key && key !== 'your_key_here' && key.startsWith('sk-ant-'));
}
