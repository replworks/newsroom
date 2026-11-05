import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// A Public Copy outside the allow-list fails the build, so the deploy step never runs
// and the previously published site remains (ARCHITECTURE.md Failure Boundaries, C12).
test("a Public Copy containing release_url fails astro build", () => {
  const root = mkdtempSync(join(tmpdir(), "newsroom-build-"));
  try {
    mkdirSync(join(root, "announcements", "svc"), { recursive: true });
    writeFileSync(
      join(root, "announcements", "svc", "v1.0.0.md"),
      [
        "---",
        "service: Svc",
        "version: v1.0.0",
        "release_url: https://example.invalid/release",
        "title: t",
        "summary: s",
        "date: '2026-01-01T00:00:00Z'",
        "---",
        "",
        "b",
        "",
      ].join("\n"),
    );
    const result = spawnSync("pnpm", ["exec", "astro", "build"], {
      env: {
        ...process.env,
        NEWSROOM_ANNOUNCEMENTS_DIR: join(root, "announcements"),
        NEWSROOM_OUT_DIR: join(root, "dist"),
      },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /release_url/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
