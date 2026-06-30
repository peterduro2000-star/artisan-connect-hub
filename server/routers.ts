import { COOKIE_NAME } from "@shared/const";
import { randomUUID } from "node:crypto";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import type { Session } from "@supabase/supabase-js";
import { storagePut } from "./storage";
import {
  enforceRateLimit,
  getClientIp,
  hashRateLimitIdentifier,
  RATE_LIMITS,
} from "./_core/rateLimit";
import { createSupabaseServerClient } from "./_core/supabaseAuth";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_IMAGE_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 128;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AUTH_ERROR_MESSAGE =
  "We could not complete that request. Please try again.";
const LOGIN_ERROR_MESSAGE = "Unable to sign in with those credentials.";

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

const publicFormRateLimitProcedure = ({
  key,
  points,
  durationMs,
}: {
  key: string;
  points: number;
  durationMs: number;
}) =>
  publicProcedure.use(({ ctx, next }) => {
    enforceRateLimit({
      key,
      identifiers: [getClientIp(ctx)],
      points,
      durationMs,
    });

    return next({ ctx });
  });

const serviceRequestProcedure = publicFormRateLimitProcedure({
  key: "service-request",
  ...RATE_LIMITS.serviceRequest,
});

const reportProcedure = publicFormRateLimitProcedure({
  key: "report",
  ...RATE_LIMITS.report,
});

const contactRevealProcedure = publicFormRateLimitProcedure({
  key: "contact-reveal",
  ...RATE_LIMITS.contactReveal,
});

const devEmailTestProcedure = publicFormRateLimitProcedure({
  key: "dev-email-test",
  ...RATE_LIMITS.devEmailTest,
});

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform(value => value.toLowerCase());
const authPasswordSchema = z.string().min(8).max(128);
const redirectUrlSchema = z.string().url().max(500);

function getSafeAuthSession(session: Session | null) {
  if (!session) return null;

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
}

function enforceAuthIpRateLimit({
  ctx,
  key,
  limit,
}: {
  ctx: TrpcContext;
  key: string;
  limit: { points: number; durationMs: number };
}) {
  enforceRateLimit({
    key,
    identifiers: [getClientIp(ctx)],
    ...limit,
  });
}

function enforceAuthEmailRateLimit({
  ctx,
  key,
  email,
  limit,
}: {
  ctx: TrpcContext;
  key: string;
  email: string;
  limit: { points: number; durationMs: number };
}) {
  enforceRateLimit({
    key,
    identifiers: [getClientIp(ctx), hashRateLimitIdentifier(email)],
    ...limit,
  });
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
  dev: router({
    sendSupabaseEmailTest: devEmailTestProcedure
      .input(
        z.object({
          email: emailSchema,
          emailRedirectTo: redirectUrlSchema.optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (ENV.isProduction) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Not found",
          });
        }

        const supabase = createSupabaseServerClient();
        const password = `${randomUUID()}Aa1!`;
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password,
          options: input.emailRedirectTo
            ? {
                emailRedirectTo: input.emailRedirectTo,
                data: { source: "dev-email-smoke-test" },
              }
            : { data: { source: "dev-email-smoke-test" } },
        });

        if (error) {
          console.warn("[dev] Supabase email smoke test failed", error.message);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unable to send test email. Please check email settings.",
          });
        }

        const identitiesCount = data.user?.identities?.length ?? 0;
        console.info("[dev] Supabase email smoke test accepted", {
          hasUser: Boolean(data.user),
          hasSession: Boolean(data.session),
          identitiesCount,
          confirmationSent:
            Boolean(data.user) && !data.session && identitiesCount > 0,
        });

        return {
          success: true,
          confirmationSent:
            Boolean(data.user) && !data.session && identitiesCount > 0,
        };
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts =>
      opts.ctx.user?.status === "active" ? opts.ctx.user : null
    ),
    login: publicProcedure
      .input(
        z.object({
          email: emailSchema,
          password: authPasswordSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        enforceAuthIpRateLimit({
          ctx,
          key: "auth-login",
          limit: RATE_LIMITS.login,
        });

        const supabase = createSupabaseServerClient();
        const { data, error } = await supabase.auth.signInWithPassword(input);

        if (error || !data.session) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: LOGIN_ERROR_MESSAGE,
          });
        }

        return {
          session: getSafeAuthSession(data.session),
        };
      }),
    signup: publicProcedure
      .input(
        z.object({
          email: emailSchema,
          password: authPasswordSchema,
          name: z.string().trim().max(120).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        enforceAuthIpRateLimit({
          ctx,
          key: "auth-signup",
          limit: RATE_LIMITS.signup,
        });

        const supabase = createSupabaseServerClient();
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              name: input.name || input.email.split("@")[0],
            },
          },
        });

        if (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: AUTH_ERROR_MESSAGE,
          });
        }

        return {
          session: getSafeAuthSession(data.session),
        };
      }),
    forgotPassword: publicProcedure
      .input(
        z.object({
          email: emailSchema,
          redirectTo: redirectUrlSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        enforceAuthEmailRateLimit({
          ctx,
          key: "auth-forgot-password",
          email: input.email,
          limit: RATE_LIMITS.forgotPassword,
        });

        try {
          const supabase = createSupabaseServerClient();
          const { error } = await supabase.auth.resetPasswordForEmail(
            input.email,
            {
              redirectTo: input.redirectTo,
            }
          );

          if (error) {
            console.warn(
              "[auth] forgot-password request failed",
              error.message
            );
          }
        } catch (error) {
          console.warn("[auth] forgot-password request failed", error);
        }

        return { success: true };
      }),
    resendConfirmation: publicProcedure
      .input(
        z.object({
          email: emailSchema,
          emailRedirectTo: redirectUrlSchema.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        enforceAuthEmailRateLimit({
          ctx,
          key: "auth-resend-confirmation",
          email: input.email,
          limit: RATE_LIMITS.resendConfirmation,
        });

        try {
          const supabase = createSupabaseServerClient();
          const { error } = await supabase.auth.resend({
            type: "signup",
            email: input.email,
            options: input.emailRedirectTo
              ? { emailRedirectTo: input.emailRedirectTo }
              : undefined,
          });

          if (error) {
            console.warn(
              "[auth] resend-confirmation request failed",
              error.message
            );
          }
        } catch (error) {
          console.warn("[auth] resend-confirmation request failed", error);
        }

        return { success: true };
      }),
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
          startingPrice: input.startingPrice?.toString(),
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

    getContact: contactRevealProcedure
      .input(
        z.object({
          id: idSchema,
          eventType: z.enum(["call", "whatsapp"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const contact = await db.getArtisanContact(input.id);
        if (!contact?.phone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Artisan contact is not available",
          });
        }

        const userAgent = ctx.req.headers["user-agent"];
        await db.createContactEvent({
          artisanId: input.id,
          userId: ctx.user?.id,
          eventType: input.eventType,
          ipHash: hashRateLimitIdentifier(getClientIp(ctx)),
          userAgent: typeof userAgent === "string" ? userAgent : undefined,
        });

        return contact;
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

        await db.updateArtisanProfile(profile.id, {
          ...input,
          startingPrice: input.startingPrice?.toString(),
        });
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
    create: serviceRequestProcedure
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
    create: reportProcedure
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
