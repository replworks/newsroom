import { expect, test, type Page } from "@playwright/test";

// SCR-102 EL-104, EL-105, EL-106 against the fixture build. The share targets are routed to a
// stub here so that no request leaves the machine; the live boundary is covered in tests/live.
const SITE = "https://news.repl.net";
const BETA_URL = `${SITE}/fixture-beta/v1.0.0/`;
const BETA_X = "[Fixture Beta] v1.0.0 — Fixture X text";
const BETA_LINKEDIN = "[Fixture Beta] v1.0.0 — Fixture LinkedIn text";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test.beforeEach(async ({ context }) => {
  for (const pattern of ["https://x.com/**", "https://www.linkedin.com/**"])
    await context.route(pattern, (route) =>
      route.fulfill({ contentType: "text/html", body: "<p>stub</p>" }),
    );
});

async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

test("EL-104 opens the X composer in a new tab with sns.x and the announcement URL", async ({
  page,
  context,
}) => {
  await page.goto("/fixture-beta/v1.0.0/");
  const [tab] = await Promise.all([
    context.waitForEvent("page"),
    page.locator('[data-el="EL-104"]').click(),
  ]);
  await tab.waitForLoadState();
  const url = new URL(tab.url());
  expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
  expect(url.searchParams.get("text")).toBe(BETA_X);
  expect(url.searchParams.get("url")).toBe(BETA_URL);
  expect(page.url()).toContain("/fixture-beta/v1.0.0/");
});

test("EL-105 opens the LinkedIn share dialog in a new tab for the announcement URL", async ({
  page,
  context,
}) => {
  await page.goto("/fixture-beta/v1.0.0/");
  const [tab] = await Promise.all([
    context.waitForEvent("page"),
    page.locator('[data-el="EL-105"]').click(),
  ]);
  await tab.waitForLoadState();
  const url = new URL(tab.url());
  expect(url.origin + url.pathname).toBe(
    "https://www.linkedin.com/sharing/share-offsite/",
  );
  expect(url.searchParams.get("url")).toBe(BETA_URL);
});

test("EL-106 copies each SNS text followed by the announcement URL and confirms", async ({
  page,
}) => {
  await page.goto("/fixture-beta/v1.0.0/");
  const buttons = page.locator('[data-el="EL-106"]');
  await expect(buttons).toHaveCount(2);

  const x = buttons.and(page.locator('[data-channel="x"]'));
  const confirmation = await page.evaluate(
    () => document.querySelector('[data-el="EL-106"]')?.textContent ?? "",
  );
  await x.click();
  await expect(x).toHaveText("Copied");
  expect(await readClipboard(page)).toBe(`${BETA_X} ${BETA_URL}`);
  expect(confirmation).not.toBe("Copied");

  const linkedin = buttons.and(page.locator('[data-channel="linkedin"]'));
  await expect(linkedin).not.toHaveText("Copied");
  await linkedin.click();
  await expect(linkedin).toHaveText("Copied");
  expect(await readClipboard(page)).toBe(`${BETA_LINKEDIN} ${BETA_URL}`);
});

test("AC-016: empty sns.x and sns.linkedin show no EL-104, EL-105, EL-106", async ({
  page,
}) => {
  await page.goto("/fixture-alpha/v0.1.0/");
  await expect(page.locator('[data-el="EL-103"]')).toBeVisible();
  await expect(page.locator('[data-el="EL-104"]')).toHaveCount(0);
  await expect(page.locator('[data-el="EL-105"]')).toHaveCount(0);
  await expect(page.locator('[data-el="EL-106"]')).toHaveCount(0);
});

test("EL-105 is absent when only sns.linkedin is empty", async ({ page }) => {
  await page.goto("/fixture-alpha/v0.2.0/");
  await expect(page.locator('[data-el="EL-104"]')).toHaveCount(1);
  await expect(page.locator('[data-el="EL-105"]')).toHaveCount(0);
  await expect(page.locator('[data-el="EL-106"]')).toHaveCount(1);
  await expect(page.locator('[data-el="EL-106"]')).toHaveAttribute(
    "data-channel",
    "x",
  );
});

test("EL-104 is absent when only sns.x is empty", async ({ page }) => {
  await page.goto("/fixture-alpha/v0.3.0/");
  await expect(page.locator('[data-el="EL-104"]')).toHaveCount(0);
  await expect(page.locator('[data-el="EL-105"]')).toHaveCount(1);
  await expect(page.locator('[data-el="EL-106"]')).toHaveCount(1);
  await expect(page.locator('[data-el="EL-106"]')).toHaveAttribute(
    "data-channel",
    "linkedin",
  );
});
