# Photoweb User Case Matrix

Purpose: user-side review checklist derived from the Photoshop desktop notes in `doc/photoshop-desktop-study/pages`, filtered through Photoweb's browser-photo-editor scope.

Scope rule: include practical browser editing workflows for documents, layers, masks, selections, retouching, color, text, shapes, guides, presets, export, history, and reliability. Exclude AI/generative features, Adobe cloud/account flows, help/release-note pages, print-production, video/timeline, batch/actions, and full PSD/Smart Object parity unless the behavior is useful as a browser-native simplification. See [photoweb-development-plan.md](photoweb-development-plan.md) for the authoritative scope policy.

Format: each line is a user case that should be testable by a person or by a future simulator test.

Status conventions (added 2026-05-11 audit):
- A case without a qualifier is currently supported by photoweb.
- "in future" marks a case that is in scope but not yet shipped.
- "future or out of scope" marks a case where the deferral decision is not yet final.

Cases that are intentionally and definitively excluded by the development plan (AI/generative, cloud, Adobe-ecosystem, PSD/PSB, CMYK, video/animation, batch automation, etc.) are not enumerated here — they live in `photoweb-development-plan.md` under "Exclude For Now". The matrix below is only the in-scope cases and the cases whose deferral is still under discussion.

Last code audit: 2026-05-11 (after the audit-sweep batch — 18 BUGs + 15 GAPs + Color Range + Define Pattern + dirty-rect-tight history + text-to-path; out-of-scope rows pruned in the same pass).

## Workspace, Onboarding, And App Shell

001. User can open Photoweb and immediately understand where the toolbar, canvas, options bar, and panels are.
002. User can create a new blank document without reading external help.
003. User can identify the active tool from the toolbar highlight.
004. User can see tool-specific options change when switching tools.
005. User can switch between compact and expanded panel groups without losing the current document.
006. User can hide all panels temporarily to focus on the image.
007. User can restore hidden panels from the Window menu.
008. User can resize or collapse right-side panel groups to free canvas space.
009. User can toggle Character, Paragraph, Properties, Layers, Channels, Paths, Color, Swatches, and Adjustments panels.
010. User can see a clear empty state when no layer or document item is selected.
011. User can use the status bar to understand zoom, document size, and active state.
012. User can recover orientation after zooming or panning by using Fit on Screen.
013. User can return to 100% zoom from the menu or keyboard shortcut.
014. User can use one-letter shortcuts to switch common tools.
015. User can use Shift plus a tool shortcut to cycle grouped tools.
016. User can open an in-app keyboard shortcut reference.
017. User can recognize disabled commands as intentionally unavailable rather than broken.
018. User can use menu names that match familiar photo-editor language.
019. User can see the active document name in the app shell.
020. User can use dialogs without the canvas receiving accidental edits behind them.
021. User can cancel dialogs with Escape where appropriate.
022. User can confirm dialogs with Enter where appropriate.
023. User can close modal dialogs by clicking Cancel or outside the card when safe.
024. User can read interface text at normal laptop resolution without zooming the browser.
025. User can distinguish document editing features from help, release-note, and product-marketing content (Photoweb has none of the latter).

## Document Creation, Opening, Importing, And Canvas Setup

026. User can create a document by entering width, height, and background color.
027. User can create a transparent document.
028. User can create a white-background document for quick edits.
029. User can open a local image as a new document.
030. User can import a local image as a layer into the current document.
031. User can preserve imported image transparency when possible.
032. User can see imported image dimensions reflected on the layer canvas.
033. User can rename the document after creating or opening it.
034. User can change image size with a chosen resampling method.
035. User can resize the canvas without scaling existing pixels.
036. User can anchor canvas resize to a chosen side or corner.
037. User can choose the extension color when enlarging the canvas.
038. User can trim transparent or solid-color empty borders.
039. User can rotate the whole canvas by common angles.
040. User can flip the whole canvas horizontally.
041. User can flip the whole canvas vertically.
042. User can detect when a large image may be heavy for browser memory.
043. User can receive a clear error if opening a file fails.
044. User can avoid losing current work when opening a new document by seeing a save warning in future.
045. User can start a new document after closing dialogs cleanly.
046. User can import multiple assets one by one as separate layers.
047. User can see transparent areas over a checkerboard.
048. User can configure transparency grid appearance in future preferences (Edit > Preferences exists; grid-pattern controls are not yet exposed).
049. User can keep document dimensions consistent after undoing canvas operations.

## File Save, Export, Autosave, And Recovery

051. User can save the editable document in Photoweb's native `.pwbdoc` format.
052. User can reopen a `.pwbdoc` file and continue editing layers.
053. User can preserve masks when saving and reopening.
054. User can preserve type data when saving and reopening.
055. User can preserve adjustment-layer parameters when saving and reopening.
056. User can preserve fill-layer data when saving and reopening.
057. User can preserve layer effects when saving and reopening.
058. User can preserve layer locks and color tags when saving and reopening.
059. User can preserve layer groups when saving and reopening.
060. User can quick-export the visible composite as PNG.
061. User can open an export dialog for explicit export choices.
062. User can export transparent PNG when the document has transparent areas.
063. User can see a success toast after save or export.
064. User can see a useful error toast after save failure.
065. User can recover autosaved work after an unexpected refresh.
066. User can dismiss an autosave recovery prompt if it is not needed.
067. User can understand whether the current document has unsaved changes in future.
068. User can avoid storing history data inside final exported PNG.
069. User can export without altering the editable document.
070. User can keep document metadata separate from raster export.
071. User can receive clear storage quota diagnostics (Edit > Preferences > Storage Usage… shows OPFS quota; toast-on-failure messaging is still in future).
072. User can see how much browser storage Photoweb uses through the Storage Usage dialog (per-layer / history memory breakdown).
073. User can save documents larger than a small thumbnail without data loss.
074. User can reopen older `.pwbdoc` documents through backward-compatible manifests.

## History, Undo, Redo, Snapshots, And Reliability

076. User can undo the most recent edit with Cmd/Ctrl+Z.
077. User can redo an undone edit with Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y.
078. User can see past states in the History panel.
079. User can see redoable future states after undo.
080. User can commit a new edit after undo and have future states discarded.
081. User can create a snapshot of the current document state.
082. User can restore a snapshot and recover layer pixels and metadata.
083. User can undo a snapshot restore.
084. User can set or rely on a maximum history state count.
085. User can undo brush strokes.
086. User can undo eraser strokes.
087. User can undo fill operations.
088. User can undo gradient operations.
089. User can undo filter operations.
090. User can undo adjustment operations.
091. User can undo layer add and remove operations.
092. User can undo layer reorder operations.
093. User can undo layer property changes.
094. User can undo selection changes.
095. User can undo transform and crop operations.
096. User can undo mask add, remove, apply, and paint operations.
097. User can see readable history labels for major actions.
098. User can rely on stroke-bbox-tight history buffers (paint tools crop the captured before-buffer to the actual stroke rect so history memory scales with stroke size, not canvas size). PNG-encoded compression of the buffers is still in future.
099. User can trust that failed commands do not corrupt the history timeline.
100. User can use history as a safety net before experimenting.

## Layers: Basic Layer Operations

101. User can create a new empty raster layer.
102. User can create a layer from imported image content.
103. User can rename a layer.
104. User can delete a layer.
105. User can duplicate a layer from Layer > Duplicate Layer.
106. User can reorder layers in the stack.
107. User can make a layer visible or hidden.
108. User can solo a layer to inspect it.
109. User can change layer opacity.
110. User can change layer fill opacity separately from opacity.
111. User can change layer blend mode.
112. User can lock all edits on a layer.
113. User can lock layer position.
114. User can lock transparent pixels in future parity.
115. User can lock image pixels in future parity.
116. User can apply layer color labels.
117. User can identify the active layer in the Layers panel.
118. User can select a different layer before editing.
119. User can avoid painting on the wrong layer by seeing active-row highlight.
120. User can merge a layer down.
121. User can merge visible layers.
122. User can stamp visible content onto a new layer.
123. User can flatten the image when ready.
124. User can see a layer thumbnail for visual recognition.
125. User can understand that hidden layers do not appear in the final composite.

## Layers: Groups, Multi-Selection, Alignment, And Organization

126. User can create an empty layer group.
127. User can group selected layers.
128. User can ungroup a layer group.
129. User can collapse a group to reduce panel clutter.
130. User can expand a group to inspect its children.
131. User can hide a group and hide all child layers visually.
132. User can change group opacity and affect the grouped composite.
133. User can delete a group and understand what happens to children.
134. User can select multiple layers with Cmd/Ctrl-click.
135. User can select a range of layers with Shift-click.
136. User can deselect multiple selected layers.
137. User can align selected layers to left edges.
138. User can align selected layers to horizontal centers.
139. User can align selected layers to right edges.
140. User can align selected layers to top edges.
141. User can align selected layers to vertical centers.
142. User can align selected layers to bottom edges.
143. User can distribute three or more selected layers horizontally.
144. User can distribute three or more selected layers vertically.
145. User can align layers to canvas bounds when requested.
146. User can align layers to selection bounds when requested.
147. User can preserve group structure during basic alignment.
148. User can identify group rows separately from raster rows.
149. User can drag layers into nested groups in future.
150. User can filter or search layers in future for large documents.

## Masks, Quick Mask, And Targeted Editing

151. User can add a reveal-all layer mask.
152. User can add a hide-all layer mask.
153. User can add a mask from the current selection.
154. User can create a reveal-selection mask.
155. User can create a hide-selection mask.
156. User can select the mask thumbnail as the active paint target.
157. User can see a visual frame around the active mask target.
158. User can paint white on a mask to reveal content.
159. User can paint black on a mask to hide content.
160. User can erase mask paint without touching layer pixels.
161. User can use pencil on masks for hard edges.
162. User can enable or disable a mask.
163. User can link or unlink a mask from the layer.
164. User can change mask density non-destructively.
165. User can change mask feather non-destructively.
166. User can invert a mask.
167. User can apply a mask to make transparency permanent.
168. User can remove a mask.
169. User can use Quick Mask mode to view selection coverage.
170. User can keep Quick Mask separate from hide-selection-edges.
171. User can combine masks with active selections during filter apply.
172. User can combine masks with active selections during adjustment apply.
173. User can save work with masks and reopen them editable.
174. User can inspect channels while considering masks.
175. User can understand that vector masks are a future or out-of-scope feature.

## Channels And Color Viewing

176. User can open the Channels panel.
177. User can view the combined RGB channel.
178. User can isolate the red channel as grayscale.
179. User can isolate the green channel as grayscale.
180. User can isolate the blue channel as grayscale.
181. User can toggle red channel visibility in the composite.
182. User can toggle green channel visibility in the composite.
183. User can toggle blue channel visibility in the composite.
184. User can return to full RGB composite view.
185. User can use channel visibility for color troubleshooting.
188. User can use saved selections as a simplified alpha-channel workflow.
189. User can load a saved selection during the same document session.
190. User can preserve saved selections in `.pwbdoc` (savedSelections round-trip through the manifest).
191. User can convert a path to a selection.
192. User can convert a selection to a path.
193. User can avoid changing actual pixels when only viewing channels.
194. User can preview channel visibility without losing layer state.
195. User can use channel display alongside masks.
196. User can detect color-channel problems before exporting.
197. User can keep channel visibility undo-independent as a view preference.
198. User can use channel toggles without changing active layer.
200. User can request channel-as-mask workflows as future enhancement.

## Adjustments, Fill Layers, And Color Correction

201. User can create a Brightness/Contrast adjustment layer.
202. User can create a Levels adjustment layer.
203. User can create a Curves adjustment layer.
204. User can create a Hue/Saturation adjustment layer.
205. User can create a Color Balance adjustment layer.
206. User can create a Vibrance adjustment layer.
207. User can create a Black and White adjustment layer.
208. User can create a Photo Filter adjustment layer.
209. User can create a Channel Mixer adjustment layer.
210. User can create a Gradient Map adjustment layer.
211. User can create an Invert adjustment layer.
212. User can create a Posterize adjustment layer.
213. User can create a Threshold adjustment layer.
214. User can edit adjustment parameters after creation from Properties.
215. User can mask an adjustment layer to affect only part of the image.
216. User can apply a destructive adjustment to the active raster layer.
217. User can apply destructive adjustments clipped by active selection.
218. User can apply destructive adjustments clipped by layer mask.
219. User can create a solid color fill layer.
220. User can create a gradient fill layer.
221. User can edit a solid fill layer color after creation.
222. User can edit gradient fill type after creation.
223. User can edit gradient fill angle after creation.
224. User can merge adjustment or fill layers into pixels when needed.
225. User can save and reopen editable adjustment and fill layer settings.

## Layer Effects And Styles

226. User can add a Drop Shadow layer effect.
227. User can edit Drop Shadow distance.
228. User can edit Drop Shadow angle.
229. User can edit Drop Shadow size.
230. User can edit Drop Shadow spread.
231. User can edit Drop Shadow color.
232. User can edit Drop Shadow opacity.
233. User can add a Stroke layer effect.
234. User can choose outside stroke placement.
235. User can choose center stroke placement.
236. User can choose inside stroke placement.
237. User can edit stroke size.
238. User can edit stroke color.
239. User can edit stroke opacity.
240. User can add a Color Overlay effect.
241. User can edit Color Overlay color.
242. User can edit Color Overlay opacity.
243. User can toggle an effect on or off.
244. User can remove a layer effect.
245. User can save and reopen layer effects.
246. User can see an `fx` indicator on Layers-panel rows for any layer with at least one enabled effect.
247. User can copy and paste layer styles in future.
248. User can scale layer effects in future.
249. User can add Inner Shadow, glows, overlays, and bevel effects in future.
250. User can understand that preset style libraries are lower priority than editable effects.

## Selection Tools

251. User can draw a rectangular marquee selection.
252. User can draw an elliptical marquee selection.
253. User can hold Shift to constrain marquee proportions.
254. User can hold Alt/Option to draw a marquee from the center.
255. User can set marquee feather before drawing.
256. User can use anti-aliased ellipse edges.
257. User can draw a freeform lasso selection.
258. User can draw a polygonal lasso selection.
259. User can complete polygonal lasso with Enter.
260. User can select contiguous areas with Magic Wand.
261. User can adjust Magic Wand tolerance.
262. User can select similar colors across all layers when enabled.
263. User can use anti-aliasing in Magic Wand selections.
264. User can paint a selection with Quick Selection.
265. User can adjust Quick Selection brush size.
266. User can use Quick Selection sample-all-layers.
267. User can use Quick Selection auto-enhance cleanup.
268. User can add to a selection with Shift.
269. User can subtract from a selection with Alt/Option.
270. User can intersect a selection with Shift+Alt.
271. User can click inside an existing selection to move its border with selection tools.
272. User can click outside an existing selection to dismiss it immediately.
273. User can see marching ants around the active selection.
274. User can hide selection edges without deselecting.
275. User can use selection tools without accidentally modifying pixels.

## Selection Commands, Refinement, And Selected Pixels

276. User can Select All.
277. User can Deselect.
278. User can Invert Selection inside document bounds.
279. User can save a named selection.
280. User can load a named selection.
281. User can use Color Range to select pixels by sampled color.
282. User can add Color Range samples.
283. User can subtract Color Range samples.
284. User can adjust Color Range fuzziness.
285. User can undo Color Range selection creation.
286. User can open Select and Mask / Refine Edge.
287. User can adjust Refine Edge radius.
288. User can adjust Refine Edge smoothness.
289. User can adjust Refine Edge feather.
290. User can adjust Refine Edge contrast.
291. User can shift selection edge inward or outward.
292. User can see honest output text for Select and Mask.
293. User can output Select and Mask refinements to either the current selection, a new layer mask on the active layer, or a new layer with a mask in future (current shipped output is honestly limited to the current selection).
294. User can expand a selection.
295. User can contract a selection.
296. User can smooth a selection.
297. User can create a border selection.
298. User can remove white or black matte in future.
299. User can defringe selection edges in future.
300. User can refine hair or subject only if future non-AI tools make sense.

## Moving, Copying, Cutting, And Transforming Selections

301. User can move only selected pixels with the Move Tool.
302. User can move selected pixels without moving unselected pixels.
303. User can keep the selection outline traveling with moved pixels.
304. User can undo selected-pixel movement.
305. User can nudge a selection border by 1 pixel with arrow keys.
306. User can nudge a selection border by 10 pixels with Shift+arrow.
307. User can nudge selected pixels by 1 pixel with the Move Tool.
308. User can nudge selected pixels by 10 pixels with Move Tool plus Shift+arrow.
309. User can delete selected pixels.
310. User can cut selected pixels.
311. User can copy selected pixels into a new layer in future menu parity.
312. User can paste selected pixels as a new layer in future menu parity.
313. User can duplicate selected pixels by Alt/Option-drag in future.
314. User can paste into a selection as a masked layer in future.
315. User can paste outside a selection as a masked layer in future.
316. User can transform a selection border in future.
317. User can transform selected pixels with free transform.
318. User can see selection bounds while transforming.
319. User can constrain selected-pixel movement in future drag parity.
320. User can snap selected-pixel movement to guides in future.
321. User can move selected pixels on raster layers without destroying type layers.
322. User can see a clear limitation when an operation would rasterize editable text.
323. User can control selection movement precisely for cutout work.
324. User can use selected-pixel movement as a lightweight paste/float workflow.
325. User can trust movement operations to be history-safe.

## Crop, Resize, Transform, Warp, And Geometry

326. User can crop the canvas by dragging a crop rectangle.
327. User can commit a crop.
328. User can cancel a crop.
329. User can choose crop overlay variants.
330. User can use straighten flow in crop.
331. User can resize image pixels.
332. User can resize canvas bounds.
333. User can rotate canvas.
334. User can flip canvas.
335. User can free transform the active layer.
336. User can scale a layer.
337. User can rotate a layer.
338. User can move a transformed layer.
339. User can cancel transform and restore original pixels.
340. User can transform type layers while preserving type source data.
341. User can transform raster layers as pixels.
342. User can warp active layer content.
343. User can cancel warp.
344. User can commit warp.
345. User can use skew, distort, and perspective transforms in future.
346. User can reset a transform in future for editable objects.
347. User can see transform handles clearly at different zoom levels.
348. User can avoid accidental edits while transform overlay is active.
349. User can use geometry tools with undo/redo.

## Paint, Fill, Gradient, Color, And Patterns

351. User can paint with the Brush tool.
352. User can paint with the Pencil tool.
353. User can erase with the Eraser tool.
354. User can choose brush size.
355. User can choose brush hardness.
356. User can choose brush opacity.
357. User can choose brush flow.
358. User can use bracket shortcuts to change brush size.
359. User can use Shift+bracket shortcuts to change brush hardness.
360. User can use brush smoothing.
361. User can use Pencil spacing.
362. User can fill an area with foreground color.
363. User can choose Paint Bucket tolerance.
364. User can choose contiguous or non-contiguous fill.
365. User can choose anti-aliasing for Paint Bucket.
366. User can sample all layers for fill behavior.
367. User can fill with pattern source — Paint Bucket "Pattern" mode tiles the active pattern preset across the fill region.
368. User can define a pattern from the current selection (or full active layer if no selection) via Edit > Define Pattern…
369. User can manage pattern presets — save / select / remove pattern presets persist through localStorage.
370. User can draw linear gradients.
371. User can draw radial gradients.
372. User can draw angle, reflected, and diamond gradients.
373. User can toggle gradient transparency.
374. User can choose smooth or classic gradient method.
375. User can edit gradient stops in future (the GradientStop model exists internally; a custom-stops editor UI has not yet shipped).

## Brushes, Presets, Clone, And Retouch

376. User can save a brush preset via Edit > Define Brush Preset… (captures current size/hardness/opacity/flow plus optional smoothing/spacing).
377. User can apply a saved brush preset; presets persist through localStorage.
378. User can reset brush settings to defaults.
379. User can sample clone source with Alt/Option-click.
380. User can paint cloned pixels with Clone Stamp.
381. User can choose Clone Stamp sample source.
382. User can show or hide Clone Source overlay.
383. User can change Clone Source overlay opacity.
384. User can reset Clone Source.
385. User can dodge image tones.
386. User can burn image tones.
387. User can choose Dodge/Burn range.
388. User can choose Dodge/Burn exposure.
389. User can saturate with Sponge.
390. User can desaturate with Sponge.
391. User can toggle Sponge vibrance behavior.
392. User can use Spot Healing in future.
393. User can use Healing Brush in future.
394. User can use Patch tool in future.
395. User can remove red eye in future.
396. User can use Background Eraser in future.
397. User can use Magic Eraser to one-click-erase similar pixels (tolerance, anti-alias, contiguous, sample-all-layers, opacity).
398. User can retouch through an active selection.
399. User can retouch through a layer mask.
400. User can undo every retouch stroke.

## Pen, Paths, Shapes, And Vector-Like Editing

401. User can draw paths with the Pen tool.
402. User can add straight path segments.
403. User can add curved Bezier segments.
404. User can close a path.
405. User can edit path anchors.
406. User can edit path handles.
407. User can select an entire path.
408. User can directly select individual path points.
409. User can convert a path to a selection.
410. User can convert a selection to a path.
411. User can see paths in a Paths panel.
412. User can use Pen Path mode without painting pixels.
413. User can use Pen Pixels mode to rasterize a stroke.
414. User can use Pen Shape mode honestly.
415. User can draw rectangle shapes.
416. User can draw rounded rectangle shapes.
417. User can draw ellipse shapes.
418. User can draw polygon shapes.
419. User can draw line shapes.
420. User can draw custom shape presets in future (Custom Shape tool exists; built-in preset library has not yet shipped).
421. User can create editable shape layers by drawing with Shape mode (rect / rounded-rect / ellipse / polygon-star / line-arrow store editable geometry in `shapeData`).
422. User can edit shape fill after drawing — `shapeData.fill` patches rerender via `rerenderShapeLayer` (Properties Shape section ships in PROPS-05).
423. User can edit shape stroke (color / width / opacity / alignment) after drawing — `shapeData.stroke` patches rerender (Properties Shape section ships in PROPS-05).
424. User can draw lines with start and/or end arrowheads (lineArrowStart / lineArrowEnd / lineArrowSize options).
425. User can switch the Polygon tool between regular polygon and star (polygonStar + polygonStarRatio options).

## Type And Typography

426. User can create horizontal text.
427. User can create vertical text.
428. User can create point text.
429. User can create box text.
430. User can type and commit text on canvas.
431. User can cancel text creation.
432. User can double-click or use Type tool to re-edit a type layer.
433. User can move a type layer with the Move Tool.
434. User can transform a type layer while preserving editable source data.
435. User can edit type text in Properties.
436. User can edit type font family in Properties.
437. User can edit type size in Properties.
438. User can edit type color in Properties.
439. User can edit type alignment in Properties.
440. User can edit type orientation in Properties.
441. User can edit leading in Character panel.
442. User can edit tracking in Character panel.
443. User can edit horizontal and vertical scale in Character panel.
444. User can toggle faux bold and faux italic.
445. User can toggle all caps and small caps.
446. User can toggle superscript and subscript.
447. User can toggle underline and strikethrough.
448. User can edit paragraph alignment.
449. User can edit paragraph indents and spacing.
450. User can understand that glyphs, OpenType alternates, text-on-path, and bullets are future or out of scope.

## Filters, Effects, And Image Processing

451. User can apply Gaussian Blur.
452. User can apply Box Blur.
453. User can apply Motion Blur.
454. User can apply Surface Blur.
455. User can apply Unsharp Mask.
456. User can apply Smart Sharpen simplified behavior.
457. User can add noise.
458. User can reduce noise.
459. User can apply Median filter.
460. User can apply Pinch distortion.
461. User can apply Spherize distortion.
462. User can apply Find Edges.
463. User can apply Emboss.
464. User can apply Lens Flare.
465. User can apply High Pass.
466. User can preview filter parameters in a dialog when available.
467. User can repeat the last filter.
468. User can reopen the last filter with dialog.
469. User can apply filters through active selections.
470. User can apply filters through masks.
471. User can undo filter operations.
472. User can keep filter application destructive unless using adjustment layers.
473. User can understand that Smart Filters are deferred.
474. User can understand that Liquify is a future large feature.

## Guides, Rulers, Grid, Navigation, And Measurement

476. User can show or hide rulers.
477. User can show or hide the grid.
478. User can configure grid size.
479. User can toggle snap.
480. User can snap to document bounds.
481. User can snap to grid in future (snap toggle exists; the per-target snap rules for grid/guides/layers are not yet wired).
482. User can snap to guides in future.
483. User can snap to layers in future.
484. User can create a horizontal guide via `addGuide('horizontal', position)`; a numeric New Guide dialog is still in future.
485. User can create a vertical guide via `addGuide('vertical', position)`.
486. User can drag guides from rulers; guides render over the canvas and can be moved or removed.
487. User can clear all guides at once via `clearGuides()`.
488. User can lock guides in future.
489. User can use smart-guide alignment hints in future.
490. User can pan the canvas with the Hand tool.
491. User can zoom in with the Zoom tool.
492. User can zoom out with shortcut or modifier behavior.
493. User can use mouse wheel or trackpad zoom in future if supported.
494. User can see cursor/ruler position in future Info panel.
495. User can measure distances in future.
496. User can work at high zoom without losing overlay precision.
497. User can use Fit on Screen after navigation.
498. User can use 100% zoom for pixel inspection.
499. User can preserve view preferences across sessions where appropriate.
500. User can understand that print rulers, physical units, and measurement logs are lower priority than editing guides.

## Extended Layout, Frames, Resolution, Crop, And Transform Cases

502. User can use separate documents instead of artboards for now.
503. User can request artboard-like canvas regions as a future design feature.
504. User can understand that frame tools are lower priority than masks and clipping workflows.
505. User can place an image into a mask-like frame workflow in future.
506. User can select framed content separately from its container in future.
507. User can add a stroke around a frame-like container in future.
508. User can crop an imported layer visually without needing artboards.
509. User can compare pixel dimensions and visual canvas size.
510. User can resize by pixels rather than print inches.
511. User can ignore printer resolution settings in Photoweb's browser-first workflow.
512. User can understand document resolution metadata is not the same as pixel dimensions.
513. User can choose resampling when changing pixel dimensions.
514. User can reduce file size by resizing image dimensions.
515. User can preserve detail when scaling down.
517. User can see a warning if a resize would create very large memory use.
518. User can crop to remove transparent edges.
519. User can crop to a manually drawn rectangle.
520. User can straighten a tilted horizon.
521. User can resize canvas using crop handles.
522. User can cancel crop without changing pixels.
523. User can use crop overlays for rule-of-thirds or diagonal composition.
525. User can apply perspective crop in future if geometry tools expand.
526. User can rotate a layer around its center.
527. User can move a transform reference point in future.
528. User can scale proportionally by holding Shift in future parity if needed.
529. User can rotate objects by entering an angle in future.
530. User can duplicate an object during transform in future.
531. User can apply a transformation with Enter.
532. User can cancel a transformation with Escape.
533. User can reset transform controls while editing in future.
534. User can see transform dimensions and angle in an options UI in future.
535. User can transform selected pixels separately from whole layers.
536. User can transform type while preserving text editability.
537. User can transform shape layers after shape layers exist.
538. User can use transform handles at high zoom.
539. User can avoid accidental edits while transform handles are active.
540. User can see a clear difference between resizing the image, resizing the canvas, cropping, and transforming a layer.
541. User can preserve visual quality when scaling a layer down and up only within browser limits.
542. User can choose nearest-neighbor resampling for pixel art (Image Size dialog offers Nearest Neighbor / Bilinear / Bicubic).
543. User can choose smoother scaling for photos.
544. User can keep transparency after geometric transforms.
545. User can use undo after every crop, resize, rotate, flip, transform, and warp.
546. User can use layer bounds as transform feedback.
547. User can use document bounds as a snap target during transform.
548. User can understand print-size controls are informational, not core editing controls.
549. User can export the final pixel result without managing print resolution.
550. User can request artboard export only if Photoweb later adds artboard objects.

## Extended Selection, Object Detection, Matting, And Mask Cases

552. User can use Magic Wand or Quick Selection instead of Object Selection.
555. User can manually refine a person selection with lasso, brush, and mask workflows.
556. User can use Color Range for non-AI color-based selection.
557. User can save Color Range settings as a preset in future.
558. User can choose skin-tone selection presets in future only if implemented without complex AI.
559. User can use Quick Selection to grow a selection by painting.
560. User can clean Quick Selection edges with smooth, feather, and contrast controls.
562. User can use manual mask painting to improve hair-like edges.
563. User can create layer masks for selected areas.
564. User can understand automatic object masks are out of near-term scope.
565. User can manually create separate masks for objects.
566. User can use inverse selection to target backgrounds.
567. User can clean isolated stray pixels after Color Range in future.
568. User can use Grow and Similar commands in future for color-based cleanup.
569. User can feather selection tool edges before drawing.
570. User can anti-alias selection edges when drawing.
571. User can create a border around a selection.
572. User can expand a selection by a chosen pixel amount.
573. User can contract a selection by a chosen pixel amount.
574. User can smooth jagged selection contours.
575. User can shift a refined edge inward to remove halos.
576. User can shift a refined edge outward to keep edge detail.
577. User can remove white matte from cutout edges in future.
578. User can remove black matte from cutout edges in future.
579. User can defringe colored edge pixels in future.
580. User can output a refined selection directly to a new layer mask on the active layer in future.
581. User can output a refined selection to a duplicated layer with a mask applied in future.
582. User can preview selections over white, black, transparent, and overlay backgrounds in future.
583. User can see edge previews without committing changes in future.
584. User can use selection operations on mask thumbnails.
585. User can copy selected pixels to another layer in future menu parity.
586. User can paste selected pixels into an active selection in future.
587. User can paste selected pixels outside an active selection in future.
588. User can duplicate selected pixels repeatedly in future.
589. User can use selection-edge visibility as a view preference.
590. User can use Quick Mask view without changing actual selection data.
591. User can save named selections into the document file (`.pwbdoc` manifest round-trips `savedSelections`).
592. User can load a named selection in add mode (`loadSelection(name, 'add')`).
593. User can load a named selection in subtract mode (`loadSelection(name, 'sub')`).
594. User can load a named selection in intersect mode (`loadSelection(name, 'intersect')`).
595. User can convert selection edges into a path for pen cleanup.
596. User can convert a path into a selection for masking.
597. User can use selections to limit paint, fill, filters, and adjustments.
598. User can understand selections are document-bounded.
599. User can use selection history safely with undo and redo.
600. User can rely on selection tools to never mutate pixels until a pixel command is applied.

## Extended Retouch, Healing, Content-Aware, Perspective, And Panorama Cases

601. User can use Clone Stamp for manual object cleanup.
602. User can sample clone source from the current layer.
603. User can sample clone source from current and below layers.
604. User can sample clone source from all layers.
605. User can show clone overlay while positioning a repair.
606. User can hide clone overlay when it distracts.
607. User can change clone overlay opacity.
608. User can reset clone source.
609. User can rotate clone source in future.
610. User can scale clone source in future.
611. User can use Spot Healing Brush in future for small blemishes.
612. User can use Healing Brush in future with sampled texture.
613. User can use Patch tool in future for larger repairs.
614. User can remove red eye in future.
615. User can use Background Eraser in future for color-based background removal.
616. User can use Magic Eraser in future for one-click similar-pixel removal.
618. User can manually remove objects by selecting and deleting/cutting.
619. User can manually rebuild background with clone/healing workflows.
622. User can review and refine manual removals with masks.
623. User can darken photo edges with burn or adjustment masks.
624. User can lighten local areas with dodge.
625. User can saturate local areas with sponge.
626. User can desaturate distracting local colors with sponge.
627. User can use tonal range choices for dodge and burn.
628. User can use exposure controls for subtle local tone edits.
629. User can undo each retouch stroke independently.
630. User can retouch on a new empty layer when sample-all-layers exists.
631. User can define a pattern from a selected image area (or full active layer) via Edit > Define Pattern….
632. User can repair image perspective with transform tools in future.
633. User can define perspective planes in future only if a perspective tool is added.
634. User can manipulate perspective planes in future.
635. User can edit multiple perspective regions in future.
636. User can use keyboard shortcuts for perspective editing in future.
638. User can manually blend panorama-like layers using masks.
639. User can auto-align layers in future for photo stacking.
640. User can auto-blend layer seams in future if compositing expands.
641. User can create extended-depth-of-field composites in future only after auto-align/blend exists.
643. User can remove reflections only with manual tools unless future algorithms are added.
644. User can upscale images only with normal resizing, not generative upscale.
645. User can use sharpening after resizing.
646. User can use noise reduction after cleanup.
647. User can compare retouched layer against original with layer visibility.
648. User can keep a duplicate original layer before heavy retouching.
649. User can use history snapshots before major cleanup.
650. User can rely on non-AI retouching as the core product direction.

## Extended Color Management, Color Modes, Corrections, Gradients, And Fills

651. User can choose foreground color from a color picker.
652. User can choose background color from a color picker.
653. User can swap foreground and background colors.
654. User can reset foreground/background to black and white.
655. User can add a color to swatches.
656. User can remove a swatch.
657. User can sample color with Eyedropper.
658. User can sample the current layer's color by default (Eyedropper Sample defaults to Current Layer; All Layers is opt-in).
659. User can sample all visible layers when enabled.
660. User can choose web-safe colors if needed.
663. User can understand embedded ICC profile workflows are limited.
664. User can preserve RGB pixel data during editing.
665. User can convert to grayscale using Black and White adjustment.
666. User can convert to grayscale destructively in future if needed.
668. User can use Hue/Saturation to shift object colors.
669. User can colorize grayscale content with Hue/Saturation.
670. User can use Color Balance for tonal color correction.
671. User can use Vibrance for saturation control.
672. User can use Gradient Map for stylized tones.
673. User can use Photo Filter for warming or cooling.
674. User can use Channel Mixer for channel-based looks.
675. User can use Selective Color in future.
676. User can match color between layers in future.
677. User can match color between open documents only if multi-document support exists.
678. User can replace object color using selection plus Hue/Saturation.
679. User can save color correction presets in future.
680. User can use adjustment layers instead of destructive edits.
681. User can apply corrections only inside a selection.
682. User can apply corrections only through a mask.
683. User can fill the whole canvas with foreground color.
684. User can fill a selection with foreground color.
685. User can fill transparent pixels on the active layer in future.
686. User can stroke a selection with a chosen color in future.
687. User can stroke a layer boundary in future.
688. User can use content-aware fills only if future non-AI algorithms are added.
689. User can use pattern fill after pattern presets exist.
690. User can create new layers while brushing in future convenience workflows.
691. User can preview pattern tiling in future.
692. User can create a new pattern preset from selected pixels via Edit > Define Pattern….
693. User can manage pattern presets — save, select active, and remove; presets persist through localStorage.
694. User can edit gradient stop colors in future (GradientStop model exists; on-canvas custom-stops editor UI pending).
695. User can edit gradient stop positions in future.
696. User can save gradient presets in future.
697. User can apply gradient fill layers non-destructively.
698. User can use transparency stops in gradient fills in future.
699. User can use gradients inside selections.
700. User can understand professional color-management workflows are lower priority than RGB photo editing.

## Extended Brush Preset, Pattern, Shape, And Path Cases

701. User can open a Brush Settings or brush preset surface in future (a dedicated presets panel UI is still pending; the menu entry Edit > Define Brush Preset… and the in-store `brushPresets` list cover create / apply / remove).
702. User can apply a saved brush preset to update brushSettings.
703. User can create a new brush preset from current settings via Edit > Define Brush Preset….
704. User can rename a preset brush in future (no rename UI yet).
705. User can delete a brush preset via `removeBrushPreset(id)` (UI button pending in a presets panel).
706. User can group brushes into folders in future.
707. User can import brush packs in future if format support is added.
708. User can create a brush tip from an image in future.
709. User can edit brush roundness in future.
710. User can edit brush angle in future.
711. User can edit brush spacing in future beyond Pencil spacing.
712. User can use brush dynamics only if future scope expands.
713. User can keep brush presets local to the browser.
714. User can export/import Photoweb brush presets in future.
715. User can save and apply generic tool presets via `saveToolPreset(name, blob)` / `applyToolPreset(id, apply)` (per-tool options blob, localStorage-backed).
716. User can use spring-loaded shortcuts in future if tool-switch UX needs it.
717. User can draw vector-like rectangles as editable shape layers in future.
718. User can draw vector-like ellipses as editable shape layers in future.
719. User can draw vector-like polygons as editable shape layers in future.
720. User can draw vector-like lines as editable shape layers in future.
721. User can edit shape fill color after drawing.
722. User can edit shape stroke color after drawing.
723. User can edit shape stroke width after drawing.
724. User can edit rounded rectangle corner radius after drawing.
725. User can edit polygon sides after drawing.
726. User can edit line weight after drawing.
727. User can add arrowheads to line shapes (start/end toggles + size).
728. User can create star shapes from polygon options (star toggle + radius ratio).
729. User can load custom shape presets in future.
730. User can combine shape areas in future.
731. User can subtract one shape from another in future.
732. User can intersect shape areas in future.
733. User can exclude overlapping shape areas in future.
734. User can choose Shape, Path, or Pixels mode honestly.
735. User can keep shape editability when drawing in Shape mode — the resulting layer is `kind: 'shape'` with `shapeData`, not raster.
736. User can intentionally rasterize shape output when choosing Pixels mode.
737. User can use Pen tool to create manual paths.
738. User can use Freeform Pen for looser path creation.
739. User can use rubber-band path preview in future.
740. User can auto add/delete anchor points in future.
741. User can manage multiple paths in the Paths panel.
742. User can rename paths in future.
743. User can duplicate paths in future.
744. User can delete paths.
745. User can stroke a path with a brush in future.
746. User can fill a path in future.
747. User can convert a type or raster layer to a work path via Type > Create Work Path (marching-squares contour trace adds closed paths to the Paths panel).
748. User can convert text to shapes in future.
749. User can trace image content into paths only if non-AI tracing is added.
750. User can understand that shape/path features should preserve editability when they claim to.

## Extended Type, Fonts, Glyphs, And International Text Cases

751. User can paste text into a text layer.
752. User can copy text from a text layer in future.
753. User can resize a text box.
754. User can move text while editing.
755. User can rotate text with transform.
756. User can change text color from Character panel.
757. User can change text color from Properties panel.
758. User can set paragraph alignment before typing.
759. User can update paragraph formatting after typing.
760. User can use bulleted lists in future.
761. User can use numbered lists in future.
762. User can avoid crashes when bullets/numbers are not supported by seeing disabled controls.
763. User can search installed fonts in future.
764. User can replace missing fonts in future with a fallback.
765. User can match fonts from an image only if future OCR/font detection exists.
766. User can filter font styles in future.
767. User can understand OpenType features are currently disabled.
768. User can use standard ligatures in future if text renderer supports them.
769. User can use contextual alternates in future.
770. User can use swashes and stylistic alternates in future.
771. User can use variable fonts in future if browser support is reliable.
772. User can change font across multiple type layers in future.
773. User can fill text with an image using clipping/mask workflows in future.
774. User can add text along a path in future.
775. User can add text inside a shape in future.
776. User can flip text along a path in future.
777. User can move text start/end points on a path in future.
778. User can modify a text path in future.
779. User can warp text non-destructively in future.
780. User can unwarp text in future.
781. User can create a selection border from text in future.
782. User can add Drop Shadow to text as a layer effect.
783. User can add Stroke to text as a layer effect.
784. User can add Color Overlay to text as a layer effect.
785. User can use glyph panel workflows in future.
786. User can insert emoji glyphs only if browser font support is acceptable.
787. User can use glyph protection in future if international text expands.
788. User can use on-canvas glyph alternatives in future.
789. User can create documents using international scripts if browser text rendering supports them.
790. User can understand complex script support depends on the browser text engine.
792. User can use dynamic text only if future data binding exists.
793. User can reposition text start and end points only for path text in future.
794. User can preserve typeData on save/reopen (typeData round-trips through the `.pwbdoc` manifest).
795. User can undo type-layer content changes made from the Properties panel — every Properties Type edit flows through `applyTypeEdit` and is a single history entry.
796. User can undo Character panel changes — coalesced begin/commit groups slider drags into one history entry per drag-end.
797. User can undo Paragraph panel changes — same coalesced begin/commit pattern.
798. User can see disabled advanced typography controls as honest deferred features.
799. User can rasterize a type layer intentionally via Type > Rasterize Type Layer (drops typeData and changes the layer kind to raster).
800. User can keep editable text unless choosing an explicitly destructive operation.

## Extended Filter, Sharpen, Blur, Distort, Liquify, Sky, And Neural Cases

801. User can browse filters by category.
802. User can understand Filter Gallery is not fully implemented.
803. User can preview filter settings before applying in future richer dialogs.
804. User can fade the last filter in future.
805. User can blend a filter result with opacity/mode in future.
806. User can use Smart Filters only after smart filter architecture exists.
807. User can sharpen a whole image with Unsharp Mask.
808. User can sharpen only a selection.
809. User can sharpen using an edge mask in future.
810. User can pick a Smart Sharpen mode (Gaussian uses USM; Motion uses horizontal-box deconvolution; Lens uses smaller-sigma + edge-gradient boost) — each mode now produces visibly different results.
811. User can use Gaussian Blur for general softening.
812. User can use Box Blur for simple averaging.
813. User can use Motion Blur for directional blur.
814. User can use Surface Blur for edge-preserving softening.
815. User can use Lens Blur in future for depth-of-field effects.
816. User can blur hard edges manually in future with a Blur tool.
817. User can sharpen local areas manually in future with a Sharpen tool.
818. User can use artistic/stylize filters only if they are practical and tested.
819. User can warp a layer with transform warp.
820. User can use cylindrical transform warp in future.
821. User can use split warp in future.
822. User can use puppet warp in future.
823. User can use Liquify only if a dedicated large feature is scheduled.
824. User can push pixels with Liquify in future.
825. User can freeze areas in Liquify in future.
826. User can thaw areas in Liquify in future.
827. User can save and load Liquify meshes in future.
828. User can use Liquify backdrops in future.
829. User can reconstruct Liquify distortions in future.
831. User can manually replace sky with selections, masks, and layers.
832. User can manage sky presets only if sky replacement exists.
835. User can choose practical filters over AI features.
836. User can use filter output on duplicate layers for non-destructive manual workflow.
837. User can preserve alpha when applying filters.
838. User can avoid alpha pollution from filters.
839. User can use filters on masked layers.
840. User can see clear progress or disabled state for heavy filters in future.
841. User can cancel long-running filters in future.
842. User can avoid freezing the browser with extreme filter radii.
843. User can apply filters at high resolution within memory limits.
844. User can see a useful error if a filter cannot run.
845. User can stack multiple destructive filters with undo safety.
846. User can compare filtered and original layers by toggling visibility.
847. User can repeat last filter quickly.
848. User can reopen last filter settings for adjustment.
849. User can use filter tests as visual regression references in future.

## Extended Guides, Measurement, Animation, And Automation Cases

851. User can show guides by adding them via `addGuide`; a per-guide show/hide toggle is in future.
852. User can hide all guides without deleting them via a View toggle in future (currently only Clear Guides exists).
853. User can show smart guides after smart-guide support exists.
854. User can hide smart guides in future.
855. User can create guides from a numeric New Guide dialog in future (the store action exists; the dialog UI is pending).
856. User can create guides by dragging from rulers.
857. User can move guides precisely via `moveGuide(index, position)`.
858. User can edit guide position numerically through `moveGuide`; in-canvas drag-handle numeric readout is in future.
859. User can delete a specific guide via `removeGuide(index)`.
860. User can clear all guides at once.
861. User can set guide color in future.
862. User can set grid color in future.
863. User can set grid subdivisions in future.
864. User can snap layer movement to guides in future.
865. User can snap selection movement to guides in future.
866. User can snap shape drawing to grid in future.
867. User can snap transform handles to document bounds in future.
868. User can use smart guides for alignment between layers in future.
869. User can measure pixel distances.
870. User can set measurement scale only if non-pixel units become useful.
871. User can create scale markers in future only if measurement tools expand.
872. User can log measurements in future only if analysis workflows are added.
873. User can manage measurement data points only if measurement logs exist.
874. User can use rulers as navigation and guide aids first.
875. User can understand physical measurement workflows are low priority.
880. User can export still images without animation settings.
886. User can request repetitive workflows as direct features instead of action recording.
887. User can use keyboard shortcuts instead of action macros.
888. User can use history snapshots instead of recorded action checkpoints.
889. User can keep Photoweb focused on single-document editing.
890. User can avoid automation settings that do not apply to browser editing.
893. User can see disabled automation commands removed or hidden in future UI cleanup.
894. User can rely on tests rather than action playback for repeatability.
895. User can export multiple files only if batch support is later accepted.
896. User can process layers individually in future with explicit layer-export features.
897. User can use presets for repeated settings instead of action macros.
898. User can use native browser file permissions safely.

## Extended Save, Export, Formats, Cloud, Collaboration, And Integration Cases

901. User can save editable work locally.
902. User can save large documents within browser storage limits.
903. User can see an error if local save fails.
904. User can recover from a save program error with useful guidance.
905. User can export PNG for web use.
906. User can export JPEG with a quality slider from the Export dialog.
907. User can export WebP with a quality slider from the Export dialog.
908. User can choose export scale in future.
909. User can export layers as files in future.
910. User can export artboards only if artboards exist.
911. User can save for web with simplified export settings.
912. User can choose transparent export where the format supports it.
913. User can choose background matte for formats without alpha in future.
920. User can understand compression settings are limited to browser export APIs.
921. User can preview export dimensions.
922. User can see estimated export size in future.
923. User can set a default export location only if browser permissions allow it.
924. User can quick-export using the current visible composite.
925. User can fine-tune export with an Export dialog.
926. User can export without changing document state.
927. User can keep editable file save separate from flattened export.
930. User can share exported files through normal OS/browser sharing.
932. User can understand metadata and CSS export are low priority.
938. User can use plain exported PNG/JPEG files in other apps.
939. User can reopen Photoweb native files in Photoweb.
940. User can manage version naming manually.
941. User can duplicate a document file outside the app for versioning.
942. User can receive clear messaging when unsupported file formats are chosen.
943. User can choose not to upload images anywhere.
944. User can trust editing is local-first.
945. User can avoid account login flows.
946. User can use browser-native download prompts.
949. User can request export presets only after core export choices exist.
950. User can rely on Photoweb's scope statement when deciding if a Photoshop export feature should be built.

## Extended Troubleshooting, Performance, Stability, Accessibility, And QA Cases

951. User can see clear errors for storage quota problems.
952. User can see clear errors for unsupported image files.
953. User can see clear errors for failed exports.
954. User can see clear errors for failed saves.
955. User can recover autosaved work after a browser crash.
956. User can clear autosave recovery when no longer needed.
957. User can understand browser memory limits for very large documents.
958. User can see storage usage through Edit > Preferences > Storage Usage… (OPFS quota estimate + per-layer raster bytes).
959. User can see a history memory estimate in the Storage Usage dialog.
960. User can reduce history limit to save memory.
961. User can avoid GPU troubleshooting because Photoweb does not expose GPU settings directly.
962. User can receive performance warnings instead of Photoshop scratch-disk messages.
963. User can understand scratch disks do not apply in the same way to browser storage.
964. User can troubleshoot keyboard shortcuts not working due to input focus.
965. User can keep shortcuts from firing while typing text.
966. User can use visible buttons when shortcuts are unavailable.
967. User can understand when a menu item or control is intentionally disabled and read its tooltip or hover text for context.
968. User can use accessible labels for toolbar buttons in future audits.
969. User can navigate dialogs with keyboard focus in future accessibility pass.
970. User can see sufficient contrast in dark UI panels.
971. User can distinguish active and disabled controls visually.
972. User can use tooltips for unfamiliar controls.
973. User can avoid relying only on color to identify critical states in future.
974. User can see cursor changes that match the active editing state.
975. User can use move cursor when Move Tool is active.
976. User can use text cursor when editing text.
977. User can use drag cursor when moving selected text or pixels.
978. User can use crosshair cursor for selection tools.
979. User can use hand cursor for panning.
980. User can keep UI icons visually consistent with the Photoshop-inspired snapshots.
981. User can see generated icons as static assets rather than runtime-drawn ugly placeholders.
982. User can use tests to validate every new feature's happy path.
983. User can use tests to validate undo/redo for every mutating feature.
984. User can use tests to validate persistence for every editable metadata feature.
985. User can use tests to validate selection clipping for pixel operations.
986. User can use tests to validate mask clipping for pixel operations.
987. User can use tests to validate UI menu items are not misleading.
988. User can use tests to validate that disabled controls remain honest about their deferral status.
989. User can review comparison docs after each feature batch.
990. User can update the development plan after each major implementation batch.
991. User can update the backlog status after tests pass.
992. User can keep user cases linked to source note ranges in future.
993. User can split large features into one or two requirements at a time.
994. User can run TypeScript checks before marking a requirement complete.
995. User can run the full test suite before major commits.
996. User can inspect browser behavior manually after frontend UI changes.
997. User can commit stable checkpoints after significant batches.
998. User can avoid changing unrelated dirty files during focused tasks.
999. User can keep Photoweb's product scope narrower than Photoshop without hiding missing behavior.
1000. User can use this user-case matrix as a living checklist for manual review and implementation planning (sized to current scope; intentionally excluded Photoshop features live in the development plan, not here).

## Addendum: Cases Added In The 2026-05-11 Audit

Cases here cover photoweb features that shipped after the original 1000-case matrix was authored and have no natural home above. Numbering uses `A###` to keep the canonical matrix at 1000.

A001. User can pick a blend mode for each Drop Shadow / Stroke / Color Overlay effect from the Properties panel.
A002. User can choose whether each layer effect renders below the layer pixels (underlay) or above them (overlay) via its `position` parameter.
A003. User can re-edit a rotated type layer because the type tool inverse-rotates the click point into the layer's local frame before hit-testing.
A004. User can get visibly distinct Eraser results from Brush mode, Pencil mode, and Block mode (Block-mode spacing reads from the eraser options instead of a hardcoded constant).
A005. User can convert a type or raster layer's alpha outline into one or more closed paths via Type > Create Work Path; the result appears in the Paths panel.
A006. User can save the current tool's options as a named tool preset and re-apply it later (`saveToolPreset` / `applyToolPreset` / `removeToolPreset`).
A007. User can paint a feathered selection through a filter or adjustment and see the soft edge in the result (the feather radius is now honored in `buildSelectionMask`).
A008. User can apply High Pass to a layer with transparent pixels without polluting the alpha channel; the filter blurs RGB in premultiplied alpha space.
A009. User can paint the rectangular Marquee with the Anti-Alias toggle on the option bar and see soft-edge selection results.
A010. User can hold Alt mid-drag with the rectangular Marquee to draw the selection from its centre (the pointer-down captured op prevents Alt from being misread as a subtract operator).
A011. User can rely on autosave only firing after the document has real edits — a freshly-opened blank document does not generate an autosave entry.
A012. User can pick a custom pattern preset from the Paint Bucket option bar's Pattern dropdown, or fall back to the FG/BG checker placeholder when no pattern is active.
A013. User can rely on guides being drawn in the viewport overlay; horizontal and vertical guides are rendered at their stored positions and update live as guides move.
A014. User can change the Eraser spacing (block / pencil mode) through the eraser options and see fewer or denser stamps per stroke.
A015. User can edit the Gradient fill-layer custom stops through Properties and have them survive a `.pwbdoc` save/load cycle.
A016. User can apply Color Range with both add samples and subtract samples; subtract samples remove matching pixels from the resulting selection mask.
A017. User can rely on Color Range applying through the history command path so undo and redo restore the prior selection.
A018. User can launch Preferences (`Edit > Preferences > General…`), adjust history max size or UI scale, and have the value persist through reload.
A019. User can launch the Storage Usage dialog and see OPFS quota estimate plus a per-layer raster-bytes and history-memory estimate.
A020. User can draw a Polygon with `polygonStar=true` and a chosen `polygonStarRatio` to produce alternating outer/inner-radius star shapes.
A021. User can draw a Line with either or both endpoint arrowheads enabled; the shaft is shortened to meet the arrowhead base so the geometry stays clean.
A022. User can pick a Smart Sharpen mode (Gaussian / Motion / Lens) and see meaningfully different output instead of the same Unsharp Mask behavior.
A023. User can rely on brush, eraser, and pencil strokes committing history with a dirty-rect proportional to the actual stroke bounds (plus brush-radius padding), so undo memory does not scale with canvas size.

## Addendum: Cases Added In The 2026-05-11 Batch 1 (parallel-plan)

A024. User can save a shape layer and reopen the document with the geometry preserved — `shapeData` round-trips through the `.pwbdoc` manifest.
A025. User can undo creating a shape layer and the layer disappears; redo restores the shape with its original `shapeData`.
A026. User can draw a polygon star with `Shift` to constrain rotation to multiples of 15° and `Alt` to draw from the centre.
A027. User can adjust a slider in the Character panel during a drag and see a SINGLE history entry recorded on drag-end, not one per intermediate value.
A028. User can re-edit a rotated type layer after undoing a Properties edit — the overlay mounts back on the right layer at the right transform.
A029. User can see a single error toast (not one per autosave tick) when storage quota is exhausted; subsequent successful autosaves clear the dedup so the next failure can surface again.
A030. User can recover from a `canvas.toBlob` failure during export and see an actionable toast instead of a silent broken download.
A031. User can rely on Magic Eraser opacity at 0.5 producing partial transparency on matched pixels rather than full erasure.
A032. User can rely on Magic Eraser respecting the active selection — pixels outside the selection are never touched even when they match.

## Addendum: Cases Added In The 2026-05-11 Batch 2 (parallel-plan)

A033. User can edit a rectangle / rounded-rect / ellipse layer's width, height, corner radius, fill colour, stroke colour / weight / opacity / alignment from the Properties panel and see live re-render.
A034. User can edit a polygon layer's sides, rotation, Star toggle, and Indent Sides By (star ratio) from the Properties panel.
A035. User can edit a line layer's endpoints, weight, arrowhead start / end / size from the Properties panel.
A036. User can drag a Properties slider for a shape layer and have only ONE history entry committed on drag-end, not one per intermediate frame.
A037. User can erase background pixels with the Background Eraser using Continuous sampling (re-sample under the crosshair every stamp) for hair-like edges.
A038. User can switch Background Eraser sampling to Once to lock the colour after pointer-down, useful for textured backgrounds.
A039. User can switch Background Eraser sampling to Background Swatch so the secondary colour acts as the protected-colour-to-erase.
A040. User can switch Background Eraser limits between Contiguous, Discontiguous, and Find Edges for different cutout strategies.
A041. User can click on a small blemish with Spot Healing Brush and see it replaced by a deterministic ring-sample average of the surrounding pixels.
A042. User can rely on Spot Healing Brush producing identical results for identical inputs (no AI; deterministic 24-angular-bucket sampling).
A043. User can add an Inner Shadow effect to a layer with angle / distance / size / choke / colour / opacity / blend mode controls.
A044. User can add an Outer Glow effect with spread / size / colour / opacity / blend mode controls.
A045. User can open the New Guide dialog (`View > Guides > New Guide…`), pick orientation, enter a numeric position, and confirm with Enter.
A046. User can toggle `View > Show > Guides` to hide all guides temporarily without losing them.
A047. User can `View > Guides > Lock Guides` to prevent accidental guide drags.
A048. User can `View > Guides > Clear Guides` to remove all guides at once, and undo to restore them.
A049. User can drag a guide on canvas during one continuous drag and see only ONE history entry committed on pointer-up.
A050. User can open the Gradient Editor from the Gradient tool option bar's "Edit" button.
A051. User can open the Gradient Editor from the Properties > Fill section of a gradient fill layer.
A052. User can click empty space on the color-stop row to insert a new colour stop at that position; the new colour is sampled from the current gradient at that location.
A053. User can drag a color stop along the row to change its `position`.
A054. User can double-click a color stop to open a colour picker and change its `color`.
A055. User can select a stop and press Delete to remove it (minimum 2 stops preserved).
A056. User can edit opacity stops on a separate row with the same UX as color stops.
A057. User can save the current gradient state as a named preset; presets persist through localStorage.
A058. User can apply a saved gradient preset to repopulate the editor.
A059. User can confirm the editor with OK to write the edited stops back to the Gradient tool (`getGradientOptions().stops`) or to a fill layer's `fillData.stops`.

## Addendum: Cases Added In The 2026-05-11 Batch 3 (parallel-plan)

A060. User can Alt/Option-click with the Healing Brush to set a source anchor, then paint to apply the source's texture shifted toward the destination's mean tone so the repair blends.
A061. User can toggle Healing Brush "Aligned" off to reset the source-destination offset on every new pointer-down.
A062. User can use the Patch Tool in `source` mode: drag a selected region; the destination region is healed using the original-position pixels as the source.
A063. User can use the Patch Tool in `destination` mode: drag a selected region; the drop-position pixels are stamped onto the original-position pixels.
A064. User can click on a red-eye pupil with the Red Eye tool and have only the red cluster within a soft-edged disc of `pupilSize` desaturated and darkened.
A065. User can add an Inner Glow effect with `choke` (0–100) + `size` + `color` + `opacity` + `blendMode` and see the glow appear inside the layer's alpha edge.
A066. User can add a Gradient Overlay effect that reuses the existing Gradient Stop Editor so color/opacity stops are the same model as the Gradient tool.
A067. User can add a Pattern Overlay effect that uses any active pattern preset as the tile source, with `scale` + `opacity` + `blendMode`.
A068. User can select all pixels similar in color to the current selection with `Select > Grow` (contiguous flood fill).
A069. User can select all canvas pixels matching the current selection's colors with `Select > Similar` (non-contiguous).
A070. User can run `Layer > Matting > Defringe…` with a 1–10 px width to recolor semi-transparent edge pixels using the nearest opaque neighbor's RGB.
A071. User can run `Layer > Matting > Remove White Matte` to recover the foreground color from white-haloed semi-transparent edges via premultiplied inversion.
A072. User can run `Layer > Matting > Remove Black Matte` similarly for black-haloed edges.
A073. User can toggle Smart Radius in the Refine Edge dialog so per-pixel feather strength is modulated by Sobel gradient magnitude — sharper edges stay sharp, softer regions get the full radius.
A074. User can drag a layer with snap-to-guides on; the layer position rounds to the nearest guide / grid line / layer-edge / layer-center within a hysteresis of 6 px.
A075. User can see a dashed magenta smart-guide line drawn across the canvas whenever a drag is snapping to a target.
A076. User can rely on snap-to-* applying uniformly to Move Tool, selection-border drag, selected-pixel drag, shape drawing, and Free Transform handles via the shared `snapPoint` helper.
A077. User can recover an autosaved document after a browser refresh via a `Recover Document` button in the autosave banner.
A078. User can `Discard Recovery` to clear the autosave slot when the recovery is no longer useful.
A079. User can see a `● Unsaved changes` indicator in the status bar whenever the current history tick has advanced past the last save tick.
A080. User can be warned by a `window.confirm` dialog before File > New or File > Open replaces a document that has unsaved changes.
A081. User can be refused (with a clear toast) when creating, opening, or resizing a document that would exceed `MAX_DOC_PIXELS = 60M` (≈ 7745×7745).
A082. User can be warned (with a soft confirm) when crossing the `SOFT_DOC_PIXELS = 36M` threshold without yet hitting the hard limit.

## Addendum: Cases Added In The 2026-05-12 Batch 4 (parallel-plan)

A083. User can add a Bevel & Emboss effect with `style: 'inner-bevel' | 'outer-bevel' | 'emboss' | 'pillow-emboss'` and see the layer pixels rendered with Phong lighting (highlight + shadow at the specified angle and altitude).
A084. User can change `depth` (0–1000%), `direction` (up/down), `size`, `soften`, `angle`, `altitude`, plus separate highlight and shadow `color` / `opacity` / `blendMode`.
A085. User can add a Satin effect with `contour: 'linear' | 'cone' | 'gaussian'` and `invert` toggle; the result is a banded silky overlay clipped to the layer alpha.
A086. User can `Layer > Layer Style > Copy Layer Style` to capture the active layer's `effects` array into an in-memory clipboard.
A087. User can `Paste Layer Style` onto any other layer to replace its effects with the clipboard contents (history-wrapped).
A088. User can `Clear Layer Style` to remove all effects from the active layer (undoable).
A089. User can open the `Scale Effects…` dialog and multiply every numeric size / distance / spread / depth across all of the active layer's effects by a percentage (10–1000%).
A090. User can open the Brush Presets panel and see each preset rendered as a thumbnail showing the actual tip stamp at the preset's size/hardness/opacity.
A091. User can right-click a brush preset to Rename / Delete / Duplicate.
A092. User can drag-reorder brush presets in the panel; localStorage persists the order.
A093. User can open the Pattern Presets panel and see each preset rendered as a tile-thumbnail preview, with Rename / Delete affordances.
A094. User can pick a Custom Shape preset from the option bar (heart, 5-point star, 7-point star, arrow, lightning bolt, speech bubble, gear, checkmark) and draw it on the canvas; the result is a `kind: 'shape'` layer with `shapeData.kind === 'custom'` and the preset's SVG `pathD`.
A095. User can type into the FontPicker's search box and see the dropdown filter to fonts containing the substring; each row renders its name in that font for live preview.
A096. User can use ArrowDown/ArrowUp in the FontPicker to navigate the filtered list and Enter to commit.
A097. User can see a one-shot info toast when a type layer's font is missing and gets replaced with `sans-serif` ("Missing font 'Foo' replaced with sans-serif"); the toast fires once per layer per session, not on every re-render.
A098. User can open any dialog and tab through the controls without focus escaping the modal; Esc closes the dialog.
A099. User can hover any toolbar button and a screen reader will read the same label that the tooltip shows (`aria-label` matches the tooltip text).
A100. User can rely on every dialog having `role="dialog"` and `aria-modal="true"` so assistive technologies treat them as modal surfaces.
