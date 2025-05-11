// js/stagingArea.js

var StagingArea = (function(){
  
  // Adds a new media item to the staging area.
  // newImageData: the data URL for the image.
  // mediaId: an identifier for the media item.
  function addMediaToStaging(newImageData, mediaId) {
    // Create the polaroid container with a data attribute for media id.
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
    
    // Append the new media to the staging area.
    $("#staging-media").append($polaroid);
    
    // Update the undo/redo state.
    UndoRedo.saveState();
  }
  
  // Initializes the staging area – sortable drag/drop, inline caption editing, deletion safeguards.
  function init() {
    // Make the staging area sortable.
    $("#staging-media").sortable({
      placeholder: "staging-placeholder",
      tolerance: "pointer",
      update: function(){
        // Save the new order after sorting.
        UndoRedo.saveState();
        Notifications.show("Staging order updated", "info");
      }
    });
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
      Notifications.show("Caption updated", "info");
    });
    
    // Add a delete button when hovering over a polaroid.
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
  
  return {
    init: init,
    addMediaToStaging: addMediaToStaging
  };
})();
