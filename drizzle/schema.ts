import { bigint, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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
 * Properties table — stores all property details editable from the admin dashboard.
 */
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),          // e.g. "hollytree-golf-dining"
  name: varchar("name", { length: 256 }).notNull(),
  shortName: varchar("shortName", { length: 64 }).notNull(),
  type: varchar("type", { length: 32 }).notNull().default("House"),  // House, Townhouse, Condo, etc.
  guests: int("guests").notNull().default(4),
  bedrooms: int("bedrooms").notNull().default(2),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull().default("1.0"),
  description: text("description"),
  shortDescription: varchar("shortDescription", { length: 512 }),
  neighborhood: varchar("neighborhood", { length: 128 }),
  checkInTime: varchar("checkInTime", { length: 16 }).default("3:00 PM"),
  checkOutTime: varchar("checkOutTime", { length: 16 }).default("11:00 AM"),
  cancellationPolicy: text("cancellationPolicy"),
  hostawayListingId: int("hostawayListingId"),
  cleaningFee: decimal("cleaningFee", { precision: 8, scale: 2 }).notNull().default("125.00"),
  active: int("active").notNull().default(1),                        // 1 = visible, 0 = hidden
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Property photos — ordered list of photo URLs per property.
 */
export const propertyPhotos = mysqlTable("property_photos", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  url: text("url").notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyPhoto = typeof propertyPhotos.$inferSelect;

/**
 * Property amenities — list of amenity strings per property.
 */
export const propertyAmenities = mysqlTable("property_amenities", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  amenity: varchar("amenity", { length: 128 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type PropertyAmenity = typeof propertyAmenities.$inferSelect;

/**
 * Bookings table — tracks direct reservations made through the site.
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),

  propertyId: varchar("propertyId", { length: 64 }).notNull(),
  hostawayListingId: int("hostawayListingId").notNull(),

  guestName: varchar("guestName", { length: 256 }).notNull(),
  guestEmail: varchar("guestEmail", { length: 320 }).notNull(),
  guestPhone: varchar("guestPhone", { length: 32 }),
  guestCount: int("guestCount").notNull().default(1),

  checkIn: bigint("checkIn", { mode: "number" }).notNull(),
  checkOut: bigint("checkOut", { mode: "number" }).notNull(),
  nights: int("nights").notNull(),

  nightlyRate: decimal("nightlyRate", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  cleaningFee: decimal("cleaningFee", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),

  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  hostawayReservationId: varchar("hostawayReservationId", { length: 64 }),

  status: mysqlEnum("status", ["pending", "paid", "confirmed", "cancelled", "failed"])
    .default("pending")
    .notNull(),

  message: text("message"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Admin credentials — standalone password-based admin login (independent of Manus OAuth).
 * Only one row is needed (the site owner). Password is bcrypt-hashed.
 */
export const adminCredentials = mysqlTable("admin_credentials", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminCredential = typeof adminCredentials.$inferSelect;
