// js/dropzones.js
// Version 2.2.5 - Handles Pasted URLs & Filename Extraction for prefilling titles.
// Handles general dropzones, specific Media Library page dropzone, and paste-to-upload for images and image URLs.

var Dropzones = (function($){

  function init(){
    console.log("[Dropzones] Initializing - v2.2.5 (Pasted URLs & Filename Extraction)");

    // --- Generic handlers for .dropzone:not(.medialibrary-dropzone) ---
    // (These remain functionally the same as v2.2.3)
    $(document).on("dragenter dragover", ".dropzone:not(.medialibrary-dropzone)", function(e){ e.preventDefault(); e.stopPropagation(); $(this).addClass("dragover"); });
    $(document).on("dragleave", ".dropzone:not(.medialibrary-dropzone)", function(e){ e.preventDefault(); e.stopPropagation(); $(this).removeClass("dragover"); });
    $(document).on("drop", ".dropzone:not(.medialibrary-dropzone)", function(e){ e.preventDefault(); e.stopPropagation(); $(this).removeClass("dragover"); var files = e.originalEvent.dataTransfer.files; if(files.length > 0){ processFilesForGenericDropzones(files, $(this)); } });
    $(document).on("click", ".dropzone:not(.medialibrary-dropzone)", function(e){ if(!$(e.target).is("input[type='file'], button, a")){ $(this).find("input[type='file'].hidden-file-input").first().trigger("click"); } });
    $(document).on("change", ".dropzone:not(.medialibrary-dropzone) input[type='file'].hidden-file-input", function(e){ var files = e.target.files; if(files.length > 0){ processFilesForGenericDropzones(files, $(this).closest(".dropzone")); } });

    // --- Specific handlers for Drag & Drop on .medialibrary-dropzone ---
    // (These remain functionally the same as v2.2.3)
    $(document).on("dragenter", ".medialibrary-dropzone", function(e) { e.preventDefault(); e.stopPropagation(); if ($(e.target).closest('input, select, button, .uie-container, .cropper-modal, .media-filters, #global-media .global-media-item').length > 0) { $(this).removeClass("dragover-main"); return; } $(this).addClass("dragover-main"); });
    $(document).on("dragover", ".medialibrary-dropzone", function(e) { e.preventDefault(); e.stopPropagation(); if ($(e.target).closest('input, select, button, .uie-container, .cropper-modal, .media-filters, #global-media .global-media-item').length > 0) { $(this).removeClass("dragover-main"); e.originalEvent.dataTransfer.dropEffect = 'none'; } else { $(this).addClass("dragover-main"); e.originalEvent.dataTransfer.dropEffect = 'copy'; } });
    $(document).on("dragleave", ".medialibrary-dropzone", function(e){ e.preventDefault(); e.stopPropagation(); if (!e.originalEvent.relatedTarget || !$.contains(this, e.originalEvent.relatedTarget)) { $(this).removeClass("dragover-main"); } });
    $(document).on("drop", ".medialibrary-dropzone", function(e){ e.preventDefault(); e.stopPropagation(); $(this).removeClass("dragover-main"); if ($(e.target).closest('input, select, button, .uie-container, .cropper-modal, .media-filters, #global-media .global-media-item').length > 0) { console.log("[Dropzones] Drop on interactive element, ignoring."); return; } var files = e.originalEvent.dataTransfer.files; console.log("[Dropzones] Files dropped on .medialibrary-dropzone:", files); handleUploadables(Array.from(files), e); });

    // --- PASTE Event Handler on document (for .medialibrary-dropzone context) ---
    console.log("[Dropzones] Binding PASTE event listener to document (for .medialibrary-dropzone context).");
    $(document).on('paste', function(e) {
        var $medialibraryDropzone = $('.medialibrary-dropzone');
        if (!$medialibraryDropzone.length || !$medialibraryDropzone.is(':visible')) { return; }

        const isInputFocused = $(e.target).is('input, textarea, [contenteditable="true"]');
        const isUieOpen = $('.uie-container:not(.hidden)').length > 0;
        const isCropperModalActive = $('.cropper-modal.active').length > 0;

        if (isInputFocused || isUieOpen || isCropperModalActive) {
            console.log(`[Dropzones] Paste event IGNORED. InputFocused: ${isInputFocused}, UIEOpen: ${isUieOpen}, CropperModalActive: ${isCropperModalActive}. Target was:`, e.target);
            return;
        }
        console.log("[Dropzones] Paste event PROCEEDING. Original Target:", e.target);

        const clipboardData = (e.originalEvent || e).clipboardData;
        if (!clipboardData) { console.log("[Dropzones] No clipboardData."); return; }

        let itemsToProcess = [];
        let plainTextContent = null;

        // Check for files first (e.g., screenshot data)
        if (clipboardData.files && clipboardData.files.length > 0) {
            console.log("[Dropzones] Found files in clipboardData.files:", clipboardData.files);
            for (let i = 0; i < clipboardData.files.length; i++) {
                if (clipboardData.files[i].type.startsWith("image/")) {
                    const file = clipboardData.files[i];
                    // Create a more descriptive default filename for pasted image data
                    const timestamp = Date.now();
                    const extension = file.type.split('/')[1] || 'png';
                    const descriptiveFilename = `clipboard_image_${timestamp}.${extension}`;
                    // Create a new File object with the new name if supported, otherwise use original
                    try {
                        itemsToProcess.push(new File([file], descriptiveFilename, {type: file.type}));
                    } catch (ex) { // Fallback for older browsers that don't support File constructor well
                        itemsToProcess.push(file);
                    }
                    console.log("[Dropzones] Added image File from clipboardData.files:", itemsToProcess[itemsToProcess.length-1]);
                }
            }
        }

        // If no files directly found, check clipboardData.items (more comprehensive)
        if (itemsToProcess.length === 0 && clipboardData.items && clipboardData.items.length > 0) {
            console.log("[Dropzones] Checking clipboardData.items:", clipboardData.items);
            for (let i = 0; i < clipboardData.items.length; i++) {
                const item = clipboardData.items[i];
                console.log(`[Dropzones] Clipboard item [${i}]: type = ${item.type}, kind = ${item.kind}`);
                if (item.kind === 'file' && item.type.indexOf("image") !== -1) {
                    const blob = item.getAsFile();
                    if (blob) {
                        const timestamp = Date.now();
                        const extension = blob.type.split('/')[1] || 'png';
                        const filename = `pasted_image_item_${timestamp}.${extension}`;
                        itemsToProcess.push(new File([blob], filename, { type: blob.type }));
                        console.log("[Dropzones] Added image File from clipboardData.items:", itemsToProcess[itemsToProcess.length-1]);
                    }
                } else if (item.kind === 'string' && item.type === 'text/plain') {
                    // Asynchronously get string content. We'll process it after the loop.
                    // For simplicity, we'll handle one text item (likely the URL).
                    // If multiple text items are pasted, only the first one that's a URL will be processed.
                    if (plainTextContent === null) { // Only grab the first plain text item
                        try {
                           plainTextContent = clipboardData.getData('text/plain'); // Synchronous way
                           console.log("[Dropzones] Got plain text from clipboard: ", plainTextContent);
                        } catch (err) {
                           console.error("[Dropzones] Error getting plain text from clipboard: ", err);
                        }
                    }
                }
            }
        }
        
        // If image files were found from clipboard.files or clipboard.items, prioritize them
        if (itemsToProcess.length > 0) {
            e.preventDefault();
            Notifications.show(`Pasted ${itemsToProcess.length} image(s) from clipboard data. Processing...`, "info");
            handleUploadables(itemsToProcess, e);
        } else if (plainTextContent) { // No direct image files, but plain text was found
            console.log("[Dropzones] No direct image files, processing plain text: ", plainTextContent);
            try {
                const url = new URL(plainTextContent.trim()); // Check if it's a valid URL
                // Basic check if it *might* be an image URL (can be improved with regex or server-side check)
                // For now, we assume any valid URL pasted might be an image URL for the server to handle.
                // Example: googleusercontent.com/profile/picture/0 doesn't have an extension.
                console.log("[Dropzones] Pasted text is a valid URL:", url.href);
                e.preventDefault();
                Notifications.show(`Pasted URL. Attempting to process as image...`, "info");
                handleUploadables([{ type: 'url', data: url.href, originalEvent: e }], e); // Pass as a special item
            } catch (_) {
                console.log("[Dropzones] Pasted text is not a valid URL or not an image URL pattern.");
                // Not a URL or not an image URL we want to handle, let default paste proceed (or do nothing)
            }
        } else {
            console.log("[Dropzones] No image files or processable URL extracted from paste event.");
        }
    });

  } // End of init

  /**
   * Common handler for items (Files or URL objects) to be uploaded.
   * @param {(File|{type:string, data:string})[]} itemsToUpload - Array of File objects or URL info objects.
   * @param {Event} [originalEvent] - The original drop or paste event.
   */
  function handleUploadables(itemsToUpload, originalEvent) {
      if (!itemsToUpload || itemsToUpload.length === 0) return;
      const eventType = originalEvent ? originalEvent.type : 'unknown_source';
      console.log(`[Dropzones] handleUploadables received ${itemsToUpload.length} items from ${eventType} event.`);

      if (typeof MediaUpload !== 'undefined' && MediaUpload.processSingleFileForDrop && MediaUpload.processMultipleFilesForDrop && MediaUpload.processPastedUrl) {

        if (itemsToUpload.length === 1) {
          const item = itemsToUpload[0];
          if (item.type === 'url' && item.data) { // Handle pasted URL
            Notifications.show(`Processing pasted URL...`, "info");
            MediaUpload.processPastedUrl(item.data, function(uploadResponse) {
              // Callback from MediaUpload.processPastedUrl
              if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.media.id && uploadResponse.media.image_url && !uploadResponse.was_duplicate_accepted) {
                UnifiedImageEditor.openEditor(
                    uploadResponse.media.image_url, uploadResponse.media,
                    () => { refreshLibraryWithFilters(); },
                    () => { /* UIE closed */ }
                );
              } else if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.was_duplicate_accepted) {
                 Notifications.show(`Pasted URL resolved to existing image (ID: ${uploadResponse.media.id}). Library refreshed.`, "info");
                 refreshLibraryWithFilters();
              } else if (uploadResponse && !uploadResponse.success) {
                Notifications.show(`Failed to process pasted URL: ` + (uploadResponse.error || "Unknown error"), "error");
                 refreshLibraryWithFilters();
              }
            });
          } else if (item instanceof File) { // Handle single File
            Notifications.show(`Processing 1 ${eventType === 'paste' ? 'pasted' : 'dropped'} image...`, "info");
            MediaUpload.processSingleFileForDrop(item, function(uploadResponse) {
              if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.media.id && uploadResponse.media.image_url && !uploadResponse.was_duplicate_accepted) {
                refreshLibraryWithFilters(); // Refresh BEFORE UIE for new uploads
                UnifiedImageEditor.openEditor(
                    uploadResponse.media.image_url, uploadResponse.media,
                    () => { refreshLibraryWithFilters(); },
                    () => { /* UIE closed */ }
                );
              } else if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.was_duplicate_accepted) {
                 Notifications.show(`${eventType === 'paste' ? 'Pasted' : 'Dropped'} image already exists (ID: ${uploadResponse.media.id}). Library refreshed.`, "info");
                 refreshLibraryWithFilters();
              } else if (uploadResponse && !uploadResponse.success) {
                Notifications.show(`Failed to process ${eventType === 'paste' ? 'pasted' : 'dropped'} image: ` + (uploadResponse.error || "Unknown error"), "error");
                 refreshLibraryWithFilters();
              }
            });
          }
        } else { // Multiple items (currently assumes all are Files)
          const filesToUpload = itemsToUpload.filter(item => item instanceof File);
          if (filesToUpload.length > 0) {
            Notifications.show(`Processing ${filesToUpload.length} ${eventType === 'paste' ? 'pasted' : 'dropped'} images...`, "info");
            MediaUpload.processMultipleFilesForDrop(filesToUpload, function(summary) {
              Notifications.show(`${summary.success} of ${summary.total} images processed. ${summary.errors} errors. Library refreshed.`, "info");
              // refresh is handled by processMultipleFilesForDrop
            });
          } else {
             Notifications.show("No files to process from multiple items.", "info");
          }
        }
      } else {
        Notifications.show("Error: Upload processing module (MediaUpload) or required functions not available.", "error");
      }
  }

  /** Helper to refresh media library with current filters */
  function refreshLibraryWithFilters() {
    if (typeof MediaLibrary !== 'undefined' && MediaLibrary.loadMedia) {
        const query = $('#media-search-input').val() || "";
        const tagFilter = $('#media-tag-filter').val() || "";
        const showVariants = $('#media-show-variants').is(':checked') || false;
        MediaLibrary.loadMedia(query, tagFilter, showVariants);
    }
  }

  /**
   * Processes files for specific, non-MediaLibrary dropzones (e.g., thumbnail dropzone).
   */
  function processFilesForGenericDropzones(files, $dropzone){
    if(!files || files.length === 0) return;
    console.log("[Dropzones] processFilesForGenericDropzones called for:", $dropzone.attr('class'), "Files:", files);
		if($dropzone.hasClass("dropzone-thumbnail")){
			var file = files[0];
      if (!file.type.startsWith("image/")) { Notifications.show("Please drop an image file for the thumbnail.", "warning"); return; }
			var imageUrl = URL.createObjectURL(file);
			UnifiedImageEditor.openEditor(imageUrl, { id: 'temp-thumbnail', image_url: imageUrl, admin_title: file.name.replace(/\.[^/.]+$/, "") }, function(croppedDataUrl) {
				if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
					var html = Sections.renderPolaroid(croppedDataUrl, "thumbnail");
					$dropzone.siblings(".thumbnail-preview").html(html);
				} else {
					$dropzone.siblings(".thumbnail-preview").html('<img src="'+croppedDataUrl+'" alt="Thumbnail Preview">');
				}
        let $hiddenInput = $dropzone.siblings("input[name='thumbnail_cropped_data']");
				if($hiddenInput.length === 0){ $dropzone.after('<input type="hidden" name="thumbnail_cropped_data" value="'+encodeURIComponent(croppedDataUrl)+'">'); }
        else { $hiddenInput.val(encodeURIComponent(croppedDataUrl)); }
				$dropzone.hide();
			});
		}
    else if($dropzone.hasClass("dropzone-gallery")){
      var filesArr = Array.from(files);
      filesArr.forEach(function(file){
        if(!file.type.startsWith("image/")) return;
        var imageUrl = URL.createObjectURL(file);
        UnifiedImageEditor.openEditor(imageUrl, {id: `temp-gallery-${Date.now()}`, image_url: imageUrl, admin_title: file.name.replace(/\.[^/.]+$/, "")}, function(croppedDataUrl) {
          var $galleryContainer = $dropzone.siblings(".gallery-container");
          if($galleryContainer.length > 0){
            if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
              var polaroidHTML = Sections.renderPolaroid(croppedDataUrl, "gallery");
              $galleryContainer.append(polaroidHTML);
            } else {
              $galleryContainer.append('<img src="'+croppedDataUrl+'" alt="Gallery Image" style="max-width:100px; max-height:100px; margin:5px;">');
            }
            if(!$galleryContainer.hasClass("ui-sortable")){ $galleryContainer.sortable({ items: ".polaroid", placeholder: "sortable-placeholder" }); }
            else { $galleryContainer.sortable("refresh"); }
          }
        });
      });
    }
    else if($dropzone.hasClass("dropzone-image")){
			var file = files[0];
      if (!file.type.startsWith("image/")) { Notifications.show("Please drop an image file.", "warning"); return; }
			var imageUrl = URL.createObjectURL(file);
			UnifiedImageEditor.openEditor(imageUrl, {id: `temp-section-${Date.now()}`, image_url: imageUrl, admin_title: file.name.replace(/\.[^/.]+$/, "")}, function(croppedDataUrl) {
				var $imgPreviewContainer = $dropzone.siblings(".image-preview-container");
				if(typeof Sections !== 'undefined' && typeof Sections.renderPolaroid === 'function'){
					var html = Sections.renderPolaroid(croppedDataUrl, "image");
					$imgPreviewContainer.html(html);
				} else {
					$imgPreviewContainer.html('<img src="'+croppedDataUrl+'" alt="Section Image" style="max-width:100%;">');
				}
				var $section = $dropzone.closest(".modular-section");
        let $hiddenInput = $section.find("input[name='cropped_image_data[]']");
				if($hiddenInput.length === 0){ $section.append('<input type="hidden" name="cropped_image_data[]" value="'+ encodeURIComponent(croppedDataUrl) +'">'); }
        else { $hiddenInput.val(encodeURIComponent(croppedDataUrl)); }
				$dropzone.hide();
			});
		}
  }

  return {
    init: init
  };
})(jQuery);

$(document).on("click", ".polaroid .remove-photo", function(e) {
  e.preventDefault();
  var $polaroid = $(this).closest(".polaroid");
  if ($polaroid.closest('#global-media').length > 0) { return; }
  var $container = $polaroid.closest(".thumbnail-preview, .image-preview-container, .gallery-container");
  var $parentDropzone = $container.siblings(".dropzone:not(.medialibrary-dropzone)");
  if ($container.hasClass("gallery-container")) { $polaroid.fadeOut(300, function() { $(this).remove(); }); $container.closest('form').trigger('input'); return; }
  if ($parentDropzone.length) { $polaroid.fadeOut(300, function() { $(this).remove(); if ($container.children().length === 0) { $parentDropzone.show(); $parentDropzone.siblings("input[name='thumbnail_cropped_data'], input[name*='cropped_image_data']").val(''); } $parentDropzone.closest('form').trigger('input'); }); }
});
