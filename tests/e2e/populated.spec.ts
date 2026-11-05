import { expect, test, type Page } from "@playwright/test";

// Fixture: tests/fixtures/announcements (Fixture Alpha v0.1.0..v0.20.0, Fixture Beta v1.0.0).
const SITE = "https://news.repl.net";
const FEED_KEYS = ["date", "service", "summary", "title", "url", "version"];

async function entryDates(page: Page): Promise<number[]> {
  const values = await page
    .locator('[data-el="EL-101"] [data-field="date"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("datetime") ?? ""),
    );
  return values.map((value) => Date.parse(value));
}

function isNewestFirst(dates: number[]): boolean {
  return dates.every((date, index) => index === 0 || dates[index - 1]! >= date);
}

test.describe("SCR-101 Announcement List", () => {
  test("Populated: entries newest first with name, version, title, summary, date", async ({
    page,
  }) => {
    await page.goto("/");
    const entries = page.locator('[data-el="EL-101"] [data-entry]');
    await expect(page.locator('[data-el="EL-101-empty"]')).toHaveCount(0);
    await expect(entries).toHaveCount(20);
    expect(isNewestFirst(await entryDates(page))).toBe(true);

    const first = entries.first();
    await expect(first.locator('[data-field="service"]')).toHaveText(
      "Fixture Alpha",
    );
    await expect(first.locator('[data-field="version"]')).toHaveText("v0.20.0");
    await expect(first.locator('[data-field="title"]')).toHaveText(
      "Fixture Alpha title 20",
    );
    await expect(first.locator('[data-field="summary"]')).toHaveText(
      "Fixture Alpha summary 20",
    );
    await expect(first.locator('[data-field="date"]')).toHaveAttribute(
      "datetime",
      "2026-01-20T09:00:00Z",
    );
    // Fixture Beta (2026-01-10T12:00Z) sits between Alpha v0.11.0 and v0.10.0.
    await expect(entries.nth(10).locator('[data-field="service"]')).toHaveText(
      "Fixture Beta",
    );
  });

  test("AC-017: 21 announcements show 20 entries on page 1 and 1 entry on page 2", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('[data-el="EL-101"] [data-entry]')).toHaveCount(
      20,
    );
    const pagination = page.locator('[data-el="EL-102"] a');
    await expect(pagination).toHaveText(["1", "2"]);
    await pagination.filter({ hasText: "2" }).click();
    await expect(page).toHaveURL("/page/2/");
    const entries = page.locator('[data-el="EL-101"] [data-entry]');
    await expect(entries).toHaveCount(1);
    await expect(entries.locator('[data-field="version"]')).toHaveText(
      "v0.1.0",
    );
    await page.locator('[data-el="EL-102"] a').filter({ hasText: "1" }).click();
    await expect(page).toHaveURL("/");
  });

  test("EL-100 links filter by service", async ({ page }) => {
    await page.goto("/");
    const filter = page.locator('[data-el="EL-100"] a');
    await expect(filter).toHaveText(["All", "Fixture Alpha", "Fixture Beta"]);

    await filter.filter({ hasText: "Fixture Beta" }).click();
    await expect(page).toHaveURL("/fixture-beta/");
    const beta = page.locator('[data-el="EL-101"] [data-field="service"]');
    await expect(beta).toHaveText(["Fixture Beta"]);

    await page
      .locator('[data-el="EL-100"] a')
      .filter({ hasText: "Fixture Alpha" })
      .click();
    await expect(page).toHaveURL("/fixture-alpha/");
    const alpha = page.locator('[data-el="EL-101"] [data-field="service"]');
    await expect(alpha).toHaveCount(20);
    expect(new Set(await alpha.allTextContents())).toEqual(
      new Set(["Fixture Alpha"]),
    );
    expect(isNewestFirst(await entryDates(page))).toBe(true);
    // 20 matching announcements: EL-102 is shown only when more than 20 match.
    await expect(page.locator('[data-el="EL-102"]')).toHaveCount(0);

    await page
      .locator('[data-el="EL-100"] a')
      .filter({ hasText: "All" })
      .click();
    await expect(page).toHaveURL("/");
  });

  test("EL-101 entry click opens SCR-102 for that announcement", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('[data-el="EL-101"] [data-entry] a').first().click();
    await expect(page).toHaveURL("/fixture-alpha/v0.20.0/");
    await expect(
      page.locator('[data-el="EL-103"] [data-field="title"]'),
    ).toHaveText("Fixture Alpha title 20");
  });
});

test.describe("SCR-102 Announcement Detail", () => {
  test("AC-015: EL-103 shows every slot and the corrected date", async ({
    page,
  }) => {
    await page.goto("/fixture-beta/v1.0.0/");
    const content = page.locator('[data-el="EL-103"]');
    await expect(content.locator('[data-field="title"]')).toHaveText(
      "Fixture Beta title",
    );
    await expect(content.locator('[data-field="service"]')).toHaveText(
      "Fixture Beta",
    );
    await expect(content.locator('[data-field="version"]')).toHaveText(
      "v1.0.0",
    );
    await expect(content.locator('[data-field="date"]')).toHaveAttribute(
      "datetime",
      "2026-01-10T12:00:00Z",
    );
    await expect(content.locator('[data-field="corrected"]')).toHaveText(
      "2026-01-12",
    );
    await expect(content.locator('[data-field="summary"]')).toHaveText(
      "Fixture Beta summary",
    );
    await expect(content.locator('[data-field="body"] p')).toHaveText(
      "Fixture Beta body paragraph.",
    );
    await expect(content.locator('[data-field="body"] li')).toHaveText(
      "Fixture Beta list item",
    );
  });

  test("FR-035: corrected is absent when the announcement has none", async ({
    page,
  }) => {
    await page.goto("/fixture-alpha/v0.1.0/");
    await expect(
      page.locator('[data-el="EL-103"] [data-field="title"]'),
    ).toHaveText("Fixture Alpha title 01");
    await expect(page.locator('[data-field="corrected"]')).toHaveCount(0);
  });

  test("page metadata: og:title, og:description, og:url", async ({ page }) => {
    await page.goto("/fixture-beta/v1.0.0/");
    const meta = (property: string) =>
      page.locator(`meta[property="${property}"]`);
    await expect(meta("og:title")).toHaveAttribute(
      "content",
      "Fixture Beta title",
    );
    await expect(meta("og:description")).toHaveAttribute(
      "content",
      "Fixture Beta summary",
    );
    await expect(meta("og:url")).toHaveAttribute(
      "content",
      `${SITE}/fixture-beta/v1.0.0/`,
    );
  });

  test("EL-108 top back link is shown above EL-103", async ({ page }) => {
    await page.goto("/fixture-beta/v1.0.0/");
    const top = await page.locator('[data-el="EL-108"]').boundingBox();
    const content = await page.locator('[data-el="EL-103"]').boundingBox();
    expect(top).not.toBeNull();
    expect(content).not.toBeNull();
    expect(top!.y + top!.height).toBeLessThanOrEqual(content!.y);
    const bottom = await page.locator('[data-el="EL-107"]').boundingBox();
    expect(bottom!.y).toBeGreaterThan(content!.y + content!.height);
  });

  test("EL-108 top back link opens SCR-101 for all services", async ({
    page,
  }) => {
    await page.goto("/fixture-beta/v1.0.0/");
    await page.locator('[data-el="EL-108"]').click();
    await expect(page).toHaveURL("/");
    await expect(page.locator('[data-el="EL-101"] [data-entry]')).toHaveCount(
      20,
    );
  });

  test("EL-107 back link opens SCR-101 for all services", async ({ page }) => {
    await page.goto("/fixture-beta/v1.0.0/");
    await page.locator('[data-el="EL-107"]').click();
    await expect(page).toHaveURL("/");
    await expect(page.locator('[data-el="EL-101"] [data-entry]')).toHaveCount(
      20,
    );
  });
});

test.describe("newsroom feed", () => {
  test("contains every public announcement, newest first, with the six fields", async ({
    request,
  }) => {
    const response = await request.get("/feed.json");
    expect(response.status()).toBe(200);
    const feed = (await response.json()) as Record<string, string>[];
    expect(feed).toHaveLength(21);
    for (const entry of feed)
      expect(Object.keys(entry).sort()).toEqual(FEED_KEYS);
    expect(isNewestFirst(feed.map((entry) => Date.parse(entry.date!)))).toBe(
      true,
    );
    expect(feed[0]).toEqual({
      service: "Fixture Alpha",
      version: "v0.20.0",
      title: "Fixture Alpha title 20",
      summary: "Fixture Alpha summary 20",
      date: "2026-01-20T09:00:00Z",
      url: `${SITE}/fixture-alpha/v0.20.0/`,
    });
    expect(feed.find((entry) => entry.service === "Fixture Beta")).toEqual({
      service: "Fixture Beta",
      version: "v1.0.0",
      title: "Fixture Beta title",
      summary: "Fixture Beta summary",
      date: "2026-01-10T12:00:00Z",
      url: `${SITE}/fixture-beta/v1.0.0/`,
    });
  });
});

test("every internal link resolves under https://news.repl.net", async ({
  page,
  request,
}) => {
  const feed = (await (await request.get("/feed.json")).json()) as {
    url: string;
  }[];
  const queue = [
    "/",
    "/feed.json",
    ...feed.map((entry) => new URL(entry.url).pathname),
  ];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    if (path.endsWith(".json")) continue;
    await page.goto(path);
    // EL-104 and EL-105 point to X and LinkedIn by design (tests/e2e/share.spec.ts).
    const urls = await page
      .locator(
        "a[href]:not([data-el='EL-104'], [data-el='EL-105']), link[href], meta[property='og:url']",
      )
      .evaluateAll((nodes) =>
        nodes.map(
          (node) =>
            node.getAttribute("href") ?? node.getAttribute("content") ?? "",
        ),
      );
    for (const url of urls) {
      const resolved = new URL(url, `${SITE}${path}`);
      expect(resolved.origin, `${url} on ${path}`).toBe(SITE);
      queue.push(resolved.pathname);
    }
  }
  // 21 SCR-102, SCR-101 for all (2 pages) and 2 services, and the feed.
  expect(seen.size).toBe(26);
});
