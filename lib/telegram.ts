import { createAdminClient } from "@/lib/supabase/admin";

interface TelegramConfig {
  token: string;
  chatId: string;
}

/**
 * Escapa caracteres especiales de HTML para usar datos dinámicos dentro
 * de mensajes Telegram con parse_mode: "HTML".
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return "—";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Obtiene la configuración de Telegram. Prioriza las variables de entorno
 * (server-only) y cae a la configuración guardada en company_settings.
 */
async function getTelegramConfig(): Promise<TelegramConfig | null> {
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    (await getCompanyTelegramConfig())?.telegram_token;
  const chatId =
    process.env.TELEGRAM_CHAT_ID ||
    (await getCompanyTelegramConfig())?.telegram_chat_id;

  if (!token || !chatId) return null;
  return { token, chatId };
}

async function getCompanyTelegramConfig(): Promise<{
  telegram_token: string | null;
  telegram_chat_id: string | null;
} | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("company_settings")
      .select("telegram_token, telegram_chat_id")
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return data;
  } catch (error) {
    console.error("Telegram config read failed:", error);
    return null;
  }
}

/**
 * Envía un mensaje al chat configurado. Nunca lanza errores: si Telegram
 * falla o no hay configuración, la operación continúa.
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  const config = await getTelegramConfig();
  if (!config) return;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          parse_mode: "HTML",
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) {
      console.error("Telegram sendMessage failed", response.status);
    }
  } catch (error) {
    console.error("Telegram send failed", error);
  }
}
