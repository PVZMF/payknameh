import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/_lib/auth";
import { AuthCard } from "@/app/(host)/login/auth-card";
import { PhoneForm } from "@/app/(host)/login/phone-form";
import { AUTH_STRINGS } from "@/strings/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/events");
  return (
    <AuthCard title={AUTH_STRINGS.loginTitle} intro={AUTH_STRINGS.loginIntro}>
      <PhoneForm />
    </AuthCard>
  );
}
