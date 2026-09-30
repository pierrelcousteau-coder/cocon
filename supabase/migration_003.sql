-- Cocon — mise à jour v3 : to do du jour
-- À exécuter UNE fois dans Supabase > SQL Editor

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  title text not null,
  done boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists todos_user_day on public.todos (user_id, day);

alter table public.todos enable row level security;
drop policy if exists "own all" on public.todos;
create policy "own all" on public.todos for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "supporter read" on public.todos;
create policy "supporter read" on public.todos for select using (public.is_supporter_of(user_id));
