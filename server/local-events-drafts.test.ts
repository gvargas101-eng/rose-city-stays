import { describe, expect, it } from "vitest";
import { estimateLocalEventsReadTime, toLocalEventsSlug } from "./local-events-drafts";

describe("local events draft helpers", () => {
  it("creates a stable search-friendly slug", () => {
    expect(toLocalEventsSlug("Tyler Events: August–October 2026!")).toBe("tyler-events-augustoctober-2026");
  });

  it("calculates a minimum three-minute reading time", () => {
    expect(estimateLocalEventsReadTime("A short event note.")).toBe(3);
  });
});
