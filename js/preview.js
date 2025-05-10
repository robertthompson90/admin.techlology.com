// js/preview.js

var Preview = (function(){
  /**
   * Initializes the preview functionality.
   * When the user clicks the 'Preview Article' button, this module builds
   * a preview of the article content from the form fields and displays it in a modal.
   */
  function initPreview(){
    // When the preview button is clicked…
    $("#preview-button").on("click", function(e){
      e.preventDefault();
      
      var previewHTML = "";
      
      // Collect Fixed Information: Title and Tagline.
      var title = $("#title").val();
      var tagline = $("#tagline").val();
      previewHTML += "<h1>" + (title || "Untitled") + "</h1>";
      previewHTML += "<h3>" + (tagline || "No tagline provided") + "</h3>";
      
      // Include Thumbnail Preview if available.
      var thumbnailContent = $(".thumbnail-preview").html();
      if(thumbnailContent) {
        previewHTML += '<div class="preview-thumbnail">' + thumbnailContent + '</div>';
      }
      
      // Include Tags section.
      var tagsHtml = $("#selected-tags").html();
      if(tagsHtml) {
        previewHTML += '<div class="preview-tags"><strong>Tags:</strong> ' + tagsHtml + '</div>';
      }
      
      // Include Modular Content Sections.
      var sectionsHTML = $("#sections-container").html();
      if(sectionsHTML) {
        previewHTML += '<div class="preview-sections"><strong>Content Sections:</strong> ' + sectionsHTML + '</div>';
      }
      
      // Include Sources & Citations.
      var sourcesHTML = $("#sources-container").html();
      if(sourcesHTML) {
        previewHTML += '<div class="preview-sources"><strong>Sources &amp; Citations:</strong> ' + sourcesHTML + '</div>';
      }
      
      // Insert the constructed HTML into the preview modal container.
      $("#preview-modal-content").html(previewHTML);
      
      // Display the preview modal.
      $("#preview-modal").show();
    });
    
    // Close the preview modal when the close button is clicked.
    $("#preview-close").on("click", function(){
      $("#preview-modal").hide();
    });
  }
  
  return {
    init: initPreview
  };
})();
