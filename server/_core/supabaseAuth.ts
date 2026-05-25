import { createClient } from "@supabase/supabase-js";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";

function getBearerToken(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function createSupabaseServerClient() {
  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required");
  }

  return createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function authenticateSupabaseRequest(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    throw ForbiddenError("Missing Supabase access token");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw ForbiddenError("Invalid Supabase access token");
  }

  const authUser = data.user;
  const name =
    typeof authUser.user_metadata?.name === "string"
      ? authUser.user_metadata.name
      : typeof authUser.user_metadata?.full_name === "string"
        ? authUser.user_metadata.full_name
        : authUser.email?.split("@")[0] ?? null;

  const user = await db.upsertSupabaseUser({
    supabaseAuthId: authUser.id,
    email: authUser.email ?? null,
    name,
  });

  if (!user) {
    throw ForbiddenError("User not found");
  }

  return user;
}
