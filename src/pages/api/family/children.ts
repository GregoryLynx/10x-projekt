import type { APIRoute } from "astro";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase";

export const prerender = false;

const childAccountSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(80, "Name must be at most 80 characters"),
  login: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]{3,32}$/, "Login must be 3-32 letters or digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
    return context.redirect(dashboardError("Sign in as a parent to add a child"));
  }
  if (profile.role !== "parent") {
    return context.redirect(dashboardError("Only a parent can add a child"));
  }

  const form = await context.request.formData();
  const parsed = childAccountSchema.safeParse({
    display_name: formField(form, "display_name"),
    login: formField(form, "login"),
    password: formField(form, "password"),
  });
  if (!parsed.success) {
    return context.redirect(dashboardError(parsed.error.issues[0].message));
  }

  const { display_name, login, password } = parsed.data;

  const existingChildren = await supabase
    .from("profiles")
    .select("id")
    .eq("family_id", profile.family_id)
    .eq("role", "child")
    .limit(1);

  if (existingChildren.error) {
    return context.redirect(dashboardError("Could not check existing children"));
  }
  if (existingChildren.data.length > 0) {
    return context.redirect(dashboardError("A second child arrives in the next slice"));
  }

  const admin = createAdminClient();
  if (!admin) {
    return context.redirect(dashboardError("Service role key is not configured"));
  }

  const created = await admin.auth.admin.createUser({
    email: `${login}@family.local`,
    password,
    email_confirm: true,
    user_metadata: { role: "child" },
  });

  if (created.error) {
    return context.redirect(dashboardError(created.error.message));
  }

  const childId = created.data.user.id;
  const inserted = await supabase.from("profiles").insert({
    id: childId,
    family_id: profile.family_id,
    role: "child",
    display_name,
  });

  if (inserted.error) {
    await admin.auth.admin.deleteUser(childId);
    return context.redirect(dashboardError("Could not save the child profile"));
  }

  return context.redirect(`/dashboard?created=${encodeURIComponent(login)}`);
};
