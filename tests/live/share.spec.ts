import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// SCR-102 EL-104, EL-105, EL-106 and AC-013 against the published newsroom site.
// X and LinkedIn answer automated browsers with HTTP 403 (bot protection), so the new tab is
// checked by the share URL it opens; the composer and share dialog behind those URLs were
// observed in a signed-in browser (shipcast .replworks/observations/2026-11-06-share-endpoints.md).
const RELEASE_URL = /https?:\/\/github\.com\/[^\s"'<>]+\/releases\//;

interface FeedEntry {
  service: string;
  version: string;
  url: string;
}

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

async function feed(page: Page): Promise<FeedEntry[]> {
  const response = await page.request.get("/feed.json");
  expect(response.status()).toBe(200);
  return (await response.json()) as FeedEntry[];
}

/** The newest announcement whose SCR-102 shows a share button for `selector`. */
async function announcementWith(
  page: Page,
  selector: string,
): Promise<FeedEntry | undefined> {
  for (const entry of await feed(page)) {
    await page.goto(new URL(entry.url).pathname);
    if ((await page.locator(selector).count()) > 0) return entry;
  }
  return undefined;
}

/** URL of the first document request of the tab opened by clicking `selector`. */
async function openedUrl(
  context: BrowserContext,
  page: Page,
  selector: string,
): Promise<URL> {
  const [tab] = await Promise.all([
    context.waitForEvent("page"),
    page.locator(selector).click(),
  ]);
  const request = await tab.waitForEvent("request", (r) =>
    r.isNavigationRequest(),
  );
  const response = await request.response();
  // The boundary answered (any status, including its bot protection).
  expect(response).not.toBeNull();
  await tab.close();
  return new URL(request.url());
}

test("EL-104 opens the X composer in a new tab with sns.x and the announcement URL", async ({
  page,
  context,
}) => {
  const entry = await announcementWith(page, '[data-el="EL-104"]');
  test.skip(entry === undefined, "no published announcement with sns.x");
  const copy = await page
    .locator('[data-el="EL-106"][data-channel="x"]')
    .getAttribute("data-copy");
  const url = await openedUrl(context, page, '[data-el="EL-104"]');
  expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
  expect(url.searchParams.get("url")).toBe(entry!.url);
  const text = url.searchParams.get("text") ?? "";
  expect(text.startsWith(`[${entry!.service}] ${entry!.version} — `)).toBe(
    true,
  );
  expect(copy).toBe(`${text} ${entry!.url}`);
});

test("EL-105 opens the LinkedIn share dialog in a new tab for the announcement URL", async ({
  page,
  context,
}) => {
  const entry = await announcementWith(page, '[data-el="EL-105"]');
  test.skip(entry === undefined, "no published announcement with sns.linkedin");
  const url = await openedUrl(context, page, '[data-el="EL-105"]');
  expect(url.origin + url.pathname).toBe(
    "https://www.linkedin.com/sharing/share-offsite/",
  );
  expect(url.searchParams.get("url")).toBe(entry!.url);
});

test("EL-106 copies the SNS text followed by the announcement URL and confirms", async ({
  page,
}) => {
  const entry = await announcementWith(page, '[data-el="EL-106"]');
  test.skip(entry === undefined, "no published announcement with SNS text");
  const buttons = page.locator('[data-el="EL-106"]');
  for (let index = 0; index < (await buttons.count()); index += 1) {
    const button = buttons.nth(index);
    const expected = (await button.getAttribute("data-copy")) ?? "";
    expect(expected.endsWith(` ${entry!.url}`)).toBe(true);
    expect(
      expected.startsWith(`[${entry!.service}] ${entry!.version} — `),
    ).toBe(true);
    await button.click();
    await expect(button).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      expected,
    );
  }
});

test("AC-013: SCR-102 page source, SNS texts, and the feed contain no release URL", async ({
  page,
}) => {
  const response = await page.request.get("/feed.json");
  expect(await response.text()).not.toMatch(RELEASE_URL);
  for (const entry of await feed(page)) {
    const html = await (await page.request.get(entry.url)).text();
    expect(html, entry.url).not.toMatch(RELEASE_URL);
    expect(html, entry.url).not.toContain("release_url");
  }
});
