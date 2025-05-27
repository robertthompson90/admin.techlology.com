// js/dropzones.js
// Version 2.2.5 - Integrated drag-and-drop and paste for Image Section dropzones on addarticle.php.
// Handles general dropzones, specific Media Library page dropzone, and paste-to-upload.

var Dropzones = (function($){

  function init(){
    console.log("[Dropzones] Initializing - v2.2.5 (Image Section Drop/Paste)");

    // --- Generic handlers for .dropzone:not(.medialibrary-dropzone):not(.section-specific-dropzone) ---
    // These are for truly generic/other dropzones if any exist that aren't section-specific or the main library.
    // For now, we assume .dropzone-thumbnail will be handled by processFilesForGenericDropzones.
    // The section-specific dropzones will have more targeted handlers.

    $(document).on("dragenter dragover", ".dropzone:not(.medialibrary-dropzone):not(.section-specific-dropzone)", function(e){
      e.preventDefault();
      e.stopPropagation();
      $(this).addClass("dragover");
    });
    $(document).on("dragleave", ".dropzone:not(.medialibrary-dropzone):not(.section-specific-dropzone)", function(e){
      e.preventDefault();
      e.stopPropagation();
      $(this).removeClass("dragover");
    });
    $(document).on("drop", ".dropzone:not(.medialibrary-dropzone):not(.section-specific-dropzone)", function(e){
      e.preventDefault();
      e.stopPropagation();
      $(this).removeClass("dragover");
      var files = e.originalEvent.dataTransfer.files;
      console.log("[Dropzones] Files dropped on a very generic .dropzone:", files, "Target:", $(this).attr('class'));
      if(files.length > 0){
        // This might need a more specific handler if such dropzones exist and have unique needs
        processFilesForGenericDropzones(files, $(this), e);
      }
    });
    $(document).on("click", ".dropzone:not(.medialibrary-dropzone):not(.section-specific-dropzone)", function(e){
      if(!$(e.target).is("input[type='file'], button, a")){
        $(this).find("input[type='file'].hidden-file-input").first().trigger("click");
      }
    });
    $(document).on("change", ".dropzone:not(.medialibrary-dropzone):not(.section-specific-dropzone) input[type='file'].hidden-file-input", function(e){
      var files = e.target.files;
      if(files.length > 0){
        processFilesForGenericDropzones(files, $(this).closest(".dropzone"), e);
      }
    });


    // --- Handlers for SECTION-SPECIFIC Dropzones on addarticle.php ---
    // These are .dropzone.section-specific-dropzone (e.g., within Image or Gallery sections)
    $('#sections-container').on("dragenter dragover", ".section-specific-dropzone", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass("dragover"); // Use a generic 'dragover' or a section-specific one
        e.originalEvent.dataTransfer.dropEffect = 'copy';
    });
    $('#sections-container').on("dragleave", ".section-specific-dropzone", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("dragover");
    });
    $('#sections-container').on("drop", ".section-specific-dropzone", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass("dragover");
        var files = e.originalEvent.dataTransfer.files;
        var $sectionDiv = $(this).closest('.modular-section');
        var sectionInstanceId = $sectionDiv.data('section-instance-id');

        console.log(`[Dropzones] Files dropped on section-specific-dropzone for section: ${sectionInstanceId}`, files);
        if (files.length > 0 && sectionInstanceId) {
            // Determine if it's an image section or gallery section dropzone
            if ($(this).hasClass('dropzone-image')) { // For single image sections
                handleUploadablesForSection([files[0]], sectionInstanceId, $sectionDiv, 'sectionImage', e);
            } else if ($(this).hasClass('dropzone-gallery')) { // For gallery sections
                handleUploadablesForSection(Array.from(files), sectionInstanceId, $sectionDiv, 'galleryImageAddition', e);
            }
        }
    });

    // Paste handler for section-specific dropzones
    $('#sections-container').on('paste', '.section-specific-dropzone', function(e) {
        var $dropzone = $(this);
        var $sectionDiv = $dropzone.closest('.modular-section');
        var sectionInstanceId = $sectionDiv.data('section-instance-id');

        console.log(`[Dropzones] PASTE event on section-specific-dropzone for section: ${sectionInstanceId}. Target:`, e.target);

        // Basic check to avoid pasting into inputs within the dropzone, if any.
        if ($(e.target).is('input, textarea, [contenteditable="true"]')) {
            return; // Allow default paste
        }

        const clipboardData = (e.originalEvent || e).clipboardData;
        if (!clipboardData) { return; }

        let itemsToProcess = [];
        let plainTextContent = null;

        // Prioritize files from clipboard
        if (clipboardData.files && clipboardData.files.length > 0) {
            for (let i = 0; i < clipboardData.files.length; i++) {
                if (clipboardData.files[i].type.startsWith("image/")) {
                    const file = clipboardData.files[i];
                    const timestamp = Date.now(); const extension = file.type.split('/')[1] || 'png';
                    const descriptiveFilename = `pasted_section_image_${timestamp}.${extension}`;
                    try { itemsToProcess.push(new File([file], descriptiveFilename, {type: file.type})); }
                    catch (ex) { itemsToProcess.push(file); }
                }
            }
        }
        // Fallback to clipboardData.items if no files found directly
        if (itemsToProcess.length === 0 && clipboardData.items && clipboardData.items.length > 0) {
            for (let i = 0; i < clipboardData.items.length; i++) {
                const item = clipboardData.items[i];
                if (item.kind === 'file' && item.type.indexOf("image") !== -1) {
                    const blob = item.getAsFile();
                    if (blob) {
                        const timestamp = Date.now(); const extension = blob.type.split('/')[1] || 'png';
                        const filename = `pasted_section_item_${timestamp}.${extension}`;
                        itemsToProcess.push(new File([blob], filename, { type: blob.type }));
                    }
                } else if (item.kind === 'string' && item.type === 'text/plain' && plainTextContent === null) {
                    plainTextContent = clipboardData.getData('text/plain');
                }
            }
        }

        if (itemsToProcess.length > 0) { // Image data found
            e.preventDefault();
            Notifications.show(`Pasted ${itemsToProcess.length} image(s) into section. Processing...`, "info");
            if ($dropzone.hasClass('dropzone-image')) {
                handleUploadablesForSection([itemsToProcess[0]], sectionInstanceId, $sectionDiv, 'sectionImage', e);
            } else if ($dropzone.hasClass('dropzone-gallery')) {
                handleUploadablesForSection(itemsToProcess, sectionInstanceId, $sectionDiv, 'galleryImageAddition', e);
            }
        } else if (plainTextContent) { // URL potentially
            try {
                const url = new URL(plainTextContent.trim());
                e.preventDefault();
                Notifications.show(`Pasted URL into section. Attempting to process...`, "info");
                if ($dropzone.hasClass('dropzone-image')) {
                    handleUploadablesForSection([{ type: 'url', data: url.href, originalEvent: e }], sectionInstanceId, $sectionDiv, 'sectionImage', e);
                } else if ($dropzone.hasClass('dropzone-gallery')) {
                     handleUploadablesForSection([{ type: 'url', data: url.href, originalEvent: e }], sectionInstanceId, $sectionDiv, 'galleryImageAddition', e);
                }
            } catch (_) { /* Not a valid URL, do nothing, allow default paste if any */ }
        }
    });



    // --- Handlers for .medialibrary-dropzone (Main page drop/paste) ---
    // (This logic from v2.2.4 remains UNCHANGED)
    $(document).on("dragenter", ".medialibrary-dropzone", function(e) { e.preventDefault(); e.stopPropagation(); if ($(e.target).closest('input, select, button, .uie-container, .cropper-modal, .media-filters, #global-media .global-media-item').length > 0) { $(this).removeClass("dragover-main"); return; } $(this).addClass("dragover-main"); });
    $(document).on("dragover", ".medialibrary-dropzone", function(e) { e.preventDefault(); e.stopPropagation(); if ($(e.target).closest('input, select, button, .uie-container, .cropper-modal, .media-filters, #global-media .global-media-item').length > 0) { $(this).removeClass("dragover-main"); e.originalEvent.dataTransfer.dropEffect = 'none'; } else { $(this).addClass("dragover-main"); e.originalEvent.dataTransfer.dropEffect = 'copy'; } });
    $(document).on("dragleave", ".medialibrary-dropzone", function(e){ e.preventDefault(); e.stopPropagation(); if (!e.originalEvent.relatedTarget || !$.contains(this, e.originalEvent.relatedTarget)) { $(this).removeClass("dragover-main"); } });
    $(document).on("drop", ".medialibrary-dropzone", function(e){ e.preventDefault(); e.stopPropagation(); $(this).removeClass("dragover-main"); if ($(e.target).closest('input, select, button, .uie-container, .cropper-modal, .media-filters, #global-media .global-media-item').length > 0) { console.log("[Dropzones] Drop on interactive element inside .medialibrary-dropzone, ignoring."); return; } var files = e.originalEvent.dataTransfer.files; console.log("[Dropzones] Files dropped on .medialibrary-dropzone:", files); handleDroppedOrPastedFilesForMediaLibrary(files, e); });
    $(document).on('paste', function(e) { // Document-level paste for medialibrary
        var $medialibraryDropzone = $('.medialibrary-dropzone');
        if (!$medialibraryDropzone.length || !$medialibraryDropzone.is(':visible')) { return; }
        const isInputFocused = $(e.target).is('input, textarea, [contenteditable="true"]');
        const isUieOpen = $('.uie-container:not(.hidden)').length > 0;
        const isCropperModalActive = $('.cropper-modal.active').length > 0;
        if (isInputFocused || isUieOpen || isCropperModalActive) { return; }
        const clipboardData = (e.originalEvent || e).clipboardData; if (!clipboardData) { return; }
        let imageFiles = []; let plainTextContent = null;
        if (clipboardData.files && clipboardData.files.length > 0) { /* ... extract files ... */ 
            for (let i = 0; i < clipboardData.files.length; i++) { if (clipboardData.files[i].type.startsWith("image/")) { imageFiles.push(clipboardData.files[i]);}}
        }
        if (imageFiles.length === 0 && clipboardData.items && clipboardData.items.length > 0) { /* ... extract from items ... */
            for (let i = 0; i < clipboardData.items.length; i++) { const item = clipboardData.items[i]; if (item.kind === 'file' && item.type.indexOf("image") !== -1) { const blob = item.getAsFile(); if (blob) { const ts = Date.now(), ext = blob.type.split('/')[1]||'png', fname=`pasted_lib_img_${ts}.${ext}`; imageFiles.push(new File([blob],fname,{type:blob.type}));}} else if (item.kind==='string'&&item.type==='text/plain'&&plainTextContent===null){plainTextContent=clipboardData.getData('text/plain');}}
        }
        if (imageFiles.length > 0) { e.preventDefault(); Notifications.show(`Pasted ${imageFiles.length} image(s). Processing...`, "info"); handleDroppedOrPastedFilesForMediaLibrary(imageFiles, e); }
        else if (plainTextContent) { try { const url = new URL(plainTextContent.trim()); e.preventDefault(); Notifications.show(`Pasted URL. Attempting to process...`, "info"); handleDroppedOrPastedFilesForMediaLibrary([{ type: 'url', data: url.href, originalEvent: e }], e); } catch (_) {} }
    });

  } // End of init

  /**
   * Common handler for files/URLs received for the MAIN MEDIA LIBRARY dropzone.
   */
  function handleDroppedOrPastedFilesForMediaLibrary(itemsToUpload, originalEvent) {
      // This is the existing handleDroppedOrPastedFiles from v2.2.4, renamed for clarity
      // It calls MediaUpload.processSingleFileForDrop or MediaUpload.processMultipleFilesForDrop
      // And then UnifiedImageEditor.openEditor for single new files.
      // (Code from previous version's handleDroppedOrPastedFiles goes here, ensuring it uses MediaUpload correctly)
      if (!itemsToUpload || itemsToUpload.length === 0) return;
      const eventType = originalEvent ? originalEvent.type : 'unknown_source';
      let filesToProcess = [];
      let urlsToProcess = [];

      itemsToUpload.forEach(item => {
          if (item instanceof File && item.type.startsWith("image/")) {
              filesToProcess.push(item);
          } else if (item.type === 'url' && item.data) {
              urlsToProcess.push(item.data);
          }
      });

      if (filesToProcess.length === 0 && urlsToProcess.length === 0) {
          Notifications.show("No processable images or URLs found.", "info");
          return;
      }

      // Handle files first
      if (filesToProcess.length > 0) {
          if (filesToProcess.length === 1 && urlsToProcess.length === 0) { // Single file
              Notifications.show(`Processing 1 ${eventType === 'paste' ? 'pasted' : 'dropped'} image...`, "info");
              MediaUpload.processSingleFileForDrop(filesToProcess[0], function(uploadResponse) {
                  // (Logic copied from previous handleDroppedOrPastedFiles, adapted for MediaLibrary context)
                  if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.media.id && uploadResponse.media.image_url && !uploadResponse.was_duplicate_accepted) {
                      if (typeof MediaLibrary !== 'undefined' && MediaLibrary.loadMedia) MediaLibrary.loadMedia(); // Refresh before UIE
                      UnifiedImageEditor.openEditor(uploadResponse.media.image_url, uploadResponse.media, () => { if (typeof MediaLibrary !== 'undefined') MediaLibrary.loadMedia(); }, () => {});
                  } else if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.was_duplicate_accepted) {
                      Notifications.show(`${eventType === 'paste' ? 'Pasted' : 'Dropped'} image already exists (ID: ${uploadResponse.media.id}). Library refreshed.`, "info");
                      if (typeof MediaLibrary !== 'undefined') MediaLibrary.loadMedia();
                  } else if (uploadResponse && !uploadResponse.success) {
                      Notifications.show(`Failed to process ${eventType === 'paste' ? 'pasted' : 'dropped'} image: ` + (uploadResponse.error || "Unknown error"), "error");
                      if (typeof MediaLibrary !== 'undefined') MediaLibrary.loadMedia();
                  }
              });
          } else { // Multiple files
              Notifications.show(`Processing ${filesToProcess.length} ${eventType === 'paste' ? 'pasted' : 'dropped'} images...`, "info");
              MediaUpload.processMultipleFilesForDrop(filesToProcess, function(summary) {
                  Notifications.show(`${summary.success} of ${summary.total} images processed. ${summary.errors} errors. Library refreshed.`, "info");
                  // MediaLibrary.loadMedia() is called by MediaUpload.processMultipleFilesForDrop
              });
          }
      }

      // Handle URLs (can be processed in parallel or after files)
      if (urlsToProcess.length > 0) {
          urlsToProcess.forEach(url => {
              Notifications.show(`Processing pasted URL: ${url.substring(0,50)}...`, "info");
              MediaUpload.processPastedUrl(url, function(uploadResponse){
                  if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.media.id && uploadResponse.media.image_url && !uploadResponse.was_duplicate_accepted) {
                      if (typeof MediaLibrary !== 'undefined' && MediaLibrary.loadMedia) MediaLibrary.loadMedia(); // Refresh before UIE
                      UnifiedImageEditor.openEditor(uploadResponse.media.image_url, uploadResponse.media, () => { if (typeof MediaLibrary !== 'undefined') MediaLibrary.loadMedia(); }, () => {});
                  } else if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.was_duplicate_accepted) {
                      Notifications.show(`Pasted URL resolved to existing image (ID: ${uploadResponse.media.id}). Library refreshed.`, "info");
                      if (typeof MediaLibrary !== 'undefined') MediaLibrary.loadMedia();
                  } else if (uploadResponse && !uploadResponse.success) {
                      Notifications.show(`Failed to process pasted URL: ` + (uploadResponse.error || "Unknown error"), "error");
                      if (typeof MediaLibrary !== 'undefined') MediaLibrary.loadMedia();
                  }
              });
          });
      }
  }


  /**
   * NEW: Handles files/URLs dropped or pasted onto a SECTION-SPECIFIC dropzone.
   * @param {(File|{type:string, data:string})[]} itemsToUpload - Array of File objects or URL info objects.
   * @param {string} sectionInstanceId - The unique ID of the target section.
   * @param {jQuery} $sectionElement - jQuery object of the target section.
   * @param {string} targetSubtype - e.g., 'sectionImage' or 'galleryImageAddition'.
   * @param {Event} [originalEvent] - The original drop or paste event.
   */
  function handleUploadablesForSection(itemsToUpload, sectionInstanceId, $sectionElement, targetSubtype, originalEvent) {
    if (!itemsToUpload || itemsToUpload.length === 0) return;
    const eventType = originalEvent ? originalEvent.type : 'unknown_source';
    console.log(`[Dropzones] handleUploadablesForSection for ${sectionInstanceId} (${targetSubtype}), items:`, itemsToUpload);

    // Set the global target context for addarticle_interactions.js
    // This mimics what clicking a "Select/Edit Image" button does
    if (typeof window.currentArticleImageTarget !== 'undefined') {
        window.currentArticleImageTarget = {
            type: targetSubtype, // 'sectionImage' or 'galleryImageAddition'
            instanceId: sectionInstanceId,
            $sectionElement: $sectionElement,
            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                // This callback is defined in addarticle_interactions.js for 'sectionImage'
                // For 'galleryImageAddition', a similar callback will be needed.
                console.log(`[Dropzones via Section] updateCallback for ${this.instanceId}. Master:`, finalMasterAsset, "Variant:", finalVariantIfAny);
                let assetIdToStore = null, variantIdToStore = null, previewUrl = 'img/placeholder.png', infoText = 'No image selected.';
                let displayTitleForInfo = 'Untitled';

                if (finalMasterAsset && finalMasterAsset.id) {
                    assetIdToStore = finalMasterAsset.id;
                    displayTitleForInfo = finalMasterAsset.admin_title || finalMasterAsset.title || `Image ${finalMasterAsset.id}`;
                    if (finalVariantIfAny && finalVariantIfAny.id) {
                        variantIdToStore = finalVariantIfAny.id;
                        previewUrl = (finalVariantIfAny.preview_image_url || finalMasterAsset.image_url || 'img/placeholder.png');
                        infoText = `Asset: ${displayTitleForInfo}, Variant: ${finalVariantIfAny.variant_type || `ID ${finalVariantIfAny.id}`}`;
                    } else {
                        previewUrl = (finalMasterAsset.preview_image_url || finalMasterAsset.image_url || 'img/placeholder.png');
                        infoText = `Asset: ${displayTitleForInfo}`;
                    }
                }
                // This part is specific to how an IMAGE SECTION updates its UI.
                // Gallery sections will need different logic here.
                if (this.type === 'sectionImage') {
                    this.$sectionElement.find('.section-asset-id-input').val(assetIdToStore || '');
                    this.$sectionElement.find('.section-variant-id-input').val(variantIdToStore || '');
                    this.$sectionElement.find('.section-image-preview').attr('src', previewUrl).show();
                    this.$sectionElement.find('.section-image-info').text(infoText);
                    this.$sectionElement.find('.btn-remove-section-image').toggle(!!assetIdToStore);
                } else if (this.type === 'galleryImageAddition') {
                    // TODO: Implement logic to add to gallery's JS data model and update gallery preview
                    console.log("TODO: Add to gallery data model for section", this.instanceId, finalMasterAsset, finalVariantIfAny);
                     // Example: Add to a JS array associated with this gallery instance, then re-render that gallery's preview.
                    // This would likely involve a function like addImageToGalleryData(this.instanceId, finalMasterAsset, finalVariantIfAny);
                }
                $('#article-form').trigger('input'); // For autosave
            }
        };
    } else {
        console.error("[Dropzones] window.currentArticleImageTarget not defined. Cannot set context for section upload.");
        return;
    }

    // Process items
    if (itemsToUpload.length === 1) {
        const item = itemsToUpload[0];
        if (item.type === 'url' && item.data) { // Pasted/Dropped URL
            Notifications.show(`Processing URL for section ${sectionInstanceId}...`, "info");
            MediaUpload.processPastedUrl(item.data, function(uploadResponse) {
                if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                    openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget);
                } else {
                    Notifications.show("Failed to process URL for section: " + (uploadResponse.error || "Unknown"), "error");
                    resetArticleImageTargetContext(); // Clear context on failure
                }
            });
        } else if (item instanceof File) { // Single File
            Notifications.show(`Processing 1 image for section ${sectionInstanceId}...`, "info");
            MediaUpload.processSingleFileForDrop(item, function(uploadResponse) {
                if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                    // No immediate library refresh here, UIE callback handles section update
                    openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget);
                } else {
                    Notifications.show("Failed to process image for section: " + (uploadResponse.error || "Unknown"), "error");
                    resetArticleImageTargetContext();
                }
            });
        }
    } else { // Multiple files (assumed for gallery context)
        const filesToProcess = itemsToUpload.filter(item => item instanceof File);
        if (filesToProcess.length > 0 && window.currentArticleImageTarget.type === 'galleryImageAddition') {
            Notifications.show(`Processing ${filesToProcess.length} images for gallery section ${sectionInstanceId}...`, "info");
            // For multiple files to a gallery, we might open UIE for each, or add directly.
            // For now, let's process one by one and open UIE. A batch "add to gallery" UIE mode could be a future enhancement.
            filesToProcess.forEach(file => {
                MediaUpload.processSingleFileForDrop(file, function(uploadResponse) { // Each goes through full process
                    if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                        // The UIE will open for this file, and its callback will use the 'galleryImageAddition' context
                        openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget);
                        // Note: The context remains set for 'galleryImageAddition' until manually reset or UIE closes.
                        // This means each UIE "save" will attempt to add to the same gallery.
                    } else {
                        Notifications.show(`Failed to process one of the gallery images: ${file.name}`, "error");
                    }
                });
            });
            // After all individual UIE sessions (if any), the context might need a final reset.
            // Or, the UIE close handler for the *last* image could reset it.
        } else if (filesToProcess.length > 0) {
            Notifications.show("Multiple files dropped on a single image section. Processing first only.", "warning");
             MediaUpload.processSingleFileForDrop(filesToProcess[0], function(uploadResponse) { /* ... as above ... */ });
        }
    }
  }


  /**
   * Original function for specific, non-MediaLibrary dropzones if any are still used
   * (e.g., a very simple thumbnail uploader on a different page that doesn't use MediaUpload).
   * This is largely legacy if all image handling goes through MediaUpload -> UIE.
   */
  function processFilesForGenericDropzones(files, $dropzone, originalEvent){
    if(!files || files.length === 0) return;
    console.log("[Dropzones] processFilesForGenericDropzones (LEGACY/OTHER) called for:", $dropzone.attr('class'), "Files:", files);

    // This function should now primarily be for dropzones NOT on addarticle.php sections
    // or for a very simplified thumbnail flow if the main addarticle.php thumbnail button is bypassed.
    if($dropzone.hasClass("dropzone-thumbnail")){ // Example: a standalone thumbnail uploader
			var file = files[0];
      if (!file.type.startsWith("image/")) { Notifications.show("Please drop an image file.", "warning"); return; }
			var imageUrl = URL.createObjectURL(file);
      // This UIE call is generic, its callback would need to know what to do with croppedDataUrl
			UnifiedImageEditor.openEditor(imageUrl, { id: 'temp-generic-thumb', image_url: imageUrl, admin_title: file.name.replace(/\.[^/.]+$/, "") }, function(finalMaster, finalVariant) {
        // This callback needs to be context-aware for where this generic dropzone is.
        // For example, updating a specific input field.
        const previewSrc = (finalVariant && finalVariant.preview_image_url) || (finalMaster && finalMaster.preview_image_url) || (finalMaster && finalMaster.image_url);
        if (previewSrc) {
            $dropzone.siblings(".thumbnail-preview").html(`<img src="${previewSrc}" alt="Preview">`);
            // Example: $dropzone.siblings("input[name='some_field']").val(finalMaster.id);
        }
				$dropzone.hide();
			});
		}
    // Add other legacy dropzone handlers here if necessary
  }

  // --- Helper functions from addarticle_interactions.js, now part of Dropzones context ---
  // These are needed if dropzones.js itself calls openUIEForArticleContext directly
  // (which it does via handleUploadablesForSection)

    function openUIEForArticleContext(mediaAsset, targetContextDetails) {
        // This function is now defined in addarticle_interactions.js and is globally accessible
        // via window.openUIEForArticleContext if that's how it's exposed,
        // or it needs to be passed around / made available.
        // For now, assume addarticle_interactions.js handles this.
        if (typeof window.openUIEForArticleContextGlobal === 'function') {
            window.openUIEForArticleContextGlobal(mediaAsset, targetContextDetails);
        } else {
            console.error("[Dropzones] openUIEForArticleContextGlobal is not defined. UIE cannot be opened for section from drop/paste.");
            // Fallback: try to call the updateCallback directly if UIE can't be opened
            // This would mean no editing, just direct use of the uploaded/selected asset.
            if (targetContextDetails && targetContextDetails.updateCallback) {
                Notifications.show("UIE context function not found. Using image as-is.", "warning");
                targetContextDetails.updateCallback(mediaAsset, null); // Assume using master, no variant
            }
             if (typeof resetArticleImageTargetContextGlobal === 'function') { // Ensure context is reset
                resetArticleImageTargetContextGlobal();
            }
        }
    }

    function resetArticleImageTargetContext() {
        if (typeof window.resetArticleImageTargetContextGlobal === 'function') {
            window.resetArticleImageTargetContextGlobal();
        }
    }
  // --- End of helpers ---


  return {
    init: init
  };
})(jQuery);

// Handler for removing polaroids from generic dropzones (for non-medialibrary contexts)
$(document).on("click", ".polaroid .remove-photo", function(e) {
  e.preventDefault();
  var $polaroid = $(this).closest(".polaroid");
  if ($polaroid.closest('#global-media').length > 0) { return; } // Ignore for media library items
  var $container = $polaroid.closest(".thumbnail-preview, .image-preview-container, .gallery-container");
  var $parentDropzone = $container.siblings(".dropzone:not(.medialibrary-dropzone):not(.section-specific-dropzone)");

  if ($container.hasClass("gallery-container")) {
      $polaroid.fadeOut(300, function() { $(this).remove(); });
      $container.closest('form').trigger('input'); // For autosave
      return;
  }

  if ($parentDropzone.length) {
    $polaroid.fadeOut(300, function() {
      $(this).remove();
      if ($container.children().length === 0) {
        $parentDropzone.show();
        // Clear associated hidden inputs for these generic dropzones
        $parentDropzone.siblings("input[name='thumbnail_cropped_data'], input[name*='cropped_image_data']").val('');
      }
      $parentDropzone.closest('form').trigger('input'); // For autosave
    });
  }
});
