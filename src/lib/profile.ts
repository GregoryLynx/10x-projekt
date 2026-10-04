import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, ProfileRole } from "@/types";

interface ProfileRow {
  id: string;
  family_id: string;
  role: string;
  display_name: string;
  created_at: string;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    family_id: row.family_id,
    role: row.role as ProfileRole,
    display_name: row.display_name,
    created_at: row.created_at,
  };
}

export async function getCurrentProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (!user) {
    return null;
  }

  const result = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (result.error || !result.data) {
    return null;
  }

  return mapProfile(result.data as ProfileRow);
}
