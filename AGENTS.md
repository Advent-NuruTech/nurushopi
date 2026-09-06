# NuruShop repository guidance

These rules apply to all work in this repository.

## Brand system

- Treat green as the NuruShop brand identity. Do not replace it with blue, purple, or another primary color.
- Use `#009933` for primary actions and active states.
- Use `#006B2C` for hover states, strong green text, and dark emphasis.
- Use `#00C83A` as the bright green accent, especially on dark surfaces.
- Use `#004D20` only for the deepest brand-green text or gradient endpoint.
- Use `#EFFCF3`, `#DDFBE5`, and `#B8F5C8` for progressively stronger light-green surfaces and borders.
- Keep neutral UI surfaces in the slate family. Use red/rose only for discounts, destructive states, and errors. Use amber only for ratings, warnings, and low-stock messaging.
- Prefer semantic brand tokens from `apps/web/app/globals.css` over introducing another hardcoded green.

## Storefront UI and UX

- Product grids on the homepage must be continuous. Do not create a separate grid per category because short categories leave blank columns.
- Do not restore large solid-green category header bars on the homepage. Surface category discovery contextually inside the product feed.
- Category discovery modules should appear progressively while scrolling, remain secondary to products, and use real category imagery when available.
- Promotions, wholesale picks, and configured merchandising collections belong inside the same continuous homepage feed. Insert them at a measured cadence without changing the relative order of products or creating standalone rails and empty rows.
- `/shop` must reuse the continuous storefront card language and preserve the catalog result order. Show blended discovery/promotion/wholesale modules only in the unfiltered shop; category and search results stay focused on matching retail products.
- Product detail pages must prioritize: imagery, product name, rating, price/savings, stock status, quantity, purchase actions, fulfillment reassurance, description, reviews, and recommendations.
- Preserve responsive behavior at 390px, tablet widths, and desktop widths. Never introduce horizontal page overflow.
- Use generous rounded cards, subtle slate borders, restrained shadows, and consistent spacing. Avoid mixing unrelated card styles on one page.

## SSR and hydration safety

- Server-rendered and client-rendered text must be deterministic.
- Use the shared `formatPrice` helper for every storefront price. Do not use `Intl.NumberFormat` with currency style or locale-dependent currency symbols in SSR UI.
- Do not call `Date.now()`, `Math.random()`, or locale-sensitive date formatting during a Client Component render. Compute unstable values on the server and pass them as props, or set them after mount when genuinely client-only.
- Do not assume modern browser APIs exist on mobile. Capability-check APIs such as `crypto.randomUUID`, provide a safe fallback where appropriate, and test the fallback path for storefront-critical code.
- Keep valid HTML nesting and verify client components for hydration warnings after changing rendered content.

## Verification

- Run `pnpm.cmd --filter web run typecheck` after storefront changes on Windows.
- Do not run browser or visual-layout checks unless the user explicitly requests them.
- Check browser console output for hydration errors and check `document.documentElement.scrollWidth` against the viewport width.

- See `docs/brand-system.md` for the design reference and implementation examples.
