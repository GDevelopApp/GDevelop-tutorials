# In-App Tutorial

An in-app tutorial is a sequenced step by step tutorial that is displayed to the user directly in the editor.
It reacts to user actions through different ways that are explained below.

GDevelop created its own components and orchestrator so that one can create a whole tutorial with only a JSON file. They are greatly inspired by [Userflow](https://userflow.com) work.

You can have a look at the components in [the editor storybook](https://gdevelop-storybook.s3.amazonaws.com/master/latest/index.html?path=/story/in-app-tutorial-elementhighlighterandtooltipdisplayer--default).

## How To Create An In-App Tutorial

Have a look at the [documentation](./REFERENCE.md) to learn how to build your JSON.

> Note: At the moment, there isn't a no-code approach to building/modifying an in-app tutorial. You should have GDevelop running and inspect its HTML to be able to specify the CSS selectors to use. If there are missing HTML tag ids, please tell us or open a PR on [GDevelop main repository](https://github.com/4ian/GDevelop).

## Add a New Language to an In-App Tutorial

> Make sure you're comfortable with editing [JSON files](https://docs.fileformat.com/web/json/).

To help us translate the in-app tutorials, please follow these steps:

- Git and GitHub manipulations:
  - Fork the repository
  - Create a new branch in your new repository

Once the repository is installed, open the JSON file with your favorite IDE (VSCode or else.) and begin the translation work:

- Find all the lines corresponding to a field with key `"en"` and duplicate those lines
  - with VSCode, select `"en"` and then hit Ctrl+Shift+L to select all identical occurrences.
- Translate each new line you created with the above instruction

**Notes**

- There are a few things to know, you can have a look at the other translations if you're not sure:
  - We're using markdown to format the text. For instance:
    - **\*\*bold\*\***
    - \*_italic_\*
    - `` `code` ``
  - There shall not be empty translations
  - Don't translate placeholders such as `$(character)`

And finally:

- Git and GitHub manipulations:
  - Commit your changes
  - Push your branch
  - Open the PR from your branch to our `main` branch.

Once you do this, a few automated checks will be run to make sure a few basic verifications are made.
