# Déploiement Vercel + Supabase

État au moment de l'écriture : la base Supabase **« Mwanakinsounds »** est
migrée (11 migrations) et seedée ; le projet Vercel **« mwanakinsound »** existe
mais n'a **aucun déploiement**. Il reste 3 actions, à faire dans le tableau de
bord (l'API MCP de Vercel n'expose pas la gestion des variables d'environnement).

## 1. Variables d'environnement (Vercel → Project → Settings → Environment Variables)

À définir pour **Production** (et Preview) :

| Clé                             | Valeur                                                 | Portée   |
| ------------------------------- | ------------------------------------------------------ | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | l'URL du projet Supabase (`https://<ref>.supabase.co`) | publique |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé **anon** du projet (Supabase → Settings → API)  | publique |
| `NEXT_PUBLIC_SITE_URL`          | l'URL de prod (ex. `https://mwanakinsound.vercel.app`) | publique |
| `SUPABASE_SERVICE_ROLE_KEY`     | la clé **service_role** (⚠️ serveur uniquement)        | secrète  |

Optionnelles : `PERSPECTIVE_API_KEY` (modération), `NEXT_PUBLIC_R2_PUBLIC_URL`
(CDN audio master), `AI_PROVIDER` + `ANTHROPIC_API_KEY` (couche IA).

> L'anon key est une clé **publique** (destinée au navigateur, protégée par la
> RLS). La `service_role` **contourne la RLS** : jamais côté client, jamais
> committée.

## 2. Connecter le dépôt GitHub

Vercel → Project → Settings → Git → connecter `peupleaelionor/Mwanakinsound`.
Branche de production : `main`. Vercel déploiera à chaque push sur `main`.

## 3. Déclencher le premier déploiement

Deux options :

- **Fusionner** la branche de travail dans `main` (ouvre une PR puis merge), ou
- Configurer temporairement la branche de production sur
  `claude/mwanakin-sound-architecture-6muhue` pour un déploiement de preview.

Le build passe **sans secrets** (placeholders inertes, aucune 500) : même mal
configuré, le site s'affiche. Une fois les variables posées, il se connecte à la
base migrée et affiche les données réelles.

## Vérification post-déploiement

- La home doit répondre en 200 et streamer instantanément (TTFB bas).
- Créer un compte (Supabase Auth email) → un profil doit être créé
  automatiquement (trigger `handle_new_user`) + un abonnement `free`.
- `supabase` → Advisors : aucune alerte **ERROR** (les WARN restants sont
  documentés dans `0011_security_hardening.sql`).
