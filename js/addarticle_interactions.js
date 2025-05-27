// js/addarticle_interactions.js
// Version 1.2 - Handles Thumbnail and Image Section interactions for addarticle.php.

$(document).ready(function() {
    console.log("[AddArticle] Interactions script v1.2 loaded (Thumbnail & Image Sections).");

    // --- Global Context Management for Article Image Targets ---
    window.currentArticleImageTarget = {
        type: null,        // 'thumbnail', 'sectionImage', 'galleryImageAddition'
        instanceId: null,  // For sections, this would be the unique ID of the section instance
        $sectionElement: null, // Store a jQuery reference to the section being edited
        updateCallback: function(finalMasterAsset, finalVariantIfAny) {
            console.warn("Default updateCallback triggered. Target type was:", this.type, "Asset:", finalMasterAsset, "Variant:", finalVariantIfAny);
        }
    };

    /**
     * Helper to get a displayable preview URL for an asset/variant.
     * UIE should ideally provide the most accurate preview source in finalMasterAsset or finalVariantIfAny.
     */
    function getPreviewUrlForAsset(asset, variant) {
        // Prioritize a specific preview URL if UIE provides it as part of the returned objects
        if (variant && variant.preview_image_url) return variant.preview_image_url;
        if (asset && asset.preview_image_url) return asset.preview_image_url; // UIE might set this on the master if no variant chosen but transforms applied

        // Fallback to the master asset's physical image URL
        // This won't reflect UIE changes unless UIE updates this field or provides a dataURL.
        if (asset && asset.image_url) return asset.image_url;
        return 'img/placeholder.png'; // Ultimate fallback
    }

    // --- Thumbnail Interaction Logic (from v1.1) ---
    $('#selectOrEditThumbnailBtn').on('click', function() {
        console.log("[AddArticle] 'Select/Edit Thumbnail' button clicked.");
        window.currentArticleImageTarget = {
            type: 'thumbnail',
            instanceId: null,
            $sectionElement: null, // Not applicable for thumbnail
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
                        // Using the master asset (potentially with ad-hoc transforms from UIE if UIE modifies finalMasterAsset.preview_image_url)
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, null);
                        infoText = `Asset: ${displayTitleForInfo}`;
                    }
                }
                $('#thumbnail_media_asset_id').val(assetIdToStore || '');
                $('#thumbnail_media_variant_id').val(variantIdToStore || '');
                $('#articleThumbnailPreview').attr('src', previewUrl).show();
                $('#thumbnailInfo').text(infoText);
                $('#removeThumbnailBtn').toggle(!!assetIdToStore);
                $('#article-form').trigger('input'); // For autosave
            }
        };
        openMediaPickerForArticleContext();
    });

    $('#removeThumbnailBtn').on('click', function() {
        $('#thumbnail_media_asset_id').val('');
        $('#thumbnail_media_variant_id').val('');
        $('#articleThumbnailPreview').attr('src', 'img/placeholder.png');
        $('#thumbnailInfo').text('No thumbnail selected.');
        $(this).hide();
        if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === 'thumbnail') {
            resetArticleImageTargetContext();
        }
        $('#article-form').trigger('input');
    });

    // --- Image Section Interaction Logic (NEW for v1.2) ---
    // Event delegation for buttons within dynamically added sections
    $('#sections-container').on('click', '.btn-select-section-image', function() {
        var $sectionDiv = $(this).closest('.modular-section');
        var sectionInstanceId = $sectionDiv.data('section-instance-id');
        if (!sectionInstanceId) {
            console.error("[AddArticle] Could not find section instance ID for 'Select/Edit Image' button.");
            return;
        }
        console.log(`[AddArticle] 'Select/Edit Image' button clicked for section: ${sectionInstanceId}`);

        window.currentArticleImageTarget = {
            type: 'sectionImage',
            instanceId: sectionInstanceId,
            $sectionElement: $sectionDiv, // Store jQuery reference to the section
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
                    }
                }

                // Update elements within the specific section using the stored $sectionElement
                this.$sectionElement.find('.section-asset-id-input').val(assetIdToStore || '');
                this.$sectionElement.find('.section-variant-id-input').val(variantIdToStore || '');
                this.$sectionElement.find('.section-image-preview').attr('src', previewUrl).show();
                this.$sectionElement.find('.section-image-info').text(infoText);
                this.$sectionElement.find('.btn-remove-section-image').toggle(!!assetIdToStore);
                $('#article-form').trigger('input'); // For autosave
            }
        };
        openMediaPickerForArticleContext();
    });

    $('#sections-container').on('click', '.btn-remove-section-image', function() {
        var $sectionDiv = $(this).closest('.modular-section');
        var sectionInstanceId = $sectionDiv.data('section-instance-id');
        if (!sectionInstanceId) {
            console.error("[AddArticle] Could not find section instance ID for 'Remove Image' button.");
            return;
        }
        console.log(`[AddArticle] 'Remove Image' clicked for section: ${sectionInstanceId}`);

        $sectionDiv.find('.section-asset-id-input').val('');
        $sectionDiv.find('.section-variant-id-input').val('');
        $sectionDiv.find('.section-image-preview').attr('src', 'img/placeholder.png');
        $sectionDiv.find('.section-image-info').text('No image selected.');
        $(this).hide();

        // Reset context if this was the section being targeted
        if (window.currentArticleImageTarget &&
            window.currentArticleImageTarget.type === 'sectionImage' &&
            window.currentArticleImageTarget.instanceId === sectionInstanceId) {
            resetArticleImageTargetContext();
        }
        $('#article-form').trigger('input'); // For autosave
    });


    /**
     * Initiates the media selection process for the current article target.
     * Activates "picker mode" for the media library and provides an upload option.
     */
    function openMediaPickerForArticleContext() {
        const targetType = window.currentArticleImageTarget.type;
        const instanceId = window.currentArticleImageTarget.instanceId; // Will be null for thumbnail
        const $sectionElement = window.currentArticleImageTarget.$sectionElement; // Will be null for thumbnail

        console.log(`[AddArticle] Opening media picker for target type: ${targetType}` + (instanceId ? `, Instance ID: ${instanceId}` : ''));

        const $mediaPanel = $('#global-media-library');
        if (!$mediaPanel.length) {
            Notifications.show("Media Library panel not found on this page.", "error");
            return;
        }
        $mediaPanel.addClass('picker-mode-active');
        $('#global-media .picker-mode-notice').remove(); // Clear previous notices
        $('#global-media').prepend(
            `<p class="picker-mode-notice" style="text-align:center; background:#1a1d24; color:#9ab; padding:8px; border-bottom:1px solid #333; margin-bottom:10px; border-radius:3px;">
                PICKER MODE: Select an image for Article ${targetType} ${instanceId ? `(Section Instance: ...${instanceId.slice(-6)})` : ''}
            </p>`
        );
        Notifications.show("Select an image from the library, or use 'Upload New' button.", "info");

        // Manage the "Upload New" button
        let $uploadButtonContainer;
        if (targetType === 'thumbnail') {
            $uploadButtonContainer = $('#selectOrEditThumbnailBtn').closest('.thumbnail-controls');
        } else if (targetType === 'sectionImage' && $sectionElement) {
            $uploadButtonContainer = $sectionElement.find('.section-image-controls');
        } else {
            console.warn("[AddArticle] Cannot determine where to place Upload New button for target:", targetType);
            $uploadButtonContainer = $('#article-form'); // Fallback, place it somewhere visible
        }

        let $tempUploadBtn = $('#tempUploadForTargetBtn');
        let $tempDirectUploadInput = $('#tempDirectUploadInput');

        if ($tempUploadBtn.length === 0) { // Create if doesn't exist
            // Create the input once and append to body, keep it hidden
            if ($tempDirectUploadInput.length === 0) {
                $('body').append('<input type="file" id="tempDirectUploadInput" style="display:none;" accept="image/*">');
                $tempDirectUploadInput = $('#tempDirectUploadInput'); // Re-select

                $tempDirectUploadInput.on('change', function(e) {
                    if (!window.currentArticleImageTarget.type) return; // No active target
                    const file = e.target.files[0];
                    if (file) {
                        Notifications.show(`Uploading ${file.name} for ${window.currentArticleImageTarget.type}...`, "info");
                        MediaUpload.processSingleFileForDrop(file, function(uploadResponse) {
                            cleanupPickerModeUI();
                            if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                                console.log(`[AddArticle] New asset ${uploadResponse.media.id} uploaded for ${window.currentArticleImageTarget.type}. Opening UIE.`);
                                openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget);
                            } else {
                                Notifications.show("Upload failed: " + (uploadResponse.error || "Unknown error"), "error");
                            }
                        });
                    }
                    $(this).val(''); // Reset file input
                });
            }
            // Create the button and append it to the determined container
            $uploadButtonContainer.append('<button type="button" id="tempUploadForTargetBtn" class="btn-upload-for-target" style="margin-left:10px; vertical-align:middle;">Upload New</button>');
            $tempUploadBtn = $('#tempUploadForTargetBtn'); // Re-select

            $tempUploadBtn.on('click', function() {
                if (!window.currentArticleImageTarget.type) {
                    Notifications.show("No active image target for upload.", "warning");
                    return;
                }
                $tempDirectUploadInput.val(null).click(); // Trigger hidden file input
            });
        }

        // Ensure button is visible and correctly positioned if it's being reused
        $tempUploadBtn.show(); // Always show when picker is active
        if (targetType === 'thumbnail') {
             $('#selectOrEditThumbnailBtn').closest('.thumbnail-controls').append($tempUploadBtn);
        } else if (targetType === 'sectionImage' && $sectionElement) {
            $sectionElement.find('.section-image-controls .btn-select-section-image').after($tempUploadBtn);
        }
        // For other target types (like gallery later), adjust placement as needed
    }

    /**
     * Global handler called by mediaLibrary.js when an item is clicked in picker mode.
     */
    window.handleMediaLibrarySelectionForArticle = function(selectedAssetFromLibrary) {
        if (window.currentArticleImageTarget && window.currentArticleImageTarget.type) {
            console.log(`[AddArticle] Media Library item ${selectedAssetFromLibrary.id} selected for article target: ${window.currentArticleImageTarget.type}`);
            cleanupPickerModeUI();
            openUIEForArticleContext(selectedAssetFromLibrary, window.currentArticleImageTarget);
        } else {
            console.warn("[AddArticle] Media Library item clicked, but no currentArticleImageTarget is set. This might happen if picker mode was not properly initiated or was already reset.");
        }
    };

    /**
     * Central function to open UIE with the correct context and callback.
     */
    function openUIEForArticleContext(mediaAsset, targetContextDetails) {
        console.log("[AddArticle] Opening UIE for context:", targetContextDetails.type, "Asset ID:", mediaAsset.id);
        UnifiedImageEditor.openEditor(
            mediaAsset.image_url, // Physical URL of the master asset
            mediaAsset,           // The master asset object
            function(finalMasterAsset, finalVariantIfAny) { // UIE's "Use this" or "Save" callback
                console.log("[AddArticle] UIE finalized for target:", targetContextDetails.type, "Final Master Asset:", finalMasterAsset, "Final Variant:", finalVariantIfAny);
                if (targetContextDetails.updateCallback) {
                    targetContextDetails.updateCallback(finalMasterAsset, finalVariantIfAny);
                }
                // Reset context only if it's still the one UIE was opened for
                if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === targetContextDetails.type &&
                    window.currentArticleImageTarget.instanceId === targetContextDetails.instanceId) {
                    resetArticleImageTargetContext();
                }
            },
            function() { // UIE's onClosed callback
                console.log("[AddArticle] UIE closed for target:", targetContextDetails.type);
                cleanupPickerModeUI();
                if (window.currentArticleImageTarget && window.currentArticleImageTarget.type === targetContextDetails.type &&
                    window.currentArticleImageTarget.instanceId === targetContextDetails.instanceId) {
                    resetArticleImageTargetContext();
                }
            }
            // Example: Pass UIE options based on context
            // targetContextDetails.type === 'thumbnail' ? { uieOptionForThumbnail: true } : {}
        );
    }

    /**
     * Resets the global image target context.
     */
    function resetArticleImageTargetContext() {
        console.log("[AddArticle] Resetting currentArticleImageTarget.");
        if (window.currentArticleImageTarget) {
            window.currentArticleImageTarget.type = null;
            window.currentArticleImageTarget.instanceId = null;
            window.currentArticleImageTarget.$sectionElement = null;
            window.currentArticleImageTarget.updateCallback = function(finalMasterAsset, finalVariantIfAny) {
                console.warn("Default updateCallback after reset. Target type was:", this.type, "Asset:", finalMasterAsset, "Variant:", finalVariantIfAny);
            };
        }
    }

    /**
     * Cleans up UI elements related to picker mode (notice in media library, temp upload button).
     */
    function cleanupPickerModeUI() {
        $('#global-media-library').removeClass('picker-mode-active');
        $('#global-media .picker-mode-notice').remove();
        $('#tempUploadForTargetBtn').hide(); // Hide the temp upload button
        console.log("[AddArticle] Picker mode UI cleaned up.");
    }

    // --- Initialize Media Library Panel on addarticle.php (if it exists) ---
    if ($('#global-media-library').length > 0 && typeof MediaLibrary !== 'undefined' && MediaLibrary.init) {
        console.log("[AddArticle] Initializing MediaLibrary panel on addarticle.php");
        MediaLibrary.init();
    }
    // Note: The click handling for #global-media items to call window.handleMediaLibrarySelectionForArticle
    // is managed by the modified js/mediaLibrary.js (v2.2.5) which checks for this global context.

    // --- Event listener for dynamically added sections (Pros/Cons, Rating stars) ---
    $(document).on("section:added", function(event, $sectionElem, sectionId, defaults, sectionInstanceId) {
        console.log(`[AddArticle] Section added: Type ${sectionId}, Instance ID: ${sectionInstanceId}`);
        
        if (parseInt(sectionId) === 7) { // PROS_CONS_SECTION = 7
            const $prosContainer = $sectionElem.find('.pros-items-container');
            const $consContainer = $sectionElem.find('.cons-items-container');
            if ($prosContainer.children().length === 0) { $prosContainer.append(Sections.newProsItemRow(sectionInstanceId)); }
            if ($consContainer.children().length === 0) { $consContainer.append(Sections.newConsItemRow(sectionInstanceId)); }
        }
        else if (parseInt(sectionId) === 8) { // RATING_SECTION = 8
            $sectionElem.find('.rating-star').on('mouseenter', function() {
                $(this).prevAll('.rating-star').addBack().addClass('hover');
                $(this).nextAll('.rating-star').removeClass('hover');
            }).on('mouseleave', function() {
                $(this).parent().children('.rating-star').removeClass('hover');
            }).on('click', function() {
                var $thisStar = $(this);
                var ratingValue = $thisStar.data('value');
                $thisStar.siblings('.rating-star').removeClass('selected');
                $thisStar.prevAll('.rating-star').addBack().addClass('selected');
                $sectionElem.find('.section-rating-value-input').val(ratingValue).trigger('input');
            });
        }
    });

    // Delegated event handlers for Pros/Cons items
    $('#sections-container').on('click', '.btn-add-pro', function() {
        const $prosContainer = $(this).closest('.pros-column').find('.pros-items-container');
        const sectionInstanceId = $(this).closest('.pros-cons-wrapper').data('parent-instance-id');
        $prosContainer.append(Sections.newProsItemRow(sectionInstanceId));
        $('#article-form').trigger('input');
    });
    $('#sections-container').on('click', '.btn-add-con', function() {
        const $consContainer = $(this).closest('.cons-column').find('.cons-items-container');
        const sectionInstanceId = $(this).closest('.pros-cons-wrapper').data('parent-instance-id');
        $consContainer.append(Sections.newConsItemRow(sectionInstanceId));
        $('#article-form').trigger('input');
    });
    $('#sections-container').on('click', '.remove-pro-item', function() {
        $(this).closest('.pros-item').remove();
        $('#article-form').trigger('input');
    });
    $('#sections-container').on('click', '.remove-cons-item', function() {
        $(this).closest('.cons-item').remove();
        $('#article-form').trigger('input');
    });

}); // End of $(document).ready()
