import { eq, and, desc, asc, getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  categories,
  locations,
  artisanProfiles,
  portfolioImages,
  serviceRequests,
  reports,
  featuredArtisans,
  reviews,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = [
      "name",
      "email",
      "phone",
      "whatsappNumber",
      "loginMethod",
    ] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(
  userId: number,
  role: "client" | "artisan" | "admin"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ============= CATEGORIES =============
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isActive, true));
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
    .limit(1);
  return result[0];
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(categories).values(data);
}

// ============= LOCATIONS =============
export async function getLocationsByState(state: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locations).where(eq(locations.state, state));
}

export async function getLocationsByStateLga(state: string, lga: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(locations)
    .where(and(eq(locations.state, state), eq(locations.lga, lga)));
}

export async function createLocation(data: {
  state: string;
  lga: string;
  city: string;
  area?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(locations).values(data);
}

export async function getAllLocations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locations);
}

// ============= ARTISAN PROFILES =============
export async function createArtisanProfile(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(artisanProfiles).values(data);
  return result;
}

export async function getArtisanProfile(artisanId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      ...getTableColumns(artisanProfiles),
      phone: users.phone,
      whatsappNumber: users.whatsappNumber,
    })
    .from(artisanProfiles)
    .innerJoin(users, eq(artisanProfiles.userId, users.id))
    .where(eq(artisanProfiles.id, artisanId))
    .limit(1);

  return result[0];
}

export async function getArtisanProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(artisanProfiles)
    .where(eq(artisanProfiles.userId, userId))
    .limit(1);
  return result[0];
}

export async function updateArtisanProfile(artisanId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(artisanProfiles)
    .set(data)
    .where(eq(artisanProfiles.id, artisanId));
}

export async function searchArtisans(filters: {
  categoryId?: number;
  state?: string;
  lga?: string;
  city?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [
    eq(artisanProfiles.approvalStatus, "approved"),
    eq(artisanProfiles.verificationStatus, "verified"),
  ];

  if (filters.categoryId) {
    conditions.push(eq(artisanProfiles.categoryId, filters.categoryId));
  }
  if (filters.state) {
    conditions.push(eq(artisanProfiles.state, filters.state));
  }
  if (filters.lga) {
    conditions.push(eq(artisanProfiles.lga, filters.lga));
  }
  if (filters.city) {
    conditions.push(eq(artisanProfiles.city, filters.city));
  }

  let query = db
    .select()
    .from(artisanProfiles)
    .where(and(...conditions))
    .$dynamic();

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.offset(filters.offset);
  }

  return query.execute();
}

export async function getFeaturedArtisans(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(artisanProfiles.approvalStatus, "approved"),
    eq(artisanProfiles.verificationStatus, "verified"),
  ];

  if (categoryId) {
    conditions.push(eq(featuredArtisans.categoryId, categoryId));
  }

  return db
    .select({
      artisan: artisanProfiles,
      featured: featuredArtisans,
    })
    .from(featuredArtisans)
    .innerJoin(
      artisanProfiles,
      eq(featuredArtisans.artisanId, artisanProfiles.id)
    )
    .where(and(...conditions))
    .orderBy(asc(featuredArtisans.displayOrder));
}

// ============= PORTFOLIO IMAGES =============
export async function addPortfolioImage(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(portfolioImages).values(data);
}

export async function getPortfolioImages(artisanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(portfolioImages)
    .where(eq(portfolioImages.artisanId, artisanId));
}

export async function approvePortfolioImage(imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(portfolioImages)
    .set({ status: "approved" })
    .where(eq(portfolioImages.id, imageId));
}

// ============= SERVICE REQUESTS =============
export async function createServiceRequest(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(serviceRequests).values(data);
}

export async function getServiceRequests(filters?: any) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceRequests);
}

// ============= REPORTS =============
export async function createReport(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reports).values(data);
}

export async function getReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).orderBy(desc(reports.createdAt));
}

export async function updateReportStatus(
  reportId: number,
  status: "open" | "investigating" | "resolved" | "dismissed"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reports).set({ status }).where(eq(reports.id, reportId));
}

// ============= FEATURED ARTISANS =============
export async function addFeaturedArtisan(
  artisanId: number,
  categoryId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(featuredArtisans)
    .where(eq(featuredArtisans.artisanId, artisanId));
  await db.insert(featuredArtisans).values({ artisanId, categoryId });
  await db
    .update(artisanProfiles)
    .set({ isFeatured: true })
    .where(eq(artisanProfiles.id, artisanId));
}

export async function removeFeaturedArtisan(artisanId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(featuredArtisans)
    .where(eq(featuredArtisans.artisanId, artisanId));
  await db
    .update(artisanProfiles)
    .set({ isFeatured: false })
    .where(eq(artisanProfiles.id, artisanId));
}

// ============= ADMIN OPERATIONS =============
export async function getPendingArtisans() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(artisanProfiles)
    .where(eq(artisanProfiles.approvalStatus, "pending"))
    .orderBy(desc(artisanProfiles.createdAt));
}

export async function approveArtisan(artisanId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(artisanProfiles)
    .set({ approvalStatus: "approved" })
    .where(eq(artisanProfiles.id, artisanId));
}

export async function rejectArtisan(artisanId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(featuredArtisans)
    .where(eq(featuredArtisans.artisanId, artisanId));
  await db
    .update(artisanProfiles)
    .set({
      approvalStatus: "rejected",
      rejectionReason: reason,
      isFeatured: false,
    })
    .where(eq(artisanProfiles.id, artisanId));
}

export async function verifyArtisan(artisanId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(artisanProfiles)
    .set({ verificationStatus: "verified" })
    .where(eq(artisanProfiles.id, artisanId));
}

export async function getAllArtisans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(artisanProfiles);
}
