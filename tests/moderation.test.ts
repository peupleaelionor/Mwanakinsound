import { describe, expect, it } from 'vitest';
import { localCheck as __localCheck } from '@/features/moderation/local';

/**
 * Le garde local est la seule couche toujours active (Perspective est
 * optionnel). Il doit être strict sur l'évident et permissif sur le reste.
 */
describe('modération — garde local', () => {
  it('laisse passer un commentaire normal', () => {
    expect(__localCheck('Superbe épisode, merci ! #culture').allowed).toBe(true);
  });

  it('refuse un commentaire vide', () => {
    expect(__localCheck('   ').allowed).toBe(false);
  });

  it('refuse au-delà de 280 caractères', () => {
    expect(__localCheck('a'.repeat(281)).allowed).toBe(false);
  });

  it('bloque les insultes de la liste noire', () => {
    expect(__localCheck('kys').allowed).toBe(false);
  });
});
