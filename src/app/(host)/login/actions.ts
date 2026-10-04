"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { setSessionCookie } from "@/app/_lib/auth";
import { authErrorMessage } from "@/app/(host)/login/messages";
import { getEnv } from "@/env";
import { clientIpFrom } from "@/server/lib/client-ip";
import { requestOtp, resendOtp, verifyOtp } from "@/server/services/auth";

export type LoginFormState = { error: string } | undefined;

// Standards §2: every boundary input is parsed with zod; the services do the real checks.
const phoneSchema = z.object({ phone: z.string().max(40) });
const challengeSchema = z.object({ challengeId: z.uuid() });
const verifySchema = challengeSchema.extend({ code: z.string().max(20) });

async function clientIp(): Promise<string | null> {
  return clientIpFrom((await headers()).get("x-forwarded-for"), getEnv().TRUSTED_PROXY_HOPS);
}

export async function requestOtpAction(
  _previous: LoginFormState,
  form: FormData,
): Promise<LoginFormState> {
  const input = phoneSchema.safeParse({ phone: form.get("phone") });
  if (!input.success) return { error: authErrorMessage({ code: "PHONE_INVALID" }) };
  const result = await requestOtp({ phone: input.data.phone, ip: await clientIp() });
  if (!result.ok) return { error: authErrorMessage(result) };
  redirect(`/login/verify?c=${result.value.challengeId}`);
}

export async function verifyOtpAction(
  _previous: LoginFormState,
  form: FormData,
): Promise<LoginFormState> {
  const input = verifySchema.safeParse({
    challengeId: form.get("challengeId"),
    code: form.get("code"),
  });
  if (!input.success) return { error: authErrorMessage({ code: "OTP_INVALID" }) };
  const result = await verifyOtp(input.data);
  if (!result.ok) return { error: authErrorMessage(result) };
  await setSessionCookie(result.value.sessionToken, result.value.sessionExpiresAt);
  redirect("/events");
}

export async function resendOtpAction(
  _previous: LoginFormState,
  form: FormData,
): Promise<LoginFormState> {
  const input = challengeSchema.safeParse({ challengeId: form.get("challengeId") });
  if (!input.success) redirect("/login");
  const result = await resendOtp({ challengeId: input.data.challengeId, ip: await clientIp() });
  if (!result.ok) return { error: authErrorMessage(result) };
  redirect(`/login/verify?c=${result.value.challengeId}`);
}
