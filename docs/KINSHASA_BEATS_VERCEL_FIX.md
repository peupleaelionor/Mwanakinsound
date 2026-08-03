# kinshasa-beats — corriger l'écran blanc sur Vercel (Option B : preset Nitro `vercel`)

## Cause racine (confirmée par lecture du repo)

`kinshasa-beats` **n'est pas** une SPA Vite. C'est une application **TanStack Start
(SSR)** propulsée par **Nitro**, générée par Lovable :

- `package.json` → `@tanstack/react-start`, `@tanstack/react-router`, `nitro@3.0-beta`,
  `@lovable.dev/vite-tanstack-config`.
- `vite.config.ts` → commentaire du wrapper Lovable : _« nitro (build-only using
  **cloudflare as a default target**) »_.
- `src/server.ts` → `export default { async fetch(request, env, ctx) }` : signature
  d'un **Cloudflare Worker**.
- **Aucun `index.html` à la racine** ni `vercel.json` : preuve qu'il n'y a pas de sortie
  statique.

Sur Vercel, le projet est détecté comme **« Vite »** et sert `dist/` en statique. Or le
build produit un **worker Cloudflare** (`.output/`), pas un `dist/` avec point d'entrée
→ Vercel sert un dossier sans `index.html` → **page blanche**. (Le souci
`VITE_SUPABASE_*` est réel mais secondaire : l'app ne démarre jamais.)

## Correctif Option B — faire buildter Nitro pour Vercel

Nitro sait cibler Vercel : avec le preset `vercel`, il écrit dans `.vercel/output`
(Build Output API v3) que Vercel détecte et sert automatiquement, **à condition** que
Vercel ne force pas une sortie statique `dist/`.

### 1. Committer `vercel.json` à la racine de kinshasa-beats

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "buildCommand": "npm run build",
  "installCommand": "npm install"
}
```

`"framework": null` **désactive** la détection « Vite » de Vercel (donc l'attente d'un
`dist/` statique) et le laisse consommer `.vercel/output` produit par Nitro.

### 2. Variables d'environnement (Vercel → Settings → Environment Variables, Production + Preview)

| Clé                             | Valeur                                    | Rôle                                                    |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| `SERVER_PRESET`                 | `vercel`                                  | Force Nitro (v3) à cibler Vercel au lieu de Cloudflare. |
| `NITRO_PRESET`                  | `vercel`                                  | Même chose, nom hérité (ceinture + bretelles).          |
| `VITE_SUPABASE_URL`             | l'URL Supabase du projet **(voir §4)**    | Inlinée au **build**.                                   |
| `VITE_SUPABASE_ANON_KEY`        | la clé **anon** (publique) du même projet | Inlinée au **build**.                                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | même valeur que l'anon key                | Le client accepte l'un ou l'autre ; on met les deux.    |

> ⚠️ Vite **inline** les `VITE_*` au moment du **build** : toute modif exige un
> **redéploiement complet** (Redeploy sans cache). Ne jamais mettre la clé
> `service_role` dans une variable `VITE_*` (elle contourne la RLS).

### 3. Réglages projet Vercel (Settings → General)

- **Framework Preset : Other** (surtout **pas** Vite). Le `vercel.json` le verrouille déjà.
- **Build Command :** `npm run build` (laisser hériter du `vercel.json`).
- **Output Directory :** **vide** (ne pas forcer `dist`). Nitro fournit `.vercel/output`.
- **Install Command :** `npm install`.
- **Production Branch :** `main`.

### 4. Quel Supabase ?

`kinshasa-beats` est un projet **Lovable Cloud**, qui provisionne **sa propre** instance
Supabase. Deux choix :

- **Garder le Supabase de Lovable Cloud** (recommandé pour ne rien casser côté Lovable) :
  récupère `VITE_SUPABASE_URL` + anon key dans Lovable → _Cloud / Supabase_.
- **Pointer vers la base migrée « Mwanakinsounds »** (`https://<ref>.supabase.co`,
  ref `dmeqaqqlyswqwddykaee`) : n'utiliser que si tu veux unifier les deux apps sur le
  même backend — et vérifier que le schéma attendu par kinshasa-beats existe bien.

L'**anon key** est publique (protégée par la RLS) : sans risque dans le navigateur.

### 5. Redéployer

Vercel → Deployments → **Redeploy** avec **« Clear build cache »** coché.

## Vérification

- Build logs : chercher une ligne Nitro du type `Σ .vercel/output` / `preset: vercel`.
  Si les logs mentionnent encore `cloudflare`, l'override d'env n'a pas pris → voir Fallback.
- La home doit rendre du HTML (view-source non vide), plus d'écran blanc.
- Console navigateur : plus d'erreur « Missing Supabase environment variable(s) ».

## Fallback si `SERVER_PRESET` est ignoré

Si le wrapper Lovable **fige** la cible cloudflare (au lieu d'un simple défaut), passer
le preset via la config plutôt que par l'env, dans `vite.config.ts` :

```ts
import { defineConfig } from '@lovable.dev/vite-tanstack-config';

export default defineConfig({
  tanstackStart: { server: { entry: 'server' } },
  // Selon la version du wrapper : soit `nitro`, soit `nitroV2Options`.
  nitro: { preset: 'vercel' },
});
```

Vérifier la clé exacte acceptée par `@lovable.dev/vite-tanstack-config@^2.8.5`
(`nitro.preset`) dans les build logs. Si aucune clé n'est exposée, l'**Option A**
(héberger sur Cloudflare / Lovable Publish, la cible native) reste le chemin le plus sûr.
