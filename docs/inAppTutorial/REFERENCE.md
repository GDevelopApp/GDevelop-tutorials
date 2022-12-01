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
      "fr-FR": "Cliquez sur le bouton"
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
  "endDialog": {...},
  "availableLocales": [...],
}
```

### `id`

This id is a string that should be unique across all in-app tutorials.

### `availableLocales`

This is the list of locales for which a translation is available. This can be displayed to the GDevelop user before following the tutorial.

### `endDialog`

This field holds the content for the dialog that will displayed after the user has completed the last step of the [flow](#flow).

It's a field that contains an array under the `content` key.

The array contains either:

- an image (that can be clickable if `linkHref` field is provided)

  ```json
  {
    ...,
    "endDialog": {
      "content": [
        ...,
        {
          "image": {
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

- `id` (string): id of the step (useful for shortcuts and editor switches)
- `elementToHighlightId` (string): the CSS selector of the element to highlight
- `nextStepTrigger`: see [Triggers](#triggers)
- `tooltip`: see [Tooltip](#tooltip)
- `dialog`: A dialog to display with the same structure as the [the end dialog](#enddialog)
- `isCheckpoint` (true): Useful to divide a tutorial in different part. When there are checkpoint steps, the notion of progress is part-based.
- `isTriggerFlickering`(true): useful when a DOM mutation is not caught and the presence trigger is not fired.
- `shortcuts`: list of steps that the flow can use as shortcuts.
  - `stepId`: id of the step to jump to
  - `trigger`: DOM trigger (presence of absence of element)
- `skippable` (true): if the step can be skipped (useful when the user interaction can result in this step not being mandatory)
- `isOnClosableDialog` (true): if the step is on a closable dialog, if the element to highlight is missing (meaning the dialog has been closed), the flow will go back to the previous step that is not on a closable dialog.
- `mapProjectData` (object): allow to read data in the GDevelop project object and store it during the duration of the tutorial. This data can then be used in the tooltips. See [Available Project Data](#available-project-data)

#### **Triggers**

At the moment, only one trigger can be specified to go the next step. Here is the list of supported triggers:

- `presenceOfElement` (string): the CSS selector of an element present in the DOM or a custom selector
- `absenceOfElement` (string): the CSS selector of an element absent from the DOM or a custom selector
- `valueHasChanged` (true): the CSS selector of an input whose value has changed
- `instanceAddedOnScene` (string): the name of an object for which an instance has been added on the scene
- `previewLaunched` (true): a preview has been launched
- `clickOnTooltipButton` (`messageByLocale` object): the label of the button displayed in the tooltip that the user has to click to go to the next step.
- `editorIsActive` (string `scene:editor`): to detect when a user switched editors
  - `scene` is optional (if your tutorial only requires a single scene, no need to specify it). In that case, you can write `:EventsSheet` if you want to check the user is on the events sheet.
  - The editor possible values are the same as for the [editor switches](#editorswitches).
  - The scene is the key under which the scene name has been stored.

Notes:

- You can learn about CSS selectors [here](https://www.w3schools.com/cssref/css_selectors.asp).

**Custom selector**

There are a few custom selectors that you can use:

- `objectInObjectsList:enemy`: to select an object in the objects list in the scene editor
- `sceneInProjectManager:playScene`: to select a scene in the scene list in the project manager
- `objectInObjectOrResourceSelector:enemy`: to select an object in the objects list that appears when opening the instruction editor
- `editorTab:playScene:Scene`: to select the tab of an editor. The scene name is optional so if you don't need it, use `editorTab::Scene`.

#### **Available Project Data**

Project data is read when the step is complete. Here is how to construct `mapProjectData`:

- For each item of the object:
  - the key of the object is the string under which to store the data
  - the value is the "data accessor"
- At the moment, here are the available data accessors:
  - `projectLastSceneName` that will read the name of the last scene added to the project.
  - `sceneLastObjectName:scene` that will read the name of the last object added to the scene (scene is optional, if you don't mention it, the first project scene is used)

Example: This will store the name of the last object added to the project under the key `firstObject`:

```json
  {
    ...,
    "mapProjectData": {
      "firstObject": "projectLastSceneName",
    }
  }
```

#### **Tooltip**

For each step, you can specify a tooltip to display next to the element you want to highlight. A tooltip contains the 3 following fields:

- `title`: (optional) Translated text
- `description`: (optional) Translated text
- `placement`: The placement of the tooltip relatively to the element to highlight. Either one of those values: `bottom`, `top`, `left`, `right` (default value `bottom`)

Notes:

- At least one field among `title` and `description` should be provided. If you don't want to display a tooltip, do not provide the `tooltip` field in your step.
- To use data stored with `mapProjectData`, include the placeholder `$(...)` in your text.
  - For example, the description `"Drag $(firstObject) to the scene"` will be displayed `"Drag Platformer to the scene"`.
- You can also use a function that will display dynamic data in your tooltip texts. Available functions:
  - Use `$(instancesCount:firstObject)` to display the number of instances on the scene of the object saved under the key `firstObject`.

### `editorSwitches`

The orchestrator detects when the user went into an editor (either the home page, a scene editor or an events sheet) that does not allow the tutorial to be continued.

For this to work, you must provide the editor switches that happen during your tutorial. Here is how to do it:

If your flow contains a step with id `ClickOnCreateObjectButton` (that should happen in the scene editor) and another step `ClickOnAddEventButton` (that should happen in the events sheet for scene `playScene`), here is what the field should look like:

```json
{
  ...,
  "editorSwitches": {
    {
      "ClickOnCreateObjectButton": { "editor": "Scene" },
      "ClickOnAddEventButton": { "editor": "EventsSheet", "scene": "playScene" },
    }
  }
}
```

Notes:

- `playScene` is the key under which the name of the scene has been stored during the tutorial.
- The possible values for the expected editor are: `Scene`, `EventsSheet`, `Home` (other editors are not supported at the moment).
