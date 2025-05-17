// js/mediaLibrary.js
var MediaLibrary = (function(){
  // var pinnedIds = {}; // Optional

  function loadMedia(query = "") {
    $.ajax({
      url: "ajax/getGlobalMedia.php", 
      type: "GET",
      data: { q: query },
      dataType: "json",
      success: function(response) {
        // Check if response is already an object (due to PHP echoing json_encode directly)
        // or if it's a string that needs parsing (less common with dataType: "json")
        let mediaData = response;
        if (typeof response === 'string') {
            try {
                mediaData = JSON.parse(response);
            } catch (e) {
                console.error("Failed to parse media data:", e, response);
                $("#global-media").html("<p>Error parsing media data.</p>");
                return;
            }
        }
        renderMedia(mediaData);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        $("#global-media").html("<p>Error loading global media. " + textStatus + ": " + errorThrown + "</p>");
        console.error("Error loading global media:", textStatus, errorThrown, jqXHR.responseText);
      }
    });
  }

  function renderMedia(mediaArray) {
    var $globalMedia = $("#global-media");
    $globalMedia.empty();

    if (mediaArray && Array.isArray(mediaArray) && mediaArray.length > 0) {
      mediaArray.forEach(function(mediaAsset) { // Changed variable name for clarity
        var $item = $("<div></div>")
                      .addClass("global-media-item")
                      .data("asset-data", mediaAsset); // Store the whole asset object

        var imageUrl = mediaAsset.image_url || 'img/placeholder.png'; // Fallback placeholder
        var title = mediaAsset.title || 'Untitled Asset';
                        
        var $img = $("<img>")
                        .attr("src", imageUrl) 
                        .attr("alt", title);
                        
        var $titleDiv = $("<div></div>") // Changed variable name
                        .addClass("media-title")
                        .text(title);
        
        $item.append($img).append($titleDiv);
        
        $item.on("click", function(){
          var assetDataForEditor = $(this).data("asset-data");
          
          if (!assetDataForEditor || !assetDataForEditor.id) {
            showNotification("Error: Media asset data is incomplete.", "error");
            console.warn("Incomplete asset data for item:", $(this));
            return;
          }
          
          // imageUrlForCropper should always be the physical file path
          var imageUrlForCropper = assetDataForEditor.image_url; 

          console.log("Opening editor for asset ID:", assetDataForEditor.id, "Physical URL:", imageUrlForCropper, "Asset Title:", assetDataForEditor.title);
          console.log("Full Asset Data for Editor:", assetDataForEditor);
          
          if (imageUrlForCropper && assetDataForEditor.id) {
            UnifiedImageEditor.openEditor(
              imageUrlForCropper,     // Physical file path for Cropper
              assetDataForEditor,     // Full data of the clicked asset (physical or virtual master)
              function() { // onAssetOrVariantSavedCallback
                console.log("Asset or Variant saved/updated for asset ID:", assetDataForEditor.id, ". Refreshing media library view.");
                MediaLibrary.loadMedia($(".media-search input").val() || ""); 
              },
              function() { // onEditorClosedCallback (optional)
                console.log("Unified Image Editor was closed for asset ID:", assetDataForEditor.id);
              }
            );
          } else {
            showNotification("Error: Missing physical image URL or Asset ID for this item.", "error");
          }
        });        
        $globalMedia.append($item);
      });
    } else if (Array.isArray(mediaArray) && mediaArray.length === 0) {
      $globalMedia.html("<p>No media available.</p>");
    } else {
      $globalMedia.html("<p>Received invalid media data format.</p>");
      console.error("Received invalid media data format:", mediaArray);
    }
  }

  function init(){
    if ($("#global-media").prev(".media-search").length === 0) {
      var $searchDiv = $("<div></div>").addClass("media-search");
      var $input = $("<input type='text' placeholder='Search media...'>");
      $input.on("input", debounce(function(){ 
        var q = $(this).val();
        loadMedia(q);
      }, 300));
      $searchDiv.append($input);
      $("#global-media").before($searchDiv);
    }
    loadMedia(); // Initial load
  }

  // Debounce utility
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
  
  // Helper function to safely call Notifications or fallback to console/alert
  // This is duplicated from UnifiedImageEditor.js; ideally, it would be a shared utility.
  const showNotification = (message, type) => {
    if (typeof Notifications !== 'undefined' && Notifications.show) {
      Notifications.show(message, type);
    } else {
      console.error(`Notification: [${type}] ${message} (Notifications module not found)`);
      if (type === 'error' || type === 'warning') {
        alert(`[${type.toUpperCase()}] ${message}\n(Notifications module is not available for a better display)`);
      }
    }
  };

  return {
    init: init,
    loadMedia: loadMedia
  };
})();
