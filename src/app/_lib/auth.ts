import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Actor } from "@/domain/org/actor";
import { getEnv } from "@/env";
import { resolveSession } from "@/server/services/auth";

// Tech §7.3: the session cookie. Set only by Server Actions on the app domain and without a
// Domain attribute, so it never reaches the main or the short domain (Tech §2.3).
export const SESSION_COOKIE = "pk_session";

/** The signed-in host for this request, or null. Checked against the database every time. */
export async function getCurrentUser(): Promise<{ userId: string; sessionId: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? resolveSession(token) : null;
}

/**
 * The host actor for a panel page or Server Action (Tech §7.1). Without a valid session the
 * request ends here with a server-side redirect to the login page.
 */
export async function requireHost(): Promise<Extract<Actor, { type: "host" }>> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { type: "host", userId: user.userId };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Browsers keep Secure cookies on http://*.localhost, but not every local setup is a
    // secure context, so the flag is on everywhere except local.
    secure: getEnv().APP_ENV !== "local",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
