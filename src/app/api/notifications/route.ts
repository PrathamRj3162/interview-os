import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { buildNotifications } from "@/lib/notifications";

export async function GET() {
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [items, { data: prof }] = await Promise.all([
    buildNotifications(supabase),
    supabase.from("profiles").select("notifications_seen_at").eq("id", user.id).maybeSingle(),
  ]);
  const seen = prof?.notifications_seen_at ?? "1970-01-01T00:00:00Z";
  return NextResponse.json({ items: items.map((n) => ({ ...n, unread: n.at > seen })), unread: items.filter((n) => n.at > seen).length });
}

/** Mark everything as read. */
export async function POST() {
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await supabase.from("profiles").update({ notifications_seen_at: new Date().toISOString() }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
