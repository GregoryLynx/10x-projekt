import type { APIRoute } from "astro";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase";
import { warsawToday } from "@/lib/today";

export const prerender = false;

const choreSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title must be at most 120 characters"),
  child_profile_id: z.string().trim().min(1, "Child is required"),
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
  if (!profile) {
    return context.redirect(dashboardError("Sign in as a parent to add a chore"));
  }
  if (profile.role !== "parent") {
    return context.redirect(dashboardError("Only a parent can add a chore"));
  }

  const form = await context.request.formData();
  const parsed = choreSchema.safeParse({
    title: formField(form, "title"),
    child_profile_id: formField(form, "child_profile_id"),
  });
  if (!parsed.success) {
    return context.redirect(dashboardError(parsed.error.issues[0].message));
  }

  const { title, child_profile_id } = parsed.data;

  const child = await supabase
    .from("profiles")
    .select("id")
    .eq("id", child_profile_id)
    .eq("family_id", profile.family_id)
    .eq("role", "child")
    .maybeSingle();

  if (child.error) {
    return context.redirect(dashboardError("Could not check the child"));
  }
  if (!child.data) {
    return context.redirect(dashboardError("That child is not in your family"));
  }

  const inserted = await supabase.from("today_chores").insert({
    family_id: profile.family_id,
    child_profile_id,
    title,
    chore_date: warsawToday(),
  });

  if (inserted.error) {
    return context.redirect(dashboardError("Could not save the chore"));
  }

  return context.redirect("/dashboard?added=1");
};
