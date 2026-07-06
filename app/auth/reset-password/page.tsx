import { requireUser } from "@/lib/auth/session";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage() {
  await requireUser();
  return <ResetPasswordForm />;
}
