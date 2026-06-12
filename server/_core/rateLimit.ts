import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  points: number;
  durationMs: number;
  identifiers: string[];
};

const buckets = new Map<string, RateLimitBucket>();
const DEFAULT_MESSAGE = "Too many attempts. Please wait and try again.";

function readPositiveInt(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const RATE_LIMITS = {
  serviceRequest: {
    points: readPositiveInt("RATE_LIMIT_SERVICE_REQUEST_POINTS", 5),
    durationMs:
      readPositiveInt("RATE_LIMIT_SERVICE_REQUEST_WINDOW_MINUTES", 15) * 60_000,
  },
  report: {
    points: readPositiveInt("RATE_LIMIT_REPORT_POINTS", 3),
    durationMs:
      readPositiveInt("RATE_LIMIT_REPORT_WINDOW_MINUTES", 15) * 60_000,
  },
  login: {
    points: readPositiveInt("RATE_LIMIT_LOGIN_POINTS", 10),
    durationMs: readPositiveInt("RATE_LIMIT_LOGIN_WINDOW_MINUTES", 15) * 60_000,
  },
  signup: {
    points: readPositiveInt("RATE_LIMIT_SIGNUP_POINTS", 5),
    durationMs:
      readPositiveInt("RATE_LIMIT_SIGNUP_WINDOW_MINUTES", 60) * 60_000,
  },
  forgotPassword: {
    points: readPositiveInt("RATE_LIMIT_FORGOT_PASSWORD_POINTS", 3),
    durationMs:
      readPositiveInt("RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MINUTES", 60) * 60_000,
  },
  resendConfirmation: {
    points: readPositiveInt("RATE_LIMIT_RESEND_CONFIRMATION_POINTS", 3),
    durationMs:
      readPositiveInt("RATE_LIMIT_RESEND_CONFIRMATION_WINDOW_MINUTES", 60) *
      60_000,
  },
  devEmailTest: {
    points: readPositiveInt("RATE_LIMIT_DEV_EMAIL_TEST_POINTS", 3),
    durationMs:
      readPositiveInt("RATE_LIMIT_DEV_EMAIL_TEST_WINDOW_MINUTES", 15) * 60_000,
  },
} as const;

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export function hashRateLimitIdentifier(value: string) {
  return createHash("sha256").update(normalizeIdentifier(value)).digest("hex");
}

export function getClientIp(ctx: TrpcContext) {
  const forwardedFor = ctx.req.headers["x-forwarded-for"];
  const realIp = ctx.req.headers["x-real-ip"];

  const candidate = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]
      : typeof realIp === "string"
        ? realIp
        : ctx.req.socket?.remoteAddress;

  return normalizeIdentifier(candidate || "unknown");
}

export function enforceRateLimit(options: RateLimitOptions) {
  const now = Date.now();
  const identifiers = options.identifiers.map(normalizeIdentifier).join(":");
  const bucketKey = `${options.key}:${identifiers}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.durationMs,
    });
    return;
  }

  if (bucket.count >= options.points) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: DEFAULT_MESSAGE,
    });
  }

  bucket.count += 1;
}

export function clearRateLimitBucketsForTests() {
  buckets.clear();
}
