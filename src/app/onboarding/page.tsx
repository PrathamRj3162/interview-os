import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile-data";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  const profile = await getProfile(supabase, user.id);
  if (profile?.onboarded_at) redirect("/dashboard");

  return (
    <div className="px-4">
      <header className="mx-auto flex max-w-4xl items-center py-5"><Logo href="/dashboard" /></header>
      <main className="mx-auto max-w-4xl pb-16">
        <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s build your preparation profile</h1>
        <p className="mt-1 mb-8 text-muted">Takes about a minute. You can change any of this later in Settings.</p>
        <ProfileForm
          mode="onboarding"
          defaults={{
            full_name: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "",
            target_role: profile?.target_role ?? null,
            experience_level: profile?.experience_level ?? null,
            company_track: profile?.company_track ?? null,
            target_companies: profile?.target_companies ?? [],
            preferred_language: profile?.preferred_language ?? null,
            daily_hours: profile?.daily_hours ?? null,
            deadline: profile?.deadline ?? null,
            dsa_level: profile?.dsa_level ?? null,
            system_design_level: profile?.system_design_level ?? null,
            learning_style: profile?.learning_style ?? null,
          }}
        />
      </main>
    </div>
  );
}
