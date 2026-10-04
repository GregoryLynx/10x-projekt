-- F-01: families, profiles, today_chores + RLS + parent bootstrap on signup

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create type public.profile_role as enum ('parent', 'child');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  role public.profile_role not null,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create index profiles_family_id_idx on public.profiles (family_id);

create table public.today_chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  chore_date date not null default (timezone('utc', now()))::date,
  child_checked_at timestamptz,
  parent_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint today_chores_confirmed_implies_checked
    check (
      parent_confirmed_at is null
      or child_checked_at is not null
    )
);

create index today_chores_family_id_idx on public.today_chores (family_id);
create index today_chores_child_date_idx on public.today_chores (child_profile_id, chore_date);

-- ---------------------------------------------------------------------------
-- Helpers (security definer — avoid RLS recursion when reading own profile)
-- ---------------------------------------------------------------------------

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Bootstrap: every new auth user without role=child becomes a parent + family
-- Child accounts (S-01) must set raw_user_meta_data.role = 'child' and insert
-- the profiles row themselves with the parent's family_id.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  meta_role text;
begin
  meta_role := coalesce(new.raw_user_meta_data ->> 'role', 'parent');

  if meta_role = 'child' then
    return new;
  end if;

  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  insert into public.families default values
  returning id into new_family_id;

  insert into public.profiles (id, family_id, role, display_name)
  values (
    new.id,
    new_family_id,
    'parent',
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'parent')
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.today_chores enable row level security;
alter table public.families force row level security;
alter table public.profiles force row level security;
alter table public.today_chores force row level security;

-- families: members of the family can read their family row
create policy families_select_member
  on public.families
  for select
  to authenticated
  using (id = public.current_family_id());

-- profiles: see own row + same-family members (parent needs children; child sees self)
create policy profiles_select_family
  on public.profiles
  for select
  to authenticated
  using (family_id = public.current_family_id());

-- parents may update own display_name; children may update own display_name
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Parent inserts child profiles (S-01). Child users skip trigger; parent inserts row.
create policy profiles_insert_parent_for_family
  on public.profiles
  for insert
  to authenticated
  with check (
    public.current_profile_role() = 'parent'
    and family_id = public.current_family_id()
    and role = 'child'
  );

-- today_chores SELECT
create policy today_chores_select
  on public.today_chores
  for select
  to authenticated
  using (
    family_id = public.current_family_id()
    and (
      public.current_profile_role() = 'parent'
      or child_profile_id = auth.uid()
    )
  );

-- Parent creates chores for children in the family
create policy today_chores_insert_parent
  on public.today_chores
  for insert
  to authenticated
  with check (
    public.current_profile_role() = 'parent'
    and family_id = public.current_family_id()
    and family_id = (select p.family_id from public.profiles p where p.id = child_profile_id)
    and (select p.role from public.profiles p where p.id = child_profile_id) = 'child'
  );

-- Parent: full update within family (confirm, edit title before confirm, etc.)
-- Child: update only own rows; column lock is in today_chores_child_column_lock trigger
create policy today_chores_update_parent
  on public.today_chores
  for update
  to authenticated
  using (
    public.current_profile_role() = 'parent'
    and family_id = public.current_family_id()
  )
  with check (
    public.current_profile_role() = 'parent'
    and family_id = public.current_family_id()
  );

create policy today_chores_update_child
  on public.today_chores
  for update
  to authenticated
  using (
    public.current_profile_role() = 'child'
    and child_profile_id = auth.uid()
  )
  with check (
    public.current_profile_role() = 'child'
    and child_profile_id = auth.uid()
    and parent_confirmed_at is null
  );

-- Parent may delete only unconfirmed chores; child cannot delete
create policy today_chores_delete_parent_unconfirmed
  on public.today_chores
  for delete
  to authenticated
  using (
    public.current_profile_role() = 'parent'
    and family_id = public.current_family_id()
    and parent_confirmed_at is null
  );

grant usage on schema public to authenticated;
grant select on public.families to authenticated;
grant select, update, insert on public.profiles to authenticated;
grant select, insert, update, delete on public.today_chores to authenticated;
grant usage on type public.profile_role to authenticated;
grant execute on function public.current_family_id() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
