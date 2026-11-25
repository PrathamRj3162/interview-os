import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";
import { AiConsentForm, DeleteAccountForm } from "@/components/profile/privacy-forms";
import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarded_at) redirect("/onboarding");
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted">Signed in as {user.email}</p>
      </div>
      <section aria-labelledby="profile-h">
        <h2 id="profile-h" className="mb-4 text-lg font-medium">Preparation profile</h2>
        <ProfileForm mode="settings" defaults={profile} />
      </section>
      <section aria-labelledby="privacy-h" className="space-y-4">
        <h2 id="privacy-h" className="text-lg font-medium">Privacy</h2>
        <Card><AiConsentForm initial={profile.ai_resume_consent} /></Card>
        <Card className="border-danger/40">
          <h3 className="font-medium text-danger">Delete account</h3>
          <p className="mt-1 mb-4 text-sm text-muted">
            Permanently removes your account, profile, resumes, attempts, interviews and notes. This can&apos;t be undone.
          </p>
          <DeleteAccountForm />
        </Card>
      </section>
    </div>
  );
}
