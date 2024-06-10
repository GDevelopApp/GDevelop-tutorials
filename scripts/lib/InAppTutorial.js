// @ts-check
const fs = require('fs');
const path = require('path');
const { translateMetaStep } = require('./MetaStepTranslator');
const { ensureMessageByLocale } = require('./MessageByLocale');

/**
 * @typedef {import("../types").MessageByLocale} MessageByLocale
 * @typedef {import("../types").InAppTutorialShortHeader} InAppTutorialShortHeader
 * @typedef {import("../types").InAppTutorialFlowStep} InAppTutorialFlowStep
 * @typedef {import("../types").InAppTutorial} InAppTutorialType
 * @typedef {import("../types").InAppTutorialFlowMetaStep} InAppTutorialFlowMetaStep
 * @typedef {import("../types").EditorIdentifier} EditorIdentifier
 * @typedef {import("../types").InAppTutorialEndDialog} InAppTutorialEndDialog
 */

class InAppTutorial {
  /** @type {string} */
  sourcePath;
  /** @type {string} */
  id;
  /** @type {MessageByLocale} */
  titleByLocale;
  /** @type {Array<MessageByLocale>} */
  bulletPointsByLocale;
  /** @type {Array<string>} */
  availableLocales;
  /** @type {string | undefined} */
  initialTemplateUrl;
  /** @type { Record<string, string> | undefined} */
  initialProjectData;
  /** @type { Array<InAppTutorialFlowStep | InAppTutorialFlowMetaStep > } */
  flow;
  /** @type {Record<string, EditorIdentifier>} */
  editorSwitches;
  /** @type {InAppTutorialEndDialog} */
  endDialog;
  /** @type {boolean} */
  isMiniTutorial;

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
      if (!Array.isArray(tutorialContent.bulletPointsByLocale))
        throw new Error(
          'Field bulletPointsByLocale is not an array (or empty) for tutorial with id ' +
            tutorialContent.id
        );

      this.id = tutorialContent.id;
      this.titleByLocale = ensureMessageByLocale(tutorialContent.titleByLocale);
      this.bulletPointsByLocale = tutorialContent.bulletPointsByLocale.map(
        /** @param {any} bulletPointByLocale */
        (bulletPointByLocale) => ensureMessageByLocale(bulletPointByLocale)
      );
      this.availableLocales = tutorialContent.availableLocales;
      this.initialTemplateUrl = tutorialContent.initialTemplateUrl;
      this.initialProjectData = tutorialContent.initialProjectData;
      this.editorSwitches = tutorialContent.editorSwitches;
      this.endDialog = tutorialContent.endDialog;
      this.isMiniTutorial =
        tutorialContent.isMiniTutorial !== undefined
          ? tutorialContent.isMiniTutorial
          : true;
      this.flow = tutorialContent.flow;
    } catch (error) {
      console.error(
        `An error occurred when reading tutorial file with path ${sourcePath}. The file might be corrupt.`,
        error
      );
      throw error;
    }
  }

  processFlowMetaSteps() {
    /** @type {InAppTutorialFlowStep[]} */
    const newFlow = [];
    this.flow.forEach((step) => {
      if (!('metaKind' in step)) {
        newFlow.push(step);
        return;
      }
      newFlow.push(...translateMetaStep(step));
    });
    this.flow = newFlow;
  }

  /**
   * @returns {InAppTutorialShortHeader}
   */
  buildShortHeader() {
    return {
      id: this.id,
      titleByLocale: this.titleByLocale,
      bulletPointsByLocale: this.bulletPointsByLocale,
      contentUrl: `https://resources.gdevelop-app.com/in-app-tutorials/${this.id}.json`,
      availableLocales: this.availableLocales,
      initialTemplateUrl: this.initialTemplateUrl,
      initialProjectData: this.initialProjectData,
      isMiniTutorial: this.isMiniTutorial,
    };
  }

  toString() {
    /** @type {InAppTutorialType} */
    const output = {
      id: this.id,
      titleByLocale: this.titleByLocale,
      bulletPointsByLocale: this.bulletPointsByLocale,
      flow: this.flow,
      editorSwitches: this.editorSwitches,
      endDialog: this.endDialog,
      availableLocales: this.availableLocales,
      isMiniTutorial: this.isMiniTutorial,
    };
    if (this.initialTemplateUrl) {
      output.initialTemplateUrl = this.initialTemplateUrl;
    }
    if (this.initialProjectData) {
      output.initialProjectData = this.initialProjectData;
    }
    return JSON.stringify(output, null, 2);
  }
}

module.exports = { InAppTutorial };
