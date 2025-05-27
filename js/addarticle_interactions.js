// js/addarticle_interactions.js
// Handles specific interactions for addarticle.php, starting with the thumbnail.

// Ensure this runs after the DOM is ready and other necessary modules are loaded.
$(document).ready(function() {
    console.log("[AddArticle] Interactions script loaded.");

    // --- Global Context Management for Article Image Targets ---
    // This object will store what part of the article is currently expecting an image.
    // It's made global (on window) so mediaLibrary.js can access it.
    window.currentArticleImageTarget = {
        type: null,        // 'thumbnail', 'sectionImage', 'galleryImageAddition'
        instanceId: null,  // For sections, this would be the unique ID of the section instance
        // Callback to execute after UIE provides the selected/processed image info
        updateCallback: function(finalMasterAsset, finalVariantIfAny) {
            console.warn("Default updateCallback triggered. Target type was:", this.type, "Asset:", finalMasterAsset, "Variant:", finalVariantIfAny);
            // This function will be overridden by specific target handlers
        }
    };

    /**
     * Helper to get a displayable preview URL for an asset/variant.
     * This is a simplified version. A robust solution might involve checking variant_details
     * for specific preview URLs or constructing them.
     * For now, it prioritizes the variant's direct image_url if the variant is the primary object,
     * otherwise the master asset's image_url.
     */
    function getPreviewUrlForAsset(asset, variant) {
        // If a variant object is provided and has an image_url (which should be the physical source URL)
        // and potentially its own specific preview transformations (not handled here yet, UIE should provide final view)
        if (variant && variant.image_url) { // Assuming variant object might have its own direct URL if it's a processed version
            return variant.image_url;
        }
        if (asset && asset.image_url) {
            return asset.image_url; // Master asset's physical URL
        }
        return 'img/placeholder.png'; // Fallback
    }

    // --- Thumbnail Interaction Logic ---
    $('#selectOrEditThumbnailBtn').on('click', function() {
        console.log("[AddArticle] 'Select/Edit Thumbnail' button clicked.");
        window.currentArticleImageTarget = {
            type: 'thumbnail',
            instanceId: null, // Not applicable for the single article thumbnail
            updateCallback: function(finalMasterAsset, finalVariantIfAny) {
                console.log("[AddArticle] Thumbnail updateCallback triggered. Master Asset:", finalMasterAsset, "Variant:", finalVariantIfAny);

                let assetIdToStore = null;
                let variantIdToStore = null;
                let previewUrl = 'img/placeholder.png';
                let infoText = 'No thumbnail selected.';
                let displayTitleForInfo = 'Untitled';

                if (finalMasterAsset && finalMasterAsset.id) {
                    assetIdToStore = finalMasterAsset.id;
                    displayTitleForInfo = finalMasterAsset.admin_title || finalMasterAsset.title || `Image ${finalMasterAsset.id}`;

                    if (finalVariantIfAny && finalVariantIfAny.id) {
                        variantIdToStore = finalVariantIfAny.id;
                        // If UIE returns a variant, that's the specific version we want to show/reference
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, finalVariantIfAny); // Get URL for this specific variant if possible
                        infoText = `Asset: ${displayTitleForInfo} (ID: ${assetIdToStore}), Variant: ${finalVariantIfAny.variant_type || finalVariantIfAny.id}`;
                    } else {
                        // Using the master asset directly (or its default state if virtual)
                        previewUrl = getPreviewUrlForAsset(finalMasterAsset, null);
                        infoText = `Asset: ${displayTitleForInfo} (ID: ${assetIdToStore})`;
                    }
                }

                $('#thumbnail_media_asset_id').val(assetIdToStore || '');
                $('#thumbnail_media_variant_id').val(variantIdToStore || '');
                $('#articleThumbnailPreview').attr('src', previewUrl).show();
                $('#thumbnailInfo').text(infoText);

                if (assetIdToStore) {
                    $('#removeThumbnailBtn').show();
                } else {
                    $('#removeThumbnailBtn').hide();
                }
                console.log("[AddArticle] Thumbnail hidden fields updated:", { assetId: assetIdToStore, variantId: variantIdToStore });
                $('#article-form').trigger('input'); // For autosave
            }
        };

        // Trigger the media selection process
        openMediaPickerForArticleContext();
    });

    $('#removeThumbnailBtn').on('click', function() {
        $('#thumbnail_media_asset_id').val('');
        $('#thumbnail_media_variant_id').val('');
        $('#articleThumbnailPreview').attr('src', 'img/placeholder.png');
        $('#thumbnailInfo').text('No thumbnail selected.');
        $(this).hide();
        console.log("[AddArticle] Thumbnail removed.");
        window.currentArticleImageTarget.type = null; // Reset context
        $('#article-form').trigger('input'); // For autosave
    });

    /**
     * Initiates the media selection process for the current article target.
     * This could involve showing options to "Upload New" or "Choose from Library".
     */
    function openMediaPickerForArticleContext() {
        console.log(`[AddArticle] Opening media picker for target: ${window.currentArticleImageTarget.type}`);
        // For now, we'll assume the user can either use the Media Library panel
        // or we'll provide a simple "Upload New" mechanism here.

        // 1. Activate/Show the #global-media-library panel for picking
        const $mediaPanel = $('#global-media-library');
        if (!$mediaPanel.length) {
            Notifications.show("Media Library panel not found on this page.", "error");
            return;
        }
        // You might want to add a visual cue that the library is in "picker mode"
        $mediaPanel.addClass('picker-mode-active'); // Add a class to style it if needed
        $('#global-media').prepend('<p class="picker-mode-notice" style="text-align:center; background:#111; padding:5px; border-bottom:1px solid #333;">PICKER MODE: Select an image for the article ' + window.currentArticleImageTarget.type + '</p>');
        Notifications.show("Select an image from the library, or use 'Upload New Image' button.", "info");


        // 2. Provide an "Upload New Image" option specifically for this target
        // This button could be dynamically added or always present but contextually enabled.
        let $uploadBtnContainer = $('#selectOrEditThumbnailBtn').closest('.thumbnail-controls');
        if (window.currentArticleImageTarget.type === 'thumbnail') { // Example for thumbnail
            if ($('#tempUploadForTargetBtn').length === 0) {
                $uploadBtnContainer.append('<input type="file" id="tempDirectUploadInput" style="display:none;" accept="image/*"> <button type="button" id="tempUploadForTargetBtn" class="btn-upload-for-target" style="margin-left:10px;">Upload New</button>');

                $('#tempUploadForTargetBtn').on('click', function() {
                    if (!window.currentArticleImageTarget.type) {
                        Notifications.show("No target selected for upload.", "warning");
                        return;
                    }
                    $('#tempDirectUploadInput').click(); // Trigger hidden file input
                });

                $('#tempDirectUploadInput').on('change', function(e) {
                    if (!window.currentArticleImageTarget.type) return;
                    const file = e.target.files[0];
                    if (file) {
                        Notifications.show(`Uploading ${file.name} for ${window.currentArticleImageTarget.type}...`, "info");
                        // Use MediaUpload module to handle the upload
                        MediaUpload.processSingleFileForDrop(file, function(uploadResponse) {
                            if (uploadResponse && uploadResponse.success && uploadResponse.media) {
                                console.log(`[AddArticle] New asset ${uploadResponse.media.id} uploaded for ${window.currentArticleImageTarget.type}. Opening UIE.`);
                                // Now that the asset is created, open UIE with it
                                openUIEForArticleContext(uploadResponse.media, window.currentArticleImageTarget);
                            } else {
                                Notifications.show("Upload failed: " + (uploadResponse.error || "Unknown error"), "error");
                            }
                        });
                    }
                    $(this).val(''); // Reset file input
                });
            }
            $('#tempUploadForTargetBtn').show();
        }
    }

    /**
     * This function is called by mediaLibrary.js when an item is clicked in picker mode.
     * It receives the assetData of the clicked library item.
     */
    window.handleMediaLibrarySelectionForArticle = function(selectedAssetFromLibrary) {
        if (window.currentArticleImageTarget && window.currentArticleImageTarget.type) {
            console.log(`[AddArticle] Media Library item ${selectedAssetFromLibrary.id} selected for article target: ${window.currentArticleImageTarget.type}`);
            
            // Clean up picker mode UI from media library panel
            $('#global-media-library').removeClass('picker-mode-active');
            $('#global-media .picker-mode-notice').remove();
            if (window.currentArticleImageTarget.type === 'thumbnail') {
                $('#tempUploadForTargetBtn').hide();
            }
            // Proceed to open UIE with the selected asset and current target context
            openUIEForArticleContext(selectedAssetFromLibrary, window.currentArticleImageTarget);
        } else {
            console.warn("[AddArticle] Media Library item clicked, but no currentArticleImageTarget is set. This shouldn't happen in picker mode.");
        }
    };

    /**
     * Central function to open UIE with the correct context and callback for addarticle.php targets.
     * @param {object} mediaAsset - The master media asset object (from upload or library).
     * @param {object} targetContextDetails - The currentArticleImageTarget object.
     */
    function openUIEForArticleContext(mediaAsset, targetContextDetails) {
        console.log("[AddArticle] Opening UIE for context:", targetContextDetails.type, "Asset ID:", mediaAsset.id);

        // The UIE's onSave callback needs to provide both the master asset
        // (which might have updated details like admin_title) and the chosen/created variant.
        UnifiedImageEditor.openEditor(
            mediaAsset.image_url, // Physical URL of the master asset
            mediaAsset,           // The master asset object
            function(finalMasterAsset, finalVariantIfAny) { // UIE's "Use this" or "Save" callback
                console.log("[AddArticle] UIE finalized for target:", targetContextDetails.type, "Final Master Asset:", finalMasterAsset, "Final Variant:", finalVariantIfAny);

                if (targetContextDetails.updateCallback) {
                    // Pass both the (potentially updated) master and the variant (if one was made/chosen)
                    targetContextDetails.updateCallback(finalMasterAsset, finalVariantIfAny);
                }
                resetArticleImageTargetContext();
            },
            function() { // UIE's onClosed callback
                console.log("[AddArticle] UIE closed for target:", targetContextDetails.type);
                resetArticleImageTargetContext();
                // Clean up picker mode UI from media library panel if UIE was closed without selection
                $('#global-media-library').removeClass('picker-mode-active');
                $('#global-media .picker-mode-notice').remove();
                if (targetContextDetails.type === 'thumbnail') {
                    $('#tempUploadForTargetBtn').hide();
                }
            }
            // We might pass options to UIE here if needed, e.g., to suggest a default crop for thumbnail context
            // uieOpenOptions: { suggestedAspectRatio: 16/9 } // Example
        );
    }

    /**
     * Resets the global image target context.
     */
    function resetArticleImageTargetContext() {
        console.log("[AddArticle] Resetting currentArticleImageTarget.");
        window.currentArticleImageTarget.type = null;
        window.currentArticleImageTarget.instanceId = null;
        window.currentArticleImageTarget.updateCallback = function(finalMasterAsset, finalVariantIfAny) {
            console.warn("Default updateCallback after reset. Target type was:", this.type, "Asset:", finalMasterAsset, "Variant:", finalVariantIfAny);
        };
    }


    // --- Initialize Media Library Panel on addarticle.php (if it exists) ---
    if ($('#global-media-library').length > 0 && typeof MediaLibrary !== 'undefined' && MediaLibrary.init) {
        console.log("[AddArticle] Initializing MediaLibrary panel.");
        MediaLibrary.init(); // This will load media into #global-media
    }
    // Note: The click handling for #global-media items to call window.handleMediaLibrarySelectionForArticle
    // is now managed by the modified js/mediaLibrary.js (v2.2.5) which checks for this global context.

}); // End of $(document).ready()
