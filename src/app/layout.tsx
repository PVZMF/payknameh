import type { Metadata } from "next";
import type { ReactNode } from "react";
import { COMMON_STRINGS } from "@/strings/common";

export const metadata: Metadata = {
  title: COMMON_STRINGS.appName,
  description: COMMON_STRINGS.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
