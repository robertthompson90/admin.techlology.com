var ImageEditor = (function(){
  var cropper = null;
  var galleryFiles = [];
  var currentGalleryIndex = 0;
  var galleryCroppedImages = []; // Stores the cropped images for the gallery
  var processing = false;        // Prevent duplicate Crop clicks

  // Returns a Promise that resolves with the file read as a Data URL.
  function readFileAsDataURL(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.onerror = function(err) {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  }

  // Updates the gallery counter display.
  // If there is only one image, the counter is hidden.
  function updateGalleryCounter(){
    if(galleryFiles.length > 1) {
      $("#gallery-counter").text("Image " + (currentGalleryIndex + 1) + " of " + galleryFiles.length).show();
    } else {
      $("#gallery-counter").hide();
    }
  }

  // Loads the current gallery image into the cropper.
  // The image remains hidden until Cropper is fully initialized.
  function loadGalleryImage(callback) {
    $("#cropper-image").hide();
    readFileAsDataURL(galleryFiles[currentGalleryIndex])
      .then(function(dataURL) {
         $("#cropper-image").attr("src", dataURL);
         updateGalleryCounter();
         // Show or hide navigation controls
         if(galleryFiles.length > 1){
           $("#gallery-nav").show();
           $("#prev-image-btn, #next-image-btn").show();
         } else {
           $("#gallery-nav").hide();
         }
         // Initialize Cropper only after the image loads.
         $("#cropper-image").one("load", function(){
           if(cropper){ cropper.destroy(); }
           cropper = new Cropper(this, {
              aspectRatio: NaN,
              viewMode: 1,
              autoCropArea: 1.0,
              responsive: true,
              wheelZoom: false,
              ready: function(){
                fitImage();
                updateLivePreview();
                // *** Default aspect selection: mark freeform as active ***
                $(".aspect-btn").removeClass("active");
                $(".aspect-btn[data-ratio='NaN']").addClass("active");
                if(callback){ callback(); }
              },
              crop: updateLivePreview
           });
         }).each(function(){
           if(this.complete){ $(this).trigger("load"); }
         });
         // Only show the image after Cropper is ready (handled in ready:)
         // $("#cropper-image").show();  <-- not calling here to prevent flicker
      })
      .catch(function(err) {
         console.error("Error loading image: ", err);
      });
  }

  // Initializes the gallery cropper. The arrow buttons now only navigate,
  // while the Crop button saves the crop. The default aspect button is highlighted,
  // and processing is protected against duplicate clicks.
  function showGalleryCropper(files, finalCallback, progressCallback) {
    if (!files || !files.length) { return; }
    galleryFiles = files.slice();  // Copy for manipulation
    currentGalleryIndex = 0;
    galleryCroppedImages = [];
    processing = false;
    $("#cropper-modal").fadeIn(300);
    loadGalleryImage();

    // Arrow navigation (purely for navigation—no auto-saving).
    $("#prev-image-btn").off("click").on("click", function(){
       if(currentGalleryIndex > 0){
         currentGalleryIndex--;
         loadGalleryImage();
       }
    });

    $("#next-image-btn").off("click").on("click", function(){
       if(currentGalleryIndex < galleryFiles.length - 1){
         currentGalleryIndex++;
         loadGalleryImage();
       }
    });

    // Aspect ratio buttons.
    $(".aspect-btn").off("click").on("click", function(){
       var ratio = $(this).data("ratio");
       $(".aspect-btn").removeClass("active");
       $(this).addClass("active");
       cropper.setAspectRatio(ratio === "NaN" ? NaN : eval(ratio));
    });

    // Zoom slider and wheel events.
    $("#zoom-slider").off("input").on("input", function(){
       var zoomVal = parseFloat($(this).val());
       cropper.zoomTo(zoomVal);
    });
    $("#zoom-slider").off("wheel").on("wheel", function(e){
       e.preventDefault();
       adjustZoomByWheel(this, e);
    });
    $("#cropper-area").off("wheel").on("wheel", function(e){
       e.preventDefault();
       var slider = $("#zoom-slider");
       adjustZoomByWheel(slider, e);
    });

    // Separate controls.
    $("#reset-zoom-btn").off("click").on("click", function(){
       if(cropper){ 
          cropper.zoomTo(1);
          $("#zoom-slider").val(1);
       }
    });
    $("#fit-image-btn").off("click").on("click", function(){
       if(cropper){ fitImage(); }
    });

    // Crop button: Save the crop (only triggered once per image).
    $("#cropper-crop-button").off("click").on("click", function(){
       if(cropper && !processing) {
         processing = true;
         var canvas = cropper.getCroppedCanvas();
         if (!canvas) { processing = false; return; }
         var dataUrl = canvas.toDataURL("image/png");
         if(typeof progressCallback === 'function'){
            progressCallback(dataUrl, galleryCroppedImages, galleryFiles.length);
         }
         galleryCroppedImages.push(dataUrl);
         // Remove the current image from the pending list.
         galleryFiles.splice(currentGalleryIndex, 1);
         if(currentGalleryIndex >= galleryFiles.length && galleryFiles.length > 0){
           currentGalleryIndex = galleryFiles.length - 1;
         }
         updateGalleryCounter();
         if(galleryFiles.length > 0) {
           loadGalleryImage(function(){ processing = false; });
         } else {
           closeCropper();
           processing = false;
           if(typeof finalCallback === 'function'){
              finalCallback(galleryCroppedImages);
           }
         }
       }
    });

    $("#cropper-cancel-button").off("click").on("click", function(){
       closeCropper();
    });
  }

  function adjustZoomByWheel(sliderEl, e) {
    var step = 0.05;
    var $slider = $(sliderEl);
    var current = parseFloat($slider.val());
    var min = parseFloat($slider.attr("min"));
    var max = parseFloat($slider.attr("max"));
    if(e.originalEvent.deltaY < 0){
      current = Math.min(current + step, max);
    } else {
      current = Math.max(current - step, min);
    }
    $slider.val(current);
    cropper.zoomTo(current);
  }

  function fitImage() {
    if(cropper){
      cropper.reset();
      var imageData = cropper.getImageData();
      var containerData = cropper.getContainerData();
      var scaleX = containerData.width / imageData.naturalWidth;
      var scaleY = containerData.height / imageData.naturalHeight;
      var scale = Math.min(scaleX, scaleY);
      cropper.zoomTo(scale);
      $("#zoom-slider").val(scale);
    }
  }

  function updateLivePreview() {
    if(cropper){
      var previewCanvas = cropper.getCroppedCanvas({
         width:200,
         height:200,
         fillColor: 'transparent'
      });
      previewCanvas.style.maxWidth = "100%";
      previewCanvas.style.maxHeight = "100%";
      $("#cropper-live-preview").html(previewCanvas);
    }
  }

  function closeCropper() {
    if(cropper) {
      cropper.destroy();
      cropper = null;
    }
    $("#cropper-modal").fadeOut(300);
  }

  return {
    showCropper: showGalleryCropper
  };
})();
