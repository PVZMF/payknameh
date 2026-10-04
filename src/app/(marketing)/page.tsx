import { COMMON_STRINGS } from "@/strings/common";

export default function HomePage() {
  return (
    <main>
      <h1>{COMMON_STRINGS.appName}</h1>
      <p>{COMMON_STRINGS.tagline}</p>
    </main>
  );
}
