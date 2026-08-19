import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

/**
 * Verifica que exista una sesión activa.
 * Devuelve false si no hay usuario autenticado.
 */
export async function requireUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Devuelve false si no hay sesión o si el perfil no tiene el rol requerido.
 */
export async function requireRole(roles: UserRole[]): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return !!profile && roles.includes(profile.role as UserRole);
}
