import { eq, and, desc, asc, getTableColumns, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  type InsertArtisanProfile,
  type InsertPortfolioImage,
  type InsertServiceRequest,
  type InsertReport,
  type InsertContactEvent,
  users,
  categories,
  locations,
  artisanProfiles,
  portfolioImages,
  serviceRequests,
  reports,
  featuredArtisans,
  contactEvents,
  adminAuditLog,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, {
        max: 10,
        ssl: "require",
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _client = null;
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
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
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

export async function getUserBySupabaseAuthId(supabaseAuthId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.supabaseAuthId, supabaseAuthId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * upsertSupabaseUser syncs Supabase auth user to the local database.
 *
 * OPTIMIZATION: Only updates fields that have actually changed to reduce DB load.
 * Also throttles lastSignedIn updates to once per 24 hours for performance.
 *
 * @throws Database errors if insert/update fails
 */
export async function upsertSupabaseUser(input: {
  supabaseAuthId: string;
  email: string | null;
  name: string | null;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return undefined;
  }

  // Try to find existing user
  const existing = await getUserBySupabaseAuthId(input.supabaseAuthId);

  // For new users, do a full insert
  if (!existing) {
    const values = buildSupabaseUserValues(input);
    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.supabaseAuthId,
        set: {
          email: input.email,
          name: input.name,
          loginMethod: "email",
          lastSignedIn: values.lastSignedIn,
        },
      });
    return getUserBySupabaseAuthId(input.supabaseAuthId);
  }

  // For existing users, only update if email/name changed OR lastSignedIn is > 24h old
  const emailChanged = existing.email !== input.email;
  const nameChanged = existing.name !== input.name;
  const lastSignedInThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastSignedInStale = existing.lastSignedIn < lastSignedInThreshold;

  if (emailChanged || nameChanged || lastSignedInStale) {
    const updateSet: Record<string, unknown> = {};
    if (emailChanged) updateSet.email = input.email;
    if (nameChanged) updateSet.name = input.name;
    if (lastSignedInStale) updateSet.lastSignedIn = new Date();

    await db
      .update(users)
      .set(updateSet)
      .where(eq(users.supabaseAuthId, input.supabaseAuthId));
  }

  return getUserBySupabaseAuthId(input.supabaseAuthId);
}

export function buildSupabaseUserValues(input: {
  supabaseAuthId: string;
  email: string | null;
  name: string | null;
}): InsertUser {
  const openId = `supabase:${input.supabaseAuthId}`;

  return {
    openId,
    supabaseAuthId: input.supabaseAuthId,
    email: input.email,
    name: input.name,
    loginMethod: "email",
    lastSignedIn: new Date(),
  };
}

export async function updateUserRole(
  userId: number,
  role: "client" | "artisan" | "admin",
  audit?: {
    adminId: number;
    ipHash?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existingUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  await db.transaction(async tx => {
    await tx.update(users).set({ role }).where(eq(users.id, userId));

    if (audit && existingUser && existingUser.role !== role) {
      await tx.insert(adminAuditLog).values({
        adminId: audit.adminId,
        action: "update_user_role",
        targetType: "user",
        targetId: userId,
        oldValue: existingUser.role,
        newValue: role,
        ipHash: audit.ipHash,
      });
    }
  });
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
export async function createArtisanProfile(data: InsertArtisanProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(artisanProfiles).values(data);
  return result;
}

/**
 * getArtisanProfile fetches an artisan profile without authorization filtering.
 *
 * IMPORTANT: Authorization decisions must occur in the router/service layer:
 * - Public users: only view approved artisans
 * - Owners: view their own profile regardless of approval status
 * - Admins: view any profile
 *
 * This separation ensures authorization logic is centralized and not duplicated.
 */
export async function getArtisanProfile(artisanId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      ...getTableColumns(artisanProfiles),
      categoryName: categories.name,
      userId: artisanProfiles.userId,
    })
    .from(artisanProfiles)
    .innerJoin(categories, eq(artisanProfiles.categoryId, categories.id))
    .where(eq(artisanProfiles.id, artisanId))
    .limit(1);

  return result[0];
}

export async function getArtisanProfileInternal(artisanId: number) {
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

/**
 * getArtisanContact retrieves phone/WhatsApp for verified, approved artisans.
 *
 * BUSINESS RULE: Verification is a publishing requirement (see searchArtisans).
 * Contact details are only revealed for verified, approved artisans to ensure
 * clients connect with trusted professionals. This protects both parties.
 */
export async function getArtisanContact(artisanId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      phone: users.phone,
      whatsappNumber: users.whatsappNumber,
    })
    .from(artisanProfiles)
    .innerJoin(users, eq(artisanProfiles.userId, users.id))
    .where(
      and(
        eq(artisanProfiles.id, artisanId),
        eq(artisanProfiles.approvalStatus, "approved"),
        eq(artisanProfiles.verificationStatus, "verified"),
        eq(users.status, "active")
      )
    )
    .limit(1);

  return result[0];
}

export async function createContactEvent(data: InsertContactEvent) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log contact event: database not available");
    return;
  }

  await db.insert(contactEvents).values(data);
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

export async function updateArtisanProfile(
  artisanId: number,
  data: Partial<InsertArtisanProfile>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(artisanProfiles)
    .set(data)
    .where(eq(artisanProfiles.id, artisanId));
}

/**
 * searchArtisans returns verified, approved artisans.
 *
 * BUSINESS RULE: Verification is a publishing requirement, not just a trust badge.
 * Only verified artisans appear in search results to ensure quality and trust.
 * - Approval status controls administrative approval (pending/approved/rejected)
 * - Verification status controls public visibility (pending/verified/rejected)
 * - Both must be satisfied for public discovery
 */
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

  const conditions: SQL[] = [
    eq(artisanProfiles.approvalStatus, "approved"),
    eq(artisanProfiles.verificationStatus, "verified"),
    eq(users.status, "active"),
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
    .select(getTableColumns(artisanProfiles))
    .from(artisanProfiles)
    .innerJoin(users, eq(artisanProfiles.userId, users.id))
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

/**
 * getFeaturedArtisans returns featured artisans who are verified and approved.
 *
 * BUSINESS RULE: Verification is a publishing requirement (see searchArtisans).
 * Only verified, approved artisans can be featured to ensure quality.
 */
export async function getFeaturedArtisans(categoryId?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [
    eq(artisanProfiles.approvalStatus, "approved"),
    eq(artisanProfiles.verificationStatus, "verified"),
    eq(users.status, "active"),
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
    .innerJoin(users, eq(artisanProfiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(asc(featuredArtisans.displayOrder));
}

// ============= PORTFOLIO IMAGES =============
export async function addPortfolioImage(data: InsertPortfolioImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(portfolioImages).values(data);
}

export async function getPortfolioImages(
  artisanId: number,
  options: { approvedOnly?: boolean } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(portfolioImages.artisanId, artisanId)];
  if (options.approvedOnly) {
    conditions.push(eq(portfolioImages.status, "approved"));
  }

  return db
    .select()
    .from(portfolioImages)
    .where(and(...conditions));
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
export async function createServiceRequest(data: InsertServiceRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(serviceRequests).values(data);
}

export async function getServiceRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceRequests);
}

// ============= REPORTS =============
export async function createReport(data: InsertReport) {
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

  const profile = await db
    .select({ id: artisanProfiles.id })
    .from(artisanProfiles)
    .innerJoin(users, eq(artisanProfiles.userId, users.id))
    .where(
      and(
        eq(artisanProfiles.id, artisanId),
        eq(artisanProfiles.approvalStatus, "approved"),
        eq(artisanProfiles.verificationStatus, "verified"),
        eq(users.status, "active")
      )
    )
    .limit(1);

  if (!profile[0]) {
    throw new Error("Only active, approved, verified artisans can be featured");
  }

  await db.transaction(async tx => {
    await tx
      .delete(featuredArtisans)
      .where(eq(featuredArtisans.artisanId, artisanId));
    await tx.insert(featuredArtisans).values({ artisanId, categoryId });
    await tx
      .update(artisanProfiles)
      .set({ isFeatured: true })
      .where(eq(artisanProfiles.id, artisanId));
  });
}

export async function removeFeaturedArtisan(artisanId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async tx => {
    await tx
      .delete(featuredArtisans)
      .where(eq(featuredArtisans.artisanId, artisanId));
    await tx
      .update(artisanProfiles)
      .set({ isFeatured: false })
      .where(eq(artisanProfiles.id, artisanId));
  });
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
  await db.transaction(async tx => {
    await tx
      .delete(featuredArtisans)
      .where(eq(featuredArtisans.artisanId, artisanId));
    await tx
      .update(artisanProfiles)
      .set({
        approvalStatus: "rejected",
        rejectionReason: reason,
        isFeatured: false,
      })
      .where(eq(artisanProfiles.id, artisanId));
  });
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
