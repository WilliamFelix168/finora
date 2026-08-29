import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

/** Request-deduped profile lookup — safe to call from multiple components per render. */
export const getProfile = cache(async (userId: string) => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return profile ?? { id: userId, fullName: null, currency: "USD" };
});
