import fs from 'fs';
import { spawnSync } from 'child_process';
import semver from 'semver';
import {
  JSR_PACKAGE_NAME,
  getVersionToPublish,
  publish,
  readManifest,
  assertManifestVersion,
} from '../publish-to-jsr.js';

const manifest = readManifest();

function commitInfoWith(tagName) {
  return { tagName, headSha: 'abc123', masterSha: 'abc123' };
}

describe('jsr manifest', () => {
  it('should be valid JSON with the required fields', () => {
    expect(manifest.name).toBe(JSR_PACKAGE_NAME);
    expect(semver.valid(manifest.version)).toBeTruthy();
    expect(manifest.exports).toBeTruthy();
  });

  it('should point the default export at the library entrypoint', () => {
    expect(manifest.exports['.']).toBe('./lib/index.js');
  });

  it('should point the "./runtime" export at the runtime entrypoint', () => {
    expect(manifest.exports['./runtime']).toBe('./runtime.js');
  });

  it('should declare the same entrypoints as package.json', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    // "./package.json" is an npm-specific convention and is not needed on JSR.
    const pkgExports = Object.keys(pkg.exports).filter(
      (e) => e !== './package.json'
    );
    expect(Object.keys(manifest.exports)).toEqual(
      expect.arrayContaining(pkgExports)
    );
    expect(pkgExports).toEqual(
      expect.arrayContaining(Object.keys(manifest.exports))
    );
  });

  it('should use the same version as package.json', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(manifest.version).toBe(pkg.version);
  });

  it('should not exclude any of the exported entrypoints', () => {
    const excludes = manifest.publish?.exclude ?? [];
    const toRegex = (pattern) =>
      new RegExp(
        '^' +
          pattern
            .split('**')
            .map((part) =>
              part
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '.')
            )
            .join('.*') +
          '$'
      );

    for (const entrypoint of Object.values(manifest.exports)) {
      const excluded = excludes.some((pattern) =>
        toRegex(pattern).test(entrypoint)
      );
      expect(excluded).toBe(false);
    }
  });
});

describe('assertManifestVersion', () => {
  it('should not throw if the versions match', () => {
    expect(() =>
      assertManifestVersion({ version: '5.0.0' }, '5.0.0', 'version tag')
    ).not.toThrow();
  });

  it('should throw if the versions do not match', () => {
    expect(() =>
      assertManifestVersion({ version: '5.0.0' }, '5.0.1', 'version tag')
    ).toThrow('Did you forget to update jsr.json?');
  });
});

describe('getVersionToPublish', () => {
  it('should return the version for a matching version tag', () => {
    const version = manifest.version;
    expect(getVersionToPublish(commitInfoWith(version))).toBe(version);
  });

  it('should accept a "v"-prefixed version tag', () => {
    const version = manifest.version;
    expect(getVersionToPublish(commitInfoWith('v' + version))).toBe(version);
  });

  it('should return null when there is no tag', () => {
    expect(getVersionToPublish(commitInfoWith(null))).toBeNull();
  });

  it('should return null for a tag that is not a valid semver version', () => {
    expect(getVersionToPublish(commitInfoWith('not-semver'))).toBeNull();
  });

  it('should throw when the tag does not match the manifest version', () => {
    const tagName = 'v' + (manifest.version === '9.9.9' ? '1.0.0' : '9.9.9');
    expect(() => getVersionToPublish(commitInfoWith(tagName))).toThrow(
      'Did you forget to update jsr.json?'
    );
  });
});

describe('publish to JSR', () => {
  // `jsr publish --dry-run` runs the real JSR tooling against this repository:
  // it resolves the module graph from the manifest, checks the public API for
  // "slow types" (which verifies that the JavaScript entrypoints reference
  // their type declarations) and lists the files that would be uploaded. It
  // does not upload anything and does not require credentials.
  const jsrInstalled = spawnSync('npx', ['jsr', '--version'], {
    stdio: 'ignore',
  });

  describe('dry-run', () => {
    it.runIf(jsrInstalled.status === 0)(
      'should pass all JSR checks without slow-types warnings',
      async () => {
        const output = await publish({ dryRun: true });

        // The package must simulate successfully...
        expect(output).toContain('Dry run complete');

        // ...and must do so with the correct package name and version.
        expect(output).toContain(JSR_PACKAGE_NAME + '@' + manifest.version);

        // A JavaScript entrypoint without type declarations would produce a
        // "unsupported-javascript-entrypoint" warning here, meaning JSR could
        // neither type check the package nor generate documentation for it.
        expect(output).not.toContain('unsupported-javascript-entrypoint');
        expect(output).not.toContain('error');
      },
      120000
    );

    it('should require a valid package name', () => {
      // JSR only accepts package names in the "@scope/name" form.
      expect(manifest.name).toMatch(/^@[\w-]+\/[\w-]+$/);
    });
  });
});
