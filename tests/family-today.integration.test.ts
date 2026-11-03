import { createClient } from "@supabase/supabase-js";
import { expect, test } from "vitest";

// Vitest replaces BASE_URL with the app base "/". The config copies the original value to PREVIEW_ORIGIN.
function readEnv(name: string): string | undefined {
  return process.env[name];
}

const configuredOrigin = readEnv("PREVIEW_ORIGIN");
const BASE_URL = configuredOrigin && !configuredOrigin.startsWith("/") ? configuredOrigin : "http://localhost:4321";
const PASSWORD = "Family-Test-Passw0rd!";

interface HttpResult {
  status: number;
  location: string;
  body: string;
}

interface FormRequest {
  method?: string;
  form?: Record<string, string>;
}

interface ChoreRow {
  id: string;
  chore_date: string;
  child_checked_at: string | null;
  parent_confirmed_at: string | null;
}

function createSession(): { request: (path: string, init?: FormRequest) => Promise<HttpResult> } {
  const jar = new Map<string, string>();

  function cookieHeader(): string {
    return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  function storeCookies(response: Response): void {
    for (const raw of response.headers.getSetCookie()) {
      const [pair, ...attrs] = raw.split(";");
      const [name, ...rest] = pair.split("=");
      const expired = attrs.some((attr) => /max-age=0/i.test(attr.trim()));
      if (expired) {
        jar.delete(name.trim());
      } else {
        jar.set(name.trim(), rest.join("="));
      }
    }
  }

  return {
    async request(path: string, init?: FormRequest): Promise<HttpResult> {
      const form = init?.form;
      const headers: Record<string, string> = {
        Cookie: cookieHeader(),
        Origin: BASE_URL,
      };
      if (form) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }

      const response = await fetch(BASE_URL + path, {
        method: init?.method ?? "GET",
        redirect: "manual",
        headers,
        body: form ? new URLSearchParams(form).toString() : undefined,
      });
      storeCookies(response);

      return {
        status: response.status,
        location: response.headers.get("location") ?? "",
        body: await response.text(),
      };
    },
  };
}

function locationPath(location: string): string {
  if (location.startsWith("http://") || location.startsWith("https://")) {
    const url = new URL(location);
    return `${url.pathname}${url.search}`;
  }
  return location;
}

function expectRedirect(result: HttpResult, expected: string): void {
  expect(result.status).toBe(302);
  expect(locationPath(result.location)).toBe(expected);
}

function errorMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }
  return typeof error.message === "string" ? error.message : null;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} was not readable`);
  }
  return value;
}

function requiredString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${key} was not a string`);
  }
  return value;
}

function nullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${key} was not a string`);
  }
  return value;
}

function parentClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY are required");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type ParentDb = ReturnType<typeof parentClient>;

function calendarDay(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (!match?.[1]) {
    throw new Error("chore_date is not YYYY-MM-DD");
  }
  return match[1];
}

function choreFromRow(value: unknown, label: string): ChoreRow {
  const row = asRecord(value, label);
  return {
    id: requiredString(row, "id"),
    chore_date: calendarDay(requiredString(row, "chore_date")),
    child_checked_at: nullableString(row, "child_checked_at"),
    parent_confirmed_at: nullableString(row, "parent_confirmed_at"),
  };
}

async function selectChore(db: ParentDb, id: string): Promise<ChoreRow> {
  const result = await db
    .from("today_chores")
    .select("id, chore_date, child_checked_at, parent_confirmed_at")
    .eq("id", id)
    .maybeSingle();
  const failure = errorMessage(result.error);
  if (failure) {
    throw new Error(failure);
  }
  return choreFromRow(result.data, `chore ${id}`);
}

async function selectChoreByTitle(db: ParentDb, title: string): Promise<ChoreRow> {
  const result = await db
    .from("today_chores")
    .select("id, chore_date, child_checked_at, parent_confirmed_at")
    .eq("title", title)
    .maybeSingle();
  const failure = errorMessage(result.error);
  if (failure) {
    throw new Error(failure);
  }
  return choreFromRow(result.data, `chore ${title}`);
}

async function childIdByName(db: ParentDb, displayName: string): Promise<string> {
  const result = await db
    .from("profiles")
    .select("id, display_name")
    .eq("role", "child")
    .eq("display_name", displayName);
  const failure = errorMessage(result.error);
  if (failure) {
    throw new Error(failure);
  }
  if (!Array.isArray(result.data) || result.data.length === 0) {
    throw new Error(`child profile ${displayName} was not visible to the parent`);
  }
  return requiredString(asRecord(result.data[0], "child profile"), "id");
}

// Step the stored YYYY-MM-DD back one calendar day. Do not call warsawToday.
function previousCalendarDay(choreDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(calendarDay(choreDate));
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error("chore_date is not YYYY-MM-DD");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - 1);
  const nextYear = String(utc.getUTCFullYear()).padStart(4, "0");
  const nextMonth = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(utc.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function hasHeading(html: string, text: string): boolean {
  return new RegExp(`<h2\\b[^>]*>\\s*${text}\\s*</h2>`).test(html);
}

function hasUndoForm(html: string, choreId: string): boolean {
  return html.split("<form").some((form) => {
    const end = form.indexOf("</form>");
    const body = end === -1 ? form : form.slice(0, end);
    const postsUndo = /name="intent"[^>]*value="undo"/.test(body) || /value="undo"[^>]*name="intent"/.test(body);
    return postsUndo && body.includes(`value="${choreId}"`);
  });
}

test("sibling isolation, the done-rule, and the today boundary", async () => {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const parentEmail = `parent-${stamp}@example.com`;
  const childAEmail = `childa${stamp}@family.local`;
  const childBEmail = `childb${stamp}@family.local`;
  const nameA = `Ada ${stamp}`;
  const nameB = `Bea ${stamp}`;
  const titleA = `title-a-${stamp}`;
  const titleB = `title-b-${stamp}`;
  const titleOtherDay = `title-y-${stamp}`;

  const parent = createSession();
  const childA = createSession();
  const childB = createSession();

  const signup = await parent.request("/api/auth/signup", {
    method: "POST",
    form: { email: parentEmail, password: PASSWORD },
  });
  expectRedirect(signup, "/auth/confirm-email");

  const parentSignin = await parent.request("/api/auth/signin", {
    method: "POST",
    form: { email: parentEmail, password: PASSWORD },
  });
  expectRedirect(parentSignin, "/dashboard");

  const createdA = await parent.request("/api/family/children", {
    method: "POST",
    form: { display_name: nameA, email: childAEmail, password: PASSWORD },
  });
  expect(createdA.status).toBe(302);
  expect(locationPath(createdA.location)).toMatch(/^\/dashboard\?created=/);

  const createdB = await parent.request("/api/family/children", {
    method: "POST",
    form: { display_name: nameB, email: childBEmail, password: PASSWORD },
  });
  expect(createdB.status).toBe(302);
  expect(locationPath(createdB.location)).toMatch(/^\/dashboard\?created=/);

  const db = parentClient();
  const authResult = await db.auth.signInWithPassword({ email: parentEmail, password: PASSWORD });
  const authFailure = errorMessage(authResult.error);
  if (authFailure) {
    throw new Error(authFailure);
  }

  const childAId = await childIdByName(db, nameA);
  const childBId = await childIdByName(db, nameB);

  const childASignin = await childA.request("/api/auth/signin", {
    method: "POST",
    form: { email: childAEmail, password: PASSWORD },
  });
  expectRedirect(childASignin, "/dashboard");

  const childBSignin = await childB.request("/api/auth/signin", {
    method: "POST",
    form: { email: childBEmail, password: PASSWORD },
  });
  expectRedirect(childBSignin, "/dashboard");

  const addedA = await parent.request("/api/family/chores", {
    method: "POST",
    form: { title: titleA, child_profile_id: childAId },
  });
  expectRedirect(addedA, "/dashboard?added=1");

  const addedB = await parent.request("/api/family/chores", {
    method: "POST",
    form: { title: titleB, child_profile_id: childBId },
  });
  expectRedirect(addedB, "/dashboard?added=1");

  const choreA = await selectChoreByTitle(db, titleA);
  const choreB = await selectChoreByTitle(db, titleB);
  expect(choreA.id).not.toBe(choreB.id);

  const dashA = await childA.request("/dashboard");
  expect(dashA.status).toBe(200);
  expect(dashA.body).toContain(titleA);
  expect(dashA.body).not.toContain(titleB);

  const dashB = await childB.request("/dashboard");
  expect(dashB.status).toBe(200);
  expect(dashB.body).toContain(titleB);
  expect(dashB.body).not.toContain(titleA);

  const foreignCheck = await childB.request("/api/family/chore-check", {
    method: "POST",
    form: { chore_id: choreA.id, intent: "check" },
  });
  expect(foreignCheck.status).toBe(302);
  const foreignRow = await selectChore(db, choreA.id);
  expect(foreignRow.child_checked_at).toBeNull();

  const checkA = await childA.request("/api/family/chore-check", {
    method: "POST",
    form: { chore_id: choreA.id, intent: "check" },
  });
  expect(checkA.status).toBe(302);

  const parentWaiting = await parent.request("/dashboard");
  expect(parentWaiting.status).toBe(200);
  expect(parentWaiting.body).toContain("Waiting for confirmation");
  expect(parentWaiting.body).toContain(titleA);
  expect(hasHeading(parentWaiting.body, "Done")).toBe(false);

  const waitingRow = await selectChore(db, choreA.id);
  expect(waitingRow.child_checked_at).not.toBeNull();
  expect(waitingRow.parent_confirmed_at).toBeNull();

  const childChecked = await childA.request("/dashboard");
  expect(childChecked.status).toBe(200);
  expect(childChecked.body).toContain("Checked off");
  expect(childChecked.body).toContain(titleA);

  const confirm = await parent.request("/api/family/chore-confirm", {
    method: "POST",
    form: { chore_id: choreA.id },
  });
  expect(confirm.status).toBe(302);

  const parentDone = await parent.request("/dashboard");
  expect(parentDone.status).toBe(200);
  expect(hasHeading(parentDone.body, "Done")).toBe(true);
  expect(parentDone.body).toContain(titleA);
  expect(parentDone.body).not.toContain("Waiting for confirmation");

  const childDone = await childA.request("/dashboard");
  expect(childDone.status).toBe(200);
  expect(childDone.body).toContain("Checked off");
  expect(childDone.body).toContain(titleA);
  expect(hasUndoForm(childDone.body, choreA.id)).toBe(false);

  const confirmedRow = await selectChore(db, choreA.id);
  expect(confirmedRow.child_checked_at).not.toBeNull();
  expect(confirmedRow.parent_confirmed_at).not.toBeNull();
  if (confirmedRow.parent_confirmed_at === null) {
    throw new Error("parent_confirmed_at was null");
  }
  const storedConfirmedAt = confirmedRow.parent_confirmed_at;

  const confirmAgain = await parent.request("/api/family/chore-confirm", {
    method: "POST",
    form: { chore_id: choreA.id },
  });
  expect(confirmAgain.status).toBe(302);
  const confirmedAgain = await selectChore(db, choreA.id);
  expect(confirmedAgain.parent_confirmed_at).toBe(storedConfirmedAt);

  const addedOther = await parent.request("/api/family/chores", {
    method: "POST",
    form: { title: titleOtherDay, child_profile_id: childAId },
  });
  expectRedirect(addedOther, "/dashboard?added=1");

  const other = await selectChoreByTitle(db, titleOtherDay);
  const shifted = previousCalendarDay(other.chore_date);
  const patched = await db.from("today_chores").update({ chore_date: shifted }).eq("id", other.id).select("id");
  const patchFailure = errorMessage(patched.error);
  if (patchFailure) {
    throw new Error(patchFailure);
  }

  const moved = await selectChore(db, other.id);
  expect(moved.chore_date).toBe(shifted);

  const parentAfterMove = await parent.request("/dashboard");
  expect(parentAfterMove.status).toBe(200);
  expect(parentAfterMove.body).not.toContain(titleOtherDay);

  const childAfterMove = await childA.request("/dashboard");
  expect(childAfterMove.status).toBe(200);
  expect(childAfterMove.body).not.toContain(titleOtherDay);

  const lateCheck = await childA.request("/api/family/chore-check", {
    method: "POST",
    form: { chore_id: other.id, intent: "check" },
  });
  expect(lateCheck.status).toBe(302);
  const lateRow = await selectChore(db, other.id);
  expect(lateRow.child_checked_at).toBeNull();
}, 60_000);
