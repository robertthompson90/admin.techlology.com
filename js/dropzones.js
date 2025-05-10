var Dropzones = (function(){
  function init(){
    console.log("Dropzones initialized");

    $(document).on("dragenter dragover", ".dropzone", function(e){
      e.preventDefault();
      e.stopPropagation();
      $(this).addClass("dragover");
    });

    $(document).on("dragleave", ".dropzone", function(e){
      e.preventDefault();
      e.stopPropagation();
      $(this).removeClass("dragover");
    });

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

    $(document).on("click", ".dropzone", function(e){
      if(!$(e.target).is("input[type='file']")){
        $(this).find("input[type='file']").trigger("click");
      }
    });

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

    // Thumbnail (single file).
    if($dropzone.hasClass("dropzone-thumbnail")){
      console.log("Thumbnail file selected:", files[0]);
      ImageEditor.showCropper([files[0]], function(croppedDataArray){
        if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
          var html = Sections.renderPolaroid(croppedDataArray[0], "thumbnail");
          $(".thumbnail-preview").html(html);
        } else {
          $(".thumbnail-preview").html('<img src="'+croppedDataArray[0]+'" alt="Thumbnail">');
        }
        $dropzone.hide();
      });
    }
    // Gallery (multiple files).
    else if($dropzone.hasClass("dropzone-gallery")){
      console.log("Gallery files selected:", files);
      var filesArr = Array.from(files);
      ImageEditor.showCropper(filesArr,
         // Final callback – do nothing extra; we avoid clearing prior images.
         function(finalCroppedArray){
           $dropzone.find(".add-gallery-image").remove();
         },
         // Progress callback: Append each new cropped image as a polaroid.
         function(progressDataUrl, croppedArray, remaining){
           var $galleryContainer = $dropzone.siblings(".gallery-container");
           if($galleryContainer.length > 0){
             if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
               var polaroidHTML = Sections.renderPolaroid(progressDataUrl, "gallery");
               $galleryContainer.append(polaroidHTML);
             } else {
               $galleryContainer.append('<img src="'+progressDataUrl+'" alt="Gallery Image" style="max-width:100%; max-height:100%;">');
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
    // Image section (single file).
    else if($dropzone.hasClass("dropzone-image")){
      console.log("Image file selected:", files[0]);
      ImageEditor.showCropper([files[0]], function(croppedDataArray){
          var $imgPreview = $dropzone.siblings(".image-preview-container");
          if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
             var html = Sections.renderPolaroid(croppedDataArray[0], "image");
             $imgPreview.html(html);
          } else {
             $imgPreview.html('<img src="'+croppedDataArray[0]+'" alt="Section Image" style="max-width:100%; max-height:100%;">');
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