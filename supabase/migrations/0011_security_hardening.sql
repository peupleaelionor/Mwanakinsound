-- ============================================================================
-- 0011 · Durcissement sécurité (advisors Supabase)
-- ----------------------------------------------------------------------------
-- Suite au linter de sécurité :
--  1. search_path figé sur les fonctions qui ne le fixaient pas (WARN
--     "function_search_path_mutable"). Toutes ces fonctions ne référencent que
--     des objets qualifiés (public.*) ou des built-ins → search_path = '' est sûr.
--  2. Révocation d'EXECUTE sur les fonctions PUREMENT trigger : elles ne doivent
--     jamais être appelables via l'API REST (/rpc). Les triggers les exécutent
--     en tant que propriétaire, indépendamment des grants.
--
-- Note : is_artist_owner / auth_role restent exécutables — elles sont évaluées
-- dans les policies RLS pour le compte de l'appelant et ne révèlent qu'un booléen
-- le concernant. record_stream / recommend_tracks / award_mwana_coins /
-- record_episode_play / social_user_stats sont volontairement exposées en RPC.
-- ============================================================================

alter function public.set_updated_at() set search_path = '';
alter function public.mwana_coins_points(public.engagement_kind) set search_path = '';
alter function public.mwana_coins_daily_cap(public.engagement_kind) set search_path = '';
alter function public.extract_hashtags(text) set search_path = '';
alter function public.sync_comment_hashtags() set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_track_like_count() from public, anon, authenticated;
revoke execute on function public.sync_comment_hashtags() from public, anon, authenticated;
