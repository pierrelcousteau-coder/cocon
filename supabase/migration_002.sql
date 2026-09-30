-- Cocon — mise à jour v2 (activités personnalisées, messages à double sens, temps réel)
-- À exécuter UNE fois dans Supabase > SQL Editor (après schema.sql)

-- ───── Activités / todos personnalisés ─────
alter table public.routine_items drop constraint if exists routine_items_kind_check;
alter table public.routine_items add constraint routine_items_kind_check
  check (kind in ('supplement', 'phyto', 'activity'));
alter table public.routine_items drop constraint if exists routine_items_moment_check;
alter table public.routine_items add constraint routine_items_moment_check
  check (moment in ('morning', 'noon', 'evening', 'anytime'));
alter table public.routine_items add column if not exists icon text not null default '';
alter table public.routine_items add column if not exists frequency text not null default 'daily';
alter table public.routine_items drop constraint if exists routine_items_frequency_check;
alter table public.routine_items add constraint routine_items_frequency_check check (frequency in ('daily', 'weekly'));
alter table public.routine_items add column if not exists weekly_target int not null default 1;

-- ───── Messages dans les deux sens ─────
-- vrai si `sid` est le soutien lié à l'utilisateur courant
create or replace function public.is_my_supporter(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = sid and role = 'supporter' and linked_to = auth.uid());
$$;

-- la personne suivie peut voir le profil (prénom) de son soutien
drop policy if exists "profil: lecture" on public.profiles;
create policy "profil: lecture" on public.profiles for select
  using (id = auth.uid() or public.is_supporter_of(id) or id = public.my_linked_to() or linked_to = auth.uid());

drop policy if exists "enc: envoi" on public.encouragements;
create policy "enc: envoi" on public.encouragements for insert
  with check (from_id = auth.uid() and (public.is_supporter_of(to_id) or public.is_my_supporter(to_id)));

-- ───── Temps réel pour les messages ─────
do $$
begin
  alter publication supabase_realtime add table public.encouragements;
exception when duplicate_object then null;
end $$;
