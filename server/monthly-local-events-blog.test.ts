import { describe, expect, it } from "vitest";
import { getThreeMonthCoverage, htmlToReferenceText } from "./monthly-local-events-blog";

describe("monthly local events blog helpers", () => {
  it("covers the prior, current, and next calendar months", () => {
    const coverage = getThreeMonthCoverage(new Date("2026-09-14T14:00:00Z"));
    expect(coverage.label).toBe("August 2026–October 2026");
  });

  it("removes scripts and markup from fetched event references", () => {
    expect(htmlToReferenceText("<script>ignore()</script><h1>Tyler Arts Festival</h1><p>Sept. 19</p>"))
      .toBe("Tyler Arts Festival Sept. 19");
  });
});
