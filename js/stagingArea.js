// js/stagingArea.js
var StagingArea = (function(){
  
  // Integrated function: adds a new media item to the staging area.
  function addMediaToStaging(newImageData, mediaId) {
    // Create a polaroid element with an image and a caption.
    var $polaroid = $("<div>")
                      .addClass("polaroid")
                      .attr("data-media-id", mediaId);
    var $img = $("<img>")
                      .attr("src", newImageData)
                      .attr("alt", "Cropped Image");
    var $caption = $("<div>")
                      .addClass("caption")
                      .text("Double-click to edit caption");
    $polaroid.append($img).append($caption);
    
    // Append the new polaroid to the staging area.
    $("#staging-media").append($polaroid);
    
    // Update the undo/redo state.
    UndoRedo.saveState();
  }
  
  // Initializes the staging area behavior.
  function init() {
    // Make the staging area sortable.
    $("#staging-media").sortable({
      placeholder: "staging-placeholder",
      tolerance: "pointer",
      update: function(){
        // Save the new order state.
        UndoRedo.saveState();
        Notifications.show("Staging order updated", "info");
      }
    });
    // Save the initial state.
    UndoRedo.saveState();
    
    // Enable inline caption editing on double-click.
    $("#staging-media").on("dblclick", ".polaroid .caption", function(){
      $(this)
        .attr("contenteditable", "true")
        .addClass("editing")
        .focus();
    });
    $("#staging-media").on("blur", ".polaroid .caption", function(){
      $(this)
        .removeAttr("contenteditable")
        .removeClass("editing");
      // Optionally, send an AJAX request here to persist the caption.
      Notifications.show("Caption updated", "info");
    });
    
    // Add a delete button on hover for each polaroid.
    $("#staging-media").on("mouseenter", ".polaroid", function(){
      if ($(this).find(".delete-btn").length === 0) {
        $("<button class='delete-btn' title='Remove this media'>×</button>")
          .appendTo($(this))
          .on("click", function(e){
            e.stopPropagation();
            var $item = $(this).closest(".polaroid");
            if (confirm("Are you sure you want to remove this media item?")) {
              $item.fadeOut(200, function(){
                $(this).remove();
                UndoRedo.saveState();
                Notifications.show("Media item removed from staging", "info");
              });
            }
          });
      }
    });
  }
  
  // Return public methods.
  return {
    init: init,
    addMediaToStaging: addMediaToStaging
  };
})();
