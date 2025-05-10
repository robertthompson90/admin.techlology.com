// js/keyboard.js

var KeyboardShortcuts = (function(){
  /**
   * Initializes keyboard shortcuts and ARIA enhancements for accessibility.
   * - Ctrl+N: Focus the section selector to add a new section.
   * - Ctrl+P: Trigger the preview mode.
   * - Ctrl+Left Arrow: Navigate to the previous form step.
   * - Ctrl+Right Arrow: Navigate to the next form step.
   * - Esc: Closes any open modals (preview or cropper).
   * Additionally, the module sets ARIA roles for improved screen reader support.
   */
  function init() {
    // Global keydown event handler.
    $(document).on("keydown", function(e) {
      // Ignore keyboard shortcuts when typing in input, textarea, or select elements.
      if ($(e.target).is("input, textarea, select")) return;
      
      if (e.ctrlKey && e.keyCode === 78) { // Ctrl+N
        e.preventDefault();
        $("#section-type-selector-top").focus();
      } else if (e.ctrlKey && e.keyCode === 80) { // Ctrl+P
        e.preventDefault();
        $("#preview-button").trigger("click");
      } else if (e.keyCode === 27) { // Escape key
        $("#preview-modal").hide();
        $("#cropper-modal").hide();
      } else if (e.ctrlKey && e.keyCode === 37) { // Ctrl+Left Arrow
        e.preventDefault();
        $(".prev-step").first().trigger("click");
      } else if (e.ctrlKey && e.keyCode === 39) { // Ctrl+Right Arrow
        e.preventDefault();
        $(".next-step").first().trigger("click");
      }
    });
    
    // Enhance ARIA attributes for better accessibility.
    $("form#article-form").attr("role", "form");
    $(".form-step").attr("role", "tabpanel");
    $(".nav-buttons").attr("role", "navigation");
    $("#autosave-status").attr("aria-live", "polite");
  }
  
  return {
    init: init
  };
})();
