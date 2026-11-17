# How to Contribute

## Reporting Security Issues

Please refer to our [Security Policy](https://github.com/handlebars-lang/handlebars.js/blob/master/SECURITY.md).

## Reporting Issues

Please refer to our [FAQ](https://github.com/handlebars-lang/handlebars.js/blob/master/FAQ.md) for common issues that people run into.

Should you run into other issues with the project, please don't hesitate to let us know by filing an [issue][issue]!

In general, we are going to ask for an **example** of the problem failing, which can be as simple as a jsfiddle/jsbin/etc. We've put together a jsfiddle **[template][jsfiddle]** to ease this. (We will keep this link up to date as new releases occur, so feel free to check back here).

Pull requests containing only failing tests demonstrating the issue are welcomed and this also helps ensure that your issue won't regress in the future once it's fixed.

Documentation issues on the [handlebarsjs.com](https://handlebarsjs.com) site should be reported on [handlebars-lang/docs](https://github.com/handlebars-lang/docs).

## Branches

- The branch `master` contains the current development version (v5).
- The branch `4.x` contains the previous stable version. Only critical bugfixes are backported there.

## Pull Requests

We also accept [pull requests][pull-request]!

Generally we like to see pull requests that

- Maintain the existing code style
- Are focused on a single change (i.e. avoid large refactoring or style adjustments in untouched code if not the primary goal of the pull request)
- Have [good commit messages](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
- Have tests
- Don't significantly decrease the current code coverage (see coverage/lcov-report/index.html)

## Building

To build Handlebars.js you'll need Node.js installed.

Before building, you need to make sure that the Git submodule `spec/mustache` is included (i.e. the directory `spec/mustache` should not be empty). To include it, if using Git version 1.6.5 or newer, use `git clone --recursive` rather than `git clone`. Or, if you already cloned without `--recursive`, use `git submodule update --init`.

This project uses [pnpm](https://pnpm.io/) as its package manager (the required version is pinned in the `packageManager` field of `package.json`). The easiest way to get the right version is via [Corepack](https://nodejs.org/api/corepack.html), which ships with Node.js: run `corepack enable` once, and pnpm commands will automatically use the pinned version.

> **Note:** While Handlebars itself supports Node.js >=20 at runtime (see `engines` in `package.json`), the development tooling requires a newer Node.js for the pinned pnpm version: pnpm 11 requires Node.js >=22.13. Use Node.js 22.13 or later when building and testing locally.

Project dependencies may be installed via `pnpm install`.

To build Handlebars.js from scratch, run `pnpm run build` in the root of the project. That will compile CJS modules via SWC and bundle UMD distributions via rspack, outputting results to the dist/ folder. To run tests, use `pnpm test`.

If you notice any problems, please report them to the GitHub issue tracker at
[http://github.com/handlebars-lang/handlebars.js/issues](http://github.com/handlebars-lang/handlebars.js/issues).

## Running Tests

To run tests locally, first install all dependencies.

```sh
pnpm install
```

Clone the mustache specs into the spec/mustache folder.

```sh
cd spec
rm -r mustache
git clone https://github.com/mustache/spec.git mustache
```

From the root directory, run the tests.

```sh
pnpm test
```

## Linting and Formatting

Handlebars uses `oxlint` for linting, `oxfmt` for formatting, and `eslint` (with `eslint-plugin-compat`) for browser API compatibility checks.
Committed files are linted and formatted in a pre-commit hook.

You can use the following scripts to make sure that the CI job does not fail:

- **pnpm run lint** will run all linters and fail on warnings
- **pnpm run format** will format all files
- **pnpm run check-before-pull-request** will perform all checks that our CI job does, excluding integration tests.
- **pnpm run test:integration** will run integration tests (bundler compatibility with webpack, rollup, etc.)
  These tests only work on Linux.

## Commits and Versioning

This project uses [semantic-release](https://github.com/semantic-release/semantic-release)
to automate versioning and the release process (see [#1676](https://github.com/handlebars-lang/handlebars.js/issues/1676)).
The version number, the `CHANGELOG` entries and the GitHub release are determined
automatically from the commit messages, following the
[Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<type>: feat, fix, perf, refactor, docs, style, test, build, ci, chore, revert
<scope>: optional, e.g. parser, compiler, runtime, cli
```

- `feat` triggers a new minor release, `fix`/`perf` a patch release, and `BREAKING CHANGE` (in the commit body or as `!` after the type) a major release.
- All other types (`docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`) do not trigger a release.
- Since only the commit messages determine the version, please write them carefully. Use [Semantic Pull Requests](https://github.com/zeke/semantic-pull-requests) as a guide for PR titles as well (the PR title becomes the merge commit message).

## Keeping dependencies up-to-date

Dependency updates are automated:

- [Renovate](https://github.com/apps/renovate) keeps the lockfile and version ranges up-to-date (see [`renovate.json`](renovate.json)). It is configured to update minor and patch updates automatically; major updates are opened as regular pull requests.
- [Renovate Approve](https://github.com/apps/renovate-approve) and [Renovate Merge](https://github.com/apps/merge) approve and merge Renovate pull requests that pass CI, applying the appropriate conventional-commit type (`fix` for production updates, `chore` otherwise).
- Since Renovate's merge commits are conventional commits, they flow through the semantic-release pipeline, so dependency updates which pass CI are released without manual effort.

## Releasing the latest version

Releases are fully automated via [semantic-release](https://github.com/semantic-release/semantic-release).
When changes with conventional-commit messages (see above) are pushed or merged into the `master` branch,
the ["Semantic Release" GitHub workflow](.github/workflows/semantic-release.yml):

1. determines the next version from the commit messages,
2. applies it to all places where the version occurs (see `tasks/update-versions.js`),
3. writes the release notes into [release-notes.md](release-notes.md) and commits all these changes,
4. publishes the release to npm and creates a GitHub release with the corresponding tag `v<version>`,
5. triggers the ["Release" workflow](.github/workflows/release.yml) to publish the build artifacts to AWS S3.

The npm publishing token and the `GITHUB_TOKEN` are configured in the repository secrets/actions settings.

The npm-package is published with the `release`-script:

```
pnpm run release
```

A manual release (e.g. re-releasing the current version or testing the release configuration locally)
can be performed via the "Semantic Release" workflow (workflow_dispatch), or via:

```
pnpm install --frozen-lockfile
GITHUB_TOKEN=<token> pnpm exec semantic-release
```

Use the `--dry-run` option to preview the version and release notes that would be published.

### What you still need to do after a release

Some places cannot be updated automatically. Please check that the `latest`-tags
in those places still point to the latest version

- [The bower package](https://github.com/components/handlebars.js) (check the package.json)
- [The AWS S3 Bucket](https://s3.amazonaws.com/builds.handlebarsjs.com) (check latest-tag)
- [RubyGems](https://rubygems.org/gems/handlebars-source)

When everything is OK, the **handlebars site** needs to be updated.

Go to the master branch of the repo [handlebars-lang/docs](https://github.com/handlebars-lang/docs/tree/master)
and make a minimal change to the README. This will invoke a github-action that redeploys
the site, fetching the latest version-number from the npm-registry.
(note that the default-branch of this repo is not the master and regular changes are done
in the `handlebars-lang/docs`-repo).

### Releasing a previous major version

_When releasing a previous version of Handlebars, please look into the CONTRIBUTING.md in the corresponding branch._

[generator-release]: https://github.com/walmartlabs/generator-release
[pull-request]: https://github.com/handlebars-lang/handlebars.js/pull/new/master
[issue]: https://github.com/handlebars-lang/handlebars.js/issues/new
[jsfiddle]: https://jsfiddle.net/4nbwjaqz/4/
