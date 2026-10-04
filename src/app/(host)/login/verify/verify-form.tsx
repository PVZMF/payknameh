"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { resendOtpAction, verifyOtpAction, type LoginFormState } from "@/app/(host)/login/actions";
import { toPersianDigits } from "@/domain/shared/digits";
import { AUTH_STRINGS } from "@/strings/auth";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

export function VerifyForm({
  challengeId,
  resendInSeconds,
}: {
  challengeId: string;
  resendInSeconds: number;
}) {
  const [verifyState, verify, verifying] = useActionState<LoginFormState, FormData>(
    verifyOtpAction,
    undefined,
  );
  const [resendState, resend, resending] = useActionState<LoginFormState, FormData>(
    resendOtpAction,
    undefined,
  );
  const [secondsLeft, setSecondsLeft] = useState(resendInSeconds);
  const error = verifyState?.error ?? resendState?.error;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <div className="flex flex-col gap-4">
      <form action={verify} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="challengeId" value={challengeId} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">{AUTH_STRINGS.codeLabel}</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            className="text-center text-lg tracking-[0.5em]"
            maxLength={6}
            required
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "code-error" : undefined}
          />
          {error && (
            <p id="code-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={verifying}>
          {verifying ? AUTH_STRINGS.verifying : AUTH_STRINGS.verify}
        </Button>
      </form>
      <form action={resend} className="flex items-center justify-between gap-2">
        <input type="hidden" name="challengeId" value={challengeId} />
        <Button
          type="submit"
          variant="link"
          className="px-0"
          disabled={secondsLeft > 0 || resending}
        >
          {secondsLeft > 0
            ? AUTH_STRINGS.resendIn(toPersianDigits(String(secondsLeft)))
            : AUTH_STRINGS.resend}
        </Button>
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {AUTH_STRINGS.changePhone}
        </Link>
      </form>
    </div>
  );
}
