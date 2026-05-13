# How To Use Smart Filters In Photoshop

> Source: [https://www.photoshopessentials.com/basics/how-to-use-smart-filters-in-photoshop/](https://www.photoshopessentials.com/basics/how-to-use-smart-filters-in-photoshop/)
> Downloaded and converted to Markdown.

![How to use smart filters in Photoshop](images/2018-03-howto-use-smart-objects-photoshop-f-ae58876f.jpg)

In this tutorial, I show you how to use smart filters in Photoshop! You'll learn everything you need to know about smart filters, including what smart filters are, and the advantages they have over Photoshop's regular filters. You'll learn how to apply and edit a smart filter, how to add multiple smart filters to a single image, how to control which parts of your image are effected by the smart filters, and more! We'll even learn how to apply Photoshop's most powerful filter, the Camera Raw Filter, as an editable, non-destructive smart filter!

I'll be using [Photoshop CC](https://prf.hn/l/dlXjD2w) but smart filters are available in any version of Photoshop from CS3 and up. Let's get started!

### What are smart filters?

A **smart filter** is really just a normal Photoshop filter, but one that's been applied to a smart object. A **smart object** is a container that holds the contents of a layer safely inside it. When we convert a layer into a smart object, any changes we make are applied to the container itself, not to its contents. This keeps our changes both editable and non-destructive. And when we apply one of Photoshop's *filters* to a smart object, the filter automatically becomes an editable, non-destructive *smart* filter! 

The main advantage of smart filters is that we can change a smart filter's settings any time we need without any loss in quality, and without making any permanent changes to the image. But there are other advantages as well. We can turn smart filters on and off, change the blend mode and opacity of a smart filter, and even change the order in which smart filters are being applied. Smart filters also include a built-in layer mask, giving us control over exactly which part of the image is being affected. And because smart filters are entirely non-destructive, they give us the freedom to experiment with different filters and filter settings without worrying about messing anything up. The truth is, if you're not using smart filters, you're missing out on one of Photoshop's best features, so let's see how they work! 

## How to apply a smart filter in Photoshop

For this tutorial, I'll use [this image](https://prf.hn/l/b3QO5lq) that I downloaded from Adobe Stock. Since our goal is to learn about smart filters, not to create a specific effect, you can easily follow along with any image of your own:

![The original image that will be used in the smart filters tutorial](images/smart-objects-smart-filters-original-5819ed19.jpg)
*The original image. Photo credit: Adobe Stock.*

### Converting a layer into a smart object

Before we can apply smart filters, we first need to convert our image into a smart object. In the [Layers panel](/basics/layers/layers-panel/), we see the image on the [Background layer](/basics/background-layer-photoshop-cc/):

![The image on the Background layer in the Layers panel in Photoshop](images/smart-objects-smart-filters-background-layer-layers-panel-photoshop-c89a0d3f.png)
*The image opens on the Background layer.*

To convert the layer to a smart object, double-click on the name "Background" to rename it:

![Renaming the Background layer in the Layers panel in Photoshop](images/smart-objects-smart-filters-rename-background-layer-bfb392ad.png)
*Start by renaming the Background layer.*

In the New Layer dialog box, give the layer a more descriptive name. I'll name mine "Photo". Click OK to accept it:

![Entering a new name in the New Layer dialog box in Photoshop](images/smart-objects-smart-filters-new-layer-dialog-box-photoshop-e269e41d.png)
*Renaming the Background layer.*

Back in the Layers panel, we see that my Background layer is now the "Photo" layer. To convert it to a smart object, click on the **menu icon** in the upper right of the Layers panel:

![Clicking the Layers panel menu icon in Photoshop](images/smart-objects-smart-filters-layers-panel-menu-icon-photoshop-3dee3118.png)
*Clicking the Layers panel menu icon.*

Then choose **Convert to Smart Object** from the list:

![Choosing the Convert to Smart Object command in Photoshop](images/smart-objects-smart-filters-convert-to-smart-object-photoshop-fb247aef.png)
*Choosing "Convert to Smart Object".*

A **smart object icon** appears in the lower right of the layer's preview thumbnail, telling us that our layer is now a smart object:

![The smart object icon in the layer preview thumbnail in Photoshop](images/smart-objects-smart-filters-smart-object-icon-photoshop-134c21a8.png)
*The smart object icon.*

[Related tutorial: How to create smart objects in Photoshop](/basics/how-to-create-smart-objects-in-photoshop/)

### Applying a Photoshop filter as a smart filter

Once we've converted a layer to a smart object, any filters we apply to it from Photoshop's Filter menu will be automatically converted into smart filters. For example, let's start with something simple, like the Gaussian Blur filter. Go up to the **Filter** menu in the Menu Bar, choose **Blur**, and then choose **Gaussian Blur**:

![Choosing the Gaussian Blur filter in Photoshop](images/smart-objects-smart-filters-choose-gaussian-blur-filter-photoshop-39e72626.png)
*Going to Filter > Blur > Gaussian Blur.*

We can use the Gaussian Blur filter to blur the image, and we control the amount of blur using the **Radius** option at the bottom of the dialog box. I'll set my Radius value to 10 pixels:

![Blurring the image with the Gaussian Blur filter in Photoshop](images/smart-objects-smart-filters-gaussian-blur-filter-photoshop-3c52e058.png)
*Adjust the blur amount with the Radius slider.*

Click OK to close the dialog box, and here's my image with the blur applied:

![The image after applying the Gaussian Blur filter in Photoshop](images/smart-objects-smart-filters-image-gaussian-blur-filter-photoshop-09dd63d0.jpg)
*The image after applying the Gaussian Blur filter.*

### Viewing the smart filters

If we look again in the Layers panel, we see our Gaussian Blur filter now listed as a smart filter below the "Photo" smart object. All we had to do was apply it to a smart object and Photoshop instantly converted the filter into a smart filter:

![The Gaussian Blur smart filter listed below the smart object in the Layers panel](images/smart-objects-smart-filters-gaussian-blur-smart-filter-eb8ccea1.png)
*Smart filters are listed below the smart object they've been applied to.*

## How to edit a smart filter

The main advantage that smart filters have over Photoshop's regular filters is that we can edit a smart filter and change its settings after it's been applied. To edit a smart filter, double-click on the filter's name:

![How to reopen a smart filter in Photoshop](images/smart-objects-smart-filters-reopen-gaussian-blur-smart-filter-dfc0164f.png)
*Double-click on a smart filter to reopen it.*

This reopens the filter's dialog box. I'll increase the Radius value from 10 pixels to 20 pixels, and then I'll click OK:

![Editing the smart filter](images/smart-objects-smart-filters-edit-gaussian-blur-smart-filter-8edf1c76.jpg)
*Editing the smart filter.*

My new filter setting is instantly applied to the image. And because smart filters are non-destructive, there's no loss in image quality. The new filter setting simply replaces the previous setting, as if the previous one never happened:

![The image after editing the Gaussian Blur smart filter](images/smart-objects-smart-filters-image-new-blur-amount-81a2c9ee.jpg)
*The same image after editing the Gaussian Blur smart filter.*

## Changing a smart filter's blend mode and opacity

Along with being able to change their settings, another advantage of smart filters in Photoshop is that we can change a filter's **blend mode** and **opacity**. If you look to the right of a smart filter's name in the Layers panel, you'll find an icon with two sliders. This is the filter's **Blending Options** icon. Double-click on it to open the Blending Options dialog box:

![How to open a smart filter's blending options in Photoshop](images/smart-objects-smart-filters-smart-filter-blending-options-icon-481315b3.png)
*Each smart filter will have its own Blending Options icon.*

Here we can change the blend mode and the opacity of the filter. In other words, we're changing how the effect of the filter is blending with the contents of its smart object. This is different from the Blend Mode and Opacity options in the Layers panel, which control how the *layer* blends with the layers below it. Here, we're affecting the filter itself.

I'll change the blend mode of the Gaussian Blur smart filter from Normal to **Soft Light**, and I'll lower the opacity to **50%**. Then I'll click OK to close the dialog box:

![How to change a smart filter's blending options in Photoshop](images/smart-objects-smart-filters-smart-filter-blending-options-bb3f635f.jpg)
*Changing the blend mode and lowering the opacity of the smart filter.*

Changing the blend mode of the blur effect to Soft Light increases the contrast and color saturation of the image, creating a soft glow. And by lowering the opacity of the filter to 50 percent, I've reduced the intensity of the effect:

![The result after changing the Blending Options for the Gaussian Blur smart filter in Photoshop](images/smart-objects-smart-filters-image-soft-glow-effect-d3507614.jpg)
*The result after changing the Blending Options for the Gaussian Blur smart filter.*

[Related tutorial: Photoshop's Top 5 blend modes you need to know](/photo-editing/layer-blend-modes/intro/)

## Turning a smart filter on and off

Another advantage of smart filters is that we can toggle them on and off. To see what your image looked like before applying a smart filter, turn the filter off by clicking the **visibility icon** beside its name. Click the same visibility icon again (the empty spot where the eyeball appeared) to turn the filter back on and view the effect:

![How to toggle the visibility of a smart filter in Photoshop](images/smart-objects-smart-filters-smart-filter-visibility-icon-07bda344.png)
*Use the visibility icon to toggle a smart filter on and off.*

## Adding more smart filters

So far, we've applied a single smart filter, but we can add multiple smart filters to the same smart object. Let's add a second one, this time from Photoshop's Filter Gallery. Go up to the **Filter** menu in the Menu Bar and choose **Filter Gallery**:

![How to open the Filter Gallery in Photoshop](images/smart-objects-smart-filters-choose-filter-gallery-photoshop-37029cfd.png)
*Going to Filter > Filter Gallery.*

The Filter Gallery opens with a large preview area on the left, and the filters we can choose from, along with their settings, on the right:

![The Filter Gallery in Photoshop](images/smart-objects-smart-filters-photoshop-filter-gallery-2e6e77bb.jpg)
*Photoshop's Filter Gallery.*

I'll choose one of my favorite filters, **Diffuse Glow**, which is found in the **Distort** group of filters. Click on its thumbnail to select it:

![Selecting the Diffuse Glow filter in the Filter Gallery in Photoshop](images/smart-objects-smart-filters-choose-diffuse-glow-filter-photoshop-3d10eaaf.png)
*Selecting the Diffuse Glow filter.*

In the settings for the Diffuse Glow filter, I'll set the **Graininess** to **3**, the **Glow Amount** to **5** and the **Clear Amount** to **8**. Then I'll click OK to close the Filter Gallery:

![The Diffuse Glow filter settings in the Filter Gallery](images/smart-objects-smart-filters-diffuse-glow-options-1fba3a5d.png)
*The Diffuse Glow filter settings.*

And here's my image with Diffuse Glow applied:

![The effect with two smart filters applied in Photoshop](images/smart-objects-smart-filters-image-diffuse-glow-effect-177606bd.jpg)
*The effect using the Diffuse Glow and the Gaussian Blur smart filters.*

In the Layers panel, we now see two smart filters listed below the smart object. Any filters that are part of the Filter Gallery are listed simply as "Filter Gallery" rather than by the name of the specific filter that was used:

![The Layers panel showing both smart filters](images/smart-objects-smart-filters-two-smart-filters-df648ae3.png)
*The Layers panel showing both smart filters.*

### Editing the effect

If I wanted to try different settings for the Diffuse Glow filter, I could double-click on the name "Filter Gallery" to reopen it and make my changes. But in this case, I just want to reduce the intensity of the effect, so I'll double-click on the filter's **Blending Options** icon:

![Opening the Blending Options for the Filter Gallery smart object](images/smart-objects-smart-filters-filter-gallery-blending-options-icon-82649297.png)
*Opening the Blending Options for the Filter Gallery.*

In the Blending Options dialog box, I'll leave the Blend Mode set to Normal but I'll lower the **Opacity** to around **80%**. Then I'll click OK:

![Lowering the opacity of the Diffuse Glow smart filter in Photoshop](images/smart-objects-smart-filters-filter-gallery-blendingoptions-opacity-2a8a57d7.jpg)
*Lowering the opacity of the Diffuse Glow filter.*

With the opacity lowered, the Diffuse Glow effect is now a bit less intense:

![The result after lowering the opacity of the Diffuse Glow smart filter](images/smart-objects-smart-filters-image-diffuse-glow-lower-opacity-bbdc7b1d.jpg)
*The result after lowering the opacity.*

## Changing the order of smart filters

The order in which we apply smart filters is important because Photoshop applies them one after the other, from bottom to top. In my case, it's applying Gaussian Blur first, and then applying the Diffuse Glow filter on top of the blur effect. We can change the stacking order of smart filters by dragging them above or below each other in the list. I'll click on my Gaussian Blur filter, and then I'll drag it above the Diffuse Glow filter (the Filter Gallery). When a highlight bar appears above the Filter Gallery, I'll release my mouse button to drop Gaussian Blur into place:

![Changing the stacking order of the smart filters in the Layers panel](images/smart-objects-smart-filters-change-smart-filter-stacking-order-d4da5047.png)
*Drag smart filters up or down to change the order in which they're applied.*

And now the Diffuse Glow filter is being applied first, and then Gaussian Blur on top of it:

![The order of the smart filters has been changed](images/smart-objects-smart-filters-smart-filters-order-changed-ad4f2cbc.png)
*Photoshop is now applying the filters in the opposite order.*

The difference can be subtle or more obvious depending on the filters you're using. In my case, it's subtle but noticeable. In this "before and after" comparison, we see that moving the Gaussian Blur filter above the Diffuse Glow filter added a bit more brightness and contrast to the effect (right) compared to the way it looked originally (left):

![The result after changing the stacking order of the smart filters in Photoshop](images/smart-objects-smart-filters-image-smart-filtes-reordered-8bf25593.jpg)
*The original (left) and new (right) version after changing the order of the smart filters.*

## Editing multiple smart filters

Here's an issue you'll run into when editing multiple smart filters. With the Gaussian Blur filter now sitting above the Filter Gallery, if I double-click on its name to edit the filter:

![Reopening the Gaussian Blur smart filter above the Filter Gallery](images/smart-objects-smart-filters-double-click-gausian-blur-5bc081dc.png)
*Double-clicking on "Gaussian Blur".*

The Gaussian Blur dialog box reopens as we would expect. I'll click **Cancel** to close it without making any changes:

![The Gaussian Blur dialog box reopens](images/smart-objects-smart-filters-cancel-gaussian-blur-c7db224c.jpg)
*The Gaussian Blur dialog box reopens.*

But watch what happens if I double-click on the words "Filter Gallery" *below* the Gaussian Blur filter:

![Reopening the Filter Gallery smart filter below the Gaussian Blur smart filter](images/smart-objects-smart-filters-double-click-filter-gallery-9436904e.png)
*Double-clicking on "Filter Gallery".*

Instead of the Filter Gallery opening right away, Photoshop instead pops open a message. The message tells us that any smart filters sitting above this filter will be temporarily turned off while we're making our changes. Again, the reason is because Photoshop applies smart filters from bottom to top. Since my Gaussian Blur filter is sitting above the Filter Gallery, Photoshop needs to turn off the Gaussian Blur filter so it can show an accurate preview of the Filter Gallery. Once I'm done making changes and I've closed the Filter Gallery, Photoshop will turn the Gaussian Blur filter back on. When you see this message, just click OK to accept it:

![Smart filters stacked on top of this filter will not preview while this filter is being edited](images/smart-objects-smart-filters-smart-filters-no-preview-189eaf74.png)
*Any smart filters above the selected filter will not preview until we're done with the edits.*

As soon as I close the message, the Filter Gallery reopens to my Diffuse Glow settings. I'll again click Cancel to close it without making any changes:

![The Filter Gallery smart filter reopens to the Diffuse Glow settings](images/smart-objects-smart-filters-filter-gallery-cancel-876db36b.jpg)
*Click OK to close the message and edit the smart filter.*

## Experimenting with smart filters

Since smart filters are completely non-destructive, we can safely play around and experiment with different filters and filter settings just to see what they do, and to see if we like the result. One of the filters I used for my [Falling Snow Effect](/photo-effects/photoshop-weather-effects-snow/) was the Crystallize filter. To see how it looks with this image, I'll select it by going up to the **Filter** menu, choosing **Pixelate**, and then choosing **Crystallize**:

![Choosing the Crystallize filter in Photoshop](images/smart-objects-smart-filters-choose-crystallize-filter-d1662cea.png)
*Going to Filter > Pixelate > Crystallize.*

The Crystallize filter breaks an image into sections, or cells, of color. We control the size of the cells using the **Cell Size** option at the bottom. Since I'm just experimenting here, I'll set my Cell Size to 40, and then I'll click OK:

![The Crystallize filter dialog box in Photoshop](images/smart-objects-smart-filters-photoshop-crystallize-filter-e33f2dcb.png)
*The Crystallize filter dialog box.*

And here's the result. It's an interesting effect, and one that I'm sure I'll find a use for in the future. But for this image, it doesn't really work:

![The image with the Crystallize filter applied](images/smart-objects-smart-filters-image-crystallize-filter-effect-photoshop-8967eac8.jpg)
*The Crystallize filter's effect.*

## How to delete a smart filter

If you try a smart filter and don't like the results, not a problem. You can just delete it. In the Layers panel, we see the Crystallize filter now listed as a third smart filter above the others:

![The image now has three smart filters applied to it](images/smart-objects-smart-filters-crystallize-smart-filter-7280512b.png)
*The image now has three smart filters applied to it.*

To delete a smart filter, click on its name and drag it down onto the **Trash Bin** at the bottom of the Layers panel:

![How to delete a smart filter in Photoshop](images/smart-objects-smart-filters-delete-smart-filter-0325b801.png)
*Drag a smart filter onto the Trash Bin to delete it.*

With the filter deleted, the image instantly reverts back to the way it looked before the filter was applied:

![The effect after deleting the smart filter in Photoshop](images/smart-objects-smart-filters-image-smart-filter-deleted-3b2c10bf.jpg)
*The effect after deleting the Crystallize smart filter.*

## Applying Camera Raw as a smart filter

Let's add one more smart filter. This time, we'll add the most powerful filter in all of Photoshop, the Camera Raw Filter. Note that the Camera Raw Filter is only available in Photoshop CC, so you'll need [Photoshop CC](https://goo.gl/oiav4c) to follow along with this part.

Go up to the **Filter** menu and choose **Camera Raw Filter**:

![Adding the Camera Raw Filter as a smart filter in Photoshop](images/smart-objects-smart-filters-choose-camera-raw-filter-photoshop-da27dd62.png)
*Going to Filter > Camera Raw Filter.*

This opens the image in the Camera Raw Filter's dialog box. The Camera Raw Filter gives us access to the exact same image editing features that we'd find not only in Photoshop's main Camera Raw plugin but also in Adobe Lightroom. And by applying it as a smart filter, we're keeping the filter's settings completely editable:

![How to use the Camera Raw Filter as a smart filter in Photoshop](images/smart-objects-smart-filters-camera-raw-filter-photoshop-cde94b2b.jpg)
*The Camera Raw Filter dialog box.*

In the **Basic** panel on the right, I'll lower the **Clarity** value to **-25**. This will add a bit more softness to the effect by reducing contrast in the midtones. Then, to reduce the color saturation, I'll lower the **Vibrance** value also to **-25**:

![Lowering the Clarity and Vibrance settings in the Camera Raw Filter](images/smart-objects-smart-filters-camera-raw-clarity-vibrance-57fe20f1.png)
*Lowering the Clarity and Vibrance settings in the Basic panel.*

I'll click OK to close the Camera Raw Filter's dialog box, and here's the result so far:

![The result after softening the image and lowering the color saturation with the Camera Raw Filter](images/smart-objects-smart-filters-image-camera-raw-filter-f21eb74f.jpg)
*The result after softening the image and lowering the color saturation.*

### Editing the Camera Raw Filter settings

In the Layers panel, we see the Camera Raw Filter listed as a smart filter above the Filter Gallery and the Gaussian Blur filter. To reopen its dialog box and make further edits, just double-click on the name "Camera Raw Filter":

![How to reopen the Camera Raw Filter smart filter in Photoshop](images/smart-objects-smart-filters-camera-raw-filter-layers-panel-94390283.png)
*Reopening the Camera Raw smart filter.*

I forgot that I also wanted to add a vignette effect to the image. So in the panel area on the right, I'll switch to the **Effects** panel by clicking its tab:

![Opening the Effects panel in the Camera Raw Filter in Photoshop](images/smart-objects-smart-filters-camera-raw-filter-effects-panel-52c5932a.png)
*Switching from the Basic to the Effects panel.*

Then, in the **Post Crop Vignetting** section, I'll drag the **Amount** slider to the left, to a value of around **-30**:

![Adjusting the Post Crop Vignetting Amount slider in the Camera Raw Filter dialog box](images/smart-objects-smart-filters-post-crop-vignetting-amount-15e6a5da.png)
*Adding a vignette to the image.*

I'll click OK once again to close the Camera Raw Filter dialog box. And here's the result, not only with the Clarity and Vibrance adjustments that I made initially but also with the new vignette effect in the corners:

![Adding a vignette effect with the Camera Raw Filter in Photoshop](images/smart-objects-smart-filters-image-vignette-effect-camera-raw-filter-af7da2cb.jpg)
*The result after making more edits in the Camera Raw Filter.*

## Using the smart filter layer mask

And finally, another big advantage that smart filters have over regular filters is that smart filters include a built-in **layer mask**. The layer mask lets us control exactly which parts of the image are affected by the filters. In the Layers panel, we see the white-filled **layer mask thumbnail** beside the words "Smart Filters":

![The smart filters layer mask in Photoshop](images/smart-objects-smart-filters-smart-filters-layer-mask-thumbnail-cc1b99a4.png)
*Use the layer mask to control the visibility of the smart filters.*

I want to lower the brightness and restore some of the detail in the woman's face, so I need to reduce the impact of the smart filters in that part of the image. I can do that just by painting over that area on the layer mask with black. First, I'll click on the layer mask thumbnail to select it. The highlight border around the thumbnail tells me that the layer mask, not the smart object, is selected:

![Selecting the smart filters layer mask](images/smart-objects-smart-filters-select-layer-mask-3ede4420.png)
*Selecting the layer mask.*

I'll select the **Brush Tool** from the Toolbar:

![Selecting the Brush Tool in the Toolbar in Photoshop](images/smart-objects-smart-filters-select-photoshop-brush-tool-ee5a9121.png)
*Choosing the Brush Tool.*

And still in the [Toolbar](/basics/custom-toolbar-photoshop/), I'll make sure my **brush color** (the Foreground color) is set to **black**:

![Setting the brush color to black in Photoshop](images/smart-objects-smart-filters-photoshop-brush-color-black-fdc60f4c.png)
*Photoshop uses the Foreground color as the brush color.*

Then, using a large, soft-edge brush, I'll paint on the layer mask over the woman's face. Notice, though, that instead of simply *reducing* the impact of the smart filters, I'm hiding them completely, which isn't what I wanted to do:

![Painting with black on the layer mask to hide the effects of the smart filters](images/smart-objects-smart-filters-hiding-smart-filters-layer-mask-9ad778ad.jpg)
*Painting with black on the layer mask hides the effects of the smart filters.*

### Painting with a lower opacity brush

I'll undo my brush stroke by going up to the **Edit** menu and choosing **Undo Brush Stroke**:

![Choosing Undo Brush Stroke under the Edit menu in Photoshop](images/smart-objects-smart-filters-edit-undo-brush-tool-photoshop-fa4681da.png)
*Going to Edit > Undo Brush Stroke.*

This restores the smart filters in the area where I painted:

![Painting with black on the layer mask to hide the effects of the smart filters](images/smart-objects-smart-filters-image-vignette-effect-camera-raw-filter-af7da2cb.jpg)
*Undoing the brush stroke restored the filters.*

Then, in the Options Bar, I'll lower the **Opacity** of my brush from 100% down to around **40%**:

![Lowering the opacity of the Brush Tool in the Options Bar in Photoshop](images/smart-objects-smart-filters-brush-tool-opacity-option-c39de203.png)
*Lowering the opacity of the brush to 40%.*

And this time, painting over the same area with a lower opacity brush simply reduces, rather than completely hides, the smart filter effects:

![How to use a smart filter layer mask in Photoshop](images/smart-objects-smart-filters-paint-smart-filters-layer-mask-63f6dd52.jpg)
*Paint with a lower opacity brush to reduce, not remove, the effects of the smart filters.*

[Related tutorial: How to use layer masks in Photoshop](/basics/understanding-photoshop-layer-masks/)

## Showing and hiding all smart filters at once

Earlier, we learned that we can toggle an individual smart filter on and off by clicking the visibility icon beside the filter's name. But if you've applied multiple smart filters to a smart object and need to toggle all of them on and off at once, click the main **visibility icon** beside the layer mask thumbnail:

![How to toggle smart filters on and off in Photoshop](images/smart-objects-smart-filters-toggle-smart-filters-b887e923.png)
*Use the main visibility icon to toggle all smart filters on and off at once.*

Click it once to turn all the smart filters off and view the original contents of the smart object:

![Turning the smart filters off to view the contents of the smart object in Photoshop](images/smart-objects-smart-filters-original-5819ed19.jpg)
*Viewing the original image with the smart filters turned off.*

Click it again to turn the smart filters back on and view the effects:

![Turning the smart filters off to view the contents of the smart object in Photoshop](images/smart-objects-smart-filters-howto-use-smart-filters-photoshop-abf9f863.jpg)
*The effect with the smart filters turned on.*

And there we have it! That's everything you need to know to start using editable, non-destructive smart filters in Photoshop! For more tutorials on smart filters, learn how to create a colorful [twirl art effect](/photo-effects/twirl-art-effect/), how to create a [watercolor painting](/photo-effects/watercolor-painting-photoshop-cs6/) effect, or how to use [smart filters with text!](/basics/smart-filters-editable-type-photoshop/) Or visit our [Photoshop Basics](/basics/) section for more tutorials!