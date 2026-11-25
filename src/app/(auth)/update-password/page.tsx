import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { updatePassword } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/forgot-password");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <AuthForm
        action={updatePassword}
        submitLabel="Update password"
        fields={[
          { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
          { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </div>
  );
}
