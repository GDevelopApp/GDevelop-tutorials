// @ts-check
const shell = require('shelljs');
const dree = require('dree');
const path = require('path');
const fs = require('fs').promises;
const { InAppTutorial } = require('./lib/InAppTutorial');

/**
 * @typedef {import("./types").InAppTutorialShortHeader} InAppTutorialShortHeader
 */

const tutorialsSourceRootPath = path.join(__dirname, '../tutorials');
const inAppTutorialsSourceRootPath = path.join(
  tutorialsSourceRootPath,
  'in-app'
);
const distPath = path.join(__dirname, '../dist');
const databasePath = path.join(distPath, 'database');
const inAppTutorialsDestinationRootPath = path.join(distPath, 'tutorials');

const generateFolderStructure = () => {
  // Clean current folders
  shell.rm('-rf', databasePath);

  // Recreate destination folders
  shell.mkdir('-p', inAppTutorialsDestinationRootPath);
  shell.mkdir('-p', databasePath);

  // Copy tutorials in destination folders
  shell.cp(
    '-r',
    inAppTutorialsSourceRootPath,
    inAppTutorialsDestinationRootPath
  );
};

/**
 * @param {string} path
 * @returns {Promise<Array<InAppTutorial>>}
 */
const readInAppTutorials = async (path) => {
  const fileTree = await dree.scanAsync(path, {
    stat: false,
    normalize: true,
    followLinks: true,
    size: false,
    hash: false,
    exclude: [],
    extensions: ['json'],
  });
  const { children: inAppTutorialsPaths } = fileTree;
  if (!inAppTutorialsPaths || inAppTutorialsPaths.length === 0) {
    throw new Error(`No in app tutorials found in ${path}`);
  }
  const inAppTutorials = inAppTutorialsPaths.map(
    (file) => new InAppTutorial(file.path)
  );
  return inAppTutorials;
};

/**
 *
 * @param {string} databasePath
 * @param {Array<InAppTutorial>} inAppTutorials
 */
const buildAndWriteInAppTutorialsDatabase = (databasePath, inAppTutorials) => {
  const inAppTutorialShortHeadersPath = path.join(
    databasePath,
    'inAppTutorialShortHeaders.json'
  );
  const inAppTutorialShortHeaders = inAppTutorials.map((inAppTutorial) => {
    const inAppTutorialShortHeader = inAppTutorial.buildShortHeader();
    return inAppTutorialShortHeader;
  });
  fs.writeFile(
    inAppTutorialShortHeadersPath,
    JSON.stringify(inAppTutorialShortHeaders)
  );
};

const processInAppTutorials = async () => {
  const inAppTutorials = await readInAppTutorials(inAppTutorialsSourceRootPath);
  buildAndWriteInAppTutorialsDatabase(databasePath, inAppTutorials);
};

/**
 * Discover all tutorials and extract information from them.
 */
(async () => {
  generateFolderStructure();
  await processInAppTutorials();
})();
