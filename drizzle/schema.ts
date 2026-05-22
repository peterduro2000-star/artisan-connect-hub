import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow and role-based access.
 * Extends base template with artisan/client/admin roles.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  whatsappNumber: varchar("whatsappNumber", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["client", "artisan", "admin"]).default("client").notNull(),
  status: mysqlEnum("status", ["active", "suspended", "pending"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Service categories (Plumbing, Electrical, Carpentry, etc.)
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }), // Icon name or emoji
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Locations: Nigeria's three-tier geography (state, LGA, city/area)
 */
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  state: varchar("state", { length: 100 }).notNull(),
  lga: varchar("lga", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  area: varchar("area", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

/**
 * Artisan profiles: Professional information and portfolio
 */
export const artisanProfiles = mysqlTable("artisan_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  categoryId: int("categoryId").notNull(),
  bio: text("bio"),
  yearsExperience: int("yearsExperience"),
  state: varchar("state", { length: 100 }).notNull(),
  lga: varchar("lga", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  area: varchar("area", { length: 100 }),
  serviceAreas: text("serviceAreas"), // JSON: array of areas they serve
  startingPrice: decimal("startingPrice", { precision: 10, scale: 2 }),
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 500 }),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  approvalStatus: mysqlEnum("approvalStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArtisanProfile = typeof artisanProfiles.$inferSelect;
export type InsertArtisanProfile = typeof artisanProfiles.$inferInsert;

/**
 * Portfolio images: Artisan's work samples
 */
export const portfolioImages = mysqlTable("portfolio_images", {
  id: int("id").autoincrement().primaryKey(),
  artisanId: int("artisanId").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  caption: text("caption"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PortfolioImage = typeof portfolioImages.$inferSelect;
export type InsertPortfolioImage = typeof portfolioImages.$inferInsert;

/**
 * Service requests: Client job postings
 */
export const serviceRequests = mysqlTable("service_requests", {
  id: int("id").autoincrement().primaryKey(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 20 }).notNull(),
  clientWhatsapp: varchar("clientWhatsapp", { length: 20 }),
  categoryId: int("categoryId").notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  lga: varchar("lga", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  area: varchar("area", { length: 100 }),
  description: text("description").notNull(),
  urgency: mysqlEnum("urgency", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  budgetRange: varchar("budgetRange", { length: 100 }), // e.g., "5000-15000"
  status: mysqlEnum("status", ["open", "assigned", "completed", "cancelled"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Reports: Clients flagging suspicious profiles
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reportedArtisanId: int("reportedArtisanId").notNull(),
  reporterName: varchar("reporterName", { length: 255 }).notNull(),
  reporterPhone: varchar("reporterPhone", { length: 20 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["open", "investigating", "resolved", "dismissed"]).default("open").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Featured artisans: Admin-controlled placement on homepage and category pages
 */
export const featuredArtisans = mysqlTable("featured_artisans", {
  id: int("id").autoincrement().primaryKey(),
  artisanId: int("artisanId").notNull(),
  categoryId: int("categoryId"),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeaturedArtisan = typeof featuredArtisans.$inferSelect;
export type InsertFeaturedArtisan = typeof featuredArtisans.$inferInsert;

/**
 * Reviews: Future phase - client ratings and feedback
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  artisanId: int("artisanId").notNull(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  rating: int("rating").notNull(), // 1-5
  comment: text("comment"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
