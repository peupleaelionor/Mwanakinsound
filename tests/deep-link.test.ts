import { describe, expect, it } from 'vitest';
import {
  buildTrackDeepLink,
  buildShareMessage,
  whatsappUrl,
  smsUrl,
} from '@/features/share/deep-link';

describe('buildTrackDeepLink', () => {
  it('produit un lien court et sans paramètre de tracking', () => {
    const url = buildTrackDeepLink({
      siteUrl: 'https://mwanakinsound.com',
      artistSlug: 'kin-rumba',
      trackId: 'abc123',
    });
    expect(url).toBe('https://mwanakinsound.com/artist/kin-rumba?t=abc123');
    expect(url).not.toMatch(/utm_|fbclid|gclid|ref=/);
  });

  it('normalise les barres obliques finales', () => {
    const url = buildTrackDeepLink({
      siteUrl: 'https://mwanakinsound.com///',
      artistSlug: 'afro-kin',
      trackId: 'x1',
    });
    expect(url).toBe('https://mwanakinsound.com/artist/afro-kin?t=x1');
  });

  it('encode les slugs contenant des caractères spéciaux', () => {
    const url = buildTrackDeepLink({
      siteUrl: 'https://m.co',
      artistSlug: 'coupé décalé',
      trackId: 'a b',
    });
    expect(url).toContain('coup%C3%A9%20d%C3%A9cal%C3%A9');
    expect(url).toContain('t=a%20b');
  });
});

describe('buildShareMessage', () => {
  it('tient en deux lignes : accroche puis lien', () => {
    const message = buildShareMessage({
      title: 'Nzoto',
      artistName: 'Kin Rumba',
      url: 'https://m.co/artist/kin-rumba?t=1',
    });
    expect(message.split('\n')).toHaveLength(2);
    expect(message).toContain('Nzoto');
    expect(message).toContain('Kin Rumba');
  });

  it('accepte un gabarit traduit', () => {
    const message = buildShareMessage({
      title: 'Nzoto',
      artistName: 'Kin Rumba',
      url: 'https://m.co/x',
      template: 'Yoka {title} ya {artist} na Mwanakin Sound',
    });
    expect(message).toContain('Yoka Nzoto ya Kin Rumba');
  });

  it('reste compact — coût SMS maîtrisé', () => {
    const message = buildShareMessage({
      title: 'Nzoto',
      artistName: 'Kin Rumba',
      url: 'https://mwanakinsound.com/artist/kin-rumba?t=abc123',
    });
    // Un SMS standard fait 160 caractères : on doit tenir dans un seul segment.
    expect(message.length).toBeLessThanOrEqual(160);
  });
});

describe('cibles de partage', () => {
  it('encode correctement le message pour WhatsApp', () => {
    expect(whatsappUrl('Écoute ça\nhttps://m.co')).toBe(
      'https://wa.me/?text=%C3%89coute%20%C3%A7a%0Ahttps%3A%2F%2Fm.co',
    );
  });

  it('produit un lien sms: exploitable hors data', () => {
    const url = smsUrl('Salut\nhttps://m.co');
    expect(url.startsWith('sms:?&body=')).toBe(true);
    expect(url).toContain('%0A');
  });
});
