# GDevelop In-App Tutorial Documentation

## How is handled the translation?

To display the tutorial with different languages, every text that you will specify has to be an object `messageByLocale` with locales as keys and the translated sentence as value.

For example, this will be the description of a tooltip:

```json
{
  ...,
  "description": {
    "messageByLocale": {
      "en": "Click on the button",
      "fr-fr": "Cliquez sur le bouton"
    }
  }
}
```

Note: If the user language is not available, it will fallback to english.

## JSON Structure

An in-app tutorial is a JSON with 4 fields:

```json
{
  "id": "physics2-joints",
  "flow": [...],
  "editorSwitches": {...},
  "endDialog": {...}
}
```

### `id`

This id is a string that should be unique across all in-app tutorials.

### `endDialog`

This field holds the content for the dialog that will displayed after the user has completed the last step of the [flow](#flow).

It's a field that contains an array under the `content` key.

The array contains either:

- a call to action (CTA) that is a clickable image

  ```json
  {
    ...,
    "endDialog": {
      "content": [
        ...,
        {
          "cta": {
            "imageSource": "https://resources.gdevelop-app.com/...",
            "linkHref": "https://gdevelop.io"
        }
      ]
    }
  }
  ```

- a text

  ```json
  {
    ...,
    "endDialog": {
      "content": [
        ...,
        {
          "text": {
            "messageByLocale": {
              "en": "you made it until the end of the tutorial!"
            }
          }
        }
      ]
    }
  }
  ```

### `flow`

A flow is an array of steps.

A step is more or less an element to highlight plus a trigger that can be detected programmatically to decide to go to the next step.

Here is the structure of a step (all fields are optional):

- `id` (string): Id of the step (useful for shortcuts and editor switches)
- `elementToHighlightId` (string): the CSS selector of the element to highlight
- `nextStepTrigger`: See [Triggers](#triggers)
- `tooltip`: See [Tooltip](#tooltip)
- `isTriggerFlickering`(true): Useful when a DOM mutation is not caught and the presence trigger is not fired.
- `shortcuts`: List of steps that the flow can use as shortcuts.
  - `stepId`: id of the step to jump to
  - `trigger`: DOM trigger (presence of absence of element)
- `skippable` (true): if the step can be skipped (useful when the user interaction can result in this step not being mandatory)
- `isOnClosableDialog` (true): if the step is on a closable dialog, if the element to highlight is missing (meaning the dialog has been closed), the flow will go back to the previous step that is not on a closable dialog.

#### **Triggers**

At the moment, only one trigger can be specified to go the next step. Here is the list of supported triggers:

- `presenceOfElement`: the CSS selector of an element present in the DOM
- `absenceOfElement`: the CSS selector of an element absent from the DOM
- `elementIsFilled`: the CSS selector of an input whose value has changed
- `instanceDraggedOnScene`: the name of an object for which an instance has been added on the scene
- `previewLaunched`: a preview has been launched
- `clickOnButton`: the user has clicked on the button displayed in the tooltip.

Notes:

- You can learn about CSS selectors [here](https://www.w3schools.com/cssref/css_selectors.asp).

#### **Tooltip**

For each step, you can specify a tooltip to display next to the element you want to highlight. A tooltip contains the 3 following fields:

- `title`: (optional) Translated text
- `description`: (optional) Translated text
- `placement`: The placement of the tooltip relatively to the element to highlight. Either one of those values: `bottom`, `top`, `left`, `right` (default value `bottom`)

Notes:

- At least one field among `title` and `description` should be provided. If you don't want to display a tooltip, do not provide the `tooltip` field in your step.

### `editorSwitches`

The orchestrator detects when the user went into an editor (either the home page, a scene editor or an events sheet) that does not allow the tutorial to be continued.

For this to work, you must provide the editor switches that happen during your tutorial. Here is how to do it:

If your flow contains a step with id `ClickOnCreateObjectButton` (that should happen in the scene editor) and another step `ClickOnAddEventButton` (that should happen in the events sheet), here is what the field should look like:

```json
{
  ...,
  "editorSwitches": {
    {
      "ClickOnCreateObjectButton": "Scene",
      "ClickOnAddEventButton": "EventsSheet",
    }
  }
}
```

Notes:

- The possible values for the expected editor are: `Scene`, `EventsSheet`, `Home` (other editors are not supported at the moment)
