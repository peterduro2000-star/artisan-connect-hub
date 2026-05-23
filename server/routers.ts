import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";

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
    me: publicProcedure.query(opts => opts.ctx.user),
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
          name: z.string(),
          slug: z.string(),
          description: z.string().optional(),
          icon: z.string().optional(),
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
          state: z.string(),
          lga: z.string(),
          city: z.string(),
          area: z.string().optional(),
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
          businessName: z.string(),
          categoryId: z.number(),
          bio: z.string().optional(),
          yearsExperience: z.number().optional(),
          state: z.string(),
          lga: z.string(),
          city: z.string(),
          area: z.string().optional(),
          serviceAreas: z.string().optional(),
          startingPrice: z.number().optional(),
          profilePhotoUrl: z.string().optional(),
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
      .input(z.object({ id: z.number() }))
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
          businessName: z.string().optional(),
          bio: z.string().optional(),
          yearsExperience: z.number().optional(),
          state: z.string().optional(),
          lga: z.string().optional(),
          city: z.string().optional(),
          area: z.string().optional(),
          serviceAreas: z.string().optional(),
          startingPrice: z.number().optional(),
          profilePhotoUrl: z.string().optional(),
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
          categoryId: z.number().optional(),
          state: z.string().optional(),
          lga: z.string().optional(),
          city: z.string().optional(),
          limit: z.number().optional().default(20),
          offset: z.number().optional().default(0),
        })
      )
      .query(async ({ input }) => {
        return db.searchArtisans(input);
      }),

    getFeatured: publicProcedure
      .input(z.object({ categoryId: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getFeaturedArtisans(input.categoryId);
      }),
  }),

  // ============= PORTFOLIO IMAGES =============
  portfolio: router({
    upload: artisanProcedure
      .input(
        z.object({
          imageData: z.string(), // base64 or file data
          caption: z.string().optional(),
          fileName: z.string(),
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

        // Convert base64 to buffer if needed
        let buffer: Buffer;
        if (input.imageData.startsWith("data:")) {
          const base64Data = input.imageData.split(",")[1];
          buffer = Buffer.from(base64Data, "base64");
        } else {
          buffer = Buffer.from(input.imageData, "base64");
        }

        const fileKey = `portfolios/${profile.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, "image/jpeg");

        await db.addPortfolioImage({
          artisanId: profile.id,
          imageUrl: url,
          caption: input.caption,
          status: "pending",
        });

        return { success: true, url };
      }),

    getByArtisan: publicProcedure
      .input(z.object({ artisanId: z.number() }))
      .query(async ({ input }) => {
        return db.getPortfolioImages(input.artisanId);
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
          clientName: z.string(),
          clientPhone: z.string(),
          clientWhatsapp: z.string().optional(),
          categoryId: z.number(),
          state: z.string(),
          lga: z.string(),
          city: z.string(),
          area: z.string().optional(),
          description: z.string(),
          urgency: z.enum(["low", "medium", "high", "urgent"]),
          budgetRange: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createServiceRequest(input);
        return { success: true };
      }),

    list: publicProcedure.query(async () => {
      return db.getServiceRequests();
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
          reportedArtisanId: z.number(),
          reporterName: z.string(),
          reporterPhone: z.string(),
          reason: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createReport(input);
        return { success: true };
      }),

    list: adminProcedure.query(async () => {
      return db.getReports();
    }),

    updateStatus: adminProcedure
      .input(
        z.object({
          reportId: z.number(),
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
      .input(
        z.object({ artisanId: z.number(), categoryId: z.number().optional() })
      )
      .mutation(async ({ input }) => {
        await db.addFeaturedArtisan(input.artisanId, input.categoryId);
        return { success: true };
      }),

    remove: adminProcedure
      .input(z.object({ artisanId: z.number() }))
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
      .input(z.object({ artisanId: z.number() }))
      .mutation(async ({ input }) => {
        await db.approveArtisan(input.artisanId);
        return { success: true };
      }),

    rejectArtisan: adminProcedure
      .input(z.object({ artisanId: z.number(), reason: z.string() }))
      .mutation(async ({ input }) => {
        await db.rejectArtisan(input.artisanId, input.reason);
        return { success: true };
      }),

    verifyArtisan: adminProcedure
      .input(z.object({ artisanId: z.number() }))
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
