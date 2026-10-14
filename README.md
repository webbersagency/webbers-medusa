# @webbers/webbers-medusa

Quality-of-life admin customizations for Medusa v2, extracted from the Frecious backend so they can be reused across projects.

## Features

- **Notes** — free-text notes on any entity, shown in the admin detail sidebar. Ships customer and order notes (with links + widgets); the generic `note` module, `/admin/note` endpoint and note component are reusable so other plugins can attach notes to their own entities (see "Attaching notes to your own entities").
- **Anonymize customer** — AVG/GDPR data scrub for a customer across customer, cart and order records, plus any host-configured extra tables (superadmin only). See "Configuring extra tables".
- **Transfer guest orders** — merge unassigned guest orders (matched by email) into a customer account.
- **Edit customer email** — change a registered customer's email atomically across customer and auth identity, plus any host-configured extra tables (clears the cached Klaviyo id). See "Configuring extra tables".
- **Order discount breakdown** — sidebar widget summarising the discount codes applied to an order, with amounts and percentages.
- **Order notifications** — sidebar widget listing the transactional emails sent for an order.
- **Always-free promotion** — flag a promotion as "always free shipping". Ships the data model, workflows, link and admin widget; the host app wires the trigger (see below).
- **Disallow price-list discounts** — a toggle on the price-list detail page that stops discount/promotion codes from overriding that price list. Ships the data model, link, workflows, admin API + widget, and a store add-to-cart endpoint that enforces it; the storefront wires the endpoint (see below).
- **Product reviews** — full product-review stack: `review` module (reviews, responses, images, per-product stats), admin **Reviews** page (list + detail, approve/reject/flag, responses, link products), admin/store APIs (`/admin/reviews`, `/admin/product-review-stats`, `/store/product-reviews` incl. image uploads, `/store/product-review-stats`) and an optional daily Kiyoh sync job. See "Product reviews".

## Toggling features

The plugin adds a **Settings → Webbers QoL** page in the admin with a switch per feature. Toggling a
feature off:

- **hides its admin widget** — every widget reads the flags via `useFeatureEnabled(key)` and renders
  nothing when disabled; and
- **blocks its endpoints** — a `featureGuard` middleware returns `403` for the feature's API routes
  (see `src/api/middlewares.ts`).

Flags are persisted by the bundled `webbers_settings` module (table `webbers_feature_flag`) and
**default to ON** when no row exists, so the plugin is fully active out of the box. The canonical list
of features lives in `src/feature-flags.ts` (shared by the server and admin builds).

> Always-free is widget-only gating: disabling it hides the promotion switch, but the actual
> link is still written by the host app's promotion hooks, so leave the hooks in place if you rely on
> existing always-free promotions.

After installing, run the migration so the flag table exists:

```bash
npx medusa db:migrate
```

## What's included

| Concern | Location |
| --- | --- |
| Feature catalog (single source of truth) | `src/feature-flags.ts` |
| Settings module + migration (feature flags) | `src/modules/webbers-settings` |
| Settings admin page (Settings → Webbers QoL) | `src/admin/routes/settings/webbers-medusa` |
| Note module + migration | `src/modules/note` |
| Custom-query (`custom_query`) module (raw SQL helpers, no migration) | `src/modules/custom-query` |
| Always-free (`promotion_addition`) module + migration | `src/modules/promotion-addition` |
| Price-list-ext (`price_list_ext`) module + migration | `src/modules/price-list-ext` |
| Links (customer/order note, promotion always-free, price-list-ext) | `src/links` |
| Workflows (note, always-free, price-list-ext) | `src/workflows` |
| Admin widgets | `src/admin/widgets` |
| Admin API routes | `src/api/admin` |
| Store API route (price-list-aware add-to-cart) | `src/api/store/carts/[id]/line-item-price-list` |
| HTTP middlewares (note + edit-email validators, promotion `additional_data`, price-list-ext) | `src/api/middlewares.ts` |

## Installation

Install the plugin in your Medusa app:

```bash
npm install @webbers/webbers-medusa
# or, during local development:
npx medusa plugin:add @webbers/webbers-medusa
```

Register it in the host app's `medusa-config.ts`:

```ts
plugins: [
  {
    resolve: '@webbers/webbers-medusa',
    options: {},
  },
]
```

After installing, run the migrations so the plugin's tables exist:

```bash
npx medusa db:migrate
```

### The bundled `custom_query` module

The plugin bundles a `custom_query` module exposing `PSQLQuery` / `PSQLTransaction` — the anonymize, transfer-guest-orders, edit-email and order-notifications routes resolve it from the container by key (`custom_query`).

> **Upgrading from ≤ 1.0.0:** earlier versions required the host app to register its own `custom_query` module. That copy must now be **removed** (both the module directory and its `medusa-config.ts` entry) — two modules with the same key cannot coexist. The bundled module is a drop-in replacement (same key, same API, no migration/table).

> This plugin has **no dependency on any subscriptions package** (or any other domain module). The
> anonymize / edit-email routines only touch `customer`, `cart` and `order` tables out of the box;
> any extra tables (e.g. `subscription`) are declared by the host via plugin options — see
> "Configuring extra tables" below.

## Configuring extra tables (anonymize / edit-email)

The anonymize and edit-email routines scrub the core Medusa tables on their own. To include tables
owned by **other** modules — without this plugin depending on them — declare them in the plugin
options in your `medusa-config.ts`. Every table/column name is validated (`^[A-Za-z_][A-Za-z0-9_]*$`)
and all statements run inside the same transaction as the core scrub, so atomicity is preserved.

```ts
plugins: [
  {
    resolve: '@webbers/webbers-medusa',
    options: {
      anonymize: {
        // Domain for the generated anonymized email (anon+<ts>@<domain>). Default: anonymized.invalid
        emailDomain: 'example.com',
        // Tables with a customer-id column: set email columns to the anon email, null the rest.
        customerScopedTables: [
          { table: 'subscription', emailColumns: ['email'], nullColumns: ['payment_config'] },
        ],
        // Address tables reached via a parent table's billing/shipping FKs (nulled out).
        // customerIdColumn/billingColumn/shippingColumn/nullColumns are optional (sensible defaults).
        addressTables: [
          { addressTable: 'subscription_address', parentTable: 'subscription' },
        ],
      },
      editEmail: {
        // Tables whose email column should follow the customer's new email.
        // emailColumn defaults to 'email', customerIdColumn to 'customer_id'.
        emailSyncTables: [{ table: 'subscription' }],
      },
    },
  },
]
```

## Product reviews

Ported from the former `@webbers/reviews-medusa` plugin — same module key (`review`), table names
and migration names, so an app that previously ran the standalone plugin upgrades in place with no
data changes (remove the old plugin, keep this one, done).

Plugin options (in `medusa-config.ts`):

```ts
plugins: [
  {
    resolve: '@webbers/webbers-medusa',
    options: {
      // Status given to newly created reviews: 'pending' | 'approved' | 'flagged'. Default: 'approved'
      defaultReviewStatus: 'pending',
      // Whether reviews use photos: the Kiyoh sync copies review photos to the file provider, and the store
      // API returns them. Set to false to leave photos out everywhere. Default: true
      enableReviewImages: true,
      // Optional machine translation of review titles and content (Google Translate). Off unless apiKey is set.
      translations: {
        apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
        sourceLanguage: 'nl',
        targetLanguages: ['en'],
      },
      // ...anonymize / editEmail options...
    },
  },
]
```

The **Kiyoh sync job** runs daily but is a no-op unless these env vars are set in the host app:

```bash
KIYOH_SYNC_ENABLE=true
KIYOH_LOCATION_ID=...
KIYOH_API_TOKEN=...
```

It matches Kiyoh reviews to orders by `referenceCode` (order display id) and creates product reviews
through `createReviewsWorkflow`. With `enableReviewImages` on (the default), it also copies each review's
customer photo from Kiyoh to the host app's file provider and attaches it as a review image. The workflows are exported (`createReviewsWorkflow`,
`updateReviewsWorkflow`, `refreshProductReviewStatsWorkflow`, …) for host scripts, e.g. bulk imports
or stats regeneration.

With `translations` configured, the admin review detail page gets a **Translations** section with a
**Translate** button (`POST /admin/reviews/:id/translate`), showing per language whether the translation
is missing, up to date or outdated (the review was edited after translating). Translations are stored in the
review's `translations` column, keyed by language, as `{ title, content, source_title, source_content }`; nothing is
translated automatically. Host apps decide what to translate with `translateReviewsWorkflow`
(`{ ids, only_outdated }`) and read translations with the helpers in
`@webbers/webbers-medusa/review-translations`.

The `reviews` feature flag gates all review endpoints (admin + store) and the admin Reviews page
content (the sidebar entry itself cannot be hidden dynamically; the page shows a notice when the
feature is off).

## Attaching notes to your own entities

The `note` module, the `/admin/note` endpoint (`entity_type` / `type` are free-form strings) and the
note component are generic. To add notes to another entity from a **separate** plugin or your app —
e.g. subscriptions — depend on `@webbers/webbers-medusa` and:

1. Define the link between your module and the note module:

   ```ts
   import { defineLink } from '@medusajs/framework/utils';
   import MyModule from '../modules/my-module';
   import NoteModule from '@webbers/webbers-medusa/modules/note';

   export default defineLink(MyModule.linkable.myEntity, NoteModule.linkable.note);
   ```

2. Render a note widget in your entity's detail zone that calls `/admin/note` with your
   `entity_type` (the module's registration key). The `notes` feature flag guards the endpoint, so
   the note stays hidden/blocked when notes are disabled in **Settings → Webbers QoL**.

This keeps the QoL plugin free of any dependency on your module while still owning the note storage.

## Activating the always-free promotion behaviour

Toggling the widget writes `additional_data.always_free` on the promotion (the plugin's middleware whitelists that field). Turning that flag into an `always_free` link requires a handler on Medusa's promotion workflow hooks. Medusa allows **only one handler per workflow hook**, and a real app usually does other work in `promotionsCreated`/`promotionsUpdated` too — so the plugin does **not** register these hooks for you. Add them in your app's `src/workflows/hooks/promotions`:

`promotion-created.ts`

```ts
import { createPromotionsWorkflow } from '@medusajs/medusa/core-flows';
import {
  createAlwaysFreeFromPromotionWorkflow,
  CreateAlwaysFreeFromPromotionWorkflowInput,
} from '@webbers/webbers-medusa/workflows';

createPromotionsWorkflow.hooks.promotionsCreated(async ({ promotions, additional_data }, { container }) => {
  const workflow = createAlwaysFreeFromPromotionWorkflow(container);

  for (const promotion of promotions) {
    // ...any other app-specific work you already do here...
    await workflow.run({
      input: { promotion, additional_data } as CreateAlwaysFreeFromPromotionWorkflowInput,
    });
  }
});
```

`promotion-updated.ts`

```ts
import { updatePromotionsWorkflow } from '@medusajs/medusa/core-flows';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import {
  createAlwaysFreeFromPromotionWorkflow,
  CreateAlwaysFreeFromPromotionWorkflowInput,
  updateAlwaysFreeFromPromotionWorkflow,
  UpdateAlwaysFreeFromPromotionStepInput,
} from '@webbers/webbers-medusa/workflows';
import PromotionAlwaysFreeLink from '@webbers/webbers-medusa/links/promotion-always-free';

updatePromotionsWorkflow.hooks.promotionsUpdated(async ({ promotions, additional_data }, { container }) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const create = createAlwaysFreeFromPromotionWorkflow(container);
  const update = updateAlwaysFreeFromPromotionWorkflow(container);

  for (const promotion of promotions) {
    const existing = await query.graph({
      entity: PromotionAlwaysFreeLink.entryPoint,
      fields: ['*'],
      filters: { promotion_id: promotion.id },
    });

    if (!existing?.data?.length) {
      await create.run({ input: { promotion, additional_data } as CreateAlwaysFreeFromPromotionWorkflowInput });
    } else {
      await update.run({ input: { promotion, additional_data } as UpdateAlwaysFreeFromPromotionStepInput });
    }
  }
});
```

> The plugin emits no `.d.ts` (`declaration: false`, to avoid a `createWorkflow` type-portability error), so these imports resolve to `any` in the host app unless it sets `noImplicitAny`. That is intentional — keep the casts above so the hook bodies stay type-checked.

Reading the flag elsewhere (e.g. a fulfillment provider deciding shipping is free) can join the link table directly:

```sql
SELECT af.always_free
FROM promotion p
LEFT JOIN promotion_promotion_promotion_addition_always_free paf ON paf.promotion_id = p.id
LEFT JOIN always_free af ON af.id = paf.always_free_id
WHERE p.id = ?
```

## Activating the disallow-price-list-discounts behaviour

The admin widget writes `metadata.disallow_discounts` onto the price list's extended record
(`price_list_ext`, linked to Medusa's `price_list`). The toggle only *records intent* — the
enforcement happens when items are added to the cart.

The plugin ships the enforcement endpoint at **`POST /store/carts/:id/line-item-price-list`**. It
behaves like Medusa's built-in add-to-cart, but when the body's `metadata.price_list_id` points at a
price list flagged `disallow_discounts`, it sets `is_discountable: false` on the line item (and stamps
`metadata.disallowed_discounts_pricelist = true`). When the **Disallow price-list discounts** feature
is toggled off, the endpoint skips that logic and behaves as a plain add-to-cart, so it is safe to call
unconditionally.

To activate the behaviour, have the storefront add price-list items through this endpoint instead of
the default `POST /store/carts/:id/line-items`:

```ts
await sdk.client.fetch(`/store/carts/${cartId}/line-item-price-list`, {
  method: 'POST',
  body: {
    variant_id: variantId,
    quantity,
    metadata: { price_list_id: priceListId },
  },
});
```

## Build

```bash
pnpm --filter @webbers/webbers-medusa build
```
