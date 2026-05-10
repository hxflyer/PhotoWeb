# Manage Contours

- Entry Type: Layer style editor function
- Category: Create and manage layers > Apply layer effects
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/manage-contours.html

**Function Summary**
The contour management function changes how certain layer effects transition, fade, or wrap across layer content. It is used inside the `Layer Style` workflow to customize effects such as shadows, glows, bevels, and satin beyond their default look.

**What This Function Does**
- Changes the falloff shape of supported layer effects
- Controls how highlights, shadows, or glows transition
- Lets you create more stylized or precise effect behavior
- Allows saving custom contour shapes for reuse

**Where You Find It**
- Open the `Layer Style` dialog by double-clicking a layer body, not the layer name
- Choose a supported effect
- Open the contour thumbnail to launch the `Contour Editor`

**Supported Effects**
- `Drop Shadow`
- `Inner Shadow`
- `Outer Glow`
- `Inner Glow`
- `Bevel and Emboss`
- `Satin`

**How To Use It**
1. Double-click the target layer to open `Layer Style`.
2. Select a layer effect that supports contours.
3. Click the contour thumbnail to open the `Contour Editor`.
4. Adjust the contour curve to change how the effect behaves.
5. Select `New` if you want to save the contour as a reusable preset.
6. Select `OK` to confirm the contour edit.
7. Select `OK` again to apply the layer style change.

**User Interface Behavior**
- The contour setting is embedded inside supported layer effect controls.
- The `Contour Editor` behaves like an effect-shape editor rather than a paint or drawing tool.
- Changing the contour updates how the effect fades or transitions, not the basic color or blend mode itself.

**Effect-Specific Behavior**
- `Drop Shadow` and `Inner Shadow`
  Changes opacity falloff across the shadow
- `Outer Glow` and `Inner Glow`
  Changes how the glow fades from its origin
- `Bevel and Emboss`
  Changes highlight and shadow transition across the beveled surface
- `Satin`
  Changes how the effect wraps around internal edges of the layer content

**Expected Result**
- Layer effects gain a different visual transition shape
- Effects can look softer, sharper, stepped, or more stylized depending on the contour curve
- Saved contours can be reused later for consistent styling

**Practical Usage Notes**
- Use contours when default layer style settings feel too generic.
- Small contour edits can create noticeably different shadow and glow character.
- This function is most useful when building custom interface styles, text treatments, or decorative effects.

**Related Entries**
- Previous: Import preset style libraries
- Next: Set a global lighting angle for all layers
