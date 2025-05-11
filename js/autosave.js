// js/autosave.js
var Autosave = (function(){
  var autosaveInterval = 30000; // every 30 seconds
  var debounceDelay = 3000;      // 3 seconds debounce delay
  var autosaveTimer;
  var isSaving = false;
  
  // Save the current form data to localStorage.
  function saveDraftLocally() {
    var formData = $("#article-form").serializeArray();
    localStorage.setItem("articleDraft", JSON.stringify(formData));
    $("#autosave-status").text("Draft saved locally at " + new Date().toLocaleTimeString());
  }
  
  // Restore the draft from localStorage and populate the form.
  function restoreDraft() {
    var savedDraft = localStorage.getItem("articleDraft");
    if (savedDraft) {
      try {
        var formData = JSON.parse(savedDraft);
        formData.forEach(function(field){
          var $field = $("[name='" + field.name + "']");
          if ($field.length > 0) {
            $field.val(field.value);
          }
        });
        $("#autosave-status").text("Draft restored at " + new Date().toLocaleTimeString());
        Notifications.show("Draft restored from local storage", "info");
      } catch(err) {
        console.error("Error restoring draft:", err);
      }
    }
  }
  
  // Send the current form data to the server via AJAX.
  function sendDraftToServer() {
    if (isSaving) return;
    isSaving = true;
    var formData = $("#article-form").serialize();
    $.ajax({
      url: "ajax/autosave.php",
      type: "POST",
      data: formData,
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
  
  // Combined debounced autosave – called on input events.
  function debouncedAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function(){
      saveDraftLocally();
      sendDraftToServer();
    }, debounceDelay);
  }
  
  // Initialize autosave: restore draft and set up event listeners.
  function init() {
    restoreDraft(); // Populate form with saved draft, if available.
    
    // On any input in the form, start a debounced autosave.
    $("#article-form").on("input", debouncedAutosave);
    
    // Periodic autosave regardless of input activity.
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
