import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateSupabaseRequest } from "./supabaseAuth";

// Distinguish WHY user is null — useful for protected procedures
// and for future audit logging
export type AuthState = "authenticated" | "unauthenticated" | "invalid_token";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authState: AuthState;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authState: AuthState = "unauthenticated";

  const hasAuthHeader = !!opts.req.headers.authorization;

  if (hasAuthHeader) {
    try {
      user = await authenticateSupabaseRequest(opts.req);
      authState = user ? "authenticated" : "invalid_token";
    } catch (error) {
      // Log failures for security visibility — don't silently drop them
      console.error("[Auth] Token validation failed:", {
        ip: opts.req.ip,
        path: opts.req.path,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      authState = "invalid_token";
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    authState,
  };
}