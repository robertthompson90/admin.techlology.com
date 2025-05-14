// js/mediaLibrary.js
var MediaLibrary = (function(){
  // (Optional) If you want to support pinning to prioritize items,
  // you can leave this here. Otherwise, it’s not used in our minimal design.
  var pinnedIds = {};

  // Loads media from the server, with an optional search query.
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

  // Render the media items inside #global-media.
  function renderMedia(mediaArray) {
    var $globalMedia = $("#global-media");
    $globalMedia.empty();

    if (mediaArray && mediaArray.length > 0) {
      // In our minimal design, we simply list the media items.
      mediaArray.forEach(function(media) {
        var $item = $("<div></div>")
                      .addClass("global-media-item")
                      .attr("data-media-id", media.id);
                      
        var $img = $("<img>")
                        .attr("src", media.image_url)
                        .attr("alt", media.title);
                        
        var $title = $("<div></div>")
                        .addClass("media-title")
                        .text(media.title);
        
        // Optionally add a variant indicator badge if transformation parameters exist.
        if (media.variant_count && media.variant_count > 0) {
          var $variantBadge = $("<span></span>")
                                .addClass("variant-indicator")
                                .text("v" + media.variant_count);
          $item.append($variantBadge);
        }
        
        // (Optional) Remove the pin button for a minimal interface.
        /*
        var $pin = $("<button></button>")
                        .addClass("pin-button")
                        .html(pinnedIds[media.id] ? "&#9733;" : "&#9734;");
        $pin.on("click", function(e){
          e.stopPropagation();
          var mediaId = $(this).closest(".global-media-item").data("media-id");
          if (pinnedIds[mediaId]) {
            delete pinnedIds[mediaId];
          } else {
            pinnedIds[mediaId] = true;
          }
          var currentQuery = $(".media-search input").val();
          loadMedia(currentQuery);
          Notifications.show("Media item " + (pinnedIds[mediaId] ? "pinned" : "unpinned"), "info");
        });
        $item.append($pin);
        */
        
        $item.append($img).append($title);
        
        // Inside renderMedia() when creating the media item element:
				$item.on("click", function(){
					var mediaId = $(this).data("media-id");
					var imageUrl = $(this).find("img").attr("src");
					console.log("Single-click on media item with ID:", mediaId, "and image URL:", imageUrl);
					
					if (imageUrl) {
						UnifiedImageEditor.openEditor(imageUrl, function(editedDataURL){
							console.log("Edited image data received:", editedDataURL);
							// Update the master asset directly
							updateAsset(mediaId, editedDataURL);
						});
					} else {
						console.warn("No image URL found for media item with ID:", mediaId);
					}
				});        
        $globalMedia.append($item);
      });
    } else {
      $globalMedia.html("<p>No media available.</p>");
    }
  }

  // Update the master asset with the edited image data.
  function updateAsset(mediaId, editedDataURL) {
    $.ajax({
      url: "ajax/updateMediaAsset.php",
      type: "POST",
      data: {
        id: mediaId,
        image_data: editedDataURL
      },
      dataType: "json",
      success: function(response) {
        if(response.success) {
          Notifications.show("Asset updated successfully", "success");
          loadMedia();
        } else {
          Notifications.show("Failed to update asset", "error");
        }
      },
      error: function() {
        Notifications.show("Error updating asset", "error");
      }
    });
  }

  // Initialize the media library interface.
  function init(){
    // Check if a search box already exists. If not, insert one above #global-media.
    if ($("#global-media").prev(".media-search").length === 0) {
      var $searchDiv = $("<div></div>").addClass("media-search");
      var $input = $("<input type='text' placeholder='Search media...'>");
      $input.on("input", function(){
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
    renderMedia: renderMedia,
    updateAsset: updateAsset
  };
})();
