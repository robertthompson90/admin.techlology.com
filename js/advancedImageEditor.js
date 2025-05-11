// js/advancedImageEditor.js

var AdvancedImageEditor = (function(){
  var cropper = null;
  var $modal = $("#cropper-modal");
  var $image = $("#cropper-image");
  var filterSettings = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0
  };

  // Opens the full-screen editor with an image URL.
  // The callback receives two parameters: the new image data URL and a generated mediaId.
  function openEditor(imageUrl, callback, mode) {
    $modal.fadeIn(300);
    $image.attr("src", imageUrl);
    $image.one("load", function(){
      if(cropper) cropper.destroy();
      cropper = new Cropper($image[0], {
        aspectRatio: NaN,
        viewMode: 1,
        autoCropArea: 1,
        ready: function(){
          updateLivePreview();
        },
        crop: function(){
          updateLivePreview();
        }
      });
      initFilterControls();
    });
    
    // When "Save New Image" is clicked.
    $("#cropper-save-new-image").off("click").on("click", function(){
      if (!cropper) return;
      var baseCanvas = cropper.getCroppedCanvas();
      var filteredCanvas = applyFiltersToCanvas(baseCanvas, filterSettings);
      var newImageData = filteredCanvas.toDataURL();
      
      // Simulate media ID generation. In a real system this might come from your server.
      var generatedMediaId = "media_" + new Date().getTime();
      
      // Call the callback with new image data URL and mediaId.
      if (typeof callback === "function") {
        callback(newImageData, generatedMediaId);
      }
      
      // Optionally, send the new image to the server for duplicate detection, multiple size generation, etc.
      saveNewImage(newImageData);
      closeEditor();
    });
    
    $("#cropper-cancel-button").off("click").on("click", function(){
      closeEditor();
    });
  }
  
  function closeEditor() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    $modal.fadeOut(200);
    $image.attr("src", "");
    $("#cropper-live-preview").empty();
  }
  
  function updateLivePreview() {
    if (!cropper) return;
    var previewCanvas = cropper.getCroppedCanvas();
    var filteredCanvas = applyFiltersToCanvas(previewCanvas, filterSettings);
    $("#cropper-live-preview").empty().append(filteredCanvas);
  }
  
  function initFilterControls() {
    $("#brightness-slider").off("input").on("input", function(){
      filterSettings.brightness = parseInt($(this).val());
      updateLivePreview();
    });
    $("#contrast-slider").off("input").on("input", function(){
      filterSettings.contrast = parseInt($(this).val());
      updateLivePreview();
    });
    $("#saturation-slider").off("input").on("input", function(){
      filterSettings.saturation = parseInt($(this).val());
      updateLivePreview();
    });
    $("#hue-slider").off("input").on("input", function(){
      filterSettings.hue = parseInt($(this).val());
      updateLivePreview();
    });
  }
  
  function applyFiltersToCanvas(canvas, settings) {
    var newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    var ctx = newCanvas.getContext("2d");
    ctx.filter = "brightness(" + settings.brightness + "%) contrast(" + settings.contrast + "%) saturate(" + settings.saturation + "%) hue-rotate(" + settings.hue + "deg)";
    ctx.drawImage(canvas, 0, 0);
    return newCanvas;
  }
  
  // Sends the new image data to the server (endpoint handles duplicate detection and size generation).
  function saveNewImage(dataUrl) {
    $.ajax({
      url: "ajax/saveNewImage.php",
      type: "POST",
      data: { image: dataUrl },
      dataType: "json",
      success: function(response) {
        if (response.success) {
          Notifications.show("New image saved successfully", "success");
          MediaLibrary.loadMedia(); // Refresh the media library.
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
    init: function(){ /* Additional initialization if needed */ }
  };
})();
