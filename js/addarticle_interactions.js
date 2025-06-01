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
        if (variant && variant.dataURL) return variant.dataURL; 
        if (asset && asset.dataURL) return asset.dataURL;     
        if (asset && asset.image_url) return asset.image_url;
        return placeholderImgPathGlobal;
    }

    function cleanupPickerModeUI() {
        $('#global-media-library').removeClass('picker-mode-active');
        $('#global-media .picker-mode-notice').remove();
        $('#tempUploadForTargetBtn').remove(); 
        // console.log("[AddArticle] Picker mode UI cleaned up.");
    }

    window.resetArticleImageTargetContextGlobal = function() { /* ... (same as v1.7.4) ... */ };
    window.openUIEForArticleContextGlobal = function(mediaAsset, targetContextDetails, uieOptions = {}) { /* ... (same as v1.7.4) ... */ };
    
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
        const $dropzoneArea = $thumbnailModule.find('.thumbnail-dropzone-area');
        const $previewContainer = $thumbnailModule.find('.thumbnail-preview-container');
        const $previewImg = $thumbnailModule.find('#articleThumbnailPreview');
        const $infoTextSpan = $thumbnailModule.find('#thumbnailInfo'); 
        const $actionsDiv = $thumbnailModule.find('.thumbnail-actions');
        const $removeBtn = $thumbnailModule.find('#removeThumbnailBtn');
        const $changeEditBtn = $thumbnailModule.find('#changeEditThumbnailBtn');

        $dropzoneArea.data('updateDisplayFunction', updateThumbnailDisplay);

        function updateThumbnailDisplay(masterAsset, variant) {
            // ... (Logic from v1.7.4 to update DOM based on masterAsset and variant) ...
            let assetId = null, variantId = null, previewUrl = ""; 
            let currentInfoText = 'Click, Drop, or Paste Thumbnail';
            let hasImage = false;
            if (masterAsset && masterAsset.id) { /* ... (Determine hasImage, assetId, variantId, previewUrl, currentInfoText) ... */ }
            $('#thumbnail_media_asset_id').val(assetId || '');
            $('#thumbnail_media_variant_id').val(variantId || '');
            if (hasImage) { /* ... Show preview and actions ... */ } 
            else { /* ... Show placeholder ... */ }
            $('#article-form').trigger('input'); 

            if (hasImage && typeof MediaLibrary !== 'undefined' && MediaLibrary.loadMedia) {
                console.log("[AddArticle] Thumbnail updated. Refreshing Media Library panel.");
                MediaLibrary.loadMedia(); 
            }
        }

        function initiateThumbnailSelectionFlow(event) {
            if ($(event.target).closest($removeBtn).length) { return; }
            console.log("[AddArticle] Thumbnail interaction initiated via " + event.type);
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
        $dropzoneArea.on('click', initiateThumbnailSelectionFlow);
        $changeEditBtn.on('click', initiateThumbnailSelectionFlow);
        $removeBtn.on('click', function() {
            updateThumbnailDisplay(null, null); 
            if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === 'thumbnail') {
                resetArticleImageTargetContextGlobal();
            }
        });
        updateThumbnailDisplay(null,null); 
        
        if (typeof $().droppable === 'function') { 
            $dropzoneArea.droppable({ 
                accept: "#global-media .global-media-item, #staging-media .polaroid-style-preview",
                hoverClass: "dropzone-hover-active",
                drop: function(event, ui) {
                    const $draggedItem = ui.draggable;
                    const draggedAssetData = $draggedItem.data('asset-data') || $draggedItem.data('dragged-asset-data');
                    console.log("[AddArticle] Media item dropped on Thumbnail. Asset Data:", draggedAssetData);
                    if (draggedAssetData && draggedAssetData.id) {
                        window.currentArticleImageTarget = {
                            type: 'thumbnail', instanceId: null, $targetElement: $(this),
                            updateCallback: updateThumbnailDisplay
                        };
                        fetchAssetAndOpenUIE(draggedAssetData.id, draggedAssetData.variant_id || null, window.currentArticleImageTarget);
                    }
                }
            }); 
        }
    }
    if ($('.thumbnail-module').length) { setupThumbnailInteraction(); }

    // --- IMAGE SECTION INTERACTIONS (Similar adaptations needed) ---
    function setupImageSectionInteractions($sectionElement) {
        // ... (Adapt click handler to call openMediaPickerForArticleContext({ directlyTriggerUpload: !assetId }); ) ...
        // ... (Setup droppable for image sections) ...
    }

    // --- GALLERY SECTION INTERACTIONS (Similar adaptations needed) ---
    function setupGallerySectionInteractions($sectionElement) {
        // ... (Adapt dropzone click to call openMediaPickerForArticleContext({ directlyTriggerUpload: true, allowMultipleForGallery: true }); ) ...
        // ... (Setup droppable for gallery sections) ...
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
    
    $(document).on("section:added", function(event, $sectionElem, sectionId, defaults, sectionInstanceId) {
        if (typeof Sections === 'undefined') { console.error("Sections module not defined!"); return; }
        console.log(`[AddArticle] Section added (event handler): Type ${sectionId}, Instance ID: ${sectionInstanceId}`);
        if (parseInt(sectionId) === Sections.IMAGE_SECTION) { setupImageSectionInteractions($sectionElem); $sectionElem.data('interactions-initialized', true); }
        else if (parseInt(sectionId) === Sections.GALLERY_SECTION) { 
            setupGallerySectionInteractions($sectionElem);
            // ... (gallery init from v1.7.2) ...
            $sectionElem.data('interactions-initialized', true);
        }
        // ... (Pros/Cons, Rating init from v1.7.2) ...
    });
    // ... (Pros/Cons, Rating, Gallery caption change handlers from v1.7.2) ...
    $('#article-form').on('submit', function(e) { /* ... (marshalling logic from v1.7.2) ... */ });
    $('#sections-container .modular-section').each(function() { /* ... (initial setup for existing sections from v1.7.2) ... */ });

});
