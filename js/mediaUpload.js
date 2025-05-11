// js/mediaUpload.js
var MediaUpload = (function(){
  function init() {
    // If upload UI is not already present, create it.
    if ($("#global-media").prev(".media-upload").length === 0) {
      var $uploadDiv = $("<div>").addClass("media-upload");
      var $fileInput = $("<input type='file' accept='image/*'>").css({ display: "none" });
      var $uploadBtn = $("<button type='button'>Upload Media</button>").addClass("upload-btn");
      
      $uploadBtn.on("click", function(){
        $fileInput.click();
      });
      
      $fileInput.on("change", function(){
        var file = this.files[0];
        if (!file) return;
        checkDuplicateAndUpload(file);
      });
      
      $uploadDiv.append($uploadBtn).append($fileInput);
      $("#global-media").prev(".media-search").before($uploadDiv);
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
                MediaLibrary.loadMedia();
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
    return Promise.resolve("");
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
          MediaLibrary.loadMedia();
        } else {
          Notifications.show("Error: " + response.error, "error");
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
