import type { ReactNode } from "react";

/** Calm, single-column card for the login steps; mobile first (Tech §3.1 host panel). */
export function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col gap-2 text-start">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{intro}</p>
      </div>
      {children}
    </main>
  );
}
