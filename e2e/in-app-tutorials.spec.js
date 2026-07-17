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
 *   [data-default]) and requires a logged-in user for its leaderboard steps.
 * - plinkoMultiplier: first step requires a logged-in user
 *   (absenceOfElement: #login-now), and it references the removed
 *   #project-manager-drawer-close element.
 */
const KNOWN_BROKEN_TUTORIAL_IDS = ['flingGame', 'plinkoMultiplier'];

const allTutorials = loadAllTutorials();
const tutorialIdsFilter = process.env.TUTORIAL_IDS
  ? process.env.TUTORIAL_IDS.split(',').map((id) => id.trim())
  : null;
const tutorials = tutorialIdsFilter
  ? allTutorials.filter((tutorial) => tutorialIdsFilter.includes(tutorial.id))
  : allTutorials;

for (const tutorial of tutorials) {
  test(`in-app tutorial: ${tutorial.id}`, async ({ page, context }) => {
    test.fail(
      KNOWN_BROKEN_TUTORIAL_IDS.includes(tutorial.id),
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
