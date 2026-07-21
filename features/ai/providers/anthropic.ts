import 'server-only';
import type { AiProvider, ArtistBioInput, ClassificationResult } from '@/features/ai/provider';

/**
 * Anthropic-backed AI provider.
 *
 * Implemented against the Messages API over fetch (no SDK dependency in the
 * bundle). Reads ANTHROPIC_API_KEY at call time. If the key is missing it
 * throws, and the caller should fall back to NullAiProvider — production wiring
 * lives in the Edge Function so the key never reaches the client.
 *
 * NOTE: This is a reference implementation. In production these calls run inside
 * a Supabase Edge Function (see supabase/functions/ai) with strict rate limits.
 */
export class AnthropicAiProvider implements AiProvider {
  private readonly model = 'claude-haiku-4-5-20251001';
  private readonly endpoint = 'https://api.anthropic.com/v1/messages';

  private async complete(system: string, user: string, maxTokens = 512): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return json.content.find((c) => c.type === 'text')?.text?.trim() ?? '';
  }

  async generateArtistBio(input: ArtistBioInput): Promise<string> {
    const system =
      "Tu écris des biographies d'artistes musicaux, chaleureuses, authentiques et respectueuses des cultures africaines. 2-3 phrases, sans clichés.";
    const user = `Artiste: ${input.name}\nGenres: ${input.genres.join(', ')}\nOrigine: ${[input.city, input.country].filter(Boolean).join(', ')}\nLangue de rédaction: ${input.language}`;
    return this.complete(system, user, 300);
  }

  async classifyTrack(input: {
    title: string;
    description?: string;
  }): Promise<ClassificationResult> {
    const system =
      'Tu classes des morceaux. Réponds STRICTEMENT en JSON: {"mood": string, "genres": string[], "bpm"?: number}.';
    const user = `Titre: ${input.title}\n${input.description ?? ''}`;
    const raw = await this.complete(system, user, 200);
    try {
      return JSON.parse(raw) as ClassificationResult;
    } catch {
      return { mood: 'energetic', genres: [] };
    }
  }

  async translateLyrics(input: { text: string; targetLang: string }): Promise<string> {
    const system = `Traduis fidèlement les paroles vers la langue ${input.targetLang}. Conserve le sens et l\'émotion.`;
    return this.complete(system, input.text, 1024);
  }
}
