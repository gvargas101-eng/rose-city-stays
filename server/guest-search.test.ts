import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));
import { buildGuestSearchCondition, guestSearchPattern, searchGuestProfiles } from "./guest-search";
import { adminRouter } from "./routers/admin";

const dialect = new MySqlDialect();
const compile = (query: string) => dialect.sqlToQuery(buildGuestSearchCondition(query)!);
beforeEach(() => vi.clearAllMocks());

describe("private returning-guest matching", () => {
  it("normalizes lowercase, uppercase and mixed-case partial names identically", () => {
    expect(compile("jan")).toEqual(compile("JAN"));
    expect(compile("jan")).toEqual(compile("JaN"));
    expect(compile("jan").sql).toContain("LOWER(`guest_profiles`.`fullName`)");
    expect(compile("jan").params).toContain("%jan%");
  });
  it("matches separate first/last-name tokens without depending on word order", () => {
    const result = compile("  Smith \t Jane  ");
    expect(result.sql).toContain(" and ");
    expect(result.sql).toContain("LOWER(`guest_profiles`.`firstName`)");
    expect(result.sql).toContain("LOWER(`guest_profiles`.`lastName`)");
    expect(result.params).toEqual([...Array(5).fill("%smith%"), ...Array(5).fill("%jane%")]);
  });
  it("matches email fragments case-insensitively", () => {
    const result = compile("PERSON@EXAMPLE.TEST");
    expect(result.sql).toContain("LOWER(`guest_profiles`.`email`)");
    expect(result.params).toContain("%person@example.test%");
  });
  it("normalizes punctuation in phone searches without treating names containing digits as phones", () => {
    const result = compile("+1 (903) 555-0123");
    expect(result.sql).toContain("`guest_profiles`.`normalizedPhone`");
    expect(result.params).toContain("%19035550123%");
    expect(compile("Jane123").sql).not.toContain("normalizedPhone");
  });
  it("treats SQL wildcards and the chosen escape character literally", () => {
    expect(guestSearchPattern("a%_!b\\c")).toBe("%a!%!_!!b\\c%");
    const result = compile("_ % !");
    expect(result.sql).toContain("ESCAPE '!'");
    expect(result.params).toContain("%!_%");
    expect(result.params).toContain("%!%%");
    expect(result.params).toContain("%!!%");
  });
  it("binds apostrophes and SQL-looking input rather than interpolating it", () => {
    const result = compile("O'Neal");
    expect(result.sql).not.toContain("O'Neal");
    expect(result.params).toContain("%o'neal%");
  });
  it.each(["", " \t ", "a".repeat(121)])("rejects empty or oversized query %j", query => {
    expect(() => compile(query)).toThrow("between 1 and 120");
  });
  it("returns only safe contact fields and limits results to twelve", async () => {
    const rows = [{ id: 1, fullName: "Jane Example", email: null, phone: null }];
    const builder: any = {};
    for (const method of ["from", "where", "orderBy"]) builder[method] = vi.fn(() => builder);
    builder.limit = vi.fn().mockResolvedValue(rows);
    const select = vi.fn(() => builder);
    getDbMock.mockResolvedValue({ select });
    expect(await searchGuestProfiles("Jane")).toEqual(rows);
    expect(builder.limit).toHaveBeenCalledWith(12);
    expect(Object.keys(select.mock.calls[0][0])).toEqual(["id", "fullName", "email", "phone", "lastPropertySlug", "lastChannel", "totalReservations", "lastStayAt"]);
  });
  it("distinguishes an empty directory from a failed database query", async () => {
    const builder: any = {};
    for (const method of ["from", "where", "orderBy"]) builder[method] = () => builder;
    builder.limit = vi.fn().mockResolvedValue([]);
    getDbMock.mockResolvedValue({ select: () => builder });
    expect(await searchGuestProfiles("Jane")).toEqual([]);
    builder.limit.mockRejectedValue(new Error("synthetic database error"));
    await expect(searchGuestProfiles("Jane")).rejects.toThrow("synthetic database error");
    getDbMock.mockResolvedValue(null);
    await expect(searchGuestProfiles("Jane")).rejects.toThrow("directory is unavailable");
  });
  it.each([null, { role: "user" }])("does not let unauthenticated/nonadmin visitors search contacts", async user => {
    const caller = adminRouter.createCaller({ user, req: { headers: {} }, res: {} } as any);
    await expect(caller.searchGuestProfiles({ query: "Jane" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getDbMock).not.toHaveBeenCalled();
  });
});
