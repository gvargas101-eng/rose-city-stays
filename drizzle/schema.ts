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
  houseRules: text("houseRules"),
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
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  taxRate: decimal("taxRate", { precision: 5, scale: 4 }).notNull().default("0.0900"), // e.g. 0.0900 = 9%
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),

  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 256 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 256 }),
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

/**
 * Site settings — key/value store for configurable site-wide settings.
 * Keys: "taxRate" (decimal string, e.g. "0.0900" for 9%), etc.
 */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;

/**
 * Custom fees — owner-defined line item fees shown in the booking quote.
 * Examples: extra guest fee, extra cleaning, pet fee, etc.
 * type: "flat" = fixed dollar amount, "percent" = percentage of nightly subtotal
 */
export const customFees = mysqlTable("custom_fees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),          // e.g. "Extra Guest Fee"
  description: text("description"),                          // optional note shown to guest
  type: mysqlEnum("type", ["flat", "percent"]).notNull().default("flat"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0.00"), // dollars or percent
  active: int("active").notNull().default(1),                // 1 = shown in quote, 0 = hidden
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomFee = typeof customFees.$inferSelect;
export type InsertCustomFee = typeof customFees.$inferInsert;

/**
 * Blog posts — SEO-optimized articles about Tyler, TX.
 * Can be written manually or auto-generated by the AI blog writer.
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  title: varchar("title", { length: 256 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featuredImage"),
  author: varchar("author", { length: 128 }).notNull().default("Rose City Stays"),
  category: varchar("category", { length: 64 }).notNull().default("Tyler, TX"),
  tags: text("tags"),                    // JSON array stored as string
  metaDescription: varchar("metaDescription", { length: 320 }),
  readTime: int("readTime").notNull().default(5),
  published: int("published").notNull().default(1),  // 1 = live, 0 = draft
  aiGenerated: int("aiGenerated").notNull().default(0), // 1 = written by AI
  newsContext: text("newsContext"),       // the news/events that inspired the post
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Corporate / Extended Stay Inquiries
 * Stores 30+ night stay requests from businesses and traveling professionals.
 */
export const corporateInquiries = mysqlTable("corporate_inquiries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  company: varchar("company", { length: 128 }),
  email: varchar("email", { length: 256 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  propertyPreference: varchar("propertyPreference", { length: 128 }),
  checkIn: varchar("checkIn", { length: 32 }),
  checkOut: varchar("checkOut", { length: 32 }),
  durationMonths: int("durationMonths"),
  guestCount: int("guestCount"),
  notes: text("notes"),
  status: varchar("status", { length: 32 }).notNull().default("new"), // new | contacted | booked | closed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CorporateInquiry = typeof corporateInquiries.$inferSelect;
export type InsertCorporateInquiry = typeof corporateInquiries.$inferInsert;
