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
    // Fix: define state as an object before populating fields
    const state = {};

    // Capture title, tagline, etc.
    state.title = $('#article-title').val() || '';
    state.tagline = $('#article-tagline').val() || '';
    state.seo_title = $('#seo-title').val() || '';
    state.meta_description = $('#meta-description').val() || '';

    // Capture thumbnail
    const $thumbPolaroid = $('.thumbnail-polaroid-preview.section-polaroid-preview');
    let thumbnail = null;
    if ($thumbPolaroid.length) {
        const assetData = $thumbPolaroid.data('asset-data') || {};
        thumbnail = {
            asset_id: assetData.id || null,
            variant_id: assetData.variant_id || null,
            preview_url: assetData.preview_url || assetData.image_url || null,
            caption_override: $thumbPolaroid.find('.caption-override').val() || '',
            alt_override: $thumbPolaroid.find('.alt-override').val() || ''
        };
    }
    state.thumbnail = thumbnail;

    // Capture sections
    let sections = [];
    $('.modular-section').each(function() {
        const $section = $(this);
        const sectionType = $section.data('section-type-id');
        let sectionObj = {
            type: sectionType,
            instanceId: $section.data('section-instance-id'),
            data: {}
        };
        if (sectionType == '3') {
            const $polaroid = $section.find('.section-polaroid-preview');
            if ($polaroid.length) {
                const assetData = $polaroid.data('asset-data') || {};
                sectionObj.data = {
                    asset_id: assetData.id || null,
                    variant_id: assetData.variant_id || null,
                    preview_url: assetData.preview_url || assetData.image_url || null,
                    caption_override: $polaroid.find('.caption-override').val() || '',
                    alt_text_override: $polaroid.find('.alt-override').val() || ''
                };
            }
        } else if (sectionType == '5') {
            sectionObj.data.images = [];
            $section.find('.gallery-preview-container .section-polaroid-preview').each(function() {
                const assetData = $(this).data('asset-data') || {};
                sectionObj.data.images.push({
                    asset_id: assetData.id || null,
                    variant_id: assetData.variant_id || null,
                    preview_url: assetData.preview_url || assetData.image_url || null,
                    caption_override: $(this).find('.caption-override').val() || '',
                    alt_text_override: $(this).find('.alt-override').val() || ''
                });
            });
        }
        // ...handle other section types as needed...
        sections.push(sectionObj);
    });
    state.sections = sections;

    // Capture tags
    state.tags = [];
    $('.tag-input:checked').each(function() {
        state.tags.push($(this).val());
    });

    // Capture sources
    state.sources = [];
    $('.source-row').each(function() {
        state.sources.push({
            title: $(this).find('.source-title').val() || '',
            url: $(this).find('.source-url').val() || '',
            note: $(this).find('.source-note').val() || ''
        });
    });

    // Capture pros/cons
    state.pros = [];
    $('.pros-items-container .pros-item input[type="text"]').each(function() {
        state.pros.push($(this).val());
    });
    state.cons = [];
    $('.cons-items-container .cons-item input[type="text"]').each(function() {
        state.cons.push($(this).val());
    });

    // Capture rating
    let rating = null;
    const $rating = $('.rating-widget .star.selected');
    if ($rating.length) {
        rating = {
            score: $rating.last().data('value'),
            verdict: $('#rating-verdict').val() || ''
        };
    }
    state.rating = rating;

    // Capture staging assets if present
    if (typeof StagingArea !== 'undefined' && StagingArea.getStagingAssets) {
        state.stagingAssets = StagingArea.getStagingAssets();
    }

    // ...existing code...
    return state;
  }
  window.captureFormState = captureFormState; // Expose for UndoRedo if needed

  function saveDraftLocally() {
    var state = captureFormState();
    try {
      localStorage.setItem("articleDraft", JSON.stringify(state));
      $("#autosave-status").text("Draft saved locally at " + new Date().toLocaleTimeString());
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        $("#autosave-status").text("Local draft not saved: storage quota exceeded.");
        Notifications && Notifications.show && Notifications.show("Local draft not saved: storage quota exceeded.", "warning");
      } else {
        $("#autosave-status").text("Local draft not saved: " + e.message);
        Notifications && Notifications.show && Notifications.show("Local draft not saved: " + e.message, "error");
      }
    }
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
    if (state.thumbnail && state.thumbnail.asset_id) {
        if (typeof showThumbnailPolaroid === 'function') {
            showThumbnailPolaroid($('.thumbnail-dropzone-area'), {
                id: state.thumbnail.asset_id,
                variant_id: state.thumbnail.variant_id,
                preview_url: state.thumbnail.preview_url
            });
            $('.thumbnail-polaroid-preview .caption-override').val(state.thumbnail.caption_override || '');
            $('.thumbnail-polaroid-preview .alt-override').val(state.thumbnail.alt_override || '');
        }
    }
    // Restore sections
    if (state.sections && Array.isArray(state.sections)) {
        state.sections.forEach(function(sectionData, idx) {
            let $section = $('.modular-section[data-section-instance-id="' + sectionData.instanceId + '"]');
            if (!$section.length) $section = $('.modular-section').eq(idx);
            if (sectionData.type == '3' && sectionData.data && sectionData.data.asset_id) {
                if (typeof showSectionPolaroid === 'function') {
                    showSectionPolaroid($section, {
                        id: sectionData.data.asset_id,
                        variant_id: sectionData.data.variant_id,
                        preview_url: sectionData.data.preview_url
                    });
                    $section.find('.caption-override').val(sectionData.data.caption_override || '');
                    $section.find('.alt-override').val(sectionData.data.alt_text_override || '');
                }
            } else if (sectionData.type == '5' && sectionData.data && Array.isArray(sectionData.data.images)) {
                sectionData.data.images.forEach(function(img) {
                    if (typeof showGalleryPolaroid === 'function') {
                        showGalleryPolaroid($section, {
                            id: img.asset_id,
                            variant_id: img.variant_id,
                            preview_url: img.preview_url
                        });
                        $section.find('.gallery-preview-container .section-polaroid-preview[data-asset-id="' + img.asset_id + '"] .caption-override').val(img.caption_override || '');
                        $section.find('.gallery-preview-container .section-polaroid-preview[data-asset-id="' + img.asset_id + '"] .alt-override').val(img.alt_text_override || '');
                    }
                });
            }
            // ...handle other section types as needed...
        });
    }
    // Restore tags
    if (state.tags && Array.isArray(state.tags)) {
        $('.tag-input').prop('checked', false);
        state.tags.forEach(function(tagId) {
            $('.tag-input[value="' + tagId + '"]').prop('checked', true);
        });
    }
    // Restore sources
    if (state.sources && Array.isArray(state.sources)) {
        const $sourcesContainer = $('.sources-container');
        $sourcesContainer.empty();
        state.sources.forEach(function(src) {
            // You may need to adjust this to match your actual source row markup
            $sourcesContainer.append(
                '<div class="source-row">' +
                '<input class="source-title" value="' + (src.title || '') + '">' +
                '<input class="source-url" value="' + (src.url || '') + '">' +
                '<input class="source-note" value="' + (src.note || '') + '">' +
                '</div>'
            );
        });
    }
    // Restore pros/cons
    if (state.pros && Array.isArray(state.pros)) {
        const $prosContainer = $('.pros-items-container');
        $prosContainer.empty();
        state.pros.forEach(function(val) {
            $prosContainer.append('<div class="pros-item"><input type="text" value="' + (val || '') + '"></div>');
        });
    }
    if (state.cons && Array.isArray(state.cons)) {
        const $consContainer = $('.cons-items-container');
        $consContainer.empty();
        state.cons.forEach(function(val) {
            $consContainer.append('<div class="cons-item"><input type="text" value="' + (val || '') + '"></div>');
        });
    }
    // Restore rating
    if (state.rating && state.rating.score) {
        $('.rating-widget .star').removeClass('selected');
        $('.rating-widget .star').each(function() {
            if ($(this).data('value') <= state.rating.score) {
                $(this).addClass('selected');
            }
        });
        $('#rating-verdict').val(state.rating.verdict || '');
    }
    // Restore staging assets
    if (state.stagingAssets && typeof StagingArea !== 'undefined' && StagingArea.setStagingAssets) {
        StagingArea.setStagingAssets(state.stagingAssets);
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
