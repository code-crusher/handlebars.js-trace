import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { updateVersions } from './update-versions.js';

/**
 * Set the Handlebars version in all places (package.json, the `VERSION`
 * constant and the component metadata files) and rebuild.
 *
 * The changes are not committed. The semantic-release process (see
 * `.releaserc.json`) commits them via the `@semantic-release/git` plugin.
 *
 * Usage:
 *   node tasks/version.js <version>   e.g.: node tasks/version.js 5.0.0
 */
async function main() {
  await updateVersions(process.argv[2]);
  execSync('pnpm run build', { stdio: 'inherit' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
