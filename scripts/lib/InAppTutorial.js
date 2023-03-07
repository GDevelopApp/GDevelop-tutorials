// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * @typedef {import("../types").InAppTutorialShortHeader} InAppTutorialShortHeader
 */

class InAppTutorial {
  /** @type {string} */
  sourcePath;
  /** @type {string} */
  id;
  /** @type {Array<string>} */
  availableLocales;
  /** @type {string | undefined} */
  initialTemplateUrl;
  /** @type { Record<string, string> | undefined} */
  initialProjectData;

  /**
   * @param {string} sourcePath
   */
  constructor(sourcePath) {
    this.sourcePath = sourcePath;
    try {
      const tutorialContent = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
      const sourceFileName = path.parse(this.sourcePath).name;
      if (tutorialContent.id !== sourceFileName) {
        throw new Error(
          `the in app tutorial with ${tutorialContent.id} is saved under a file that does not share the same name (${sourceFileName})`
        );
      }
      this.id = tutorialContent.id;
      this.availableLocales = tutorialContent.availableLocales;
      this.initialTemplateUrl = tutorialContent.initialTemplateUrl;
      this.initialProjectData = tutorialContent.initialProjectData;
    } catch (error) {
      console.error(
        `An error occurred when reading tutorial file with path ${sourcePath}. The file might be corrupt.`,
        error
      );
      throw error;
    }
  }

  /**
   * @returns {InAppTutorialShortHeader}
   */
  buildShortHeader() {
    return {
      id: this.id,
      contentUrl: `https://resources.gdevelop-app.com/in-app-tutorials/${this.id}.json`,
      availableLocales: this.availableLocales,
      initialTemplateUrl: this.initialTemplateUrl,
      initialProjectData: this.initialProjectData,
    };
  }
}

module.exports = { InAppTutorial };
