import type { Metadata } from "next";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthForm, AuthLink } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
      </div>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
        footer={<AuthLink href="/login">Back to sign in</AuthLink>}
      />
    </div>
  );
}
