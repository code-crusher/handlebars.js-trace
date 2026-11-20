/* eslint-disable no-console */
import fs from 'fs';
import { execFile } from 'child_process';
import semver from 'semver';
import * as git from './util/git.js';

export const JSR_MANIFEST = 'jsr.json';

/**
 * The package name under which Handlebars is published on https://jsr.io.
 *
 * JSR requires every package to live in a scope ("@scope/name"). The
 * "@handlebars" scope mirrors the "@handlebars/parser" npm scope that the
 * project already uses for its parser dependency.
 */
export const JSR_PACKAGE_NAME = '@handlebars/handlebars';

/**
 * Runs `jsr publish` for this repository.
 *
 * A version is only published when the commit is tagged with a valid version
 * tag (the same trigger that is used for the npm and AWS S3 publications).
 * Without a tag, this is a no-op, so that the job can run on every commit
 * without failing.
 *
 * Publishing is done without an API token: when run from GitHub Actions with
 * the `id-token: write` permission, the CLI authenticates via OIDC, which
 * lets JSR generate a provenance attestation that ties the published package
 * to this repository and the exact build that produced it. See
 * https://jsr.io/docs/publishing-packages
 */
async function main() {
  const commitInfo = await git.commitInfo();
  console.log('tag: ', commitInfo.tagName);

  const version = getVersionToPublish(commitInfo);
  if (version == null) {
    console.log('No version tag found. Nothing to publish to JSR.');
    return;
  }

  console.log(`Publishing ${JSR_PACKAGE_NAME}@${version} to JSR`);
  await publish({ version, dryRun: false });
}

/**
 * Returns the version that should be published for the given commit, or null
 * if the commit does not carry a (valid) version tag.
 *
 * The tag is expected to match the version in the jsr.json manifest, as it is
 * set by `tasks/version.js`. A tag that does not match is an error, so that a
 * forgotten manifest update cannot publish a wrong version.
 */
export function getVersionToPublish(commitInfo) {
  const tagName = commitInfo.tagName;
  if (tagName == null || !semver.valid(tagName)) {
    return null;
  }

  // Version tags are "v"-prefixed ("v4.7.0") while the manifest contains the
  // plain version. Strip only the prefix: semver.coerce() would also drop
  // prerelease identifiers like "-alpha.1".
  const version = semver.clean(tagName, { loose: false });
  const manifest = readManifest();
  assertManifestVersion(manifest, version, 'version tag "' + tagName + '"');

  return version;
}

/**
 * Publishes (or, with `options.dryRun`, validates) the package on JSR.
 *
 * `jsr publish` performs all checks and uploads the files that are listed in
 * the manifest. It fails if the version already exists on the registry.
 */
export async function publish(options) {
  const args = ['publish'];

  if (options.dryRun) {
    args.push('--dry-run');
  }

  // The working tree is not necessarily clean when publishing from a release
  // job, because the checkout may contain the lockfile-dependent files that
  // the job itself has (re)generated. The tag has already been verified
  // against the manifest version, so the content is known to be the
  // released one.
  args.push('--allow-dirty');

  return runJsrCli(args);
}

/**
 * Reads and returns the jsr.json manifest.
 */
export function readManifest() {
  return JSON.parse(fs.readFileSync(JSR_MANIFEST, 'utf8'));
}

export function assertManifestVersion(manifest, version, description) {
  const manifestVersion = manifest.version;
  if (manifestVersion !== version) {
    throw new Error(
      `The ${description} does not match the version in ${JSR_MANIFEST}: ` +
        `"${version}" vs "${manifestVersion}". ` +
        'Did you forget to update jsr.json?'
    );
  }
}

function runJsrCli(args) {
  return new Promise((resolve, reject) =>
    execFile('npx', ['jsr', ...args], (err, stdout, stderr) => {
      if (stdout.trim().length > 0) {
        console.log(stdout);
      }
      // The underlying `deno publish` writes its progress output to stderr.
      if (stderr.trim().length > 0) {
        console.log(stderr);
      }
      if (err != null) {
        return reject(
          new Error(`"jsr ${args.join(' ')}" caused error: ${err.message}`)
        );
      }
      // The deno CLI's output is not consistently assigned to one stream, so
      // both are returned to the caller.
      resolve(stdout + stderr);
    })
  );
}

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
