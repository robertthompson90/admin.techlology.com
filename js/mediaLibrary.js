// js/mediaLibrary.js
// Version 2.24 (Show Variants Functionality)
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

  // Function to load media with search query, tag filter, and show_variants flag
  function loadMedia(query = "", tagFilter = "", showVariants = false) {
    $('#global-media').html('<p>Loading media...</p>'); 
    $.ajax({
      url: "ajax/getGlobalMedia.php", 
      type: "GET",
      data: { 
        q: query,
        tag_filter: tagFilter,
        show_variants: showVariants // New parameter
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
                      .data("asset-data", mediaAsset); // Store the whole asset (master or variant)

        const isVirtualMaster = mediaAsset.physical_source_asset_id &&
                                mediaAsset.physical_source_asset_id !== mediaAsset.id &&
                                mediaAsset.physical_source_asset_id !== null &&
                                !mediaAsset.is_variant; // Ensure it's not a variant itself being misidentified

        const isVariant = mediaAsset.is_variant === true || mediaAsset.is_variant === "true";


        if (isVariant) {
            $item.addClass("variant-asset");
            // Title for variant: "Master Title > Variant Name"
            // Assuming mediaAsset.master_admin_title and mediaAsset.variant_type are sent from PHP
            let masterTitle = mediaAsset.master_admin_title || `Master ${mediaAsset.media_asset_id}`;
            let variantTitle = mediaAsset.variant_type || `Variant ${mediaAsset.id}`;
            $item.attr("title", `Variant of '${masterTitle}' (ID: ${mediaAsset.id}, Master ID: ${mediaAsset.media_asset_id})`);
            displayTitle = `${masterTitle} > ${variantTitle}`;
        } else if (isVirtualMaster) {
            $item.addClass("virtual-asset");
            $item.attr("title", "Virtual Asset (Source ID: " + mediaAsset.physical_source_asset_id + ")");
            displayTitle = mediaAsset.admin_title || mediaAsset.title || 'Untitled Virtual Master';
        } else { // Physical Master
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
          var assetDataForEditor = $(this).data("asset-data");
          
          if (!assetDataForEditor || !assetDataForEditor.id) {
            showNotification("Error: Media asset data is incomplete.", "error");
            console.warn("Incomplete asset data for item:", $(this));
            return;
          }
          
          // If it's a variant, we need to load its master asset data for the UIE
          // but tell UIE which variant to potentially pre-select or focus on.
          // For now, UIE always opens the master. The UIE itself handles variant selection.
          // The key is to pass the correct master asset data to UIE.
          
          let masterAssetDataToLoadInUIE = assetDataForEditor;
          let physicalUrlForUIE = assetDataForEditor.image_url; // This should always be the physical path

          if (assetDataForEditor.is_variant) {
            // Construct a "master-like" object to open the UIE with the master's context.
            // The actual master asset data (including its default_crop, filter_state, source_url, attribution)
            // should ideally be part of the variant's data from getGlobalMedia.php or fetched separately.
            // For simplicity now, we assume `assetDataForEditor` for a variant *contains* enough
            // master info (like `master_physical_url`, `master_default_crop`, etc.)
            // OR, we make another call to get the master asset if UIE strictly needs it.
            // Let's assume getGlobalMedia.php now returns master's core details along with variant.
            
            masterAssetDataToLoadInUIE = {
                id: assetDataForEditor.media_asset_id, // Master's ID
                admin_title: assetDataForEditor.master_admin_title,
                public_caption: assetDataForEditor.master_public_caption,
                alt_text: assetDataForEditor.master_alt_text,
                source_url: assetDataForEditor.master_source_url,
                attribution: assetDataForEditor.master_attribution,
                default_crop: assetDataForEditor.master_default_crop,
                filter_state: assetDataForEditor.master_filter_state,
                physical_source_asset_id: assetDataForEditor.master_physical_source_asset_id, // Master's physical source
                image_url: assetDataForEditor.image_url // Physical image URL (same for master and variant)
                // Add any other fields UIE expects for a master asset
            };
            console.log("Clicked a VARIANT. Opening its MASTER in UIE:", masterAssetDataToLoadInUIE);
          } else {
             console.log("Clicked a MASTER. Opening in UIE:", masterAssetDataToLoadInUIE);
          }
          
          if (physicalUrlForUIE && masterAssetDataToLoadInUIE.id) {
            UnifiedImageEditor.openEditor(
              physicalUrlForUIE,     
              masterAssetDataToLoadInUIE, // Pass the (potentially reconstructed) master asset data
              function() { 
                const currentQuery = $('#media-search-input').val();
                const currentTagFilter = $('#media-tag-filter').val();
                const currentShowVariants = $('#media-show-variants').is(':checked');
                MediaLibrary.loadMedia(currentQuery, currentTagFilter, currentShowVariants); 
              },
              function() { 
                console.log("Unified Image Editor was closed.");
              }
            );
          } else {
            showNotification("Error: Missing physical image URL or Master Asset ID for UIE.", "error");
          }
        });        
        $globalMedia.append($item);

        const physicalImg = new Image();
        physicalImg.crossOrigin = "Anonymous"; 

        physicalImg.onload = () => {
            let cropToUse = null;
            let filtersToApply = null;

            if (isVariant && mediaAsset.variant_details_parsed) {
                // For variants, use their specific crop and filters
                cropToUse = mediaAsset.variant_details_parsed.crop;
                filtersToApply = mediaAsset.variant_details_parsed.filters;
            } else {
                // For masters (physical or virtual), use their default_crop and filter_state
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
            
            // Fallback to full image if no valid crop defined
            if (!cropToUse || cropToUse.width <= 0 || cropToUse.height <= 0) {
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

    // Event listener for the "Show Variants" checkbox
    $('#media-show-variants').on("change", function(){
        const showVariants = $(this).is(':checked');
        const query = $('#media-search-input').val();
        const tagFilter = $('#media-tag-filter').val();
        loadMedia(query, tagFilter, showVariants);
    });
    
    loadTagFilters();
    loadMedia("", "", false); // Initial load: no query, no tag filter, don't show variants by default
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
