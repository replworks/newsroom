import { test } from "node:test";
import assert from "node:assert/strict";
import {
  announcementFiles,
  parseFrontmatter,
} from "../../scripts/publish-to-project-home.mjs";

test("parses a Public Copy frontmatter allow-list", () => {
  const text = `---\nservice: Manual Press\nversion: v0.6.0\ntitle: 'Release: v0.6.0'\nsummary: 'A summary'\ndate: '2026-10-27T14:08:40Z'\nsns:\n  x: ''\n---\n\n# Body\n`;
  const data = parseFrontmatter(text);
  assert.equal(data!.service, "Manual Press");
  assert.equal(data!.title, "Release: v0.6.0");
  assert.equal(data!.date, "2026-10-27T14:08:40Z");
});

test("finds announcement files by slug and version", () => {
  const files = announcementFiles();
  assert.ok(
    files.some(
      (f: { slug: string; version: string }) =>
        f.slug === "manual-press" && f.version === "v0.6.0",
    ),
  );
});
