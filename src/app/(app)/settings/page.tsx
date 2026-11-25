import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";
import { AiConsentForm, DeleteAccountForm, PublicProfileForm } from "@/components/profile/privacy-forms";
import Link from "next/link";
import { AppearanceForm } from "@/components/profile/appearance-form";
import { getPrefs } from "@/lib/prefs";
import { requireUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const [profile, prefs] = await Promise.all([getProfile(supabase, user.id), getPrefs()]);
  if (!profile?.onboarded_at) redirect("/onboarding");
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted">Signed in as {user.email}</p>
      </div>
      <section aria-labelledby="appearance-h">
        <h2 id="appearance-h" className="mb-4 text-lg font-medium">Appearance</h2>
        <Card><AppearanceForm theme={prefs.theme} vibe={prefs.vibe} /></Card>
      </section>
      <section aria-labelledby="profile-h">
        <h2 id="profile-h" className="mb-4 text-lg font-medium">Preparation profile</h2>
        <ProfileForm mode="settings" defaults={profile} />
      </section>
      <section aria-labelledby="privacy-h" className="space-y-4">
        <h2 id="privacy-h" className="text-lg font-medium">Privacy</h2>
        <Card><AiConsentForm initial={profile.ai_resume_consent} /></Card>
        <Card>
          <h3 className="mb-3 font-medium">Public profile</h3>
          <PublicProfileForm initial={{ is_public: Boolean(profile.is_public), public_handle: profile.public_handle ?? null, public_show_scores: profile.public_show_scores ?? true }} />
          {profile.is_public && profile.public_handle && <p className="mt-3 text-sm">Live at <Link href={`/u/${profile.public_handle}`} className="text-accent underline" data-testid="public-link">/u/{profile.public_handle}</Link></p>}
        </Card>
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
