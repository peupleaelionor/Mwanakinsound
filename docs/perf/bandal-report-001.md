# Rapport Bandal Test #001 — budget bundle

> Exigence §8.4 du brief : toute PR touchant la performance fournit un rapport
> de mesures avant/après.

## Contexte

Première mesure du budget « First Load JS » face à la contrainte non
négociable §2.1 (**< 200 kb gzip par route**). Source : sortie de `next build`,
qui publie les tailles **gzippées** — aucune estimation de notre part.

## Avant → Après

| Route                                   |         Avant |         Après |                              Δ |
| --------------------------------------- | ------------: | ------------: | -----------------------------: |
| `/artist/[slug]`                        | **236 kb** 🔴 | **123 kb** ✅ |            **−113 kb (−48 %)** |
| `/studio`                               | **206 kb** 🔴 | **193 kb** ✅ |                  −13 kb (−6 %) |
| `/settings`                             |        192 kb |        194 kb | +2 kb (ajout carte MwanaCoins) |
| `/login`                                |        195 kb |        195 kb |                              — |
| `/`, `/search`, `/discover`, `/library` |        121 kb |        121 kb |                              — |
| _shared by all_                         |        102 kb |        103 kb |      +1 kb (socle `@mabele/*`) |

**Résultat : 11 routes sur 11 dans le budget.** C'est la première fois que la
contrainte §2.1 est intégralement respectée.

## Ce qui a produit le gain

**1. `/artist/[slug]` : −113 kb — le compteur d'auditeurs en direct.**
Hypothèse posée dans le plan d'implémentation, puis vérifiée par la mesure : le
composant `LiveListeners` tirait tout le client **Supabase Realtime** dans le
bundle initial de la page artiste. Il est désormais chargé dynamiquement _et_
conditionné à la politique data (`@mabele/core`) : **sur 2G/Edge et en mode
économie, le module n'est jamais téléchargé** — il serait de toute façon
désactivé.

**2. `/studio` : −13 kb — le dialogue d'import.**
Le formulaire d'upload (Radix Dialog + validation) n'est chargé qu'**au clic**.
Un artiste qui consulte ses statistiques ne paie plus le code de publication.

**3. Le socle `@mabele/*` ne coûte que ~1 kb.**
Détection réseau, bus d'événements et feature flags sont volontairement sans
dépendance : le contrat d'interface est cher en réflexion, pas en octets.

## Traduction en secondes sur profil Bandal

À ~400 kb/s effectifs (~50 ko/s), sur la page artiste :

|       | JS initial | Temps de transfert estimé |
| ----- | ---------: | ------------------------: |
| Avant |     236 kb |               **≈ 4,7 s** |
| Après |     123 kb |               **≈ 2,5 s** |

Environ **2,2 secondes rendues à l'utilisateur** avant même la première note.

## Limites — à lire avant de conclure

- ⚠️ **Ce rapport ne couvre que le budget bundle.** Les cibles _TTF-audio < 3 s_
  et _FMP < 2 s_ du Bandal Test **n'ont pas encore été mesurées** : elles
  exigent le harnais Playwright + throttling CDP (`ISSUE-02`), qui n'est pas
  encore écrit, et un catalogue audio réel.
- Les temps ci-dessus sont des **estimations arithmétiques** (octets ÷ débit),
  pas des mesures terrain. Ils ignorent la latence, l'établissement TLS et le
  coût CPU d'exécution du JS sur un Android 2 Go.
- Trois routes (`/login` 195, `/settings` 194, `/studio` 193) sont dans le
  budget mais avec **moins de 5 % de marge**. Le garde-fou CI les signale par
  `!` sans faire échouer. À surveiller.

## Non-régression

`node scripts/check-bundle-budget.mjs` lit la sortie de `next build` et échoue
si une route dépasse. Branché comme étape bloquante dans la CI, après le build.
Vérifié dans les deux sens : sortie 1 à 150 kb de budget, sortie 0 à 200 kb.
