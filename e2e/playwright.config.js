// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

/**
 * End-to-end tests that play the in-app tutorials against a running GDevelop
 * editor (web build).
 *
 * Environment variables:
 * - GDEVELOP_EDITOR_URL: URL of a running editor (default http://localhost:3000).
 *   If the editor is not running, it is started from GDEVELOP_ROOT_PATH.
 * - GDEVELOP_ROOT_PATH: path to a GDevelop checkout with `npm install` ran in
 *   newIDE/app (default: ./GDevelop or ../GDevelop relative to this repository).
 * - TUTORIAL_IDS: comma-separated list of tutorial ids to test (default: all).
 */

const fs = require('fs');

const findGDevelopRootPath = () => {
  if (process.env.GDEVELOP_ROOT_PATH) {
    return path.resolve(process.cwd(), process.env.GDEVELOP_ROOT_PATH);
  }
  const candidates = [
    path.join(__dirname, '../GDevelop'),
    path.join(__dirname, '../../GDevelop'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'newIDE/app'))) return candidate;
  }
  return null;
};

const editorUrl = process.env.GDEVELOP_EDITOR_URL || 'http://localhost:3000';
const gdevelopRootPath = findGDevelopRootPath();

module.exports = defineConfig({
  testDir: __dirname,
  // Playing a whole tutorial can take a while: each step advance is detected
  // by the editor with 0.5-1s polls.
  timeout: 10 * 60 * 1000,
  // The editor is a heavy page (WebAssembly, PIXI): don't run too many at once.
  workers: 2,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    baseURL: editorUrl,
    // Safety net: no action should ever block until the test timeout.
    actionTimeout: 15 * 1000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // On CI, record a video of every tutorial (uploaded as artifact), so that
    // each run can be reviewed and failures can be diagnosed.
    video: process.env.CI ? 'on' : 'retain-on-failure',
  },
  // The editor has different layouts depending on the window size (see
  // UI/Responsive/ResponsiveWindowMeasurer.js: mobile is width < 600 or
  // height < 500, tablet/"medium" is width < 1150). Run the tutorials on
  // each: select one with --project=desktop|tablet|mobile.
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1600, height: 900 } },
    },
    {
      name: 'tablet',
      use: { viewport: { width: 1024, height: 768 }, hasTouch: true },
    },
    {
      name: 'mobile',
      // Landscape phone: the editor is mostly used in landscape on mobile.
      use: { viewport: { width: 844, height: 390 }, hasTouch: true },
    },
  ],
  webServer: gdevelopRootPath
    ? {
        command: `npm start --prefix ${path.join(
          gdevelopRootPath,
          'newIDE/app'
        )}`,
        url: editorUrl,
        reuseExistingServer: true,
        timeout: 20 * 60 * 1000,
        env: {
          BROWSER: 'none',
          // The editor compilation (webpack) is memory hungry on CI.
          NODE_OPTIONS: '--max-old-space-size=7168',
        },
      }
    : undefined,
});
