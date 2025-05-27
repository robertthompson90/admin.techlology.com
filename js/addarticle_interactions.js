// js/addarticle_interactions.js
// Version 1.4 - Added pre-submit data marshalling for Pros & Cons sections.
//               Ensures Gallery JSON is up-to-date.

$(document).ready(function() {
    console.log("[AddArticle] Interactions script v1.4 loaded (Pre-Submit Marshalling).");

    // --- Global Context Management (same as v1.3) ---
    window.currentArticleImageTarget = {
        type: null, instanceId: null, $sectionElement: null,
        updateCallback: function(finalMasterAsset, finalVariantIfAny) {
            console.warn("Default updateCallback triggered. Target type was:", this.type, "Asset:", finalMasterAsset, "Variant:", finalVariantIfAny);
        }
    };

    function getPreviewUrlForAsset(asset, variant) {
        if (variant && variant.preview_image_url) return variant.preview_image_url;
        if (asset && asset.preview_image_url) return asset.preview_image_url;
        if (variant && variant.image_url) return variant.image_url;
        if (asset && asset.image_url) return asset.image_url;
        return 'img/placeholder.png';
    }

    // --- Thumbnail Interaction Logic (same as v1.3) ---
    $('#selectOrEditThumbnailBtn').on('click', function() {
        console.log("[AddArticle] 'Select/Edit Thumbnail' button clicked.");
        window.currentArticleImageTarget = {
            type: 'thumbnail',
            instanceId: null,
            $sectionElement: null,
            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                console.log("[AddArticle] Thumbnail updateCallback. Master:", finalMasterAsset, "Variant:", finalVariantIfAny);
                let assetIdToStore = null, variantIdToStore = null, previewUrl = 'img/placeholder.png', infoText = 'No thumbnail selected.';
                let displayTitleForInfo = 'Untitled';
                if (finalMasterAsset && finalMasterAsset.id) {
                    assetIdToStore = finalMasterAsset.id;
                    displayTitleForInfo = finalMasterAsset.admin_title || finalMasterAsset.title || `Image ${finalMasterAsset.id}`;
                    if (finalVariantIfAny && finalVariantIfAny.id) {
                        variantIdToStore = finalVariantIfAny.id;
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, finalVariantIfAny);
                        infoText = `Asset: ${displayTitleForInfo}, Variant: ${finalVariantIfAny.variant_type || `ID ${finalVariantIfAny.id}`}`;
                    } else {
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, null);
                        infoText = `Asset: ${displayTitleForInfo}`;
                         if (finalMasterAsset.preview_image_url) { previewUrl = finalMasterAsset.preview_image_url; }
                    }
                }
                $('#thumbnail_media_asset_id').val(assetIdToStore || '');
                $('#thumbnail_media_variant_id').val(variantIdToStore || '');
                $('#articleThumbnailPreview').attr('src', previewUrl).show();
                $('#thumbnailInfo').text(infoText);
                $('#removeThumbnailBtn').toggle(!!assetIdToStore);
                $('#article-form').trigger('input');
            }
        };
        openMediaPickerForArticleContext();
    });
    $('#removeThumbnailBtn').on('click', function() {
        $('#thumbnail_media_asset_id').val(''); $('#thumbnail_media_variant_id').val('');
        $('#articleThumbnailPreview').attr('src', 'img/placeholder.png'); $('#thumbnailInfo').text('No thumbnail selected.');
        $(this).hide();
        if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === 'thumbnail') { resetArticleImageTargetContext(); }
        $('#article-form').trigger('input');
    });

    // --- Image Section Button Interaction Logic (same as v1.3) ---
    $('#sections-container').on('click', '.btn-select-section-image', function() {
        var $sectionDiv = $(this).closest('.modular-section');
        var sectionInstanceId = $sectionDiv.data('section-instance-id');
        if (!sectionInstanceId) { console.error("[AddArticle] Missing section instance ID for 'Select/Edit Image'."); return; }
        console.log(`[AddArticle] 'Select/Edit Image' button clicked for section: ${sectionInstanceId}`);
        window.currentArticleImageTarget = {
            type: 'sectionImage', instanceId: sectionInstanceId, $sectionElement: $sectionDiv,
            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                console.log(`[AddArticle] Image Section updateCallback for ${this.instanceId}. Master:`, finalMasterAsset, "Variant:", finalVariantIfAny);
                let assetIdToStore = null, variantIdToStore = null, previewUrl = 'img/placeholder.png', infoText = 'No image selected.';
                let displayTitleForInfo = 'Untitled';
                if (finalMasterAsset && finalMasterAsset.id) {
                    assetIdToStore = finalMasterAsset.id;
                    displayTitleForInfo = finalMasterAsset.admin_title || finalMasterAsset.title || `Image ${finalMasterAsset.id}`;
                    if (finalVariantIfAny && finalVariantIfAny.id) {
                        variantIdToStore = finalVariantIfAny.id;
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, finalVariantIfAny);
                        infoText = `Asset: ${displayTitleForInfo}, Variant: ${finalVariantIfAny.variant_type || `ID ${finalVariantIfAny.id}`}`;
                    } else {
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, null);
                        infoText = `Asset: ${displayTitleForInfo}`;
                        if (finalMasterAsset.preview_image_url) { previewUrl = finalMasterAsset.preview_image_url; }
                    }
                }
                this.$sectionElement.find('.section-asset-id-input').val(assetIdToStore || '');
                this.$sectionElement.find('.section-variant-id-input').val(variantIdToStore || '');
                this.$sectionElement.find('.section-image-preview').attr('src', previewUrl).show();
                this.$sectionElement.find('.section-image-info').text(infoText);
                this.$sectionElement.find('.btn-remove-section-image').toggle(!!assetIdToStore);
                $('#article-form').trigger('input');
            }
        };
        openMediaPickerForArticleContext();
    });
    $('#sections-container').on('click', '.btn-remove-section-image', function() {
        var $sectionDiv = $(this).closest('.modular-section');
        var sectionInstanceId = $sectionDiv.data('section-instance-id');
        if (!sectionInstanceId) { return; }
        console.log(`[AddArticle] 'Remove Image' clicked for section: ${sectionInstanceId}`);
        $sectionDiv.find('.section-asset-id-input').val(''); $sectionDiv.find('.section-variant-id-input').val('');
        $sectionDiv.find('.section-image-preview').attr('src', 'img/placeholder.png'); $sectionDiv.find('.section-image-info').text('No image selected.');
        $(this).hide();
        if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === 'sectionImage' && window.currentArticleImageTarget.instanceId === sectionInstanceId) {
            resetArticleImageTargetContext();
        }
        $('#article-form').trigger('input');
    });

    // --- Gallery Section Button Interaction Logic (same as v1.3) ---
    $('#sections-container').on('click', '.btn-add-gallery-image', function() {
        var $sectionDiv = $(this).closest('.modular-section');
        var sectionInstanceId = $sectionDiv.data('section-instance-id');
        if (!sectionInstanceId) { console.error("[AddArticle] Missing section instance ID for 'Add Image to Gallery'."); return; }
        console.log(`[AddArticle] 'Add Image to Gallery' button clicked for section: ${sectionInstanceId}`);
        window.currentArticleImageTarget = {
            type: 'galleryImageAddition', instanceId: sectionInstanceId, $sectionElement: $sectionDiv,
            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                console.log(`[AddArticle] Gallery Image Addition updateCallback for ${this.instanceId}. Master:`, finalMasterAsset, "Variant:", finalVariantIfAny);
                if (finalMasterAsset && finalMasterAsset.id) { addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny); }
                else { console.warn("[AddArticle] No valid asset data received from UIE for gallery addition."); }
            }
        };
        openMediaPickerForArticleContext();
    });
    $('#sections-container').on('click', '.remove-gallery-item-btn', function() {
        var $itemPreview = $(this).closest('.gallery-item-preview');
        var assetId = $itemPreview.data('asset-id');
        var $gallerySection = $(this).closest('.modular-section');
        var galleryInstanceId = $gallerySection.data('section-instance-id');
        console.log(`[AddArticle] Remove image (Asset: ${assetId}) from gallery: ${galleryInstanceId}`);
        removeImageFromGalleryDataModel(galleryInstanceId, assetId);
        $itemPreview.fadeOut(300, function() { $(this).remove(); });
        $('#article-form').trigger('input');
    });

    /**
     * Global handler for section drop/paste (same as v1.3)
     */
    window.handleArticleSectionDropOrPaste = function(items, sectionInstanceId, $sectionElement, isGalleryDrop, originalEvent) {
        console.log(`[AddArticle] handleArticleSectionDropOrPaste for section ${sectionInstanceId}. Items:`, items, "Is Gallery:", isGalleryDrop);
        const targetType = isGalleryDrop ? 'galleryImageAddition' : 'sectionImage';
        window.currentArticleImageTarget = {
            type: targetType, instanceId: sectionInstanceId, $sectionElement: $sectionElement,
            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                console.log(`[AddArticle] Section updateCallback (from drop/paste) for ${this.instanceId} (Type: ${this.type}). Master:`, finalMasterAsset, "Variant:", finalVariantIfAny);
                let assetIdToStore = null, variantIdToStore = null, previewUrl = 'img/placeholder.png', infoText = 'No image selected.';
                let displayTitleForInfo = 'Untitled';
                if (finalMasterAsset && finalMasterAsset.id) {
                    assetIdToStore = finalMasterAsset.id;
                    displayTitleForInfo = finalMasterAsset.admin_title || finalMasterAsset.title || `Image ${finalMasterAsset.id}`;
                    if (finalVariantIfAny && finalVariantIfAny.id) {
                        variantIdToStore = finalVariantIfAny.id;
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, finalVariantIfAny);
                        infoText = `Asset: ${displayTitleForInfo}, Variant: ${finalVariantIfAny.variant_type || `ID ${finalVariantIfAny.id}`}`;
                    } else {
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, null);
                        infoText = `Asset: ${displayTitleForInfo}`;
                        if (finalMasterAsset.preview_image_url) { previewUrl = finalMasterAsset.preview_image_url; }
                    }
                }
                if (this.type === 'sectionImage') {
                    this.$sectionElement.find('.section-asset-id-input').val(assetIdToStore || '');
                    this.$sectionElement.find('.section-variant-id-input').val(variantIdToStore || '');
                    this.$sectionElement.find('.section-image-preview').attr('src', previewUrl).show();
                    this.$sectionElement.find('.section-image-info').text(infoText);
                    this.$sectionElement.find('.btn-remove-section-image').toggle(!!assetIdToStore);
                } else if (this.type === 'galleryImageAddition') {
                    addImageToGalleryDataModel(this.instanceId, finalMasterAsset, finalVariantIfAny);
                }
                $('#article-form').trigger('input');
            }
        };

        if (items.length === 1) {
            const item = items[0];
            if (item.type === 'url' && item.data) {
                MediaUpload.processPastedUrl(item.data, function(uploadResponse) {
                    cleanupPickerModeUI();
                    if (uploadResponse && uploadResponse.success && uploadResponse.media) { openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget); }
                    else { Notifications.show("Failed to process URL for section: " + (uploadResponse.error || "Unknown"), "error"); resetArticleImageTargetContext(); }
                });
            } else if (item instanceof File) {
                MediaUpload.processSingleFileForDrop(item, function(uploadResponse) {
                    cleanupPickerModeUI();
                    if (uploadResponse && uploadResponse.success && uploadResponse.media) { openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget); }
                    else { Notifications.show("Failed to process image for section: " + (uploadResponse.error || "Unknown"), "error"); resetArticleImageTargetContext(); }
                });
            }
        } else if (items.length > 1 && isGalleryDrop) {
            let UIEProcessingQueue = items.filter(item => item instanceof File);
            function processNextInGalleryQueue() {
                if (UIEProcessingQueue.length === 0) { return; }
                let fileToProcess = UIEProcessingQueue.shift();
                MediaUpload.processSingleFileForDrop(fileToProcess, function(uploadResponse) {
                    if (uploadResponse && uploadResponse.success && uploadResponse.media) { openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget); }
                    else { Notifications.show(`Failed to process gallery image: ${fileToProcess.name}`, "error"); }
                });
            }
            processNextInGalleryQueue();
        } else if (items.length > 1 && !isGalleryDrop) {
             const firstFile = items.find(item => item instanceof File);
             if (firstFile) { MediaUpload.processSingleFileForDrop(firstFile, function(uploadResponse) { cleanupPickerModeUI(); if (uploadResponse && uploadResponse.success && uploadResponse.media) { openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget); } else { resetArticleImageTargetContext(); } }); }
             else { resetArticleImageTargetContext(); }
        } else { resetArticleImageTargetContext(); }
    };

    function openMediaPickerForArticleContext() { /* ... (same as v1.3, ensure $uploadButtonContainer placement is robust) ... */
        const targetType = window.currentArticleImageTarget.type;
        const instanceId = window.currentArticleImageTarget.instanceId;
        const $sectionElement = window.currentArticleImageTarget.$sectionElement;
        console.log(`[AddArticle] Opening media picker for target type: ${targetType}` + (instanceId ? `, Instance ID: ${instanceId}` : ''));
        const $mediaPanel = $('#global-media-library');
        if (!$mediaPanel.length) { Notifications.show("Media Library panel not found.", "error"); return; }
        $mediaPanel.addClass('picker-mode-active');
        $('#global-media .picker-mode-notice').remove();
        $('#global-media').prepend(`<p class="picker-mode-notice" style="text-align:center; background:#1a1d24; color:#9ab; padding:8px; border-bottom:1px solid #333; margin-bottom:10px; border-radius:3px;">PICKER MODE: Select for Article ${targetType} ${instanceId ? `(...${instanceId.slice(-6)})` : ''}</p>`);
        Notifications.show("Select from library or use 'Upload New'.", "info");

        let $uploadButtonContainer;
        if (targetType === 'thumbnail') { $uploadButtonContainer = $('#selectOrEditThumbnailBtn').closest('.thumbnail-controls'); }
        else if (targetType === 'sectionImage' && $sectionElement) { $uploadButtonContainer = $sectionElement.find('.section-image-controls'); }
        else if (targetType === 'galleryImageAddition' && $sectionElement) { $uploadButtonContainer = $sectionElement.find('.section-gallery-controls');}
        else { $uploadButtonContainer = $('#article-form'); }

        let $tempUploadBtn = $('#tempUploadForTargetBtn');
        let $tempDirectUploadInput = $('#tempDirectUploadInput');
        if ($tempUploadBtn.length === 0) {
            if ($tempDirectUploadInput.length === 0) {
                $('body').append('<input type="file" id="tempDirectUploadInput" style="display:none;" accept="image/*" multiple>'); // Added multiple for gallery
                $tempDirectUploadInput = $('#tempDirectUploadInput');
                $tempDirectUploadInput.on('change', function(e) {
                    if (!window.currentArticleImageTarget.type) return;
                    const files = e.target.files;
                    if (files && files.length > 0) {
                        cleanupPickerModeUI(); // Clean up immediately after selection
                        if (window.currentArticleImageTarget.type === 'galleryImageAddition') {
                            Notifications.show(`Uploading ${files.length} images for gallery...`, "info");
                            // For gallery, call the specific handler that can iterate
                            window.handleArticleSectionDropOrPaste(Array.from(files), window.currentArticleImageTarget.instanceId, window.currentArticleImageTarget.$sectionElement, true, e);
                        } else if (files.length === 1) { // Single file for thumbnail or sectionImage
                            Notifications.show(`Uploading ${files[0].name} for ${window.currentArticleImageTarget.type}...`, "info");
                            MediaUpload.processSingleFileForDrop(files[0], function(uploadResponse) {
                                if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                                    openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget);
                                } else { Notifications.show("Upload failed: " + (uploadResponse.error || "Unknown error"), "error"); }
                            });
                        } else {
                             Notifications.show("Please select only one file for this target.", "warning");
                        }
                    }
                    $(this).val(''); // Reset file input
                });
            }
            $uploadButtonContainer.append('<button type="button" id="tempUploadForTargetBtn" class="btn-upload-for-target" style="margin-left:10px; vertical-align:middle;">Upload New</button>');
            $tempUploadBtn = $('#tempUploadForTargetBtn');
            $tempUploadBtn.on('click', function() {
                if (!window.currentArticleImageTarget.type) { Notifications.show("No active image target for upload.", "warning"); return; }
                // Allow multiple file selection if target is gallery
                if (window.currentArticleImageTarget.type === 'galleryImageAddition') {
                    $tempDirectUploadInput.attr('multiple', 'multiple');
                } else {
                    $tempDirectUploadInput.removeAttr('multiple');
                }
                $tempDirectUploadInput.val(null).click();
            });
        }
        $tempUploadBtn.show().detach().appendTo($uploadButtonContainer);
    }

    function openUIEForArticleContext(mediaAsset, targetContextDetails) { /* ... (same as v1.3) ... */
        console.log("[AddArticle] Opening UIE for context:", targetContextDetails.type, "Asset ID:", mediaAsset.id);
        UnifiedImageEditor.openEditor(mediaAsset.image_url, mediaAsset,
            function(finalMasterAsset, finalVariantIfAny) {
                if (targetContextDetails.updateCallback) { targetContextDetails.updateCallback(finalMasterAsset, finalVariantIfAny); }
                if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === targetContextDetails.type && window.currentArticleImageTarget.instanceId === targetContextDetails.instanceId) {
                    if (targetContextDetails.type !== 'galleryImageAddition') { resetArticleImageTargetContext(); }
                    else { console.log("[AddArticle] Gallery context preserved for potential multiple additions."); }
                }
            },
            function() {
                cleanupPickerModeUI();
                if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === targetContextDetails.type && window.currentArticleImageTarget.instanceId === targetContextDetails.instanceId) {
                    resetArticleImageTargetContext();
                }
            }
        );
    }
    function resetArticleImageTargetContext() { /* ... (same as v1.3) ... */
        if (window.currentArticleImageTarget) { window.currentArticleImageTarget.type = null; window.currentArticleImageTarget.instanceId = null; window.currentArticleImageTarget.$sectionElement = null; window.currentArticleImageTarget.updateCallback = function() { /* ... */ };}
    }
    function cleanupPickerModeUI() { /* ... (same as v1.3) ... */
        $('#global-media-library').removeClass('picker-mode-active'); $('#global-media .picker-mode-notice').remove(); $('#tempUploadForTargetBtn').hide();
    }

    // --- Gallery Data Management ---
    function addImageToGalleryDataModel(galleryInstanceId, masterAsset, variantIfAny) {
        const $gallerySection = $(`.modular-section[data-section-instance-id="${galleryInstanceId}"]`);
        if (!$gallerySection.length) return;
        const $jsonInput = $gallerySection.find('.gallery-images-json-input');
        let galleryImages = [];
        try { galleryImages = JSON.parse($jsonInput.val() || '[]'); } catch (e) { galleryImages = []; }
        galleryImages.push({
            asset_id: masterAsset.id,
            variant_id: (variantIfAny ? variantIfAny.id : null),
            caption_override: "",
            preview_url: getPreviewUrlForAsset(masterAsset, variantIfAny)
        });
        $jsonInput.val(JSON.stringify(galleryImages));
        renderGalleryPreviewItems($gallerySection, galleryImages);
        $('#article-form').trigger('input');
    }
    function removeImageFromGalleryDataModel(galleryInstanceId, assetIdToRemove) {
        const $gallerySection = $(`.modular-section[data-section-instance-id="${galleryInstanceId}"]`);
        if (!$gallerySection.length) return;
        const $jsonInput = $gallerySection.find('.gallery-images-json-input');
        let galleryImages = [];
        try { galleryImages = JSON.parse($jsonInput.val() || '[]'); } catch (e) { return; }
        galleryImages = galleryImages.filter(img => String(img.asset_id) !== String(assetIdToRemove));
        $jsonInput.val(JSON.stringify(galleryImages));
        renderGalleryPreviewItems($gallerySection, galleryImages);
        $('#article-form').trigger('input');
    }
    function renderGalleryPreviewItems($gallerySection, imagesArray) {
        const $container = $gallerySection.find('.gallery-preview-container.section-gallery-items-container');
        $container.empty();
        if (imagesArray && imagesArray.length > 0) {
            imagesArray.forEach((imgRef, index) => {
                const itemHtml = `
                    <div class="gallery-item-preview" data-asset-id="${imgRef.asset_id}" data-variant-id="${imgRef.variant_id || ''}" data-array-index="${index}" style="display:inline-block; vertical-align:top; margin:5px; padding:5px; border:1px solid #444; background:#333; text-align:center; position:relative; width: 100px;">
                       <img src="${imgRef.preview_url || 'img/placeholder_small.png'}" alt="Gallery item ${index + 1}" style="width:80px; height:80px; object-fit:cover; display:block; margin-bottom:5px; margin-left:auto; margin-right:auto;">
                       <span style="font-size:0.8em; color:#ccc; display:block; word-wrap:break-word;">A:${imgRef.asset_id}${imgRef.variant_id ? ' V:'+imgRef.variant_id : ''}</span>
                       <input type="text" class="gallery-item-caption-override" value="${imgRef.caption_override || ''}" placeholder="Caption" style="width:90%; box-sizing:border-box; font-size:0.8em; margin-top:3px; background:#222; color:#ddd; border:1px solid #555;">
                       <button type="button" class="remove-gallery-item-btn action-icon" title="Remove from gallery" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:18px; height:18px; line-height:18px; padding:0; cursor:pointer;">&times;</button>
                    </div>`;
                $container.append(itemHtml);
            });
        } else { $container.html('<p style="color:#777; font-style:italic;">No images in gallery yet.</p>'); }
    }

    // --- Event listener for dynamically added sections (Pros/Cons, Rating, Gallery Sortable & Captions) ---
    $(document).on("section:added", function(event, $sectionElem, sectionId, defaults, sectionInstanceId) {
        console.log(`[AddArticle] Section added (event): Type ${sectionId}, Instance ID: ${sectionInstanceId}`);
        if (parseInt(sectionId) === 7) { /* PROS_CONS */ const $prosContainer = $sectionElem.find('.pros-items-container'); const $consContainer = $sectionElem.find('.cons-items-container'); if ($prosContainer.children().length === 0) { $prosContainer.append(Sections.newProsItemRow(sectionInstanceId)); } if ($consContainer.children().length === 0) { $consContainer.append(Sections.newConsItemRow(sectionInstanceId)); } }
        else if (parseInt(sectionId) === 8) { /* RATING */ $sectionElem.find('.rating-star').on('mouseenter',function(){$(this).prevAll('.rating-star').addBack().addClass('hover');$(this).nextAll('.rating-star').removeClass('hover');}).on('mouseleave',function(){$(this).parent().children('.rating-star').removeClass('hover');}).on('click', function() { var $s=$(this);var r=$s.data('value');$s.siblings('.rating-star').removeClass('selected');$s.prevAll('.rating-star').addBack().addClass('selected');$sectionElem.find('.section-rating-value-input').val(r).trigger('input');});}
        else if (parseInt(sectionId) === 5) { // GALLERY_SECTION
            const $jsonInput = $sectionElem.find('.gallery-images-json-input');
            let galleryImages = [];
            try { galleryImages = JSON.parse($jsonInput.val() || '[]'); } catch(e) {}
            renderGalleryPreviewItems($sectionElem, galleryImages); // Render initial items if any from defaults

            $sectionElem.find('.sortable-gallery').sortable({
                items: '.gallery-item-preview', placeholder: 'gallery-item-placeholder',
                update: function(event, ui) {
                    const $gallerySection = ui.item.closest('.modular-section');
                    const $jsonInput = $gallerySection.find('.gallery-images-json-input');
                    let currentGalleryImages = [];
                    try {currentGalleryImages = JSON.parse($jsonInput.val() || '[]');} catch(e){}
                    let newOrder = [];
                    $(this).find('.gallery-item-preview').each(function() {
                        const assetId = $(this).data('asset-id'); const variantId = $(this).data('variant-id');
                        const caption = $(this).find('.gallery-item-caption-override').val();
                        const existingItem = currentGalleryImages.find(img => String(img.asset_id) === String(assetId) && String(img.variant_id || '') === String(variantId || ''));
                        if (existingItem) { newOrder.push({...existingItem, caption_override: caption}); }
                        else { newOrder.push({ asset_id: assetId, variant_id: variantId || null, caption_override: caption, preview_url: $(this).find('img').attr('src') });}
                    });
                    $jsonInput.val(JSON.stringify(newOrder));
                    $('#article-form').trigger('input');
                }
            }).disableSelection();
        }
    });
    $('#sections-container').on('click', '.btn-add-pro', function() { const $pc=$(this).closest('.pros-column').find('.pros-items-container');const si=$(this).closest('.pros-cons-wrapper').data('parent-instance-id');$pc.append(Sections.newProsItemRow(si));$('#article-form').trigger('input'); });
    $('#sections-container').on('click', '.btn-add-con', function() { const $cc=$(this).closest('.cons-column').find('.cons-items-container');const si=$(this).closest('.pros-cons-wrapper').data('parent-instance-id');$cc.append(Sections.newConsItemRow(si));$('#article-form').trigger('input'); });
    $('#sections-container').on('click', '.remove-pro-item', function() { $(this).closest('.pros-item').remove();$('#article-form').trigger('input'); });
    $('#sections-container').on('click', '.remove-cons-item', function() { $(this).closest('.cons-item').remove();$('#article-form').trigger('input'); });
    $('#sections-container').on('input change', '.gallery-item-caption-override', function() {
        const $galleryItem = $(this).closest('.gallery-item-preview');
        const $gallerySection = $galleryItem.closest('.modular-section');
        const $jsonInput = $gallerySection.find('.gallery-images-json-input');
        let galleryImages = []; try { galleryImages = JSON.parse($jsonInput.val() || '[]'); } catch (e) { return; }
        const itemIndex = $galleryItem.data('array-index'); // More reliable if we ensure array-index is updated on sort/remove
        const assetId = $galleryItem.data('asset-id');
        const variantId = $galleryItem.data('variant-id') || null;
        const newCaption = $(this).val();
        // Find by assetId and variantId for robustness, then update
        const foundItemIndex = galleryImages.findIndex(img => String(img.asset_id) === String(assetId) && String(img.variant_id || null) === String(variantId || null));
        if (foundItemIndex > -1) {
            galleryImages[foundItemIndex].caption_override = newCaption;
            $jsonInput.val(JSON.stringify(galleryImages));
            $('#article-form').trigger('input');
        }
    });

    // --- Initialize Media Library Panel (from v1.2) ---
    if ($('#global-media-library').length > 0 && typeof MediaLibrary !== 'undefined' && MediaLibrary.init) {
        MediaLibrary.init();
    }

    // --- PRE-SUBMIT FORM HANDLER ---
    $('#article-form').on('submit', function(e) {
        console.log("[AddArticle] Form submit triggered. Marshalling data...");

        // 1. Ensure Gallery JSON is up-to-date (captions might have changed without sort)
        $('#sections-container .modular-section[data-type="5"]').each(function() { // GALLERY_SECTION = 5
            var $gallerySection = $(this);
            var $jsonInput = $gallerySection.find('.gallery-images-json-input');
            var currentImages = [];
            try { currentImages = JSON.parse($jsonInput.val() || '[]'); } catch (ex) {}
            
            var updatedImages = [];
            $gallerySection.find('.gallery-item-preview').each(function(index) {
                const assetId = $(this).data('asset-id');
                const variantId = $(this).data('variant-id') || null;
                const caption = $(this).find('.gallery-item-caption-override').val();
                const previewUrl = $(this).find('img').attr('src'); // Keep existing preview_url

                // Find original to preserve other potential data, update caption
                let originalItem = currentImages.find(img => String(img.asset_id) === String(assetId) && String(img.variant_id || null) === String(variantId || null));
                if (originalItem) {
                    updatedImages.push({...originalItem, caption_override: caption});
                } else { // Should ideally not happen if previews are in sync with data
                    updatedImages.push({ asset_id: assetId, variant_id: variantId, caption_override: caption, preview_url: previewUrl });
                }
            });
            $jsonInput.val(JSON.stringify(updatedImages));
        });


        // 2. Marshall Pros & Cons data into the hidden data_json input
        $('#sections-container .modular-section[data-type="7"]').each(function() { // PROS_CONS_SECTION = 7
            var $section = $(this);
            var sectionInstanceId = $section.data('section-instance-id');
            var pros = [];
            var cons = [];
            $section.find('.pros-items-container .pro-input').each(function() {
                if ($(this).val().trim() !== '') pros.push($(this).val().trim());
            });
            $section.find('.cons-items-container .con-input').each(function() {
                if ($(this).val().trim() !== '') cons.push($(this).val().trim());
            });
            var prosConsData = { pros: pros, cons: cons };
            // The hidden input is named sections[INSTANCE_ID][data_json]
            $section.find('input.pros-cons-data-input').val(JSON.stringify(prosConsData));
        });

        console.log("[AddArticle] Data marshalled for submit.");
        // Actual form submission will proceed now
    });


}); // End of $(document).ready()
