// @ts-check
const {
  splitTopLevelCommas,
  extractIdTokens,
  extractAttributeNames,
  extractSelectorUsages,
  collectDeclaredDataKeys,
  checkCssSelector,
  checkTutorial,
} = require('../lib/InAppTutorialSelectorChecker');

describe('splitTopLevelCommas', () => {
  it('splits a selector list on top-level commas only', () => {
    expect(splitTopLevelCommas('#a, #b')).toEqual(['#a', '#b']);
    expect(
      splitTopLevelCommas(
        'div:is([data-open=true], :not([aria-hidden=true])) #a'
      )
    ).toEqual(['div:is([data-open=true], :not([aria-hidden=true])) #a']);
  });
});

describe('extractIdTokens', () => {
  it('extracts #id, [id=], [id^=], [id$=] tokens', () => {
    expect(extractIdTokens('#object-editor-dialog #apply-button')).toEqual([
      'object-editor-dialog',
      'apply-button',
    ]);
    expect(extractIdTokens('[id^="scene-item"][data-default="true"]')).toEqual([
      'scene-item',
    ]);
    expect(
      extractIdTokens('[id$=online-web-button][id^=launch-export]')
    ).toEqual(['online-web-button', 'launch-export']);
    expect(extractIdTokens('[id="Z Order"]')).toEqual(['Z Order']);
  });
});

describe('extractAttributeNames', () => {
  it('extracts attribute names but not id', () => {
    expect(
      extractAttributeNames('#a[data-active="true"][id^=tab][data-open]')
    ).toEqual(['data-active', 'data-open']);
  });
});

describe('checkCssSelector', () => {
  const sourceBlob = [
    'id="add-new-object-button"',
    'id="data-active"',
    'const id = `parameter-${props.parameterIndex}-expression-field`;',
    "data={{ isFiltered: 'true' }}",
  ].join('\n');

  it('accepts an id found verbatim in the sources', () => {
    expect(checkCssSelector('#add-new-object-button', sourceBlob)).toEqual([]);
  });

  it('rejects an id absent from the sources', () => {
    expect(checkCssSelector('#removed-button', sourceBlob)[0]).toMatch(
      /removed-button/
    );
  });

  it('accepts a selector list when at least one alternative is valid', () => {
    expect(
      checkCssSelector('#removed-button, #add-new-object-button', sourceBlob)
    ).toEqual([]);
  });

  it('accepts dynamic id families when their construction site exists', () => {
    expect(
      checkCssSelector('#parameter-2-expression-field', sourceBlob)
    ).toEqual([]);
  });

  it('rejects dynamic id families when their construction site is gone', () => {
    expect(checkCssSelector('#variable-0-name', sourceBlob)[0]).toMatch(
      /variable-0-name/
    );
  });

  it('accepts property-name ids that cannot be checked statically', () => {
    expect(checkCssSelector('#FollowOnY', sourceBlob)).toEqual([]);
    expect(checkCssSelector('[id="Z Order"]', sourceBlob)).toEqual([]);
  });

  it('accepts drawer close buttons built from the drawer id', () => {
    const blobWithDrawer =
      sourceBlob + '\nid={`${props.id}-close`}\nid="my-drawer"';
    expect(checkCssSelector('#my-drawer-close', blobWithDrawer)).toEqual([]);
    expect(checkCssSelector('#other-drawer-close', blobWithDrawer)[0]).toMatch(
      /other-drawer-close/
    );
  });

  it('accepts known camelCase dataset attributes', () => {
    expect(
      checkCssSelector(
        '#add-new-object-button[data-is-filtered="false"]',
        sourceBlob
      )
    ).toEqual([]);
  });

  it('rejects unknown dataset attributes', () => {
    expect(
      checkCssSelector(
        '#add-new-object-button[data-default="true"]',
        sourceBlob
      )[0]
    ).toMatch(/data-default/);
  });
});

describe('extractSelectorUsages and collectDeclaredDataKeys', () => {
  const tutorial = {
    id: 'test',
    initialProjectData: { gameScene: 'GameScene' },
    flow: [
      {
        id: 'Start',
        elementToHighlightId: '#a',
        nextStepTrigger: { presenceOfElement: '#b' },
        shortcuts: [{ trigger: { absenceOfElement: '#c' } }],
      },
      {
        elementToHighlightId: 'objectInObjectsList:player',
        nextStepTrigger: { instanceAddedOnScene: 'player' },
        mapProjectData: { player: 'sceneLastObjectName:gameScene' },
      },
    ],
  };

  it('extracts selectors from steps and shortcuts', () => {
    const usages = extractSelectorUsages(tutorial);
    expect(usages.map((usage) => usage.selector)).toEqual([
      '#a',
      '#b',
      '#c',
      'objectInObjectsList:player',
    ]);
    expect(usages[2].field).toBe('shortcuts[0].trigger.absenceOfElement');
  });

  it('collects declared data keys', () => {
    expect(Array.from(collectDeclaredDataKeys(tutorial)).sort()).toEqual([
      'gameScene',
      'player',
    ]);
  });
});

describe('checkTutorial', () => {
  const sourceBlob = 'id="a"\nid="b"\nid="c"';

  it('validates project data accessors against declared keys', () => {
    const tutorial = {
      id: 'test',
      initialProjectData: { gameScene: 'GameScene' },
      flow: [
        {
          elementToHighlightId: 'objectInObjectsList:notDeclared',
          nextStepTrigger: { presenceOfElement: '#a' },
        },
      ],
    };
    const problems = checkTutorial(tutorial, sourceBlob);
    expect(problems).toHaveLength(1);
    expect(problems[0].reason).toMatch(/notDeclared/);
  });

  it('validates mapProjectData accessors', () => {
    const tutorial = {
      id: 'test',
      initialProjectData: { gameScene: 'GameScene' },
      flow: [{ mapProjectData: { player: 'sceneLastObjectName:missingKey' } }],
    };
    const problems = checkTutorial(tutorial, sourceBlob);
    expect(problems).toHaveLength(1);
    expect(problems[0].field).toBe('mapProjectData.player');
  });

  it('validates editorIsActive triggers', () => {
    const tutorial = {
      id: 'test',
      initialProjectData: { gameScene: 'GameScene' },
      flow: [
        { nextStepTrigger: { editorIsActive: 'gameScene:EventsSheet' } },
        { nextStepTrigger: { editorIsActive: 'Home' } },
        { nextStepTrigger: { editorIsActive: 'gameScene:UnknownEditor' } },
      ],
    };
    const problems = checkTutorial(tutorial, sourceBlob);
    expect(problems).toHaveLength(1);
    expect(problems[0].reason).toMatch(/UnknownEditor/);
  });

  it('returns no problem for a fully valid tutorial', () => {
    const tutorial = {
      id: 'test',
      initialProjectData: { gameScene: 'GameScene' },
      editorSwitches: { Start: { editor: 'Scene', scene: 'gameScene' } },
      flow: [
        {
          elementToHighlightId: '#a',
          nextStepTrigger: { presenceOfElement: '#b' },
        },
        {
          elementToHighlightId: 'editorTab:gameScene:EventsSheet',
          nextStepTrigger: { editorIsActive: 'gameScene:EventsSheet' },
        },
      ],
    };
    expect(checkTutorial(tutorial, sourceBlob)).toEqual([]);
  });
});
