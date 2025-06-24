// js/sections.js
// Version 2.4 - Final Dropzone-First Templates for Image/Gallery. Font Awesome icons.
//               All section constants defined. Uses global placeholders.
//               Corrected imgInfoText variable name. img src cleared for empty.

var Sections = (function($){
  const SUBTITLE_SECTION = 1;
  const TEXT_SECTION     = 2;
  const IMAGE_SECTION    = 3;
  const VIDEO_SECTION    = 4;
  const GALLERY_SECTION  = 5;
  const QUOTE_SECTION    = 6; 
  const PROS_CONS_SECTION= 7;
  const RATING_SECTION   = 8;

  function generateUniqueId(prefix = 'sectionInstance_') {
    return prefix + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function newProsItemRow(sectionInstanceId, proValue = "") {
    const uniqueProId = generateUniqueId('proItem_');
    return `<div class="pros-item" data-pro-id="${uniqueProId}">
             <span class="remove-pro-item action-icon" title="Remove Pro"><i class="fas fa-minus-circle"></i></span>
             <span class="icon-pros"><i class="fas fa-check-circle"></i></span>
             <input type="text" class="pro-input" value="${proValue}" placeholder="Enter a pro">
           </div>`;
  }

  function newConsItemRow(sectionInstanceId, conValue = "") {
    const uniqueConId = generateUniqueId('conItem_');
    return `<div class="cons-item" data-con-id="${uniqueConId}">
             <span class="remove-cons-item action-icon" title="Remove Con"><i class="fas fa-minus-circle"></i></span>
             <span class="icon-cons"><i class="fas fa-times-circle"></i></span>
             <input type="text" class="con-input" value="${conValue}" placeholder="Enter a con">
           </div>`;
  }
  
  function getSectionTemplate(sectionId, defaults) {
    defaults = defaults || {};
    let sectionInstanceId = (defaults && defaults.instanceId) || generateUniqueId('section_' + sectionId + '_');
    let html = '';

    html += `<div class="modular-section" data-type="${sectionId}" data-section-instance-id="${sectionInstanceId}">`;

    if (parseInt(sectionId) === RATING_SECTION) {
      html += '<span class="padlock-icon action-icon" title="Rating section is fixed at the bottom"><i class="fas fa-lock"></i></span>';
    } else {
      html += '<span class="drag-handle no-select action-icon" title="Drag to reorder"><i class="fas fa-grip-lines"></i></span>';
    }
    html += '<span class="remove-section-btn action-icon" title="Remove this entire section"><i class="fas fa-trash-alt"></i></span>';
    html += `<input type="hidden" name="sections[${sectionInstanceId}][type]" value="${sectionId}">`;

    let placeholderImgGlobal = typeof G_PLACEHOLDER_IMAGE_PATH !== 'undefined' ? G_PLACEHOLDER_IMAGE_PATH : 'img/placeholder.png';
    let placeholderSmallImgGlobal = typeof G_PLACEHOLDER_SMALL_IMAGE_PATH !== 'undefined' ? G_PLACEHOLDER_SMALL_IMAGE_PATH : 'img/placeholder_small.png';

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
        let imgSrc = (defaults.data && defaults.data.preview_url && defaults.data.preview_url !== placeholderImgGlobal) ? defaults.data.preview_url : '';
        let imgInfoTextForDisplay = 'Click, Drop, or Paste Image';
        let assetIdVal = (defaults.data && defaults.data.asset_id) || '';
        let variantIdVal = (defaults.data && defaults.data.variant_id) || '';
        let captionOverrideVal = (defaults.data && defaults.data.caption_override) || '';
        let altOverrideVal = (defaults.data && defaults.data.alt_text_override) || '';
        let hasImage = !!assetIdVal;

        if (hasImage) { imgInfoTextForDisplay = `Asset: ${assetIdVal}` + (variantIdVal ? `, Variant: ${variantIdVal}` : ''); }

        html += '<h3>Image Section</h3>';
        html += `<div class="section-image-module" data-parent-instance-id="${sectionInstanceId}">`;
        html += `  <div class="section-image-interactive-area dropzone section-specific-dropzone ${hasImage ? 'has-image' : 'no-image'}" data-target-type="sectionImage" title="${hasImage ? 'Click to Change/Edit Image' : 'Click, Drop, or Paste Image'}">`;
        html += `    <div class="section-image-preview-container ${hasImage ? '' : 'empty-preview'}" style="${hasImage ? '' : 'display:none;'}">`; // Start hidden if no image
        html += `      <img src="${imgSrc}" alt="Image Section Preview" class="section-image-preview">`; // Src can be empty initially
        html += `    </div>`;
        html += `    <span class="section-image-info media-item-title" style="${hasImage ? '' : 'display:none;'}">${imgInfoTextForDisplay}</span>`;
        html += `    <div class="dropzone-placeholder-text" style="${hasImage ? 'display:none;' : ''}"><i class="fas fa-image"></i> Click, Drop, or Paste Image</div>`;
        html += `  </div>`;
        html += `  <div class="section-image-actions" style="${hasImage ? 'display:flex;' : 'display:none;'}">`;
        html += `    <button type="button" class="btn btn-change-edit-section-image action-icon" title="Change/Edit Image"><i class="fas fa-edit"></i></button>`;
        html += `    <button type="button" class="btn btn-remove-section-image action-icon" title="Remove Image"><i class="fas fa-trash-alt"></i></button>`;
        html += `  </div>`;
        html += '</div>';
        html += `<input type="hidden" name="sections[${sectionInstanceId}][data][asset_id]" class="section-asset-id-input" value="${assetIdVal}">`;
        html += `<input type="hidden" name="sections[${sectionInstanceId}][data][variant_id]" class="section-variant-id-input" value="${variantIdVal}">`;
        html += `<label for="section_caption_${sectionInstanceId}">Image Caption (override):</label>`;
        html += `<input type="text" id="section_caption_${sectionInstanceId}" name="sections[${sectionInstanceId}][data][caption_override]" placeholder="Optional caption for this specific placement" value="${captionOverrideVal}">`;
        html += `<label for="section_alt_text_${sectionInstanceId}">Image Alt Text (override):</label>`;
        html += `<input type="text" id="section_alt_text_${sectionInstanceId}" name="sections[${sectionInstanceId}][data][alt_text_override]" placeholder="Optional alt text for this specific placement" value="${altOverrideVal}">`;
        break;
      case VIDEO_SECTION:
        html += '<h3>Video</h3>';
        html += `<input type="text" name="sections[${sectionInstanceId}][content][video_url]" placeholder="Enter video URL (YouTube, Vimeo, etc.)" value="${(defaults.content && defaults.content.video_url) || ''}">`;
        break;
      case GALLERY_SECTION:
        html += '<h3>Gallery Section</h3>';
        html += `<div class="section-gallery-controls" data-parent-instance-id="${sectionInstanceId}">`;
        html += `  <div class="dropzone dropzone-gallery section-specific-dropzone" data-target-type="galleryImageAddition" title="Click, Drop, or Paste Images for Gallery"><i class="fas fa-images"></i> Drop images here or Click/Paste to Add to Gallery</div>`;
        html += '</div>';
        html += `<div class="gallery-preview-container section-gallery-items-container sortable-gallery" data-parent-instance-id="${sectionInstanceId}">`;
        if (defaults.data && defaults.data.images && Array.isArray(defaults.data.images)) {
            defaults.data.images.forEach((imgRef, index) => {
                html += `<div class="gallery-item-preview" data-asset-id="${imgRef.asset_id || ''}" data-variant-id="${imgRef.variant_id || ''}" data-array-index="${index}">
                           <img src="${imgRef.preview_url || placeholderSmallImgGlobal}" alt="Gallery item">
                           <span class="gallery-item-info">A:${imgRef.asset_id || 'N/A'}${imgRef.variant_id ? ' V:'+imgRef.variant_id : ''}</span>
                           <input type="text" class="gallery-item-caption-override" value="${imgRef.caption_override || ''}" placeholder="Caption">
                           <div class="gallery-item-actions">
                             <button type="button" class="edit-gallery-item-btn action-icon" title="Edit Image"><i class="fas fa-edit"></i></button>
                             <button type="button" class="remove-gallery-item-btn action-icon" title="Remove from gallery"><i class="fas fa-times"></i></button>
                           </div>
                         </div>`;
            });
        }
        html += '</div>';
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
        html += '    <h4>Pros <button type="button" class="btn-add-pro action-icon" title="Add Pro"><i class="fas fa-plus-circle"></i></button></h4>';
        html += '    <div class="pros-items-container">';
        if (defaults.data && defaults.data.pros && Array.isArray(defaults.data.pros)) {
            defaults.data.pros.forEach(pro => html += newProsItemRow(sectionInstanceId, pro));
        } else { html += newProsItemRow(sectionInstanceId); }
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="cons-column">';
        html += '    <h4>Cons <button type="button" class="btn-add-con action-icon" title="Add Con"><i class="fas fa-plus-circle"></i></button></h4>';
        html += '    <div class="cons-items-container">';
        if (defaults.data && defaults.data.cons && Array.isArray(defaults.data.cons)) {
            defaults.data.cons.forEach(con => html += newConsItemRow(sectionInstanceId, con));
        } else { html += newConsItemRow(sectionInstanceId); }
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
        html += `<input type="hidden" class="pros-cons-data-input" name="sections[${sectionInstanceId}][data_json]">`;
        break;
      case RATING_SECTION:
        const currentRating = (defaults.content && typeof defaults.content.rating_value !== 'undefined') ? parseInt(defaults.content.rating_value) : 0;
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="star rating-star ${i <= currentRating ? 'selected' : ''}" data-value="${i}" title="${i} star${i > 1 ? 's' : ''}"><i class="${i <= currentRating ? 'fas' : 'far'} fa-star"></i></span>`;
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
    html += '</div>';
    return html;
  }

  function addSection(sectionId, defaults) {
    sectionId = parseInt(sectionId);
    if (!sectionId) return;
    var sectionHtml = getSectionTemplate(sectionId, defaults);
    var $sectionElem = $(sectionHtml);
    $sectionElem.find(".remove-section-btn.action-icon").on("click", function(){ // Ensure targeting the icon version
      var $parentSection = $(this).closest(".modular-section");
      var removedSectionType = parseInt($parentSection.attr("data-type"));
      $parentSection.fadeOut(300, function() { $(this).remove(); });
      toggleBottomSectionSelector();
      if (removedSectionType === RATING_SECTION) {
        $("#section-type-selector-top option[value='" + RATING_SECTION + "']").prop("disabled", false);
        $("#section-type-selector-bottom option[value='" + RATING_SECTION + "']").prop("disabled", false);
      }
      $(document).trigger("section:removed", [removedSectionType, $parentSection.data('section-instance-id')]);
      $('#article-form').trigger('input');
    });
    if (sectionId === RATING_SECTION) {
      $("#section-type-selector-top option[value='" + RATING_SECTION + "']").prop("disabled", true);
      $("#section-type-selector-bottom option[value='" + RATING_SECTION + "']").prop("disabled", true);
    }
    var $ratingSection = $("#sections-container .modular-section[data-type='" + RATING_SECTION + "']");
    if (sectionId === RATING_SECTION) { $("#sections-container").append($sectionElem); }
    else { if ($ratingSection.length > 0) { $ratingSection.first().before($sectionElem); } else { $("#sections-container").append($sectionElem); } }
    $sectionElem.hide().fadeIn(300);
    toggleBottomSectionSelector();
    $(document).trigger("section:added", [$sectionElem, sectionId, defaults, $sectionElem.data('section-instance-id')]);
    $('#article-form').trigger('input');
  }

  function toggleBottomSectionSelector(){
    var count = $("#sections-container .modular-section").length;
    $("#section-type-selector-bottom").toggle(count > 0);
  }

  function initSections(){
    $("#section-type-selector-top, #section-type-selector-bottom").on("change", function(){
         addSection($(this).val()); $(this).val(""); toggleBottomSectionSelector();
    });
    $("#sections-container").sortable({
         items: "> div.modular-section:not([data-type='" + RATING_SECTION + "'])",
         handle: ".drag-handle", placeholder: "section-sortable-placeholder",
         forcePlaceholderSize: true, start: function(event, ui) { ui.placeholder.height(ui.item.outerHeight()); },
         update: function(event, ui) { $('#article-form').trigger('input'); }
    });
    $("#sections-container .modular-section[data-type='" + RATING_SECTION + "'] .drag-handle").hide();
  }

  return {
    init: initSections, addSection: addSection, getSectionTemplate: getSectionTemplate,
    newProsItemRow: newProsItemRow, newConsItemRow: newConsItemRow,
    // Expose constants for addarticle_interactions.js
    IMAGE_SECTION: IMAGE_SECTION,
    GALLERY_SECTION: GALLERY_SECTION,
    PROS_CONS_SECTION: PROS_CONS_SECTION,
    RATING_SECTION: RATING_SECTION
  };
})(jQuery);

// When rendering a new section:
function renderSection(sectionType, sectionData) {
    // ...existing code...
    if (sectionType === 'image') {
        // Use unified dropzone markup and classes
        // <div class="modular-section">
        //   <div class="section-header">Image Section</div>
        //   <div class="unified-dropzone section-image-interactive-area no-image">...</div>
        //   ...fields...
        // </div>
    }
    if (sectionType === 'gallery') {
        // Use unified dropzone markup and classes
        // <div class="modular-section">
        //   <div class="section-header">Gallery Section</div>
        //   <div class="unified-dropzone dropzone-gallery no-image">...</div>
        //   ...fields...
        // </div>
    }
    // ...other section types...
}
