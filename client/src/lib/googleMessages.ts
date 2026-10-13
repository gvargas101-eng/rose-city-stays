export const GOOGLE_MESSAGES_WEB_URL = "https://messages.google.com/web/conversations";

/**
 * Google Messages for web has no public personal-account compose API or supported
 * URL parameters for a recipient/message. Copy the prepared text, then open the
 * paired web client so the host can choose the conversation and paste it.
 */
export async function openGoogleMessagesWithCopiedText(message: string) {
  const text = message.trim();
  if (!text) throw new Error("Message text is required");

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The web app can still be opened if clipboard access was blocked.
  }

  globalThis.open?.(GOOGLE_MESSAGES_WEB_URL, "_blank", "noopener,noreferrer");
}
