import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
);

function workflowFiles() {
  const workflowDir = path.resolve(__dirname, '../../.github/workflows');
  return fs
    .readdirSync(workflowDir)
    .filter((name) => name.endsWith('.yml'))
    .map((name) => path.join(workflowDir, name));
}

// The GitHub workflows invoke package scripts by name (e.g. the Release
// workflow's "pnpm run publish:aws"). A script that is referenced but missing
// from the package.json makes the workflow fail, which in the case of the
// Release workflow means that release artifacts are never published. This
// happened for the v4.7.9 and v4.7.10 releases (see issue #2170).
describe('workflows', () => {
  it('should only reference package scripts that exist', () => {
    const referencedScripts = new Set();

    for (const file of workflowFiles()) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const match of content.matchAll(/(?:npm|pnpm) run ([a-z:]+)/g)) {
        referencedScripts.add(match[1]);
      }
    }

    // Sanity check: the Release workflow is expected to publish to AWS S3.
    expect(referencedScripts).toContain('publish:aws');

    for (const scriptName of referencedScripts) {
      expect(pkg.scripts, `missing script "${scriptName}"`).toHaveProperty(
        scriptName
      );
    }
  });
});
