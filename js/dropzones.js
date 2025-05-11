var Dropzones = (function(){
  function init(){
    console.log("Dropzones initialized");

    // Highlight dropzone on dragenter/dragover
    $(document).on("dragenter dragover", ".dropzone", function(e){
      e.preventDefault();
      e.stopPropagation();
      $(this).addClass("dragover");
    });

    // Remove highlight when dragging leaves
    $(document).on("dragleave", ".dropzone", function(e){
      e.preventDefault();
      e.stopPropagation();
      $(this).removeClass("dragover");
    });

    // Handle drop events
    $(document).on("drop", ".dropzone", function(e){
      e.preventDefault();
      e.stopPropagation();
      $(this).removeClass("dragover");
      var files = e.originalEvent.dataTransfer.files;
      console.log("Files dropped:", files);
      if(files.length > 0){
        processFiles(files, $(this));
      }
    });

    // When clicking the dropzone, trigger the file input if the target isn’t the input itself.
    $(document).on("click", ".dropzone", function(e){
      if(!$(e.target).is("input[type='file']")){
        $(this).find("input[type='file']").trigger("click");
      }
    });

    // Handle file selection via file input
    $(document).on("change", ".dropzone input[type='file']", function(e){
      var files = e.target.files;
      console.log("Files selected:", files);
      if(files.length > 0){
        processFiles(files, $(this).closest(".dropzone"));
      }
    });
  }

  // Processes files depending on dropzone type.
  function processFiles(files, $dropzone){
    if(!files || files.length === 0) return;
    console.log("Processing files in dropzone:", $dropzone);

    // Thumbnail dropzone (single file)
    if($dropzone.hasClass("dropzone-thumbnail")){
      console.log("Thumbnail file selected:", files[0]);
      ImageEditor.showCropper([files[0]], function(croppedDataArray){
        var imageData = croppedDataArray[0];
        // Check if the returned data is an object with an `image` property.
        var imageSrc = (typeof imageData === "object" && imageData.image) ? imageData.image : imageData;
        if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
          var html = Sections.renderPolaroid(imageSrc, "thumbnail");
          $(".thumbnail-preview").html(html);
        } else {
          $(".thumbnail-preview").html('<img src="'+imageSrc+'" alt="Thumbnail">');
        }
        $dropzone.hide();
      });
    }
    // Gallery dropzone (multiple files)
    else if($dropzone.hasClass("dropzone-gallery")){
      console.log("Gallery files selected:", files);
      var filesArr = Array.from(files);
      ImageEditor.showCropper(filesArr,
         // Final callback – perform any finalization (here we simply remove any add-gallery image placeholder)
         function(finalCroppedArray){
           $dropzone.find(".add-gallery-image").remove();
         },
         // Progress callback: Append each new cropped image as a polaroid to the gallery container.
         function(progressData, croppedArray, remaining){
           var imageData = progressData;
           var imageSrc = (typeof imageData === "object" && imageData.image) ? imageData.image : imageData;
           var $galleryContainer = $dropzone.siblings(".gallery-container");
           if($galleryContainer.length > 0){
             if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
               var polaroidHTML = Sections.renderPolaroid(imageSrc, "gallery");
               $galleryContainer.append(polaroidHTML);
             } else {
               $galleryContainer.append('<img src="'+imageSrc+'" alt="Gallery Image" style="max-width:100%; max-height:100%;">');
             }
             // Initialize or refresh sortable on this gallery container.
             if(!$galleryContainer.hasClass("ui-sortable")){
               $galleryContainer.sortable({
                 items: ".polaroid",
                 placeholder: "sortable-placeholder"
               });
             } else {
               $galleryContainer.sortable("refresh");
             }
           }
         }
      );
    }
    // Image section dropzone (single file for inline image insertion)
    else if($dropzone.hasClass("dropzone-image")){
      console.log("Image file selected:", files[0]);
      ImageEditor.showCropper([files[0]], function(croppedDataArray){
          var imageData = croppedDataArray[0];
          var imageSrc = (typeof imageData === "object" && imageData.image) ? imageData.image : imageData;
          var $imgPreview = $dropzone.siblings(".image-preview-container");
          if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
             var html = Sections.renderPolaroid(imageSrc, "image");
             $imgPreview.html(html);
          } else {
             $imgPreview.html('<img src="'+imageSrc+'" alt="Section Image" style="max-width:100%; max-height:100%;">');
          }
          $dropzone.hide();
      });
    }
  }

  return {
    init: init
  };
})();

$(document).ready(function(){
  Dropzones.init();
});

// Re-show dropzone when its preview container is empty
$(document).on("click", ".polaroid .remove-photo", function(e) {
  e.preventDefault();
  var $polaroid = $(this).closest(".polaroid");
  // Determine which container the polaroid is in:
  var $container = $polaroid.closest(".thumbnail-preview, .image-preview-container");
  $polaroid.fadeOut(300, function() {
    $(this).remove();
    // If the container is empty, re-show the corresponding dropzone.
    if ($container.children().length === 0) {
      if ($container.hasClass("thumbnail-preview")) {
        // Show thumbnail dropzone.
        $(".dropzone.dropzone-thumbnail").show();
      } else if ($container.hasClass("image-preview-container")) {
        // Show image section dropzone.
        $(".dropzone.dropzone-image").show();
      }
    }
  });
});
