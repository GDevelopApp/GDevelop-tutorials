// @ts-check
const shell = require('shelljs');
const dree = require('dree');
const path = require('path');
const fs = require('fs').promises;
const { InAppTutorial } = require('./lib/InAppTutorial');
const { loadGDevelopCoreAndExtensions } = require('./lib/GDevelopCoreLoader');
const { loadSerializedProject } = require('./lib/LocalProjectOpener');
const {
  readFileTree,
  enhanceFileTreeWithParsedContent,
  getAllFiles,
  getAllTemplateFiles,
} = require('./lib/FileTreeParser');
const { writeProjectJSONFile } = require('./lib/LocalProjectWriter');
const args = require('minimist')(process.argv.slice(2));

/** @typedef {import("./types").InAppTutorialShortHeader} InAppTutorialShortHeader */
/** @typedef {import("./types").libGDevelop} libGDevelop */
/** @typedef {import('./types').gdProject} gdProject */

if (!args['gdevelop-root-path']) {
  shell.echo(
    '❌ You must pass --gdevelop-root-path with the path to GDevelop repository with `npm install` ran in `newIDE/app`.'
  );
  shell.exit(1);
}

const distPath = path.join(__dirname, '../dist');
const gdevelopRootPath = path.resolve(
  process.cwd(),
  args['gdevelop-root-path']
);

const tutorialsSourceRootPath = path.join(__dirname, '../tutorials');
const inAppTutorialsSourceRootPath = path.join(
  tutorialsSourceRootPath,
  'in-app'
);
const inAppTutorialsDestinationRootPath = path.join(distPath, 'tutorials', 'in-app');
const tutorialsDatabasePath = path.join(distPath, 'database');

const templatesSourceRootPath = path.join(__dirname, '../templates');
const templatesDestinationRootPath = path.join(
  distPath,
  'tutorials',
  'in-app',
  'templates'
);

/** @param {string} fileOrFolderPath */
const normalizePathSeparators = (fileOrFolderPath) => {
  return fileOrFolderPath.replace(/\\/g, '/');
};

/**
 * Generate the URL used after deployment for a file in the templates folder.
 * @param {string} filePath
 */
const getResourceUrl = (filePath) => {
  const relativeFilePath = normalizePathSeparators(
    path.relative(templatesDestinationRootPath, filePath)
  );
  return `https://resources.gdevelop-app.com/in-app-tutorials/${relativeFilePath}`;
};

const generateFolderStructure = () => {
  // Clean current folders
  shell.rm('-rf', inAppTutorialsDestinationRootPath);
  shell.rm('-rf', tutorialsDatabasePath);

  // Recreate destination folders
  shell.mkdir('-p', inAppTutorialsDestinationRootPath);
  shell.mkdir('-p', tutorialsDatabasePath);

  // Copy templates in destination folders
  shell.cp('-r', templatesSourceRootPath, templatesDestinationRootPath);
};

/**
 *
 * @param {libGDevelop} gd
 * @param {gdProject} project
 * @param {string} baseUrl
 */
const updateResources = (gd, project, baseUrl) => {
  const worker = new gd.ArbitraryResourceWorkerJS(
    project.getResourcesManager()
  );
  /** @param {string} file */
  worker.exposeImage = (file) => {
    // Don't do anything
    return file;
  };
  /** @param {string} shader */
  worker.exposeShader = (shader) => {
    // Don't do anything
    return shader;
  };
  /** @param {string} file */
  worker.exposeFile = (file) => {
    if (file.length === 0) return '';
    return baseUrl + '/' + file;
  };

  gd.ResourceExposer.exposeWholeProjectResources(project, worker);
};

/**
 * Update the template game files to use resources on resources.gdevelop-app.com
 * @returns {Promise<{errors: Error[]}>}
 */
const updateTemplateFiles = async () => {
  const loadedGDevelop = await loadGDevelopCoreAndExtensions({
    gdevelopRootPath,
  });
  const { gd } = loadedGDevelop;
  if (!gd || loadedGDevelop.errors.length) {
    console.error(
      'Unable to load GDevelop core and the extensions:',
      loadedGDevelop.errors
    );
    shell.exit(1);
  }
  console.info(
    'Loaded GDevelop and extensions',
    loadedGDevelop.extensionLoadingResults
  );

  /** @type {Error[]} */
  const errors = [];
  console.info('updating template files.');

  const fileTree = await readFileTree(templatesDestinationRootPath);
  if (!fileTree) throw new Error('Expected fileTree not to be null');

  const enhancedTree = await enhanceFileTreeWithParsedContent(fileTree);
  const { fileTreeWithParsedContent } = enhancedTree;
  if (enhancedTree.errors.length) {
    console.error(
      'There were errors while parsing templates files:',
      enhancedTree.errors
    );
    console.info('Aborting because of these errors.');
    shell.exit(1);
  }

  const allFiles = getAllFiles(fileTreeWithParsedContent);
  const allTemplateFiles = getAllTemplateFiles(allFiles);

  await Promise.all(
    allTemplateFiles.map(async (fileWithParsedContent) => {
      const projectObject = fileWithParsedContent.parsedContent;
      if (!projectObject) {
        errors.push(
          new Error(
            `Expected valid JSON content in ${fileWithParsedContent.path}.`
          )
        );
        return;
      }

      const project = loadSerializedProject(gd, projectObject);
      const gameFolderPath = path.dirname(fileWithParsedContent.path);
      updateResources(gd, project, getResourceUrl(gameFolderPath));

      try {
        await writeProjectJSONFile(gd, project, fileWithParsedContent.path);
      } catch (error) {
        errors.push(
          new Error(
            `Error while writing the updated project file at ${fileWithParsedContent.path}: ` +
              error
          )
        );
      }
    })
  );

  return { errors };
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

/**
 * @param {Array<InAppTutorial>} inAppTutorials
 */
const processAndWriteInAppTutorials = (inAppTutorials) => {
  inAppTutorials.forEach((inAppTutorial) => {
    inAppTutorial.processFlowMetaSteps();
  });
  inAppTutorials.forEach((inAppTutorial) => {
    fs.writeFile(
      path.join(
        inAppTutorialsDestinationRootPath,
        path.basename(inAppTutorial.sourcePath)
      ),
      inAppTutorial.toString()
    );
  });
};

const processInAppTutorials = async () => {
  const inAppTutorials = await readInAppTutorials(inAppTutorialsSourceRootPath);
  processAndWriteInAppTutorials(inAppTutorials);
  buildAndWriteInAppTutorialsDatabase(tutorialsDatabasePath, inAppTutorials);
};

/**
 * Discover all tutorials and extract information from them.
 */
(async () => {
  try {
    generateFolderStructure();
    await updateTemplateFiles();
    await processInAppTutorials();
    console.info('✅ Tutorials were successfully generated.');
    console.info(
      'ℹ️  Make sure you run the command \x1b[1mnpm run check-post-build\x1b[0m'
    );
  } catch (error) {
    console.error('The script errored', error);
    shell.exit(1);
  }
})();
