// @ts-check
/**
 * Plays an in-app tutorial like a user would: for each step, performs the
 * action expected by the step's `nextStepTrigger` and checks that the
 * orchestrator advances to the next step. If it does not, the tutorial is
 * considered broken at this step.
 */
const {
  getTutorialState,
  completeLoginDialogIfPresent,
} = require('./gdevelopEditor');

/** How long to wait for the orchestrator to advance after performing an action.
 * The orchestrator polls the DOM/project every 0.5-1s, so this includes at
 * least a few polling cycles plus UI animations. */
const STEP_ADVANCE_TIMEOUT_MS = 20 * 1000;
/** How many times to re-perform an action before declaring the step broken. */
const MAX_ATTEMPTS_PER_STEP = 3;

/** @param {any} translatedText @returns {string} */
const getEnglishMessage = (translatedText) => {
  if (!translatedText) return '';
  if (typeof translatedText === 'string') return translatedText;
  if (translatedText.messageByLocale) {
    return translatedText.messageByLocale.en || '';
  }
  return '';
};

/**
 * Extracts the text a user is asked to type from a step tooltip. Tutorials
 * consistently write it in bold ("Search for **Scene timer**.") or between
 * quotes ('Search for “layer”.').
 * @param {any} step
 * @returns {string | null}
 */
const extractTextToType = (step) => {
  const description = getEnglishMessage((step.tooltip || {}).description);
  const boldMatch = description.match(/\*\*(.+?)\*\*/);
  if (boldMatch) return boldMatch[1];
  const quoteMatch = description.match(/[“"']([^”"']+)[”"']/);
  if (quoteMatch) return quoteMatch[1];
  return null;
};

/** All the bold texts of a step tooltip, in order.
 * @param {any} step
 * @returns {string[]}
 */
const extractAllBoldTexts = (step) => {
  const description = getEnglishMessage((step.tooltip || {}).description);
  return [...description.matchAll(/\*\*(.+?)\*\*/g)].map((match) => match[1]);
};

/**
 * Clicks the menu items matching the bold texts of the step tooltip, in
 * order, in the menus that are open. Menus and submenus can take a moment to
 * render, so each item is waited for (bold texts that are not menu items,
 * e.g. "down arrow", are skipped after the wait times out). The clicks are
 * dispatched directly (no mouse movement): a submenu closes 75ms after the
 * pointer leaves its parent menu item, so moving the mouse to the submenu
 * item can close it on slow machines. A CSS locator is used as menus can be
 * aria-hidden when a dialog is open.
 * @param {import('@playwright/test').Page} page
 * @param {any} step
 */
const followBoldTextsThroughMenus = async (page, step) => {
  for (const boldText of extractAllBoldTexts(step)) {
    const menuItem = page
      .locator('[role="menuitem"]')
      .filter({ hasText: boldText.replace(/(\.|…)+$/, '') })
      .filter({ visible: true })
      .first();
    try {
      await menuItem.waitFor({ state: 'visible', timeout: 8000 });
      await menuItem.evaluate((node) => node.click(), undefined, {
        timeout: 5000,
      });
    } catch (error) {
      // Not a menu item: ignore.
    }
  }
};

/**
 * Clicks at the element's current position with a raw mouse click, bypassing
 * Playwright's stability check — for elements that never stop moving (the
 * tutorial avatar bounces indefinitely, and so does the tooltip anchored to
 * it).
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} locator
 */
const clickAtCurrentPosition = async (page, locator) => {
  const box = await locator.boundingBox({ timeout: 5 * 1000 });
  if (!box) throw new Error('Element to click is not visible.');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};

class TutorialStepError extends Error {
  /**
   * @param {string} message
   * @param {{ stepIndex: number, step: any, state: any }} details
   */
  constructor(message, details) {
    super(message);
    this.name = 'TutorialStepError';
    this.details = details;
  }
}

/**
 * Rebuilds the editor tab selector for an expected editor, the same way the
 * orchestrator does (see getEditorTabSelector in InAppTutorialOrchestrator).
 * @param {{ editor: string, scene?: string } | null} expectedEditor
 * @returns {string | null}
 */
const getEditorTabSelector = (expectedEditor) => {
  if (!expectedEditor) return null;
  if (expectedEditor.editor === 'Home') {
    return 'button[id="tab-start-page-button"]';
  }
  const sceneNameFilter = expectedEditor.scene
    ? `[data-scene="${expectedEditor.scene}"]`
    : '';
  return `button[id^="tab"][data-type="${
    expectedEditor.editor === 'Scene' ? 'layout' : 'layout-events'
  }"]${sceneNameFilter}`;
};

/**
 * Fills the input designated by the selector with the given value, handling
 * fields where the id is on a wrapper rather than on the input itself, as
 * well as select fields.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {string} value
 */
const fillField = async (page, selector, value, { anyValue = false } = {}) => {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible', timeout: 10 * 1000 });
  const tagName = await element.evaluate((node) => node.tagName);

  /** @param {import('@playwright/test').Locator} select */
  const changeNativeSelect = async (select) => {
    if (anyValue) {
      // Any different option satisfies a valueHasChanged trigger.
      const newValue = await select.evaluate((node) => {
        const selectNode = /** @type {HTMLSelectElement} */ (node);
        const options = [...selectNode.options];
        const other = options.find(
          (option) => option.value !== selectNode.value
        );
        return other ? other.value : null;
      });
      if (newValue === null) {
        throw new Error(`No other option to select in "${selector}".`);
      }
      await select.selectOption(newValue);
    } else {
      await select.selectOption(value);
    }
  };

  if (tagName === 'SELECT') {
    await changeNativeSelect(element);
    return;
  }
  let input;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
    input = element;
  } else {
    const nativeSelect = element.locator('select').first();
    if (await nativeSelect.count()) {
      await changeNativeSelect(nativeSelect);
      return;
    }
    input = element.locator('input, textarea').first();
    if (!(await input.count())) {
      throw new Error(`Could not find an input to fill in "${selector}".`);
    }
  }
  const inputType = await input.evaluate((node) => node.getAttribute('type'));
  if (inputType === 'checkbox') {
    // Toggle (valueHasChanged) or set (valueEquals "true"/"false") the
    // checkbox.
    if (!anyValue && (value === 'true' || value === 'false')) {
      await input.setChecked(value === 'true', { force: true });
    } else {
      await input.click({ force: true });
    }
    return;
  }
  if (inputType === 'hidden') {
    // Material-UI select: open the menu and pick the option.
    await element.click();
    const options = page.locator(
      '[role="listbox"] [role="option"], [role="menu"] li'
    );
    if (anyValue) {
      await page
        .locator(
          '[role="listbox"] [role="option"]:not([aria-selected="true"]), [role="menu"] li:not([aria-selected="true"])'
        )
        .first()
        .click();
    } else {
      await options.filter({ hasText: value }).first().click();
    }
    return;
  }
  await input.fill(value);
  // Some fields are uncontrolled inputs that the editor can reset when
  // another field commits its pending change (e.g. the variables list):
  // verify the value stuck, and retype it like a user would otherwise.
  await page.waitForTimeout(400);
  const currentValue = await input.inputValue().catch(() => null);
  if (currentValue !== null && currentValue !== value) {
    await input.click();
    await input.press('ControlOrMeta+a');
    await input.pressSequentially(value, { delay: 30 });
  }
};

/**
 * Performs the user action expected by the current step.
 * @param {{
 *   page: import('@playwright/test').Page,
 *   context: import('@playwright/test').BrowserContext,
 *   step: any,
 *   state: any,
 *   attempt: number,
 *   log: (message: string) => void,
 * }} options
 */
const performStepAction = async ({
  page,
  context,
  step,
  state,
  attempt,
  log,
}) => {
  const trigger = step.nextStepTrigger || {};
  const highlightedElementSelector = state.elementToHighlightId;

  if (trigger.clickOnTooltipButton) {
    const buttonLabel = getEnglishMessage(trigger.clickOnTooltipButton);
    // A CSS locator is used (not getByRole): when a modal dialog is open,
    // Material UI sets aria-hidden on the other root containers including the
    // tutorial popper, removing the (visible) button from the accessibility
    // tree. Also only consider the visible button: several poppers with the
    // same id can coexist in the DOM.
    const button = page
      .locator('[id="in-app-tutorial-tooltip-displayer"] button')
      .filter({ hasText: buttonLabel })
      .filter({ visible: true })
      .first();
    // The tooltip is often anchored to the bouncing avatar: it never stops
    // moving, so a regular click (which waits for the element to be stable)
    // would time out. Click at the current position instead.
    try {
      await button.waitFor({ state: 'visible', timeout: 8 * 1000 });
    } catch (error) {
      const tooltipState = await page
        .evaluate(() =>
          [
            ...document.querySelectorAll(
              '[id="in-app-tutorial-tooltip-displayer"]'
            ),
          ].map((popper) => ({
            visibility: getComputedStyle(popper).visibility,
            display: getComputedStyle(popper).display,
            width: Math.round(popper.getBoundingClientRect().width),
            height: Math.round(popper.getBoundingClientRect().height),
            buttons: [...popper.querySelectorAll('button')].map((button) => ({
              text: (button.textContent || '').slice(0, 25),
              width: Math.round(button.getBoundingClientRect().width),
              height: Math.round(button.getBoundingClientRect().height),
              visibility: getComputedStyle(button).visibility,
            })),
          }))
        )
        .catch(() => null);
      log(
        `Tooltip button not visible. Poppers: ${JSON.stringify(tooltipState)}`
      );
      // The tooltip is probably folded (only the avatar is visible):
      // clicking the avatar unfolds it.
      await clickAtCurrentPosition(
        page,
        page.locator('#in-app-tutorial-avatar')
      );
      await button.waitFor({ state: 'visible', timeout: 8 * 1000 });
    }
    await clickAtCurrentPosition(page, button);
    return;
  }

  if (trigger.previewLaunched) {
    if (attempt > 1) {
      // A menu opened by a previous attempt may still be there, its backdrop
      // blocking the toolbar: dismiss it.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    const popupPromise = context
      .waitForEvent('page', { timeout: STEP_ADVANCE_TIMEOUT_MS })
      .catch(() => null);
    await page
      .locator(highlightedElementSelector || '#toolbar-preview-button')
      .first()
      .click({ timeout: 10 * 1000 });
    // Some steps target a split/menu button (e.g. "Launch preview in... >
    // 2 previews in 2 windows"): follow the bold texts of the tooltip through
    // the menus that opened.
    await followBoldTextsThroughMenus(page, step);
    // The preview opens in a new page: keep it open (the trigger fires when
    // the launch resolves), it is closed by the caller once the step advanced.
    await popupPromise;
    return;
  }

  if (trigger.valueEquals !== undefined) {
    if (!highlightedElementSelector) {
      throw new Error('A valueEquals step must have an element to highlight.');
    }
    await fillField(
      page,
      highlightedElementSelector,
      String(trigger.valueEquals)
    );
    return;
  }

  if (trigger.valueHasChanged) {
    if (!highlightedElementSelector) {
      throw new Error(
        'A valueHasChanged step must have an element to highlight.'
      );
    }
    await fillField(page, highlightedElementSelector, 'Test value 123', {
      anyValue: true,
    });
    return;
  }

  if (trigger.instanceAddedOnScene) {
    if (!highlightedElementSelector) {
      throw new Error(
        'An instanceAddedOnScene step must have an element to highlight.'
      );
    }
    const source = page.locator(highlightedElementSelector).first();
    try {
      await source.waitFor({ state: 'visible', timeout: 5 * 1000 });
    } catch (error) {
      // On small layouts the objects list is a drawer that can be closed:
      // open it like a user would.
      await page
        .locator(
          '#scene-editor[data-active="true"] #toolbar-open-objects-panel-button'
        )
        .first()
        .click({ timeout: 5 * 1000 });
      await source.waitFor({ state: 'visible', timeout: 8 * 1000 });
    }
    // The object can also be below the fold of the list.
    await source.scrollIntoViewIfNeeded().catch(() => {});
    const canvas = page
      .locator('#scene-editor[data-active="true"] canvas')
      .first();
    // Manual mouse drag: the objects list uses mouse-based drag and drop onto
    // the scene canvas.
    const sourceBox = await source.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!sourceBox || !canvasBox) {
      throw new Error('Could not find the drag source or the scene canvas.');
    }
    // Select the object first ("Select then drag", as the mobile tooltips
    // say — harmless on desktop), then drag. Drop in the upper part of the
    // canvas: on mobile the lower part is covered by the objects drawer.
    await page.mouse.click(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );
    await page.waitForTimeout(200);
    // The step can require several instances (`instancesCount`): drop each
    // one at a different position.
    const instancesCount = trigger.instancesCount || 1;
    for (let index = 0; index < instancesCount; index++) {
      const dropFractionX =
        0.3 + (0.4 * index) / Math.max(instancesCount - 1, 1);
      await page.mouse.move(
        sourceBox.x + sourceBox.width / 2,
        sourceBox.y + sourceBox.height / 2
      );
      await page.mouse.down();
      // Move in several small steps so that drag events are properly emitted.
      await page.mouse.move(
        canvasBox.x + canvasBox.width * dropFractionX,
        canvasBox.y + canvasBox.height * 0.3,
        { steps: 20 }
      );
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(300);
    }
    return;
  }

  // Default action (presenceOfElement, absenceOfElement, editorIsActive,
  // objectAddedInLayout): click the highlighted element — unless it is a text
  // input (e.g. a search bar): in that case type the text the tooltip asks
  // for, so that the expected element (e.g. a search result) appears.
  if (highlightedElementSelector) {
    const element = page.locator(highlightedElementSelector).first();
    await element.waitFor({ state: 'visible', timeout: 10 * 1000 });
    // Steps like "Right click on GameScene and select Edit scene variables":
    // open the context menu and follow the bold texts through it.
    if (
      /right.?click/i.test(getEnglishMessage((step.tooltip || {}).description))
    ) {
      await element.click({ button: 'right', timeout: 10 * 1000 });
      await followBoldTextsThroughMenus(page, step);
      return;
    }
    const isTextInput = await element.evaluate((node) => {
      const input =
        node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'
          ? node
          : node.querySelector('input, textarea');
      return (
        !!input &&
        !['hidden', 'checkbox', 'radio'].includes(
          input.getAttribute('type') || 'text'
        )
      );
    });
    const textToType = extractTextToType(step);
    if (isTextInput && textToType) {
      await fillField(page, highlightedElementSelector, textToType);
      return;
    }
    const sceneCanvas = page
      .locator('#scene-editor[data-active="true"] canvas')
      .first();
    if (step.interactsWithCanvas && (await sceneCanvas.count())) {
      // The step also requires clicking something in the scene (e.g. "click
      // the terrain"): probe a few points of the scene canvas. The highlighted
      // element is often a panel toggle that can already be in the expected
      // state, so it is only clicked on retries.
      if (attempt > 1) {
        await element.click({ timeout: 10 * 1000 });
      }
      const canvasBox = await sceneCanvas.boundingBox();
      if (canvasBox) {
        const probePoints = [
          [0.3, 0.65],
          [0.15, 0.5],
          [0.6, 0.85],
        ];
        const [fractionX, fractionY] =
          probePoints[(attempt - 1) % probePoints.length];
        await page.mouse.click(
          canvasBox.x + canvasBox.width * fractionX,
          canvasBox.y + canvasBox.height * fractionY
        );
      }
      return;
    }
    // Opening the object editor from an objects list item requires a double
    // click. Also alternate to a double click on retries, in case a single
    // click was not the expected interaction.
    const shouldDoubleClick =
      (trigger.presenceOfElement === '#object-editor-dialog' &&
        highlightedElementSelector.includes('data-object-name')) ||
      attempt % 2 === 0;
    if (shouldDoubleClick) {
      await element.dblclick({ timeout: 10 * 1000 });
    } else {
      await element.click({ timeout: 10 * 1000 });
    }
    return;
  }

  if (trigger.absenceOfElement) {
    // No element highlighted, and an element must disappear: if it is there,
    // click it — that is the natural interaction to make it go away (e.g.
    // plinkoMultiplier's "#login-now" button, which opens the login dialog).
    const target = page.locator(trigger.absenceOfElement).first();
    if (await target.isVisible().catch(() => false)) {
      await target.click({ timeout: 10 * 1000 });
      if (await completeLoginDialogIfPresent(page)) {
        log('Logged in with the test account.');
      }
      return;
    }
    log('Element to make disappear is already absent: waiting.');
    return;
  }

  if (trigger.presenceOfElement) {
    // No element to interact with: the expected change may happen on its own.
    log('No element to highlight: waiting for the trigger to be satisfied.');
    return;
  }

  throw new Error(
    `Don't know how to perform the action for trigger: ${JSON.stringify(
      trigger
    )}.`
  );
};

/**
 * Waits until the orchestrator's step index changes (or the end dialog is
 * displayed). Returns true if it did before the timeout.
 * @param {import('@playwright/test').Page} page
 * @param {number} currentStepIndex
 * @returns {Promise<boolean>}
 */
const waitForStepChange = async (page, currentStepIndex) => {
  try {
    await page.waitForFunction(
      (stepIndex) => {
        const state = window['inAppTutorialTestModeState'];
        return (
          !!state && (state.stepIndex !== stepIndex || state.displayEndDialog)
        );
      },
      currentStepIndex,
      { timeout: STEP_ADVANCE_TIMEOUT_MS }
    );
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Plays the whole tutorial. Resolves when the end dialog is displayed, throws
 * a TutorialStepError when a step cannot be completed.
 * @param {{
 *   page: import('@playwright/test').Page,
 *   context: import('@playwright/test').BrowserContext,
 *   tutorial: any,
 *   log?: (message: string) => void,
 * }} options
 */
const playTutorial = async ({ page, context, tutorial, log = () => {} }) => {
  const flow = tutorial.flow;
  let lastHandledStepIndex = -1;
  let attemptsForCurrentStep = 0;

  for (;;) {
    const state = await getTutorialState(page);
    if (!state) {
      throw new TutorialStepError(
        'The tutorial state is not available anymore (was the tutorial exited?).',
        { stepIndex: lastHandledStepIndex, step: null, state: null }
      );
    }
    if (state.displayEndDialog) {
      log(`Tutorial "${tutorial.id}" completed (${flow.length} steps).`);
      return;
    }

    // Close any extra page (preview window) once the main flow is back in the
    // editor.
    for (const otherPage of context.pages()) {
      if (otherPage !== page && !state.wrongEditorInfoOpen) {
        await otherPage.close().catch(() => {});
      }
    }

    if (state.stepIndex !== lastHandledStepIndex) {
      if (state.stepIndex < lastHandledStepIndex) {
        log(
          `⚠️ Went back from step ${lastHandledStepIndex} to ${state.stepIndex} (a dialog was probably closed).`
        );
      }
      lastHandledStepIndex = state.stepIndex;
      attemptsForCurrentStep = 0;
    }

    const step = flow[state.stepIndex];

    if (state.wrongEditorInfoOpen) {
      const tabSelector = getEditorTabSelector(state.expectedEditor);
      log(
        `Wrong editor open: switching to ${JSON.stringify(
          state.expectedEditor
        )}.`
      );
      if (tabSelector) {
        await page
          .locator(tabSelector)
          .first()
          .click({ timeout: 10 * 1000 });
        await page.waitForTimeout(1500);
        continue;
      }
    }

    attemptsForCurrentStep++;
    log(
      `Step ${state.stepIndex + 1}/${
        flow.length
      } (attempt ${attemptsForCurrentStep}): ` +
        `highlight=${
          state.elementToHighlightId || 'none'
        } trigger=${JSON.stringify(step.nextStepTrigger || {}).slice(0, 120)}`
    );

    let actionError = null;
    try {
      await performStepAction({
        page,
        context,
        step,
        state,
        attempt: attemptsForCurrentStep,
        log,
      });
    } catch (error) {
      actionError = error;
      log(`Action failed: ${error.message.split('\n')[0]}`);
    }

    const advanced = await waitForStepChange(page, state.stepIndex);
    if (
      !advanced &&
      attemptsForCurrentStep === 1 &&
      (step.nextStepTrigger || {}).presenceOfElement
    ) {
      // The expected element may be in a virtualized list that is too short
      // to contain it on small screens: search for it like a user would,
      // using the bold text of the tooltip.
      const textToType = extractTextToType(step);
      // Prefer the search input of the open dialog, if any (there can be
      // several search inputs on screen, e.g. behind the dialog).
      let searchInput = page
        .locator('[role="dialog"] input[placeholder*="earch" i]')
        .filter({ visible: true })
        .first();
      if (!(await searchInput.isVisible().catch(() => false))) {
        searchInput = page
          .locator('input[placeholder*="earch" i]')
          .filter({ visible: true })
          .first();
      }
      if (textToType && (await searchInput.isVisible().catch(() => false))) {
        log(`Searching for "${textToType}" to reveal the expected element.`);
        await searchInput.fill(textToType).catch(() => {});
        await waitForStepChange(page, state.stepIndex);
        continue;
      }
    }
    if (!advanced) {
      // An unexpected dialog (e.g. an error alert) may have opened above the
      // current one, blocking the step: dismiss any dialog that does not
      // contain the element the tutorial points to, like a user would.
      const dismissedDialogs = await page
        .evaluate((selector) => {
          const target = selector ? document.querySelector(selector) : null;
          const dismissed = [];
          for (const dialog of document.querySelectorAll('[role="dialog"]')) {
            if (target && dialog.contains(target)) continue;
            const closeButton = [...dialog.querySelectorAll('button')].find(
              (button) =>
                /^(close|ok|cancel|got it|abandon)$/i.test(
                  (button.textContent || '').trim()
                )
            );
            if (closeButton) {
              dismissed.push((dialog.textContent || '').trim().slice(0, 120));
              closeButton.click();
            }
          }
          return dismissed;
        }, state.elementToHighlightId || null)
        .catch(() => []);
      if (dismissedDialogs.length) {
        log(
          `Dismissed unexpected dialog(s): ${JSON.stringify(dismissedDialogs)}`
        );
      }
    }
    if (!advanced && attemptsForCurrentStep >= MAX_ATTEMPTS_PER_STEP) {
      // The tutorial tooltip/highlighter hides itself in some situations
      // (error boundary displayed, another dialog opened above): include
      // those in the report as they usually explain "element not found"
      // failures.
      const pageDiagnostics = await page
        .evaluate((elementToHighlightId) => {
          const tooltip = document.querySelector(
            '#in-app-tutorial-tooltip-displayer'
          );
          return {
            hasErrorBoundary: !!document.querySelector('[data-error-boundary]'),
            openDialogsCount:
              document.querySelectorAll('[role="dialog"]').length,
            highlightedElementExists: elementToHighlightId
              ? !!document.querySelector(elementToHighlightId)
              : null,
            tooltipText: tooltip
              ? (tooltip.textContent || '').trim().slice(0, 120)
              : null,
            avatarDisplayed: !!document.querySelector(
              '#in-app-tutorial-avatar'
            ),
          };
        }, state.elementToHighlightId || null)
        .catch(() => null);
      throw new TutorialStepError(
        `Tutorial "${tutorial.id}" is broken at step ${state.stepIndex} ` +
          `(highlighted element: ${state.elementToHighlightId || 'none'}, ` +
          `trigger: ${JSON.stringify(step.nextStepTrigger || {})})` +
          (actionError
            ? `. The action could not be performed: ${actionError.message}`
            : '. The action was performed but the tutorial did not advance.') +
          (pageDiagnostics
            ? ` Page state: ${JSON.stringify(pageDiagnostics)}.`
            : ''),
        { stepIndex: state.stepIndex, step, state }
      );
    }
  }
};

module.exports = { playTutorial, TutorialStepError };
