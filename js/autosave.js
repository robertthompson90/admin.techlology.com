// js/autosave.js

var Autosave = (function(){
  // Autosave interval in milliseconds (30 seconds)
  var interval = 30000;
  var isSaving = false;
  
  /**
   * Automatically saves the form data.
   * Note: The URL in this AJAX request is relative to the HTML document's location
   * (i.e. addarticle.php), not the location of this JavaScript file.
   * Since addarticle.php is in the root, 'ajax/autosave.php' correctly points to the ajax folder.
   */
  function autoSave() {
    // Skip if a save operation is in progress.
    if (isSaving) return;
    
    // Serialize the form data.
    var formData = $("#article-form").serialize();
    
    isSaving = true;
    $.ajax({
      url: "ajax/autosave.php", // Correct URL: relative to addarticle.php (in the root)
      type: "POST",
      data: formData,
      success: function(response) {
        // Update the autosave status with the current time.
        $("#autosave-status").text("Draft saved at " + new Date().toLocaleTimeString());
        isSaving = false;
      },
      error: function() {
        $("#autosave-status").text("Autosave error.");
        isSaving = false;
      }
    });
  }
  
  /**
   * Initializes the autosave functionality.
   * Sets up a timer to automatically trigger autoSave() at regular intervals.
   */
  function initAutosave() {
    setInterval(autoSave, interval);
  }
  
  return {
    init: initAutosave
  };
})();
