import { redirect } from "next/navigation";

/**
 * Stats moved onto the dashboard overview at `/`. Kept as a redirect so old
 * links and bookmarks still land somewhere useful.
 */
export default function StatsRedirectPage() {
  redirect("/");
}
