// @ts-check
/**
 * Plays every in-app tutorial of this repository against a running GDevelop
 * editor, and fails if a tutorial step cannot be completed.
 *
 * Run with: npx playwright test --config e2e/playwright.config.js
 * Filter tutorials with: TUTORIAL_IDS=timer,healthBar
 */
const { test } = require('@playwright/test');
const {
  loadAllTutorials,
  serveLocalTutorials,
  startTutorial,
} = require('./lib/gdevelopEditor');
const { playTutorial } = require('./lib/tutorialPlayer');

/**
 * Tutorials that are currently known to be broken (see the findings of
 * `npm run check-in-app-tutorial-selectors`). They are still played (and
 * recorded) but are expected to fail. Remove a tutorial from this list once it
 * is fixed — the test will then fail with "unexpectedly passed" as a reminder.
 * - flingGame: references removed editor elements (#layer-name,
 *   [data-default]).
 */
const KNOWN_BROKEN_TUTORIAL_IDS = ['flingGame'];

/**
 * Tutorials known to be broken on the mobile layout only.
 * - tilemapPlatformer: after selecting the terrain, the instance properties
 *   panel (a drawer on mobile) closes again, #freehandBrush disappears and
 *   the tutorial tooltip is not displayed anymore: a mobile user is left
 *   without any guidance.
 */
const KNOWN_BROKEN_ON_MOBILE_TUTORIAL_IDS = ['tilemapPlatformer'];

const allTutorials = loadAllTutorials();
const tutorialIdsFilter = process.env.TUTORIAL_IDS
  ? process.env.TUTORIAL_IDS.split(',').map((id) => id.trim())
  : null;
const tutorials = tutorialIdsFilter
  ? allTutorials.filter((tutorial) => tutorialIdsFilter.includes(tutorial.id))
  : allTutorials;

for (const tutorial of tutorials) {
  test(`in-app tutorial: ${tutorial.id}`, async ({
    page,
    context,
  }, testInfo) => {
    test.fail(
      KNOWN_BROKEN_TUTORIAL_IDS.includes(tutorial.id) ||
        (testInfo.project.name === 'mobile' &&
          KNOWN_BROKEN_ON_MOBILE_TUTORIAL_IDS.includes(tutorial.id)),
      'This tutorial is known to be broken.'
    );
    await serveLocalTutorials(context, allTutorials);
    await startTutorial(page, tutorial.id);
    await playTutorial({
      page,
      context,
      tutorial: tutorial.content,
      log: (message) => console.log(`[${tutorial.id}] ${message}`),
    });
  });
}
