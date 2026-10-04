import { formatNumber } from "@/domain/shared/digits";
import { COMMON_STRINGS } from "@/strings/common";
import { Button } from "@/ui/components/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 text-start">
      <h1 className="text-3xl font-bold">{COMMON_STRINGS.appName}</h1>
      <p className="text-muted-foreground">{COMMON_STRINGS.tagline}</p>
      <p className="font-medium">{COMMON_STRINGS.sessionsSample(formatNumber(2))}</p>
      <Button className="self-start">{COMMON_STRINGS.startCta}</Button>
    </main>
  );
}
