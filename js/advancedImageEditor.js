var AdvancedImageEditor = (function(){
  var cropper = null;
  var $modal = $("#cropper-modal");
  var $image = $("#cropper-image");
  var filterSettings = {
    brightness: 100, // Neutral brightness
    contrast: 100,
    saturation: 100,
    hue: 0
  };

  /**
   * Opens the advanced, full-screen editor.
   * @param {string} imageUrl - The source image URL.
   * @param {function} callback - Called on “Save New Image” with (newImageData, generatedMediaId, editMetaData).
   * @param {string} mode - (Optional) mode for future use.
   */
  function openEditor(imageUrl, callback, mode) {
    // Display modal in full screen.
    $modal.fadeIn(300);

    // Clear the current src to force a fresh load event.
    $image.attr("src", "");

    // Bind the load event before setting the new src.
    $image.one("load", function() {
      // Use a longer delay to forcefully remove the hidden class.
      setTimeout(function(){
        $image.removeClass("cropper-hidden");
      }, 500);

      if (cropper) {
        cropper.destroy();
      }
      cropper = new Cropper($image[0], {
        aspectRatio: NaN,
        viewMode: 1,
        autoCropArea: 1,
        ready: function(){
          updateLivePreview();
          // Again, force remove the "cropper-hidden" class after cropper is ready.
          setTimeout(function(){
            $image.removeClass("cropper-hidden");
          }, 500);
        },
        crop: function(){
          updateLivePreview();
        }
      });
      initFilterControls();
    });

    // Set the new image source.
    $image.attr("src", imageUrl);

    // If the image is already cached and complete, trigger the load event.
    if ($image[0].complete) {
      $image.trigger("load");
    }
  }

  /**
   * Closes the editor, destroys the Cropper instance, and clears the modal.
   */
  function closeEditor() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    $modal.fadeOut(200);
    $image.attr("src", "");
    $("#cropper-live-preview").empty();
  }

  /**
   * Obtains the cropped canvas from Cropper, applies filter settings,
   * and updates the live preview.
   */
  function updateLivePreview() {
    if (!cropper) return;
    var previewCanvas = cropper.getCroppedCanvas();
    if (!previewCanvas) return;
    var filteredCanvas = applyFiltersToCanvas(previewCanvas, filterSettings);
    $("#cropper-live-preview").empty().append(filteredCanvas);
  }

  /**
   * Initializes the filter controls (sliders) for brightness, contrast, saturation, and hue.
   */
  function initFilterControls() {
    $("#brightness-slider").off("input").on("input", function(){
      filterSettings.brightness = parseInt($(this).val(), 10);
      console.log("Brightness updated to", filterSettings.brightness);
      updateLivePreview();
    });
    $("#contrast-slider").off("input").on("input", function(){
      filterSettings.contrast = parseInt($(this).val(), 10);
      console.log("Contrast updated to", filterSettings.contrast);
      updateLivePreview();
    });
    $("#saturation-slider").off("input").on("input", function(){
      filterSettings.saturation = parseInt($(this).val(), 10);
      console.log("Saturation updated to", filterSettings.saturation);
      updateLivePreview();
    });
    $("#hue-slider").off("input").on("input", function(){
      filterSettings.hue = parseInt($(this).val(), 10);
      console.log("Hue updated to", filterSettings.hue);
      updateLivePreview();
    });
  }

  /**
   * Applies filter settings to a canvas element using the canvas 2D context.
   * @param {HTMLCanvasElement} canvas - The input canvas from Cropper.
   * @param {object} settings - An object with properties: brightness, contrast, saturation, hue.
   * @returns {HTMLCanvasElement} A new canvas element with filters applied.
   */
  function applyFiltersToCanvas(canvas, settings) {
    var newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    var ctx = newCanvas.getContext("2d");

    ctx.filter = 
      "brightness(" + settings.brightness + "%) " +
      "contrast("  + settings.contrast  + "%) " +
      "saturate("  + settings.saturation + "%) " +
      "hue-rotate(" + settings.hue + "deg)";

    ctx.drawImage(canvas, 0, 0);
    return newCanvas;
  }

  /**
   * Saves the processed image to the server.
   * @param {string} dataUrl - The Data URL of the final image.
   */
  function saveNewImage(dataUrl) {
    $.ajax({
      url: "ajax/saveNewImage.php",
      type: "POST",
      data: { image: dataUrl },
      dataType: "json",
      success: function(response) {
        if (response.success) {
          Notifications.show("New image saved successfully", "success");
          MediaLibrary.loadMedia();
        } else {
          Notifications.show("Error: " + response.error, "error");
        }
      },
      error: function() {
        Notifications.show("Failed to save new image.", "error");
      }
    });
  }

  return {
    openEditor: openEditor,
    closeEditor: closeEditor,
    init: function(){}
  };
})();
