import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Public Copies: `announcements/{slug}/{version}.md` (Announcement File minus `release_url`).
// NEWSROOM_ANNOUNCEMENTS_DIR points the build at fixture announcement files in tests.
const base = process.env.NEWSROOM_ANNOUNCEMENTS_DIR ?? "./announcements";

// Unquoted YAML timestamps parse as Date; keep every date as its ISO 8601 text.
const isoDateTime = z
  .union([z.string(), z.date()])
  .transform((value) =>
    typeof value === "string"
      ? value
      : value.toISOString().replace(/\.\d{3}Z$/, "Z"),
  );
const isoDate = z
  .union([z.string(), z.date()])
  .transform((value) =>
    typeof value === "string" ? value : value.toISOString().slice(0, 10),
  );

const announcements = defineCollection({
  loader: glob({
    pattern: "*/*.md",
    base,
    // Keep dots in versions (`v1.2.3`); the default id generator removes them.
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  // Strict: any field outside the Public Copy allow-list (e.g. `release_url`) fails the build.
  schema: z
    .object({
      service: z.string(),
      version: z.string(),
      title: z.string(),
      summary: z.string(),
      date: isoDateTime,
      corrected: isoDate.optional(),
      sns: z
        .object({ x: z.string(), linkedin: z.string() })
        .strict()
        .optional(),
    })
    .strict(),
});

export const collections = { announcements };
