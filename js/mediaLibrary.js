// js/mediaLibrary.js
var MediaLibrary = (function(){
  var pinnedIds = {}; // Object to hold pinned media IDs

  // Loads media from the server, with an optional search query
  function loadMedia(query) {
    query = query || "";
    $.ajax({
      url: "ajax/getGlobalMedia.php",
      type: "GET",
      data: { q: query },
      dataType: "json",
      success: function(response) {
        renderMedia(response);
      },
      error: function() {
        $("#global-media").html("<p>Error loading global media.</p>");
      }
    });
  }

  // Render the media items inside #global-media
  function renderMedia(mediaArray) {
    var $globalMedia = $("#global-media");
    $globalMedia.empty();
    if (mediaArray && mediaArray.length > 0) {
      // Separate pinned items from others
      var pinned = [];
      var unpinned = [];
      mediaArray.forEach(function(media) {
        if (pinnedIds[media.id]) {
          pinned.push(media);
        } else {
          unpinned.push(media);
        }
      });
      // Combine pinned items first
      var combined = pinned.concat(unpinned);
      combined.forEach(function(media){
        var $item = $("<div></div>")
                      .addClass("global-media-item")
                      .attr("data-media-id", media.id);
        
        var $img = $("<img>")
                        .attr("src", media.image_url)
                        .attr("alt", media.title);
                        
        var $title = $("<div></div>")
                        .addClass("media-title")
                        .text(media.title);
                        
        // Create a pin button
        var $pin = $("<button></button>")
                        .addClass("pin-button")
                        .html(pinnedIds[media.id] ? "&#9733;" : "&#9734;");
                        
        // Toggle pin when the pin button is clicked
        $pin.on("click", function(e){
          e.stopPropagation();
          var mediaId = $(this).closest(".global-media-item").data("media-id");
          if (pinnedIds[mediaId]) {
            delete pinnedIds[mediaId];
          } else {
            pinnedIds[mediaId] = true;
          }
          // Reload the media list with current search query (if any)
          var currentQuery = $(".media-search input").val();
          loadMedia(currentQuery);
          Notifications.show("Media item " + (pinnedIds[mediaId] ? "pinned" : "unpinned"), "info");
        });
        
        $item.append($img).append($pin).append($title);
        
        // When the media item is double-clicked, open the full-screen editor.
        $item.on("dblclick", function(){
          ImageEditor.openEditor($(this).find("img").attr("src"), function(croppedDataUrl){
            $("#staging-media").append("<img src='" + croppedDataUrl + "' alt='Cropped Image'>");
            Notifications.show("Image cropped and inserted", "success");
          });
        });
        
        $globalMedia.append($item);
      });
    } else {
      $globalMedia.html("<p>No media available.</p>");
    }
  }

  // Initialize the media library interface.
  function init(){
    // Add a search box above the media list if not already present.
    if ($("#global-media").prev(".media-search").length === 0) {
      var $searchDiv = $("<div></div>").addClass("media-search");
      var $input = $("<input type='text' placeholder='Search media...'>");
      $input.on("input", function(){
        // Reload media with the current query
        var q = $(this).val();
        loadMedia(q);
      });
      $searchDiv.append($input);
      $("#global-media").before($searchDiv);
    }
    loadMedia();
  }

  return {
    init: init,
    loadMedia: loadMedia,
    renderMedia: renderMedia
  };
})();
