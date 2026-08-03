import Link from 'next/link';
import { segmentComment } from './hashtags';

/**
 * Rend un commentaire en transformant chaque `#hashtag` en lien vers son fil.
 * Composant serveur pur : zéro JS envoyé au client.
 */
export function CommentBody({ text }: { text: string }) {
  const segments = segmentComment(text);
  return (
    <p className="whitespace-pre-wrap break-words text-sm">
      {segments.map((seg, i) =>
        seg.type === 'hashtag' ? (
          <Link
            key={i}
            href={`/tags/${encodeURIComponent(seg.tag)}`}
            className="font-medium text-primary hover:underline"
          >
            {seg.value}
          </Link>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </p>
  );
}
