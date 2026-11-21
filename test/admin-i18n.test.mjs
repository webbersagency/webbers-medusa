import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const fromReactI18next = createRequire(require.resolve('react-i18next'));
const i18next = fromReactI18next('i18next');

const namespace = 'webbersMedusa';
const readCatalog = language =>
  JSON.parse(readFileSync(new URL(`../src/admin/i18n/json/${language}.json`, import.meta.url), 'utf8'));
const resources = Object.fromEntries(['en', 'pl', 'nl'].map(language => [language, { [namespace]: readCatalog(language) }]));

function flatten(catalog, parent = '') {
  return Object.entries(catalog).flatMap(([name, value]) => {
    const key = parent + name;
    return typeof value === 'string' ? [[key, value]] : flatten(value, key + '.');
  });
}

const pluralSuffix = /_(zero|one|two|few|many|other)$/;
const parameters = message => [...message.matchAll(/{{\s*(\w+)/g)].map(match => match[1]).sort();

test('Admin catalogs cover the English keys with matching variables and local plural forms', () => {
  const english = Object.fromEntries(flatten(resources.en[namespace]));

  for (const [language, resource] of Object.entries(resources)) {
    const catalog = Object.fromEntries(flatten(resource[namespace]));
    const pluralCategories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
    const expected = new Set();

    for (const [key, value] of Object.entries(english)) {
      if (pluralSuffix.test(key) && !key.endsWith('_other')) continue;
      const keys = key.endsWith('_other')
        ? pluralCategories.map(category => key.replace(pluralSuffix, '_' + category))
        : [key];

      for (const translationKey of keys) {
        expected.add(translationKey);
        assert.ok(catalog[translationKey], `${language} is missing ${translationKey}`);
        assert.deepEqual(parameters(catalog[translationKey]), parameters(value), `${language}: ${translationKey}`);
      }
    }

    assert.deepEqual(new Set(Object.keys(catalog)), expected, language);
  }
});

test('Admin translations switch languages, interpolate plural counts, and fall back to English', async () => {
  const instance = i18next.createInstance();
  await instance.init({ lng: 'en', fallbackLng: 'en', resources, defaultNS: namespace });

  assert.equal(instance.t('reviews.title'), 'Reviews');
  await instance.changeLanguage('pl');
  assert.equal(instance.t('reviews.title'), 'Opinie');
  assert.equal(instance.t('products.variantCount', { count: 1 }), '1 wariant');
  assert.equal(instance.t('products.variantCount', { count: 2 }), '2 warianty');
  assert.equal(instance.t('products.variantCount', { count: 5 }), '5 wariantów');
  assert.equal(instance.t('products.variantCount', { count: 1.5 }), '1,5 wariantu');
  await instance.changeLanguage('nl');
  assert.equal(instance.t('coupons.title'), 'Unieke kortingscodes');
  await instance.changeLanguage('de');
  assert.equal(instance.t('coupons.title'), 'Unique coupon codes');
});
