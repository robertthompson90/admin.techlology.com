// js/keyboard.js
var KeyboardShortcuts = (function(){
  // Check if an input, textarea, or select is focused.
  function isTyping() {
    return $("input:focus, textarea:focus, select:focus").length > 0;
  }
  
  // Trigger preview mode.
  function openPreview() {
    // Trigger the preview button, which is already bound to open the preview modal.
    $("#preview-button").trigger("click");
  }
  
  // Submit the form.
  function submitArticle() {
    // Optionally add a confirmation or autosave trigger
    $("#article-form").submit();
  }
  
  // Navigate tabs based on arrow keys.
  function navigateTabs(direction) {
    var $tabs = $("#article-form ul.form-tabs li");
    var $active = $tabs.filter(".active");
    var currentIndex = $tabs.index($active);
    
    if (direction === "next") {
      var nextIndex = (currentIndex + 1) % $tabs.length;
      FormTabs.showStep(nextIndex);
    } else if (direction === "prev") {
      var prevIndex = (currentIndex - 1 + $tabs.length) % $tabs.length;
      FormTabs.showStep(prevIndex);
    }
  }
  
  // Bind global keydown events.
  function init() {
    $(document).on("keydown", function(e){
      // Avoid interfering if the user is typing in an input.
      if (isTyping()) return;
      
      // Ctrl + P: Open Preview.
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        openPreview();
      }
      
      // Ctrl + S: Submit/save the article.
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        submitArticle();
      }
      
      // Left arrow key navigates to previous tab.
      if (!e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        navigateTabs("prev");
      }
      
      // Right arrow key navigates to next tab.
      if (!e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        navigateTabs("next");
      }
    });
  }
  
  return {
    init: init
  };
})();
