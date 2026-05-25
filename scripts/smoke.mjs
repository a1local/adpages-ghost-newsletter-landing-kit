import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildCampaignLinksCsv,
  buildCampaignLinksMarkdown,
  buildOpenGraphChecklist,
  generateCampaignLinks,
  readJsonFile,
  writeKitFiles
} from "../src/ghost-kit.mjs";

const root = new URL("../", import.meta.url);
const plan = await readJsonFile(new URL("examples/campaign-links.json", root));
const result = generateCampaignLinks(plan);

assert(result.links.length === 4, "sample should generate four campaign links");
assert(result.links[0].url === "https://example-publisher.test/newsletter/?utm_source=instagram&utm_medium=social&utm_campaign=local-growth-brief&utm_content=bio-link", "first generated link should be deterministic");
assert(result.links[2].utm.utm_medium === "referral", "partner campaign should use referral medium");

const csv = buildCampaignLinksCsv(result);
assert(csv.includes("QR flyer"), "CSV should include QR campaign");
assert(csv.includes("utm_medium=qr"), "CSV should include QR medium URL");

const markdown = buildCampaignLinksMarkdown(result);
assert(markdown.includes("| Instagram bio |"), "Markdown brief should include campaign table");
assert(!markdown.includes("Powered by"), "Markdown brief should not add promotional backlinks");

const openGraph = buildOpenGraphChecklist(result);
assert(openGraph.includes("Weekly practical notes"), "Open Graph checklist should include sample description");
assert(openGraph.includes("- [ ] Unique page title under 60 characters"), "Open Graph checklist should include configured checks");

const outputDir = await mkdtemp(join(tmpdir(), "adpages-ghost-"));
try {
  const manifest = await writeKitFiles({
    plan,
    outputDir,
    checklistTemplatePath: new URL("examples/newsletter-landing-checklist.csv", root)
  });

  assert(manifest.localOnly === true, "manifest should stay local-only");
  assert(manifest.linkCount === 4, "manifest should count generated links");
  assert(manifest.generatedFiles.includes("theme-snippet-install.md"), "manifest should include snippet install notes");
  assert(manifest.trackingBeacons === false, "manifest should disclose no tracking beacons");
  assert(manifest.hiddenBacklinks === false, "manifest should disclose no hidden backlinks");

  const generatedJson = JSON.parse(await readFile(join(outputDir, "campaign-links.json"), "utf8"));
  assert(generatedJson.links[1].utm.utm_source === "linkedin", "generated JSON should include LinkedIn campaign");

  const generatedCsv = await readFile(join(outputDir, "campaign-links.csv"), "utf8");
  assert(generatedCsv.startsWith("Label,URL,UTM Source"), "generated CSV should include headers");

  const installNotes = await readFile(join(outputDir, "theme-snippet-install.md"), "utf8");
  assert(installNotes.includes("partials/cta-card.hbs"), "install notes should describe partial path");
  assert(installNotes.includes("does not add Ghost Admin API calls"), "install notes should disclose local-only behavior");
} finally {
  await rm(outputDir, { recursive: true, force: true });
}

console.log("ghost newsletter landing kit smoke ok");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
