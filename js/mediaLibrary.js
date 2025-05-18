// js/mediaLibrary.js
var MediaLibrary = (function(){

  function loadMedia(query = "") {
    $.ajax({
      url: "ajax/getGlobalMedia.php", 
      type: "GET",
      data: { q: query },
      dataType: "json",
      success: function(response) {
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
      mediaArray.forEach(function(mediaAsset) { 
        var $item = $("<div></div>")
                      .addClass("global-media-item") // This is your polaroid class
                      .data("asset-data", mediaAsset); 

        var imageUrl = mediaAsset.image_url || 'img/placeholder.png'; 
        // Use admin_title for display if available, otherwise fallback to title (which itself falls back to public_caption)
        var displayTitle = mediaAsset.admin_title || mediaAsset.title || 'Untitled Asset';
                        
        var $img = $("<img>")
                        .attr("src", imageUrl) 
                        // Use public_caption or alt_text for actual alt attribute if desired,
                        // or keep displayTitle for consistency if alt text is often empty.
                        .attr("alt", mediaAsset.alt_text || displayTitle); 
                        
        // This div will contain the title shown on the polaroid
        var $titleDiv = $("<div></div>") 
                        .addClass("media-title") // Class for the polaroid caption
                        .text(displayTitle);
        
        $item.append($img).append($titleDiv);
        
        $item.on("click", function(){
          var assetDataForEditor = $(this).data("asset-data");
          
          if (!assetDataForEditor || !assetDataForEditor.id) {
            showNotification("Error: Media asset data is incomplete.", "error");
            console.warn("Incomplete asset data for item:", $(this));
            return;
          }
          
          var imageUrlForCropper = assetDataForEditor.image_url; 
          // The UIE will use assetDataForEditor.admin_title for its main title input
          
          console.log("Opening editor for asset ID:", assetDataForEditor.id, 
                      "Physical URL:", imageUrlForCropper, 
                      "Admin Title:", assetDataForEditor.admin_title || assetDataForEditor.title);
          console.log("Full Asset Data for Editor:", assetDataForEditor);
          
          if (imageUrlForCropper && assetDataForEditor.id) {
            UnifiedImageEditor.openEditor(
              imageUrlForCropper,     
              assetDataForEditor,     // Pass the whole object
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
    loadMedia(); 
  }

  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  }
  
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
