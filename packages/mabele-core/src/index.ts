/**
 * `@mabele/core` — adapter local.
 *
 * ⚠️ Implémentation de repli prévue au §5 du brief : le package MABELE réel
 * n'est pas disponible dans cet environnement. Les interfaces exportées ici
 * sont le contrat stable ; le jour où le vrai `@mabele/core` est publié, il
 * suffit de retirer l'alias `@mabele/core` du `tsconfig.json` et d'installer le
 * package — **aucun import applicatif ne change**.
 */

export {
  type NetworkTier,
  type NetworkState,
  type DataPolicy,
  classify,
  readNetworkState,
  observeNetwork,
  dataPolicyFor,
} from './network';

export {
  type EngagementKind,
  type EngagementEvent,
  onEngagement,
  emitEngagement,
  __resetEngagementListeners,
} from './events';

export { type MabeleFlags, flags, __resetFlags } from './flags';
