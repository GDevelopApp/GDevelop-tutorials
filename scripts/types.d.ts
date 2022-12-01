export interface InAppTutorialShortHeader {
  id: string;
  contentUrl: string;
  availableLocales: Array<string>;
}

export type MessageByLocale = Record<string, string>;

export type TranslatedText = {
  messageByLocale: MessageByLocale;
};

export type InAppTutorialTooltip = {
  placement?: 'bottom' | 'left' | 'right' | 'top';
  title?: TranslatedText;
  description?: TranslatedText;
};

type InAppTutorialFlowStepDOMChangeTrigger =
  | {
      presenceOfElement: string;
    }
  | {
      absenceOfElement: string;
    };

export type InAppTutorialFlowStepTrigger =
  | InAppTutorialFlowStepDOMChangeTrigger
  | {
      valueHasChanged: true;
    }
  | {
      instanceAddedOnScene: string;
    }
  | {
      previewLaunched: true;
    }
  | {
      clickOnTooltipButton: string;
    };

export type InAppTutorialFlowStep = {
  elementToHighlightId?: string;
  id?: string;
  isTriggerFlickering?: true;
  nextStepTrigger?: InAppTutorialFlowStepTrigger;
  shortcuts?: Array<{
    stepId: string;
    // TODO: Adapt provider to make it possible to use other triggers as shortcuts
    trigger: InAppTutorialFlowStepDOMChangeTrigger;
  }>;
  mapProjectData?: Record<string, 'lastProjectObjectName'>;
  tooltip?: InAppTutorialTooltip;
  skippable?: true;
  isOnClosableDialog?: true;
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
  flow: Array<InAppTutorialFlowStep>;
  editorSwitches: Record<string, EditorIdentifier>;
  endDialog: InAppTutorialEndDialog;
  availableLocales: Array<string>;
};
