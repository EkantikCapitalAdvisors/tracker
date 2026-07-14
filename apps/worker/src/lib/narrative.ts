import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

/**
 * Narrative paragraph for sentinel message 3, synthesized from the
 * STRUCTURED state only. The structured fields themselves are never
 * model-generated (Spec §6); if the API is unavailable we simply omit
 * the paragraph — the sentinel still goes out.
 */
export async function synthesizeNarrative(structuredState: unknown): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system:
        'You are the narrative synthesizer for an internal correction-intelligence sentinel. ' +
        'Write ONE terse, institutional paragraph (max 90 words) reading through the provided ' +
        'pre-committed state-machine output. Descriptive only: no advice, no predictions beyond ' +
        'the depth engine output, no discretionary overrides, no softening of TRIGGERED readings. ' +
        'Never invent numbers — use only values present in the input.',
      messages: [
        {
          role: 'user',
          content: `Structured sentinel state (JSON):\n${JSON.stringify(structuredState, null, 2)}`,
        },
      ],
    });
    const block = response.content.find((b) => b.type === 'text');
    return block && block.type === 'text' ? block.text.trim() : null;
  } catch {
    return null; // fail-open: sentinel goes out without the narrative
  }
}
