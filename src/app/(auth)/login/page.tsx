import type { Metadata } from "next";
import { signIn } from "@/app/actions/auth";
import { AuthForm, AuthLink } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNext } from "@/lib/validation/profile";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to continue your preparation.</p>
      </div>
      <SetupNotice />
      {sp.error && (
        <p role="alert" className="text-sm text-danger">
          That link is invalid or has expired. Please try again.
        </p>
      )}
      <AuthForm
        action={signIn}
        disabled={!isSupabaseConfigured()}
        hidden={{ next: safeNext(sp.next) }}
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
        footer={
          <div className="space-y-2">
            <p><AuthLink href="/forgot-password">Forgot your password?</AuthLink></p>
            <p>New here? <AuthLink href="/signup">Create a free account</AuthLink></p>
          </div>
        }
      />
    </div>
  );
}
