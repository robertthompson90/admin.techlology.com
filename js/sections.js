var Sections = (function(){
  // Define constants for section types
  const SUBTITLE_SECTION = 1;
  const TEXT_SECTION     = 2;
  const IMAGE_SECTION    = 3;
  const VIDEO_SECTION    = 4;
  const GALLERY_SECTION  = 5;
  const QUOTE_SECTION    = 6;
  const PROS_CONS_SECTION= 7;
  const RATING_SECTION   = 8;
  
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
  
  // Renders a polaroid-style photo box (unchanged)
  function renderPolaroid(imageSrc, type) {
    var html = '<div class="polaroid">';
    html += '<div class="polaroid-image">';
    if (imageSrc) {
      html += '<img src="' + imageSrc + '" alt="Uploaded Photo">';
    }
    html += '</div>';
    html += '<input type="text" class="polaroid-caption" placeholder="Enter caption (optional)">';
    html += '<button type="button" class="remove-photo">Remove</button>';
    html += '</div>';
    return html;
  }
  
  /**
   * getSectionTemplate():
   * Returns an HTML string for a section based on its type.
   * The optional 'defaults' object can preset content or caption values.
   */
  function getSectionTemplate(sectionId, defaults) {
    defaults = defaults || {};
    let html = '';
    html += '<div class="modular-section" data-type="' + sectionId + '">';
    
    // For rating sections, use a padlock instead of the drag handle.
    if (sectionId == RATING_SECTION) {
      html += '<span class="padlock-icon">&#128274;</span>';
    } else {
      html += '<span class="drag-handle no-select">☰</span>';
    }
    
    // Top–right remove icon and hidden field for section type
    html += '<span class="remove-section-icon">&#10006;</span>';
    html += '<input type="hidden" name="section_type[]" value="' + sectionId + '">';
    
    // Section-specific content
    switch(sectionId) {
      case SUBTITLE_SECTION:
        html += '<h3>Subtitle</h3>';
        html += '<input type="text" name="section_subtitle[]" placeholder="Enter subtitle" value="' + (defaults.content || '') + '">';
        break;
      case TEXT_SECTION:
        html += '<h3>Text</h3>';
        html += '<textarea name="section_text[]" placeholder="Enter text content...">' + (defaults.content || '') + '</textarea>';
        break;
      case IMAGE_SECTION:
			html += '<h3>Image</h3>';
			html += '<div class="dropzone dropzone-image"><p>Drag &amp; drop your image here or click to upload</p>';
			html += '<input type="file" accept="image/*" name="section_image_file[]" class="hidden-file-input"></div>';
			html += '<div class="image-preview-container">';
			if(defaults.croppedData) {
				var decodedImage = decodeURIComponent(defaults.croppedData);
				html += renderPolaroid(decodedImage, "image");
			}
			html += '</div>';
			html += '<input type="text" name="section_image_caption[]" placeholder="Enter caption (optional)" value="' + (defaults.caption || '') + '">';
			html += '<input type="hidden" name="cropped_image_data[]" value="' + (defaults.croppedData || '') + '">';
			break;
      case VIDEO_SECTION:
        html += '<h3>Video</h3>';
        html += '<input type="text" name="section_video[]" placeholder="Enter video URL" value="' + (defaults.content || '') + '">';
        break;
      case GALLERY_SECTION:
				html += '<h3>Gallery</h3>';
				html += '<div class="dropzone dropzone-gallery"><p>Drag &amp; drop gallery images here or click to upload</p>';
				html += '<input type="file" accept="image/*" name="section_gallery_file[]" multiple class="hidden-file-input"></div>';
				html += '<div class="gallery-container">';
				if(defaults.galleryHTML) {
					html += defaults.galleryHTML;
				}
				html += '</div>';
				// Remove the extra hidden input. We’re capturing the gallery's HTML directly.
				// html += '<input type="hidden" name="gallery_data[]" value="' + (defaults.galleryHTML ? encodeURIComponent(defaults.galleryHTML) : '') + '">';
				break;
      case QUOTE_SECTION:
        html += '<h3>Quote</h3>';
        html += '<textarea name="section_quote[]" placeholder="Enter the quote...">' + (defaults.content || '') + '</textarea>';
        break;
      case PROS_CONS_SECTION:
        html += '<h3>Pros and Cons</h3>';
        html += '<div class="pros-cons-wrapper">' +
                  '<div class="pros-column"><div class="pros-items">' + newProsItemRow() + '</div></div>' +
                  '<div class="cons-column"><div class="cons-items">' + newConsItemRow() + '</div></div>' +
                '</div>';
        break;
      case RATING_SECTION:
        const ratingWidgetHtml = '<div class="rating-widget">' +
                                     '<span class="star" data-value="1">&#9734;</span>' +
                                     '<span class="star" data-value="2">&#9734;</span>' +
                                     '<span class="star" data-value="3">&#9734;</span>' +
                                     '<span class="star" data-value="4">&#9734;</span>' +
                                     '<span class="star" data-value="5">&#9734;</span>' +
                                 '</div>';
        html += '<label>Rating:</label>' + ratingWidgetHtml;
        html += '<input type="hidden" name="section_rating_value[]" value="0">';
        html += '<textarea name="section_verdict[]" placeholder="Enter closing thoughts...">' + (defaults.content || '') + '</textarea>';
        break;
      default:
        html += '<h3>Unknown Section</h3>';
        html += '<div class="section-content">' + (defaults.content || '') + '</div>';
    }
    
    // Append a removal button at the bottom of the section
    html += '<button type="button" class="remove-section">Remove Section</button>';
    
    html += '</div>'; // close .modular-section
    return html;
  }
  
  /**
   * addSection():
   * Uses getSectionTemplate() to build a new section, appends it to the container,
   * binds removal events, and handles special logic for rating sections.
   * 'defaults' is optional.
   */
  function addSection(sectionId, defaults) {
    sectionId = parseInt(sectionId);
    if (!sectionId) return;
    
    // Create the section element using the template
    var sectionHtml = getSectionTemplate(sectionId, defaults);
    var sectionElem = $(sectionHtml);
    
    // Bind removal events for both the remove icon and the remove button
    sectionElem.find(".remove-section-icon, .remove-section").on("click", function(){
      var removedSectionType = parseInt(sectionElem.attr("data-type"));
      sectionElem.remove();
      toggleBottomSectionSelector();
      // Re-enable rating section option if applicable
      if (removedSectionType === RATING_SECTION) {
        $("#section-type-selector-top option[value='" + RATING_SECTION + "']").prop("disabled", false);
        $("#section-type-selector-bottom option[value='" + RATING_SECTION + "']").prop("disabled", false);
      }
      // Trigger event for section removal
      $(document).trigger("section:removed", [removedSectionType]);
    });
    
    // For rating sections, disable the rating option in selectors.
    if (sectionId === RATING_SECTION) {
      $("#section-type-selector-top option[value='" + RATING_SECTION + "']").prop("disabled", true);
      $("#section-type-selector-bottom option[value='" + RATING_SECTION + "']").prop("disabled", true);
    }
    
    // Append the section to the container.
    // Always place rating sections at the bottom.
    if (sectionId === RATING_SECTION) {
      $("#sections-container").append(sectionElem);
    } else {
      var $ratingSection = $("#sections-container .modular-section.rating-section");
      if ($ratingSection.length > 0) {
        $ratingSection.first().before(sectionElem);
      } else {
        $("#sections-container").append(sectionElem);
      }
    }
    
    toggleBottomSectionSelector();
    
    // Trigger a custom event for any additional bindings (e.g., dropzone re-initialization)
    $(document).trigger("section:added", [sectionElem]);
  }
  
  // Toggle the visibility of the bottom section selector based on whether any sections exist
  function toggleBottomSectionSelector(){
    var count = $("#sections-container .modular-section").length;
    if(count > 0){
      $("#section-type-selector-bottom").show();
    } else {
      $("#section-type-selector-bottom").hide();
    }
  }
  
  // Whenever a new section is added, trigger an input event on the article form.
  $(document).on("section:added", function(e, sectionElem) {
    // Trigger autosave by simulating an "input" event, since your autosave logic
    // is bound to "#article-form" on input events.
    $("#article-form").trigger("input");
  });

  // Initialize the section builder: bind change events on the selectors and apply sortable behavior.
  function initSections(){
    $("#section-type-selector-top, #section-type-selector-bottom").on("change", function(){
         addSection($(this).val());
         $(this).val("");
         toggleBottomSectionSelector();
    });
    
    $("#sections-container").sortable({
         items: "div.modular-section:not(.rating-section)",
         handle: ".drag-handle",
          update: function(event, ui) {
            // When the order has changed, simulate an input event so autosave triggers.
            $("#article-form").trigger("input");
          }
    });
  }
  
  return {
    init: initSections,
    addSection: addSection,
    renderPolaroid: renderPolaroid,
    newProsItemRow: newProsItemRow,
    newConsItemRow: newConsItemRow,
    getSectionTemplate: getSectionTemplate
  };
})();
