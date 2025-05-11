// js/preview.js
var Preview = (function(){
  // Attach click events for preview display and modal close.
  function init() {
    // When the preview button is clicked, generate and show the preview.
    $("#preview-button").on("click", function(){
      generatePreview();
      $("#preview-modal").fadeIn(300);
    });
    
    // Close the preview modal when the close button is clicked.
    $("#preview-close").on("click", function(){
      $("#preview-modal").fadeOut(200);
    });
  }
  
  // Generate preview HTML from current form data.
  function generatePreview() {
    var title = $("#title").val();
    var tagline = $("#tagline").val();
    // Use the hidden input if available; if not, use the text from selected tags container.
    var tags = $("#selected_tags_input").val() || $("#selected-tags").text();
    
    var previewHTML = "";
    previewHTML += "<div class='preview-fixed'>";
    previewHTML += "<h1>" + escapeHtml(title) + "</h1>";
    previewHTML += "<h2>" + escapeHtml(tagline) + "</h2>";
    if (tags) {
      previewHTML += "<p><strong>Tags:</strong> " + escapeHtml(tags) + "</p>";
    }
    previewHTML += "</div>";
    
    // Gather Modular Sections (if any)
    // We assume that dynamically added sections inside #sections-container each have a data attribute for their type
    // and a child element with a class .section-content; adjust as needed to match your markup.
    var sectionsHTML = "";
    $("#sections-container .modular-section").each(function(){
      var sectionType = $(this).attr("data-section-type") || "Section";
      var sectionContent = $(this).find(".section-content").html() || $(this).html();
      sectionsHTML += "<div class='preview-section'>";
      sectionsHTML += "<h3>" + escapeHtml(sectionType) + "</h3>";
      sectionsHTML += sectionContent;
      sectionsHTML += "</div>";
    });
    if (sectionsHTML) {
      previewHTML += "<div class='preview-sections'>" + sectionsHTML + "</div>";
    }
    
    // Gather Sources & Citations (if any)
    var sourcesHTML = "";
    $("#sources-container .source").each(function(){
      var sourceTitle = $(this).find("input[name='source_title[]']").val();
      var sourceUrl = $(this).find("input[name='source_url[]']").val();
      var sourceNote = $(this).find("textarea[name='source_note[]']").val();
      if (sourceTitle) {
        sourcesHTML += "<div class='preview-source'><p><strong>" + escapeHtml(sourceTitle) + "</strong></p>";
        if(sourceUrl){
          sourcesHTML += "<p>" + escapeHtml(sourceUrl) + "</p>";
        }
        if(sourceNote){
          sourcesHTML += "<p>" + escapeHtml(sourceNote) + "</p>";
        }
        sourcesHTML += "</div>";
      }
    });
    if (sourcesHTML) {
      previewHTML += "<div class='preview-sources'><h3>Sources &amp; Citations</h3>" + sourcesHTML + "</div>";
    }
    
    $("#preview-modal-content").html(previewHTML);
  }
  
  // Basic helper to escape HTML special characters.
  function escapeHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  return {
    init: init,
    generatePreview: generatePreview
  };
})();
