import { expect, test } from "@playwright/test";

// E2E against the published newsroom site (https://news.repl.net).
const SITE = "https://news.repl.net";
const FEED_KEYS = ["date", "service", "summary", "title", "url", "version"];

interface FeedEntry {
  service: string;
  version: string;
  title: string;
  summary: string;
  date: string;
  url: string;
}

async function loadFeed(request: import("@playwright/test").APIRequestContext) {
  const response = await request.get("/feed.json");
  expect(response.status()).toBe(200);
  expect(response.url()).toBe(`${SITE}/feed.json`);
  return (await response.json()) as FeedEntry[];
}

test("HTTP redirects to HTTPS", async ({ request }) => {
  const response = await request.get("http://news.repl.net/", {
    maxRedirects: 0,
  });
  expect([301, 308]).toContain(response.status());
  expect(response.headers()["location"]).toBe(`${SITE}/`);
});

test("newsroom feed: every entry has the six fields, newest first", async ({
  request,
}) => {
  const feed = await loadFeed(request);
  for (const entry of feed) {
    expect(Object.keys(entry).sort()).toEqual(FEED_KEYS);
    expect(entry.url.startsWith(`${SITE}/`)).toBe(true);
  }
  const dates = feed.map((entry) => Date.parse(entry.date));
  expect(
    dates.every((date, index) => index === 0 || dates[index - 1]! >= date),
  ).toBe(true);
});

test("SCR-101 matches the feed (Empty or Populated)", async ({
  page,
  request,
}) => {
  const feed = await loadFeed(request);
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  if (feed.length === 0) {
    await expect(page.locator('[data-el="EL-101-empty"]')).toBeVisible();
    await expect(page.locator('[data-el="EL-101"]')).toHaveCount(0);
    return;
  }
  const versions = page.locator(
    '[data-el="EL-101"] [data-entry] [data-field="version"]',
  );
  await expect(versions).toHaveText(
    feed.slice(0, 20).map((entry) => entry.version),
  );
});

test("SCR-102 of the newest published announcement", async ({
  page,
  request,
}) => {
  const feed = await loadFeed(request);
  test.skip(feed.length === 0, "no published announcement");
  const entry = feed[0]!;
  await page.goto(new URL(entry.url).pathname);
  const content = page.locator('[data-el="EL-103"]');
  await expect(content.locator('[data-field="title"]')).toHaveText(entry.title);
  await expect(content.locator('[data-field="service"]')).toHaveText(
    entry.service,
  );
  await expect(content.locator('[data-field="version"]')).toHaveText(
    entry.version,
  );
  await expect(content.locator('[data-field="summary"]')).toHaveText(
    entry.summary,
  );
  await expect(content.locator('[data-field="date"]')).toHaveAttribute(
    "datetime",
    entry.date,
  );
  const meta = (property: string) =>
    page.locator(`meta[property="${property}"]`);
  await expect(meta("og:title")).toHaveAttribute("content", entry.title);
  await expect(meta("og:description")).toHaveAttribute(
    "content",
    entry.summary,
  );
  await expect(meta("og:url")).toHaveAttribute("content", entry.url);
  await page.locator('[data-el="EL-107"]').click();
  await expect(page).toHaveURL(`${SITE}/`);
});
