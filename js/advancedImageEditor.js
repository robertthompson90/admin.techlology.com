var AdvancedImageEditor = (function(){
  var cropper = null;
  var $modal = $("#cropper-modal");
  var $image = $("#cropper-image");
  var filterSettings = {
    brightness: 100, // 100% means no change
    contrast: 100,
    saturation: 100,
    hue: 0
  };

  /**
   * Opens the advanced, full-screen editor with advanced functionality.
   * @param {string} imageUrl - The source image URL.
   * @param {function} callback - Called on “Save New Image” with (newImageData, generatedMediaId, editMetaData).
   */
  function openEditor(imageUrl, callback) {
    $modal.fadeIn(300);
    $image.attr("src", "");
    $image.one("load", function() {
      $image.removeClass("cropper-hidden");
      if (cropper) { cropper.destroy(); }
      cropper = new Cropper($image[0], {
        aspectRatio: NaN,
        viewMode: 1,
        autoCropArea: 1,
        ready: function() {
          updateLivePreview();
          sanitizeCropperUI();
          if (typeof callback === "function") { callback(); }
        },
        crop: function() {
          updateLivePreview();
        }
      });
      initFilterControls();
    });
    $image.attr("src", imageUrl);
    if ($image[0].complete) { $image.trigger("load"); }
  }

  /**
   * Closes the editor, cleaning up the Cropper instance.
   */
  function closeEditor() {
    if (cropper) { cropper.destroy(); cropper = null; }
    $modal.fadeOut(200);
    $image.attr("src", "");
    $("#cropper-live-preview").empty();
  }

  /**
   * Updates the live preview canvas with current crop and applied filters.
   */
  function updateLivePreview() {
    if (!cropper) return;
    var previewCanvas = cropper.getCroppedCanvas();
    if (!previewCanvas) return;
    var filteredCanvas = applyFiltersToCanvas(previewCanvas, filterSettings);
    $("#cropper-live-preview").empty().append(filteredCanvas);
  }

  /**
   * Initializes slider controls for non-destructive editing.
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
   * Applies the given filter settings to a canvas using its 2D context.
   * @returns {HTMLCanvasElement} A new canvas with filters applied.
   */
  function applyFiltersToCanvas(canvas, settings) {
    var newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    var ctx = newCanvas.getContext("2d");
    ctx.filter = "brightness(" + settings.brightness + "%) " +
                 "contrast("  + settings.contrast  + "%) " +
                 "saturate("  + settings.saturation + "%) " +
                 "hue-rotate(" + settings.hue + "deg)";
    ctx.drawImage(canvas, 0, 0);
    return newCanvas;
  }

  /**
   * Removes unwanted inline styles from Cropper’s generated UI to enforce our CSS.
   */
  function sanitizeCropperUI() {
    $(".cropper-crop-box, .cropper-view-box, .cropper-drag-box").each(function(){
      $(this).removeAttr("style").css({
        border: "2px dashed #fff",
        background: "transparent",
        "box-shadow": "none"
      });
    });
  }

  /**
   * Saves the processed image via an AJAX call.
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
