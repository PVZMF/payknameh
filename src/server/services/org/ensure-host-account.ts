import "server-only";
import { eq } from "drizzle-orm";
import type { PhoneE164 } from "@/domain/auth/phone";
import type { DbExecutor } from "@/server/db/client";
import { organizationMembers, organizations, users } from "@/server/db/schema";

/** MVP §5: the personal organization has no UI, so its name is never shown. */
const PERSONAL_ORGANIZATION_NAME = "Personal";

/**
 * Returns the User for a verified phone number. On first login it creates the User, their
 * personal Organization and the OWNER membership (MVP §5; phase 1 decision). Run it inside
 * the caller's transaction so the three rows appear together or not at all.
 */
export async function ensureHostAccount(
  phone: PhoneE164,
  tx: DbExecutor,
): Promise<{ userId: string; created: boolean }> {
  const [created] = await tx
    .insert(users)
    .values({ phoneE164: phone })
    .onConflictDoNothing({ target: users.phoneE164 })
    .returning({ id: users.id });

  if (created) {
    const [organization] = await tx
      .insert(organizations)
      .values({ name: PERSONAL_ORGANIZATION_NAME, type: "PERSONAL" })
      .returning({ id: organizations.id });
    if (!organization) throw new Error("organization insert returned no row");
    await tx
      .insert(organizationMembers)
      .values({ organizationId: organization.id, userId: created.id, role: "OWNER" });
    return { userId: created.id, created: true };
  }

  const [existing] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phoneE164, phone));
  if (!existing) throw new Error("user vanished between insert and select");
  return { userId: existing.id, created: false };
}
