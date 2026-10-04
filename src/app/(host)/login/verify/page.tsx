import { redirect } from "next/navigation";
import { AuthCard } from "@/app/(host)/login/auth-card";
import { VerifyForm } from "@/app/(host)/login/verify/verify-form";
import { maskPhoneForDisplay } from "@/domain/auth/phone";
import { toPersianDigits } from "@/domain/shared/digits";
import { describeChallenge } from "@/server/services/auth";
import { AUTH_STRINGS } from "@/strings/auth";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const challengeId = (await searchParams).c ?? "";
  const challenge = await describeChallenge(challengeId);
  if (!challenge) redirect("/login");
  // Isolate the left-to-right number inside the Persian sentence (U+2066 … U+2069).
  const masked = `⁦${toPersianDigits(maskPhoneForDisplay(challenge.phone))}⁩`;
  return (
    <AuthCard title={AUTH_STRINGS.verifyTitle} intro={AUTH_STRINGS.verifyIntro(masked)}>
      <VerifyForm challengeId={challengeId} resendInSeconds={challenge.resendInSeconds} />
    </AuthCard>
  );
}
