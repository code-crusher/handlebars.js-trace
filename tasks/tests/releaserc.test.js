import fs from 'fs';
import { spawnSync } from 'child_process';

const gitInstalled = spawnSync('git', ['-v'], { stdio: 'ignore' }).status === 0;

describe('release configuration (.releaserc.json)', function () {
  const releaserc = JSON.parse(fs.readFileSync('.releaserc.json', 'utf8'));
  const plugins = Object.fromEntries(
    releaserc.plugins.map((plugin) =>
      Array.isArray(plugin) ? [plugin[0], plugin[1]] : [plugin, {}]
    )
  );

  it('should publish from the master branch with the v-prefix tag format', function () {
    expect(releaserc.branches).toContain('master');
    expect(releaserc.tagFormat).toBe('v${version}');
  });

  it('should release for fix, feat, perf and breaking changes', function () {
    const analyzer =
      plugins['@semantic-release/commit-analyzer']['releaseRules'] || [];
    const releases = analyzer.map((rule) => rule.release);
    expect(releases).toEqual(['major', 'minor', 'patch', 'patch']);
  });

  it('should commit the version files, the changelog and the build', function () {
    const assets = plugins['@semantic-release/git']['assets'];
    expect(assets).toContain('package.json');
    expect(assets).toContain('lib/handlebars/base.js');
    expect(assets).toContain('release-notes.md');
    expect(assets).toContain('components/bower.json');
  });

  it('should update all versions via the update-versions task', function () {
    const { prepareCmd } = plugins['@semantic-release/exec'];
    expect(prepareCmd).toMatch(
      /^node tasks\/update-versions\.js \$\{nextRelease\.version\}/
    );
  });

  it('should write release notes into release-notes.md', function () {
    const { changelogFile } = plugins['@semantic-release/changelog'];
    expect(changelogFile).toBe('release-notes.md');
  });

  describe.runIf(gitInstalled)('the version-update commit', function () {
    // The `@semantic-release/git` plugin creates a release commit with a
    // conventional-commit message, so the next release can build on it.
    it('should use a conventional-commit message with [skip ci]', function () {
      const message = plugins['@semantic-release/git']['message'];
      expect(message).toBe('chore(release): ${nextRelease.version} [skip ci]');
    });
  });
});
