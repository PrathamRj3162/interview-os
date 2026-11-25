import type { Metadata } from "next";
import { signUp } from "@/app/actions/auth";
import { AuthForm, AuthLink } from "@/components/auth/auth-form";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your free account</h1>
        <p className="mt-1 text-sm text-muted">No payment details, no subscription.</p>
      </div>
      <SetupNotice />
      <AuthForm
        action={signUp}
        disabled={!isSupabaseConfigured()}
        submitLabel="Create account"
        fields={[
          { name: "full_name", label: "Full name", type: "text", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
        ]}
        footer={
          <div className="space-y-2">
            <p>Already have an account? <AuthLink href="/login">Sign in</AuthLink></p>
            <p className="text-xs">
              By continuing you agree to the <AuthLink href="/terms">Terms</AuthLink> and{" "}
              <AuthLink href="/privacy">Privacy Policy</AuthLink>.
            </p>
          </div>
        }
      />
    </div>
  );
}
