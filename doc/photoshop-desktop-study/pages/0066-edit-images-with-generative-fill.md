# Edit Images with Generative Fill

- Entry Type: AI-assisted image editing feature
- Category: Create, open, and import images > Create images
- Source: https://helpx.adobe.com/photoshop/desktop/create-open-import-images/create-images/edit-images-with-generative-fill.html

**Function Summary**
Generative Fill modifies a selected image region using text prompts or context-aware empty prompts. It can add, remove, or replace content while keeping the edit non-destructive and variation-based.

**What This Function Does**
- Replaces or adds content inside a selection
- Uses prompt-guided generation or automatic contextual filling
- Supports multiple AI models during supported workflows
- Returns several variations for review instead of forcing one final result

**Where You Find It**
- selection-driven editing workflows
- Contextual Task Bar
- `Generative Fill`
- `Properties` panel for variation review

**Primary Interface Elements**
- selection tool such as `Selection Brush`
- `Generative Fill`
- prompt field
- model picker
- `Generate`
- `Properties` panel
- generated variation thumbnails

**How To Use It**
1. Select the area you want to change with a selection tool.
2. Start `Generative Fill`.
3. In the Contextual Task Bar, choose the AI model if model selection is available.
4. Enter a prompt describing the content you want to add or modify.
5. Leave the prompt blank if you want Photoshop to fill the region using surrounding context.
6. Select `Generate`.
7. Review the returned variations in the `Properties` panel and choose the one you want.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Make the selection, choose the model, type the prompt, and click `Generate`.
- `Menus`
  This workflow is usually started from the contextual generative controls rather than a classic top-level menu path.
- `Keyboard`
  Shortcut behavior depends on the selection tool used before generation.

**User Interface Behavior**
- The result is applied non-destructively through a generated variation workflow rather than a permanent one-step overwrite.
- Different AI models can interpret the same prompt differently.
- An empty prompt switches the feature into a context-based fill mode that relies on surrounding pixels.

**Expected Result**
- The selected region is replaced or extended with generated content, and you can choose among several returned alternatives.

**Practical Use Cases**
- Insert a new object into an existing photo.
- Remove unwanted content and let Photoshop rebuild the area.
- Replace a portion of an image with a prompt-guided alternate version.

**Related Entries**
- Previous: Generate an image with descriptive text prompts
- Next: Generate sharper variations with Enhance Detail
