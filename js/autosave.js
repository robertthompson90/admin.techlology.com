// js/autosave.js
// Version 2.0 - Updated for structured data, media asset/variant IDs, and all section types.

var Autosave = (function($){
  var autosaveInterval = 30000; // 30 seconds
  var debounceDelay = 3000;    // 3 seconds after last input
  var autosaveTimer;
  var isSaving = false;

  // Section type constants (must match js/sections.js and DB)
  const SUBTITLE_SECTION = 1;
  const TEXT_SECTION     = 2;
  const IMAGE_SECTION    = 3;
  const VIDEO_SECTION    = 4;
  const GALLERY_SECTION  = 5;
  const QUOTE_SECTION    = 6;
  const PROS_CONS_SECTION= 7;
  const RATING_SECTION   = 8;

  function debounce(func, delay) {
    var timer;
    return function() {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function(){
        func.apply(context, args);
      }, delay);
    };
  }

  /**
   * Captures the current state of the article form, including dynamic sections
   * with their new structured data (asset/variant IDs, etc.).
   * @returns {Object} state - A JSON-friendly state object.
   */
  function captureFormState() {
    console.log("[Autosave] Capturing form state...");
    var state = {
      title: $('#title').val(),
      tagline: $('#tagline').val(),
      thumbnail: { // Store thumbnail as an object
        asset_id: $('#thumbnail_media_asset_id').val() || null,
        variant_id: $('#thumbnail_media_variant_id').val() || null,
        // Storing preview_url might be useful for faster restore, if available
        preview_url: $('#articleThumbnailPreview').attr('src') !== 'img/placeholder.png' ? $('#articleThumbnailPreview').attr('src') : null
      },
      seo_title: $('#seo_title').val(),
      meta_description: $('#meta_description').val(),
      selected_tags_string: $('#selected_tags_input').val(), // Keep existing tag string for now
      sections: []
    };

    $("#sections-container .modular-section").each(function(){
      var $section = $(this);
      var sectionInstanceId = $section.data('section-instance-id');
      var sectionType = parseInt($section.data('type'), 10);
      var sectionEntry = {
        instanceId: sectionInstanceId, // Preserve instanceId for accurate restoration
        type: sectionType,
        content: {}, // For simpler sections like subtitle, text, video, quote, rating verdict
        data: {}     // For more complex data like image, gallery, pros/cons, rating value
      };

      switch(sectionType) {
        case SUBTITLE_SECTION:
          sectionEntry.content.subtitle = $section.find(`input[name="sections[${sectionInstanceId}][content][subtitle]"]`).val();
          break;
        case TEXT_SECTION:
          sectionEntry.content.text = $section.find(`textarea[name="sections[${sectionInstanceId}][content][text]"]`).val();
          break;
        case IMAGE_SECTION:
          sectionEntry.data.asset_id = $section.find('.section-asset-id-input').val() || null;
          sectionEntry.data.variant_id = $section.find('.section-variant-id-input').val() || null;
          sectionEntry.data.caption_override = $section.find(`input[name="sections[${sectionInstanceId}][data][caption_override]"]`).val();
          sectionEntry.data.alt_text_override = $section.find(`input[name="sections[${sectionInstanceId}][data][alt_text_override]"]`).val();
          sectionEntry.data.preview_url = $section.find('.section-image-preview').attr('src') !== 'img/placeholder.png' ? $section.find('.section-image-preview').attr('src') : null;
          break;
        case VIDEO_SECTION:
          sectionEntry.content.video_url = $section.find(`input[name="sections[${sectionInstanceId}][content][video_url]"]`).val();
          break;
        case GALLERY_SECTION:
          let galleryImagesJson = $section.find('.gallery-images-json-input').val();
          try {
            sectionEntry.data.images = JSON.parse(galleryImagesJson || '[]');
          } catch (e) {
            console.error("Error parsing gallery JSON for autosave:", e, galleryImagesJson);
            sectionEntry.data.images = [];
          }
          // Potentially capture other gallery settings like layout_style if they exist
          break;
        case QUOTE_SECTION:
          sectionEntry.content.quote_text = $section.find(`textarea[name="sections[${sectionInstanceId}][content][quote_text]"]`).val();
          sectionEntry.content.quote_author = $section.find(`input[name="sections[${sectionInstanceId}][content][quote_author]"]`).val();
          break;
        case PROS_CONS_SECTION:
          sectionEntry.data.pros = [];
          $section.find('.pros-items-container .pro-input').each(function() {
            sectionEntry.data.pros.push($(this).val());
          });
          sectionEntry.data.cons = [];
          $section.find('.cons-items-container .con-input').each(function() {
            sectionEntry.data.cons.push($(this).val());
          });
          break;
        case RATING_SECTION:
          sectionEntry.content.rating_value = $section.find('.section-rating-value-input').val();
          sectionEntry.content.verdict_text = $section.find(`textarea[name="sections[${sectionInstanceId}][content][verdict_text]"]`).val();
          break;
        default:
          console.warn("Autosave: Unknown section type encountered:", sectionType);
          sectionEntry.content.raw = "Unrecognized section data"; // Fallback
      }
      state.sections.push(sectionEntry);
    });
    console.log("[Autosave] Captured State:", state);
    return state;
  }
  window.captureFormState = captureFormState; // Expose for UndoRedo if needed

  function saveDraftLocally() {
    var state = captureFormState();
    localStorage.setItem("articleDraft", JSON.stringify(state));
    $("#autosave-status").text("Draft saved locally at " + new Date().toLocaleTimeString());
  }

  /**
   * Restores the form state from a saved state object.
   * @param {Object} state - The state object to restore.
   */
  function restoreFormState(state) {
    console.log("[Autosave] Restoring form state:", state);
    if (!state) return;

    $('#title').val(state.title || '');
    $('#tagline').val(state.tagline || '');
    $('#seo_title').val(state.seo_title || '');
    $('#meta_description').val(state.meta_description || '');

    // Restore Thumbnail
    if (state.thumbnail) {
        $('#thumbnail_media_asset_id').val(state.thumbnail.asset_id || '');
        $('#thumbnail_media_variant_id').val(state.thumbnail.variant_id || '');
        if (state.thumbnail.asset_id && state.thumbnail.preview_url && state.thumbnail.preview_url !== 'img/placeholder.png') {
            $('#articleThumbnailPreview').attr('src', state.thumbnail.preview_url);
            let infoText = `Asset: ${state.thumbnail.asset_id}`;
            if(state.thumbnail.variant_id) infoText += `, Variant: ${state.thumbnail.variant_id}`;
            $('#thumbnailInfo').text(infoText);
            $('#removeThumbnailBtn').show();
        } else {
            $('#articleThumbnailPreview').attr('src', 'img/placeholder.png');
            $('#thumbnailInfo').text('No thumbnail selected.');
            $('#removeThumbnailBtn').hide();
        }
    }

    // Restore Tags (assuming TagSystem.js has a way to init with a string or array)
    if (state.selected_tags_string) {
        // This part depends on how TagSystem is re-initialized.
        // If TagSystem.init can take a comma-separated string and populate:
        // $('#tags').val(state.selected_tags_string).trigger('blur'); // or a custom populate function
        // For now, we assume TagSystem might need manual re-adding or a dedicated restore function.
        // A simpler approach for now: if tags are just stored as string for submission, set the hidden input.
        $('#selected_tags_input').val(state.selected_tags_string);
        // JS for displaying tags as pills would need to re-run based on this hidden input.
        // This might require calling a function in tags.js to parse and display.
        if (typeof TagSystem !== 'undefined' && TagSystem.loadTagsFromString) { // Hypothetical function
            TagSystem.loadTagsFromString(state.selected_tags_string);
        } else {
            console.warn("[Autosave] TagSystem.loadTagsFromString not available for restoring tag pills.");
        }
    }


    // Clear existing sections before restoring
    $("#sections-container").empty();
    if (state.sections && Array.isArray(state.sections)) {
      state.sections.forEach(function(sectionData) {
        // Pass the entire sectionData object as 'defaults' to addSection.
        // Sections.addSection will use sectionData.type, sectionData.instanceId,
        // sectionData.content, and sectionData.data to reconstruct the section.
        if (typeof Sections !== 'undefined' && Sections.addSection) {
          Sections.addSection(sectionData.type, sectionData);
        } else {
          console.error("[Autosave] Sections module or Sections.addSection function not found!");
        }
      });
    }
    // After all sections are added, trigger input for autosave and update UI elements
    $('#article-form').trigger('input');
    if (typeof FormNavigation !== 'undefined' && FormNavigation.showStep) { // If FormNavigation is used
        let currentStep = parseInt(localStorage.getItem("addArticleStep"), 10) || 0;
        FormNavigation.showStep(currentStep); // Re-apply current step view
    }
  }
  window.restoreFormState = restoreFormState; // Expose for UndoRedo

  function restoreDraft() {
    var savedDraftJson = localStorage.getItem("articleDraft");
    if (savedDraftJson) {
      try {
        var state = JSON.parse(savedDraftJson);
        restoreFormState(state);
        $("#autosave-status").text("Draft restored from local storage at " + new Date().toLocaleTimeString());
        Notifications.show("Draft restored from local storage", "info");
      } catch(err) {
        console.error("Error restoring draft from localStorage:", err);
        $("#autosave-status").text("Error restoring draft.");
      }
    }
  }

  function sendDraftToServer() {
    if (isSaving) return;
    isSaving = true;
    $("#autosave-status").text("Autosaving to server...");
    var state = captureFormState();
    $.ajax({
      url: "ajax/autosave.php",
      type: "POST",
      data: { article_draft_data: JSON.stringify(state) }, // Changed key for clarity
      success: function(response) {
        if (response && response.success) {
            $("#autosave-status").text("Draft autosaved on server at " + new Date().toLocaleTimeString());
            Notifications.show("Draft autosaved on server", "info");
        } else {
            $("#autosave-status").text("Error autosaving on server: " + (response.error || "Unknown issue"));
            Notifications.show("Autosave server error: " + (response.error || "Unknown issue"), "error");
        }
        isSaving = false;
      },
      error: function(jqXHR, textStatus, errorThrown) {
        $("#autosave-status").text("AJAX error autosaving on server: " + textStatus);
        Notifications.show("Autosave server AJAX error", "error");
        isSaving = false;
      }
    });
  }

  var debouncedAutosave = debounce(function(){
      saveDraftLocally();
      sendDraftToServer();
      if (typeof UndoRedo !== 'undefined' && UndoRedo.pushState) { // Check if UndoRedo is available
        UndoRedo.pushState();
      }
  }, debounceDelay);

  function init() {
    restoreDraft(); // Restore on page load

    // Listen for input on the entire form
    $("#article-form").on("input change", "input, textarea, select", debouncedAutosave);

    // Also listen for custom events that signify a change needing autosave
    $(document).on("section:added section:removed section:sorted gallery:item_added gallery:item_removed gallery:item_caption_changed", debouncedAutosave);
    // Note: 'gallery:item_sorted' would be triggered by sortable's update callback if you implement that fully.
    // For Pros/Cons, the input events on their text fields should trigger autosave.

    // Periodic autosave (less frequent, as a fallback)
    autosaveTimer = setInterval(function(){
      // No need to call pushState here, as it's not a direct user action for undo/redo
      saveDraftLocally();
      sendDraftToServer();
    }, autosaveInterval);

    // Push initial state for Undo/Redo after everything is loaded and potentially restored
    if (typeof UndoRedo !== 'undefined' && UndoRedo.init && UndoRedo.pushState) {
        UndoRedo.init(); // Ensure UndoRedo is initialized
        // A slight delay to ensure all dynamic content (like restored sections) is in place
        setTimeout(function() {
            UndoRedo.pushState();
            console.log("[Autosave] Initial state pushed for Undo/Redo.");
        }, 500);
    }
  }

  return {
    init: init,
    restoreDraft: restoreDraft, // Expose if needed externally
    captureState: captureFormState, // Expose for other modules like UndoRedo
    restoreState: restoreFormState  // Expose for other modules
  };
})(jQuery);
