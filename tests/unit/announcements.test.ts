import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PAGE_SIZE,
  detailPath,
  feedEntries,
  listPath,
  pageCount,
  pageItems,
  servicesOf,
  slugOf,
  sortNewestFirst,
  type Announcement,
} from "../../src/lib/announcements.ts";

const item = (id: string, date: string, service = "Service"): Announcement => ({
  id,
  service,
  version: id.split("/")[1]!,
  title: `title ${id}`,
  summary: `summary ${id}`,
  date,
});

test("slugOf takes the directory of the Public Copy id", () => {
  assert.equal(slugOf(item("svc-a/v1.2.3", "2026-01-01T00:00:00Z")), "svc-a");
});

test("detailPath and listPath build SCR-102 and SCR-101 paths under base", () => {
  assert.equal(
    detailPath("/", item("svc-a/v1.2.3", "2026-01-01T00:00:00Z")),
    "/svc-a/v1.2.3/",
  );
  assert.equal(listPath("/", undefined, 1), "/");
  assert.equal(listPath("/", undefined, 2), "/page/2/");
  assert.equal(listPath("/", "svc-a", 1), "/svc-a/");
  assert.equal(listPath("/", "svc-a", 3), "/svc-a/page/3/");
});

test("sortNewestFirst orders by date across date-only and date-time values", () => {
  const sorted = sortNewestFirst([
    item("a/v1", "2026-01-01T09:00:00Z"),
    item("a/v3", "2026-01-03"),
    item("a/v2", "2026-01-02T23:59:59Z"),
  ]);
  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ["a/v3", "a/v2", "a/v1"],
  );
});

test("EL-102: 20 entries per page; one page when nothing matches", () => {
  assert.equal(PAGE_SIZE, 20);
  assert.equal(pageCount(0), 1);
  assert.equal(pageCount(20), 1);
  assert.equal(pageCount(21), 2);
  const items = Array.from({ length: 21 }, (_, index) => index);
  assert.equal(pageItems(items, 1).length, 20);
  assert.deepEqual(pageItems(items, 2), [20]);
});

test("servicesOf lists each slug once with its service name", () => {
  const services = servicesOf([
    item("beta/v1", "2026-01-01T00:00:00Z", "Beta"),
    item("alpha/v1", "2026-01-01T00:00:00Z", "Alpha"),
    item("alpha/v2", "2026-01-02T00:00:00Z", "Alpha"),
  ]);
  assert.deepEqual(services, [
    { slug: "alpha", name: "Alpha" },
    { slug: "beta", name: "Beta" },
  ]);
});

test("feedEntries: newest first with exactly service, version, title, summary, date, url", () => {
  const feed = feedEntries(
    [
      item("a/v1", "2026-01-01T00:00:00Z", "A"),
      item("b/v9", "2026-02-01T00:00:00Z", "B"),
    ],
    new URL("https://news.repl.net"),
    "/",
  );
  assert.deepEqual(feed, [
    {
      service: "B",
      version: "v9",
      title: "title b/v9",
      summary: "summary b/v9",
      date: "2026-02-01T00:00:00Z",
      url: "https://news.repl.net/b/v9/",
    },
    {
      service: "A",
      version: "v1",
      title: "title a/v1",
      summary: "summary a/v1",
      date: "2026-01-01T00:00:00Z",
      url: "https://news.repl.net/a/v1/",
    },
  ]);
});
