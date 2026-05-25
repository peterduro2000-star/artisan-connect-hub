import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "client",
  "artisan",
  "admin",
]);
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "pending",
]);
export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
]);
export const requestUrgencyEnum = pgEnum("request_urgency", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const serviceRequestStatusEnum = pgEnum("service_request_status", [
  "open",
  "assigned",
  "completed",
  "cancelled",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "investigating",
  "resolved",
  "dismissed",
]);

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

/**
 * Core user table backing auth flow and role-based access.
 * `openId` is kept during the Manus-to-Supabase transition. New Supabase auth
 * users will map through `supabaseAuthId` in the next auth migration slice.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  supabaseAuthId: uuid("supabase_auth_id").unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("client").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  ...timestamps,
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Service categories (Plumbing, Electrical, Carpentry, etc.)
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Locations: Nigeria's three-tier geography (state, LGA, city/area)
 */
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  state: varchar("state", { length: 100 }).notNull(),
  lga: varchar("lga", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  area: varchar("area", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

/**
 * Artisan profiles: Professional information and portfolio
 */
export const artisanProfiles = pgTable("artisan_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  bio: text("bio"),
  yearsExperience: integer("years_experience"),
  state: varchar("state", { length: 100 }).notNull(),
  lga: varchar("lga", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  area: varchar("area", { length: 100 }),
  serviceAreas: text("service_areas"),
  startingPrice: numeric("starting_price", { precision: 10, scale: 2 }),
  profilePhotoUrl: varchar("profile_photo_url", { length: 500 }),
  verificationStatus: verificationStatusEnum("verification_status")
    .default("pending")
    .notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  approvalStatus: moderationStatusEnum("approval_status")
    .default("pending")
    .notNull(),
  rejectionReason: text("rejection_reason"),
  ...timestamps,
});

export type ArtisanProfile = typeof artisanProfiles.$inferSelect;
export type InsertArtisanProfile = typeof artisanProfiles.$inferInsert;

/**
 * Portfolio images: Artisan's work samples
 */
export const portfolioImages = pgTable("portfolio_images", {
  id: serial("id").primaryKey(),
  artisanId: integer("artisan_id")
    .notNull()
    .references(() => artisanProfiles.id, { onDelete: "cascade" }),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  caption: text("caption"),
  status: moderationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortfolioImage = typeof portfolioImages.$inferSelect;
export type InsertPortfolioImage = typeof portfolioImages.$inferInsert;

/**
 * Service requests: Client job postings
 */
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }).notNull(),
  clientWhatsapp: varchar("client_whatsapp", { length: 20 }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  state: varchar("state", { length: 100 }).notNull(),
  lga: varchar("lga", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  area: varchar("area", { length: 100 }),
  description: text("description").notNull(),
  urgency: requestUrgencyEnum("urgency").default("medium").notNull(),
  budgetRange: varchar("budget_range", { length: 100 }),
  status: serviceRequestStatusEnum("status").default("open").notNull(),
  ...timestamps,
});

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Reports: Clients flagging suspicious profiles
 */
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reportedArtisanId: integer("reported_artisan_id")
    .notNull()
    .references(() => artisanProfiles.id, { onDelete: "cascade" }),
  reporterName: varchar("reporter_name", { length: 255 }).notNull(),
  reporterPhone: varchar("reporter_phone", { length: 20 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("open").notNull(),
  adminNotes: text("admin_notes"),
  ...timestamps,
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Featured artisans: Admin-controlled placement on homepage and category pages
 */
export const featuredArtisans = pgTable("featured_artisans", {
  id: serial("id").primaryKey(),
  artisanId: integer("artisan_id")
    .notNull()
    .references(() => artisanProfiles.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => categories.id),
  displayOrder: integer("display_order").default(0).notNull(),
  ...timestamps,
});

export type FeaturedArtisan = typeof featuredArtisans.$inferSelect;
export type InsertFeaturedArtisan = typeof featuredArtisans.$inferInsert;

/**
 * Reviews: Future phase - client ratings and feedback
 */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  artisanId: integer("artisan_id")
    .notNull()
    .references(() => artisanProfiles.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  status: moderationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
