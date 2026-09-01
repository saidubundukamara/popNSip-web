import { redirect } from "next/navigation";

/** Analytics moved under Reports. Kept so an existing bookmark still lands. */
export default function AnalyticsRedirect() {
  redirect("/dashboard/reports");
}
