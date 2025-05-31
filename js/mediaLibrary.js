// js/mediaLibrary.js
// Version 2.2.9 - Fully context-aware filter logic.
//                 Uses global placeholder/loading image paths.
var MediaLibrary = (function($){

  let config = {
    searchInput: '#media-search-input', 
    tagFilterInput: '#media-tag-filter', 
    showVariantsCheckbox: '#media-show-variants',
    targetPage: 'medialibrary'
  };
  
  // Ensure G_PLACEHOLDER_IMAGE_PATH and G_LOADING_GIF_PATH are defined in addarticle.php <script> block
  const placeholderImgPathGlobal = typeof G_PLACEHOLDER_IMAGE_PATH !== 'undefined' ? G_PLACEHOLDER_IMAGE_PATH : 'img/placeholder.png';
  const loadingGifPathGlobal = typeof G_LOADING_GIF_PATH !== 'undefined' ? G_LOADING_GIF_PATH : 'img/loading.gif';


  function getCurrentMediaLibraryFilters() {
    let query = $(config.searchInput).val() || "";
    let tagFilter = $(config.tagFilterInput).val() || "";
    let showVariants = $(config.showVariantsCheckbox).is(':checked') || false;
    return { query, tagFilter, showVariants };
  }

  const getCssFilterStringForLibrary = (filtersObject) => {
    const f = filtersObject || { brightness: 100, contrast: 100, saturation: 100, hue: 0 };
    return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`;
  };

  const generateScaledThumbnailForLibrary = (sourceCanvas, maxWidth = 150, maxHeight = 100) => {
    const srcW = sourceCanvas.width; const srcH = sourceCanvas.height;
    if (srcW === 0 || srcH === 0) { const emptyCanvas = document.createElement('canvas'); emptyCanvas.width = maxWidth; emptyCanvas.height = maxHeight; const eCtx = emptyCanvas.getContext('2d'); eCtx.fillStyle = '#222'; eCtx.fillRect(0,0,maxWidth,maxHeight); eCtx.fillStyle = '#777'; eCtx.textAlign = 'center'; eCtx.font = '12px Arial'; eCtx.fillText('No Preview', maxWidth/2, maxHeight/2); return emptyCanvas;}
    const scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1); const thumbW = Math.round(srcW * scale); const thumbH = Math.round(srcH * scale);
    const thumbCanvas = document.createElement('canvas'); thumbCanvas.width = thumbW; thumbCanvas.height = thumbH; const ctx = thumbCanvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(sourceCanvas, 0, 0, srcW, srcH, 0, 0, thumbW, thumbH); return thumbCanvas;
  };

  function loadMedia() {
    const filters = getCurrentMediaLibraryFilters();
    $('#global-media').html(`<p style="text-align:center; padding:20px;"><img src="${loadingGifPathGlobal}" alt="Loading..." style="width:24px; height:24px; vertical-align:middle; margin-right:8px;"> Loading media...</p>`);
    $.ajax({
      url: "ajax/getGlobalMedia.php", type: "GET",
      data: { q: filters.query, tag_filter: filters.tagFilter, show_variants: filters.showVariants },
      dataType: "json",
      success: function(response) {
        let mediaData = response; if (typeof response === 'string') { try { mediaData = JSON.parse(response); } catch (e) { $("#global-media").html("<p class='media-error-message'>Error parsing media data.</p>"); return; }}
        renderMedia(mediaData);
      },
      error: function() { $("#global-media").html("<p class='media-error-message'>Error loading global media.</p>"); }
    });
  }

  function renderMedia(mediaArray) {
    var $globalMedia = $("#global-media"); $globalMedia.empty();
    if (mediaArray && Array.isArray(mediaArray) && mediaArray.length > 0) {
      mediaArray.forEach(function(mediaAsset) {
        var $item = $("<div></div>").addClass("global-media-item").data("asset-data", mediaAsset)
                      .attr('data-asset-id', mediaAsset.id); // Add asset-id for easier selection
        const isVirtualMaster = mediaAsset.physical_source_asset_id && mediaAsset.physical_source_asset_id !== mediaAsset.id && mediaAsset.physical_source_asset_id !== null && !mediaAsset.is_variant;
        const isVariant = mediaAsset.is_variant === true || mediaAsset.is_variant === "true";
        let displayTitle = '';
        if (isVariant) { $item.addClass("variant-asset"); let masterTitle = mediaAsset.master_admin_title || mediaAsset.master_title || `Master ${mediaAsset.media_asset_id_for_variant}`; let variantTitleText = mediaAsset.variant_type || `Variant ${mediaAsset.variant_id}`; $item.attr("title", `Variant: ${variantTitleText} (of Master: '${masterTitle}')`); displayTitle = `${masterTitle} > ${variantTitleText}`; }
        else if (isVirtualMaster) { $item.addClass("virtual-asset"); displayTitle = mediaAsset.admin_title || mediaAsset.title || `Image ${mediaAsset.id}`; $item.attr("title", `Virtual Master (Source ID: ${mediaAsset.physical_source_asset_id || 'N/A'}) - ${displayTitle}`); }
        else { displayTitle = mediaAsset.admin_title || mediaAsset.title || `Image ${mediaAsset.id}`; $item.attr("title", `Physical Asset - ${displayTitle}`);}
        
        var physicalImageUrl = mediaAsset.image_url || placeholderImgPathGlobal;
        var $imgContainer = $("<div></div>").addClass("image-container").html(`<img src="${loadingGifPathGlobal}" alt="Loading..." class="lazy-load-media-thumb" data-src="${physicalImageUrl}" style="width:30px; height:30px; margin:auto; display:block;">`);
        var $titleDiv = $("<div></div>").addClass("media-title").text(displayTitle);
        $item.append($imgContainer).append($titleDiv);

        $item.on("click", function(e) {
          var clickedAssetData = $(this).data("asset-data");
          if ($('body').hasClass('add-article-page') && typeof window.currentArticleImageTarget !== 'undefined' && window.currentArticleImageTarget && window.currentArticleImageTarget.type && typeof window.handleMediaLibrarySelectionForArticle === 'function') {
              console.log("[MediaLibrary] Clicked in 'picker mode' for addarticle. Handing off.");
              e.stopImmediatePropagation(); window.handleMediaLibrarySelectionForArticle(clickedAssetData); return;
          }
          if (!clickedAssetData || !clickedAssetData.id) { Notifications.show("Error: Media asset data missing.", "error"); return; }
          let masterAssetDataForUIE, physicalUrlForUIEToOpen = clickedAssetData.image_url, uieOpenOptions = {};
          if (clickedAssetData.is_variant) {
            masterAssetDataForUIE = { id: clickedAssetData.media_asset_id_for_variant, admin_title: clickedAssetData.master_admin_title, public_caption: clickedAssetData.master_public_caption, alt_text: clickedAssetData.master_alt_text, source_url: clickedAssetData.master_source_url, attribution: clickedAssetData.master_attribution, default_crop: clickedAssetData.master_default_crop, filter_state: clickedAssetData.master_filter_state, physical_source_asset_id: clickedAssetData.master_physical_source_asset_id, image_url: clickedAssetData.image_url };
            uieOpenOptions.targetVariantId = clickedAssetData.variant_id;
            try { if (clickedAssetData.variant_details_parsed) { uieOpenOptions.targetVariantDetails = clickedAssetData.variant_details_parsed; } else if (clickedAssetData.variant_details) { uieOpenOptions.targetVariantDetails = JSON.parse(clickedAssetData.variant_details); } else { throw new Error("Variant details missing."); }}
            catch (parseError) { Notifications.show("Error parsing variant details.", "error"); return; }
            uieOpenOptions.targetVariantTitle = clickedAssetData.variant_type || `Variant ${clickedAssetData.variant_id}`;
          } else { masterAssetDataForUIE = clickedAssetData; }
          if (!masterAssetDataForUIE || !masterAssetDataForUIE.id || !physicalUrlForUIEToOpen) { Notifications.show("Error: Cannot determine asset data for editor.", "error"); return; }
          UnifiedImageEditor.openEditor(physicalUrlForUIEToOpen, masterAssetDataForUIE, () => { loadMedia(); }, () => {}, uieOpenOptions);
        });
        $globalMedia.append($item);
        const imgEl = $imgContainer.find('img.lazy-load-media-thumb')[0];
        const physicalImg = new Image(); physicalImg.crossOrigin = "Anonymous";
        physicalImg.onload = () => {
            let cropToUse = null, filtersToApply = null;
            if (isVariant && mediaAsset.variant_details_parsed) { cropToUse = mediaAsset.variant_details_parsed.crop; filtersToApply = mediaAsset.variant_details_parsed.filters; }
            else { try { if (mediaAsset.default_crop && mediaAsset.default_crop !== "null" && String(mediaAsset.default_crop).trim() !== "") { cropToUse = JSON.parse(mediaAsset.default_crop); } if (mediaAsset.filter_state && mediaAsset.filter_state !== "null" && String(mediaAsset.filter_state).trim() !== "") { filtersToApply = JSON.parse(mediaAsset.filter_state); }} catch (e) {}}
            if (!cropToUse || typeof cropToUse.width !== 'number' || cropToUse.width <= 0) { cropToUse = { x: 0, y: 0, width: physicalImg.naturalWidth, height: physicalImg.naturalHeight };}
            if (physicalImg.naturalWidth === 0) { $(imgEl).attr('src', placeholderImgPathGlobal).css({width:'auto', height:'auto'}); return; }
            const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
            if (cropToUse.width <= 0 || cropToUse.height <= 0) { cropToUse.width = physicalImg.naturalWidth; cropToUse.height = physicalImg.naturalHeight; cropToUse.x=0; cropToUse.y=0;}
            tempCanvas.width = cropToUse.width; tempCanvas.height = cropToUse.height;
            if (filtersToApply) { tempCtx.filter = getCssFilterStringForLibrary(filtersToApply); }
            tempCtx.drawImage(physicalImg, cropToUse.x, cropToUse.y, cropToUse.width, cropToUse.height, 0, 0, cropToUse.width, cropToUse.height);
            const thumbCanvas = generateScaledThumbnailForLibrary(tempCanvas, 150, 100);
            $(imgEl).attr("src", thumbCanvas.toDataURL()).css({width:'auto', height:'auto', 'object-fit':'contain'});
        };
        physicalImg.onerror = () => { $(imgEl).attr("src", placeholderImgPathGlobal).css({width:'auto', height:'auto'}); };
        physicalImg.src = physicalImageUrl;
      });
    } else if (Array.isArray(mediaArray) && mediaArray.length === 0) { $globalMedia.html("<p class='media-empty-message'>No media found matching your criteria.</p>"); }
    else { $globalMedia.html("<p class='media-error-message'>Received invalid media data format.</p>"); }
  }

  function loadTagFilters() {
    $.ajax({
        url: 'ajax/getAllTags.php', type: 'GET', dataType: 'json',
        success: function(tags) {
            const $tagFilterSelect = $(config.tagFilterInput);
            if (!$tagFilterSelect.length) { console.warn("[MediaLibrary] Tag filter select not found:", config.tagFilterInput); return;}
            $tagFilterSelect.empty().append('<option value="">All Tags</option>');
            if (tags && tags.length > 0) {
                tags.forEach(function(tag) { $tagFilterSelect.append(`<option value="${tag.id}">${tag.name}</option>`); });
            }
        },
        error: function() {
            const $tagFilterSelect = $(config.tagFilterInput);
            if ($tagFilterSelect.length) $tagFilterSelect.empty().append('<option value="">Error loading tags</option>');
        }
    });
  }

  function init(options = {}){
    // Determine page context to set correct selectors
    if ($('body').hasClass('add-article-page')) {
        config.targetPage = 'addarticle';
    } else if ($('body').hasClass('media-library-page')) {
        config.targetPage = 'medialibrary';
    } else {
        config.targetPage = null; // Unknown context
    }

    // Override default selectors if specific ones are passed for the current page context
    if (config.targetPage === 'addarticle') {
        config.searchInput = options.searchInput || '#media-search-input-addarticle';
        config.tagFilterInput = options.tagFilterInput || '#media-tag-filter-addarticle';
        config.showVariantsCheckbox = options.showVariantsCheckbox || '#media-show-variants-addarticle';
    } else if (config.targetPage === 'medialibrary') { // Default to medialibrary.php selectors
        config.searchInput = options.searchInput || '#media-search-input';
        config.tagFilterInput = options.tagFilterInput || '#media-tag-filter';
        config.showVariantsCheckbox = options.showVariantsCheckbox || '#media-show-variants';
    } else {
        // If not on a known page, don't try to bind to non-existent elements.
        // console.log("[MediaLibrary] Not on a recognized page for MediaLibrary filter initialization.");
        return;
    }
    // console.log("[MediaLibrary] Initializing for target:", config.targetPage, "with selectors:", config.searchInput, config.tagFilterInput, config.showVariantsCheckbox);

    const $sInput = $(config.searchInput);
    const $tInput = $(config.tagFilterInput);
    const $vCheckbox = $(config.showVariantsCheckbox);

    if ($sInput.length) { $sInput.off('input.medialib').on("input.medialib", debounce(function(){ loadMedia(); }, 300)); }
    else if (config.targetPage) { console.warn(`[MediaLibrary] Search input '${config.searchInput}' not found.`);}
    
    if ($tInput.length) { $tInput.off('change.medialib').on("change.medialib", function(){ loadMedia(); }); loadTagFilters(); }
    else if (config.targetPage) { console.warn(`[MediaLibrary] Tag filter input '${config.tagFilterInput}' not found.`);}

    if ($vCheckbox.length) { $vCheckbox.off('change.medialib').on("change.medialib", function(){ loadMedia(); }); }
    else if (config.targetPage) { console.warn(`[MediaLibrary] Show variants checkbox '${config.showVariantsCheckbox}' not found.`);}
    
    // Initial load if any filter controls exist for the current page context
    if ($sInput.length || $tInput.length || $vCheckbox.length) {
        loadMedia(); 
    } else if (config.targetPage === 'medialibrary' && !$sInput.length && !$tInput.length && !$vCheckbox.length) {
        // If on media library page, but somehow no filters (e.g. old HTML version), still load all
        loadMedia();
    }
  }

  function debounce(func, delay) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; }

  return { init: init, loadMedia: loadMedia };
})(jQuery);
