// @ts-check
const dree = require('dree');
const fs = require('fs').promises;
const path = require('path');

/** @typedef {{name: string, searchToken: string}} Author */
/** @typedef {{name: string, searchToken: string}} License */
/** @typedef {import('dree').Dree} Dree */
/** @typedef {{parsedContent?: any}} OptionalParsedJSONContent */
/** @typedef {{children?: DreeWithParsedContent[]} & OptionalParsedJSONContent & Dree} DreeWithParsedContent */
/** @typedef {{name: string, children: TagsTreeNode[], allChildrenTags: string[] }} TagsTreeNode */

/**
 * Remove if necessary the BOM character at the beginning of a JSON file content.
 * @param {string} content
 */
const sanitizeJSONContent = (content) => {
  if (content[0] === '\uFEFF') return content.slice(1);

  return content;
};

/**
 * Create a "file tree" by browsing all the files of the specified folder,
 * only listing files with extensions that we know are useful.
 *
 * @param {string} rootPath
 * @returns {Promise<Dree>}
 */
const readFileTree = async (rootPath) => {
  return await dree.scanAsync(rootPath, {
    stat: false,
    normalize: true,
    followLinks: true,
    size: false,
    hash: false,
    extensions: ['png', 'md', 'txt', 'json', 'ttf', 'otf', 'wav', 'aac', 'svg'],
  });
};

/**
 * Browse the specified file tree and add the file content for each project file.
 * @param {Dree} fileTree
 * @returns {Promise<{fileTreeWithParsedContent: DreeWithParsedContent, errors: Error[]}>}
 */
const enhanceFileTreeWithParsedContent = async (fileTree) => {
  /** @type {Error[]} */
  const errors = [];

  /** @type {DreeWithParsedContent[]} */
  const childrenFileTreeWithParsedContent = [];

  /** @type {Object.<string, any>} */
  const parsedContents = {};

  if (fileTree.type === 'directory' && fileTree.children) {
    // Make a first pass on the directory to create the contents of the project files.
    await Promise.all(
      fileTree.children.map(async (childFileTree) => {
        if (
          childFileTree.type === 'file' &&
          childFileTree.name.endsWith('.json')
        ) {
          try {
            const content = await fs.readFile(childFileTree.path, 'utf-8');
            const sanitizedContent = sanitizeJSONContent(content);
            const parsedContent = JSON.parse(sanitizedContent);
            parsedContents[childFileTree.name] = parsedContent;
          } catch (error) {
            errors.push(
              new Error(
                'Unable to read the content of ' +
                  childFileTree.path +
                  ' - is it valid JSON?'
              )
            );
          }
        }
      })
    );

    // Make a second pass to build the tree
    await Promise.all(
      fileTree.children.map(async (childFileTree) => {
        if (childFileTree.type === 'file') {
          childrenFileTreeWithParsedContent.push({
            ...childFileTree,
            parsedContent: parsedContents[childFileTree.name],
            children: [],
          });
        } else {
          const childEnhancedTree = await enhanceFileTreeWithParsedContent(
            childFileTree
          );
          childrenFileTreeWithParsedContent.push(
            childEnhancedTree.fileTreeWithParsedContent
          );
        }
      })
    );
  }

  return {
    fileTreeWithParsedContent: {
      ...fileTree,
      children: childrenFileTreeWithParsedContent,
    },
    errors,
  };
};

/**
 * Get all files of a file tree indexed by their absolute path.
 * @param {DreeWithParsedContent} fileTreeWithMetadata
 * @returns {Object.<string, DreeWithParsedContent>}
 */
const getAllFiles = (fileTreeWithMetadata) => {
  if (fileTreeWithMetadata.type === 'file') {
    return { [fileTreeWithMetadata.path]: fileTreeWithMetadata };
  } else {
    /** @type {Object.<string, DreeWithParsedContent>} */
    let allFiles = {};

    if (!fileTreeWithMetadata.children) {
      // A folder without children - just ignore it.
      return allFiles;
    }

    fileTreeWithMetadata.children.forEach((childFileTreeWithMetadata) => {
      allFiles = { ...allFiles, ...getAllFiles(childFileTreeWithMetadata) };
    });
    return allFiles;
  }
};

/**
 * Return only the files that are GDevelop project files.
 * @param {Object.<string, DreeWithParsedContent>} allFiles
 * @returns {DreeWithParsedContent[]}
 */
const getAllTemplateFiles = (allFiles) => {
  /** @param {DreeWithParsedContent} fileWithMetadata */
  const isGame = (fileWithMetadata) => {
    if (fileWithMetadata.name === 'game.json') return true;

    if (
      fileWithMetadata.name.endsWith('.json') &&
      path.basename(path.dirname(fileWithMetadata.relativePath)) ===
        path.basename(fileWithMetadata.name, '.json')
    ) {
      return true;
    }

    return false;
  };

  return Object.values(allFiles).filter((fileWithMetadata) => {
    return isGame(fileWithMetadata);
  });
};

module.exports = {
  readFileTree,
  enhanceFileTreeWithParsedContent,
  getAllFiles,
  getAllTemplateFiles,
};
