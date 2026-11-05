import type { APIRoute } from "astro";
import { feedEntries } from "../lib/announcements.ts";
import { loadAnnouncements, toAnnouncement } from "../lib/content.ts";

// Newsroom feed: every public announcement, newest first.
export const GET: APIRoute = async ({ site }) => {
  const all = (await loadAnnouncements()).map(toAnnouncement);
  const body = feedEntries(
    all,
    site ?? new URL("https://news.repl.net"),
    import.meta.env.BASE_URL,
  );
  return new Response(JSON.stringify(body, null, 2) + "\n", {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
