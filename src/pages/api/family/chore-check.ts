import type { APIRoute } from "astro";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase";
import { warsawToday } from "@/lib/today";

export const prerender = false;

const checkSchema = z.object({
  chore_id: z.uuid({ error: "Chore is required" }),
  intent: z.enum(["check", "undo"], { error: "Choose check or undo" }),
});

function formField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function dashboardError(message: string): string {
  return `/dashboard?error=${encodeURIComponent(message)}`;
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(dashboardError("Supabase is not configured"));
  }

  const profile = await getCurrentProfile(supabase);
  if (profile?.role !== "child") {
    return context.redirect(dashboardError("Only a child can check off a chore"));
  }

  const form = await context.request.formData();
  const parsed = checkSchema.safeParse({
    chore_id: formField(form, "chore_id"),
    intent: formField(form, "intent"),
  });
  if (!parsed.success) {
    return context.redirect(dashboardError(parsed.error.issues[0].message));
  }

  const { chore_id, intent } = parsed.data;

  const found = await supabase
    .from("today_chores")
    .select("child_checked_at, parent_confirmed_at")
    .eq("id", chore_id)
    .eq("child_profile_id", profile.id)
    .eq("chore_date", warsawToday())
    .maybeSingle();

  if (found.error) {
    return context.redirect(dashboardError("Could not check the chore"));
  }
  if (!found.data) {
    return context.redirect(dashboardError("That chore is not on today's list"));
  }

  const row = found.data;

  if (intent === "check" && row.child_checked_at) {
    return context.redirect("/dashboard?checked=1");
  }
  if (intent === "undo" && row.parent_confirmed_at) {
    return context.redirect(dashboardError("That chore can no longer be changed"));
  }
  if (intent === "undo" && !row.child_checked_at) {
    return context.redirect("/dashboard?undone=1");
  }

  const updated = await supabase
    .from("today_chores")
    .update(intent === "check" ? { child_checked_at: new Date().toISOString() } : { child_checked_at: null })
    .eq("id", chore_id)
    .eq("child_profile_id", profile.id)
    .eq("chore_date", warsawToday())
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    return context.redirect(dashboardError("Could not save the check-off"));
  }

  return context.redirect(intent === "check" ? "/dashboard?checked=1" : "/dashboard?undone=1");
};
