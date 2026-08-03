/**
 * Extraction et normalisation de hashtags — côté client, sans dépendance.
 *
 * Doit rester alignée avec la fonction SQL `extract_hashtags` (migration 0010) :
 * même regex, même normalisation en minuscules. Le serveur fait autorité (le
 * trigger recalcule les hashtags à l'écriture) ; cette version sert au rendu
 * optimiste et à la coloration en direct pendant la saisie.
 *
 * spaCy est volontairement écarté (Python + poids — cf. docs/STACK_DECISIONS).
 */

const HASHTAG_RE = /#([A-Za-z0-9_]{1,50})/g;

/** Retourne les hashtags uniques, en minuscules, sans le `#`. */
export function extractHashtags(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(HASHTAG_RE)) {
    if (match[1]) found.add(match[1].toLowerCase());
  }
  return [...found];
}

/** Segmente un texte en fragments texte/hashtag pour un rendu enrichi. */
export type CommentSegment =
  { type: 'text'; value: string } | { type: 'hashtag'; value: string; tag: string };

export function segmentComment(text: string): CommentSegment[] {
  const segments: CommentSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(HASHTAG_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    segments.push({ type: 'hashtag', value: match[0], tag: match[1]!.toLowerCase() });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}
