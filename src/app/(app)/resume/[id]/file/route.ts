import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";

/** Redirects the owner to a 60-second signed URL for their original file. Never a public URL. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { data: r } = await supabase.from("resumes").select("file_path, file_name").eq("id", id).maybeSingle();
  if (!r) return new NextResponse("Not found", { status: 404 });
  const { data } = await supabase.storage.from("resumes").createSignedUrl(r.file_path, 60, { download: r.file_name });
  if (!data?.signedUrl) return new NextResponse("Unavailable", { status: 503 });
  return NextResponse.redirect(data.signedUrl);
}
