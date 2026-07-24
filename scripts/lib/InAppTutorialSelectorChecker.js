// @ts-check
/**
 * Static checker for in-app tutorial selectors.
 *
 * Tutorials reference DOM elements of the GDevelop editor through CSS
 * selectors (`elementToHighlightId`, `presenceOfElement`, `absenceOfElement`).
 * When an id is renamed or removed in the editor, the tutorial silently breaks.
 * This module extracts every selector used by a tutorial and verifies that the
 * ids/attributes it relies on still exist in the GDevelop `newIDE/app/src`
 * sources.
 */

/**
 * @typedef {Object} SelectorUsage
 * @property {number} stepIndex
 * @property {string | undefined} stepId
 * @property {string} field Where the selector comes from (e.g. "elementToHighlightId").
 * @property {string} selector
 */

/**
 * @typedef {Object} Problem
 * @property {string} tutorialId
 * @property {number | null} stepIndex
 * @property {string} field
 * @property {string} selector
 * @property {string} reason
 */

/**
 * Selector prefixes interpolated at runtime by InAppTutorialOrchestrator
 * (see newIDE/app/src/InAppTutorial/InAppTutorialOrchestrator.js).
 * The suffix is a key of the tutorial project data, not a DOM id.
 */
const PROJECT_DATA_ACCESSOR_PREFIXES = [
  'objectInObjectsList:',
  'sceneInProjectManager:',
  'objectInObjectOrResourceSelector:',
  'editorTab:',
];

const KNOWN_EDITOR_TYPES = ['Scene', 'EventsSheet', 'Home'];

/**
 * Ids that are built dynamically in the editor sources (template literals,
 * concatenations...) and therefore cannot be found verbatim. Each family is
 * identified by a pattern on the id used in tutorials, and by one or more
 * "needles": strings that must be present in the sources for the construction
 * site of this id family to be considered still alive.
 */
const DYNAMIC_ID_FAMILIES = [
  { pattern: /^instruction-item-/, needles: ['instruction-item-'] },
  {
    pattern: /^instruction-or-expression-/,
    needles: ['instruction-or-expression-'],
  },
  { pattern: /^object-item-/, needles: ['object-item-'] },
  { pattern: /^behavior-item-/, needles: ['behavior-item-'] },
  { pattern: /^behavior-parameters-/, needles: ['behavior-parameters-'] },
  { pattern: /^extension-list-item-/, needles: ['extension-list-item-'] },
  { pattern: /^asset-card-/, needles: ['asset-card-'] },
  { pattern: /^asset-pack-/, needles: ['asset-pack-'] },
  { pattern: /^scene-item-\d+$/, needles: ['scene-item-${'] },
  { pattern: /^project-manager-tab-/, needles: ['project-manager-tab-${'] },
  { pattern: /^tab-/, needles: ['tab-${'] },
  { pattern: /^event-\d/, needles: ['event-${'] },
  { pattern: /^parameter-\d+-/, needles: ['parameter-${'] },
  { pattern: /^variable-\d+-/, needles: ['variable-${'] },
  { pattern: /^layer-\d+$/, needles: ['layer-${'] },
  {
    pattern: /^layer-selected-(checked|unchecked)$/,
    needles: ['layer-selected-${'],
  },
  {
    pattern: /^add-(action|condition)-button-empty$/,
    needles: ["'add-condition-button'", "'add-action-button'", "'-empty'"],
  },
  {
    pattern: /^open-(number|string)-expression-popover-button$/,
    needles: ['-expression-popover-button'],
  },
  { pattern: /^launch-export-/, needles: ['launch-export-${'] },
  {
    pattern: /^online-web-button$/,
    needles: ['launch-export-${', 'online-web'],
  },
];

/**
 * `data-*` attributes that are set through a React `data`/dataset object with
 * a camelCase key (e.g. `data={{ isFiltered: ... }}` renders
 * `data-is-filtered`), so the kebab-case attribute never appears verbatim in
 * the sources. Only keys that have been manually verified to exist should be
 * listed here; for each of them the camelCase key followed by ':' must still
 * be found in the sources.
 */
const KNOWN_CAMEL_CASE_DATASET_KEYS = [
  'effective',
  'global',
  'groupName',
  'isFiltered',
];

/** @param {string} attribute @returns {string} */
const toCamelCaseDatasetKey = (attribute) =>
  attribute
    .replace(/^data-/, '')
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Splits a selector list on commas that are not nested inside parentheses or
 * brackets (e.g. `:is(a, b)` is not split).
 * @param {string} selector
 * @returns {string[]}
 */
const splitTopLevelCommas = (selector) => {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  let current = '';
  for (const character of selector) {
    if (character === '(' || character === '[') depth++;
    else if (character === ')' || character === ']') depth--;
    if (character === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

/**
 * Extracts the ids a selector relies on: `#some-id`, `[id="some-id"]`,
 * `[id^=prefix]`, `[id$=suffix]`.
 * @param {string} selector
 * @returns {string[]}
 */
const extractIdTokens = (selector) => {
  /** @type {string[]} */
  const ids = [];
  for (const match of selector.matchAll(/#([\w-]+)/g)) {
    ids.push(match[1]);
  }
  for (const match of selector.matchAll(
    /\[id[\^$*]?=["']?([\w -]+?)["']?\]/g
  )) {
    ids.push(match[1]);
  }
  return ids;
};

/**
 * Extracts the attribute names (other than `id`) a selector relies on, e.g.
 * `data-active` in `[data-active="true"]` or `[data-active]`.
 * @param {string} selector
 * @returns {string[]}
 */
const extractAttributeNames = (selector) => {
  /** @type {string[]} */
  const attributes = [];
  for (const match of selector.matchAll(/\[([a-zA-Z-]+)(?:[\^$*]?=|\])/g)) {
    if (match[1] !== 'id') attributes.push(match[1]);
  }
  return attributes;
};

/**
 * @param {string} id
 * @param {string} sourceBlob
 * @returns {string | null} A failure reason, or null if the id is fine.
 */
const checkId = (id, sourceBlob) => {
  if (sourceBlob.includes(id)) return null;
  // Editor ids are kebab-case: an id containing an uppercase letter and no
  // dash is a property/behavior field name generated from project data (e.g.
  // `#FollowOnY`, `#playerNumber`, `[id="Z Order"]`) and cannot be checked
  // statically.
  if (/^[A-Z]/.test(id) || (/[A-Z]/.test(id) && !id.includes('-'))) return null;
  // DrawerTopBar builds its buttons ids from its own id
  // (`${props.id}-close` / `${props.id}-icon`): accept them when the base id
  // still exists.
  const drawerButtonMatch = id.match(/^(.+)-(close|icon)$/);
  if (
    drawerButtonMatch &&
    sourceBlob.includes('${props.id}-' + drawerButtonMatch[2]) &&
    sourceBlob.includes(drawerButtonMatch[1])
  ) {
    return null;
  }
  for (const family of DYNAMIC_ID_FAMILIES) {
    if (family.pattern.test(id)) {
      const missingNeedles = family.needles.filter(
        (needle) => !sourceBlob.includes(needle)
      );
      if (missingNeedles.length === 0) return null;
      return `id "${id}" matches a dynamic id family but its construction site was not found in the editor sources (missing: ${missingNeedles.join(
        ', '
      )})`;
    }
  }
  return `id "${id}" was not found in the editor sources`;
};

/**
 * @param {string} attribute
 * @param {string} sourceBlob
 * @returns {string | null} A failure reason, or null if the attribute is fine.
 */
const checkAttribute = (attribute, sourceBlob) => {
  if (sourceBlob.includes(attribute)) return null;
  const camelCaseKey = toCamelCaseDatasetKey(attribute);
  if (
    KNOWN_CAMEL_CASE_DATASET_KEYS.includes(camelCaseKey) &&
    sourceBlob.includes(camelCaseKey + ':')
  ) {
    return null;
  }
  return `attribute "${attribute}" was not found in the editor sources`;
};

/**
 * Checks a raw CSS selector (no project data accessor prefix) against the
 * editor sources. A selector list (comma-separated) passes if at least one of
 * its alternatives passes, matching `querySelector` semantics.
 * @param {string} selector
 * @param {string} sourceBlob
 * @returns {string[]} Failure reasons (empty if the selector is fine).
 */
const checkCssSelector = (selector, sourceBlob) => {
  const alternatives = splitTopLevelCommas(selector);
  /** @type {string[]} */
  const allReasons = [];
  for (const alternative of alternatives) {
    /** @type {string[]} */
    const reasons = [];
    for (const id of extractIdTokens(alternative)) {
      const reason = checkId(id, sourceBlob);
      if (reason) reasons.push(reason);
    }
    for (const attribute of extractAttributeNames(alternative)) {
      const reason = checkAttribute(attribute, sourceBlob);
      if (reason) reasons.push(reason);
    }
    if (reasons.length === 0) return []; // One alternative is fully valid.
    allReasons.push(...reasons);
  }
  return allReasons;
};

/**
 * Collects all the project data keys a tutorial declares
 * (`initialProjectData` and every step's `mapProjectData`).
 * @param {any} tutorial
 * @returns {Set<string>}
 */
const collectDeclaredDataKeys = (tutorial) => {
  const keys = new Set(Object.keys(tutorial.initialProjectData || {}));
  for (const step of tutorial.flow || []) {
    for (const key of Object.keys(step.mapProjectData || {})) {
      keys.add(key);
    }
  }
  return keys;
};

/**
 * Extracts every selector usage of a tutorial flow.
 * @param {any} tutorial
 * @returns {SelectorUsage[]}
 */
const extractSelectorUsages = (tutorial) => {
  /** @type {SelectorUsage[]} */
  const usages = [];
  /** @type {any[]} */ (tutorial.flow || []).forEach((step, stepIndex) => {
    /** @param {string} field @param {string | undefined} selector */
    const add = (field, selector) => {
      if (typeof selector === 'string') {
        usages.push({ stepIndex, stepId: step.id, field, selector });
      }
    };
    add('elementToHighlightId', step.elementToHighlightId);
    const trigger = step.nextStepTrigger || {};
    add('nextStepTrigger.presenceOfElement', trigger.presenceOfElement);
    add('nextStepTrigger.absenceOfElement', trigger.absenceOfElement);
    add('nextStepTrigger.editorIsActive', trigger.editorIsActive);
    /** @type {any[]} */ (step.shortcuts || []).forEach(
      /** @param {any} shortcut @param {number} shortcutIndex */ (
        shortcut,
        shortcutIndex
      ) => {
        const shortcutTrigger = shortcut.trigger || {};
        add(
          `shortcuts[${shortcutIndex}].trigger.presenceOfElement`,
          shortcutTrigger.presenceOfElement
        );
        add(
          `shortcuts[${shortcutIndex}].trigger.absenceOfElement`,
          shortcutTrigger.absenceOfElement
        );
      }
    );
  });
  return usages;
};

/**
 * Checks a project data accessor selector (e.g. `objectInObjectsList:player`)
 * or an `editorIsActive` value against the keys declared by the tutorial.
 * @param {string} selector
 * @param {string} field
 * @param {Set<string>} declaredDataKeys
 * @returns {string[]} Failure reasons.
 */
const checkProjectDataAccessor = (selector, field, declaredDataKeys) => {
  if (field === 'nextStepTrigger.editorIsActive') {
    // Format: "<sceneKey>:<editorType>" or "Home".
    if (selector === 'Home') return [];
    const [sceneKey, editorType] = selector.split(':');
    /** @type {string[]} */
    const reasons = [];
    if (!editorType || !KNOWN_EDITOR_TYPES.includes(editorType)) {
      reasons.push(
        `editorIsActive value "${selector}" does not use a known editor type (${KNOWN_EDITOR_TYPES.join(
          ', '
        )})`
      );
    }
    if (sceneKey && !declaredDataKeys.has(sceneKey)) {
      reasons.push(
        `editorIsActive value "${selector}" references project data key "${sceneKey}" which is not declared in initialProjectData or any mapProjectData`
      );
    }
    return reasons;
  }

  if (selector.startsWith('editorTab:')) {
    // Format: "editorTab:<sceneKey>:<editorType>" or "editorTab:Home".
    const [, sceneKey, editorType] = selector.split(':');
    if (sceneKey === 'Home' && !editorType) return [];
    /** @type {string[]} */
    const reasons = [];
    if (!editorType || !KNOWN_EDITOR_TYPES.includes(editorType)) {
      reasons.push(
        `selector "${selector}" does not use a known editor type (${KNOWN_EDITOR_TYPES.join(
          ', '
        )})`
      );
    }
    if (sceneKey && sceneKey !== 'Home' && !declaredDataKeys.has(sceneKey)) {
      reasons.push(
        `selector "${selector}" references project data key "${sceneKey}" which is not declared in initialProjectData or any mapProjectData`
      );
    }
    return reasons;
  }

  const dataKey = selector.slice(selector.indexOf(':') + 1);
  if (!declaredDataKeys.has(dataKey)) {
    return [
      `selector "${selector}" references project data key "${dataKey}" which is not declared in initialProjectData or any mapProjectData`,
    ];
  }
  return [];
};

/**
 * Checks the `mapProjectData` and `editorSwitches` declarations of a tutorial.
 * @param {any} tutorial
 * @param {Set<string>} declaredDataKeys
 * @returns {Problem[]}
 */
const checkProjectDataDeclarations = (tutorial, declaredDataKeys) => {
  /** @type {Problem[]} */
  const problems = [];
  /** @type {any[]} */ (tutorial.flow || []).forEach((step, stepIndex) => {
    for (const [key, accessor] of Object.entries(step.mapProjectData || {})) {
      const isValid =
        accessor === 'projectLastSceneName' ||
        (typeof accessor === 'string' &&
          accessor.startsWith('sceneLastObjectName:') &&
          declaredDataKeys.has(accessor.split(':')[1]));
      if (!isValid) {
        problems.push({
          tutorialId: tutorial.id,
          stepIndex,
          field: `mapProjectData.${key}`,
          selector: String(accessor),
          reason: `unknown or invalid project data accessor "${accessor}"`,
        });
      }
    }
  });
  for (const [stepId, editorSwitch] of Object.entries(
    tutorial.editorSwitches || {}
  )) {
    const sceneKey = /** @type {any} */ (editorSwitch).scene;
    if (sceneKey && !declaredDataKeys.has(sceneKey)) {
      problems.push({
        tutorialId: tutorial.id,
        stepIndex: null,
        field: `editorSwitches.${stepId}`,
        selector: String(sceneKey),
        reason: `references project data key "${sceneKey}" which is not declared in initialProjectData or any mapProjectData`,
      });
    }
  }
  return problems;
};

/**
 * Checks a whole tutorial against the editor sources.
 * @param {any} tutorial
 * @param {string} sourceBlob Concatenated content of all newIDE/app/src files.
 * @returns {Problem[]}
 */
const checkTutorial = (tutorial, sourceBlob) => {
  const declaredDataKeys = collectDeclaredDataKeys(tutorial);
  /** @type {Problem[]} */
  const problems = checkProjectDataDeclarations(tutorial, declaredDataKeys);

  for (const usage of extractSelectorUsages(tutorial)) {
    const isProjectDataAccessor =
      PROJECT_DATA_ACCESSOR_PREFIXES.some((prefix) =>
        usage.selector.startsWith(prefix)
      ) || usage.field === 'nextStepTrigger.editorIsActive';
    const reasons = isProjectDataAccessor
      ? checkProjectDataAccessor(usage.selector, usage.field, declaredDataKeys)
      : checkCssSelector(usage.selector, sourceBlob);
    for (const reason of reasons) {
      problems.push({
        tutorialId: tutorial.id,
        stepIndex: usage.stepIndex,
        field: usage.field,
        selector: usage.selector,
        reason,
      });
    }
  }
  return problems;
};

module.exports = {
  splitTopLevelCommas,
  extractIdTokens,
  extractAttributeNames,
  extractSelectorUsages,
  collectDeclaredDataKeys,
  checkCssSelector,
  checkTutorial,
};
