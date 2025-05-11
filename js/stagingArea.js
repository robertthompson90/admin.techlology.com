// js/stagingArea.js
var StagingArea = (function(){
  function init(){
    // Enable drag-and-drop reordering using jQuery UI Sortable.
    $("#staging-media").sortable({
      placeholder: "staging-placeholder",
      tolerance: "pointer",
      update: function(){
        Notifications.show("Staging order updated", "info");
      }
    });
    
    // Inline caption editing: double-click to edit, blur to save.
    $("#staging-media").on("dblclick", ".polaroid .caption", function(){
       $(this).attr("contenteditable", "true").focus();
    });
    $("#staging-media").on("blur", ".polaroid .caption", function(){
       $(this).removeAttr("contenteditable");
       // Optionally, send an AJAX request to save the new caption.
       Notifications.show("Caption updated", "info");
    });
  }
  return { init: init };
})();
