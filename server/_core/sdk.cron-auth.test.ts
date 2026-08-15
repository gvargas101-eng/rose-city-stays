import type { Request } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sdk } from "./sdk";

describe("SDK cron authentication", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a signed scheduler session from the x-manus-user-session header", async () => {
    const token = await sdk.signSession({
      openId: "cron_guest-sync",
      appId: "test-app",
      name: "Scheduled Task",
    });
    vi.spyOn(sdk, "getUserInfoWithJwt").mockResolvedValue({
      openId: "cron_guest-sync",
      name: "Scheduled Task",
      taskUid: "ECFPwVM5wSgP9eSuPsA8Ku",
    } as any);

    const user = await sdk.authenticateRequest({
      headers: { "x-manus-user-session": token },
    } as Request);

    expect(user.isCron).toBe(true);
    expect(user.taskUid).toBe("ECFPwVM5wSgP9eSuPsA8Ku");
  });
});
