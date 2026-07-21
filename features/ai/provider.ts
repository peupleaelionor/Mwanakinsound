import 'server-only';

/**
 * AI layer abstraction.
 *
 * Every AI capability the product needs (artist bio generation, mood/genre
 * classification, lyrics translation, playlist naming) is expressed here as a
 * provider-agnostic interface. Concrete providers (Anthropic, OpenAI, a local
 * model, or Supabase Edge Functions calling any of them) implement it. Product
 * code depends only on `AiProvider`, so swapping models is a one-line change.
 *
 * This keeps IA features isolated and testable, and avoids leaking any vendor
 * SDK into the app bundle (all calls run server-side / in Edge Functions).
 */
export interface ArtistBioInput {
  name: string;
  genres: string[];
  country?: string;
  city?: string;
  language: string;
}

export interface ClassificationResult {
  mood: string;
  genres: string[];
  bpm?: number;
}

export interface AiProvider {
  /** Draft a compelling, culturally-aware artist bio. */
  generateArtistBio(input: ArtistBioInput): Promise<string>;
  /** Classify a track's mood/genre from metadata (and later, audio features). */
  classifyTrack(input: { title: string; description?: string }): Promise<ClassificationResult>;
  /** Translate lyrics to a target language. */
  translateLyrics(input: { text: string; targetLang: string }): Promise<string>;
}

/**
 * Null provider — the safe default when AI_PROVIDER=none. Returns deterministic,
 * non-AI fallbacks so the product never hard-depends on an external model.
 */
export class NullAiProvider implements AiProvider {
  async generateArtistBio(input: ArtistBioInput): Promise<string> {
    const where = [input.city, input.country].filter(Boolean).join(', ');
    return `${input.name}${where ? `, artiste de ${where},` : ''} explore ${input.genres.join(', ') || 'la musique'} avec une signature sonore unique.`;
  }
  async classifyTrack(): Promise<ClassificationResult> {
    return { mood: 'energetic', genres: [] };
  }
  async translateLyrics(input: { text: string }): Promise<string> {
    return input.text;
  }
}

/**
 * Factory. Reads AI_PROVIDER at call time. Concrete providers live in
 * features/ai/providers/* and are dynamically imported to keep them out of the
 * default server bundle until configured.
 */
export async function getAiProvider(): Promise<AiProvider> {
  const provider = process.env.AI_PROVIDER ?? 'none';
  switch (provider) {
    case 'anthropic': {
      const { AnthropicAiProvider } = await import('./providers/anthropic');
      return new AnthropicAiProvider();
    }
    default:
      return new NullAiProvider();
  }
}
