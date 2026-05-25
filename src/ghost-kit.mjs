import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const campaignCsvHeaders = [
  "Label",
  "URL",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "UTM Content",
  "UTM Term",
  "Notes"
];

export const checklistHeaders = ["Phase", "Item", "Owner", "Status", "Evidence"];

const utmKeys = ["source", "medium", "campaign", "content", "term"];

export async function readJsonFile(fileUrl) {
  return JSON.parse(await readFile(fileUrl, "utf8"));
}

export function generateCampaignLinks(plan) {
  assert(plan && typeof plan === "object", "campaign plan is required");
  assert(plan.localOnly === true, "campaign plan must declare localOnly=true");
  assert(typeof plan.siteUrl === "string" && plan.siteUrl.length > 0, "siteUrl is required");
  assert(typeof plan.landingPath === "string" && plan.landingPath.length > 0, "landingPath is required");
  assert(Array.isArray(plan.campaigns) && plan.campaigns.length > 0, "campaigns are required");

  const baseUrl = new URL(plan.landingPath, ensureTrailingSlash(plan.siteUrl));
  const defaultUtm = plan.defaultUtm ?? {};
  const links = plan.campaigns.map((campaign) => {
    assert(campaign.label, "campaign label is required");
    const url = new URL(baseUrl.href);
    const utm = {};

    for (const key of utmKeys) {
      const value = campaign[key] ?? defaultUtm[key];
      if (value) {
        const param = `utm_${key}`;
        utm[param] = String(value);
        url.searchParams.set(param, String(value));
      }
    }

    return {
      label: String(campaign.label),
      url: url.href,
      utm,
      notes: campaign.notes ? String(campaign.notes) : ""
    };
  });

  return {
    localOnly: true,
    writesDataAutomatically: false,
    trackingBeacons: false,
    hiddenBacklinks: false,
    newsletterName: plan.newsletterName ?? "",
    landingUrl: baseUrl.href,
    links,
    openGraph: plan.openGraph ?? {},
    openGraphChecklist: plan.openGraphChecklist ?? []
  };
}

export function buildCampaignLinksCsv(result) {
  const rows = [campaignCsvHeaders];
  for (const link of result.links) {
    rows.push([
      link.label,
      link.url,
      link.utm.utm_source ?? "",
      link.utm.utm_medium ?? "",
      link.utm.utm_campaign ?? "",
      link.utm.utm_content ?? "",
      link.utm.utm_term ?? "",
      link.notes
    ]);
  }
  return `${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`;
}

export function buildCampaignLinksMarkdown(result) {
  const lines = [
    `# ${result.newsletterName || "Newsletter"} campaign links`,
    "",
    "These links are generated locally from the campaign plan. They do not call Ghost Admin API, create subscribers, or add tracking scripts.",
    "",
    "| Label | Link | Notes |",
    "| --- | --- | --- |"
  ];

  for (const link of result.links) {
    lines.push(`| ${escapeMarkdownTable(link.label)} | ${escapeMarkdownTable(link.url)} | ${escapeMarkdownTable(link.notes)} |`);
  }

  return `${lines.join("\n")}\n`;
}

export function buildOpenGraphChecklist(result) {
  const og = result.openGraph ?? {};
  const checks = [
    ["Title", og.title, "Set a clear title for social previews."],
    ["Description", og.description, "Explain the reader benefit in one sentence."],
    ["Image", og.image, "Use a social image with a stable public URL."],
    ["Canonical URL", og.url || result.landingUrl, "Match the live newsletter landing page."]
  ];

  const lines = [
    "# Open Graph checklist",
    "",
    "| Field | Current value | Check |",
    "| --- | --- | --- |",
    ...checks.map(([field, value, check]) => `| ${field} | ${escapeMarkdownTable(value || "Missing")} | ${check} |`),
    "",
    "## Landing-page checks",
    ""
  ];

  for (const item of result.openGraphChecklist) {
    lines.push(`- [ ] ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

export function parseChecklistCsv(csv) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  assert(lines.length >= 2, "checklist CSV must include a header and at least one row");
  const headers = parseCsvLine(lines[0]);
  assert(headers.join(",") === checklistHeaders.join(","), "checklist CSV header mismatch");
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

export async function writeKitFiles({ plan, outputDir, checklistTemplatePath }) {
  const result = generateCampaignLinks(plan);
  await mkdir(outputDir, { recursive: true });

  const checklist = await readFile(checklistTemplatePath, "utf8");
  parseChecklistCsv(checklist);

  const files = {
    "campaign-links.json": `${JSON.stringify(result, null, 2)}\n`,
    "campaign-links.csv": buildCampaignLinksCsv(result),
    "campaign-links.md": buildCampaignLinksMarkdown(result),
    "open-graph-checklist.md": buildOpenGraphChecklist(result),
    "newsletter-landing-checklist.csv": checklist,
    "theme-snippet-install.md": buildSnippetInstallNotes()
  };

  for (const [file, content] of Object.entries(files)) {
    await writeFile(join(outputDir, file), content);
  }

  return {
    localOnly: true,
    outputDir,
    generatedFiles: Object.keys(files),
    linkCount: result.links.length,
    writesDataAutomatically: false,
    trackingBeacons: false,
    hiddenBacklinks: false
  };
}

function buildSnippetInstallNotes() {
  return [
    "# Ghost theme snippet install notes",
    "",
    "1. Copy `snippets/cta-card.hbs` into the active theme as `partials/cta-card.hbs`.",
    "2. Call it from a landing page template with `{{> \"cta-card\" heading=\"Join the newsletter\" button_text=\"Subscribe\"}}`.",
    "3. Copy `snippets/newsletter-schema.hbs` into `partials/newsletter-schema.hbs` only if the landing page needs extra newsletter-specific schema beyond `{{ghost_head}}`.",
    "4. Run Ghost theme validation and test a real member signup before publishing.",
    "",
    "This kit does not add Ghost Admin API calls, credentials, tracking beacons, hosted scripts, or hidden backlinks.",
    ""
  ].join("\n");
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function escapeMarkdownTable(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
