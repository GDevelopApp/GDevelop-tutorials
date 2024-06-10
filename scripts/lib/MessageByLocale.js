// @ts-check
/** @typedef {import("../types").MessageByLocale} MessageByLocale */

/**
 * @param {any} messageByLocale
 * @returns {MessageByLocale}
 */
const ensureMessageByLocale = (messageByLocale) => {
  if (!messageByLocale)
    throw new Error('A message is required and was not specified.');
  if (typeof messageByLocale === 'string') return { en: messageByLocale };
  if (typeof messageByLocale !== 'object')
    throw new Error('The message is not an object');

  if (typeof messageByLocale.en !== 'string')
    throw new Error(
      'The message for key "en" is not specified (or not a string)'
    );

  return messageByLocale;
};

module.exports = { ensureMessageByLocale };
