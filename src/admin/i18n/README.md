# Admin translations

Medusa loads the resources exported by `index.ts` into its own i18next instance.
Use `useTranslation('webbersMedusa')` for plugin copy and `translationNs: 'webbersMedusa'`
with a translation key for Admin navigation labels.

English (`en`), Polish (`pl`), and Dutch (`nl`) are included. When adding a locale, create its
JSON catalog under `json/` and register it in `index.ts` with a JSON import attribute. Keep
interpolation variables consistent across languages and provide the plural categories for each
locale. Pass a numeric `count` to i18next to select the right category.

Run `pnpm test` to check catalog coverage and `pnpm build` to build the Admin extension.
See the [Medusa Admin translation documentation](https://docs.medusajs.com/learn/fundamentals/admin/translations).
