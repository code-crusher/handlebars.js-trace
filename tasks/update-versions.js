import fs from 'fs';
import * as git from './util/git.js';
import semver from 'semver';

// The Handlebars version appears in several places that must be kept in sync
// when a new version is released. This module is shared by the release
// process (see `.releaserc.json`) and the `tasks/version.js` script.

const FILES = [
  'package.json',
  'lib/handlebars/base.js',
  'components/bower.json',
  'components/package.json',
  'components/handlebars.js.nuspec',
];

function replaceInFile(filePath, replacementFn) {
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, replacementFn(content));
}

/**
 * Replace all occurrences of the current version with the given next version.
 *
 * Version-like values are replaced even if they do not exactly match the
 * current version in `package.json`, so that stray outdated values (for
 * example a stale `VERSION` in `lib/handlebars/base.js`) are synced as well.
 *
 * @param {string} nextVersion the new version (e.g. '5.0.0' or '5.0.0-beta.2')
 * @param {object} [options]
 * @param {boolean} [options.commit=false] commit the changed files with a
 *   message containing the new version
 * @returns {Promise<string[]>} the paths of the files that have changed
 */
export async function updateVersions(nextVersion, options = {}) {
  const { commit = false } = options;

  if (!semver.valid(nextVersion)) {
    throw new Error(
      'Must provide a valid semver version (e.g.: 5.0.0):\n\t' + nextVersion
    );
  }

  const originalContents = new Map(
    FILES.map((file) => [file, fs.readFileSync(file, 'utf8')])
  );

  replaceInFile('package.json', (content) => {
    const pkg = JSON.parse(content);
    pkg.version = nextVersion;
    return JSON.stringify(pkg, null, 2) + '\n';
  });
  replaceInFile('lib/handlebars/base.js', (content) =>
    content.replace(
      /const VERSION = ['"].*['"];/,
      `const VERSION = '${nextVersion}';`
    )
  );
  replaceInFile('components/bower.json', (content) =>
    content.replace(/("version":\s*")[^"]*(")/, `$1${nextVersion}$2`)
  );
  replaceInFile('components/package.json', (content) =>
    content.replace(/("version":\s*")[^"]*(")/, `$1${nextVersion}$2`)
  );
  replaceInFile('components/handlebars.js.nuspec', (content) =>
    content.replace(/(<version>)[^<]*(<\/version>)/, `$1${nextVersion}$2`)
  );

  // Only stage and report the files that actually changed.
  const changed = [];
  for (const file of FILES) {
    if (fs.readFileSync(file, 'utf8') !== originalContents.get(file)) {
      changed.push(file);
      await git.add(file);
    }
  }

  if (commit && changed.length > 0) {
    await git.commit(`chore(release): ${nextVersion}`);
  }

  return changed;
}

import { fileURLToPath } from 'url';

// Usage: node tasks/update-versions.js <version> (used by the
// "@semantic-release/exec" plugin, see `.releaserc.json`)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateVersions(process.argv[2]).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
