// @ts-check
const fs = require('fs');

/**
 * @typedef {import("../types").InAppTutorialShortHeader} InAppTutorialShortHeader
 */

class InAppTutorial {
  /** @type {string} */
  sourcePath;
  /** @type {string} */
  id;

  /**
   * @param {string} path
   */
  constructor(path) {
    this.sourcePath = path;
    try {
      const tutorialContent = JSON.parse(fs.readFileSync(path, 'utf-8'));
      this.id = tutorialContent.id;
    } catch (error) {
      console.error(
        `An error occurred when reading tutorial file with path ${path}. The file might be corrupt.`,
        error
      );
      throw error;
    }
  }

  /**
   * @returns {InAppTutorialShortHeader}
   */
  buildShortHeader() {
    return { id: this.id };
  }
}

module.exports = { InAppTutorial };
