import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <ResetPasswordForm error="El enlace ha expirado o no es válido. Solicita uno nuevo." />
    );
  }

  return <ResetPasswordForm />;
}
