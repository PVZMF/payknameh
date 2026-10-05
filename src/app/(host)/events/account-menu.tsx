import { logoutAction, logoutEverywhereAction } from "@/app/(host)/events/account-actions";
import { AUTH_STRINGS } from "@/strings/auth";
import { Button } from "@/ui/components/button";

/** Small account menu in the panel header; native <details>, so it works without JavaScript. */
export function AccountMenu() {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm hover:bg-accent">
        {AUTH_STRINGS.account}
      </summary>
      <div className="absolute end-0 z-10 mt-1 flex min-w-48 flex-col gap-1 rounded-md border bg-background p-1 shadow-md">
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className="w-full justify-start">
            {AUTH_STRINGS.logout}
          </Button>
        </form>
        <form action={logoutEverywhereAction}>
          <Button type="submit" variant="ghost" className="w-full justify-start">
            {AUTH_STRINGS.logoutEverywhere}
          </Button>
        </form>
      </div>
    </details>
  );
}
