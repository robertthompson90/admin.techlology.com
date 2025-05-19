// js/mediaLibrary.js
// Version 2.21 (Visual Indicator for Virtual Assets)
var MediaLibrary = (function(){

  // Helper function to generate CSS filter string (replicated from UIE for use here)
  const getCssFilterStringForLibrary = (filtersObject) => {
    const f = filtersObject || { brightness: 100, contrast: 100, saturation: 100, hue: 0 };
    return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`;
  };

  // Helper function to generate a scaled thumbnail (replicated from UIE for use here)
  const generateScaledThumbnailForLibrary = (sourceCanvas, maxWidth = 150, maxHeight = 100) => {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;

    if (srcW === 0 || srcH === 0) {
        const emptyCanvas = document.createElement('canvas');
        emptyCanvas.width = maxWidth; emptyCanvas.height = maxHeight;
        const eCtx = emptyCanvas.getContext('2d');
        eCtx.fillStyle = '#555'; eCtx.fillRect(0,0,maxWidth,maxHeight);
        eCtx.fillStyle = '#fff'; eCtx.textAlign = 'center'; eCtx.font = '10px Arial';
        eCtx.fillText('No Preview', maxWidth/2, maxHeight/2);
        return emptyCanvas;
    }

    const scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1); // Do not scale up
    const thumbW = Math.round(srcW * scale);
    const thumbH = Math.round(srcH * scale);

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const ctx = thumbCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, srcW, srcH, 0, 0, thumbW, thumbH);
    return thumbCanvas;
  };


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
                      .addClass("global-media-item") 
                      .data("asset-data", mediaAsset); 

        // Determine if the asset is virtual
        // A virtual asset has a physical_source_asset_id that is not null AND different from its own id.
        const isVirtual = mediaAsset.physical_source_asset_id && 
                          mediaAsset.physical_source_asset_id !== mediaAsset.id &&
                          mediaAsset.physical_source_asset_id !== null;

        if (isVirtual) {
            $item.addClass("virtual-asset");
            $item.attr("title", "Virtual Asset (Source ID: " + mediaAsset.physical_source_asset_id + ")");
        } else {
            $item.attr("title", "Physical Asset");
        }
                        
        var physicalImageUrl = mediaAsset.image_url || 'img/placeholder.png'; 
        var displayTitle = mediaAsset.admin_title || mediaAsset.title || 'Untitled Asset';
                        
        var $imgContainer = $("<div></div>").addClass("image-container");
        $imgContainer.html('<img src="img/loading.gif" alt="Loading..." style="width:30px; height:30px;">');

        var $titleDiv = $("<div></div>") 
                        .addClass("media-title") 
                        .text(displayTitle);
        
        $item.append($imgContainer).append($titleDiv);
        
        $item.on("click", function(){
          var assetDataForEditor = $(this).data("asset-data");
          
          if (!assetDataForEditor || !assetDataForEditor.id) {
            showNotification("Error: Media asset data is incomplete.", "error");
            console.warn("Incomplete asset data for item:", $(this));
            return;
          }
          
          var imageUrlForUIE = assetDataForEditor.image_url; 
          
          console.log("Opening editor for asset ID:", assetDataForEditor.id, 
                      "Physical URL for UIE:", imageUrlForUIE, 
                      "Admin Title:", assetDataForEditor.admin_title || assetDataForEditor.title);
          console.log("Full Asset Data for Editor:", assetDataForEditor);
          
          if (imageUrlForUIE && assetDataForEditor.id) {
            UnifiedImageEditor.openEditor(
              imageUrlForUIE,     
              assetDataForEditor,
              function() { 
                console.log("Asset or Variant saved/updated for asset ID:", assetDataForEditor.id, ". Refreshing media library view.");
                MediaLibrary.loadMedia($(".media-search input").val() || ""); 
              },
              function() { 
                console.log("Unified Image Editor was closed for asset ID:", assetDataForEditor.id);
              }
            );
          } else {
            showNotification("Error: Missing physical image URL or Asset ID for this item.", "error");
          }
        });        
        $globalMedia.append($item);

        const physicalImg = new Image();
        physicalImg.crossOrigin = "Anonymous";

        physicalImg.onload = () => {
            let defaultCropData = null;
            let defaultFiltersData = null;
            try {
                if (mediaAsset.default_crop && mediaAsset.default_crop !== "null" && mediaAsset.default_crop.trim() !== "") {
                    defaultCropData = JSON.parse(mediaAsset.default_crop);
                }
                if (mediaAsset.filter_state && mediaAsset.filter_state !== "null" && mediaAsset.filter_state.trim() !== "") {
                    defaultFiltersData = JSON.parse(mediaAsset.filter_state);
                }
            } catch (e) {
                console.error("Error parsing default crop/filter for media library item:", mediaAsset.id, e);
            }

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            const cropToUse = (defaultCropData && defaultCropData.width > 0 && defaultCropData.height > 0) ?
                defaultCropData :
                { x: 0, y: 0, width: physicalImg.naturalWidth, height: physicalImg.naturalHeight };

            if (cropToUse.width <= 0 || cropToUse.height <= 0 || physicalImg.naturalWidth === 0 || physicalImg.naturalHeight === 0) {
                 console.warn("Media library thumbnail: Invalid crop or image dimensions for asset", mediaAsset.id, cropToUse, "Img:", physicalImg.naturalWidth, "x", physicalImg.naturalHeight);
                 const errorThumb = generateScaledThumbnailForLibrary(document.createElement('canvas'));
                 const $imgElement = $("<img>")
                    .attr("src", errorThumb.toDataURL())
                    .attr("alt", mediaAsset.alt_text || displayTitle);
                 $imgContainer.empty().append($imgElement);
                 return; 
            }
            
            tempCanvas.width = cropToUse.width;
            tempCanvas.height = cropToUse.height;

            if (defaultFiltersData) {
                tempCtx.filter = getCssFilterStringForLibrary(defaultFiltersData);
            }
            tempCtx.drawImage(physicalImg,
                cropToUse.x, cropToUse.y, cropToUse.width, cropToUse.height,
                0, 0, cropToUse.width, cropToUse.height
            );
            
            const thumbCanvas = generateScaledThumbnailForLibrary(tempCanvas, 150, 100);

            const $imgElement = $("<img>")
                .attr("src", thumbCanvas.toDataURL())
                .attr("alt", mediaAsset.alt_text || displayTitle);
            $imgContainer.empty().append($imgElement);
        };

        physicalImg.onerror = () => {
            console.error("Failed to load image for media library thumbnail:", physicalImageUrl);
            const $imgElement = $("<img>")
                .attr("src", 'img/placeholder.png') 
                .attr("alt", "Error loading image");
            $imgContainer.empty().append($imgElement);
        };
        physicalImg.src = physicalImageUrl;

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
