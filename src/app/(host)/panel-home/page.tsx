import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/_lib/auth";

// The app domain's "/" (rewritten here by the proxy). The access decision is made on the
// server from the session in the database, never by a client-side redirect.
export const dynamic = "force-dynamic";

export default async function PanelHomePage(): Promise<never> {
  redirect((await getCurrentUser()) ? "/events" : "/login");
}
