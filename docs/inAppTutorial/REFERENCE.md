# GDevelop In-App Tutorial Documentation

"In-app tutorial" is the term used in the codebase for GDevelop. It is displayed "guided lesson" in GDevelop editor. Each term designates the same thing.

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

An in-app tutorial is a JSON with 7 fields:

```json
{
  "id": "physics2-joints",
  "flow": [...],
  "editorSwitches": {...},
  "endDialog": {...},
  "availableLocales": [...],
  "initialTemplateUrl": "https://...",
  "initialProjectData": {...},
  "titleByLocale": {...},
  "bulletPointsByLocale": {...},
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

A flow is an array of steps or [meta steps](#meta-steps).

A step is more or less an element to highlight plus a trigger that can be detected programmatically to decide to go to the next step.

Here is the structure of a step (all fields are optional):

- `id` (string): id of the step (useful for shortcuts and editor switches)
- `elementToHighlightId` (string): the CSS selector of the element to highlight
- `nextStepTrigger`: see [Triggers](#triggers)
- `tooltip`: see [Tooltip](#tooltip)
- `dialog`: A dialog to display with the same structure as the [the end dialog](#enddialog)
- `deprecated` (true): Useful to discard a step that is not useful anymore in order to not change the count of step of the tutorial and impact progress save on user side.
- `isCheckpoint` (true): Useful to divide a tutorial in different part. When there are checkpoint steps, the notion of progress is part-based.
- `isTriggerFlickering`(true): useful when a DOM mutation is not caught and the presence trigger is not fired.
- `shortcuts`: list of steps that the flow can use as shortcuts.
  - `stepId`: id of the step to jump to
  - `trigger`: DOM trigger (presence of absence of element) or objectAddedInLayout trigger.
- `skippable` (true): if the step can be skipped (useful when the user interaction can result in this step not being mandatory)
- `isOnClosableDialog` (true): if the step is on a closable dialog, if the element to highlight is missing (meaning the dialog has been closed), the flow will go back to the previous step that is not on a closable dialog.
- `mapProjectData` (object): allow to read data in the GDevelop project object and store it during the duration of the tutorial. This data can then be used in the tooltips. See [Available Project Data](#available-project-data)
- `interactsWithCanvas` (true): if the step requires interacting with the canvas (useful when a blocking layer is displayed, so the step allows the user to interact with the canvas)
- `disableBlockingLayer` (true): if the blocking layer should be disabled for this step. (useful when the step requires interacting with multiple things, and the blocking layer would prevent it)

#### **Triggers**

At the moment, only one trigger can be specified to go the next step. Here is the list of supported triggers:

- `presenceOfElement` (string): the CSS selector of an element present in the DOM or a custom selector
- `absenceOfElement` (string): the CSS selector of an element absent from the DOM or a custom selector
- `valueHasChanged` (true): the CSS selector of an input whose value has changed
- `valueEquals` (string | boolean): the CSS selector of an input whose value is equal to the string:
  - for numbers, it has to be a string (ex: "2")
  - for booleans (checkboxes), use booleans (ex: true)
- `objectAddedInLayout` (true): an object has been added to the scene (from scratch, duplication or the asset store)
- `instanceAddedOnScene` (string): the name of an object for which an instance has been added on the scene. With this additional option, at the same level
  - `instancesCount` (number): the number of instances that should be present on the scene.
- `previewLaunched` (true): a preview has been launched. With those additional options, at the same level:
  - `inGameMessage` (`messageByLocale` object): when the user launches the preview, this message will be displayed as a standalone tooltip in the preview. Placeholders can be used but markdown won't be interpreted.
  - `inGameTouchMessage` (`messageByLocale` object): same as above, for touch devices.
  - `inGameMessagePosition` (string): a string that contains the position of the avatar in the preview (for instance `top-right`).
    - For horizontal placement, it must contain `right` or `left`.
    - For vertical placement, it must contain `top` or `middle` or `bottom`.
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
- `touchDescription`: (optional) Translated text on touch devices
- `placement`: (optional) The placement of the tooltip relatively to the element to highlight. Either one of those values: `bottom`, `top`, `left`, `right` (default value `bottom`)
- `mobilePlacement`: (optional) The placement of the tooltip on mobile
- `standalone`: (optional) Boolean to display the tooltip as the Red Hero avatar on the bottom left corner of the app.

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

- `playScene` is either:
  - the key under which the name of the scene has been stored during the tutorial.
  - the key under which the name of the scene is defined in the field `initialProjectData`.
- The possible values for the expected editor are: `Scene`, `EventsSheet`, `Home` (other editors are not supported at the moment).

### `initialTemplateUrl` & `initialProjectData`

If the tutorial does not start from scratch, we can provide a template URL to download the project from with `initialTemplateUrl`. This should match the URL of the template in the GDevelop templates S3 bucket (https://resources.gdevelop-app.com/in-app-tutorials/templates/{gameName}/game.json)
This template should be available inside the `templates` folder, with the same name as the tutorial. It will get deployed to the S3 bucket when merging to master.

Inside the app, when a tutorial is running, all objects or scenes added are tracked, so they can be re-used.
However, if we start from a template, we need to know which objects or scenes are already present so they can be tracked.
Ideally, we should be able to detect them automatically, but for now, we need to provide the list of objects and scenes that are already present in the template.
To do so, we can provide the `initialProjectData` field.

Ex:

```json
{
  ...,
  "initialTemplateUrl": "https://resources.gdevelop-app.com/in-app-tutorials/templates/plinkoMultiplier/game.json",
  "initialProjectData": {
    "gameScene": "GameScene",
    "multiplier": "Multiplier",
    "particles": "PegStar_Particle"
  },
}
```

### `titleByLocale` & `bulletPointsByLocale`

These fields are used in the small dialog displayed after clicking on the guided lesson card.

## Meta steps

We're introducing meta steps to speed up the process.
These meta steps should handle particular situations that are not interesting to the tutorial designer and will also bring consistency across tutorials.

At the moment, there are 2 meta steps available (both are used in the `joystick` tutorial):

- **LaunchPreview**
- **AddBehavior**

TODO: add documentation about how to use those steps.
In the meantime, you can check how both are used in the `joystick` tutorial and discover the available fields in [the types declaration](../../scripts/types.d.ts).

## How to test your in-app tutorial in GDevelop

> Available in GDevelop desktop app only.

Starting from version 5.4.202, you can load your in-app tutorial from your computer to try it.

To do so, go to your preferences, in the section "Contributor options", activate the toggle "Show button to load guided lesson from file and test it.".

Once this is done, a new button "Load local lesson" should appear in the homepage's learn tab, above the guided lessons section. Select your JSON file and complete your lesson!

Notes:

- The editor will perform a basic schema check before actually running the tutorial.
  - If errors are found, please open the developer console, they will be listed there.
  - The check is not exhaustive.
- If your in-app tutorial is using an initial template, make sure to have it opened before loading the tutorial.
- If you are using meta steps in your tutorial, you need to first run the build command:

  ```bash
  npm run build -- --gdevelop-root-path=/path/to/GDevelop/repository
  ```

  Then select the json file generated in the folder `dist/tutorials`.

## Translate your in-app tutorial

If you can use ChatGPT, you can easily have a basic translation for your tutorial. To do so, for each object with a `en` key, you should add all needed locale keys and then you can ask ChatGPT to translate it.

For instance, if you have the following:

```json
"messageByLocale": {
  "en": "Click on this button"
}
```

Transform it to this:

```json
"messageByLocale": {
  "en": "Click on this button",
  "fr": "",
  "de": "",
  "es": "",
  "th": "",
  ...
}
```

And the ask the following to ChatGPT:

```
Given this JSON, can you add translations for the empty fields corresponding to the keys that represent the locale to translate to?

{COPY PASTE THE JSON}
```

## Integrity tests

Some tests are run in our Continuous Integration (CI) pipeline when you open a PR.
You can run them on your device to make sure your in-app tutorial passes the checks.

Prerequisites:

- Clone [GDevelop repository](https://github.com/4ian/GDevelop) on your computer and run `npm install` in the folder `newIDE/app/`.

To do so, in a terminal:

- install the project: at the root of the repository, run `npm install`
- Build the tutorials: run `npm run build -- --gdevelop-root-path=/path/to/GDevelop/repository`
- Run the tests: run `npm run check-post-build`
- Read the output to see if your in-app tutorial passes the tests.

## Final steps

You should follow those steps if you want your in-app tutorial to be integrated in GDevelop's interface.

Open a new PR in [GDevelop's repository](https://github.com/4ian/GDevelop) and:

- In the file `InAppTutorial.js`:
  - add your tutorial id in a constant and add it to the list `guidedLessonsIds`.
  - if applicable, add your tutorial id in the list in the function `isMiniTutorial`.
- In the file `GuidedLessons.js`, add an item in the list `guidedLessonCards` with all the fields (you should have a SVG file to use in the card).
