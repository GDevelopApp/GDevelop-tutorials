// @ts-check

const fs = require('fs');

const { inAppTutorialShortHeadersPath } = require('./utils');

/**
 * @typedef {import('../scripts/types').InAppTutorialShortHeader} InAppTutorialShortHeader
 */

describe('In app tutorials control figures', () => {
  /** @type {Array<InAppTutorialShortHeader>} */
  const shortHeaders = JSON.parse(
    fs.readFileSync(inAppTutorialShortHeadersPath, 'utf-8')
  );

  test('there is the right number of in app tutorials', () => {
    expect(shortHeaders).toHaveLength(1); // To change when adding new in app tutorials
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
