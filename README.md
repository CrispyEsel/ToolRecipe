# ToolRecipe

Team Google Drive: https://drive.google.com/drive/u/1/folders/1nFHR5cwh3xGbHF1T-pu24pOK14E1jHN2

**Tell ToolRecipe what's eating your week and what software you already use. It shows AI tools that work together with your setup, what they'll really cost each month, and a 30-day plan to start.**

Prototype for the UMD Smith AI for Small Business Hack-a-thon (Fall 2026).

## The flow

1. **Business type**: restaurant/café, HVAC/trades, salon, landscaping, or **Something else** (type any profession and pick the closest business type: appointments, going to job sites, or a shop customers visit). "Something else" only sees tools that work for any business, generic wording, and starting numbers for its type, and each request is logged so the most-asked profession gets added next. Four **example businesses** on the home page (including Paws & Suds, a dog groomer) open straight to results with conservative numbers.
2. **Problem category**: phones, scheduling, money, marketing, or office work
3. **Problem in your own words**: tap up to 3 problems. The optional free text is read with keyword rules, which pick up extra problems and numbers such as "20 calls a night".
4. **AI readiness quiz**: covers Stack Snap (the software you use), comfort with new apps, budget, setup time, and how careful you need to be with customer data. It produces an "AI starting point" score that decides which recipe is suggested first.
5. **Recipes**: Simple, Balanced, and Stretch combinations (never two tools for the same job; identical recipes are merged). Each shows compatibility badges, the real monthly total (including Zapier and fees tied to your software), setup time, a Fit & Trust score, a "Why we picked this" list, and a **stack map** that draws each tool's real connections to your software (solid = direct, dashed = through Zapier, no line = works on its own) and redraws when you change Stack Snap. A **money-leak** line above the recipes estimates what the problems may cost today, using the same numbers as Day in the life. **Coming up for you** cards flag seasonal crunches for your industry (holidays, prom, cold snaps, spring rush) and add the matching problem in one tap.
6. **Day in the life**: a before/after timeline of a typical day, plus a weekly value estimate built from editable inputs. Edits are saved and feed the money-leak line.
7. **Compare**: recipes or tools side by side, with the same rows for every option.
8. **30-day plan**: checkable steps, free setup help (Maryland SBDC, SCORE), a "share with my SBDC advisor" email, and a day-30 check-in where you can also retake the readiness quiz.

Also: **Hear it answer your phone** (a simulated call for the owner's business, spoken by the browser and clearly labeled as a simulation), a **"Checked X days ago"** label on every tool (amber after 90 days; stale tools can't be the Best start), **Fine Print** flags on tools (contracts, extra fees, data, each linked to a source), usage fees estimated by business size, an unmet-needs form, **Browse tools** (live stats from the catalog), **For AI vendors** (submissions appear as "Pending verification" and are kept out of recipes), and **How we rank** (all of the scoring math).

## Data honesty

- `src/data/tools.ts`: 32 real tools plus Zapier as a connector, each with its sources and the date checked (2026-11-06). Many vendors don't publish prices, so some prices come from third-party trackers, and the tool's note says so.
- Connections show as green only when a source documents them. Anything unconfirmed says "Not confirmed".
- Outcome check-ins show "Not enough check-ins yet". The app never shows made-up stats.
- Setup times are estimates unless the vendor publishes one.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # production build in dist/
npm run scenarios  # prints recipes for the judge test scenarios
```

Deploy: import the repo in Vercel and use the default Vite settings (build `npm run build`, output `dist`).

## Photos and logos

The home page has photo slots. Put JPGs in `public/photos/` with the names listed in `public/photos/README.md` and they replace the placeholders; until then a labeled placeholder shows.

Logos for AI tools and the software owners use go in `src/assets/logos/`. Name each file as listed in `src/assets/logos/README.md` (for example `goodcall.png`, `housecall-pro.png`). They're picked up automatically everywhere that tool appears; anything without a file keeps its colored initials. Only use logos you have permission to use.

## Architecture

React + TypeScript + Tailwind (Vite). The catalog lives in typed data files, the engine runs in the browser, and localStorage keeps the profile, plan, vendor submissions, and check-ins. There is no backend. Diagram: `docs/architecture.html`.

| Module | Job |
|---|---|
| `src/lib/repo.ts` | Data access layer: the only module that reads the catalog. Swap it for a database or API later. |
| `src/lib/config.ts` | Scoring weights, connection values, usage assumptions, feature flags |
| `src/lib/storage.ts` | Browser storage and the `track()` event log (future analytics and outcome data) |
| `src/data/fineprint.ts` | Fine Print flags with sources |
| `src/data/taxonomy.ts` | Industries, categories, problems, systems. A new industry is just data. |
| `src/data/tools.ts` | Tool catalog with prices, connections, fees, and sources |
| `src/engine/match.ts` | Keyword reading of the owner's own words |
| `src/engine/readiness.ts` | AI starting point score |
| `src/engine/recipes.ts` | Fit & Trust scoring, compatibility badges, recipe builder, Zapier and fee totals |
| `src/engine/simulate.ts` | Day-in-the-life timelines and value estimate |
| `src/lib/business.ts` | "Something else" professions: business types, general tools, generic wording |
| `src/lib/freshness.ts` | "Checked X days ago" and the 90-day staleness rule |
| `src/data/examples.ts` | Example businesses for demos |

**Production path:** the data files become a Postgres catalog, the engine becomes an API, vendor submissions go into a human verification queue, and day-30 check-ins become real outcome data.
