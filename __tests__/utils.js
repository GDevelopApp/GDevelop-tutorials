const path = require('path');

const distPath = path.join(__dirname, '../dist');
const inAppTutorialShortHeadersPath = path.join(
  distPath,
  'database',
  'inAppTutorialShortHeaders.json'
);
const inAppTutorialsFolderPath = path.join(distPath, 'tutorials', 'in-app');

/**
 * @typedef {{[key:string] : string} | {messageByLocale?: Record<string, string>}} InAppTutorialGenericType
 * @typedef {import('../scripts/types').InAppTutorial} InAppTutorial
 * @typedef {import('../scripts/types').MessageByLocale} MessageByLocale
 */

/**
 * Recursively browses a tutorial to return all messageByLocale object.
 * @param {InAppTutorial | InAppTutorialGenericType} tutorial
 * @returns {Array<MessageByLocale>}
 */
const getAllMessagesByLocale = (tutorial) => {
  if (Array.isArray(tutorial)) {
    return Object.values(tutorial).map(getAllMessagesByLocale).flat();
  }
  /** @type {Array<Record<string, string>>} */
  const localMessagesByLocale = [];
  Object.entries(tutorial).forEach(([key, value]) => {
    if (key === 'messageByLocale') {
      // @ts-ignore
      localMessagesByLocale.push(value);
      return;
    }
    if (typeof value === 'object') {
      localMessagesByLocale.push(...getAllMessagesByLocale(value));
      return;
    }
  });
  return localMessagesByLocale;
};

const placeholderReplacingRegex = /\$\((\w+)\)/g;

/**
 *
 * @param {string} message
 * @returns {string[]}
 */
const getAllPlaceholdersInMessage = (message) => {
  const match = message.matchAll(placeholderReplacingRegex);
  return [...match].map((match) => match[1]);
};

module.exports = {
  distPath,
  inAppTutorialShortHeadersPath,
  inAppTutorialsFolderPath,
  getAllMessagesByLocale,
  getAllPlaceholdersInMessage,
};
