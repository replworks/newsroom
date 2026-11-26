// Publishes newsroom announcements to Project Home's /publish endpoint.
// No new dependencies: Node 24 built-in fetch and a small frontmatter parser
// for the Public Copy allow-list fields.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const announcementsDir = path.join(root, "announcements");

/** @returns {Record<string, string> | null} */
export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1).replace(/''/g, "'").replace(/\\"/g, '"');
    }
    out[key] = value;
  }
  return out;
}

/** @returns {Array<{slug: string; version: string; path: string}>} */
export function announcementFiles() {
  const files = [];
  for (const slug of readdirSync(announcementsDir, { withFileTypes: true })) {
    if (!slug.isDirectory()) continue;
    for (const file of readdirSync(path.join(announcementsDir, slug.name))) {
      if (!file.endsWith(".md")) continue;
      files.push({
        slug: slug.name,
        version: file.slice(0, -3),
        path: path.join(announcementsDir, slug.name, file),
      });
    }
  }
  return files;
}

function itemsFor(productMap) {
  const items = [];
  for (const file of announcementFiles()) {
    const product = productMap[file.slug];
    if (!product) continue;
    const text = readFileSync(file.path, "utf8");
    const data = parseFrontmatter(text);
    if (!data?.title) continue;
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
    items.push({
      product,
      item: {
        external_id: `${file.slug}/${file.version}`,
        title: data.title,
        body,
      },
    });
  }
  return items;
}

async function main() {
  const url = process.env.PROJECT_HOME_URL;
  const token = process.env.PROJECT_HOME_TOKEN;
  if (!url || !token) {
    console.log("PROJECT_HOME_URL/TOKEN not configured; skipping publish.");
    return;
  }
  const productMap = JSON.parse(
    readFileSync(path.join(root, "products.json"), "utf8"),
  );
  const items = itemsFor(productMap);
  if (items.length === 0) {
    console.log("No announcements mapped to Project Home products.");
    return;
  }
  const byProduct = new Map();
  for (const { product, item } of items) {
    const list = byProduct.get(product) ?? [];
    list.push(item);
    byProduct.set(product, list);
  }
  for (const [product, batch] of byProduct) {
    const response = await fetch(`${url.replace(/\/$/, "")}/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product, kind: "newsroom", items: batch }),
    });
    if (!response.ok) {
      throw new Error(
        `Project Home publish failed for ${product}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`,
      );
    }
    console.log(`Published ${batch.length} announcement(s) for ${product}.`);
  }
}

if (import.meta.main) {
  await main();
}
