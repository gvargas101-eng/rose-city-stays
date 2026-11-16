import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: vi.fn(async () => ({ select: mocks.select })) }));
const { propertiesRouter } = await import("./routers/properties");
const { PROPERTY_TO_HOSTAWAY_ID } = await import("./hostaway");
const dialect = new MySqlDialect();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.select.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ limit: mocks.limit, orderBy: mocks.orderBy });
  mocks.limit.mockResolvedValue([]);
  mocks.orderBy.mockResolvedValue([]);
});

describe("private property visibility", () => {
  it("requires active=1 when fetching any public property page, including direct URLs", async () => {
    const caller = propertiesRouter.createCaller({ user: null } as any);
    await expect(caller.bySlug({ slug: "alamo-crossing-retreat" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const query = dialect.sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(query.sql).toContain("`properties`.`active`");
    expect(query.params).toEqual(["alamo-crossing-retreat", 1]);
  });

  it("keeps published property pages accessible", async () => {
    mocks.limit.mockResolvedValue([{ id: 1, slug: "the-briar", active: 1 }]);
    const caller = propertiesRouter.createCaller({ user: null } as any);
    const result = await caller.bySlug({ slug: "the-briar" });
    expect(result.slug).toBe("the-briar");
    expect(result.photos).toEqual([]);
  });

  it("excludes unpublished properties from the public collection query", async () => {
    const caller = propertiesRouter.createCaller({ user: null } as any);
    expect(await caller.list()).toEqual([]);
    const query = dialect.sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(query.sql).toContain("`properties`.`active`");
    expect(query.params).toEqual([1]);
  });

  it("maps the new house to its own Hostaway listing, not the existing Alamo House", () => {
    expect(PROPERTY_TO_HOSTAWAY_ID["alamo-crossing-retreat"]).toBe(630308);
    expect(PROPERTY_TO_HOSTAWAY_ID["alamo-house"]).toBe(329644);
  });
});
