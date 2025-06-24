// dropzones.js - Unified drag-and-drop for addarticle.php (thumbnail, sections, gallery, staging)

(function($){
  function init() {
    console.log("[Dropzones] Initializing unified drag-and-drop for addarticle.php");

    // --- Staging Area Drop ---
    $('#staging-media').droppable({
      accept: '.global-media-item',
      hoverClass: 'dropzone-hover-active',
      drop: function(event, ui) {
        const assetData = $(ui.helper).data('asset-data');
        console.log('[Dropzones] Dropped into staging area:', assetData);
        if (assetData && typeof StagingArea !== 'undefined' && StagingArea.addToStaging) {
          StagingArea.addToStaging(assetData);
        }
      }
    });

    // --- Make staging items draggable ---
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
    // Call after any staging area update
    if (typeof StagingArea !== 'undefined') StagingArea.makeStagingItemsDraggable = makeStagingItemsDraggable;

    // --- Show polaroid preview for section image ---
    function showSectionPolaroid($section, assetData) {
      $section.find('.section-polaroid-preview').remove();
      let extraClass = '';
      if (assetData.physical_source_asset_id && assetData.physical_source_asset_id !== assetData.id) {
        extraClass = 'virtual-asset';
      } else if (assetData.variant_type || assetData.is_variant) {
        extraClass = 'variant-asset';
      }
      const $polaroid = $('<div class="section-polaroid-preview"></div>')
        .addClass(extraClass)
        .attr('data-asset-id', assetData.id)
        .data('asset-data', assetData);
      const $imgContainer = $('<div class="image-container"></div>');
      const $img = $('<img>')
        .attr('src', assetData.preview_url || assetData.image_url)
        .attr('alt', assetData.alt_text || assetData.admin_title || assetData.title || 'Section Image');
      $imgContainer.append($img);
      const $title = $('<div class="media-title"></div>')
        .text(assetData.admin_title || assetData.title || `Image ${assetData.id}`);
      // --- Add per-use caption/alt text fields ---
      const $captionInput = $('<input type="text" class="caption-override" placeholder="Caption (optional)">');
      const $altInput = $('<input type="text" class="alt-override" placeholder="Alt text (optional)">');
      $polaroid.append($imgContainer).append($title).append($captionInput).append($altInput);
      const $actions = $('<div class="section-image-actions" style="margin-top:2px;display:flex;gap:2px;justify-content:center;"></div>');
      $actions.append(
        $('<button class="action-icon btn-change-edit-section-image" title="Change/Edit"><i class="fas fa-edit"></i></button>')
          .on('click', function(e) {
            e.preventDefault();
            $section.find('.section-image-interactive-area').removeClass('has-image').show();
            $polaroid.remove();
          })
      );
      $actions.append(
        $('<button class="action-icon btn-remove-section-image" title="Remove"><i class="fas fa-trash"></i></button>')
          .on('click', function(e) {
            e.preventDefault();
            $section.find('.section-image-interactive-area').removeClass('has-image').show();
            $polaroid.remove();
            $section.find('.section-asset-id-input').val('');
            $section.find('.section-variant-id-input').val('');
          })
      );
      $polaroid.append($actions);
      $section.find('.section-image-interactive-area').addClass('has-image').hide();
      $section.append($polaroid);
    }

    // --- Show polaroid preview for gallery image ---
    function showGalleryPolaroid($section, assetData) {
      let extraClass = '';
      if (assetData.physical_source_asset_id && assetData.physical_source_asset_id !== assetData.id) {
        extraClass = 'virtual-asset';
      } else if (assetData.variant_type || assetData.is_variant) {
        extraClass = 'variant-asset';
      }
      // Prevent duplicate polaroids for same asset in gallery
      const $galleryPreview = $section.find('.gallery-preview-container');
      if ($galleryPreview.find('.section-polaroid-preview[data-asset-id="' + assetData.id + '"]').length > 0) return;
      const $polaroid = $('<div class="section-polaroid-preview"></div>')
        .addClass(extraClass)
        .attr('data-asset-id', assetData.id)
        .data('asset-data', assetData);
      const $imgContainer = $('<div class="image-container"></div>');
      const $img = $('<img>')
        .attr('src', assetData.preview_url || assetData.image_url)
        .attr('alt', assetData.alt_text || assetData.admin_title || assetData.title || 'Gallery Image');
      $imgContainer.append($img);
      const $title = $('<div class="media-title"></div>')
        .text(assetData.admin_title || assetData.title || `Image ${assetData.id}`);
      // --- Add per-use caption/alt text fields ---
      const $captionInput = $('<input type="text" class="caption-override" placeholder="Caption (optional)">');
      const $altInput = $('<input type="text" class="alt-override" placeholder="Alt text (optional)">');
      $polaroid.append($imgContainer).append($title).append($captionInput).append($altInput);
      const $actions = $('<div class="section-image-actions" style="margin-top:2px;display:flex;gap:2px;justify-content:center;"></div>');
      $actions.append(
        $('<button class="action-icon btn-remove-section-image" title="Remove"><i class="fas fa-trash"></i></button>')
          .on('click', function(e) {
            e.preventDefault();
            $polaroid.remove();
            // Optionally: remove from gallery data model if needed
          })
      );
      $polaroid.append($actions);
      $galleryPreview.append($polaroid);
    }

    // --- Show polaroid preview for thumbnail ---
    function showThumbnailPolaroid($dz, assetData) {
      $dz.find('.thumbnail-polaroid-preview').remove();
      let extraClass = '';
      if (assetData.physical_source_asset_id && assetData.physical_source_asset_id !== assetData.id) {
        extraClass = 'virtual-asset';
      } else if (assetData.variant_type || assetData.is_variant) {
        extraClass = 'variant-asset';
      }
      const $polaroid = $('<div class="thumbnail-polaroid-preview section-polaroid-preview"></div>')
        .addClass(extraClass)
        .attr('data-asset-id', assetData.id)
        .data('asset-data', assetData);
      const $imgContainer = $('<div class="image-container"></div>');
      const $img = $('<img>')
        .attr('src', assetData.preview_url || assetData.image_url)
        .attr('alt', assetData.alt_text || assetData.admin_title || assetData.title || 'Thumbnail');
      $imgContainer.append($img);
      const $title = $('<div class="media-title"></div>')
        .text(assetData.admin_title || assetData.title || `Image ${assetData.id}`);
      // --- Add per-use caption/alt text fields for thumbnail as well ---
      const $captionInput = $('<input type="text" class="caption-override" placeholder="Caption (optional)">');
      const $altInput = $('<input type="text" class="alt-override" placeholder="Alt text (optional)">');
      $polaroid.append($imgContainer).append($title).append($captionInput).append($altInput);
      const $actions = $('<div class="section-image-actions" style="margin-top:2px;display:flex;gap:2px;justify-content:center;"></div>');
      $actions.append(
        $('<button class="action-icon btn-change-edit-section-image" title="Change/Edit"><i class="fas fa-edit"></i></button>')
          .on('click', function(e) {
            e.preventDefault();
            $dz.removeClass('has-image').show();
            $polaroid.remove();
          })
      );
      $actions.append(
        $('<button class="action-icon btn-remove-section-image" title="Remove"><i class="fas fa-trash"></i></button>')
          .on('click', function(e) {
            e.preventDefault();
            $dz.removeClass('has-image').show();
            $polaroid.remove();
            $dz.find('input[type="hidden"]').val('');
          })
      );
      $polaroid.append($actions);
      $dz.addClass('has-image').hide();
      $dz.after($polaroid);
    }

    // --- Unified Drop Handler for Article Dropzones (delegated & mutation observer) ---
    function setupDropzone($dz) {
      // Prevent double-initialization
      if ($dz.data('dropzone-initialized')) return;
      // Determine contextType from data-target-type or class
      let contextType = $dz.data('target-type');
      if (!contextType) {
        if ($dz.hasClass('thumbnail-dropzone-area')) contextType = 'thumbnail';
        else if ($dz.hasClass('section-image-interactive-area')) contextType = 'sectionImage';
        else if ($dz.hasClass('dropzone-gallery')) contextType = 'galleryImageAddition';
        else contextType = 'unknown';
      }
      $dz.droppable({
        accept: '.global-media-item, .staging-media-item',
        hoverClass: 'dropzone-hover-active',
        drop: function(event, ui) {
          const $dragged = ui.draggable;
          const assetData = $dragged.data('asset-data') || $(ui.helper).data('asset-data');
          console.log('[Dropzones] Dropzone:', contextType, 'Drop event:', event, 'Asset:', assetData, 'Dropzone:', this);
          if (assetData && assetData.id) {
            // getContext logic
            let getContext = function($el) {
              if (contextType === 'thumbnail') {
                return {
                  type: 'thumbnail',
                  instanceId: null,
                  $targetElement: $el,
                  updateCallback: typeof updateThumbnailDisplay === 'function' ? updateThumbnailDisplay : function(){}
                };
              } else if (contextType === 'sectionImage') {
                const $section = $el.closest('.modular-section');
                return {
                  type: 'sectionImage',
                  instanceId: $section.data('section-instance-id'),
                  $targetElement: $section,
                  updateCallback: $section.data('updateDisplayFunction') || function(){}
                };
              } else if (contextType === 'galleryImageAddition') {
                const $section = $el.closest('.modular-section');
                return {
                  type: 'galleryImageAddition',
                  instanceId: $section.data('section-instance-id'),
                  $targetElement: $section,
                  updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                    if (finalMasterAsset && finalMasterAsset.id && typeof addImageToGalleryDataModel === 'function') {
                      addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny);
                    }
                  }
                };
              } else {
                return { type: contextType, $targetElement: $el };
              }
            };
            window.currentArticleImageTarget = getContext($(this));
            if (typeof window.openUIEForArticleContextGlobal === 'function') {
              window.openUIEForArticleContextGlobal(
                assetData,
                window.currentArticleImageTarget,
                {
                  context: contextType === 'thumbnail' ? 'articleThumbnail' :
                           contextType === 'sectionImage' ? 'articleSectionImage' :
                           contextType === 'galleryImageAddition' ? 'articleGalleryItemAdd' : '',
                  contextualUseButtonText: contextType === 'thumbnail' ? 'Use for Thumbnail' :
                                           contextType === 'sectionImage' ? 'Use for Section' :
                                           contextType === 'galleryImageAddition' ? 'Add to Gallery & Use' : '',
                  onContextualUse: function(finalAsset) {
                    if (contextType === 'sectionImage') {
                      const $section = $dz.closest('.modular-section');
                      showSectionPolaroid($section, finalAsset);
                    } else if (contextType === 'galleryImageAddition') {
                      const $section = $dz.closest('.modular-section');
                      showGalleryPolaroid($section, finalAsset);
                    } else if (contextType === 'thumbnail') {
                      showThumbnailPolaroid($dz, finalAsset);
                    }
                    // --- Trigger autosave after media assignment ---
                    if (typeof Autosave !== 'undefined' && typeof Autosave.captureAndSave === 'function') {
                      Autosave.captureAndSave();
                    }
                  }
                }
              );
            }
            return;
          }
        }
      });
      $dz.data('dropzone-initialized', true);
    }

    // Initial setup for all current dropzones
    function setupAllDropzones() {
      $(
        '.dropzone, .dropzone-gallery, .section-image-interactive-area, .thumbnail-dropzone-area'
      ).each(function() {
        setupDropzone($(this));
      });
    }
    setupAllDropzones();

    // MutationObserver to auto-initialize new dropzones
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        $(mutation.addedNodes).each(function() {
          if (this.nodeType === 1) {
            const $el = $(this);
            if ($el.is('.dropzone, .dropzone-gallery, .section-image-interactive-area, .thumbnail-dropzone-area')) {
              setupDropzone($el);
            }
            // Also check descendants
            $el.find('.dropzone, .dropzone-gallery, .section-image-interactive-area, .thumbnail-dropzone-area').each(function() {
              setupDropzone($(this));
            });
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // --- Paste Handler for all dropzones ---
    $(document).on('paste', '.thumbnail-dropzone-area, .section-image-interactive-area, .dropzone-gallery', function(e) {
      const $dz = $(this);
      let files = [];
      let clipboardData = (e.originalEvent || e).clipboardData;
      if (clipboardData && clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          if (clipboardData.files[i].type.startsWith("image/")) {
            files.push(clipboardData.files[i]);
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        if ($dz.hasClass('thumbnail-dropzone-area')) {
          window.currentArticleImageTarget = { type: 'thumbnail', instanceId: null, $targetElement: $dz, updateCallback: typeof updateThumbnailDisplay === 'function' ? updateThumbnailDisplay : function(){} };
        } else if ($dz.hasClass('section-image-interactive-area')) {
          const $section = $dz.closest('.modular-section');
          window.currentArticleImageTarget = { type: 'sectionImage', instanceId: $section.data('section-instance-id'), $targetElement: $section, updateCallback: $section.data('updateDisplayFunction') || function(){} };
        } else if ($dz.hasClass('dropzone-gallery')) {
          const $section = $dz.closest('.modular-section');
          window.currentArticleImageTarget = { type: 'galleryImageAddition', instanceId: $section.data('section-instance-id'), $targetElement: $section, updateCallback: function(finalMasterAsset, finalVariantIfAny) { if (finalMasterAsset && finalMasterAsset.id && typeof addImageToGalleryDataModel === 'function') { addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny); } } };
        }
        if (window.currentArticleImageTarget.type === 'galleryImageAddition') {
          files.forEach(file => {
            MediaUpload.processSingleFileForDrop(file, function(uploadResponse) {
              if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                window.openUIEForArticleContextGlobal(uploadResponse.media, window.currentArticleImageTarget, {
                  context: 'articleGalleryItemAdd',
                  contextualUseButtonText: 'Add to Gallery & Use',
                  onContextualUse: function(finalAsset) {
                    const $section = $dz.closest('.modular-section');
                    showGalleryPolaroid($section, finalAsset);
                  }
                });
              }
            });
          });
        } else {
          MediaUpload.processSingleFileForDrop(files[0], function(uploadResponse) {
            if (uploadResponse && uploadResponse.success && uploadResponse.media) {
              let uieOpts = {};
              if (window.currentArticleImageTarget.type === 'thumbnail') {
                uieOpts.context = 'articleThumbnail';
                uieOpts.contextualUseButtonText = 'Use for Thumbnail';
                uieOpts.onContextualUse = function(finalAsset) {
                  showThumbnailPolaroid($dz, finalAsset);
                };
              } else if (window.currentArticleImageTarget.type === 'sectionImage') {
                uieOpts.context = 'articleSectionImage';
                uieOpts.contextualUseButtonText = 'Use for Section';
                uieOpts.onContextualUse = function(finalAsset) {
                  const $section = $dz.closest('.modular-section');
                  showSectionPolaroid($section, finalAsset);
                };
              }
              window.openUIEForArticleContextGlobal(uploadResponse.media, window.currentArticleImageTarget, uieOpts);
            }
          });
        }
      }
    });

    // --- Re-initialize staging items draggable after any update ---
    if (typeof StagingArea !== 'undefined' && StagingArea.makeStagingItemsDraggable) {
      StagingArea.makeStagingItemsDraggable();
    }
  }

  // Expose init
  window.Dropzones = { init: init };
  $(document).ready(init);
})(jQuery);

// Handler for removing polaroids from generic dropzones (for non-medialibrary contexts)
$(document).on("click", ".polaroid .remove-photo", function(e) {
  e.preventDefault();
  var $polaroid = $(this).closest(".polaroid");
  if ($polaroid.closest('#global-media').length > 0) { return; } // Ignore for media library items
  var $container = $polaroid.closest(".thumbnail-preview, .image-preview-container, .gallery-container");
  var $parentDropzone = $container.siblings(".dropzone:not(.medialibrary-dropzone):not(.section-specific-dropzone)");

  if ($container.hasClass("gallery-container")) {
      $polaroid.fadeOut(300, function() { $(this).remove(); });
      $container.closest('form').trigger('input'); // For autosave
      return;
  }

  if ($parentDropzone.length) {
    $polaroid.fadeOut(300, function() {
      $(this).remove();
      if ($container.children().length === 0) {
        $parentDropzone.show();
        // Clear associated hidden inputs for these generic dropzones
        $parentDropzone.siblings("input[name='thumbnail_cropped_data'], input[name*='cropped_image_data']").val('');
      }
      $parentDropzone.closest('form').trigger('input'); // For autosave
    });
  }
});

// --- Gallery image reordering (drag-and-drop within gallery-preview-container) ---
$(document).on('mousedown', '.gallery-preview-container .section-polaroid-preview', function(e) {
  const $polaroid = $(this);
  const $container = $polaroid.closest('.gallery-preview-container');
  $polaroid.attr('draggable', true);
  $polaroid[0].ondragstart = function(ev) {
    ev.originalEvent = ev;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', $polaroid.index());
    $polaroid.addClass('dragging');
  };
  $polaroid[0].ondragend = function(ev) {
    $polaroid.removeClass('dragging');
  };
});

$(document).on('dragover', '.gallery-preview-container .section-polaroid-preview', function(e) {
  e.preventDefault();
  $(this).addClass('dragover');
});

$(document).on('dragleave', '.gallery-preview-container .section-polaroid-preview', function(e) {
  $(this).removeClass('dragover');
});

$(document).on('drop', '.gallery-preview-container .section-polaroid-preview', function(e) {
  e.preventDefault();
  $(this).removeClass('dragover');
  const $target = $(this);
  const $container = $target.closest('.gallery-preview-container');
  const draggingIdx = $container.find('.section-polaroid-preview.dragging').index();
  const targetIdx = $target.index();
  if (draggingIdx === targetIdx) return;
  const $dragged = $container.find('.section-polaroid-preview.dragging');
  if (draggingIdx < targetIdx) {
    $target.after($dragged);
  } else {
    $target.before($dragged);
  }
  $dragged.removeClass('dragging');
  // Trigger autosave after reorder
  if (typeof Autosave !== 'undefined' && typeof Autosave.captureAndSave === 'function') {
    Autosave.captureAndSave();
  }
});
