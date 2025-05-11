var StagingArea = (function(){
  function addMediaToStaging(newImageData, mediaId) {
    var $polaroid = $("<div>").addClass("polaroid").attr("data-media-id", mediaId);
    var $img = $("<img>").attr("src", newImageData).attr("alt", "Cropped Image");
    var $caption = $("<div>").addClass("caption").text("Double-click to edit caption");
    $polaroid.append($img).append($caption);
    $("#staging-media").append($polaroid);
    UndoRedo.saveState();
  }
  
  function init() {
    $("#staging-media").sortable({
      placeholder: "staging-placeholder",
      tolerance: "pointer",
      update: function(){
        UndoRedo.saveState();
        Notifications.show("Staging order updated", "info");
      }
    });
    UndoRedo.saveState();
    
    $("#staging-media").on("dblclick", ".polaroid .caption", function(){
      $(this).attr("contenteditable", "true").addClass("editing").focus();
    });
    $("#staging-media").on("blur", ".polaroid .caption", function(){
      $(this).removeAttr("contenteditable").removeClass("editing");
      Notifications.show("Caption updated", "info");
    });
    
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
