// js/addarticle_interactions.js
// Version 1.7 - Dropzone-first for thumbnail & sections. Drag-from-library.
//               Manages preview/placeholder visibility. Font Awesome icons.
//               Handles optional sources section.

$(document).ready(function() {
    console.log("[AddArticle] Interactions script v1.7 loaded.");

    window.currentArticleImageTarget = {
        type: null, instanceId: null, $targetElement: null,
        updateCallback: function(finalMasterAsset, finalVariantIfAny) {
            console.warn("Default updateCallback. Target:", this.type, this.instanceId, "Asset:", finalMasterAsset);
        }
    };

    const placeholderImgPathGlobal = typeof G_PLACEHOLDER_IMAGE_PATH !== 'undefined' ? G_PLACEHOLDER_IMAGE_PATH : 'img/placeholder.png';
    const placeholderSmallImgPathGlobal = typeof G_PLACEHOLDER_SMALL_IMAGE_PATH !== 'undefined' ? G_PLACEHOLDER_SMALL_IMAGE_PATH : 'img/placeholder_small.png';

    function getPreviewUrlForAsset(asset, variant) {
        if (variant && variant.preview_image_url) return variant.preview_image_url;
        if (asset && asset.preview_image_url) return asset.preview_image_url;
        // If UIE returns a dataURL on the asset/variant object for preview after transforms
        if (variant && variant.dataURL) return variant.dataURL;
        if (asset && asset.dataURL) return asset.dataURL;
        if (asset && asset.image_url) return asset.image_url; // Master's physical URL as last resort
        return placeholderImgPathGlobal;
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

        function updateThumbnailDisplay(masterAsset, variant) {
            let assetId = null, variantId = null, previewUrl = ""; // No placeholder by default for src
            let currentInfoText = 'Click, Drop, or Paste Thumbnail';
            let hasImage = false;

            if (masterAsset && masterAsset.id) {
                hasImage = true; assetId = masterAsset.id;
                let title = masterAsset.admin_title || masterAsset.title || `Image ${assetId}`;
                if (variant && variant.id) {
                    variantId = variant.id;
                    previewUrl = getPreviewUrlForAsset(masterAsset, variant);
                    currentInfoText = `${title} (Variant: ${variant.variant_type || `ID ${variant.id}`})`;
                } else {
                    previewUrl = getPreviewUrlForAsset(masterAsset, null);
                    currentInfoText = title;
                }
            }

            $('#thumbnail_media_asset_id').val(assetId || '');
            $('#thumbnail_media_variant_id').val(variantId || '');
            
            if (hasImage) {
                $previewImg.attr('src', previewUrl).show();
                $previewContainer.show();
                $infoTextSpan.text(currentInfoText).removeClass('dropzone-placeholder-text');
                $dropzoneArea.removeClass('no-image').addClass('has-image').attr('title', 'Click to Change/Edit Thumbnail');
                $actionsDiv.css('display', 'flex');
            } else {
                $previewImg.attr('src', '').hide(); // Clear src and hide
                $previewContainer.hide();
                $infoTextSpan.text('Click, Drop, or Paste Thumbnail').addClass('dropzone-placeholder-text');
                $dropzoneArea.removeClass('has-image').addClass('no-image').attr('title', 'Click, Drop, or Paste Image for Thumbnail');
                $actionsDiv.hide();
            }
            $('#article-form').trigger('input');
        }

        function initiateThumbnailSelection(event) {
            if ($(event.target).closest($actionsDiv).length && !$(event.target).is($changeEditBtn) && !$(event.target).closest($changeEditBtn).length) {
                return; // Don't proceed if remove button itself was clicked
            }
            console.log("[AddArticle] Thumbnail interaction initiated.");
            window.currentArticleImageTarget = {
                type: 'thumbnail', instanceId: null, $targetElement: $dropzoneArea,
                updateCallback: updateThumbnailDisplay
            };
            const assetId = $('#thumbnail_media_asset_id').val();
            if (assetId) {
                fetchAssetAndOpenUIE(assetId, $('#thumbnail_media_variant_id').val(), window.currentArticleImageTarget);
            } else {
                openMediaPickerForArticleContext();
            }
        }
        
        $dropzoneArea.on('click', initiateThumbnailSelection);
        $changeEditBtn.on('click', initiateThumbnailSelection);

        $removeBtn.on('click', function() {
            updateThumbnailDisplay(null, null);
            if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === 'thumbnail') {
                resetArticleImageTargetContext();
            }
        });
        
        updateThumbnailDisplay(null,null); // Initial empty state
    }
    if ($('.thumbnail-module').length) { setupThumbnailInteraction(); }


    // --- IMAGE SECTION INTERACTIONS ---
    function setupImageSectionInteractions($sectionElement) {
        const sectionInstanceId = $sectionElement.data('section-instance-id');
        const $dropzoneArea = $sectionElement.find('.section-image-interactive-area');
        const $previewContainer = $sectionElement.find('.section-image-preview-container');
        const $previewImg = $sectionElement.find('.section-image-preview');
        const $infoTextSpan = $sectionElement.find('.section-image-info.media-item-title');
        const $placeholderTextDiv = $sectionElement.find('.dropzone-placeholder-text');
        const $actionsDiv = $sectionElement.find('.section-image-actions');
        const $removeBtn = $sectionElement.find('.btn-remove-section-image');
        const $changeEditBtn = $sectionElement.find('.btn-change-edit-section-image');

        function updateImageSectionDisplay(masterAsset, variant) {
            let assetId = null, variantId = null, previewUrl = "";
            let currentInfoText = 'Click, Drop, or Paste Image';
            let hasImage = false;

            if (masterAsset && masterAsset.id) {
                hasImage = true; assetId = masterAsset.id;
                let title = masterAsset.admin_title || masterAsset.title || `Image ${assetId}`;
                if (variant && variant.id) {
                    variantId = variant.id;
                    previewUrl = getPreviewUrlForAsset(masterAsset, variant);
                    currentInfoText = `${title} (Variant: ${variant.variant_type || `ID ${variant.id}`})`;
                } else {
                    previewUrl = getPreviewUrlForAsset(masterAsset, null);
                    currentInfoText = title;
                }
            }
            $sectionElement.find('.section-asset-id-input').val(assetId || '');
            $sectionElement.find('.section-variant-id-input').val(variantId || '');
            
            if(hasImage) {
                $previewImg.attr('src', previewUrl).show();
                $previewContainer.show();
                $infoTextSpan.text(currentInfoText).show();
                $placeholderTextDiv.hide();
                $dropzoneArea.removeClass('no-image').addClass('has-image').attr('title', 'Click to Change/Edit Image');
                $actionsDiv.css('display', 'flex');
            } else {
                $previewImg.attr('src', '').hide();
                $previewContainer.hide();
                $infoTextSpan.text(currentInfoText).hide();
                $placeholderTextDiv.text('Click, Drop, or Paste Image').show();
                $dropzoneArea.removeClass('has-image').addClass('no-image').attr('title', 'Click, Drop, or Paste Image');
                $actionsDiv.hide();
            }
            $('#article-form').trigger('input');
        }

        function initiateSectionImageSelection(event) {
            if ($(event.target).closest($actionsDiv).length && !$(event.target).is($changeEditBtn) && !$(event.target).closest($changeEditBtn).length) {
                return;
            }
            console.log(`[AddArticle] Image Section ${sectionInstanceId} interaction initiated.`);
            window.currentArticleImageTarget = {
                type: 'sectionImage', instanceId: sectionInstanceId, $targetElement: $sectionElement,
                updateCallback: updateImageSectionDisplay
            };
            const assetId = $sectionElement.find('.section-asset-id-input').val();
            if (assetId) {
                fetchAssetAndOpenUIE(assetId, $sectionElement.find('.section-variant-id-input').val(), window.currentArticleImageTarget);
            } else {
                openMediaPickerForArticleContext();
            }
        }

        $dropzoneArea.on('click', initiateSectionImageSelection);
        $changeEditBtn.on('click', initiateSectionImageSelection);

        $removeBtn.on('click', function() {
            updateImageSectionDisplay(null, null);
            if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === 'sectionImage' && window.currentArticleImageTarget.instanceId === sectionInstanceId) {
                resetArticleImageTargetContext();
            }
        });
        
        updateImageSectionDisplay(null,null); // Initial empty state
    }

    // --- GALLERY SECTION INTERACTIONS ---
    function setupGallerySectionInteractions($sectionElement) { /* ... (as in v1.6) ... */ }

    window.handleArticleSectionDropOrPaste = function(items, sectionInstanceId, $sectionElement, isGalleryDrop, originalEvent) { /* ... (as in v1.6, ensure updateCallback is correctly passed/used) ... */ }

    function openMediaPickerForArticleContext() { /* ... (as in v1.6, ensure $uploadButtonContainer placement is robust and button text is generic "Upload New") ... */ }
    
    window.openUIEForArticleContextGlobal = function(mediaAsset, targetContextDetails, uieOptions = {}) {
        console.log("[AddArticle] Global Opening UIE for context:", targetContextDetails.type, "Asset ID:", mediaAsset.id, "Options:", uieOptions);
        UnifiedImageEditor.openEditor(
            mediaAsset.image_url, // Physical URL of the master asset
            mediaAsset,           // The master asset object
            function(finalMasterAsset, finalVariantIfAny) { // UIE's "Use this" or "Save" callback
                console.log("[AddArticle] UIE finalized for target:", targetContextDetails.type, "Final Master Asset:", finalMasterAsset, "Final Variant:", finalVariantIfAny);
                if (targetContextDetails.updateCallback) {
                    targetContextDetails.updateCallback(finalMasterAsset, finalVariantIfAny);
                }
                if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === targetContextDetails.type && window.currentArticleImageTarget.instanceId === targetContextDetails.instanceId) {
                    if (targetContextDetails.type !== 'galleryImageAddition') { // Keep context for multiple gallery adds
                        resetArticleImageTargetContext();
                    } else { console.log("[AddArticle] Gallery context preserved for potential multiple additions."); }
                }
            },
            function() { // UIE's onClosed callback
                console.log("[AddArticle] UIE closed for target:", targetContextDetails.type);
                cleanupPickerModeUI();
                if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === targetContextDetails.type && window.currentArticleImageTarget.instanceId === targetContextDetails.instanceId) {
                    resetArticleImageTargetContext();
                }
            },
            uieOptions // Pass UIE specific options
        );
    }
    window.resetArticleImageTargetContextGlobal = function() { /* ... (as in v1.6) ... */ }
    function cleanupPickerModeUI() { /* ... (as in v1.6) ... */ }

    function addImageToGalleryDataModel(galleryInstanceId, masterAsset, variantIfAny) { /* ... (as in v1.6) ... */ }
    function removeImageFromGalleryDataModel(galleryInstanceId, itemIndexToRemove, assetIdForLog) { /* ... (as in v1.6) ... */ }
    function updateGalleryItemDataModel(galleryInstanceId, itemIndex, masterAsset, variantIfAny) { /* ... (as in v1.6) ... */ }
    function renderGalleryPreviewItems($gallerySection, imagesArray) { /* ... (as in v1.6, ensure uses placeholderSmallImgPathGlobal) ... */ }

    function fetchAssetAndOpenUIE(assetId, variantId = null, targetContextDetails) {
        console.log(`[AddArticle] Attempting to fetch details for Asset ID: ${assetId}, Variant ID: ${variantId} for target ${targetContextDetails.type}`);
        // In a real app, this would be an AJAX call: $.get('ajax/getMediaAssetDetails.php', {id: assetId, variant_id: variantId (optional)}, function(response){...})
        // The response should contain the full master asset object and, if variantId was given and valid, the specific variant object.
        // For now, we simulate by trying to find it in the loaded media library items as a fallback.
        let masterAssetData = null;
        let variantDataForUIE = null;

        // Try to find the master asset in the global media list (this is a simplification)
        const $libraryItem = $(`#global-media .global-media-item[data-asset-id="${assetId}"]`);
        if ($libraryItem.length) {
            masterAssetData = $libraryItem.data('asset-data');
            // If the item itself was a variant representation, we need its master's data
            if (masterAssetData.is_variant && masterAssetData.media_asset_id_for_variant) {
                 // This reconstruction is imperfect; getGlobalMedia.php provides these master_ fields
                let trueMaster = {
                    id: masterAssetData.media_asset_id_for_variant,
                    admin_title: masterAssetData.master_admin_title,
                    image_url: masterAssetData.image_url, // This IS the physical URL of the master
                    physical_source_asset_id: masterAssetData.master_physical_source_asset_id,
                    default_crop: masterAssetData.master_default_crop,
                    filter_state: masterAssetData.master_filter_state,
                    // ... other essential master fields ...
                };
                // If we are asked to edit a specific variant of this master
                if (variantId && String(variantId) === String(masterAssetData.variant_id)) {
                    variantDataForUIE = masterAssetData; // The clicked item was the variant
                }
                masterAssetData = trueMaster;
            } else if (variantId) {
                // Master was clicked, but a variant ID is specified (e.g. from stored thumbnail data)
                // We'd need to find this variant among the master's variants if UIE can't do it by ID alone.
                // For now, UIE will be passed the targetVariantId.
            }
        }

        if (masterAssetData && masterAssetData.image_url) {
            let uieOpenOpts = {};
            if (variantId) { uieOpenOpts.targetVariantId = variantId; }
            openUIEForArticleContextGlobal(masterAssetData, targetContextDetails, uieOpenOpts);
        } else {
            Notifications.show("Could not retrieve full asset data to edit. Please select from library again or re-upload.", "warning");
            openMediaPickerForArticleContext(); // Fallback to picker
        }
    }

    $(document).on("section:added", function(event, $sectionElem, sectionId, defaults, sectionInstanceId) {
        console.log(`[AddArticle] Section added (event): Type ${sectionId}, Instance ID: ${sectionInstanceId}`);
        if (parseInt(sectionId) === IMAGE_SECTION) { setupImageSectionInteractions($sectionElem); }
        else if (parseInt(sectionId) === GALLERY_SECTION) {
            setupGallerySectionInteractions($sectionElem);
            const $jsonInput = $sectionElem.find('.gallery-images-json-input');
            let galleryImages = []; try { galleryImages = JSON.parse($jsonInput.val() || '[]'); } catch(e) {}
            renderGalleryPreviewItems($sectionElem, galleryImages);
            $sectionElem.find('.sortable-gallery').sortable({ /* ... */ }).disableSelection();
        }
        // ... (Pros/Cons, Rating init from v1.5) ...
    });
    // ... (Other event handlers from v1.5: Pros/Cons, Rating, Gallery caption, MediaLibrary init, Form Submit) ...
    $('#article-form').on('submit', function(e) { /* ... (same as v1.5) ... */ });
});
