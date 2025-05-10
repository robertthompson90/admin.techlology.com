var Sections = (function(){
  // Define constants for section types
  const SUBTITLE_SECTION = 1;
  const TEXT_SECTION = 2;
  const IMAGE_SECTION = 3;
  const VIDEO_SECTION = 4;
  const GALLERY_SECTION = 5;
  const QUOTE_SECTION = 6;
  const PROS_CONS_SECTION = 7;
  const RATING_SECTION = 8;
  
  // Helper functions for Pros/Cons rows
  function newProsItemRow() {
    return '<div class="pros-item">' +
           '<span class="remove-pro">&#10006;</span>' +
           '<span class="icon-pros">&#10003;</span>' +
           '<input type="text" name="section_pros[]" placeholder="Enter a pro">' +
           '</div>';
  }
  
  function newConsItemRow() {
    return '<div class="cons-item">' +
           '<span class="remove-cons">&#10006;</span>' +
           '<span class="icon-cons">&#10007;</span>' +
           '<input type="text" name="section_cons[]" placeholder="Enter a con">' +
           '</div>';
  }
  
  // Renders a polaroid-style photo box
  function renderPolaroid(imageSrc, type) {
    // type can be "thumbnail", "single", or "gallery" - adjust as needed.
    var html = '<div class="polaroid">';
    html += '<div class="polaroid-image">';
    if(imageSrc) {
      html += '<img src="' + imageSrc + '" alt="Uploaded Photo">';
    }
    html += '</div>';
    html += '<input type="text" class="polaroid-caption" placeholder="Enter caption (optional)">';
    html += '<button type="button" class="remove-photo">Remove</button>';
    html += '</div>';
    return html;
  }
  
  // Toggle the visibility of the bottom section selector
  function toggleBottomSectionSelector(){
    var count = $("#sections-container .modular-section").length;
    if(count > 0){
      $("#section-type-selector-bottom").show();
    } else {
      $("#section-type-selector-bottom").hide();
    }
  }
  
  // Adds a new section based on section type id
  function addSection(sectionId){
    sectionId = parseInt(sectionId);
    if(!sectionId) return;
    
    var sectionDiv = $("<div></div>")
      .addClass("modular-section")
      .attr("data-type", sectionId);
      
    // For rating sections: add padlock instead of drag handle.
    if(sectionId === RATING_SECTION){
       sectionDiv.addClass("rating-section");
       sectionDiv.append('<span class="padlock-icon">&#128274;</span>');
    } else {
       sectionDiv.append('<span class="drag-handle no-select">☰</span>');
    }
    
    // Top-right remove icon and hidden field for section type
    sectionDiv.append('<span class="remove-section-icon">&#10006;</span>');
    sectionDiv.append('<input type="hidden" name="section_type[]" value="'+sectionId+'">');
    
    // Build the section's custom HTML structure based on type
    switch(sectionId){
      case SUBTITLE_SECTION:
         sectionDiv.append('<h3>Subtitle</h3>');
         sectionDiv.append('<input type="text" name="section_subtitle[]" placeholder="Enter subtitle">');
         break;
      case TEXT_SECTION:
         sectionDiv.append('<h3>Text</h3>');
         sectionDiv.append('<textarea name="section_text[]" placeholder="Enter text content..."></textarea>');
         break;
      case IMAGE_SECTION:
         sectionDiv.append('<h3>Image</h3>');
         sectionDiv.append('<div class="dropzone dropzone-image"><p>Drag &amp; drop your image here or click to upload</p><input type="file" accept="image/*" name="section_image_file[]" class="hidden-file-input"></div>');
         sectionDiv.append('<div class="image-preview-container"></div>');
         sectionDiv.append('<input type="text" name="section_image_caption[]" placeholder="Enter caption (optional)">');
         break;
      case VIDEO_SECTION:
         sectionDiv.append('<h3>Video</h3>');
         sectionDiv.append('<input type="text" name="section_video[]" placeholder="Enter video URL">');
         break;
      case GALLERY_SECTION:
         sectionDiv.append('<h3>Gallery</h3>');
         sectionDiv.append('<div class="dropzone dropzone-gallery"><p>Drag &amp; drop gallery images here or click to upload</p><input type="file" accept="image/*" name="section_gallery_file[]" multiple class="hidden-file-input"></div>');
         sectionDiv.append('<div class="gallery-container"></div>');
         break;
      case QUOTE_SECTION:
         sectionDiv.append('<h3>Quote</h3>');
         sectionDiv.append('<textarea name="section_quote[]" placeholder="Enter the quote..."></textarea>');
         break;
      case PROS_CONS_SECTION:
         sectionDiv.append('<h3>Pros and Cons</h3>');
         var prosConsHtml = '<div class="pros-cons-wrapper">' +
            '<div class="pros-column"><div class="pros-items">' + newProsItemRow() + '</div></div>' +
            '<div class="cons-column"><div class="cons-items">' + newConsItemRow() + '</div></div>' +
            '</div>';
         sectionDiv.append(prosConsHtml);
         break;
      case RATING_SECTION:
         var ratingWidgetHtml = '<div class="rating-widget">' +
              '<span class="star" data-value="1">&#9734;</span>' +
              '<span class="star" data-value="2">&#9734;</span>' +
              '<span class="star" data-value="3">&#9734;</span>' +
              '<span class="star" data-value="4">&#9734;</span>' +
              '<span class="star" data-value="5">&#9734;</span>' +
              '</div>';
         sectionDiv.append('<label>Rating:</label>' + ratingWidgetHtml);
         sectionDiv.append('<input type="hidden" name="section_rating_value[]" value="0">');
         sectionDiv.append('<textarea name="section_verdict[]" placeholder="Enter closing thoughts..."></textarea>');
         break;
      default:
         alert("Unknown section type.");
    }
    
    // Bind removal: both icon and button
    sectionDiv.append('<button type="button" class="remove-section">Remove Section</button>');
    sectionDiv.find(".remove-section-icon, .remove-section").on("click", function(){
         // Store the type value before removal to handle rating option re-enabling.
         var removedSectionType = parseInt(sectionDiv.attr("data-type"));
         sectionDiv.remove();
         toggleBottomSectionSelector();
         // Re-enable rating option if a rating section is removed.
         if(removedSectionType === RATING_SECTION){
            $("#section-type-selector-top option[value='" + RATING_SECTION + "']").prop("disabled", false);
            $("#section-type-selector-bottom option[value='" + RATING_SECTION + "']").prop("disabled", false);
         }
    });
    
    // If it's a rating section, disable the rating option in the selectors.
    if(sectionId === RATING_SECTION){
       $("#section-type-selector-top option[value='" + RATING_SECTION + "']").prop("disabled", true);
       $("#section-type-selector-bottom option[value='" + RATING_SECTION + "']").prop("disabled", true);
    }
    
    // Append the section to the container.
    // Always place rating sections at the bottom.
    if(sectionId === RATING_SECTION){
         $("#sections-container").append(sectionDiv);
    } else {
         var $ratingSection = $("#sections-container .modular-section.rating-section");
         if($ratingSection.length > 0){
             $ratingSection.first().before(sectionDiv);
         } else {
             $("#sections-container").append(sectionDiv);
         }
    }
    
    toggleBottomSectionSelector();
  }
  
  // Initialize the section builder: bind changes on both selectors and apply sortable behavior.
  function initSections(){
    $("#section-type-selector-top, #section-type-selector-bottom").on("change", function(){
         addSection($(this).val());
         $(this).val("");
         toggleBottomSectionSelector();
    });
    
    $("#sections-container").sortable({
         items: "div.modular-section:not(.rating-section)",
         handle: ".drag-handle"
    });
  }
  
  return {
    init: initSections,
    addSection: addSection,
    renderPolaroid: renderPolaroid,
    newProsItemRow: newProsItemRow,
    newConsItemRow: newConsItemRow
  };
})();
