-- F-01 follow-up (plan-review F2): child may only change child_checked_at on today_chores.
-- RLS cannot restrict updated columns; enforce with BEFORE UPDATE trigger.

create or replace function public.today_chores_child_column_lock()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.current_profile_role() = 'child' then
    if new.id is distinct from old.id
      or new.family_id is distinct from old.family_id
      or new.child_profile_id is distinct from old.child_profile_id
      or new.title is distinct from old.title
      or new.chore_date is distinct from old.chore_date
      or new.parent_confirmed_at is distinct from old.parent_confirmed_at
      or new.created_at is distinct from old.created_at
    then
      raise exception 'child may only update child_checked_at on today_chores'
        using errcode = '42501';
    end if;

    -- Allow child_checked_at + bump updated_at
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists today_chores_child_column_lock on public.today_chores;

create trigger today_chores_child_column_lock
  before update on public.today_chores
  for each row
  execute function public.today_chores_child_column_lock();
