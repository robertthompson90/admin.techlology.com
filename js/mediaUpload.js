// js/mediaUpload.js
// Version 2.1.3 - Handles pasted URLs and passes original filename for title prefilling.
var MediaUpload = (function($){

  function computeHash(arrayBuffer) {
    // ... (your existing computeHash function, assumed correct) ...
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", arrayBuffer).then(function(hashBuffer) {
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      });
    }
    return Promise.resolve("fallback_" + arrayBuffer.byteLength + "_" + Date.now());
  }

  function getCurrentMediaLibraryFilters() {
    const query = $('#media-search-input').val() || "";
    const tagFilter = $('#media-tag-filter').val() || "";
    const showVariants = $('#media-show-variants').is(':checked') || false;
    return { query, tagFilter, showVariants };
  }

  function refreshMediaLibrary() {
    if (typeof MediaLibrary !== 'undefined' && MediaLibrary.loadMedia) {
      const filters = getCurrentMediaLibraryFilters();
      console.log("[MediaUpload] Refreshing media library with filters:", filters);
      MediaLibrary.loadMedia(filters.query, filters.tagFilter, filters.showVariants);
    } else {
      console.warn("[MediaUpload] MediaLibrary.loadMedia function not available.");
    }
  }

  // Modified to accept originalFilename
  function uploadMedia(file, hash, originalFilename, individualFileCallback) {
    var formData = new FormData();
    formData.append("media_file", file); // 'file' here is a File or Blob object
    if (hash) {
      formData.append("file_hash", hash);
    }
    // Pass the original filename if available (for title prefilling on backend)
    if (originalFilename) {
      formData.append("original_filename", originalFilename);
    }

    $.ajax({
      url: "ajax/uploadMedia.php",
      type: "POST",
      data: formData,
      contentType: false,
      processData: false,
      dataType: "json",
      success: function(response) {
        // ... (existing success notification logic) ...
        if (response.success && response.media && response.media.id) {
          Notifications.show("Media uploaded: " + (response.media.admin_title || response.media.title || `ID ${response.media.id}`), "success");
        } else if (response.success && response.message) {
           Notifications.show(response.message, "info");
        } else {
          Notifications.show("Error: " + (response.error || "Upload failed for " + (originalFilename || file.name || 'pasted content')), "error");
        }
        if (individualFileCallback) individualFileCallback(response);
      },
      error: function(jqXHR, textStatus) {
        Notifications.show("Media upload failed (AJAX error: " + textStatus + ") for " + (originalFilename || file.name || 'pasted content'), "error");
        if (individualFileCallback) individualFileCallback({success: false, error: "AJAX error uploading " + (originalFilename || file.name || 'pasted content') });
      }
    });
  }

  // Modified to accept and pass originalFilename
  function checkDuplicateAndProcess(file, originalFilename, individualFileCallback) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var arrayBuffer = e.target.result;
      computeHash(arrayBuffer).then(function(hash) {
        $.ajax({
          url: 'ajax/checkDuplicate.php',
          type: 'POST',
          data: { hash: hash, fileName: (originalFilename || file.name), size: file.size },
          dataType: 'json',
          success: function(response) {
            if (response.duplicate && response.media && response.media.id) {
              if (confirm("Media '" + (originalFilename || file.name) + "' already exists as ID " + response.media.id + " ("+(response.media.admin_title || response.media.title || 'Untitled')+"). Would you like to use the existing file?")) {
                Notifications.show("Using existing media: ID " + response.media.id, "info");
                if (individualFileCallback) individualFileCallback({success: true, media: response.media, was_duplicate_accepted: true});
              } else {
                Notifications.show("Upload cancelled for duplicate: " + (originalFilename || file.name), "info");
                if (individualFileCallback) individualFileCallback({success: false, error: "Upload cancelled by user for duplicate."});
              }
            } else {
              uploadMedia(file, hash, (originalFilename || file.name), individualFileCallback);
            }
          },
          error: function() {
            Notifications.show("Duplicate check failed for " + (originalFilename || file.name) + ", proceeding with upload.", "warning");
            uploadMedia(file, hash, (originalFilename || file.name), individualFileCallback);
          }
        });
      });
    };
    reader.readAsArrayBuffer(file); // 'file' must be a File or Blob
  }

  function processSingleFile(file, finalCallback) { // file is a File object
    // The original filename is file.name
    checkDuplicateAndProcess(file, file.name, function(uploadResponse){
        if(uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.media.id){
            finalCallback(uploadResponse);
        } else {
            finalCallback(uploadResponse || { success: false, error: "Processing failed or cancelled." });
        }
    });
  }

  function processMultipleFiles(files, allDoneCallback) { // files is an array of File objects
    let successCount = 0;
    let errorCount = 0;
    let processedCount = 0;
    const totalFiles = files.length;
    let anyUploadAttemptedOrDuplicateHandled = false;

    if (files.length === 0) {
        if (allDoneCallback) allDoneCallback({success: 0, errors: 0, total: 0});
        return;
    }

    files.forEach(file => { // file here is a File object
        checkDuplicateAndProcess(file, file.name, function(response) {
            processedCount++;
            if (response && response.success) {
                successCount++;
                anyUploadAttemptedOrDuplicateHandled = true;
            } else {
                errorCount++;
            }
            if (processedCount === totalFiles) {
                if (anyUploadAttemptedOrDuplicateHandled) {
                    refreshMediaLibrary();
                }
                if (allDoneCallback) allDoneCallback({success: successCount, errors: errorCount, total: totalFiles});
            }
        });
    });
  }

  /**
   * NEW: Processes a pasted URL by sending it to the backend.
   * @param {string} imageUrl - The URL of the image to fetch and upload.
   * @param {function} finalCallback - Called with the server's response.
   */
  function processPastedUrl(imageUrl, finalCallback) {
    Notifications.show("Attempting to upload image from URL: " + imageUrl, "info");
    $.ajax({
        url: 'ajax/uploadImageFromUrl.php', // New backend endpoint
        type: 'POST',
        data: { image_url: imageUrl },
        dataType: 'json',
        success: function(response) {
            if (response.success && response.media && response.media.id) {
                Notifications.show("Image from URL uploaded: " + (response.media.admin_title || response.media.title || `ID ${response.media.id}`), "success");
            } else {
                Notifications.show("Error uploading from URL: " + (response.error || "Failed."), "error");
            }
            if (finalCallback) finalCallback(response);
        },
        error: function(jqXHR, textStatus) {
            Notifications.show("AJAX error uploading from URL: " + textStatus, "error");
            if (finalCallback) finalCallback({ success: false, error: "AJAX error uploading from URL." });
        }
    });
  }


  function init() {
    var $existingUploadBtn = $("#media-upload-button");
    var $existingFileInput = $("#media-file-input-hidden");

    if ($existingUploadBtn.length && $existingFileInput.length) {
      console.log("MediaUpload.js (v2.1.3): Binding to existing #media-upload-button and #media-file-input-hidden.");
      $existingUploadBtn.off('click').on("click", function(){ $existingFileInput.val(''); $existingFileInput.click(); });
      $existingFileInput.off('change').on("change", function(){
        var filesFromInput = this.files;
        if (!filesFromInput || filesFromInput.length === 0) return;
        const imageFiles = Array.from(filesFromInput).filter(file => file.type.startsWith("image/"));
        if (imageFiles.length === 0) { Notifications.show("No image files selected.", "info"); $(this).val(''); return; }

        if (imageFiles.length === 1) {
            Notifications.show("Processing 1 selected image...", "info");
            MediaUpload.processSingleFileForDrop(imageFiles[0], function(uploadResponse) { // Renamed for clarity, still calls processSingleFile
              if (uploadResponse && uploadResponse.success && uploadResponse.media && uploadResponse.media.id && uploadResponse.media.image_url) {
                if (!uploadResponse.was_duplicate_accepted) {
                  Notifications.show("New image " + (uploadResponse.media.admin_title || uploadResponse.media.title || uploadResponse.media.id) + " uploaded. Opening editor...", "info");
                  refreshMediaLibrary();
                  UnifiedImageEditor.openEditor(
                      uploadResponse.media.image_url, uploadResponse.media,
                      () => { refreshMediaLibrary(); }, () => { /* UIE closed */ }
                  );
                } else {
                  Notifications.show("Using existing media (ID: " + uploadResponse.media.id + "). Library refreshed.", "info");
                  refreshMediaLibrary();
                }
              } else {
                Notifications.show("Failed to process selected image: " + (uploadResponse.error || "Unknown issue"), "error");
                refreshMediaLibrary();
              }
            });
        } else {
             Notifications.show(`Processing ${imageFiles.length} selected images...`, "info");
             MediaUpload.processMultipleFilesForDrop(imageFiles, function(summary) {
                Notifications.show(`${summary.success} of ${summary.total} images processed. ${summary.errors} errors. Library refreshed.`, "info");
            });
        }
        $(this).val('');
      });
    } else {
      console.log("MediaUpload.js: #media-upload-button or #media-file-input-hidden not found.");
    }
  }

  return {
    init: init,
    processSingleFileForDrop: processSingleFile,
    processMultipleFilesForDrop: processMultipleFiles,
    processPastedUrl: processPastedUrl // Expose new method
  };
})(jQuery);
