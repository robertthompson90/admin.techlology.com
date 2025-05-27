// js/sections.js
// Version 2.1 - Updated Image Section template for UIE integration and asset/variant IDs.
//               Standardized input naming for all sections for easier backend processing.
//               Added unique instance IDs to sections.

var Sections = (function($){ // Assuming jQuery is available if $ is used
  // Define constants for section types (ensure these match your DB and other JS)
  const SUBTITLE_SECTION = 1;
  const TEXT_SECTION     = 2;
  const IMAGE_SECTION    = 3;
  const VIDEO_SECTION    = 4;
  const GALLERY_SECTION  = 5;
  const PROS_CONS_SECTION= 7;
  const RATING_SECTION   = 8;

  // Helper to generate a unique ID for section instances
  function generateUniqueId(prefix = 'sectionInstance_') {
    return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Helper functions for Pros/Cons rows
  function newProsItemRow(sectionInstanceId, proValue = "") { // Added sectionInstanceId for unique naming if needed by autosave
    const uniqueProId = generateUniqueId('proItem_');
    return `<div class="pros-item" data-pro-id="${uniqueProId}">
             <span class="remove-pro-item action-icon" title="Remove Pro">&#10006;</span>
             <span class="icon-pros">&#10003;</span>
             <input type="text" class="pro-input" value="${proValue}" placeholder="Enter a pro">
           </div>`;
           // Note: Name attribute for pro/con inputs will be handled by JS when collecting data for submission/autosave
           // to build the sections[instanceId][data][pros][] array.
  }

  function newConsItemRow(sectionInstanceId, conValue = "") { // Added sectionInstanceId
    const uniqueConId = generateUniqueId('conItem_');
    return `<div class="cons-item" data-con-id="${uniqueConId}">
             <span class="remove-cons-item action-icon" title="Remove Con">&#10006;</span>
             <span class="icon-cons">&#10007;</span>
             <input type="text" class="con-input" value="${conValue}" placeholder="Enter a con">
           </div>`;
  }

  // This function might be deprecated if previews are handled more directly.
  // Kept for now if other parts of the system still rely on it.
  function renderPolaroid(imageSrc, type) {
    var html = '<div class="polaroid">';
    html += '<div class="polaroid-image">';
    if (imageSrc) {
      html += '<img src="' + imageSrc + '" alt="Uploaded Photo">';
    } else {
      html += '<img src="img/placeholder.png" alt="Image Placeholder">';
    }
    html += '</div>';
    html += '<input type="text" class="polaroid-caption instance-caption" placeholder="Enter caption (optional)">';
    html += '<button type="button" class="remove-photo">Remove</button>';
    html += '</div>';
    return html;
  }

  /**
   * getSectionTemplate():
   * Returns an HTML string for a section based on its type.
   * 'defaults' object can preset content (now structured for image/gallery sections).
   */
  function getSectionTemplate(sectionId, defaults) {
    defaults = defaults || {};
    let sectionInstanceId = (defaults && defaults.instanceId) || generateUniqueId('section_' + sectionId + '_');
    let html = '';

    html += `<div class="modular-section" data-type="${sectionId}" data-section-instance-id="${sectionInstanceId}">`;

    if (parseInt(sectionId) === RATING_SECTION) {
      html += '<span class="padlock-icon">&#128274;</span>';
    } else {
      html += '<span class="drag-handle no-select">☰</span>';
    }
    html += '<span class="remove-section-btn action-icon" title="Remove this entire section">&#10006;</span>';
    // This hidden input sends the type to the backend.
    html += `<input type="hidden" name="sections[${sectionInstanceId}][type]" value="${sectionId}">`;


    switch(parseInt(sectionId)) {
      case SUBTITLE_SECTION:
        html += '<h3>Subtitle</h3>';
        html += `<input type="text" name="sections[${sectionInstanceId}][content][subtitle]" placeholder="Enter subtitle" value="${(defaults.content && defaults.content.subtitle) || ''}">`;
        break;
      case TEXT_SECTION:
        html += '<h3>Text</h3>';
        html += `<textarea name="sections[${sectionInstanceId}][content][text]" placeholder="Enter text content...">${(defaults.content && defaults.content.text) || ''}</textarea>`;
        break;

      case IMAGE_SECTION:
        let imgSrc = 'img/placeholder.png';
        let imgInfo = 'No image selected.';
        let assetIdVal = '';
        let variantIdVal = '';
        let captionOverrideVal = '';
        let altOverrideVal = '';
        let removeBtnStyle = 'display:none;';

        if (defaults.data) {
            assetIdVal = defaults.data.asset_id || '';
            variantIdVal = defaults.data.variant_id || '';
            captionOverrideVal = defaults.data.caption_override || '';
            altOverrideVal = defaults.data.alt_text_override || '';
            if (defaults.data.preview_url) { // Assuming autosave/restore provides a preview_url
                imgSrc = defaults.data.preview_url;
            }
            if (assetIdVal) {
                imgInfo = `Asset: ${assetIdVal}` + (variantIdVal ? `, Variant: ${variantIdVal}` : '');
                removeBtnStyle = '';
            }
        }

        html += '<h3>Image Section</h3>';
        html += `<div class="section-image-controls" data-parent-instance-id="${sectionInstanceId}">`;
        html += '  <div class="section-image-preview-container">';
        html += `    <img src="${imgSrc}" alt="Image Section Preview" class="section-image-preview" style="max-width: 300px; max-height: 200px; border: 1px solid #555; display: block; margin-bottom:10px; background-color: #222;">`;
        html += '  </div>';
        html += `  <button type="button" class="btn-select-section-image">Select / Edit Image</button>`;
        html += `  <button type="button" class="btn-remove-section-image" style="${removeBtnStyle}">Remove Image</button>`;
        html += `  <div class="section-image-info" style="font-size: 0.8em; color: #aaa; margin-top: 5px;">${imgInfo}</div>`;
        html += '</div>';
        html += `<input type="hidden" name="sections[${sectionInstanceId}][data][asset_id]" class="section-asset-id-input" value="${assetIdVal}">`;
        html += `<input type="hidden" name="sections[${sectionInstanceId}][data][variant_id]" class="section-variant-id-input" value="${variantIdVal}">`;
        html += `<label for="section_caption_${sectionInstanceId}">Image Caption (override):</label>`;
        html += `<input type="text" id="section_caption_${sectionInstanceId}" name="sections[${sectionInstanceId}][data][caption_override]" placeholder="Optional caption for this specific placement" value="${captionOverrideVal}">`;
        html += `<label for="section_alt_text_${sectionInstanceId}">Image Alt Text (override):</label>`;
        html += `<input type="text" id="section_alt_text_${sectionInstanceId}" name="sections[${sectionInstanceId}][data][alt_text_override]" placeholder="Optional alt text for this specific placement" value="${altOverrideVal}">`;
        // Dropzone for drag-and-drop/paste directly onto this section
        html += `<div class="dropzone dropzone-image section-specific-dropzone" style="margin-top:10px; padding:20px; border:2px dashed #777; text-align:center; color:#999;">Drop image here or Paste (Ctrl+V)</div>`;
        break;

      case VIDEO_SECTION:
        html += '<h3>Video</h3>';
        html += `<input type="text" name="sections[${sectionInstanceId}][content][video_url]" placeholder="Enter video URL (YouTube, Vimeo, etc.)" value="${(defaults.content && defaults.content.video_url) || ''}">`;
        // Consider adding a preview for video URLs if possible/desired
        break;

      case GALLERY_SECTION:
        html += '<h3>Gallery Section</h3>';
        html += `<div class="section-gallery-controls" data-parent-instance-id="${sectionInstanceId}">`;
        html += `  <button type="button" class="btn-add-gallery-image">Add Image(s) to Gallery</button>`;
        html += `  <div class="dropzone dropzone-gallery section-specific-dropzone" style="margin-top:10px; padding:20px; border:2px dashed #777; text-align:center; color:#999;">Drop images here or Paste (Ctrl+V)</div>`;
        html += '</div>';
        html += `<div class="gallery-preview-container section-gallery-items-container sortable-gallery" data-parent-instance-id="${sectionInstanceId}">`;
        if (defaults.data && defaults.data.images && Array.isArray(defaults.data.images)) {
            defaults.data.images.forEach(imgRef => {
                // This preview will be very basic. Actual image src would need to be fetched.
                // The `gallery-item-preview` div will need `data-asset-id` and `data-variant-id`
                // for JS to manage it.
                html += `<div class="gallery-item-preview" 
                              data-asset-id="${imgRef.asset_id || ''}" 
                              data-variant-id="${imgRef.variant_id || ''}" 
                              style="display:inline-block; margin:5px; padding:5px; border:1px solid #444; background:#333; text-align:center;">
                           <img src="${imgRef.preview_url || 'img/placeholder_small.png'}" alt="Gallery item" style="width:80px; height:80px; object-fit:cover; display:block; margin-bottom:5px;">
                           <span style="font-size:0.8em; color:#ccc;">A:${imgRef.asset_id || 'N/A'}${imgRef.variant_id ? ' V:'+imgRef.variant_id : ''}</span>
                           <input type="text" class="gallery-item-caption-override" value="${imgRef.caption_override || ''}" placeholder="Caption" style="width:80px; font-size:0.8em; margin-top:3px;">
                           <button type="button" class="remove-gallery-item-btn action-icon" title="Remove from gallery">&#10006;</button>
                         </div>`;
            });
        }
        html += '</div>';
        // JS will be responsible for collecting data from these items and populating a single hidden field for submission
        // For autosave, the JS model of the gallery (array of objects) will be saved.
        // For submission, JS will serialize this array into a hidden input before form submit.
        html += `<input type="hidden" name="sections[${sectionInstanceId}][data][gallery_images_json]" class="gallery-images-json-input" value='${(defaults.data && defaults.data.images) ? JSON.stringify(defaults.data.images).replace(/'/g, "&apos;") : "[]"}'>`;
        break;

      case QUOTE_SECTION:
        html += '<h3>Quote</h3>';
        html += `<textarea name="sections[${sectionInstanceId}][content][quote_text]" placeholder="Enter the quote...">${(defaults.content && defaults.content.quote_text) || ''}</textarea>`;
        html += `<label for="quote_author_${sectionInstanceId}">Quote Author/Source:</label>`;
        html += `<input type="text" id="quote_author_${sectionInstanceId}" name="sections[${sectionInstanceId}][content][quote_author]" placeholder="Author/Source (optional)" value="${(defaults.content && defaults.content.quote_author) || ''}">`;
        break;

      case PROS_CONS_SECTION:
        html += '<h3>Pros and Cons</h3>';
        html += `<div class="pros-cons-wrapper" data-parent-instance-id="${sectionInstanceId}">`;
        html += '  <div class="pros-column">';
        html += '    <h4>Pros <button type="button" class="btn-add-pro action-icon" title="Add Pro">+</button></h4>';
        html += '    <div class="pros-items-container">';
        if (defaults.data && defaults.data.pros && Array.isArray(defaults.data.pros)) {
            defaults.data.pros.forEach(pro => html += newProsItemRow(sectionInstanceId, pro));
        } else { html += newProsItemRow(sectionInstanceId); } // Add one by default
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="cons-column">';
        html += '    <h4>Cons <button type="button" class="btn-add-con action-icon" title="Add Con">+</button></h4>';
        html += '    <div class="cons-items-container">';
        if (defaults.data && defaults.data.cons && Array.isArray(defaults.data.cons)) {
            defaults.data.cons.forEach(con => html += newConsItemRow(sectionInstanceId, con));
        } else { html += newConsItemRow(sectionInstanceId); } // Add one by default
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
        // For submission, JS will collect .pro-input and .con-input values into hidden fields
        // named sections[${sectionInstanceId}][data][pros][] and sections[${sectionInstanceId}][data][cons][]
        // before the form is submitted. Autosave will handle the JS model.
        html += `<input type="hidden" class="pros-cons-data-input" name="sections[${sectionInstanceId}][data_json]">`;
        break;

      case RATING_SECTION:
        const currentRating = (defaults.content && typeof defaults.content.rating_value !== 'undefined') ? parseInt(defaults.content.rating_value) : 0;
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="star rating-star ${i <= currentRating ? 'selected' : ''}" data-value="${i}" title="${i} star${i > 1 ? 's' : ''}">&#9734;</span>`;
        }
        html += '<label>Rating:</label>';
        html += `<div class="rating-widget" data-parent-instance-id="${sectionInstanceId}">${starsHtml}</div>`;
        html += `<input type="hidden" class="section-rating-value-input" name="sections[${sectionInstanceId}][content][rating_value]" value="${currentRating}">`;
        html += `<label for="verdict_${sectionInstanceId}">Verdict/Closing Thoughts:</label>`;
        html += `<textarea id="verdict_${sectionInstanceId}" name="sections[${sectionInstanceId}][content][verdict_text]" placeholder="Enter closing thoughts...">${(defaults.content && defaults.content.verdict_text) || ''}</textarea>`;
        break;
      default:
        html += '<h3>Unknown Section Type</h3>';
        html += `<div class="section-content-unknown">Content for type ${sectionId}</div>`;
    }

    // The "Remove Section" button was moved to the top beside the drag handle for consistency
    // html += '<button type="button" class="remove-section-btn action-icon" title="Remove this entire section">Remove Section</button>';
    html += '</div>'; // close .modular-section
    return html;
  }

  /**
   * addSection():
   * Uses getSectionTemplate() to build a new section, appends it, binds events.
   */
  function addSection(sectionId, defaults) {
    sectionId = parseInt(sectionId);
    if (!sectionId) return;

    var sectionHtml = getSectionTemplate(sectionId, defaults);
    var $sectionElem = $(sectionHtml);

    // Bind removal for the main section
    $sectionElem.find(".remove-section-btn").on("click", function(){ // Changed selector
      var $parentSection = $(this).closest(".modular-section");
      var removedSectionType = parseInt($parentSection.attr("data-type"));
      $parentSection.fadeOut(300, function() { $(this).remove(); });
      toggleBottomSectionSelector();
      if (removedSectionType === RATING_SECTION) {
        $("#section-type-selector-top option[value='" + RATING_SECTION + "']").prop("disabled", false);
        $("#section-type-selector-bottom option[value='" + RATING_SECTION + "']").prop("disabled", false);
      }
      $(document).trigger("section:removed", [removedSectionType, $parentSection.data('section-instance-id')]);
      $('#article-form').trigger('input'); // For autosave
    });

    if (sectionId === RATING_SECTION) {
      $("#section-type-selector-top option[value='" + RATING_SECTION + "']").prop("disabled", true);
      $("#section-type-selector-bottom option[value='" + RATING_SECTION + "']").prop("disabled", true);
    }

    var $ratingSection = $("#sections-container .modular-section[data-type='" + RATING_SECTION + "']");
    if (sectionId === RATING_SECTION) {
      $("#sections-container").append($sectionElem);
    } else {
      if ($ratingSection.length > 0) {
        $ratingSection.first().before($sectionElem);
      } else {
        $("#sections-container").append($sectionElem);
      }
    }
    $sectionElem.hide().fadeIn(300);
    toggleBottomSectionSelector();

    // Trigger event for additional bindings (dropzones, UIE interactions, pros/cons, rating stars)
    // Pass the section element, its type ID, the defaults used, and its new unique instanceId
    $(document).trigger("section:added", [$sectionElem, sectionId, defaults, $sectionElem.data('section-instance-id')]);
    $('#article-form').trigger('input'); // For autosave
  }

  function toggleBottomSectionSelector(){
    var count = $("#sections-container .modular-section").length;
    if(count > 0){
      $("#section-type-selector-bottom").show();
    } else {
      $("#section-type-selector-bottom").hide();
    }
  }

  function initSections(){
    $("#section-type-selector-top, #section-type-selector-bottom").on("change", function(){
         addSection($(this).val()); // Defaults will be empty for new sections from selector
         $(this).val("");
         toggleBottomSectionSelector();
    });

    $("#sections-container").sortable({
         items: "> div.modular-section:not([data-type='" + RATING_SECTION + "'])",
         handle: ".drag-handle",
         placeholder: "section-sortable-placeholder",
         forcePlaceholderSize: true,
         start: function(event, ui) {
             ui.placeholder.height(ui.item.outerHeight());
         },
         update: function(event, ui) {
            $('#article-form').trigger('input');
         }
    });
    $("#sections-container .modular-section[data-type='" + RATING_SECTION + "'] .drag-handle").hide();
  }

  return {
    init: initSections,
    addSection: addSection,
    getSectionTemplate: getSectionTemplate,
    // Expose helpers if addarticle_interactions.js needs them for dynamic content within sections
    newProsItemRow: newProsItemRow,
    newConsItemRow: newConsItemRow
  };
})(jQuery);
