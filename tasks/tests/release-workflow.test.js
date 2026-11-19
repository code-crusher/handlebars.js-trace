const fs = require('fs');
const path = require('path');
const chai = require('chai');
chai.use(require('dirty-chai'));

const expect = chai.expect;

describe('release workflow', function () {
  // The Release workflow (".github/workflows/release.yml") publishes builds to
  // the AWS S3 bucket on every push to master and on every tag. It invokes npm
  // scripts by name, so a script that is missing from the package.json makes
  // the whole workflow fail and the release artifacts are never published.
  // This happened for the v4.7.9 and v4.7.10 releases (see #2170).
  const workflowFile = path.join(
    __dirname,
    '../../.github/workflows/release.yml'
  );
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
  );

  function npmScriptsInWorkflow() {
    const workflow = fs.readFileSync(workflowFile, 'utf-8');
    const scriptNames = [];
    const pattern = /npm run ([a-z:]+)/g;
    let match;
    while ((match = pattern.exec(workflow)) !== null) {
      if (!scriptNames.includes(match[1])) {
        scriptNames.push(match[1]);
      }
    }
    return scriptNames;
  }

  it('should only reference npm scripts that exist', function () {
    const scriptNames = npmScriptsInWorkflow();

    // Sanity check: the workflow is expected to run at least one npm script.
    expect(scriptNames).to.contain('publish:aws');

    for (const scriptName of scriptNames) {
      expect(packageJson.scripts, `missing script "${scriptName}"`)
        .to.have.property(scriptName)
        .that.is.a('string');
    }
  });
});
