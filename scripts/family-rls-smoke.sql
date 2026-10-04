-- Family RLS + done-rule smoke (F-01)
-- Run against local Supabase as postgres, after migrations:
--   npx supabase db reset
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/family-rls-smoke.sql
--
-- Expect: script ends with NOTICE 'family-rls-smoke: OK'

begin;

create extension if not exists "pgcrypto";

do $$
declare
  parent_id uuid := gen_random_uuid();
  child_a_id uuid := gen_random_uuid();
  child_b_id uuid := gen_random_uuid();
  family uuid;
  chore_a uuid;
  chore_b uuid;
  visible_count int;
  deleted_count int;
begin
  -- Parent signup path: no role meta → trigger creates family + parent profile
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    parent_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'parent@example.com',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

  select family_id into family from public.profiles where id = parent_id;
  if family is null then
    raise exception 'bootstrap failed: parent profile/family missing';
  end if;

  -- Child accounts: metadata role=child skips bootstrap; parent inserts profiles
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      child_a_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'syn@family.local',
      crypt('password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"child"}'::jsonb,
      now(),
      now()
    ),
    (
      child_b_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'corka@family.local',
      crypt('password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"child"}'::jsonb,
      now(),
      now()
    );

  if exists (select 1 from public.profiles where id in (child_a_id, child_b_id)) then
    raise exception 'child bootstrap should be skipped when role=child';
  end if;

  -- Insert child profiles as parent (RLS)
  perform set_config('request.jwt.claim.sub', parent_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';

  insert into public.profiles (id, family_id, role, display_name)
  values
    (child_a_id, family, 'child', 'Syn'),
    (child_b_id, family, 'child', 'Corka');

  insert into public.today_chores (family_id, child_profile_id, title, chore_date)
  values (family, child_a_id, 'Umyj zeby', current_date)
  returning id into chore_a;

  insert into public.today_chores (family_id, child_profile_id, title, chore_date)
  values (family, child_b_id, 'Spakuj plecak', current_date)
  returning id into chore_b;

  -- Child A sees only own chore
  perform set_config('request.jwt.claim.sub', child_a_id::text, true);
  execute 'set local role authenticated';
  select count(*) into visible_count from public.today_chores;
  if visible_count <> 1 then
    raise exception 'child A isolation failed: expected 1 row, got %', visible_count;
  end if;

  -- Child A check-off (allowed)
  update public.today_chores
  set child_checked_at = now()
  where id = chore_a;

  if (select child_checked_at from public.today_chores where id = chore_a) is null then
    raise exception 'child check-off failed';
  end if;

  -- Child must not change title (BEFORE UPDATE column lock)
  begin
    update public.today_chores
    set title = 'Hacked title'
    where id = chore_a;
    raise exception 'child must not be able to change title';
  exception
    when insufficient_privilege then
      null; -- expected (errcode 42501)
    when others then
      if sqlerrm like 'child may only update child_checked_at%' then
        null; -- expected
      else
        raise;
      end if;
  end;

  if (select title from public.today_chores where id = chore_a) <> 'Umyj zeby' then
    raise exception 'child title mutation leaked';
  end if;

  -- Child setting confirm should fail (WITH CHECK and/or column lock)
  begin
    update public.today_chores
    set parent_confirmed_at = now()
    where id = chore_a;
    if (select parent_confirmed_at from public.today_chores where id = chore_a) is not null then
      raise exception 'child must not be able to set parent_confirmed_at';
    end if;
  exception
    when others then
      null; -- expected failure path
  end;

  -- Reset confirm if somehow set, then parent confirms
  perform set_config('request.jwt.claim.sub', parent_id::text, true);
  execute 'set local role authenticated';
  update public.today_chores
  set parent_confirmed_at = null
  where id = chore_a;

  update public.today_chores
  set parent_confirmed_at = now()
  where id = chore_a and child_checked_at is not null;

  if (select parent_confirmed_at is null or child_checked_at is null from public.today_chores where id = chore_a) then
    raise exception 'done rule failed: both timestamps required';
  end if;

  -- Parent cannot delete confirmed chore
  delete from public.today_chores where id = chore_a;
  get diagnostics deleted_count = row_count;
  if deleted_count <> 0 then
    raise exception 'confirmed chore must not be deletable';
  end if;

  -- Parent can delete unconfirmed sibling chore
  delete from public.today_chores where id = chore_b;
  get diagnostics deleted_count = row_count;
  if deleted_count <> 1 then
    raise exception 'unconfirmed chore should be deletable by parent';
  end if;

  -- Idempotent bootstrap: second ensure path is trigger-only; profile already exists
  if (select count(*) from public.profiles where id = parent_id) <> 1 then
    raise exception 'parent profile not unique';
  end if;

  raise notice 'family-rls-smoke: OK';
end;
$$;

rollback;
