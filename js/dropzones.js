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

    // Handle drop events for all dropzone types.
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

    // Handle file selection via file input.
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

    // In your dropzones.js branch for .dropzone-thumbnail:
		if($dropzone.hasClass("dropzone-thumbnail")){
			console.log("Thumbnail file selected:", files[0]);
			var file = files[0];
			var imageUrl = URL.createObjectURL(file);
			UnifiedImageEditor.openEditor(imageUrl, function(croppedDataUrl) {
				if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
					var html = Sections.renderPolaroid(croppedDataUrl, "thumbnail");
					$(".thumbnail-preview").html(html);
				} else {
					$(".thumbnail-preview").html('<img src="'+croppedDataUrl+'" alt="Thumbnail">');
				}
				// Store croppedDataUrl in a hidden field (create one if not already present)
				if($(".thumbnail-preview").siblings("input[name='thumbnail_cropped_data']").length === 0){
					$(".thumbnail-preview").after('<input type="hidden" name="thumbnail_cropped_data" value="'+encodeURIComponent(croppedDataUrl)+'">');
				} else {
					$(".thumbnail-preview").siblings("input[name='thumbnail_cropped_data']").val(encodeURIComponent(croppedDataUrl));
				}
				$dropzone.hide();
			});
		}
		
    // Gallery dropzone (multiple files)
    else if($dropzone.hasClass("dropzone-gallery")){
      console.log("Gallery files selected:", files);
      var filesArr = Array.from(files);
      filesArr.forEach(function(file){
        if(!file.type.startsWith("image/")) return;
        var imageUrl = URL.createObjectURL(file);
        UnifiedImageEditor.openEditor(imageUrl, function(croppedDataUrl) {
          var $galleryContainer = $dropzone.siblings(".gallery-container");
          if($galleryContainer.length > 0){
            if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
              var polaroidHTML = Sections.renderPolaroid(croppedDataUrl, "gallery");
              $galleryContainer.append(polaroidHTML);
            } else {
              $galleryContainer.append('<img src="'+croppedDataUrl+'" alt="Gallery Image" style="max-width:100%; max-height:100%;">');
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
        });
      });
    }
    // Image section dropzone (single file for inline image insertion)
    else if($dropzone.hasClass("dropzone-image")){
			console.log("Image file selected:", files[0]);
			var file = files[0];
			var imageUrl = URL.createObjectURL(file);
			UnifiedImageEditor.openEditor(imageUrl, function(croppedDataUrl) {
				var $imgPreview = $dropzone.siblings(".image-preview-container");
				if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
					var html = Sections.renderPolaroid(croppedDataUrl, "image");
					$imgPreview.html(html);
				} else {
					$imgPreview.html('<img src="'+croppedDataUrl+'" alt="Section Image" style="max-width:100%; max-height:100%;">');
				}
				// Update or create the hidden input for the cropped image data within this section.
				var $section = $dropzone.closest(".modular-section");
				if($section.find("input[name='cropped_image_data[]']").length === 0){
					$section.append('<input type="hidden" name="cropped_image_data[]" value="'+ encodeURIComponent(croppedDataUrl) +'">');
				} else {
					$section.find("input[name='cropped_image_data[]']").val(encodeURIComponent(croppedDataUrl));
				}
				$dropzone.hide();
			});
		}
    // Staging area dropzone (multiple files)
    else if($dropzone.hasClass("dropzone-staging")){
      console.log("Staging area files selected:", files);
      var filesArr = Array.from(files);
      filesArr.forEach(function(file){
        if(!file.type.startsWith("image/")) return;
        var imageUrl = URL.createObjectURL(file);
        UnifiedImageEditor.openEditor(imageUrl, function(croppedDataUrl) {
          var html = Sections.renderPolaroid(croppedDataUrl, "staging");
          $("#staging-media").append(html);
          // Trigger autosave so that the state is captured.
          $("#article-form").trigger("input");
        });
      });
    }
    // Global media library dropzone (multiple files)
    else if($dropzone.hasClass("dropzone-global-media")){
      console.log("Global media files selected:", files);
      var filesArr = Array.from(files);
      filesArr.forEach(function(file){
        if(!file.type.startsWith("image/")) return;
        var imageUrl = URL.createObjectURL(file);
        UnifiedImageEditor.openEditor(imageUrl, function(croppedDataUrl) {
          var html = Sections.renderPolaroid(croppedDataUrl, "global");
          $("#global-media").append(html);
          // Optionally, trigger additional actions such as reloading the media library.
        });
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
        $(".dropzone.dropzone-thumbnail").show();
      } else if ($container.hasClass("image-preview-container")) {
        $(".dropzone.dropzone-image").show();
      }
    }
  });
});
