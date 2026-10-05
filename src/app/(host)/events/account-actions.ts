"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, getCurrentUser } from "@/app/_lib/auth";
import { revokeAllSessions, revokeSession } from "@/server/services/auth";

/** Logs out of this device: the session is revoked on the server, not only forgotten. */
export async function logoutAction(): Promise<never> {
  const user = await getCurrentUser();
  if (user) await revokeSession(user.sessionId);
  await clearSessionCookie();
  redirect("/login");
}

/** Logs out of every device of this host (Tech §7.3). */
export async function logoutEverywhereAction(): Promise<never> {
  const user = await getCurrentUser();
  if (user) await revokeAllSessions(user.userId);
  await clearSessionCookie();
  redirect("/login");
}
