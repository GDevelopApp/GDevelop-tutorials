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

const allTutorials = loadAllTutorials();
const tutorialIdsFilter = process.env.TUTORIAL_IDS
  ? process.env.TUTORIAL_IDS.split(',').map((id) => id.trim())
  : null;
const tutorials = tutorialIdsFilter
  ? allTutorials.filter((tutorial) => tutorialIdsFilter.includes(tutorial.id))
  : allTutorials;

for (const tutorial of tutorials) {
  test(`in-app tutorial: ${tutorial.id}`, async ({ page, context }) => {
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
