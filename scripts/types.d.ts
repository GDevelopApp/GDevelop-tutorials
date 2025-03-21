export type MessageByLocale = Record<string, string>;

export type TranslatedText = {
  messageByLocale: MessageByLocale;
};

export interface InAppTutorialShortHeader {
  id: string;
  titleByLocale: MessageByLocale;
  bulletPointsByLocale: Array<MessageByLocale>;
  contentUrl: string;
  availableLocales: Array<string>;
  initialTemplateUrl?: string;
  initialProjectData?: Record<string, string>;
  isMiniTutorial: boolean;
}

export type InAppTutorialTooltip = {
  placement?: 'bottom' | 'left' | 'right' | 'top';
  mobilePlacement?: 'bottom' | 'left' | 'right' | 'top';
  title?: TranslatedText;
  description?: TranslatedText;
  touchDescription?: TranslatedText;
  standalone?: boolean;
};

type InAppTutorialFlowStepDOMChangeTrigger =
  | {
      presenceOfElement: string;
    }
  | {
      absenceOfElement: string;
    };

type AddBehaviorMetaStep = {
  metaKind: 'add-behavior';
  objectKey: string;
  behaviorListItemId: string;
  behaviorParameterPanelId: string;
  behaviorDisplayNameByLocale: MessageByLocale;
  parameters: Array<{
    parameterId: string;
    expectedValue: string;
    description: TranslatedText;
  }>;
  objectHighlightDescription: TranslatedText;
  objectHighlightTouchDescription?: TranslatedText;
  finishedConfigurationDescription?: TranslatedText;
};

type LaunchPreviewMetaStep = {
  id?: string;
  metaKind: 'launch-preview';
  description?: TranslatedText;
  inGameMessage?: TranslatedText;
  inGameTouchMessage?: TranslatedText;
  inGameMessagePosition?: string;
  nextStep:
    | 'previewLaunched'
    | {
        clickOnTooltipButton: TranslatedText;
      };
};

type InAppTutorialFlowMetaStep = AddBehaviorMetaStep | LaunchPreviewMetaStep;

export type InAppTutorialFlowStepTrigger =
  | InAppTutorialFlowStepDOMChangeTrigger
  | {
      valueHasChanged: true;
    }
  | {
      valueEquals: string;
    }
  | {
      objectAddedInLayout: true;
    }
  | {
      instanceAddedOnScene: string;
      instancesCount?: number;
    }
  | {
      previewLaunched: true;
      inGameMessage?: TranslatedText;
      inGameTouchMessage?: TranslatedText;
      inGameMessagePosition?: string;
    }
  | {
      editorIsActive: string;
    }
  | {
      clickOnTooltipButton: TranslatedText;
    };

export type InAppTutorialFlowStepShortcutTrigger =
  | InAppTutorialFlowStepDOMChangeTrigger
  | { objectAddedInLayout: true };

export type InAppTutorialFlowStep = {
  elementToHighlightId?: string;
  id?: string;
  isTriggerFlickering?: true;
  deprecated?: true;
  nextStepTrigger?: InAppTutorialFlowStepTrigger;
  shortcuts?: Array<{
    stepId: string;
    // TODO: Adapt provider to make it possible to use other triggers as shortcuts
    trigger: InAppTutorialFlowStepShortcutTrigger;
  }>;
  mapProjectData?: Record<string, 'lastProjectObjectName'>;
  tooltip?: InAppTutorialTooltip;
  skippable?: true;
  isOnClosableDialog?: boolean;
};

export type EditorIdentifier = 'Scene' | 'EventsSheet' | 'Home';

export type InAppTutorialEndDialog = {
  content: Array<
    | TranslatedText
    | {
        image: {
          imageSource: string;
          linkHref?: string;
        };
      }
  >;
};

export type InAppTutorial = {
  id: string;
  flow: Array<InAppTutorialFlowStep | InAppTutorialFlowMetaStep>;
  editorSwitches: Record<string, EditorIdentifier>;
  endDialog: InAppTutorialEndDialog;
  availableLocales: Array<string>;
  initialTemplateUrl?: string;
  initialProjectData?: Record<string, string>;
  isMiniTutorial: boolean;
  titleByLocale: MessageByLocale;
  bulletPointsByLocale: Array<MessageByLocale>;
};

export type libGDevelop = any;
export type gdProject = any;
