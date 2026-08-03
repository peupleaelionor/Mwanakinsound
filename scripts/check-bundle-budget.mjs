#!/usr/bin/env node
/**
 * Garde-fou « Bandal » : aucune route ne doit dépasser le budget JS initial.
 *
 * Sur un lien à 400 kb/s, chaque tranche de ~50 ko coûte environ une seconde
 * avant le premier son. Le budget n'est pas une coquetterie d'ingénieur : c'est
 * la différence entre une app utilisable à Bandalungwa et une app abandonnée.
 *
 * Lit la sortie de `next build` — qui publie déjà le « First Load JS » gzippé,
 * mesure autoritative — plutôt que d'estimer une taille nous-mêmes.
 *
 * Usage :
 *   npm run build > build.log && node scripts/check-bundle-budget.mjs build.log
 *   npm run build | node scripts/check-bundle-budget.mjs
 */
import { readFile } from 'node:fs/promises';

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 200);

async function readInput() {
  const file = process.argv[2];
  if (file) return readFile(file, 'utf8');
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const output = await readInput();

/**
 * Lignes du tableau de routes, par ex. :
 *   ├ ƒ /artist/[slug]        3.95 kB         123 kB
 * On capture le chemin et la seconde colonne (First Load JS).
 */
const ROUTE_LINE =
  /^[┌├└│]\s+[ƒ○●λ]?\s*(\/\S*)\s+[\d.]+\s*[kKMB]+\s+([\d.]+)\s*([kKMG]?)B/;

const routes = [];
for (const line of output.split('\n')) {
  const match = ROUTE_LINE.exec(line.trim());
  if (!match) continue;
  const [, route, value, unit] = match;
  const kb = unit.toLowerCase() === 'm' ? Number(value) * 1024 : Number(value);
  routes.push({ route, kb });
}

if (routes.length === 0) {
  console.error(
    "✖ Aucune route détectée dans la sortie de build.\n" +
      '  Vérifiez que `next build` a bien tourné et que sa sortie est transmise.',
  );
  process.exit(1);
}

routes.sort((a, b) => b.kb - a.kb);

console.log(`\nBudget Bandal : ${BUDGET_KB} kb gzip (First Load JS) par route\n`);
let failed = false;
for (const { route, kb } of routes) {
  const over = kb > BUDGET_KB;
  if (over) failed = true;
  // Repère visuel : au-delà de 90 % du budget, la marge devient dangereuse.
  const flag = over ? '✖' : kb > BUDGET_KB * 0.9 ? '!' : '✓';
  console.log(`  ${flag} ${route.padEnd(26)} ${kb.toFixed(0)} kb`);
}

if (failed) {
  console.error(
    '\n✖ Budget dépassé — la contrainte §2.1 du brief bloque le merge.\n' +
      '  Pistes : import dynamique (next/dynamic), chargement au clic,\n' +
      '  conditionnement à la politique data, ou report de la feature.\n',
  );
  process.exit(1);
}

console.log(`\n✓ ${routes.length} routes, toutes dans le budget.\n`);
