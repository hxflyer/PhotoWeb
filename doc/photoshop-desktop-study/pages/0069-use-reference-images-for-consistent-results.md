# Use Reference Images for Consistent Results

- Entry Type: Generative guidance workflow
- Category: Create, open, and import images > Create images
- Source: https://helpx.adobe.com/photoshop/desktop/create-open-import-images/create-images/use-reference-images-for-consistent-results.html

**Function Summary**
This workflow supplies one or more reference images to generative features so Photoshop can follow a target object, scene structure, or overall visual direction more consistently.

**What This Function Does**
- Guides generative output with external reference imagery
- Improves consistency of object appearance or whole-image composition
- Supports different behavior for Adobe models and partner models

**Where You Find It**
- `Generative Fill`
- Contextual Task Bar
- `Reference image`
- model-specific reference controls

**Primary Interface Elements**
- `Generative Fill`
- `Reference image`
- `Choose image`
- `Adobe models`
- `Partner models`
- `Reference to`
- `Object`
- `Whole image`
- `Intent`
- `Swap the selected area`
- `Place into the selected area`
- `Generate`

**How To Use It with Adobe Models**
1. Make an active selection in the image.
2. Start `Generative Fill`.
3. Open `Reference image` from the Contextual Task Bar.
4. Select `Choose image` and upload the image you want Photoshop to reference.
5. Choose `Adobe models > Firefly Fill & Expand`.
6. Decide whether the reference applies to an `Object` or the `Whole image`.
7. Set the intent to `Swap the selected area` or `Place into the selected area`.
8. Select `Generate`.

**How To Use It with Partner Models**
1. Make an active selection and start `Generative Fill`.
2. Choose `Partner models`.
3. Enter a detailed prompt.
4. Open the `Reference image` panel and upload the supporting images.
5. Select `Generate`.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Build the selection, upload the reference image, choose the model path, and generate.
- `Menus`
  This workflow is primarily handled inside the contextual generative controls.
- `Keyboard`
  Shortcut behavior depends on the selection tool used before generation.

**User Interface Behavior**
- Adobe and partner models expose slightly different reference workflows.
- `Object` versus `Whole image` changes whether Photoshop focuses on a single subject or the full scene.
- `Swap` and `Place` change whether the selected area is replaced or augmented while preserving more of the background.

**Expected Result**
- Generated content stays closer to the target look or composition supplied by the reference image.

**Practical Use Cases**
- Keep product shape or subject appearance more consistent across multiple generations.
- Guide placement and scene structure instead of relying only on prompt wording.
- Use multi-image references with supported partner models for stronger control.

**Related Entries**
- Previous: Explore beyond the canvas with Generative Expand
- Next: Generate images guided by a reference image
