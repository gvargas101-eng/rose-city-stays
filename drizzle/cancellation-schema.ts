import { bigint, index, int, mysqlEnum, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

/** Unverified intake only. Never represents a provider cancellation or refund. */
export const cancellationRequests = mysqlTable("cancellation_requests", {
  id: int("id").autoincrement().primaryKey(),
  requestKey: varchar("requestKey", { length: 64 }).notNull().unique(),
  requestHash: varchar("requestHash", { length: 64 }).notNull(),
  activeRequestKey: varchar("activeRequestKey", { length: 64 }).unique(),
  reservationReference: varchar("reservationReference", { length: 128 }).notNull(),
  bookingEmail: varchar("bookingEmail", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  reason: text("reason").notNull(),
  acknowledgedAt: bigint("acknowledgedAt", { mode: "number" }).notNull(),
  requestedAt: bigint("requestedAt", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "declined", "resolved"]).notNull().default("pending"),
  reviewNotes: text("reviewNotes"),
  reviewedAt: bigint("reviewedAt", { mode: "number" }),
  reviewedBy: varchar("reviewedBy", { length: 128 }),
}, table => [index("cancellation_requests_status_time_idx").on(table.status, table.requestedAt)]);

/** One immutable snapshot per booking or pre-payment manual link; at least one key is required by the writer. */
export const bookingCancellationPolicies = mysqlTable("booking_cancellation_policies", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").unique(),
  manualLinkId: int("manualLinkId").unique(),
  policyId: varchar("policyId", { length: 128 }).notNull(),
  policyText: text("policyText").notNull(),
  acceptedAt: bigint("acceptedAt", { mode: "number" }),
  recordedAt: bigint("recordedAt", { mode: "number" }).notNull(),
});

/** Atomic durable fixed-window counters; hashed email/IP only, never raw IP. */
export const cancellationRequestLimits = mysqlTable("cancellation_request_limits", {
  bucketKey: varchar("bucketKey", { length: 64 }).primaryKey(),
  attempts: int("attempts").notNull().default(1),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
}, table => [index("cancellation_request_limits_expiry_idx").on(table.expiresAt)]);

export type CancellationRequest = typeof cancellationRequests.$inferSelect;
