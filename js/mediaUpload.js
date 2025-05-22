var MediaUpload = (function(){
  function init() {
    var $existingUploadBtn = $("#media-upload-button");
    var $existingFileInput = $("#media-file-input-hidden");

    // Check if the specific button and input from medialibrary.php exist
    if ($existingUploadBtn.length && $existingFileInput.length) {
      // If they exist, bind event handlers to them
      console.log("MediaUpload.js: Binding to existing #media-upload-button and #media-file-input-hidden.");
      
      $existingUploadBtn.off('click').on("click", function(){
        $existingFileInput.click(); // Trigger click on the existing hidden file input
      });
      
      $existingFileInput.off('change').on("change", function(){
        var file = this.files[0];
        if (!file) return;
        // The existing checkDuplicateAndUpload function should work as is
        checkDuplicateAndUpload(file);
        // Clear the file input's value after processing.
        // This allows the user to select the same file again if they need to.
        $(this).val('');
      });

    } else {
      // Fallback: If the specific IDs aren't found, try the original dynamic creation logic.
      // This might be for other pages (like addarticle.php) that use this script.
      console.log("MediaUpload.js: #media-upload-button and #media-file-input-hidden not found. Attempting dynamic UI creation if applicable.");
      
      // Original check for dynamic creation context
      var $globalMedia = $("#global-media");
      var $mediaSearch = $globalMedia.prev(".media-search"); // Check if .media-search exists before #global-media
      
      if ($globalMedia.length && $mediaSearch.length && $mediaSearch.prev(".media-upload").length === 0) {
          console.log("MediaUpload.js: Dynamically creating upload UI.");
          var $uploadDiv = $("<div>").addClass("media-upload");
          // Note: The dynamically created input here doesn't have an ID,
          // so it won't conflict with #media-file-input-hidden from medialibrary.php
          var $dynamicFileInput = $("<input type='file' accept='image/*'>").css({ display: "none" });
          var $dynamicUploadBtn = $("<button type='button'>Upload Media</button>").addClass("upload-btn");
          
          $dynamicUploadBtn.on("click", function(){
            $dynamicFileInput.click();
          });
          
          $dynamicFileInput.on("change", function(){
            var file = this.files[0];
            if (!file) return;
            checkDuplicateAndUpload(file);
            $(this).val(''); // Clear the dynamic file input's value
          });
          
          $uploadDiv.append($dynamicUploadBtn).append($dynamicFileInput);
          $mediaSearch.before($uploadDiv); // Place it before the .media-search div
      } else {
        console.log("MediaUpload.js: No specific upload button IDs found, and dynamic creation conditions not met or UI already exists.");
      }
    }
  }
  
  function checkDuplicateAndUpload(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var arrayBuffer = e.target.result;
      computeHash(arrayBuffer).then(function(hash) {
        // Call backend duplicate check
        $.ajax({
          url: 'ajax/checkDuplicate.php',
          type: 'POST',
          data: {
            hash: hash,
            fileName: file.name, // For logging purposes, if needed.
            size: file.size
          },
          dataType: 'json',
          success: function(response) {
            if (response.duplicate) {
              if (confirm("This media already exists. Would you like to use the existing file?")) {
                Notifications.show("Using existing media", "info");
                // Assuming MediaLibrary.loadMedia() reloads the library view.
                if (typeof MediaLibrary !== 'undefined' && MediaLibrary.loadMedia) {
                  // Make sure to pass current filter values when reloading
                  MediaLibrary.loadMedia(
                    $('#media-search-input').val() || "", 
                    $('#media-tag-filter').val() || "", 
                    $('#media-show-variants').is(':checked') || false
                  );
                }
              } else {
                Notifications.show("Upload cancelled.", "info");
              }
            } else {
              // No duplicate; proceed with upload, sending along the hash.
              uploadMedia(file, hash);
            }
          },
          error: function() {
            // On error, fallback by uploading.
            Notifications.show("Duplicate check failed, uploading media.", "info");
            uploadMedia(file, hash);
          }
        });
      });
    };
    reader.readAsArrayBuffer(file);
  }
  
  function computeHash(arrayBuffer) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", arrayBuffer).then(function(hashBuffer) {
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        var hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
      });
    }
    // Fallback for environments where crypto.subtle is not available (e.g. http without secure context)
    console.warn("crypto.subtle not available. Using a basic file size and name for duplicate check fallback (less reliable).");
    // This is a placeholder. For a production environment without HTTPS, 
    // you might need a more robust client-side hashing library or rely solely on server-side checks.
    return Promise.resolve("fallback_" + arrayBuffer.byteLength + "_" + Date.now()); 
  }
  
  function uploadMedia(file, hash) {
    var formData = new FormData();
    formData.append("media_file", file);
    if (hash) {
      formData.append("file_hash", hash);
    }
    $.ajax({
      url: "ajax/uploadMedia.php",
      type: "POST",
      data: formData,
      contentType: false,
      processData: false,
      dataType: "json",
      success: function(response) {
        if (response.success) {
          Notifications.show("Media uploaded successfully", "success");
           if (typeof MediaLibrary !== 'undefined' && MediaLibrary.loadMedia) {
             // Make sure to pass current filter values when reloading
             MediaLibrary.loadMedia(
               $('#media-search-input').val() || "", 
               $('#media-tag-filter').val() || "", 
               $('#media-show-variants').is(':checked') || false
             );
           }
        } else {
          Notifications.show("Error: " + (response.error || "Upload failed."), "error");
        }
      },
      error: function() {
        Notifications.show("Media upload failed due to an AJAX error.", "error");
      }
    });
  }
  
  return {
    init: init
  };
})();