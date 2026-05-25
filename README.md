# AdPages Ghost Newsletter Landing Kit

A local-first Ghost resource kit for publisher and newsletter landing pages. It creates tagged campaign links, a reusable Ghost CTA partial, an optional newsletter landing-page JSON-LD snippet, an Open Graph checklist, and a launch QA checklist.

This is built as a lightweight publishable opportunity: useful as a GitHub resource, Ghost integration guide, and theme marketplace/tutorial companion. Later monetisable upgrades could add hosted screenshots, recurring share-card checks, broken signup detection, and campaign reporting.

## What It Includes

- UTM campaign link helper for newsletter landing-page promotion.
- `snippets/cta-card.hbs` for a Ghost Members signup CTA partial.
- `snippets/newsletter-schema.hbs` for optional newsletter landing-page JSON-LD.
- Open Graph checklist output for share-preview QA.
- Newsletter landing-page QA checklist for launch review.
- Local checks that fail on Ghost API calls, credentials, hosted backends, tracking beacons, or hidden backlink patterns.

## Import and use flow

1. Edit `examples/campaign-links.json` with the publication URL, newsletter landing path, newsletter name, Open Graph fields, and launch campaign sources.
2. Generate local launch assets:

   ```bash
   npm --prefix integrations/ghost/adpages-newsletter-landing-kit run generate:sample
   ```

3. Copy `snippets/cta-card.hbs` into the active Ghost theme as `partials/cta-card.hbs`.
4. Add the CTA partial to a newsletter landing template:

   ```hbs
   {{> "cta-card" heading="Join The Local Growth Brief" button_text="Subscribe"}}
   ```

5. Keep `{{ghost_head}}` in the theme. Only copy `snippets/newsletter-schema.hbs` into `partials/newsletter-schema.hbs` when a dedicated landing page needs extra newsletter-specific schema, then render it from that landing-page template.
6. Use the generated `campaign-links.csv`, `open-graph-checklist.md`, and `newsletter-landing-checklist.csv` as the launch QA packet.

## Local-only behavior

This kit does not call the Ghost Admin API, does not use the Ghost Content API, does not require credentials, does not create subscribers, does not write to a Ghost site, does not include tracking beacons, and adds no hidden backlinks.

## Publishing position

Primary position: publish as a GitHub resource and Ghost newsletter landing-page integration guide.

Secondary position: turn the snippets and checklist into a Ghost theme marketplace tutorial or a companion resource for Ghost theme developers.

Future paid path: hosted landing-page QA monitor with screenshots, social preview checks, signup form checks, and campaign report exports.

## Commands

```bash
npm --prefix integrations/ghost/adpages-newsletter-landing-kit run check
npm --prefix integrations/ghost/adpages-newsletter-landing-kit run smoke
npm --prefix integrations/ghost/adpages-newsletter-landing-kit run generate:sample
```

## Publish Blockers

- Install the snippets in a real Ghost theme and validate with GScan.
- Test on the supported Ghost version range before claiming compatibility.
- Capture screenshots for the README, Ghost tutorial, and marketplace/resource listing.
- Confirm final repository URL, support URL, privacy URL, and license.
- Review a real publisher landing page to tune CTA copy, Open Graph defaults, and checklist wording.

## Publisher

Built by [AdPages from A1 Local](https://a1local.com.au/extensions/) as a free, dependency-light resource for local-service marketers, web designers, and small business site owners.
