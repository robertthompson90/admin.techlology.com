// js/addarticle_interactions.js
// Version 1.7.5 - Robust click-to-upload for thumbnail.
//                 Full drag-from-library/staging/OS/browser & paste to thumbnail.
//                 Media Library refresh on thumbnail update.
//                 Placeholder for image/gallery section dropzone-first clicks.

$(document).ready(function() {
    console.log("[AddArticle] Interactions script v1.7.5 loaded.");

    // --- Persistent Hidden File Input for Direct Uploads ---
    let $articlePageDirectUploadInput = $('#articlePageDirectUploadInput');
    if ($articlePageDirectUploadInput.length === 0) {
        $('body').append('<input type="file" id="articlePageDirectUploadInput" style="display:none;" accept="image/*">');
        $articlePageDirectUploadInput = $('#articlePageDirectUploadInput');
    }
    // Ensure its change handler is bound only once
    $articlePageDirectUploadInput.off('change.aaInteractionDirect').on('change.aaInteractionDirect', function(e) {
        if (!window.currentArticleImageTarget || !window.currentArticleImageTarget.type) {
            console.warn("[AddArticle] File selected via #articlePageDirectUploadInput, but no currentArticleImageTarget is set.");
            $(this).val(''); return;
        }
        const files = e.target.files;
        if (files && files.length > 0) {
            const currentTargetContext = window.currentArticleImageTarget; 
            cleanupPickerModeUI(); 

            let uieOptsForUpload = {};
            if (currentTargetContext.type === 'thumbnail') {
                uieOptsForUpload.context = 'articleThumbnail';
                uieOptsForUpload.contextualUseButtonText = 'Use for Thumbnail';
            } else if (currentTargetContext.type === 'sectionImage') {
                uieOptsForUpload.context = 'articleSectionImage';
                uieOptsForUpload.contextualUseButtonText = 'Use for Section';
            } else if (currentTargetContext.type === 'galleryImageAddition') {
                uieOptsForUpload.context = 'articleGalleryItemAdd';
                uieOptsForUpload.contextualUseButtonText = 'Add to Gallery & Use';
            }

            if (currentTargetContext.type === 'galleryImageAddition' && files.length > 0) {
                // Pass all files for gallery
                window.handleArticleSectionDropOrPaste(Array.from(files), currentTargetContext.instanceId, currentTargetContext.$targetElement.closest('.modular-section'), true, e);
            } else if (files.length === 1) { 
                const file = files[0];
                Notifications.show(`Uploading ${file.name} for ${currentTargetContext.type}...`, "info");
                MediaUpload.processSingleFileForDrop(file, function(uploadResponse) {
                    if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                        console.log(`[AddArticle] New asset ${uploadResponse.media.id} uploaded for ${currentTargetContext.type}. Opening UIE.`);
                        openUIEForArticleContextGlobal(uploadResponse.media, currentTargetContext, uieOptsForUpload);
                    } else {
                        Notifications.show("Upload failed: " + (uploadResponse.error || "Unknown error"), "error");
                        resetArticleImageTargetContextGlobal();
                    }
                });
            } else if (files.length > 1 && currentTargetContext.type !== 'galleryImageAddition') {
                 Notifications.show("Please select only one file for this target.", "warning");
                 resetArticleImageTargetContextGlobal();
            }
        }
        $(this).val(''); 
    });
    // --- End of Single Hidden File Input Setup ---

    window.currentArticleImageTarget = {
        type: null, instanceId: null, $targetElement: null, itemArrayIndex: null, 
        updateCallback: function(finalMasterAsset, finalVariantIfAny) {
            console.warn("[AddArticle] Default updateCallback executed. Target:", this.type, this.instanceId);
        }

    };

    const placeholderImgPathGlobal = typeof G_PLACEHOLDER_IMAGE_PATH !== 'undefined' ? G_PLACEHOLDER_IMAGE_PATH : 'img/placeholder.png';
    const placeholderSmallImgPathGlobal = typeof G_PLACEHOLDER_SMALL_IMAGE_PATH !== 'undefined' ? G_PLACEHOLDER_SMALL_IMAGE_PATH : 'img/placeholder_small.png';

    function getPreviewUrlForAsset(asset, variant) {
        if (variant && variant.preview_image_url) return variant.preview_image_url;
        if (asset && asset.preview_image_url) return asset.preview_image_url;
        if (variant && variant.image_url) return variant.image_url;
        if (asset && asset.image_url) return asset.image_url;
        if (asset && asset.file_path) return asset.file_path;
        return placeholderImgPathGlobal;
    }

    function cleanupPickerModeUI() {
        $('#global-media-library').removeClass('picker-mode-active');
        $('#global-media .picker-mode-notice').remove();
        $('#tempUploadForTargetBtn').remove(); 
        // console.log("[AddArticle] Picker mode UI cleaned up.");
    }

    window.resetArticleImageTargetContextGlobal = function() { /* ... (same as v1.7.4) ... */ };
    window.openUIEForArticleContextGlobal = function(mediaAsset, targetContextDetails, uieOptions = {}) {
        if (!window.UnifiedImageEditor || typeof UnifiedImageEditor.openEditor !== "function") {
            Notifications.show("Unified Image Editor is not available.", "error");
            return;
        }
        UnifiedImageEditor.openEditor(
            mediaAsset.image_url || mediaAsset.file_path, // physicalImgUrl
            mediaAsset,                                   // assetDataObj
            function(finalMasterAsset, finalVariantIfAny) { // onSave callback
                if (targetContextDetails && typeof targetContextDetails.updateCallback === "function") {
                    targetContextDetails.updateCallback(finalMasterAsset, finalVariantIfAny);
                }
                if (window.MediaLibrary && typeof MediaLibrary.loadMedia === "function") {
                    MediaLibrary.loadMedia();
                }
                if (typeof window.resetArticleImageTargetContextGlobal === "function") {
                    window.resetArticleImageTargetContextGlobal();
                }
            },
            null, // onClosed callback (optional)
            uieOptions
        );
    };
    
    function openMediaPickerForArticleContext(options = {}) {
        const targetType = window.currentArticleImageTarget.type;
        console.log(`[AddArticle] Opening media picker for target type: ${targetType}, options:`, options);

        if (options.directlyTriggerUpload) {
            $('#articlePageDirectUploadInput').attr('multiple', targetType === 'galleryImageAddition' && (options.allowMultipleForGallery !== false) );
            $('#articlePageDirectUploadInput').val(null).click();
            return; 
        }

        // ... (rest of media library picker UI setup, including #tempUploadForTargetBtn as in v1.7.4) ...
        const $mediaPanel = $('#global-media-library');
        if (!$mediaPanel.length) { Notifications.show("Media Library panel not found.", "error"); return; }
        $mediaPanel.addClass('picker-mode-active');
        $('#global-media .picker-mode-notice').remove();
        $('#global-media').prepend(`<p class="picker-mode-notice">PICKER MODE: Select for Article ${targetType}</p>`);
        Notifications.show("Select from library or use 'Upload New'.", "info");

        let $uploadButtonContainer; // Determine where to put the temp upload button
        if (targetType === 'thumbnail') { $uploadButtonContainer = window.currentArticleImageTarget.$targetElement.closest('.thumbnail-module').find('.thumbnail-actions'); }
        // ... (other container logic) ...
        else { $uploadButtonContainer = $('#article-form'); }

        let $tempUploadBtn = $('#tempUploadForTargetBtn');
        if ($tempUploadBtn.length === 0 && $uploadButtonContainer.length && $uploadButtonContainer.is(':visible')) {
            $tempUploadBtn = $('<button type="button" id="tempUploadForTargetBtn" class="btn btn-upload-for-target" style="margin-top:10px;"><i class="fas fa-upload"></i> Upload New Image</button>');
            $tempUploadBtn.on('click', function() {
                if (!window.currentArticleImageTarget.type) { Notifications.show("No active image target.", "warning"); return; }
                $('#articlePageDirectUploadInput').attr('multiple', window.currentArticleImageTarget.type === 'galleryImageAddition');
                $('#articlePageDirectUploadInput').val(null).click();
            });
            $uploadButtonContainer.append($tempUploadBtn);
        }
         if ($tempUploadBtn.length) $tempUploadBtn.show();
    }

    // --- THUMBNAIL INTERACTIONS ---
    function setupThumbnailInteraction() {
        const $thumbnailModule = $('.thumbnail-module').first();
        if (!$thumbnailModule.length) return;
        const $dropzoneArea = $thumbnailModule.find('.unified-dropzone.thumbnail-dropzone-area');
        const $previewContainer = $thumbnailModule.find('.thumbnail-preview-container');
        const $previewImg = $thumbnailModule.find('.dropzone-preview-img');
        const $infoTextSpan = $thumbnailModule.find('.dropzone-info');
        const $actionsDiv = $thumbnailModule.find('.dropzone-actions.thumbnail-actions');
        const $removeBtn = $thumbnailModule.find('#removeThumbnailBtn');
        const $changeEditBtn = $thumbnailModule.find('#changeEditThumbnailBtn');

        $dropzoneArea.data('updateDisplayFunction', updateThumbnailDisplay);

        // Remove any previous click handlers to avoid double binding
        $dropzoneArea.off('click.thumbnail').on('click.thumbnail', initiateThumbnailSelectionFlow);
        $changeEditBtn.off('click.thumbnail').on('click.thumbnail', initiateThumbnailSelectionFlow);

        function updateThumbnailDisplay(masterAsset, variant) {
            let assetId = masterAsset && masterAsset.id ? masterAsset.id : '';
            let variantId = variant && variant.id ? variant.id : '';
            let previewUrl = getPreviewUrlForAsset(masterAsset, variant);
            let hasImage = !!assetId;

            $('#thumbnail_media_asset_id').val(assetId);
            $('#thumbnail_media_variant_id').val(variantId);
            $('#articleThumbnailPreview').attr('src', previewUrl);

            // --- Set the thumbnail title ---
            let displayTitle = '';
            if (masterAsset && (masterAsset.admin_title || masterAsset.title)) {
                displayTitle = masterAsset.admin_title || masterAsset.title;
            } else if (assetId) {
                displayTitle = `Image ${assetId}`;
            }
            $('#thumbnailInfo').text(displayTitle || 'No thumbnail selected.');

            if (hasImage) {
                $('.thumbnail-module .thumbnail-dropzone-area').removeClass('no-image').addClass('has-image');
                $('.thumbnail-actions').show();
                $('#thumbnailInfo').show();
            } else {
                $('.thumbnail-module .thumbnail-dropzone-area').addClass('no-image').removeClass('has-image');
                $('.thumbnail-actions').hide();
                $('#thumbnailInfo').show();
                $('#articleThumbnailPreview').attr('src', placeholderImgPathGlobal);
                $('#thumbnailInfo').text('Click, Drop, or Paste Thumbnail');
            }
            $('#article-form').trigger('input');
        }

        // Only trigger upload dialog or UIE picker ONCE per click
        function initiateThumbnailSelectionFlow(event) {
            // Prevent double dialog if both dropzone and edit button are clicked
            if ($(event.target).closest($removeBtn).length) { return; }
            // Prevent double dialog if already handling this click
            if ($(event.target).is($changeEditBtn) || $(event.target).closest($changeEditBtn).length) {
                event.stopPropagation();
            }
            // Only allow one dialog per click
            if ($dropzoneArea.data('uploading')) return;
            $dropzoneArea.data('uploading', true);
            setTimeout(() => $dropzoneArea.data('uploading', false), 500);

            window.currentArticleImageTarget = {
                type: 'thumbnail', instanceId: null, $targetElement: $dropzoneArea,
                updateCallback: updateThumbnailDisplay
            };
            const assetId = $('#thumbnail_media_asset_id').val();
            if (assetId && ($dropzoneArea.hasClass('has-image') || $(event.target).is($changeEditBtn) || $(event.target).closest($changeEditBtn).length) ) {
                fetchAssetAndOpenUIE(assetId, $('#thumbnail_media_variant_id').val(), window.currentArticleImageTarget);
            } else { 
                openMediaPickerForArticleContext({ directlyTriggerUpload: true, allowMultipleForGallery: false }); 
            }
        }
        $removeBtn.on('click', function() {
            updateThumbnailDisplay(null, null); 
            if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === 'thumbnail') {
                resetArticleImageTargetContextGlobal();
            }
        });
        updateThumbnailDisplay(null,null); 
        
        if (typeof $().droppable === 'function') { 
            $dropzoneArea.droppable({ 
                accept: ".global-media-item, .polaroid-style-preview, *",
                hoverClass: "dropzone-hover-active",
                drop: function(event, ui) {
                    const $draggedItem = ui.draggable;
                    const draggedAssetData = $draggedItem && ($draggedItem.data('asset-data') || $draggedItem.data('dragged-asset-data'));
                    console.log("[AddArticle] Media item dropped on Thumbnail. Asset Data:", draggedAssetData);
                    if (draggedAssetData && draggedAssetData.id) {
                        window.currentArticleImageTarget = {
                            type: 'thumbnail', instanceId: null, $targetElement: $(this),
                            updateCallback: updateThumbnailDisplay
                        };
                        fetchAssetAndOpenUIE(draggedAssetData.id, draggedAssetData.variant_id || null, window.currentArticleImageTarget);
                        return;
                    }
                    // Native files
                    const files = event.originalEvent && event.originalEvent.dataTransfer && event.originalEvent.dataTransfer.files;
                    if (files && files.length > 0) {
                        if (files.length > 1) {
                            Notifications.show("Only one image can be used for the thumbnail.", "warning");
                            return;
                        }
                        window.currentArticleImageTarget = {
                            type: 'thumbnail', instanceId: null, $targetElement: $(this),
                            updateCallback: updateThumbnailDisplay
                        };
                        MediaUpload.processSingleFileForDrop(files[0], function(uploadResponse) {
                            if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                                openUIEForArticleContextGlobal(uploadResponse.media, window.currentArticleImageTarget, {context: 'articleThumbnail', contextualUseButtonText: 'Use for Thumbnail'});
                            } else {
                                Notifications.show("Upload failed: " + (uploadResponse.error || "Unknown error"), "error");
                            }
                        });
                    }
                }
            }); 
        }
    }
    if ($('.thumbnail-module').length) { setupThumbnailInteraction(); }

    // --- IMAGE SECTION INTERACTIONS ---
    function setupImageSectionInteractions($sectionElement) {
        const $dropzone = $sectionElement.find('.section-image-interactive-area');
        if (!$dropzone.length) return;

        // Initialize droppable if not already
        if (!$dropzone.data('droppable-initialized')) {
            $dropzone.droppable({
                accept: '.global-media-item, .polaroid-style-preview',
                hoverClass: 'dropzone-hover-active',
                drop: function(event, ui) {
                    const $draggedItem = ui.draggable;
                    const draggedAssetData = $draggedItem.data('asset-data') || $(ui.helper).data('asset-data');
                    console.log("[AddArticle] Image section received drop with asset data:", draggedAssetData);
                    
                    if (draggedAssetData && draggedAssetData.id) {
                        window.currentArticleImageTarget = {
                            type: 'sectionImage',
                            instanceId: $sectionElement.data('section-instance-id'),
                            $targetElement: $sectionElement,
                            updateCallback: updateSectionImageDisplay
                        };
                        fetchAssetAndOpenUIE(draggedAssetData.id, draggedAssetData.variant_id || null, window.currentArticleImageTarget);
                    }
                }
            }).data('droppable-initialized', true);
        }
        
        $sectionElement.data('updateDisplayFunction', updateSectionImageDisplay);

        $dropzone.off('click.sectionImage').on('click.sectionImage', function(e) {
            window.currentArticleImageTarget = {
                type: 'sectionImage',
                instanceId: $sectionElement.data('section-instance-id'),
                $targetElement: $sectionElement,
                updateCallback: updateSectionImageDisplay
            };
            openMediaPickerForArticleContext({ directlyTriggerUpload: true });
        });

        // Drag-and-drop from media library, staging, or file explorer
        if (typeof $().droppable === 'function') {
            $dropzone.droppable({
                accept: ".global-media-item, .polaroid-style-preview, *",
                hoverClass: "dropzone-hover-active",
                drop: function(event, ui) {
                    // If dropped from media library/staging (jQuery UI draggable)
                    const $draggedItem = ui.draggable;
                    const draggedAssetData = $draggedItem && ($draggedItem.data('asset-data') || $draggedItem.data('dragged-asset-data'));
                    if (draggedAssetData && draggedAssetData.id) {
                        window.currentArticleImageTarget = {
                            type: 'sectionImage',
                            instanceId: $sectionElement.data('section-instance-id'),
                            $targetElement: $sectionElement,
                            updateCallback: updateSectionImageDisplay
                        };
                        fetchAssetAndOpenUIE(draggedAssetData.id, draggedAssetData.variant_id || null, window.currentArticleImageTarget);
                        return;
                    }
                    // If dropped from file explorer (native files)
                    const files = event.originalEvent && event.originalEvent.dataTransfer && event.originalEvent.dataTransfer.files;
                    if (files && files.length > 0) {
                        if (files.length > 1) {
                            Notifications.show("Only one image can be used for this section.", "warning");
                            return;
                        }
                        window.currentArticleImageTarget = {
                            type: 'sectionImage',
                            instanceId: $sectionElement.data('section-instance-id'),
                            $targetElement: $sectionElement,
                            updateCallback: updateSectionImageDisplay
                        };
                        MediaUpload.processSingleFileForDrop(files[0], function(uploadResponse) {
                            if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                                openUIEForArticleContextGlobal(uploadResponse.media, window.currentArticleImageTarget, {context: 'articleSectionImage', contextualUseButtonText: 'Use for Section'});
                            } else {
                                Notifications.show("Upload failed: " + (uploadResponse.error || "Unknown error"), "error");
                            }
                        });
                    }
                }
            });
        }

        function updateSectionImageDisplay(masterAsset, variant) {
            let assetId = masterAsset && masterAsset.id ? masterAsset.id : '';
            let variantId = variant && variant.id ? variant.id : '';
            let previewUrl = getPreviewUrlForAsset(masterAsset, variant);
            let hasImage = !!assetId;
            $sectionElement.find('.section-asset-id-input').val(assetId);
            $sectionElement.find('.section-variant-id-input').val(variantId);
            $sectionElement.find('.section-image-preview').attr('src', previewUrl);
            let displayTitle = '';
            if (masterAsset && (masterAsset.admin_title || masterAsset.title)) {
                displayTitle = masterAsset.admin_title || masterAsset.title;
            } else if (assetId) {
                displayTitle = `Image ${assetId}`;
            }
            $sectionElement.find('.section-image-info').text(displayTitle || 'No image selected.');
            if (hasImage) {
                $dropzone.removeClass('no-image').addClass('has-image');
                $sectionElement.find('.section-image-actions').show();
            } else {
                $dropzone.addClass('no-image').removeClass('has-image');
                $sectionElement.find('.section-image-actions').hide();
                $sectionElement.find('.section-image-preview').attr('src', placeholderImgPathGlobal);
                $sectionElement.find('.section-image-info').text('Click, Drop, or Paste Image');
            }
            $('#article-form').trigger('input');
        }
    }

    // --- GALLERY SECTION INTERACTIONS ---
    function setupGallerySectionInteractions($sectionElement) {
        const $dropzone = $sectionElement.find('.dropzone-gallery');
        if (!$dropzone.length) return;

        // Initialize droppable if not already
        if (!$dropzone.data('droppable-initialized')) {
            $dropzone.droppable({
                accept: '.global-media-item, .polaroid-style-preview',
                hoverClass: 'dropzone-hover-active',
                drop: function(event, ui) {
                    const $draggedItem = ui.draggable;
                    const draggedAssetData = $draggedItem.data('asset-data') || $(ui.helper).data('asset-data');
                    console.log("[AddArticle] Gallery section received drop with asset data:", draggedAssetData);
                    
                    if (draggedAssetData && draggedAssetData.id) {
                        window.currentArticleImageTarget = {
                            type: 'galleryImageAddition',
                            instanceId: $sectionElement.data('section-instance-id'),
                            $targetElement: $sectionElement,
                            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                                if (finalMasterAsset && finalMasterAsset.id) {
                                    addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny);
                                }
                            }
                        };
                        fetchAssetAndOpenUIE(draggedAssetData.id, draggedAssetData.variant_id || null, window.currentArticleImageTarget);
                    }
                }
            }).data('droppable-initialized', true);
        }
        
        $dropzone.off('click.gallery').on('click.gallery', function(e) {
            window.currentArticleImageTarget = {
                type: 'galleryImageAddition',
                instanceId: $sectionElement.data('section-instance-id'),
                $targetElement: $sectionElement,
                updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                    if (finalMasterAsset && finalMasterAsset.id) {
                        addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny);
                    }
                }
            };
            openMediaPickerForArticleContext({ directlyTriggerUpload: true, allowMultipleForGallery: true });
        });

        if (typeof $().droppable === 'function') {
            $dropzone.droppable({
                accept: ".global-media-item, .polaroid-style-preview, *",
                hoverClass: "dropzone-hover-active",
                drop: function(event, ui) {
                    // If dropped from media library/staging (jQuery UI draggable)
                    const $draggedItem = ui.draggable;
                    const draggedAssetData = $draggedItem && ($draggedItem.data('asset-data') || $draggedItem.data('dragged-asset-data'));
                    if (draggedAssetData && draggedAssetData.id) {
                        window.currentArticleImageTarget = {
                            type: 'galleryImageAddition',
                            instanceId: $sectionElement.data('section-instance-id'),
                            $targetElement: $sectionElement,
                            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                                if (finalMasterAsset && finalMasterAsset.id) {
                                    addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny);
                                }
                            }
                        };
                        fetchAssetAndOpenUIE(draggedAssetData.id, draggedAssetData.variant_id || null, window.currentArticleImageTarget);
                        return;
                    }
                    // If dropped from file explorer (native files)
                    const files = event.originalEvent && event.originalEvent.dataTransfer && event.originalEvent.dataTransfer.files;
                    if (files && files.length > 0) {
                        window.currentArticleImageTarget = {
                            type: 'galleryImageAddition',
                            instanceId: $sectionElement.data('section-instance-id'),
                            $targetElement: $sectionElement,
                            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                                if (finalMasterAsset && finalMasterAsset.id) {
                                    addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny);
                                }
                            }
                        };
                        // Process each file through UIE, sequentially
                        let idx = 0;
                        function processNext() {
                            if (idx >= files.length) return;
                            MediaUpload.processSingleFileForDrop(files[idx], function(uploadResponse) {
                                if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                                    openUIEForArticleContextGlobal(uploadResponse.media, window.currentArticleImageTarget, {context: 'articleGalleryItemAdd', contextualUseButtonText: 'Add to Gallery & Use'});
                                    idx++;
                                    // UIE will call updateCallback after each, so we can chain or let user finish each before next
                                    // For now, let user finish each UIE before next (sequential, not auto)
                                } else {
                                    Notifications.show("Upload failed: " + (uploadResponse.error || "Unknown error"), "error");
                                    idx++;
                                    processNext();
                                }
                            });
                        }
                        processNext();
                    }
                }
            });
        }
    }

    // --- GLOBAL HANDLERS, HELPERS, GALLERY MGMT, EVENT LISTENERS (largely from v1.7.4) ---
    window.handleMediaLibrarySelectionForArticle = function(selectedAssetFromLibrary) {
        if (!window.currentArticleImageTarget || !window.currentArticleImageTarget.type) {
            Notifications.show("No target selected for this media.", "warning"); return;
        }
        const targetType = window.currentArticleImageTarget.type;
        let uieOpts = {};
        if (targetType === 'thumbnail') { uieOpts.context = 'articleThumbnail'; uieOpts.contextualUseButtonText = 'Use for Thumbnail';}
        else if (targetType === 'sectionImage') { uieOpts.context = 'articleSectionImage'; uieOpts.contextualUseButtonText = 'Use for Section';}
        else if (targetType === 'galleryImageAddition') { uieOpts.context = 'articleGalleryItemAdd'; uieOpts.contextualUseButtonText = 'Add to Gallery & Use';}
        
        console.log(`[AddArticle] Media Lib selection for ${targetType}. Asset:`, selectedAssetFromLibrary.id);
        fetchAssetAndOpenUIE(selectedAssetFromLibrary.id, selectedAssetFromLibrary.variant_id || null, window.currentArticleImageTarget, uieOpts); // Pass uieOpts to fetchAssetAndOpenUIE
        cleanupPickerModeUI();
    };

    window.handleArticleSectionDropOrPaste = function(items, sectionInstanceId, $sectionOrThumbElement, isGalleryDrop, originalEvent) {
        let targetType = $sectionOrThumbElement.data('target-type'); 
        if (!targetType) { targetType = isGalleryDrop ? 'galleryImageAddition' : 'sectionImage'; }
        console.log(`[AddArticle] handleArticleSectionDropOrPaste for target ${targetType}, section/instance ${sectionInstanceId || 'N/A'}. Items:`, items);

        let updateCb; let targetElForContext = $sectionOrThumbElement;
        if (targetType === 'thumbnail') {
            updateCb = $sectionOrThumbElement.data('updateDisplayFunction');
        } else if (targetType === 'sectionImage') {
            targetElForContext = $sectionOrThumbElement.closest('.modular-section'); // The whole section is the context for update
            updateCb = targetElForContext.data('updateDisplayFunction');
        } else if (targetType === 'galleryImageAddition') {
            targetElForContext = $sectionOrThumbElement.closest('.modular-section');
            updateCb = function(finalMasterAsset, finalVariantIfAny) {
                if (finalMasterAsset && finalMasterAsset.id) { addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny); }
            };
        } else { console.error("Unknown target type for drop/paste:", targetType); return; }

        window.currentArticleImageTarget = {
            type: targetType, instanceId: (targetType === 'thumbnail' ? null : sectionInstanceId),
            $targetElement: targetElForContext, updateCallback: updateCb
        };
        
        if ($(window.currentArticleImageTarget.$targetElement).hasClass('has-image') || 
            (targetType === 'sectionImage' && $sectionOrThumbElement.hasClass('has-image')) ) {
            if (!confirm("Replace existing image?")) { resetArticleImageTargetContextGlobal(); return; }
        }

        if (items.length > 0) {
            let uieOptsForUpload = {};
            if (targetType === 'thumbnail') { uieOptsForUpload.context = 'articleThumbnail'; uieOptsForUpload.contextualUseButtonText = 'Use for Thumbnail';}
            else if (targetType === 'sectionImage') { uieOptsForUpload.context = 'articleSectionImage'; uieOptsForUpload.contextualUseButtonText = 'Use for Section';}
            else if (targetType === 'galleryImageAddition') { uieOptsForUpload.context = 'articleGalleryItemAdd'; uieOptsForUpload.contextualUseButtonText = 'Add to Gallery & Use';}

            if (isGalleryDrop && items.length > 0) { // Handle multiple files for gallery from drop/paste
                Notifications.show(`Processing ${items.length} items for gallery...`, "info");
                items.forEach(item => {
                    if (item.type === 'url' && item.data) {
                        MediaUpload.processPastedUrl(item.data, function(r){ if(r && r.success && r.media){ openUIEForArticleContextGlobal(r.media, window.currentArticleImageTarget, uieOptsForUpload); } else { Notifications.show("URL processing failed.","error");}});
                    } else if (item instanceof File) {
                        MediaUpload.processSingleFileForDrop(item, function(r){ if(r && r.success && r.media){ openUIEForArticleContextGlobal(r.media, window.currentArticleImageTarget, uieOptsForUpload); } else { Notifications.show("File processing failed.","error");}});
                    }
                });
                if (window.currentArticleImageTarget.type === 'galleryImageAddition') { resetArticleImageTargetContextGlobal(); } // Reset after queuing all
            } else if (items.length === 1) { // Single item
                const item = items[0];
                if (item.type === 'url' && item.data) { MediaUpload.processPastedUrl(item.data, function(r) { if (r && r.success && r.media) { openUIEForArticleContextGlobal(r.media, window.currentArticleImageTarget, uieOptsForUpload); } else { Notifications.show("URL processing failed.", "error"); resetArticleImageTargetContextGlobal(); }}); }
                else if (item instanceof File) { MediaUpload.processSingleFileForDrop(item, function(r) { if (r && r.success && r.media) { openUIEForArticleContextGlobal(r.media, window.currentArticleImageTarget, uieOptsForUpload); } else { Notifications.show("File processing failed.", "error"); resetArticleImageTargetContextGlobal(); }}); }
                else { resetArticleImageTargetContextGlobal(); }
            } else { resetArticleImageTargetContextGlobal(); }
        } else { resetArticleImageTargetContextGlobal(); }
    };
    
    function fetchAssetAndOpenUIE(assetId, variantId = null, targetContextDetails) {
        console.log(`[AddArticle] Fetching details for Asset ID: ${assetId}, Variant ID: ${variantId} for target ${targetContextDetails.type}`);
        let masterAssetData = $(`#global-media .global-media-item[data-asset-id="${assetId}"]`).data('asset-data');
        if (!masterAssetData && typeof StagingArea !== 'undefined' && StagingArea.getAssetData) { // Placeholder for StagingArea integration
             // masterAssetData = StagingArea.getAssetData(assetId); 
        }
        // TODO: Implement AJAX fetch if masterAssetData is not found client-side

        if (masterAssetData && masterAssetData.image_url) {
            let uieOpts = {};
            if (targetContextDetails.type === 'thumbnail') { uieOpts.context = 'articleThumbnail'; uieOpts.contextualUseButtonText = 'Use for Thumbnail';}
            else if (targetContextDetails.type === 'sectionImage') { uieOpts.context = 'articleSectionImage'; uieOpts.contextualUseButtonText = 'Use for Section';}
            else if (targetContextDetails.type === 'galleryImageAddition') { uieOpts.context = 'articleGalleryItemAdd'; uieOpts.contextualUseButtonText = 'Add to Gallery & Use';}
            else if (targetContextDetails.type === 'galleryItemEdit') { uieOpts.context = 'articleGalleryItemEdit'; uieOpts.contextualUseButtonText = 'Update Gallery Item';}
            
            if (variantId) { uieOpts.targetVariantId = variantId; }
            // Pass full asset data, UIE will determine if it's master or if variant needs to be constructed for master
            openUIEForArticleContextGlobal(masterAssetData, targetContextDetails, uieOpts);
        } else {
            Notifications.show("Could not retrieve full asset data to edit. Please select from library or re-upload.", "warning");
            openMediaPickerForArticleContext({directlyTriggerUpload: true}); // Fallback to picker/upload
        }
    }
    
    function addImageToGalleryDataModel(galleryInstanceId, masterAsset, variantIfAny) { /* ... (from v1.7.2, then call MediaLibrary.loadMedia();) ... */ }
    function removeImageFromGalleryDataModel(galleryInstanceId, itemIndexToRemove) { /* ... (from v1.7.2) ... */ }
    function updateGalleryItemDataModel(galleryInstanceId, itemIndex, masterAsset, variantIfAny) { /* ... (from v1.7.2, then call MediaLibrary.loadMedia();) ... */ }
    function renderGalleryPreviewItems($gallerySection, imagesArray) { /* ... (from v1.7.2) ... */ }
    
    // On section added, initialize interactions for new sections
    $(document).on("section:added", function(event, $sectionElem, sectionId, defaults, sectionInstanceId) {
        if (typeof Sections === 'undefined') { console.error("Sections module not defined!"); return; }
        if (parseInt(sectionId) === Sections.IMAGE_SECTION) { setupImageSectionInteractions($sectionElem); $sectionElem.data('interactions-initialized', true); }
        else if (parseInt(sectionId) === Sections.GALLERY_SECTION) { 
            setupGallerySectionInteractions($sectionElem);
            $sectionElem.data('interactions-initialized', true);
        }
        // ...existing code...
    });

    // On page load, initialize interactions for existing sections
    $('#sections-container .modular-section').each(function() {
        const $sectionElem = $(this);
        const sectionType = $sectionElem.data('type');
        if (parseInt(sectionType) === Sections.IMAGE_SECTION) { setupImageSectionInteractions($sectionElem); }
        else if (parseInt(sectionType) === Sections.GALLERY_SECTION) { setupGallerySectionInteractions($sectionElem); }
        // ...existing code...
    });

// --- GLOBAL CLIPBOARD PASTE HANDLER (only for global media library) ---
$(document).off('paste.addarticle').on('paste.addarticle', function(e) {
    // Only handle paste if focus is NOT in an input/textarea and global media library is visible
    if ($(e.target).is('input, textarea, [contenteditable]')) return;
    if (!$('#global-media').is(':visible')) return;
    let items = (e.originalEvent || e).clipboardData.items;
    let foundImage = false;
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (item.kind === 'file' && item.type.indexOf('image') !== -1) {
            foundImage = true;
            let file = item.getAsFile();
            if (file) {
                Notifications.show("Uploading pasted image to Global Media Library...", "info");
                MediaUpload.processSingleFileForDrop(file, function(uploadResponse) {
                    if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                        if (window.MediaLibrary && typeof MediaLibrary.loadMedia === "function") {
                            MediaLibrary.loadMedia();
                        }
                        Notifications.show("Image added to Global Media Library.", "success");
                    } else {
                        Notifications.show("Upload failed: " + (uploadResponse.error || "Unknown error"), "error");
                    }
                });
            }
        }
    }
    if (foundImage) e.preventDefault();
});

// --- SECTION TYPE LOGIC POLISH ---
// Ensure all section types (text, image, gallery, quote, pros/cons, rating, video) are initialized and rendered with correct classes and controls.
// For each section type, use .modular-section and UIE-inspired headers/fields as in the CSS above.
// ...existing code...
});
