# In-app tutorials end-to-end tests

These tests play every in-app tutorial of this repository against a real
GDevelop editor (web build), like a user would: for each step of a tutorial
flow, the expected action is performed (click the highlighted element, fill the
input, drag an object to the scene, launch a preview...), and the test checks
that the tutorial orchestrator advances to the next step. If a step cannot be
completed, the tutorial is broken and the test fails with the step index, the
selector involved and a screenshot/trace.

They complement the static selector check
(`npm run check-in-app-tutorial-selectors`), which quickly catches selectors
referencing elements that no longer exist in the editor, without running it.

## How it works

- The editor is opened with the `in-app-tutorial-test-mode` URL parameter: the
  orchestrator (see `InAppTutorialOrchestrator.js` in GDevelop) then exposes
  its current state (step index, interpolated element to highlight, trigger)
  on `window.inAppTutorialTestModeState`.
- Requests to the in-app tutorials API/CDN are intercepted so the **local**
  tutorial files (with meta steps expanded) are used instead of the deployed
  ones. Initial project templates are still fetched from the real CDN, so a
  broken template URL is caught too.
- The tutorial is started through the regular
  `?initial-dialog=guided-lesson&tutorial-id=<id>` flow.

## Running locally

Requirements: a GDevelop checkout with `npm install` ran in `newIDE/app`,
located next to this repository (or set `GDEVELOP_ROOT_PATH`), and
`npx playwright install chromium` ran once in this repository.

```bash
# Run all tutorials (starts the editor dev server if not already running):
npm run test-in-app-tutorials

# Against an already-running editor, for a single tutorial:
GDEVELOP_EDITOR_URL=http://localhost:3000 TUTORIAL_IDS=timer npm run test-in-app-tutorials

# Inspect a failure:
npx playwright show-trace test-results/<test-name>/trace.zip
```

## Environment variables

| Variable             | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| `GDEVELOP_EDITOR_URL`| URL of a running editor (default `http://localhost:3000`).         |
| `GDEVELOP_ROOT_PATH` | Path to the GDevelop checkout (default: `./GDevelop` or `../GDevelop`). |
| `TUTORIAL_IDS`       | Comma-separated tutorial ids to test (default: all).               |

## How steps are played

| Trigger                | Action performed                                                       |
| ---------------------- | ---------------------------------------------------------------------- |
| `presenceOfElement`    | Click the highlighted element, or type the text in bold/quotes from the tooltip if the element is a text input (search bars). |
| `absenceOfElement`     | Click the highlighted element (e.g. an Apply/OK button).               |
| `editorIsActive`       | Click the highlighted editor tab.                                      |
| `valueEquals`          | Fill the highlighted field with the expected value.                    |
| `valueHasChanged`      | Fill the highlighted field with a test value.                          |
| `instanceAddedOnScene` | Drag the highlighted object list item onto the scene canvas.           |
| `objectAddedInLayout`  | Click the highlighted element (e.g. the asset store add button).       |
| `previewLaunched`      | Click the preview button and wait for the preview window.              |
| `clickOnTooltipButton` | Click the tooltip button with the expected label.                      |
