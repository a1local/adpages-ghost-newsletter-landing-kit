#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readJsonFile, writeKitFiles } from "../src/ghost-kit.mjs";

const root = new URL("../", import.meta.url);
const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log([
    "Usage: adpages-ghost-kit --input examples/campaign-links.json --out-dir .tmp/ghost-newsletter-landing-kit",
    "",
    "Generates local campaign links, Open Graph checklist, and Ghost snippet install notes.",
    "No Ghost Admin API calls, credentials, hosted backend, tracking beacons, or hidden backlinks are used."
  ].join("\n"));
  process.exit(0);
}

const inputPath = args.input ?? "examples/campaign-links.json";
const outputDir = args["out-dir"] ?? ".tmp/ghost-newsletter-landing-kit";
const inputUrl = pathToFileURL(resolve(process.cwd(), inputPath));
const checklistTemplatePath = new URL("examples/newsletter-landing-checklist.csv", root);

const plan = await readJsonFile(inputUrl);
const manifest = await writeKitFiles({
  plan,
  outputDir: resolve(process.cwd(), outputDir),
  checklistTemplatePath
});

console.log(JSON.stringify(manifest, null, 2));

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--help" || value === "-h") {
      parsed.help = true;
    } else if (value.startsWith("--")) {
      const key = value.slice(2);
      const next = values[index + 1];
      if (!next || next.startsWith("--")) {
        parsed[key] = true;
      } else {
        parsed[key] = next;
        index += 1;
      }
    }
  }
  return parsed;
}
