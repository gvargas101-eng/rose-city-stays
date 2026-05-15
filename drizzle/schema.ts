import { bigint, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Bookings table — tracks direct reservations made through the site.
 * Payment is processed via Stripe; reservation is created in Hostaway on success.
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),

  // Property info
  propertyId: varchar("propertyId", { length: 64 }).notNull(), // e.g. "hollytree-golf-dining"
  hostawayListingId: int("hostawayListingId").notNull(),

  // Guest info
  guestName: varchar("guestName", { length: 256 }).notNull(),
  guestEmail: varchar("guestEmail", { length: 320 }).notNull(),
  guestPhone: varchar("guestPhone", { length: 32 }),
  guestCount: int("guestCount").notNull().default(1),

  // Dates (stored as UTC midnight timestamps)
  checkIn: bigint("checkIn", { mode: "number" }).notNull(),  // Unix ms
  checkOut: bigint("checkOut", { mode: "number" }).notNull(), // Unix ms
  nights: int("nights").notNull(),

  // Pricing
  nightlyRate: decimal("nightlyRate", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  cleaningFee: decimal("cleaningFee", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),

  // Stripe
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),

  // Hostaway
  hostawayReservationId: varchar("hostawayReservationId", { length: 64 }),

  // Status
  status: mysqlEnum("status", ["pending", "paid", "confirmed", "cancelled", "failed"])
    .default("pending")
    .notNull(),

  // Special requests / notes
  message: text("message"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
