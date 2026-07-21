import { Home, Search, Library, Radio, Mic2 } from 'lucide-react';

/** Shared navigation definition for desktop sidebar & mobile bottom nav. */
export const NAV_ITEMS = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/search', label: 'Recherche', icon: Search },
  { href: '/library', label: 'Bibliothèque', icon: Library },
  { href: '/discover', label: 'Découvrir', icon: Radio },
] as const;

export const STUDIO_ITEM = { href: '/studio', label: 'Espace artiste', icon: Mic2 } as const;
