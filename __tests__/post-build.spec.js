// @ts-check

const fs = require('fs');
const dree = require('dree');

const {
  inAppTutorialShortHeadersPath,
  inAppTutorialsFolderPath,
  getAllMessagesByLocale,
  getAllPlaceholdersInMessage,
} = require('./utils');

/**
 * @typedef {import('../scripts/types').InAppTutorialShortHeader} InAppTutorialShortHeader
 * @typedef {import('../scripts/types').InAppTutorial} InAppTutorial
 * @typedef {import('../scripts/types').InAppTutorialFlowStep} InAppTutorialFlowStep
 * @typedef {import('../scripts/types').InAppTutorialFlowMetaStep} InAppTutorialFlowMetaStep
 * @typedef {import('./utils').InAppTutorialGenericType} InAppTutorialGenericType
 */

describe('In app tutorials control figures', () => {
  /** @type {Array<InAppTutorialShortHeader>} */
  const shortHeaders = JSON.parse(
    fs.readFileSync(inAppTutorialShortHeadersPath, 'utf-8')
  );

  test('there is the right number of in app tutorials', () => {
    expect(shortHeaders.length).toMatchInlineSnapshot(`11`); // To change when adding new in app tutorials
  });

  test('all in app tutorials have a different id', () => {
    const idCount = shortHeaders.reduce(
      (/** @type {{[id: string]: number}} */ acc, shortHeader) => {
        acc[shortHeader.id] = (acc[shortHeader.id] || 0) + 1;
        return acc;
      },
      {}
    );
    expect(Object.values(idCount).every((count) => count === 1)).toBe(true);
  });
});

describe('In app tutorials content checks', () => {
  const allInAppTutorialFolder = dree.scan(inAppTutorialsFolderPath, {
    stat: false,
    normalize: true,
    followLinks: true,
    size: false,
    hash: false,
    exclude: [],
    extensions: ['json'],
  });
  const { children: allInAppTutorialFiles } = allInAppTutorialFolder;
  if (!allInAppTutorialFiles) throw new Error('No tutorial file found.');
  /** @type {InAppTutorial[]} */
  const allInAppTutorials = allInAppTutorialFiles
    .filter((file) => file.type === dree.Type.FILE)
    .map((file) => JSON.parse(fs.readFileSync(file.path, 'utf-8')));

  test('there is no empty translation', () => {
    /** @type {Record<string, Array<Record<string, string>>>} */
    const translationsWithEmptyFieldsByTutorial = {};
    allInAppTutorials.forEach((tutorial) => {
      const allMessagesByLocale = getAllMessagesByLocale(tutorial);
      /** @type {Array<Record<string, string>>} */
      const translationsWithEmptyFieldsForTutorial = [];
      allMessagesByLocale.forEach((messageByLocale) => {
        if (Object.values(messageByLocale).some((message) => !message)) {
          translationsWithEmptyFieldsForTutorial.push(messageByLocale);
        }
      });
      if (translationsWithEmptyFieldsForTutorial.length > 0) {
        translationsWithEmptyFieldsByTutorial[tutorial.id] =
          translationsWithEmptyFieldsForTutorial;
      }
    });
    if (Object.keys(translationsWithEmptyFieldsByTutorial).length > 0) {
      console.error(translationsWithEmptyFieldsByTutorial);
      throw new Error(
        'There are missing translations in the following tutorials'
      );
    }
  });

  test('all translations have all the defined locales', () => {
    /** @type {{ tutorialId: string, missingLocale: string, messageByLocale: Object} []} */
    const errors = [];
    allInAppTutorials.forEach((tutorial) => {
      const allMessagesByLocale = getAllMessagesByLocale(tutorial);
      const availableLocales = tutorial.availableLocales;
      allMessagesByLocale.forEach((messageByLocale) => {
        for (const locale of availableLocales) {
          if (!messageByLocale[locale]) {
            errors.push({
              tutorialId: tutorial.id,
              missingLocale: locale,
              messageByLocale,
            });
          }
        }
      });
    });

    if (errors.length > 0) {
      console.error(errors);
      throw new Error(
        'There are missing translations in some tutorials, check the console for more details'
      );
    }
  });

  test('references to project data are not corrupt', () => {
    /** @type {Record<string, Array<string>>} */
    const messagesWithCorruptProjectDataByTutorial = {};

    allInAppTutorials
      // We don't check the tutorials with initial template, because they already have project data.
      .filter((tutorial) => !tutorial.initialTemplateUrl)
      .forEach((tutorial) => {
        const { flow, initialProjectData } = tutorial;
        const projectData = flow.reduce(
          /**
           * @param {string[]} acc
           * @param {InAppTutorialFlowStep | InAppTutorialFlowMetaStep} step
           */
          (acc, step) => {
            if ('metaKind' in step) return acc;
            if (step.mapProjectData) {
              acc.push(Object.keys(step.mapProjectData)[0]);
            }
            return acc;
          },
          /** @type {string[]} */
          initialProjectData ? Object.keys(initialProjectData) : []
        );

        const allMessagesByLocale = getAllMessagesByLocale(tutorial);

        /** @type {string[]} */
        const messagesWithCorruptProjectData = [];
        allMessagesByLocale.forEach((messageByLocale) => {
          Object.values(messageByLocale).forEach((value) => {
            const allPlaceholders = getAllPlaceholdersInMessage(value);
            if (
              allPlaceholders.some(
                (placeholder) => !projectData.includes(placeholder)
              )
            ) {
              messagesWithCorruptProjectData.push(value);
            }
          });
        });
        if (messagesWithCorruptProjectData.length > 0) {
          messagesWithCorruptProjectDataByTutorial[tutorial.id] =
            messagesWithCorruptProjectData;
        }
      });
    if (Object.keys(messagesWithCorruptProjectDataByTutorial).length > 0) {
      console.error(messagesWithCorruptProjectDataByTutorial);
      throw new Error(
        'There are corrupt project data keys in the following tutorials'
      );
    }
  });
});
