# Plan d'implémentation — MWANAKIN SOUND

> Livrable §8.1 du [brief](../PROMPT.md) : plan sous forme d'**issues + milestones**, avant tout code.
> Chaque issue est prête à être créée telle quelle sur GitHub (titre + corps + DoD en checklist).

---

## 1. État des lieux — mesuré, pas supposé

Audit de la base de code actuelle (`Mwanakinsound@claude/mwanakin-sound-architecture-6muhue`)
confronté aux hypothèses du brief.

| Hypothèse du brief                      | Réalité constatée                                                                                              | Impact                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Monorepo MABELE (Turborepo)             | **Absent** — app Next.js 15 autonome, pas de `turbo.json` ni workspaces                                        | 🔴 Bloquant M0                          |
| Packages `@mabele/core`, `@mabele/i18n` | **Aucune** dépendance `@mabele/*` installée                                                                    | 🟠 Fallback adapters (§5 brief)         |
| Composants `songi` (repo `Ssmabe-`)     | Repo **non accessible** depuis cette session                                                                   | 🟠 Fallback reconstruction              |
| i18n Lingala/Swahili                    | **Aucun** framework i18n ; UI 100 % française en dur                                                           | 🔴 Lot 1 = from scratch                 |
| Polices auto-hébergées                  | `next/font/google` — **conforme** : Next télécharge au build et auto-héberge, zéro requête runtime vers Google | 🟢 OK (à re-vérifier si migration Vite) |
| Bundle < 200 kb gzip                    | **2 routes hors budget** (voir §5)                                                                             | 🔴 Dette à résorber                     |
| Shell PWA + SW                          | `public/sw.js` existant (shell stale-while-revalidate, **audio explicitement exclu**)                          | 🟡 Base saine, à étendre au Lot 2       |
| MwanaCoins                              | **Inexistant** — aucune table, aucun concept de points                                                         | 🟠 Lot 4 = from scratch                 |

### Acquis réutilisables (ne pas réécrire)

- **Backend Supabase complet** : 16 tables, RLS default-deny, RPC `record_stream` /
  `recommend_tracks` / `handle_new_user`, buckets Storage. Consolidé et idempotent dans
  `supabase/portkit/mwanakin_backend.sql`.
- **Lecteur audio découplé** : store Zustand + `<AudioController>` headless unique →
  **la bonne architecture pour le Lot 2** (le moteur de résilience s'y greffe sans toucher l'UI).
- **Upload artiste**, **mode économie de données** (persisté au profil), **PWA install prompt**.

---

## 2. Décisions bloquantes (à trancher avant M1)

Ces trois points conditionnent tout le reste. Je ne code pas tant qu'ils ne sont pas tranchés.

**D1 — Où vit le code ?**
&nbsp;&nbsp;(a) migrer cette app Next.js dans le monorepo MABELE · (b) repartir de `kinshasa-beats` (Vite) ·
&nbsp;&nbsp;(c) créer le monorepo MABELE et y importer l'app Next.js comme `apps/mwanakin`.
&nbsp;&nbsp;→ _Recommandation : **(c)**_. Le brief impose Turborepo + `@mabele/*` ; l'app Next.js actuelle
&nbsp;&nbsp;est la plus avancée et la seule dont le backend est prouvé. La migrer coûte moins que de
&nbsp;&nbsp;reconstruire.

**D2 — Accès à `Ssmabe-` et MABELE-CORE ?**
&nbsp;&nbsp;Sans accès, M0 (cartographie) est impossible et on bascule d'office sur les adapters/stubs
&nbsp;&nbsp;autorisés au §5 du brief. Décision : _attendre l'accès_ ou _démarrer en mode stub_.
&nbsp;&nbsp;→ _Recommandation : démarrer en mode stub_, interfaces stables, branchement ultérieur trivial.

**D3 — Next.js ou Vite ?**
&nbsp;&nbsp;Next.js apporte le SSR (meilleur FMP en réseau dégradé, atout Bandal Test) mais un runtime
&nbsp;&nbsp;plus lourd. Vite/SPA est plus léger mais tout le rendu est client.
&nbsp;&nbsp;→ _Recommandation : **Next.js**_, le SSR sert directement la cible « FMP < 2 s sur Edge ».

---

## 3. Milestones

| Milestone                          | Contenu                                                    | Sortie                      |
| ---------------------------------- | ---------------------------------------------------------- | --------------------------- |
| **M0 — Socle & cartographie**      | Décisions D1–D3, monorepo, CI budgets, harnais Bandal Test | Mesures baseline publiées   |
| **M1 — Lot 1 : i18n & shell PWA**  | Lingala/Swahili, SW durci, installable                     | Shell offline validé Bandal |
| **M2 — Lot 2 : lecteur résilient** | 🎯 **MVP** — audio sans coupure                            | TTF-audio < 3 s sous Bandal |
| **M3 — Lot 3 : agents MABELE**     | `admin-rdc-agent`, dégradation gracieuse                   | UI jamais bloquée           |
| **M4 — Lot 4 : MwanaCoins**        | Points sociaux + disclaimers                               | Aucune passerelle monétaire |
| **M5 — Lot 5 : partage Studio**    | Web Share + fallbacks locaux                               | Partage sans dép. lourde    |

**Le MVP est livré à la fin de M2.** M3–M5 sont des incréments non bloquants.

---

## 4. Issues prêtes à créer

### M0 — Socle & cartographie

---

#### `ISSUE-01` — chore: cartographier MABELE-CORE et `Ssmabe-`

**Milestone** : M0 · **Bloque** : toutes les autres

Inventorier ce qui existe réellement avant d'écrire une ligne.

**DoD**

- [ ] Inventaire des composants `songi` de `Ssmabe-` (nom, rôle, dépendances, réutilisabilité)
- [ ] Liste des exports réellement disponibles de `@mabele/core` et `@mabele/i18n`
- [ ] Liste des manquants → décision _réutiliser / adapter / reconstruire_ pour chacun
- [ ] Signatures relevées pour `credit-engine`, `trust-score`, `admin-rdc-agent`
- [ ] Document `docs/MABELE_INVENTORY.md` commité
- [ ] **Si accès indisponible** : documenter le blocage et acter le mode stub (D2)

---

#### `ISSUE-02` — chore: harnais de mesure « Bandal Test » reproductible

**Milestone** : M0 · **Bloque** : ISSUE-03, tous les lots

Sans harnais, la contrainte n°1 du brief est déclarative. On la rend exécutable.

**DoD**

- [ ] Script `npm run bandal` : Playwright + CDP `Network.emulateNetworkConditions`
      (400 kb/s ↓↑, 400 ms RTT) + CPU throttling ×4 (proxy Android 2–3 Go)
- [ ] Métriques émises en JSON : FMP, TTF-audio, LCP, poids transféré
- [ ] Lighthouse CI configuré (PWA ≥ 90, installable, shell offline)
- [ ] Rapport baseline de la base actuelle commité dans `docs/perf/baseline.md`
- [ ] Documenté dans le README (« comment reproduire le Bandal Test »)

---

#### `ISSUE-03` — perf: ramener toutes les routes sous 200 kb gzip

**Milestone** : M0 · **Priorité** : haute (contrainte non négociable §2.1)

Deux routes dépassent aujourd'hui le budget (§5). À corriger **avant** d'ajouter des features.

**DoD**

- [ ] Analyse de bundle produite (`@next/bundle-analyzer`) et commitée
- [ ] `/artist/[slug]` ≤ 200 kb gzip _(actuellement 236 kb)_
- [ ] `/studio` ≤ 200 kb gzip _(actuellement 206 kb)_
- [ ] Toutes les autres routes ≤ 200 kb avec ≥ 10 % de marge
- [ ] Check CI `bundle-size` qui **fait échouer** la PR au dépassement
- [ ] Rapport de mesures avant/après (§8.4 du brief)

---

#### `ISSUE-04` — chore: monorepo Turborepo + conventions MABELE

**Milestone** : M0 · **Dépend de** : D1

**DoD**

- [ ] `turbo.json` + workspaces, app dans `apps/mwanakin`
- [ ] `packages/` prêt à recevoir `@mabele/*` (ou leurs adapters)
- [ ] CI : lint · typecheck · tests · bundle-size · Lighthouse CI, tous bloquants
- [ ] Conventional Commits appliqués (commitlint) ; branches `feat/`/`fix/`/`chore/`
- [ ] `npm run dev|build|test|lint` fonctionnels depuis la racine

---

### M1 — Lot 1 : socle i18n & shell PWA

---

#### `ISSUE-05` — feat: i18n Lingala / Swahili / Français / Anglais

**Milestone** : M1 · **Lot** : 1

⚠️ Contrainte croisée : le budget bundle interdit un framework i18n lourd.
Approche retenue : **dictionnaires JSON + chargement paresseux par langue**
(~2 kb de runtime), et non `i18next`/`next-intl` complet.

**DoD**

- [ ] Locales `fr`, `en`, `ln` (Lingala), `sw` (Kiswahili) — **Lingala et Swahili dès le 1er écran**
- [ ] Détection auto (`navigator.language` + `preferred_language` du profil) + bascule manuelle
- [ ] Persistance dans `profiles.preferred_language` (colonne **déjà existante**)
- [ ] Seule la locale active est téléchargée (pas de bundle global des 4 langues)
- [ ] Aucune chaîne UI en dur restante sur les écrans du Lot 1
- [ ] Surcoût bundle mesuré < 5 kb gzip
- [ ] Bandal Test passé sur l'écran d'accueil

---

#### `ISSUE-06` — feat: shell PWA installable & offline durci

**Milestone** : M1 · **Lot** : 1

**DoD**

- [ ] Shell servi **entièrement offline** (navigation entre écrans sans réseau)
- [ ] Page de repli offline explicite (pas d'erreur navigateur brute)
- [ ] Stratégies de cache distinctes : shell (SWR) · données (network-first) · **audio (Lot 2)**
- [ ] Versionnage du cache + purge des anciennes versions au `activate`
- [ ] App installable ; Lighthouse PWA ≥ 90
- [ ] Polices **auto-hébergées** vérifiées : zéro requête réseau vers un domaine tiers au chargement
- [ ] Bandal Test : FMP < 2 s

---

### M2 — Lot 2 : lecteur audio résilient 🎯 MVP

---

#### `ISSUE-07` — feat: lecture audio continue en réseau dégradé

**Milestone** : M2 · **Lot** : 2 · **🎯 cœur du MVP**

S'appuie sur l'architecture existante (`player-store` Zustand + `<AudioController>` headless) :
le moteur de résilience se greffe dans le contrôleur, **sans toucher à l'UI**.

**DoD**

- [ ] Audio **sans coupure** sous profil Bandal (test : 3 morceaux enchaînés)
- [ ] Reprise automatique après perte réseau (backoff exponentiel, reprise à la position)
- [ ] Pré-cache du **prochain morceau** de la file (déclenché à ~50 % du morceau courant)
- [ ] **TTF-audio < 3 s** mesuré sous profil Bandal
- [ ] Respect du **mode économie de données** : bitrate réduit + pré-cache désactivé si activé
- [ ] Buffer de sécurité configurable ; états `buffering`/`offline` visibles dans l'UI
- [ ] Aucune régression du comptage d'écoutes (`record_stream`)
- [ ] Rapport de mesures avant/après

---

#### `ISSUE-08` — feat: cache audio offline (Service Worker)

**Milestone** : M2 · **Lot** : 2 · **Dépend de** : ISSUE-06

⚠️ Le SW actuel **exclut volontairement** l'audio. On l'ouvre de façon contrôlée :
la data est chère, le cache audio doit être borné et prévisible.

**DoD**

- [ ] Cache audio borné (quota max + éviction LRU)
- [ ] Jamais de mise en cache automatique hors file de lecture immédiate
- [ ] Désactivé quand le mode économie de données est actif
- [ ] Purge manuelle exposée dans les Réglages, avec taille occupée affichée
- [ ] Lecture d'un morceau déjà en cache **fonctionne hors ligne**
- [ ] Aucune régression du shell offline (ISSUE-06)

---

### M3 — Lot 3 : agents MABELE

---

#### `ISSUE-09` — feat: client `admin-rdc-agent` avec dégradation gracieuse

**Milestone** : M3 · **Lot** : 3

**DoD**

- [ ] Client typé derrière une interface stable (implémentation mockée si indisponible — §5 brief)
- [ ] Flag `AGENT_ENABLED` ; app pleinement fonctionnelle à `false`
- [ ] Timeout gracieux (≤ 5 s) + retry borné ; **jamais** de blocage de l'UI
- [ ] Comportement hors-ligne explicite (file d'attente ou message clair)
- [ ] Modération + assistance utilisateur branchées
- [ ] Chargement paresseux : zéro impact sur le bundle initial

---

### M4 — Lot 4 : MwanaCoins

---

#### `ISSUE-10` — feat: MwanaCoins — points d'engagement social

**Milestone** : M4 · **Lot** : 4

⚠️ **Garde-fou produit ET technique** : aucune passerelle vers une monnaie réelle.
Les tables `payments`/`subscriptions` existantes ne doivent avoir **aucune** relation
avec le solde MwanaCoins.

**DoD**

- [ ] Migration : `mwana_coins_ledger` (append-only) + vue de solde, RLS default-deny
- [ ] Attribution serveur uniquement (RPC `SECURITY DEFINER`) — le client n'écrit jamais le solde
- [ ] Événements trackés : écoutes, partages, commentaires ; anti-abus (débounce/plafond)
- [ ] Solde affiché dans l'UI
- [ ] **Disclaimer « monnaie sociale, sans valeur monétaire » visible dans l'UI**
- [ ] **Disclaimer documenté dans le README**
- [ ] Aucune référence à `payments`, `provider`, taux de change ou retrait dans le code MwanaCoins
- [ ] Adapters `credit-engine` / `trust-score` (stubs si indisponibles, `// TODO: brancher`)

---

### M5 — Lot 5 : partage créateur

---

#### `ISSUE-11` — feat: partage natif depuis le Studio

**Milestone** : M5 · **Lot** : 5

**DoD**

- [ ] Web Share API (niveau 2 : partage de fichiers si supporté)
- [ ] Fallbacks **WhatsApp / SMS / copie de lien** quand l'API est absente
- [ ] Extrait audio ou visuel pré-généré côté serveur (jamais de rendu lourd sur mobile bas de gamme)
- [ ] Aucune dépendance externe lourde ajoutée (budget bundle respecté)
- [ ] Fonctionne en réseau dégradé (assets légers)

---

### Transverse

---

#### `ISSUE-12` — chore: arbitrage anti-feature-creep (règle §2.3)

**Milestone** : M0 · **Priorité** : haute

Trois features présentes dans la base **ne figurent dans aucun lot** et pèsent sur le budget :
la palette ⌘K (`cmdk`), la vue plein écran « Now Playing » (`framer-motion`), et le compteur
d'auditeurs en direct (Supabase Realtime). La règle 3 impose de les justifier ou de les reporter.

**DoD**

- [ ] Coût bundle de chacune mesuré isolément
- [ ] Décision tranchée et documentée : _garder en lazy-load_ / _reporter_ / _supprimer_
- [ ] Aucune de ces features ne charge de JS sur la route d'accueil
- [ ] Décision reportée dans `docs/ARCHITECTURE.md`

---

## 5. Budget bundle — dette actuelle chiffrée

Mesures `next build` (tailles **gzip**, budget brief : **< 200 kb**) :

| Route                              | First Load JS | Statut         |
| ---------------------------------- | ------------: | -------------- |
| `/`                                |        121 kb | 🟢 marge 40 %  |
| `/search`, `/discover`, `/library` |        121 kb | 🟢 marge 40 %  |
| `/settings`                        |        192 kb | 🟡 marge 4 %   |
| `/login`                           |        195 kb | 🟡 marge 2,5 % |
| **`/studio`**                      |    **206 kb** | 🔴 **+3 %**    |
| **`/artist/[slug]`**               |    **236 kb** | 🔴 **+18 %**   |
| _shared by all_                    |        102 kb | —              |

**Hypothèses de surpoids à confirmer par analyse de bundle (ISSUE-03)** :
`framer-motion` (~50 kb, utilisé par PlayerBar / NowPlaying / Toaster), le client
**Supabase Realtime** tiré par le compteur d'auditeurs en direct sur `/artist/[slug]`
(suspect n°1 du pic à 236 kb), et `cmdk` chargé globalement depuis le layout racine.

**Pistes de remédiation** : import paresseux de `framer-motion` (ou remplacement par des
transitions CSS sur les routes lourdes), chargement dynamique de Realtime et de la palette ⌘K
au premier usage, `optimizePackageImports` étendu.

---

## 6. Risques & mitigations

| Risque                                      | Impact                 | Mitigation                                                               |
| ------------------------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| Accès MABELE-CORE / `Ssmabe-` jamais obtenu | M0 bloqué              | Mode stub (§5 brief) : interfaces stables, branchement ultérieur trivial |
| Cache audio → explosion du coût data        | Contraire à la mission | Quota borné + LRU + désactivé en mode éco (ISSUE-08)                     |
| i18n framework trop lourd                   | Budget 200 kb rompu    | Dictionnaires JSON lazy, pas de framework (ISSUE-05)                     |
| Migration monorepo casse le backend prouvé  | Régression majeure     | Le backend est du SQL versionné et idempotent — indépendant du front     |
| Traductions Lingala/Swahili non relues      | Qualité perçue         | Relecture native requise avant merge du Lot 1                            |

---

## 7. Prochaine action

Trancher **D1–D3** (§2). Dès validation, j'ouvre `ISSUE-01` → `ISSUE-04` (M0) et je livre
le rapport baseline du Bandal Test avant toute nouvelle feature.
