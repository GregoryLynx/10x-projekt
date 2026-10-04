/**
 * Domain types for Obowiązki (F-01).
 *
 * Child login convention (enforced in S-01 when parent creates accounts):
 * use a synthetic email such as `{slug}@family.local` plus a password chosen
 * by the parent. Soft family size limit (parent + up to 2 children) is app-level.
 */

export type ProfileRole = "parent" | "child";

export interface Family {
  id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  family_id: string;
  role: ProfileRole;
  display_name: string;
  created_at: string;
}

export interface TodayChore {
  id: string;
  family_id: string;
  child_profile_id: string;
  title: string;
  chore_date: string;
  child_checked_at: string | null;
  parent_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Done only after child check-off and parent confirmation. */
export function isDone(chore: Pick<TodayChore, "child_checked_at" | "parent_confirmed_at">): boolean {
  return chore.child_checked_at != null && chore.parent_confirmed_at != null;
}
