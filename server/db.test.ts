import { describe, expect, it } from "vitest";
import { buildSupabaseUserValues } from "./db";

describe("buildSupabaseUserValues", () => {
  it("persists the Supabase auth id used for profile sync lookups", () => {
    const authId = "2f2f5a67-c102-4ec6-bf07-2f1d2d80f6b9";

    const values = buildSupabaseUserValues({
      supabaseAuthId: authId,
      email: "new-user@example.com",
      name: "New User",
    });

    expect(values).toMatchObject({
      openId: `supabase:${authId}`,
      supabaseAuthId: authId,
      email: "new-user@example.com",
      name: "New User",
      loginMethod: "email",
    });
    expect(values.lastSignedIn).toBeInstanceOf(Date);
  });
});
