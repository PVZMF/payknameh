import Link from "next/link";
import { AccountMenu } from "@/app/(host)/events/account-menu";
import type { ReactNode } from "react";
import { COMMON_STRINGS } from "@/strings/common";

/** Host panel frame (Tech §3.1: calm and predictable). */
export default function EventsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/events" className="font-bold">
            {COMMON_STRINGS.appName}
          </Link>
          <AccountMenu />
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
