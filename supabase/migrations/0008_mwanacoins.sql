-- ============================================================================
-- 0008 · MwanaCoins — points d'engagement social
-- ----------------------------------------------------------------------------
--  ⚠️  MwanaCoins N'EST PAS UNE MONNAIE.
--
--  Ce module ne contient volontairement AUCUNE référence à `payments`,
--  `subscriptions`, `payment_provider`, ni à un quelconque taux de conversion,
--  achat, retrait ou transfert entre utilisateurs. Cette absence est une
--  garantie structurelle : il n'existe aucun chemin SQL menant d'un solde
--  MwanaCoins vers de l'argent réel.
--
--  Toute migration ultérieure qui créerait un tel lien viole la règle §2.4 du
--  brief et doit être refusée en revue.
-- ============================================================================

-- Types d'engagement récompensés. Aligné sur `EngagementKind` (@mabele/core).
do $$ begin
  if not exists (select 1 from pg_type where typname = 'engagement_kind') then
    create type public.engagement_kind as enum (
      'track.completed',
      'track.liked',
      'track.shared',
      'comment.posted',
      'artist.followed',
      'track.published'
    );
  end if;
end $$;

-- --- Grand livre, strictement en ajout ------------------------------------
-- Aucun UPDATE ni DELETE n'est autorisé (aucune policy ne les permet) :
-- un solde se recalcule, il ne se réécrit pas.
create table if not exists public.mwana_coins_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        public.engagement_kind not null,
  subject_id  uuid not null,
  points      integer not null check (points >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists idx_coins_user on public.mwana_coins_ledger (user_id, created_at desc);

-- Anti-abus : une seule attribution par (utilisateur, type, sujet, jour).
-- Rejouer un like ou un partage en boucle ne crédite rien de plus.
create unique index if not exists uq_coins_daily_grain
  on public.mwana_coins_ledger (user_id, kind, subject_id, (created_at::date));

alter table public.mwana_coins_ledger enable row level security;

-- Lecture : chacun voit uniquement son propre grand livre.
drop policy if exists "users read own coins" on public.mwana_coins_ledger;
create policy "users read own coins"
  on public.mwana_coins_ledger for select using (user_id = auth.uid());

-- Aucune policy d'INSERT/UPDATE/DELETE : le client n'écrit jamais son solde.
-- Seule la fonction SECURITY DEFINER ci-dessous peut créditer.

-- --- Barème et plafonds ----------------------------------------------------
-- Doit rester synchronisé avec POINTS / DAILY_CAPS de `@mabele/credit`.
create or replace function public.mwana_coins_points(p_kind public.engagement_kind)
returns integer language sql immutable as $$
  select case p_kind
    when 'track.completed'  then 1
    when 'track.liked'      then 2
    when 'track.shared'     then 5
    when 'comment.posted'   then 3
    when 'artist.followed'  then 3
    when 'track.published'  then 20
  end;
$$;

create or replace function public.mwana_coins_daily_cap(p_kind public.engagement_kind)
returns integer language sql immutable as $$
  select case p_kind
    when 'track.completed'  then 100
    when 'track.liked'      then 50
    when 'track.shared'     then 20
    when 'comment.posted'   then 30
    when 'artist.followed'  then 20
    when 'track.published'  then 10
  end;
$$;

-- --- Attribution (seule voie d'écriture) -----------------------------------
create or replace function public.award_mwana_coins(
  p_kind public.engagement_kind,
  p_subject_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_points integer;
  v_used integer;
begin
  -- Les visiteurs anonymes ne cumulent rien : pas de solde sans compte.
  if v_user is null then
    return 0;
  end if;

  select count(*) into v_used
  from public.mwana_coins_ledger
  where user_id = v_user
    and kind = p_kind
    and created_at::date = current_date;

  if v_used >= public.mwana_coins_daily_cap(p_kind) then
    return 0;
  end if;

  v_points := public.mwana_coins_points(p_kind);

  insert into public.mwana_coins_ledger (user_id, kind, subject_id, points)
  values (v_user, p_kind, p_subject_id, v_points)
  on conflict do nothing;  -- doublon du jour : rien de plus n'est crédité

  if not found then
    return 0;
  end if;

  return v_points;
end;
$$;

grant execute on function public.award_mwana_coins(public.engagement_kind, uuid) to authenticated;

-- --- Solde ------------------------------------------------------------------
create or replace function public.mwana_coins_balance()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(points), 0)::integer
  from public.mwana_coins_ledger
  where user_id = auth.uid();
$$;

grant execute on function public.mwana_coins_balance() to authenticated;

comment on table public.mwana_coins_ledger is
  'Points d''engagement social. Sans valeur monetaire : ni achat, ni retrait, ni conversion.';
