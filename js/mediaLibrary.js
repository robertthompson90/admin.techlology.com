// js/mediaLibrary.js
// Version 2.2.9 - Fully context-aware filter logic.
//                 Uses global placeholder/loading image paths.
var MediaLibrary = (function($) {
    let config = {
        searchInput: '#media-search-input', 
        tagFilterInput: '#media-tag-filter', 
        showVariantsCheckbox: '#media-show-variants',
        targetPage: 'medialibrary' // Default context
      },
      $globalMedia;

    // Ensure G_PLACEHOLDER_IMAGE_PATH and G_LOADING_GIF_PATH are defined in addarticle.php <script> block
    const placeholderImgPathGlobal = typeof G_PLACEHOLDER_IMAGE_PATH !== 'undefined' ? G_PLACEHOLDER_IMAGE_PATH : 'img/placeholder.png';
    const loadingGifPathGlobal = typeof G_LOADING_GIF_PATH !== 'undefined' ? G_LOADING_GIF_PATH : 'img/loading.gif';

    function init(options = {}) {
        console.log("[MediaLibrary] Initializing...");
        
        // Determine page context to set correct selectors FIRST
        if (options.targetPage) { 
            config.targetPage = options.targetPage;
        } else { 
            config.targetPage = $('body').hasClass('add-article-page') ? 'addarticle' : 
                                ($('body').hasClass('media-library-page') ? 'medialibrary' : null);
        }

        // THEN set selectors based on determined context or passed options
        if (config.targetPage === 'addarticle') {
            config.searchInput = options.searchInput || '#media-search-input-addarticle';
            config.tagFilterInput = options.tagFilterInput || '#media-tag-filter-addarticle';
            config.showVariantsCheckbox = options.showVariantsCheckbox || '#media-show-variants-addarticle';
        } else if (config.targetPage === 'medialibrary') { 
            config.searchInput = options.searchInput || '#media-search-input';
            config.tagFilterInput = options.tagFilterInput || '#media-tag-filter';
            config.showVariantsCheckbox = options.showVariantsCheckbox || '#media-show-variants';
        } else {
            console.log("[MediaLibrary] Not on a recognized page for MediaLibrary filter initialization. No event listeners bound.");
            return; // Do not bind if selectors are not for a known context
        }
        console.log("[MediaLibrary] Initializing for target:", config.targetPage, "with selectors:", config.searchInput, config.tagFilterInput, config.showVariantsCheckbox);

        $globalMedia = $('#global-media');
        if (!$globalMedia.length) {
            console.warn("[MediaLibrary] #global-media container not found");
            return;
        }
        
        const $sInput = $(config.searchInput);
        const $tInput = $(config.tagFilterInput);
        const $vCheckbox = $(config.showVariantsCheckbox);

        if ($sInput.length) { $sInput.off('input.medialib').on("input.medialib", debounce(function(){ loadMedia(); }, 300)); }
        else { console.warn(`[MediaLibrary] Search input '${config.searchInput}' not found for ${config.targetPage || 'current page'}.`);}
        
        if ($tInput.length) { $tInput.off('change.medialib').on("change.medialib", function(){ loadMedia(); }); loadTagFilters(); } // loadTagFilters populates this select
        else { console.warn(`[MediaLibrary] Tag filter input '${config.tagFilterInput}' not found for ${config.targetPage || 'current page'}.`);}

        if ($vCheckbox.length) { $vCheckbox.off('change.medialib').on("change.medialib", function(){ loadMedia(); }); }
        else { console.warn(`[MediaLibrary] Show variants checkbox '${config.showVariantsCheckbox}' not found for ${config.targetPage || 'current page'}.`);}
        
        if ($sInput.length || $tInput.length || $vCheckbox.length) {
            loadMedia(); 
        } else if (config.targetPage === 'medialibrary') { // Fallback for main media library page if filters somehow removed from HTML
            loadMedia();
        }
    }

    function getCurrentMediaLibraryFilters() {
        let query = $(config.searchInput).val() || "";
        let tagFilter = $(config.tagFilterInput).val() || "";
        let showVariants = $(config.showVariantsCheckbox).is(':checked') || false;
        // console.log("[MediaLibrary] Getting filters for target:", config.targetPage, {query, tagFilter, showVariants});
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
        // Check if #global-media exists before trying to update it
        if (!$globalMedia.length) {
            console.warn("[MediaLibrary] #global-media container not found on this page. Skipping loadMedia.");
            return;
        }
        $globalMedia.html(`<p style="text-align:center; padding:20px;"><img src="${loadingGifPathGlobal}" alt="Loading..." style="width:24px; height:24px; vertical-align:middle; margin-right:8px;"> Loading media...</p>`);
        
        $.ajax({
          url: "ajax/getGlobalMedia.php", type: "GET",
          data: { q: filters.query, tag_filter: filters.tagFilter, show_variants: filters.showVariants },
          dataType: "json",
          success: function(response) {
            let mediaData = response; if (typeof response === 'string') { try { mediaData = JSON.parse(response); } catch (e) { $globalMedia.html("<p class='media-error-message'>Error parsing media data.</p>"); return; }}
            renderMedia(mediaData);
          },
          error: function() { $globalMedia.html("<p class='media-error-message'>Error loading global media.</p>"); }
        });
    }

    function initializeDraggable($items) {
        $items.each(function() {
            const $item = $(this);
            const assetData = $item.data('asset-data');
            
            if (!$item.data('draggable-initialized')) {
                $item.draggable({
                    helper: 'clone',
                    appendTo: 'body',
                    revert: 'invalid',
                    zIndex: 10000,
                    opacity: 0.7,
                    start: function(event, ui) {
                        $(ui.helper).addClass('dragging-media-item');
                        // IMPORTANT: Copy data to helper
                        $(ui.helper).data('asset-data', assetData);
                        console.log('[MediaLibrary] Started dragging asset:', assetData);
                    },
                    stop: function() {
                        console.log('[MediaLibrary] Stopped dragging asset:', assetData?.id);
                    }
                }).data('draggable-initialized', true);
            }
        });
        console.log('[MediaLibrary] Draggable initialized for', $items.length, 'items');
    }

    function renderMedia(mediaArray) {
        if (!mediaArray || !Array.isArray(mediaArray)) {
            $globalMedia.html("<p class='media-error-message'>Received invalid media data format.</p>");
            return;
        }

        if (mediaArray.length === 0) {
            $globalMedia.html("<p class='media-empty-message'>No media found matching your criteria.</p>");
            return;
        }

        $globalMedia.empty();

        mediaArray.forEach(function(mediaAsset) {
            // Determine asset type for styling
            let extraClass = '';
            if (mediaAsset.physical_source_asset_id && mediaAsset.physical_source_asset_id !== mediaAsset.id) {
                extraClass = 'virtual-asset';
            } else if (mediaAsset.variant_type || mediaAsset.is_variant) {
                extraClass = 'variant-asset';
            }

            // Build polaroid structure
            const $item = $('<div class="global-media-item"></div>')
                .addClass(extraClass)
                .attr('data-asset-id', mediaAsset.id)
                .data('asset-data', mediaAsset);

            // Image container (for icon overlays)
            const $imgContainer = $('<div class="image-container"></div>');
            const $img = $('<img>')
                .attr('src', mediaAsset.preview_url || mediaAsset.image_url)
                .attr('alt', mediaAsset.alt_text || mediaAsset.admin_title || mediaAsset.title || 'Media');
            $imgContainer.append($img);

            // Title/caption
            const $title = $('<div class="media-title"></div>')
                .text(mediaAsset.admin_title || mediaAsset.title || 'Untitled Asset');

            $item.append($imgContainer).append($title);

            // Draggable
            $item.draggable({
                helper: 'clone',
                appendTo: 'body',
                revert: 'invalid',
                zIndex: 10000,
                opacity: 0.7,
                start: function(event, ui) {
                    $(ui.helper).addClass('dragging-media-item');
                    $(ui.helper).data('asset-data', mediaAsset);
                    console.log('[MediaLibrary] Started dragging asset:', mediaAsset);
                },
                stop: function() {
                    console.log('[MediaLibrary] Stopped dragging asset:', mediaAsset.id);
                }
            });

            $globalMedia.append($item);
        });
    }

    function loadTagFilters() { // Populates the select defined in config.tagFilterInput
        const $tagFilterSelect = $(config.tagFilterInput);
        if (!$tagFilterSelect.length) { 
            // console.warn("[MediaLibrary] Tag filter select not found for this page:", config.tagFilterInput); 
            return;
        }
        $.ajax({
            url: 'ajax/getAllTags.php', type: 'GET', dataType: 'json',
            success: function(tags) {
                $tagFilterSelect.empty().append('<option value="">All Tags</option>');
                if (tags && tags.length > 0) {
                    tags.forEach(function(tag) { $tagFilterSelect.append(`<option value="${tag.id}">${tag.name}</option>`); });
                }
            },
            error: function() { $tagFilterSelect.empty().append('<option value="">Error loading tags</option>'); }
        });
    }

    function debounce(func, delay) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; }

    // Expose for global access
    window.MediaLibrary = {
        loadMedia: loadMedia,
        initializeDraggableItems: initializeDraggable
        // ...other existing methods...
    };

    return {
        init: init,
        loadMedia: loadMedia,
        renderMedia: renderMedia
    };
})(jQuery);

// After rendering each .global-media-item:
$('.global-media-item').draggable({
    helper: "clone",
    appendTo: "body",
    revert: "invalid",
    zIndex: 10000,
    start: function(event, ui) {
        $(ui.helper).addClass("dragging-media-item");
    }
});

// Make staging area droppable to accept items from media library
$('#staging-media').droppable({
    accept: ".global-media-item",
    hoverClass: "dropzone-hover-active",
    drop: function(event, ui) {
        const assetData = ui.draggable.data('asset-data');
        if (assetData && typeof StagingArea !== 'undefined' && StagingArea.addAsset) {
            StagingArea.addAsset(assetData);
        }
    }
});

// Make all article dropzones accept drags from the media library
$('.unified-dropzone, .section-image-interactive-area, .dropzone-gallery').droppable({
    accept: ".global-media-item",
    hoverClass: "dropzone-hover-active",
    drop: function(event, ui) {
        const assetData = ui.draggable.data('asset-data');
        if (assetData && typeof window.handleMediaLibrarySelectionForArticle === 'function') {
            window.handleMediaLibrarySelectionForArticle(assetData);
        }
    }
});

// Initialize on document ready
$(document).ready(function() {
    if ($('#global-media').length) {
        MediaLibrary.init();
    }
});
