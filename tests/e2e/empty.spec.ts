import { expect, test } from "@playwright/test";

test("SCR-101 Empty state replaces EL-101 with a message slot", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-el="EL-101-empty"]')).toBeVisible();
  await expect(page.locator('[data-el="EL-101"]')).toHaveCount(0);
  await expect(page.locator('[data-el="EL-102"]')).toHaveCount(0);
  await expect(page.locator('[data-el="EL-100"] a')).toHaveText(["All"]);
});

test("the newsroom feed is an empty list", async ({ request }) => {
  const response = await request.get("/feed.json");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});
