// The admin extensions are bundled into the host's Medusa dashboard, so the plugin's peer ranges for
// the packages the dashboard ships must accept the versions the dashboard actually depends on.
// Otherwise `npm install` fails with ERESOLVE (or pnpm/yarn install a second copy next to it).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import semver from 'semver';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const fromMedusa = createRequire(require.resolve('@medusajs/medusa/package.json'));
const fromBundler = createRequire(fromMedusa.resolve('@medusajs/admin-bundler/package.json'));
const dashboard = JSON.parse(readFileSync(fromBundler.resolve('@medusajs/dashboard/package.json'), 'utf8'));

for (const name of ['@medusajs/ui', 'react-router-dom', '@tanstack/react-query']) {
  test(`peer ${name} accepts the version @medusajs/dashboard@${dashboard.version} ships`, () => {
    const shipped = dashboard.dependencies[name];
    const range = pkg.peerDependencies[name];
    assert.ok(semver.satisfies(shipped, range), `${name}@${shipped} does not satisfy "${range}"`);
  });
}

// Medusa >= 2.19 moved the dashboard to react-router-dom 7 and @medusajs/ui 4.2.x.
test('peer ranges accept the dashboard dependencies of Medusa 2.21.2', () => {
  assert.ok(semver.satisfies('7.18.2', pkg.peerDependencies['react-router-dom']));
  assert.ok(semver.satisfies('4.2.6', pkg.peerDependencies['@medusajs/ui']));
});
