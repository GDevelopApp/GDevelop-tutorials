// @ts-check
/**
 * Checks that every DOM selector used by the in-app tutorials still exists in
 * the GDevelop editor sources (newIDE/app/src). This catches the most common
 * way tutorials break: an id is renamed or removed in the editor.
 *
 * Usage: node scripts/check-in-app-tutorial-selectors.js --gdevelop-root-path ../GDevelop
 * Options:
 * - --ignore <id1,id2>: tutorial ids to skip (known broken tutorials).
 */
const shell = require('shelljs');
const path = require('path');
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2));
const { checkTutorial } = require('./lib/InAppTutorialSelectorChecker');
const { InAppTutorial } = require('./lib/InAppTutorial');

const inAppTutorialsPath = path.join(__dirname, '../tutorials/in-app');

const findGDevelopRootPath = () => {
  if (args['gdevelop-root-path']) {
    return path.resolve(process.cwd(), args['gdevelop-root-path']);
  }
  // Default locations: a GDevelop checkout inside this repository (as done in
  // CI) or next to it.
  const candidates = [
    path.join(__dirname, '../GDevelop'),
    path.join(__dirname, '../../GDevelop'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'newIDE/app/src'))) {
      return candidate;
    }
  }
  shell.echo(
    '❌ Could not find a GDevelop checkout. Pass --gdevelop-root-path with the path to the GDevelop repository.'
  );
  shell.exit(1);
  return '';
};

/**
 * Concatenates all source files of newIDE/app/src into one string, used for
 * substring checks.
 * @param {string} sourcePath
 * @returns {string}
 */
const readSourceBlob = (sourcePath) => {
  /** @type {string[]} */
  const chunks = [];
  const walk = (/** @type {string} */ directoryPath) => {
    for (const entry of fs.readdirSync(directoryPath, {
      withFileTypes: true,
    })) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(entryPath);
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        chunks.push(fs.readFileSync(entryPath, 'utf8'));
      }
    }
  };
  walk(sourcePath);
  return chunks.join('\n');
};

const gdevelopRootPath = findGDevelopRootPath();
const sourcePath = path.join(gdevelopRootPath, 'newIDE/app/src');
if (!fs.existsSync(sourcePath)) {
  shell.echo(`❌ ${sourcePath} does not exist.`);
  shell.exit(1);
}

shell.echo(`ℹ️  Reading editor sources from ${sourcePath}...`);
const sourceBlob = readSourceBlob(sourcePath);

const tutorialFileNames = fs
  .readdirSync(inAppTutorialsPath)
  .filter((fileName) => fileName.endsWith('.json'));

const ignoredTutorialIds = new Set(
  typeof args['ignore'] === 'string'
    ? args['ignore'].split(',').filter(Boolean)
    : []
);

let totalProblemsCount = 0;
let checkedTutorialsCount = 0;
for (const fileName of tutorialFileNames) {
  if (ignoredTutorialIds.has(path.basename(fileName, '.json'))) {
    shell.echo(`⚠️ ${fileName} skipped (known broken tutorial).`);
    continue;
  }
  checkedTutorialsCount++;
  // Load through InAppTutorial to expand meta steps ("add-behavior",
  // "launch-preview"...) the same way they are expanded at deploy time.
  const tutorial = new InAppTutorial(path.join(inAppTutorialsPath, fileName));
  tutorial.processFlowMetaSteps();
  const problems = checkTutorial(tutorial, sourceBlob);
  if (problems.length === 0) {
    shell.echo(`✅ ${fileName}`);
  } else {
    shell.echo(`❌ ${fileName}:`);
    for (const problem of problems) {
      const location =
        problem.stepIndex !== null ? `step ${problem.stepIndex}` : 'tutorial';
      shell.echo(
        `   - ${location}, ${problem.field} = "${problem.selector}": ${problem.reason}`
      );
    }
    totalProblemsCount += problems.length;
  }
}

if (totalProblemsCount > 0) {
  shell.echo(
    `\n❌ ${totalProblemsCount} problem(s) found. These selectors will prevent tutorial steps from being triggered or highlighted in the editor.`
  );
  shell.exit(1);
}
shell.echo(`\n✅ All ${checkedTutorialsCount} checked tutorials passed.`);
