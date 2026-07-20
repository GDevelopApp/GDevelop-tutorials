// @ts-check
/**
 * Helpers to serve the local tutorials to a running GDevelop editor and start
 * a tutorial like a user would.
 */
const path = require('path');
const fs = require('fs');
const { InAppTutorial } = require('../../scripts/lib/InAppTutorial');

const inAppTutorialsPath = path.join(__dirname, '../../tutorials/in-app');

/**
 * Loads all local tutorials, with their meta steps expanded the same way they
 * are expanded at deploy time.
 * @returns {Array<{ id: string, shortHeader: any, content: any }>}
 */
const loadAllTutorials = () => {
  return fs
    .readdirSync(inAppTutorialsPath)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => {
      const tutorial = new InAppTutorial(
        path.join(inAppTutorialsPath, fileName)
      );
      tutorial.processFlowMetaSteps();
      return {
        id: tutorial.id,
        shortHeader: tutorial.buildShortHeader(),
        content: JSON.parse(tutorial.toString()),
      };
    });
};

/**
 * Intercepts the editor's network requests about in-app tutorials so that the
 * local tutorials are used instead of the deployed ones. Requests to the
 * initial project templates (`in-app-tutorials/templates/...`) are not
 * intercepted: a broken template URL is a real breakage the test should catch.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {Array<{ id: string, shortHeader: any, content: any }>} tutorials
 */
const serveLocalTutorials = async (context, tutorials) => {
  await context.route('**/in-app-tutorial-short-header*', (route) =>
    route.fulfill({ json: tutorials.map((tutorial) => tutorial.shortHeader) })
  );
  // Matches the short headers' contentUrl
  // (https://resources.gdevelop-app.com/in-app-tutorials/<id>.json). `*` does
  // not match `/`, so template files in subfolders are not intercepted.
  await context.route('**/in-app-tutorials/*.json', (route, request) => {
    const id = path.basename(new URL(request.url()).pathname, '.json');
    const tutorial = tutorials.find((tutorial) => tutorial.id === id);
    if (!tutorial) return route.continue();
    return route.fulfill({ json: tutorial.content });
  });
};

/**
 * Test account used for the tutorials that require an authenticated user
 * (leaderboards...). This is a dev-environment account (the tests run against
 * api-dev.gdevelop.io): no secret here.
 */
const TEST_ACCOUNT = {
  email:
    process.env.GDEVELOP_TEST_ACCOUNT_EMAIL || 'clement+playwright@gdevelop.io',
  password: process.env.GDEVELOP_TEST_ACCOUNT_PASSWORD || 'gdevelop',
};

/**
 * If the login dialog is (or becomes) visible, fills it with the test account
 * and submits it, like a user would. Returns true if a login was performed.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
const completeLoginDialogIfPresent = async (page) => {
  const loginDialog = page.locator('#login-dialog');
  try {
    await loginDialog.waitFor({ state: 'visible', timeout: 5 * 1000 });
  } catch (error) {
    return false;
  }
  await loginDialog
    .locator('input:not([type="password"])')
    .first()
    .fill(TEST_ACCOUNT.email);
  await loginDialog
    .locator('input[type="password"]')
    .first()
    .fill(TEST_ACCOUNT.password);
  await page.locator('#login-button').click();
  await loginDialog.waitFor({ state: 'hidden', timeout: 60 * 1000 });
  return true;
};

/**
 * Opens the editor and starts the given tutorial through the same flow as a
 * user clicking a lesson card: the start dialog is opened via the
 * `initial-dialog=guided-lesson` URL argument, and the dialog's primary button
 * is clicked (which creates the template project and starts the tutorial).
 * @param {import('@playwright/test').Page} page
 * @param {string} tutorialId
 */
const startTutorial = async (page, tutorialId) => {
  await page.goto(
    `/?initial-dialog=guided-lesson&tutorial-id=${tutorialId}&in-app-tutorial-test-mode`
  );
  // The start dialog can take a while to show: the editor loads WebAssembly
  // and fetches the tutorial short headers first.
  const startButton = page.getByRole('button', { name: "Let's go" });
  await startButton.click({ timeout: 3 * 60 * 1000 });
  // The tutorial is started once the orchestrator exposes its state (the
  // template project has to be downloaded and opened first).
  await page.waitForFunction(
    () => !!window['inAppTutorialTestModeState'],
    undefined,
    { timeout: 3 * 60 * 1000 }
  );
};

/** @param {import('@playwright/test').Page} page */
const getTutorialState = async (page) => {
  return await page.evaluate(() => window['inAppTutorialTestModeState']);
};

module.exports = {
  loadAllTutorials,
  serveLocalTutorials,
  completeLoginDialogIfPresent,
  startTutorial,
  getTutorialState,
};
