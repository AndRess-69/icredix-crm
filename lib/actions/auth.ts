"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cacheInvalidate, withCache } from "@/lib/cache";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

/**
 * Inicia sesión con email y contraseña.
 */
export async function loginAction(
  values: LoginFormValues
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      error: "Credenciales incorrectas. Verifica tu correo y contraseña.",
    };
  }

  cacheInvalidate("svc");
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Cierra la sesión del usuario actual.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  cacheInvalidate("svc");
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Obtiene el perfil del usuario autenticado.
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return withCache(`svc:profile:${user.id}`, async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return profile;
  });
}
