// js/StagingArea.js
var StagingArea = (function($){
  /**
   * Adds a media item to the staging area.
   * @param {string} newImageData – The (base64) URL of the image.
   * @param {string} mediaId – The media identifier.
   * @param {object} [editMetaData] – (Optional) An object containing edit metadata (crop and filters).
   */
  function addMediaToStaging(newImageData, mediaId, editMetaData) {
    var $polaroid = $("<div>")
      .addClass("polaroid")
      .attr("data-media-id", mediaId);
      
    // If edit metadata is available, store it as a data attribute for future retrieval.
    if (editMetaData) {
      $polaroid.data("editMetaData", editMetaData);
    }
    
    var $img = $("<img>").attr("src", newImageData).attr("alt", "Cropped Image");
    var $caption = $("<div>").addClass("caption").text("Double-click to edit caption");
    $polaroid.append($img).append($caption);
    $("#staging-media").append($polaroid);
    UndoRedo.pushState();
  }
  
  // --- Define makeStagingItemsDraggable at module scope ---
  function makeStagingItemsDraggable() {
    $('#staging-media .staging-media-item').each(function() {
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
            $(ui.helper).addClass('dragging-staging-item').data('asset-data', assetData);
          }
        }).data('draggable-initialized', true);
      }
    });
  }

  function init() {
    $('#staging-media').droppable({
      accept: '.global-media-item',
      hoverClass: 'dropzone-hover-active',
      drop: function(event, ui) {
        const draggedAssetData = $(ui.helper).data('asset-data');
        console.log('[StagingArea] Processing drop:', draggedAssetData);
        
        if (draggedAssetData && draggedAssetData.id) {
          addToStaging(draggedAssetData);
        } else {
          console.error('[StagingArea] No valid asset data in drop');
        }
      }
    });
    
    $("#staging-media").sortable({
      placeholder: "staging-placeholder",
      tolerance: "pointer",
      update: function(){
        UndoRedo.pushState();
        Notifications.show("Staging order updated", "info");
      }
    });
    UndoRedo.pushState();
    
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
                        UndoRedo.pushState();
                        Notifications.show("Media item removed from staging", "info");
                    });
                }
             });
      }
    });
    
    // When rendering each .polaroid-style-preview:
    $(".polaroid").draggable({
        helper: "clone",
        appendTo: "body",
        revert: "invalid",
        zIndex: 10000,
        start: function(event, ui) {
            $(ui.helper).addClass("dragging-media-item");
        }
    });
    
    // Ensure data('asset-data') is set with all needed fields (id, variant_id, etc.)
    
    // After rendering each .polaroid-style-preview:
    $('.polaroid-style-preview').draggable({
        helper: "clone",
        appendTo: "body",
        revert: "invalid",
        zIndex: 10000,
        start: function(event, ui) {
            $(ui.helper).addClass("dragging-media-item");
        }
    });
    
    // Make all staging items draggable (ensure this runs after items are rendered)
    $('#staging-media .polaroid-style-preview').draggable({
        helper: "clone",
        appendTo: "body",
        revert: "invalid",
        zIndex: 10000,
        start: function(event, ui) {
            $(ui.helper).addClass("dragging-media-item");
        }
    });
    
    // Make all article dropzones accept drags from the staging area
    $('.unified-dropzone, .section-image-interactive-area, .dropzone-gallery').droppable({
        accept: ".polaroid-style-preview",
        hoverClass: "dropzone-hover-active",
        drop: function(event, ui) {
            const assetData = ui.draggable.data('asset-data');
            if (assetData && typeof window.handleMediaLibrarySelectionForArticle === 'function') {
                window.handleMediaLibrarySelectionForArticle(assetData);
            }
        }
    });
    
    function initializeStagingArea() {
        // Make staging area droppable for media library items
        $('#staging-media').droppable({
            accept: '.global-media-item',
            hoverClass: 'dropzone-hover-active',
            drop: function(event, ui) {
                const assetData = $(ui.draggable).data('asset-data');
                console.log("[StagingArea] Received drop from media library:", assetData);
                if (assetData && assetData.id) {
                    StagingArea.addAsset(assetData);
                }
            }
        });

        // Make staging items draggable to article sections
        $('.staging-media-item').each(function() {
            const $item = $(this);
            if (!$item.data('draggable-initialized')) {
                const assetData = $item.data('asset-data');
                $item.draggable({
                    helper: 'clone',
                    appendTo: 'body',
                    revert: 'invalid',
                    zIndex: 10000,
                    opacity: 0.7,
                    start: function(event, ui) {
                        $(ui.helper).addClass('dragging-staging-item');
                        $(ui.helper).data('asset-data', assetData);
                    },
                    cursor: 'move'
                }).data('draggable-initialized', true);
            }
        });
    }

    // Call after rendering staging items
    function refreshStagingArea() {
        // ...existing code...
        initializeStagingArea();
    }
    
    function addToStaging(assetData) {
        // Prevent duplicates by asset id
        if ($('#staging-media .staging-media-item[data-asset-id="' + assetData.id + '"]').length > 0) {
            Notifications.show("This image is already in the staging area.", "info");
            return;
        }
        let extraClass = '';
        if (assetData.physical_source_asset_id && assetData.physical_source_asset_id !== assetData.id) {
            extraClass = 'virtual-asset';
        } else if (assetData.variant_type || assetData.is_variant) {
            extraClass = 'variant-asset';
        }
        const $stagingItem = $('<div class="staging-media-item"></div>')
            .addClass(extraClass)
            .attr('data-asset-id', assetData.id)
            .data('asset-data', assetData);

        const $imgContainer = $('<div class="image-container"></div>');
        const $img = $('<img>')
            .attr('src', assetData.preview_url || assetData.image_url)
            .attr('alt', assetData.alt_text || assetData.admin_title || assetData.title || 'Staged media');
        $imgContainer.append($img);

        const $title = $('<div class="media-title"></div>')
            .text(assetData.admin_title || assetData.title || `Image ${assetData.id}`);

        $stagingItem.append($imgContainer).append($title);

        // Make draggable
        $stagingItem.draggable({
            helper: 'clone',
            appendTo: 'body',
            revert: 'invalid',
            zIndex: 10000,
            opacity: 0.7,
            start: function(event, ui) {
                $(ui.helper).addClass('dragging-staging-item').data('asset-data', assetData);
            }
        });

        $('#staging-media').append($stagingItem);
        makeStagingItemsDraggable();
        Notifications.show("Added to staging area", "success");
    }

    function getStagingAssets() {
        // Return array of asset data for all items in staging
        return $('#staging-media .staging-media-item').map(function() {
            return $(this).data('asset-data');
        }).get();
    }

    function setStagingAssets(assetArray) {
        $('#staging-media').empty();
        if (Array.isArray(assetArray)) {
            assetArray.forEach(addToStaging);
        }
        makeStagingItemsDraggable();
    }

    window.StagingArea = {
        init: init,
        addMediaToStaging: addMediaToStaging,
        refreshStagingArea: refreshStagingArea,
        initializeStagingArea: initializeStagingArea,
        getStagingAssets: getStagingAssets,
        setStagingAssets: setStagingAssets,
        makeStagingItemsDraggable: makeStagingItemsDraggable
    };
  }
  
  return {
    init: init,
    addMediaToStaging: addMediaToStaging
  };
})(jQuery);

// Initialize on document ready
$(document).ready(function() {
    StagingArea.init();
});
