// js/imageEditor.js
var ImageEditor = (function(){
  var cropper = null;
  var $modal = $("#cropper-modal");
  var $image = $("#cropper-image");
  
  // Opens the full-screen media editor with the specified image URL.
  // 'callback' is called with the cropped image data URL when cropping is confirmed.
  function openEditor(imageUrl, callback) {
    // Show the modal with a fade-in effect.
    $modal.fadeIn(300);
    // Set the image source.
    $image.attr("src", imageUrl);
    
    // Wait for the image to load fully before initializing Cropper.
    $image.one("load", function(){
      // Destroy any previous cropper instance.
      if (cropper) {
        cropper.destroy();
      }
      cropper = new Cropper($image[0], {
        // Start with no fixed aspect ratio.
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
    });
    
    // Bind the Crop button to execute the cropping and call the callback.
    $("#cropper-crop-button").off("click").on("click", function(){
      if (cropper) {
        var croppedCanvas = cropper.getCroppedCanvas();
        if (croppedCanvas) {
          var croppedDataUrl = croppedCanvas.toDataURL();
          if (typeof callback === "function") {
            callback(croppedDataUrl);
          }
        }
        closeEditor();
      }
    });
    
    // Bind the Cancel button to close the editor without doing anything.
    $("#cropper-cancel-button").off("click").on("click", function(){
      closeEditor();
    });
  }
  
  // Closes the media editor and cleans up.
  function closeEditor() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    // Hide the modal.
    $modal.fadeOut(200);
    // Reset the image source.
    $image.attr("src", "");
    $("#cropper-live-preview").empty();
  }
  
  // Updates the live preview area with the current cropped image.
  function updateLivePreview() {
    if (!cropper) return;
    var previewCanvas = cropper.getCroppedCanvas({
      width: 200,
      height: 200
    });
    $("#cropper-live-preview").html("");
    $("#cropper-live-preview").append(previewCanvas);
  }
  
  // Bind the control events (aspect ratio, zoom, reset, fit image).
  function initControls() {
    // Aspect ratio buttons.
    $(".aspect-btn").on("click", function() {
      var ratio = $(this).data("ratio");
      // Convert "NaN" string to actual NaN.
      if (ratio === "NaN") {
        ratio = NaN;
      }
      $(".aspect-btn").removeClass("active");
      $(this).addClass("active");
      if (cropper) {
        cropper.setAspectRatio(ratio);
      }
    });
    
    // Zoom slider control.
    $("#zoom-slider").on("input", function() {
      var zoomLevel = parseFloat($(this).val());
      if (cropper) {
        cropper.zoomTo(zoomLevel);
      }
    });
    
    // Reset zoom button.
    $("#reset-zoom-btn").on("click", function() {
      if (cropper) {
        cropper.reset();
      }
    });
    
    // Fit image button – for this implementation, a reset usually refits the image.
    $("#fit-image-btn").on("click", function() {
      if (cropper) {
        cropper.reset();
      }
    });
  }
  
  // Initialize the module – call this on page load.
  function init() {
    initControls();
  }
  
  return {
    init: init,
    openEditor: openEditor,
    closeEditor: closeEditor
  };
})();
