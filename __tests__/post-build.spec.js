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
 * @typedef {import('./utils').InAppTutorialGenericType} InAppTutorialGenericType
 */

describe('In app tutorials control figures', () => {
  /** @type {Array<InAppTutorialShortHeader>} */
  const shortHeaders = JSON.parse(
    fs.readFileSync(inAppTutorialShortHeadersPath, 'utf-8')
  );

  test('there is the right number of in app tutorials', () => {
    expect(shortHeaders.length).toMatchInlineSnapshot(`6`); // To change when adding new in app tutorials
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

  test('references to project data are not corrupt', () => {
    /** @type {Record<string, Array<string>>} */
    const messagesWithCorruptProjectDataByTutorial = {};

    allInAppTutorials
      // We don't check the tutorials with initial template, because they already have project data.
      .filter((tutorial) => !tutorial.initialTemplateUrl)
      .forEach((tutorial) => {
        const { flow } = tutorial;
        const projectData = flow.reduce(
          /**
           * @param {string[]} acc
           * @param {{mapProjectData?: Record<string, string>}} step
           */
          (acc, step) => {
            if (step.mapProjectData) {
              acc.push(Object.keys(step.mapProjectData)[0]);
            }
            return acc;
          },
          /** @type {string[]} */
          []
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
