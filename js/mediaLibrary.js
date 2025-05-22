// js/mediaLibrary.js
// Version 2.24.2 (Corrected UIE Click Handler for Variants & Options Passing)
var MediaLibrary = (function($){ 

  const getCssFilterStringForLibrary = (filtersObject) => {
    const f = filtersObject || { brightness: 100, contrast: 100, saturation: 100, hue: 0 };
    return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`;
  };

  const generateScaledThumbnailForLibrary = (sourceCanvas, maxWidth = 150, maxHeight = 100) => {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;

    if (srcW === 0 || srcH === 0) {
        const emptyCanvas = document.createElement('canvas');
        emptyCanvas.width = maxWidth; emptyCanvas.height = maxHeight;
        const eCtx = emptyCanvas.getContext('2d');
        eCtx.fillStyle = '#555'; 
        eCtx.fillRect(0,0,maxWidth,maxHeight);
        eCtx.fillStyle = '#fff';
        eCtx.textAlign = 'center';
        eCtx.font = '10px Arial';
        eCtx.fillText('No Preview', maxWidth/2, maxHeight/2);
        return emptyCanvas;
    }

    const scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1); 
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

  function loadMedia(query = "", tagFilter = "", showVariants = false) {
    $('#global-media').html('<p>Loading media...</p>'); 
    $.ajax({
      url: "ajax/getGlobalMedia.php", 
      type: "GET",
      data: { 
        q: query,
        tag_filter: tagFilter,
        show_variants: showVariants 
      },
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
                      .data("asset-data", mediaAsset); // Store the full asset data (master or variant)

        const isVirtualMaster = mediaAsset.physical_source_asset_id &&
                                mediaAsset.physical_source_asset_id !== mediaAsset.id &&
                                mediaAsset.physical_source_asset_id !== null &&
                                !mediaAsset.is_variant; 

        const isVariant = mediaAsset.is_variant === true || mediaAsset.is_variant === "true";
        let displayTitle = '';


        if (isVariant) {
            $item.addClass("variant-asset");
            let masterTitle = mediaAsset.master_admin_title || `Master ${mediaAsset.media_asset_id_for_variant}`;
            let variantTitleText = mediaAsset.variant_type || `Variant ${mediaAsset.variant_id}`;
            $item.attr("title", `Variant: ${variantTitleText} (of Master: '${masterTitle}')`);
            displayTitle = `${masterTitle} > ${variantTitleText}`;
        } else if (isVirtualMaster) {
            $item.addClass("virtual-asset");
            displayTitle = mediaAsset.admin_title || mediaAsset.title || 'Untitled Virtual Master';
            $item.attr("title", `Virtual Master (Source ID: ${mediaAsset.physical_source_asset_id}) - ${displayTitle}`);
        } else { 
            $item.attr("title", "Physical Asset");
            displayTitle = mediaAsset.admin_title || mediaAsset.title || 'Untitled Physical Asset';
        }
                        
        var physicalImageUrl = mediaAsset.image_url || 'img/placeholder.png'; 
                        
        var $imgContainer = $("<div></div>").addClass("image-container");
        $imgContainer.html('<img src="img/loading.gif" alt="Loading..." style="width:30px; height:30px;">');

        var $titleDiv = $("<div></div>") 
                        .addClass("media-title") 
                        .text(displayTitle);
        
        $item.append($imgContainer).append($titleDiv);
        
        $item.on("click", function(){
          var clickedAssetData = $(this).data("asset-data");
          
          if (!clickedAssetData || !clickedAssetData.id) { 
            showNotification("Error: Media asset data is missing for this item.", "error");
            console.warn("Missing asset data for item:", $(this));
            return;
          }
          
          let masterAssetDataForUIE;
          let physicalUrlForUIE = clickedAssetData.image_url; // Physical URL is from the clicked asset data
          let uieOpenOptions = {}; // Options for UIE, including target variant

          if (clickedAssetData.is_variant) {
            console.log("Clicked a VARIANT. Original variant data:", clickedAssetData);
            // Construct the object for its MASTER asset to open in UIE
            masterAssetDataForUIE = {
                id: clickedAssetData.media_asset_id_for_variant, 
                admin_title: clickedAssetData.master_admin_title,
                public_caption: clickedAssetData.master_public_caption,
                alt_text: clickedAssetData.master_alt_text,
                source_url: clickedAssetData.master_source_url,
                attribution: clickedAssetData.master_attribution,
                default_crop: clickedAssetData.master_default_crop,
                filter_state: clickedAssetData.master_filter_state,
                physical_source_asset_id: clickedAssetData.master_physical_source_asset_id, 
                image_url: clickedAssetData.image_url 
            };

            // Prepare options for UIE to preload this specific variant
            uieOpenOptions.targetVariantId = clickedAssetData.variant_id;
            try {
                // getGlobalMedia.php should provide variant_details_parsed
                if (clickedAssetData.variant_details_parsed) {
                    uieOpenOptions.targetVariantDetails = clickedAssetData.variant_details_parsed;
                } else if (clickedAssetData.variant_details) {
                    // Fallback if parsed version isn't directly available
                    uieOpenOptions.targetVariantDetails = JSON.parse(clickedAssetData.variant_details);
                } else {
                    throw new Error("Variant details are missing.");
                }
            } catch (e) {
                console.error("Error parsing variant_details from clicked variant data:", e, clickedAssetData.variant_details);
                showNotification("Error: Could not parse variant details for preloading.", "error");
                return; 
            }
            uieOpenOptions.targetVariantTitle = clickedAssetData.variant_type || `Variant ${clickedAssetData.variant_id}`;
            
            console.log("Preparing MASTER for UIE:", masterAssetDataForUIE, "with options to preload VARIANT:", uieOpenOptions);

          } else {
             // It's a master (physical or virtual)
             masterAssetDataForUIE = clickedAssetData;
             console.log("Clicked a MASTER. Opening in UIE:", masterAssetDataForUIE);
             // No specific variant to preload, uieOpenOptions remains empty
          }
          
          if (!masterAssetDataForUIE || !masterAssetDataForUIE.id) {
            showNotification("Error: Could not determine master asset data to open in editor.", "error");
            console.error("Master asset data for UIE is invalid:", masterAssetDataForUIE);
            return;
          }
          if (!physicalUrlForUIE) {
            showNotification("Error: Missing physical image URL for editor.", "error");
            console.error("Physical URL for UIE is missing. Master Data:", masterAssetDataForUIE, "Clicked Asset Data:", clickedAssetData);
            return;
          }
          
          UnifiedImageEditor.openEditor(
            physicalUrlForUIE,     
            masterAssetDataForUIE, 
            function() { 
              const currentQuery = $('#media-search-input').val();
              const currentTagFilter = $('#media-tag-filter').val();
              const currentShowVariants = $('#media-show-variants').is(':checked');
              MediaLibrary.loadMedia(currentQuery, currentTagFilter, currentShowVariants); 
            },
            function() { 
              console.log("Unified Image Editor was closed.");
            },
            uieOpenOptions // Pass the options object here
          );
        });        
        $globalMedia.append($item);

        const physicalImg = new Image();
        physicalImg.crossOrigin = "Anonymous"; 

        physicalImg.onload = () => {
            let cropToUse = null;
            let filtersToApply = null;

            if (isVariant && mediaAsset.variant_details_parsed) {
                cropToUse = mediaAsset.variant_details_parsed.crop;
                filtersToApply = mediaAsset.variant_details_parsed.filters;
            } else { // For master assets (physical or virtual)
                try {
                    if (mediaAsset.default_crop && mediaAsset.default_crop !== "null" && mediaAsset.default_crop.trim() !== "") {
                        cropToUse = JSON.parse(mediaAsset.default_crop);
                    }
                    if (mediaAsset.filter_state && mediaAsset.filter_state !== "null" && mediaAsset.filter_state.trim() !== "") {
                        filtersToApply = JSON.parse(mediaAsset.filter_state);
                    }
                } catch (e) {
                    console.error("Error parsing default crop/filter for media library item:", mediaAsset.id, e);
                }
            }
            
            if (!cropToUse || typeof cropToUse.width !== 'number' || typeof cropToUse.height !== 'number' || cropToUse.width <= 0 || cropToUse.height <= 0) {
                cropToUse = { x: 0, y: 0, width: physicalImg.naturalWidth, height: physicalImg.naturalHeight };
            }

            if (physicalImg.naturalWidth === 0 || physicalImg.naturalHeight === 0) {
                 console.warn("Media library thumbnail: Physical image has zero dimensions for asset", mediaAsset.id);
                 const errorThumb = generateScaledThumbnailForLibrary(document.createElement('canvas'));
                 const $imgElement = $("<img>").attr("src", errorThumb.toDataURL()).attr("alt", displayTitle);
                 $imgContainer.empty().append($imgElement);
                 return; 
            }
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            if (cropToUse.width <= 0 || cropToUse.height <= 0) {
                console.warn("Corrected invalid crop dimensions to full image for asset:", mediaAsset.id);
                cropToUse.width = physicalImg.naturalWidth;
                cropToUse.height = physicalImg.naturalHeight;
                cropToUse.x = 0;
                cropToUse.y = 0;
            }

            tempCanvas.width = cropToUse.width;
            tempCanvas.height = cropToUse.height;

            if (filtersToApply) {
                tempCtx.filter = getCssFilterStringForLibrary(filtersToApply);
            }
            tempCtx.drawImage(physicalImg,
                cropToUse.x, cropToUse.y, cropToUse.width, cropToUse.height,
                0, 0, cropToUse.width, cropToUse.height
            );
            
            const thumbCanvas = generateScaledThumbnailForLibrary(tempCanvas, 150, 100);
            const $imgElement = $("<img>").attr("src", thumbCanvas.toDataURL()).attr("alt", displayTitle);
            $imgContainer.empty().append($imgElement);
        };

        physicalImg.onerror = () => {
            console.error("Failed to load image for media library thumbnail:", physicalImageUrl);
            const $imgElement = $("<img>").attr("src", 'img/placeholder.png').attr("alt", "Error loading image");
            $imgContainer.empty().append($imgElement);
        };
        physicalImg.src = physicalImageUrl;

      });
    } else if (Array.isArray(mediaArray) && mediaArray.length === 0) {
      $globalMedia.html("<p>No media found matching your criteria.</p>");
    } else {
      $globalMedia.html("<p>Received invalid media data format.</p>");
      console.error("Received invalid media data format:", mediaArray);
    }
  }

  function loadTagFilters() {
    $.ajax({
        url: 'ajax/getAllTags.php', 
        type: 'GET',
        dataType: 'json',
        success: function(tags) {
            const $tagFilterSelect = $('#media-tag-filter');
            $tagFilterSelect.empty().append('<option value="">All Tags</option>'); 
            if (tags && tags.length > 0) {
                tags.forEach(function(tag) {
                    $tagFilterSelect.append(`<option value="${tag.id}">${tag.name}</option>`);
                });
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Error loading tags for filter:", textStatus, errorThrown);
            $('#media-tag-filter').empty().append('<option value="">Error loading tags</option>');
        }
    });
  }

  function init(){
    $('#media-search-input').on("input", debounce(function(){ 
        const query = $(this).val();
        const tagFilter = $('#media-tag-filter').val();
        const showVariants = $('#media-show-variants').is(':checked');
        loadMedia(query, tagFilter, showVariants);
    }, 300));

    $('#media-tag-filter').on("change", function(){
        const tagFilter = $(this).val();
        const query = $('#media-search-input').val();
        const showVariants = $('#media-show-variants').is(':checked');
        loadMedia(query, tagFilter, showVariants);
    });

    $('#media-show-variants').on("change", function(){
        const showVariants = $(this).is(':checked');
        const query = $('#media-search-input').val();
        const tagFilter = $('#media-tag-filter').val();
        loadMedia(query, tagFilter, showVariants);
    });
    
    loadTagFilters();
    loadMedia("", "", false); 
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
})(jQuery);