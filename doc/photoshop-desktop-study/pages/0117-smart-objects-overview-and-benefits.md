# Smart Objects - Overview and Benefits

- Entry Type: Core concept reference
- Category: Create and manage layers > Smart objects
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/smart-objects-overview-and-benefits.html

**Function Summary**
Smart Objects preserve source content so layers can be transformed, filtered, replaced, and reused more flexibly without directly damaging the original data.

**What This Entry Explains**
- what Smart Objects are
- the difference between embedded and linked behavior
- the main advantages and limitations of Smart Objects

**What Smart Objects Do**
- Preserve original image or vector content
- Support non-destructive transformation and Smart Filter workflows
- Allow one source to update several instances or documents
- Make replacement and placeholder workflows easier

**Embedded vs Linked**
- `Embedded Smart Object`
  Stores the source content inside the Photoshop document
- `Linked Smart Object`
  References an external file that can update the document when the source changes

**Main Advantages**
- Resize, rotate, distort, warp, or reshape without permanently rewriting the source data
- Keep vector artwork sharper than a normal pixel conversion workflow
- Use editable Smart Filters
- Update multiple linked or repeated instances from one source
- Apply flexible masks
- Swap placeholder assets later
- In some workflows reduce document size by linking instead of embedding

**Main Limitations**
- Pixel-editing tools such as paint, dodge, burn, or clone cannot work directly on the Smart Object until it is rasterized or otherwise converted
- High-resolution or heavily linked assets can still increase project weight
- Linked workflows can depend on external file management

**User Interface Behavior**
- Editing a Smart Object opens or references its source content instead of directly painting the displayed layer copy.
- Smart Filters are temporarily recalculated when the Smart Object content changes.

**Expected Result**
- Users understand why Smart Objects are central to non-destructive Photoshop workflows and when they are worth using.

**Related Entries**
- Next: Create embedded Smart Objects
