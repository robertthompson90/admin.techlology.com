// js/autosave.js
var Autosave = (function(){
  // Autosave interval: every 30 seconds.
  var autosaveInterval = 30000;
  // Debounce delay: autosave triggered 3 seconds after last input.
  var debounceDelay = 3000;
  var autosaveTimer;
  var isSaving = false;
  
  // ---------------------------
  // 1. Debounce Helper Function
  // ---------------------------
  /**
   * Returns a debounced version of the provided function.
   * @param {Function} func - The function to debounce.
   * @param {number} delay - Delay in milliseconds.
   */
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
  
  // ----------------------------------------------------
  // 2. Capture the Complete Form State (including sections)
  // ----------------------------------------------------
  
  // Define the section type constants (should match those in Sections module)
  const SUBTITLE_SECTION = 1;
  const TEXT_SECTION     = 2;
  const IMAGE_SECTION    = 3;
  const VIDEO_SECTION    = 4;
  const GALLERY_SECTION  = 5;
  const QUOTE_SECTION    = 6;
  const PROS_CONS_SECTION= 7;
  const RATING_SECTION   = 8;
  
  /**
   * Captures the current state of the article form, including dynamic sections.
   * @returns {Object} state - A JSON-friendly state object.
   */
  function captureFormState() {
    var state = {
      title: $('#title').val(),
      tagline: $('#tagline').val(),
		 	thumbnail: $("input[name='thumbnail_cropped_data']").val() || "",
      seo_title: $('#seo_title').val(),
      meta_description: $('#meta_description').val(),
      sections: []  // To store dynamic sections
    };
  
    // Loop over each dynamically added section.
    $("#sections-container .modular-section").each(function(){
      var $section = $(this);
      var sectionType = parseInt($section.attr("data-type"), 10);
      var content = "";  // Default for storing a primary content string
      var extra = {};    // Optionally store extra data (for pros/cons, captions, etc.)
  
      // Capture values based on section type. Adjust selectors as needed.
      switch(sectionType) {
        case SUBTITLE_SECTION:
          content = $section.find("input[name='section_subtitle[]']").val() || "";
          break;
        case TEXT_SECTION:
          content = $section.find("textarea[name='section_text[]']").val() || "";
          break;
        case IMAGE_SECTION:
          // For images, capture the caption; you might capture other data (like URLs) if needed.
          extra.caption = $section.find("input[name='section_image_caption[]']").val() || "";
					// Capture the cropped image data stored in a hidden input.
				  extra.croppedData = $section.find("input[name='cropped_image_data[]']").val() || "";
          break;
        case VIDEO_SECTION:
          content = $section.find("input[name='section_video[]']").val() || "";
          break;
        case GALLERY_SECTION:
					// For galleries, capture the innerHTML of the gallery container.
					extra.galleryHTML = $section.find(".gallery-container").html() || "";
          break;
        case QUOTE_SECTION:
          content = $section.find("textarea[name='section_quote[]']").val() || "";
          break;
        case PROS_CONS_SECTION:
          // Capture the innerHTML of the pros/cons wrapper.
          extra.prosConsHTML = $section.find(".pros-cons-wrapper").html() || "";
          break;
        case RATING_SECTION:
          content = $section.find("textarea[name='section_verdict[]']").val() || "";
          break;
        default:
          content = $section.html();  // Fallback.
      }
  
      state.sections.push({
        type: sectionType,
        content: content,
        extra: extra    // Optional: allows you to store additional values
      });
    });
    
    return state;
  }
  
  // Expose captureFormState globally so other modules (like UndoRedo) can use it.
  window.captureFormState = captureFormState;
  
  // ----------------------------------
  // 3. Save the Draft Locally in Storage
  // ----------------------------------
  /**
   * Saves the current form state to localStorage.
   */
  function saveDraftLocally() {
    var state = captureFormState();
    localStorage.setItem("articleDraft", JSON.stringify(state));
    $("#autosave-status").text("Draft saved locally at " + new Date().toLocaleTimeString());
  }
  
  // --------------------------------------------------
  // 4. Restore the Complete Form State & Dynamic Sections
  // --------------------------------------------------
  /**
   * Restores static fields and dynamic sections based on the provided state.
   * Uses the Sections module to re-build each dynamic section with placeholders.
   * Assumes that Sections.getSectionTemplate() and Sections.addSection() are available.
   * @param {Object} state - The state object to restore.
   */
  function restoreFormState(state) {
    // Restore static fields.
    $('#title').val(state.title);
    $('#tagline').val(state.tagline);
    $('#seo_title').val(state.seo_title);
    $('#meta_description').val(state.meta_description);
    // Restore thumbnail image preview if present
		if(state.thumbnail) {
			var decodedThumbnail = decodeURIComponent(state.thumbnail);
			// Assume you have a function to render a thumbnail in polaroid style.
			$(".thumbnail-preview").html(Sections.renderPolaroid(decodedThumbnail, "thumbnail"));
			// Also, restore the hidden value.
			if($("input[name='thumbnail_cropped_data']").length === 0) {
				$(".thumbnail-preview").after('<input type="hidden" name="thumbnail_cropped_data" value="'+ state.thumbnail +'">');
			} else {
				$("input[name='thumbnail_cropped_data']").val(state.thumbnail);
			}
		}
		
    // Clear the dynamic sections container.
    $("#sections-container").empty();
    
    // Rebuild each dynamic section.
    if (state.sections && state.sections.length) {
      state.sections.forEach(function(sectionData) {
        // Build defaults that include the main content...
        var defaults = { content: sectionData.content };
        // ...and merge any extra data if available.
        if (sectionData.extra) {
          defaults = Object.assign({}, defaults, sectionData.extra);
        }
        // Use the Sections module to add the section.
        // This will use the getSectionTemplate() function to prefill fields.
        Sections.addSection(sectionData.type, defaults);
      });
    }
  }
  
  // Expose restoreFormState globally.
  window.restoreFormState = restoreFormState;
  
  /**
   * Restores the draft from localStorage and populates the form.
   * This function now leverages restoreFormState(state) internally.
   */
  function restoreDraft() {
    var savedDraft = localStorage.getItem("articleDraft");
    if (savedDraft) {
      try {
        var state = JSON.parse(savedDraft);
        // Restore the form using the unified restore function.
        restoreFormState(state);
        $("#autosave-status").text("Draft restored at " + new Date().toLocaleTimeString());
        Notifications.show("Draft restored from local storage", "info");
      } catch(err) {
        console.error("Error restoring draft:", err);
      }
    }
  }
  
  // ----------------------------------------------
  // 5. Send the Draft State to the Server via AJAX
  // ----------------------------------------------
  /**
   * Sends the current form state to the server.
   */
  function sendDraftToServer() {
    if (isSaving) return;
    isSaving = true;
    var state = captureFormState();
    $.ajax({
      url: "ajax/autosave.php", // Update if your endpoint is different.
      type: "POST",
      data: { draft: JSON.stringify(state) },
      success: function(response) {
        $("#autosave-status").text("Draft autosaved on server at " + new Date().toLocaleTimeString());
        Notifications.show("Draft autosaved on server", "info");
        isSaving = false;
      },
      error: function() {
        $("#autosave-status").text("Error autosaving on server.");
        Notifications.show("Autosave server error", "error");
        isSaving = false;
      }
    });
  }
  
  // -----------------------------------------------------
  // 6. Combined Debounced Autosave – Triggered on Input
  // -----------------------------------------------------
  var debouncedAutosave = debounce(function(){
      // Save locally, send to server, and push state for Undo/Redo.
      saveDraftLocally();
      sendDraftToServer();
      UndoRedo.pushState();
  }, debounceDelay);
  
  // ---------------------------------
  // 7. Initialization of Autosave Module
  // ---------------------------------
  function init() {
    // Immediately restore any saved draft.
    restoreDraft();
    
    // Bind the debounced autosave to input events on the entire article form.
    $("#article-form").on("input", debouncedAutosave);
    
    // Additionally, perform periodic autosave regardless of user input.
    setInterval(function(){
      saveDraftLocally();
      sendDraftToServer();
    }, autosaveInterval);
  }
  
  return {
    init: init,
    restoreDraft: restoreDraft
  };
})();
