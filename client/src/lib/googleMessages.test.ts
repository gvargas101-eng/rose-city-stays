import { describe, expect, it, vi } from "vitest";
import { GOOGLE_MESSAGES_WEB_URL, openGoogleMessagesWithCopiedText } from "./googleMessages";

describe("Google Messages web sharing", () => {
  it("opens Google Messages web after copying the prepared message", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(globalThis.navigator, { clipboard: { writeText } });
    const open = vi.fn();
    Object.assign(globalThis, { open });

    await openGoogleMessagesWithCopiedText("  Hi Rose City guest  ");

    expect(writeText).toHaveBeenCalledWith("Hi Rose City guest");
    expect(open).toHaveBeenCalledWith(GOOGLE_MESSAGES_WEB_URL, "_blank", "noopener,noreferrer");
  });

  it("opens Google Messages web even if the browser blocks clipboard access", async () => {
    Object.assign(globalThis.navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) } });
    const open = vi.fn();
    Object.assign(globalThis, { open });

    await expect(openGoogleMessagesWithCopiedText("Hello")).resolves.toBeUndefined();
    expect(open).toHaveBeenCalledWith(GOOGLE_MESSAGES_WEB_URL, "_blank", "noopener,noreferrer");
  });
});
