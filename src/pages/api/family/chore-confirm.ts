import type { APIRoute } from "astro";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase";
import { warsawToday } from "@/lib/today";

export const prerender = false;

const confirmSchema = z.object({
  chore_id: z.uuid({ error: "Chore is required" }),
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
  if (profile?.role !== "parent") {
    return context.redirect(dashboardError("Only a parent can confirm a chore"));
  }

  const form = await context.request.formData();
  const parsed = confirmSchema.safeParse({
    chore_id: formField(form, "chore_id"),
  });
  if (!parsed.success) {
    return context.redirect(dashboardError(parsed.error.issues[0].message));
  }

  const { chore_id } = parsed.data;

  const found = await supabase
    .from("today_chores")
    .select("child_checked_at, parent_confirmed_at")
    .eq("id", chore_id)
    .eq("chore_date", warsawToday())
    .maybeSingle();

  if (found.error) {
    return context.redirect(dashboardError("Could not confirm the chore"));
  }
  if (!found.data) {
    return context.redirect(dashboardError("That chore is not on today's list"));
  }

  const row = found.data;

  if (!row.child_checked_at) {
    return context.redirect(dashboardError("That chore has not been checked off"));
  }
  if (row.parent_confirmed_at) {
    return context.redirect("/dashboard?confirmed=1");
  }

  const now = new Date().toISOString();
  const updated = await supabase
    .from("today_chores")
    .update({ parent_confirmed_at: now, updated_at: now })
    .eq("id", chore_id)
    .eq("chore_date", warsawToday())
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    return context.redirect(dashboardError("Could not save the confirmation"));
  }

  return context.redirect("/dashboard?confirmed=1");
};
