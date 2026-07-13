create table if not exists public.study_rooms (
  code text primary key,
  room_data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.study_rooms enable row level security;

drop policy if exists "study rooms are readable" on public.study_rooms;
create policy "study rooms are readable"
on public.study_rooms
for select
to anon
using (true);

drop policy if exists "study rooms can be created" on public.study_rooms;
create policy "study rooms can be created"
on public.study_rooms
for insert
to anon
with check (true);

drop policy if exists "study rooms can be updated" on public.study_rooms;
create policy "study rooms can be updated"
on public.study_rooms
for update
to anon
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_rooms'
  ) then
    alter publication supabase_realtime add table public.study_rooms;
  end if;
end $$;
