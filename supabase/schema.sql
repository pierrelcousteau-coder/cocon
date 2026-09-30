-- Cocon — schéma Supabase
-- À coller dans Supabase > SQL Editor > New query > Run

-- ─────────────────────────── Profils ───────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  role text not null default 'owner' check (role in ('owner', 'supporter')),
  linked_to uuid references public.profiles(id) on delete set null, -- pour le soutien : le profil suivi
  invite_code text unique default upper(substr(md5(random()::text), 1, 6)),
  tz text not null default 'Europe/Paris',
  water_goal_ml int not null default 1500,
  glass_ml int not null default 250,
  sport_per_week int not null default 3,
  sport_types text[] not null default array['Marche rapide', 'Yoga', 'Pilates', 'Natation'],
  cheat_max int not null default 1,
  reminders jsonb not null default '{"morning":"08:00","noon":"12:30","evening":"21:00"}',
  reminders_on boolean not null default false,
  created_at timestamptz not null default now()
);

-- crée le profil automatiquement à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- vrai si l'utilisateur courant est le soutien lié à `owner`
create or replace function public.is_supporter_of(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'supporter' and linked_to = owner);
$$;

-- profil suivi par l'utilisateur courant (évite la récursion RLS)
create or replace function public.my_linked_to() returns uuid
language sql stable security definer set search_path = public as $$
  select linked_to from profiles where id = auth.uid();
$$;

-- lier un compte soutien à la personne suivie via son code
create or replace function public.link_with_code(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  select id into target from profiles where invite_code = upper(trim(code)) and role = 'owner';
  if target is null then raise exception 'Code introuvable'; end if;
  if target = auth.uid() then raise exception 'C''est ton propre code'; end if;
  perform set_config('cocon.linking', 'on', true);
  update profiles set role = 'supporter', linked_to = target where id = auth.uid();
  return target;
end $$;

-- empêche de modifier rôle / liaison / code à la main (seul link_with_code le peut)
create or replace function public.guard_profile_links() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('cocon.linking', true), '') <> 'on'
     and (new.role is distinct from old.role or new.linked_to is distinct from old.linked_to
          or new.invite_code is distinct from old.invite_code) then
    raise exception 'Modification non autorisée';
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_links on public.profiles;
create trigger guard_profile_links before update on public.profiles
  for each row execute function public.guard_profile_links();

-- ─────────────────────────── Routine ───────────────────────────
create table if not exists public.routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('supplement', 'phyto')),
  name text not null,
  dose text not null default '',
  moment text not null check (moment in ('morning', 'noon', 'evening')),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ─────────────────────────── Suivi ───────────────────────────
create table if not exists public.daily_logs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  water_ml int not null default 0,
  walked boolean not null default false,
  steps int,
  mood smallint, -- 1..5, optionnel
  primary key (user_id, day)
);

create table if not exists public.item_checks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  item_id uuid not null references public.routine_items(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (user_id, day, item_id)
);

create table if not exists public.sport_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  type text not null,
  minutes int,
  created_at timestamptz not null default now()
);

create table if not exists public.cheat_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ─────────────────────────── Encouragements ───────────────────────────
create table if not exists public.encouragements (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- ─────────────────────────── Notifications ───────────────────────────
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reminder_log (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  moment text not null,
  primary key (user_id, day, moment)
);

-- ─────────────────────────── Sécurité (RLS) ───────────────────────────
alter table public.profiles enable row level security;
alter table public.routine_items enable row level security;
alter table public.daily_logs enable row level security;
alter table public.item_checks enable row level security;
alter table public.sport_sessions enable row level security;
alter table public.cheat_meals enable row level security;
alter table public.encouragements enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;

drop policy if exists "profil: lecture" on public.profiles;
create policy "profil: lecture" on public.profiles for select
  using (id = auth.uid() or public.is_supporter_of(id) or id = public.my_linked_to());
drop policy if exists "profil: modif" on public.profiles;
create policy "profil: modif" on public.profiles for update using (id = auth.uid());

-- tables de suivi : propriétaire en écriture, soutien en lecture
do $$
declare t text;
begin
  foreach t in array array['routine_items', 'daily_logs', 'item_checks', 'sport_sessions', 'cheat_meals'] loop
    execute format('drop policy if exists "own all" on public.%I', t);
    execute format('create policy "own all" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "supporter read" on public.%I', t);
    execute format('create policy "supporter read" on public.%I for select using (public.is_supporter_of(user_id))', t);
  end loop;
end $$;

drop policy if exists "enc: lecture" on public.encouragements;
create policy "enc: lecture" on public.encouragements for select using (to_id = auth.uid() or from_id = auth.uid());
drop policy if exists "enc: envoi" on public.encouragements;
create policy "enc: envoi" on public.encouragements for insert
  with check (from_id = auth.uid() and public.is_supporter_of(to_id));
drop policy if exists "enc: marquer lu" on public.encouragements;
create policy "enc: marquer lu" on public.encouragements for update using (to_id = auth.uid());

drop policy if exists "push: own" on public.push_subscriptions;
create policy "push: own" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- reminder_log : uniquement la fonction serveur (service role), aucune policy
