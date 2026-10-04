"use client";

import { useActionState } from "react";
import { requestOtpAction, type LoginFormState } from "@/app/(host)/login/actions";
import { AUTH_STRINGS } from "@/strings/auth";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

export function PhoneForm() {
  const [state, action, pending] = useActionState<LoginFormState, FormData>(
    requestOtpAction,
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{AUTH_STRINGS.phoneLabel}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className="text-start"
          placeholder={AUTH_STRINGS.phonePlaceholder}
          required
          aria-invalid={state ? true : undefined}
          aria-describedby={state ? "phone-error" : undefined}
        />
        {state && (
          <p id="phone-error" role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? AUTH_STRINGS.sending : AUTH_STRINGS.sendCode}
      </Button>
    </form>
  );
}
