// Pure helpers for SCR-101, SCR-102, and the newsroom feed.

export const PAGE_SIZE = 20;

export interface Announcement {
  /** `{slug}/{version}` from the Public Copy path. */
  id: string;
  service: string;
  version: string;
  title: string;
  summary: string;
  date: string;
}

export interface FeedEntry {
  service: string;
  version: string;
  title: string;
  summary: string;
  date: string;
  url: string;
}

export interface Service {
  slug: string;
  name: string;
}

export function slugOf(announcement: Pick<Announcement, "id">): string {
  return announcement.id.split("/")[0] ?? "";
}

/** Site-relative path of SCR-102 for an announcement. */
export function detailPath(base: string, announcement: Announcement): string {
  return `${base}${slugOf(announcement)}/${announcement.version}/`;
}

/** Site-relative path of SCR-101 page N for all services (slug undefined) or one service. */
export function listPath(
  base: string,
  slug: string | undefined,
  page: number,
): string {
  const root = slug === undefined ? base : `${base}${slug}/`;
  return page <= 1 ? root : `${root}page/${page}/`;
}

/** Newest first by `date`. */
export function sortNewestFirst<T extends Pick<Announcement, "date">>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

export function pageItems<T>(items: T[], page: number): T[] {
  return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

/** Distinct services, ordered by name. */
export function servicesOf(items: Announcement[]): Service[] {
  const bySlug = new Map<string, string>();
  for (const item of items) {
    if (!bySlug.has(slugOf(item))) bySlug.set(slugOf(item), item.service);
  }
  return [...bySlug]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function feedEntries(
  items: Announcement[],
  site: URL,
  base: string,
): FeedEntry[] {
  return sortNewestFirst(items).map((item) => ({
    service: item.service,
    version: item.version,
    title: item.title,
    summary: item.summary,
    date: item.date,
    url: new URL(detailPath(base, item), site).href,
  }));
}

/** X web intent (PRODUCT_SPEC External Systems): a post composer prefilled with text and URL. */
export function xIntentUrl(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

/** LinkedIn share URL (PRODUCT_SPEC External Systems): a share dialog for the given URL. */
export function linkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

/** EL-106: the SNS text followed by the announcement URL. */
export function copyText(text: string, url: string): string {
  return `${text} ${url}`;
}
