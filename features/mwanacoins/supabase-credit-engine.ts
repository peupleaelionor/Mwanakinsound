'use client';

import type { CreditEngine, CreditEntry } from '@mabele/credit';
import type { EngagementEvent } from '@mabele/core';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Implémentation Supabase du `credit-engine`.
 *
 * L'attribution passe **exclusivement** par la RPC `award_mwana_coins`
 * (`SECURITY DEFINER`) : le client ne peut pas écrire dans le grand livre, donc
 * pas fabriquer de solde. Barème et plafonds journaliers sont appliqués côté
 * base — le front n'est jamais la source de vérité.
 *
 * Rappel : MwanaCoins n'a aucune valeur monétaire. Cette classe n'expose ni
 * achat, ni retrait, ni conversion — et ne doit jamais en exposer.
 */
export class SupabaseCreditEngine implements CreditEngine {
  async award(event: EngagementEvent): Promise<number> {
    if (!isSupabaseConfigured) return 0;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('award_mwana_coins', {
        p_kind: event.kind,
        p_subject_id: event.subjectId,
      });
      if (error) return 0;
      return typeof data === 'number' ? data : 0;
    } catch {
      // L'engagement ne doit jamais interrompre le parcours utilisateur.
      return 0;
    }
  }

  async balance(): Promise<number> {
    if (!isSupabaseConfigured) return 0;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('mwana_coins_balance');
      if (error) return 0;
      return typeof data === 'number' ? data : 0;
    } catch {
      return 0;
    }
  }

  async history(limit = 20): Promise<CreditEntry[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('mwana_coins_ledger')
        .select('kind, subject_id, points, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data ?? []).map((row) => ({
        kind: row.kind,
        subjectId: row.subject_id,
        points: row.points,
        createdAt: row.created_at,
      })) as CreditEntry[];
    } catch {
      return [];
    }
  }
}
