import { createClient } from "@supabase/supabase-js";

/** Admin client used ONLY by tests to set up/tear down users. */
export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function findUser(email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin().auth.admin.listUsers({ page, perPage: 200 });
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Makes sure the account exists and is email-confirmed (we can't click a real email link in CI). */
export async function ensureConfirmedUser(email: string, password: string, fullName: string) {
  const existing = await findUser(email);
  if (existing) {
    await admin().auth.admin.updateUserById(existing.id, { email_confirm: true });
    return existing.id;
  }
  const { data, error } = await admin().auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user.id;
}

/** Deletes a test user, its rows (FK cascade) and its private resume files (storage doesn't cascade). */
export async function deleteUserIfExists(email: string) {
  const u = await findUser(email);
  if (!u) return;
  const { data: files } = await admin().storage.from("resumes").list(u.id, { limit: 1000 });
  if (files?.length) await admin().storage.from("resumes").remove(files.map((f) => `${u.id}/${f.name}`));
  await admin().auth.admin.deleteUser(u.id);
}
