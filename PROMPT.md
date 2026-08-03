# MWANAKIN SOUND — Brief technique développeur

> Contrat entre la vision produit et le code livré.
> **En cas de conflit entre le manifeste et la spec, la spec gagne.**

---

## 0. Manifeste (à lire une fois)

On ne construit pas « une app de streaming ». On construit le pont numérique du son pour la RDC et l'Afrique centrale : une interface qui disparaît, un son qui ne coupe pas, une expérience qui parle Lingala et Swahili dès le premier écran. L'écosystème **MABELE-CORE** est le socle. La priorité absolue : que ça marche sur le téléphone et le réseau réels d'un utilisateur de Kinshasa, pas sur une fibre de démo.

Le reste de ce document est une spécification. Le lyrisme s'arrête ici.

---

## 1. Contexte technique

- **Produit** : app de streaming musical, marché RDC / Afrique centrale.
- **Écosystème** : monorepo MABELE (Turborepo), packages `@mabele/*`.
- **Base de code** : composants `songi` à extraire du repo `Ssmabe-`, ré-adaptés au branding MWANAKIN.
- **Cible utilisateur** : Android entrée/milieu de gamme, réseau 2G/Edge intermittent, data chère.

---

## 2. Contraintes non négociables (Definition of Done globale)

Toute PR doit respecter ces 4 règles, sinon elle ne merge pas :

1. **Perf réseau dégradé** : chaque feature passe le « Bandal Test » (§3).
2. **Zéro dépendance externe lourde** : pas de Google Fonts (polices auto-hébergées), pas de tracker US intrusif. Analytics : local, anonyme, ou aucun.
3. **MVP = l'audio joue sans coupure en réseau dégradé.** Tout le reste est secondaire. Toute feature qui menace cet objectif est reportée (anti-feature-creep).
4. **MwanaCoins ≠ monnaie réelle.** Système de points d'engagement social uniquement. Ni crypto, ni substitut monétaire. Cette distinction doit être visible dans l'UI **et** documentée dans le README.

---

## 3. Le « Bandal Test » (profil de validation)

Profil de référence à reproduire (Chrome DevTools throttling ou proxy réseau).

| Paramètre              | Cible                                        |
| ---------------------- | -------------------------------------------- |
| Débit                  | ~400 kb/s down / 400 kb/s up (Edge/Slow 3G)  |
| Latence                | ~400 ms RTT                                  |
| Appareil de réf.       | Android 2–3 Go RAM, Chrome                   |
| Time-to-first-audio    | < 3 s                                        |
| First meaningful paint | < 2 s                                        |
| Bundle JS initial      | < 200 kb gzip                                |
| Lighthouse PWA         | ≥ 90, installable, shell offline fonctionnel |

**Ordre de bataille** : Service Worker + stratégie de cache PWA **avant** toute animation complexe.

---

## 4. Spécifications par lot

Chaque lot = **1 issue GitHub** avec sa Definition of Done en checklist.

### Lot 1 — Socle i18n & shell PWA

- **But** : shell installable, cache offline, i18n Lingala/Swahili dès le 1er écran.
- **Dépendances** : `@mabele/core`, `@mabele/i18n`.
- **DoD** : app installable ; shell servi offline ; langue détectée + basculable ; passe le Bandal Test sur l'écran d'accueil.

### Lot 2 — Lecteur audio résilient (cœur du MVP)

- **But** : lecture continue en réseau dégradé.
- **DoD** : audio sans coupure sous profil Bandal ; reprise auto après perte réseau ; pré-cache du prochain morceau ; TTF-audio < 3 s.

### Lot 3 — Intégration agents MABELE

- **But** : brancher le frontend sur `admin-rdc-agent` (modération + assistance utilisateur).
- **DoD** : appels agent fonctionnels avec gestion d'erreur/hors-ligne ; timeout gracieux ; aucun blocage de l'UI si l'agent est indisponible.

### Lot 4 — MwanaCoins (monnaie sociale)

- **But** : points d'engagement (écoutes, partages, commentaires).
- **Dépendances** : `credit-engine`, `trust-score`.
- **DoD** : événements trackés et attribués ; solde affiché ; disclaimer « monnaie sociale, sans valeur monétaire » présent dans l'UI et le README ; aucune passerelle vers une monnaie réelle dans le code.

### Lot 5 — Partage créateur (Studio)

- **But** : partage natif depuis le Studio.
- **DoD** : Web Share API avec fallbacks WhatsApp / SMS / réseaux locaux ; extraits audio ou visuels pré-générés ; fonctionne sans dépendance externe lourde.

---

## 5. Dépendances internes & fallbacks

Pour chaque dépendance MABELE : réutiliser en priorité, sinon créer un adapter respectant l'interface.

| Ressource                      | Où              | Si indisponible                                   |
| ------------------------------ | --------------- | ------------------------------------------------- |
| `@mabele/core`, `@mabele/i18n` | monorepo MABELE | adapter typé + mock, interface stable             |
| `credit-engine`, `trust-score` | MABELE-CORE     | stub avec la même signature, `// TODO: brancher`  |
| `admin-rdc-agent`              | MABELE-CORE     | client mocké + flag `AGENT_ENABLED`               |
| composants `songi`             | repo `Ssmabe-`  | extraire, sinon reconstruire au branding MWANAKIN |

> Règle : **réutiliser en priorité les briques existantes ; créer le manquant selon la convention du monorepo.**

---

## 6. Plan séquencé

0. **Cartographier `Ssmabe-`** : inventorier les composants `songi`, lister les exports `@mabele/*` réellement disponibles, noter les manquants.
1. Lot 1 — socle i18n + shell PWA
2. Lot 2 — lecteur audio (MVP livrable ici)
3. Lot 3 — agents MABELE
4. Lot 4 — MwanaCoins
5. Lot 5 — partage Studio

Le MVP est atteint dès la fin du Lot 2. Les lots 3–5 sont des incréments.

---

## 7. Conventions GitHub

- **Branches** : `feat/…`, `fix/…`, `chore/…`.
- **Commits** : Conventional Commits (`feat:`, `fix:`, `perf:`…).
- **1 lot → 1 issue → 1 PR liée.** La DoD du lot est recopiée en checklist dans la PR.
- **CI obligatoire** : lint, typecheck, tests, budget bundle-size, Lighthouse CI.
- **Pas de merge** si un item de la DoD ou un check CI échoue.

---

## 8. Sortie attendue du développeur

1. **Avant de coder** : un plan d'implémentation sous forme d'issues + milestones.
2. Ensuite : des PR incrémentales, une par lot.
3. README à jour à chaque lot (dont le disclaimer MwanaCoins).
4. Pour toute PR touchant la perf : un court **rapport de mesures Bandal Test** (avant/après).

---

> 📋 **Plan d'implémentation** : voir [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
> (milestones, issues prêtes à créer, écarts constatés vs. base de code actuelle).
