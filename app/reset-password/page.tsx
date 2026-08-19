import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = params.code;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return (
        <ResetPasswordForm error="El enlace ha expirado o no es válido. Solicita uno nuevo." />
      );
    }

    redirect("/reset-password");
  }

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
