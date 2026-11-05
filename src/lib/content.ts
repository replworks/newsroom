import { getCollection, type CollectionEntry } from "astro:content";
import { sortNewestFirst, type Announcement } from "./announcements.ts";

export type AnnouncementEntry = CollectionEntry<"announcements">;

export function toAnnouncement(entry: AnnouncementEntry): Announcement {
  const { service, version, title, summary, date } = entry.data;
  return { id: entry.id, service, version, title, summary, date };
}

/** Every Public Copy, newest first. */
export async function loadAnnouncements(): Promise<AnnouncementEntry[]> {
  const entries = await getCollection("announcements");
  const order = sortNewestFirst(
    entries.map((entry) => ({ entry, date: entry.data.date })),
  );
  return order.map(({ entry }) => entry);
}
