import type { APIRoute } from "astro";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase";
import { warsawToday } from "@/lib/today";

export const prerender = false;

const removeSchema = z.object({
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
    return context.redirect(dashboardError("Only a parent can remove a chore"));
  }

  const form = await context.request.formData();
  const parsed = removeSchema.safeParse({
    chore_id: formField(form, "chore_id"),
  });
  if (!parsed.success) {
    return context.redirect(dashboardError(parsed.error.issues[0].message));
  }

  const { chore_id } = parsed.data;

  const found = await supabase
    .from("today_chores")
    .select("parent_confirmed_at")
    .eq("id", chore_id)
    .eq("chore_date", warsawToday())
    .maybeSingle();

  if (found.error) {
    return context.redirect(dashboardError("Could not remove the chore"));
  }
  if (!found.data) {
    return context.redirect(dashboardError("That chore is not on today's list"));
  }

  if (found.data.parent_confirmed_at) {
    return context.redirect(dashboardError("That chore cannot be removed"));
  }

  const removed = await supabase
    .from("today_chores")
    .delete()
    .eq("id", chore_id)
    .eq("chore_date", warsawToday())
    .is("parent_confirmed_at", null)
    .select("id")
    .maybeSingle();

  if (removed.error || !removed.data) {
    return context.redirect(dashboardError("Could not remove the chore"));
  }

  return context.redirect("/dashboard?removed=1");
};
