// js/mediaUpload.js
var MediaUpload = (function(){
  function init() {
    // Check if upload UI is already present; if not, create it.
    if ($("#global-media").prev(".media-upload").length === 0) {
      var $uploadDiv = $("<div>").addClass("media-upload");
      // Create a hidden file input element
      var $fileInput = $("<input type='file' accept='image/*'>").css({ display: "none" });
      // Create an upload button
      var $uploadBtn = $("<button type='button'>Upload Media</button>").addClass("upload-btn");
      
      // When the upload button is clicked, trigger the file input.
      $uploadBtn.on("click", function(){
        $fileInput.click();
      });
      
      // When a file is selected, start the upload.
      $fileInput.on("change", function(){
        var file = this.files[0];
        if (!file) return;
        uploadMedia(file);
      });
      
      $uploadDiv.append($uploadBtn).append($fileInput);
      // Insert the upload div just above the search box within the media panel.
      $("#global-media").prev(".media-search").before($uploadDiv);
    }
  }
  
  function uploadMedia(file) {
    var formData = new FormData();
    formData.append("media_file", file);
    
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
          // Reload the media library to show the new item.
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
