import { readFile } from "node:fs/promises";
import {
  buildCampaignLinksCsv,
  buildOpenGraphChecklist,
  campaignCsvHeaders,
  checklistHeaders,
  generateCampaignLinks,
  parseChecklistCsv
} from "../src/ghost-kit.mjs";

const root = new URL("../", import.meta.url);
const requiredFiles = [
  "package.json",
  "README.md",
  "PRIVACY.md",
  "config/kit-metadata.json",
  "examples/campaign-links.json",
  "examples/newsletter-landing-checklist.csv",
  "snippets/cta-card.hbs",
  "snippets/newsletter-schema.hbs",
  "src/ghost-kit.mjs",
  "bin/adpages-ghost-kit.mjs",
  "scripts/check.mjs",
  "scripts/smoke.mjs"
];
const localSourceFiles = [
  "src/ghost-kit.mjs",
  "bin/adpages-ghost-kit.mjs",
  "scripts/check.mjs",
  "scripts/smoke.mjs",
  "snippets/cta-card.hbs",
  "snippets/newsletter-schema.hbs"
];
const networkPattern = new RegExp([
  "f" + "etch\\s*\\(",
  "XML" + "HttpRequest",
  "send" + "Beacon",
  "Web" + "Socket",
  "Event" + "Source",
  "node:" + "https",
  "node:" + "http",
  "admin" + "\\.ghost\\.io",
  "ghost" + "\\/api\\/admin",
  "ghost" + "\\/api\\/content"
].join("|"), "i");
const secretPattern = new RegExp([
  "GHOST_" + "ADMIN_API_KEY",
  "GHOST_" + "CONTENT_API_KEY",
  "GHOST_" + "API_URL",
  "client_" + "secret",
  "private_" + "key",
  "Bearer\\s+[a-zA-Z0-9._-]{12,}"
].join("|"), "i");
const trackingPattern = new RegExp([
  "google" + "-analytics",
  "google" + "tagmanager",
  "g" + "tag\\s*\\(",
  "f" + "bq\\s*\\(",
  "_" + "hsq",
  "send" + "Beacon"
].join("|"), "i");
const hiddenBacklinkPattern = new RegExp([
  "display\\s*:\\s*none",
  "visibility\\s*:\\s*hidden",
  "rel=[\"']?nofollow",
  "powered\\s+by\\s+adpages",
  "href=[\"']https?:\\/\\/[^\"']*adpages"
].join("|"), "i");

async function main() {
  const contents = new Map();
  for (const file of requiredFiles) {
    const content = await readText(file);
    contents.set(file, content);
    assert(content.trim().length > 0, `${file} must not be empty`);
  }

  const packageJson = JSON.parse(contents.get("package.json"));
  assert(packageJson.type === "module", "package.json must use type=module");
  assert(packageJson.private === true, "package.json must stay private until the publishing path is final");
  assert(packageJson.scripts?.check, "package.json must define a check script");
  assert(packageJson.scripts?.smoke, "package.json must define a smoke script");
  assert(!packageJson.dependencies, "kit should not add runtime dependencies");
  assert(packageJson.bin?.["adpages-ghost-kit"], "package.json must expose the local CLI");

  const metadata = JSON.parse(contents.get("config/kit-metadata.json"));
  assert(metadata.localOnly === true, "metadata must mark localOnly=true");
  assert(metadata.requiresGhostAdminApi === false, "metadata must avoid Ghost Admin API requirements");
  assert(metadata.requiresContentApi === false, "metadata must avoid Ghost Content API requirements");
  assert(metadata.requiresCredentials === false, "metadata must avoid credential requirements");
  assert(metadata.hostedBackend === false, "metadata must disclose no hosted backend");
  assert(metadata.trackingBeacons === false, "metadata must disclose no tracking beacons");
  assert(metadata.hiddenBacklinks === false, "metadata must disclose no hidden backlinks");
  assert(metadata.writesDataAutomatically === false, "metadata must disclose no automatic writes");
  assert(metadata.publishingPosition?.primary?.includes("GitHub"), "metadata must include GitHub publishing position");
  assert(Array.isArray(metadata.publishBlockers) && metadata.publishBlockers.length >= 4, "metadata must list publish blockers");

  const plan = JSON.parse(contents.get("examples/campaign-links.json"));
  assert(plan.localOnly === true, "sample plan must be local-only");
  assert(plan.siteUrl.endsWith(".test"), "sample plan should avoid a real publication domain");
  assert(Array.isArray(plan.campaigns) && plan.campaigns.length >= 4, "sample plan must include campaign examples");
  assert(plan.campaigns.every((campaign) => campaign.source && campaign.medium && campaign.content), "campaign examples must include UTM source medium and content");

  const result = generateCampaignLinks(plan);
  assert(result.localOnly === true, "generated result must stay local-only");
  assert(result.links.length === plan.campaigns.length, "generated result should include one link per campaign");
  assert(result.links.every((link) => link.url.includes("utm_source=")), "every link must include UTM source");
  assert(result.links.every((link) => link.url.includes("utm_campaign=local-growth-brief")), "every link must include default UTM campaign");
  assert(result.trackingBeacons === false, "generated result must not add tracking beacons");
  assert(result.hiddenBacklinks === false, "generated result must not add hidden backlinks");

  const csv = buildCampaignLinksCsv(result);
  assert(csv.startsWith(campaignCsvHeaders.join(",")), "campaign link CSV header mismatch");
  assert(csv.includes("Instagram bio"), "campaign link CSV should include the sample campaign");

  const checklistRows = parseChecklistCsv(contents.get("examples/newsletter-landing-checklist.csv"));
  assert(checklistHeaders.join(",") === "Phase,Item,Owner,Status,Evidence", "checklist header contract changed");
  assert(checklistRows.length >= 8, "newsletter QA checklist must have enough rows");
  assert(checklistRows.some((row) => row.Phase === "Open Graph"), "checklist must include Open Graph QA");
  assert(checklistRows.some((row) => row.Phase === "Ghost"), "checklist must include Ghost theme QA");

  const openGraphChecklist = buildOpenGraphChecklist(result);
  assert(openGraphChecklist.includes("Open Graph checklist"), "Open Graph checklist should render");
  assert(openGraphChecklist.includes("The Local Growth Brief"), "Open Graph checklist should include sample title");

  const ctaSnippet = contents.get("snippets/cta-card.hbs");
  assert(ctaSnippet.includes("data-members-form=\"subscribe\""), "CTA snippet must use Ghost members subscribe form");
  assert(ctaSnippet.includes("data-members-email"), "CTA snippet must include Ghost members email input");
  assert(!ctaSnippet.includes("type=\"hidden\""), "CTA snippet must not add hidden tracking fields");

  const schemaSnippet = contents.get("snippets/newsletter-schema.hbs");
  assert(schemaSnippet.includes("application/ld+json"), "schema snippet must output JSON-LD");
  assert(schemaSnippet.includes("SubscribeAction"), "schema snippet must describe subscription action");
  assert(schemaSnippet.includes("{{json"), "schema snippet must use Ghost JSON helper for inline JSON values");

  for (const file of localSourceFiles) {
    const content = contents.get(file);
    assert(!networkPattern.test(content), `${file} must not make Ghost API or network calls`);
    assert(!secretPattern.test(content), `${file} must not contain Ghost credentials or secrets`);
    assert(!trackingPattern.test(content), `${file} must not include tracking beacons`);
    assert(!hiddenBacklinkPattern.test(content), `${file} must not include hidden backlinks`);
  }

  const readme = contents.get("README.md");
  assert(readme.includes("Import and use flow"), "README must include import/use flow");
  assert(readme.includes("Publishing position"), "README must include publishing position");
  assert(readme.includes("Publish Blockers"), "README must list publish blockers");
  assert(readme.includes("does not call the Ghost Admin API"), "README must disclose no Ghost Admin API calls");
  assert(readme.includes("no hidden backlinks"), "README must disclose no hidden backlinks");

  const privacy = contents.get("PRIVACY.md");
  assert(privacy.includes("does not make network calls"), "PRIVACY must disclose network behavior");
  assert(privacy.includes("does not require Ghost credentials"), "PRIVACY must disclose credential handling");
  assert(privacy.includes("does not add tracking beacons"), "PRIVACY must disclose tracking behavior");

  console.log("ghost newsletter landing kit check ok");
}

async function readText(file) {
  return readFile(new URL(file, root), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
