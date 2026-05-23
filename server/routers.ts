import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_IMAGE_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 128;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const idSchema = z.number().int().positive();
const shortTextSchema = z.string().trim().min(1).max(255);
const phoneSchema = z.string().trim().min(7).max(20);
const optionalShortTextSchema = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform(value => (value === "" ? undefined : value));
const optionalLongTextSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform(value => (value === "" ? undefined : value));
const locationTextSchema = z.string().trim().min(1).max(100);
const optionalLocationTextSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform(value => (value === "" ? undefined : value));
const moneySchema = z.number().nonnegative().max(100_000_000);

function parseImageUpload(imageData: string) {
  let contentType = "image/jpeg";
  let base64Data = imageData;

  if (imageData.startsWith("data:")) {
    const match = imageData.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid image data URL",
      });
    }
    contentType = match[1];
    base64Data = match[2];
  }

  if (!IMAGE_MIME_TYPES.has(contentType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only JPEG, PNG, and WebP images are allowed",
    });
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer.length || buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Image must be 5MB or smaller",
    });
  }

  return { buffer, contentType };
}

// ============= HELPER PROCEDURES =============
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

const artisanProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "artisan") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Artisan access required",
    });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts =>
      opts.ctx.user?.status === "active" ? opts.ctx.user : null
    ),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= CATEGORIES =============
  categories: router({
    list: publicProcedure.query(async () => {
      return db.getCategories();
    }),
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getCategoryBySlug(input.slug);
      }),
    create: adminProcedure
      .input(
        z.object({
          name: shortTextSchema,
          slug: z.string().trim().min(1).max(100),
          description: optionalLongTextSchema,
          icon: optionalShortTextSchema,
        })
      )
      .mutation(async ({ input }) => {
        await db.createCategory(input);
        return { success: true };
      }),
  }),

  // ============= LOCATIONS =============
  locations: router({
    getByState: publicProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        return db.getLocationsByState(input.state);
      }),
    getByStateLga: publicProcedure
      .input(z.object({ state: z.string(), lga: z.string() }))
      .query(async ({ input }) => {
        return db.getLocationsByStateLga(input.state, input.lga);
      }),
    getAll: publicProcedure.query(async () => {
      return db.getAllLocations();
    }),
    create: adminProcedure
      .input(
        z.object({
          state: locationTextSchema,
          lga: locationTextSchema,
          city: locationTextSchema,
          area: optionalLocationTextSchema,
        })
      )
      .mutation(async ({ input }) => {
        await db.createLocation(input);
        return { success: true };
      }),
  }),

  // ============= ARTISAN PROFILES =============
  artisans: router({
    register: protectedProcedure
      .input(
        z.object({
          businessName: shortTextSchema,
          categoryId: idSchema,
          bio: optionalLongTextSchema,
          yearsExperience: z.number().int().min(0).max(80).optional(),
          state: locationTextSchema,
          lga: locationTextSchema,
          city: locationTextSchema,
          area: optionalLocationTextSchema,
          serviceAreas: optionalLongTextSchema,
          startingPrice: moneySchema.optional(),
          profilePhotoUrl: z.string().url().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if artisan profile already exists
        const existing = await db.getArtisanProfileByUserId(ctx.user.id);
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Artisan profile already exists for this user",
          });
        }

        // Update user role to artisan
        await db.updateUserRole(ctx.user.id, "artisan");

        await db.createArtisanProfile({
          userId: ctx.user.id,
          ...input,
          approvalStatus: "pending",
        });

        return { success: true };
      }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return db.getArtisanProfileByUserId(ctx.user.id);
    }),

    getById: publicProcedure
      .input(z.object({ id: idSchema }))
      .query(async ({ ctx, input }) => {
        const profile = await db.getArtisanProfile(input.id);
        if (!profile) return undefined;

        const canView =
          profile.approvalStatus === "approved" ||
          ctx.user?.role === "admin" ||
          ctx.user?.id === profile.userId;

        if (!canView) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Artisan profile not found",
          });
        }

        return profile;
      }),

    update: artisanProcedure
      .input(
        z.object({
          businessName: shortTextSchema.optional(),
          bio: optionalLongTextSchema,
          yearsExperience: z.number().int().min(0).max(80).optional(),
          state: locationTextSchema.optional(),
          lga: locationTextSchema.optional(),
          city: locationTextSchema.optional(),
          area: optionalLocationTextSchema,
          serviceAreas: optionalLongTextSchema,
          startingPrice: moneySchema.optional(),
          profilePhotoUrl: z.string().url().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getArtisanProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Artisan profile not found",
          });
        }

        await db.updateArtisanProfile(profile.id, input);
        return { success: true };
      }),

    search: publicProcedure
      .input(
        z.object({
          categoryId: idSchema.optional(),
          state: locationTextSchema.optional(),
          lga: locationTextSchema.optional(),
          city: locationTextSchema.optional(),
          limit: z.number().int().min(1).max(50).optional().default(20),
          offset: z.number().int().min(0).max(1000).optional().default(0),
        })
      )
      .query(async ({ input }) => {
        return db.searchArtisans(input);
      }),

    getFeatured: publicProcedure
      .input(z.object({ categoryId: idSchema.optional() }))
      .query(async ({ input }) => {
        return db.getFeaturedArtisans(input.categoryId);
      }),
  }),

  // ============= PORTFOLIO IMAGES =============
  portfolio: router({
    upload: artisanProcedure
      .input(
        z.object({
          imageData: z.string().min(1).max(MAX_BASE64_IMAGE_CHARS),
          caption: optionalShortTextSchema,
          fileName: z.string().trim().min(1).max(120),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getArtisanProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Artisan profile not found",
          });
        }

        const { buffer, contentType } = parseImageUpload(input.imageData);

        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `portfolios/${profile.id}/${Date.now()}-${safeFileName}`;
        const { url } = await storagePut(fileKey, buffer, contentType);

        await db.addPortfolioImage({
          artisanId: profile.id,
          imageUrl: url,
          caption: input.caption,
          status: "pending",
        });

        return { success: true, url };
      }),

    getByArtisan: publicProcedure
      .input(z.object({ artisanId: idSchema }))
      .query(async ({ ctx, input }) => {
        const profile = await db.getArtisanProfile(input.artisanId);
        const canView =
          profile?.approvalStatus === "approved" ||
          ctx.user?.role === "admin" ||
          ctx.user?.id === profile?.userId;

        if (!profile || !canView) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Artisan profile not found",
          });
        }

        return db.getPortfolioImages(input.artisanId, {
          approvedOnly:
            ctx.user?.role !== "admin" && ctx.user?.id !== profile.userId,
        });
      }),

    getMyPortfolio: artisanProcedure.query(async ({ ctx }) => {
      const profile = await db.getArtisanProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getPortfolioImages(profile.id);
    }),
  }),

  // ============= SERVICE REQUESTS =============
  serviceRequests: router({
    create: publicProcedure
      .input(
        z.object({
          clientName: shortTextSchema,
          clientPhone: phoneSchema,
          clientWhatsapp: phoneSchema.optional(),
          categoryId: idSchema,
          state: locationTextSchema,
          lga: locationTextSchema,
          city: locationTextSchema,
          area: optionalLocationTextSchema,
          description: z.string().trim().min(10).max(2000),
          urgency: z.enum(["low", "medium", "high", "urgent"]),
          budgetRange: optionalShortTextSchema,
        })
      )
      .mutation(async ({ input }) => {
        await db.createServiceRequest(input);
        return { success: true };
      }),

    listForAdmin: adminProcedure.query(async () => {
      return db.getServiceRequests();
    }),
  }),

  // ============= REPORTS =============
  reports: router({
    create: publicProcedure
      .input(
        z.object({
          reportedArtisanId: idSchema,
          reporterName: shortTextSchema,
          reporterPhone: phoneSchema,
          reason: shortTextSchema,
          description: optionalLongTextSchema,
        })
      )
      .mutation(async ({ input }) => {
        const profile = await db.getArtisanProfile(input.reportedArtisanId);
        if (!profile || profile.approvalStatus !== "approved") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Artisan profile not found",
          });
        }

        await db.createReport(input);
        return { success: true };
      }),

    list: adminProcedure.query(async () => {
      return db.getReports();
    }),

    updateStatus: adminProcedure
      .input(
        z.object({
          reportId: idSchema,
          status: z.enum(["open", "investigating", "resolved", "dismissed"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateReportStatus(input.reportId, input.status);
        return { success: true };
      }),
  }),

  // ============= FEATURED ARTISANS =============
  featured: router({
    add: adminProcedure
      .input(z.object({ artisanId: idSchema, categoryId: idSchema.optional() }))
      .mutation(async ({ input }) => {
        await db.addFeaturedArtisan(input.artisanId, input.categoryId);
        return { success: true };
      }),

    remove: adminProcedure
      .input(z.object({ artisanId: idSchema }))
      .mutation(async ({ input }) => {
        await db.removeFeaturedArtisan(input.artisanId);
        return { success: true };
      }),
  }),

  // ============= ADMIN OPERATIONS =============
  admin: router({
    getPendingArtisans: adminProcedure.query(async () => {
      return db.getPendingArtisans();
    }),

    approveArtisan: adminProcedure
      .input(z.object({ artisanId: idSchema }))
      .mutation(async ({ input }) => {
        await db.approveArtisan(input.artisanId);
        return { success: true };
      }),

    rejectArtisan: adminProcedure
      .input(
        z.object({
          artisanId: idSchema,
          reason: z.string().trim().min(3).max(1000),
        })
      )
      .mutation(async ({ input }) => {
        await db.rejectArtisan(input.artisanId, input.reason);
        return { success: true };
      }),

    verifyArtisan: adminProcedure
      .input(z.object({ artisanId: idSchema }))
      .mutation(async ({ input }) => {
        await db.verifyArtisan(input.artisanId);
        return { success: true };
      }),

    getAllArtisans: adminProcedure.query(async () => {
      return db.getAllArtisans();
    }),
  }),
});

export type AppRouter = typeof appRouter;
