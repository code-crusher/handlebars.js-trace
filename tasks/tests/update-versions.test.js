import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { spawnSync } from 'child_process';
import * as git from '../util/git.js';
import { updateVersions } from '../update-versions.js';

const tmpBaseDir = path.join(os.tmpdir(), 'handlebars-task-tests');
const tmpDir = path.join(tmpBaseDir, Date.now().toString(36));
const oldCwd = process.cwd();
const gitInstalled = spawnSync('git', ['-v'], { stdio: 'ignore' }).status === 0;

const VERSION_FILES = {
  'package.json': JSON.stringify(
    {
      name: 'handlebars',
      version: '5.0.0-alpha.1',
    },
    null,
    2
  ),
  'lib/handlebars/base.js': `
export const VERSION = '4.7.7';
export const COMPILER_REVISION = 8;
`,
  'components/bower.json': JSON.stringify(
    {
      name: 'handlebars',
      version: '5.0.0-alpha.1',
    },
    null,
    2
  ),
  'components/package.json': JSON.stringify(
    {
      name: 'handlebars',
      version: '5.0.0-alpha.1',
    },
    null,
    2
  ),
  'components/handlebars.js.nuspec': `<?xml version="1.0"?>
<package>
	<metadata>
		<id>handlebars.js</id>
		<version>5.0.0-alpha.1</version>
	</metadata>
</package>
`,
};

describe.runIf(gitInstalled)('tasks/update-versions', function () {
  beforeEach(async function () {
    await fs.remove(tmpDir);
    await fs.mkdirp(path.join(tmpDir, 'lib/handlebars'));
    await fs.mkdirp(path.join(tmpDir, 'components'));
    process.chdir(tmpDir);

    for (const [file, content] of Object.entries(VERSION_FILES)) {
      await fs.writeFile(file, content);
    }

    await git.git('init');
    await git.git('config', 'user.email', 'test@test.com');
    await git.git('config', 'user.name', 'Test');
    for (const file of Object.keys(VERSION_FILES)) {
      await git.add(file);
    }
    await git.commit('initial commit');
  });

  afterEach(function () {
    process.chdir(oldCwd);
  });

  describe('the "updateVersions"-function', function () {
    it('should update the version in all files', async function () {
      const changed = await updateVersions('5.0.0');

      expect(changed.sort()).toEqual(Object.keys(VERSION_FILES).sort());
      expect(getVersion('package.json')).toBe('5.0.0');
      expect(getVersion('lib/handlebars/base.js')).toBe('5.0.0');
      expect(getVersion('components/bower.json')).toBe('5.0.0');
      expect(getVersion('components/package.json')).toBe('5.0.0');
      expect(getVersion('components/handlebars.js.nuspec')).toBe('5.0.0');
    });

    it('should sync a stale VERSION constant to the new version', async function () {
      // lib/handlebars/base.js starts at 4.7.7 (stale) in this test-suite.
      await updateVersions('5.0.0');

      expect(getVersion('lib/handlebars/base.js')).toBe('5.0.0');
    });

    it('should return only the changed files', async function () {
      await updateVersions('5.0.0');
      const changed = await updateVersions('5.0.0');

      // Nothing changed the second time, so no files should be reported.
      expect(changed).toEqual([]);
    });

    it('should reject versions that are not valid semver', async function () {
      await expect(updateVersions('not-a-version')).rejects.toThrow(
        /valid semver version/
      );
      expect(getVersion('package.json')).toBe('5.0.0-alpha.1');
    });

    it('should not commit the changed files by default', async function () {
      await updateVersions('5.0.0');

      const status = await git.status();
      expect(status).toContain('package.json');
    });

    it('should commit the changed files with option commit=true', async function () {
      await updateVersions('5.0.0', { commit: true });

      const status = await git.status();
      expect(status).toEqual([]);
      const log = await git.git('log', '-1', '--pretty=%B');
      expect(log).toMatch(/5\.0\.0/);
    });
  });
});

function getVersion(file) {
  const content = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.nuspec')) {
    return /<version>([^<]*)<\/version>/.exec(content)[1];
  }
  if (file.endsWith('base.js')) {
    return /const VERSION = '([^']*)';/.exec(content)[1];
  }
  return JSON.parse(content).version;
}
