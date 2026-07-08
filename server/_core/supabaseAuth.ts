import { createClient } from "@supabase/supabase-js";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";

// ── Singleton client ──────────────────────────────────────────────────────────
// Created ONCE at module load — not on every request.
// All authenticated requests share this single instance.
let _supabaseClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseServerClient() {
  if (_supabaseClient) return _supabaseClient;

  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
  }

  _supabaseClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _supabaseClient;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/** Rejects obviously malformed tokens before making a Supabase network call.
 *  A valid JWT always has exactly 3 base64url segments separated by dots. */
function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function deriveDisplayName(
  userMeta: Record<string, unknown> | undefined,
  email: string | undefined
): string | null {
  if (typeof userMeta?.name === "string" && userMeta.name) return userMeta.name;
  if (typeof userMeta?.full_name === "string" && userMeta.full_name)
    return userMeta.full_name;
  return email?.split("@")[0] ?? null;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function authenticateSupabaseRequest(req: Request) {
  const token = getBearerToken(req);

  if (!token) {
    throw ForbiddenError("Missing access token");
  }

  // Short-circuit obviously malformed tokens before hitting Supabase
  if (!looksLikeJwt(token)) {
    throw ForbiddenError("Malformed access token");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw ForbiddenError("Invalid or expired access token");
  }

  const authUser = data.user;

  // ── User DB sync ──────────────────────────────────────────────────────────
  // PERFORMANCE NOTE: upsertSupabaseUser runs on every authenticated request.
  // TODO (post-launch): replace with db.findUserBySupabaseId() and only upsert
  // when the user is new or their name/email has changed. This will significantly
  // reduce DB load as your user base grows.
  let user: Awaited<ReturnType<typeof db.upsertSupabaseUser>>;

  try {
    user = await db.upsertSupabaseUser({
      supabaseAuthId: authUser.id,
      email: authUser.email ?? null,
      name: deriveDisplayName(authUser.user_metadata, authUser.email),
    });
  } catch (dbError) {
    // DB failure is a 500, not a 403 — don't mislead clients or yourself
    console.error("[Auth] DB user sync failed:", {
      supabaseId: authUser.id,
      path: req.path,
      error: dbError instanceof Error ? dbError.message : String(dbError),
      timestamp: new Date().toISOString(),
    });
    throw new Error("Authentication service temporarily unavailable");
  }

  if (!user) {
    throw ForbiddenError("User account not found");
  }

  return user;
}