// UnifiedImageEditor.js – With Virtual Masters, refined variant workflow, preview generation, crop fixes, variant caching, source/attribution fields, variant preloading,
// and contextual "Use for..." button functionality.
// Version 2.22.28 (Integrated contextual button and save callback enhancements)

const UnifiedImageEditor = (() => {
  'use strict';

  let cropper = null;
  let initialZoomRatio = 1;
  let presetsData = [];

  // State variables
  let isAspectRatioLocked = false;
  let currentLockedAspectRatio = NaN;

  let uieCurrentMediaAssetIdForTags = null;
  let currentMediaAssetId = null;
  // let currentMediaAssetAdminTitle = ''; // Replaced by currentMediaAssetAdminTitleOriginal for initial load
  // let currentMasterPublicCaption = ''; // Replaced by currentMasterPublicCaptionOriginal
  // let currentMasterAltText = ''; // Replaced by currentMasterAltTextOriginal
  // let currentMasterSourceUrl = ''; // Replaced by currentMasterSourceUrlOriginal for initial load
  // let currentMasterAttribution = ''; // Replaced by currentMasterAttributionOriginal for initial load
  let currentMediaAssetUrl = '';
  let currentPhysicalSourceAssetId = null;
  let isCurrentMasterPhysical = true;

  let currentAssetDefaultCrop = null;
  let currentAssetDefaultFilters = null;

  let currentVariantId = null;
  let isEditingMaster = true;

  let activeBaseImageElement = null;
  let effectiveCropperSource = null;
  let effectiveCropperSourceDimensions = { width: 0, height: 0 };

  // NEW/UPDATED Module-Level Variables for v2.2.28
  let currentOpenMasterAsset = null; // Holds the full object of the master asset UIE was opened with
  let currentMediaAssetAdminTitleOriginal = ''; // Title of asset when UIE opened
  let currentMasterPublicCaptionOriginal = '';
  let currentMasterAltTextOriginal = '';
  let currentMasterSourceUrlOriginal = ''; // For source URL at open
  let currentMasterAttributionOriginal = ''; // For attribution at open

  let onSaveCallbackForContext = null; // <<< RENAMED from onVariantSavedOrUpdatedCallback
  let onEditorClosedCallback = null;

  let currentEditorOptions = {}; // NEW: Options passed to openEditor, including context
  let currentUIEMetadataOriginal = {}; // Stores initial UIE metadata for comparison
  let currentOpenVariant = null; // Stores details of a variant if opened directly

  let cachedVariantsForCurrentMaster = [];
  let variantsInitiallyLoadedForMaster = false;

  let localTargetVariantToPreloadId = null; // Retained for now, though new openEditor logic is more direct
  let localTargetVariantToPreloadDetails = null;
  let localTargetVariantToPreloadTitle = null;


  // Cache for frequently accessed jQuery objects
  let $uieOverlay, $uieImage, $cropperViewBoxImage, $uieTitleInput, $uieCaptionInput, $uieAltTextInput,
      $uieSourceUrlInput, $uieAttributionInput, $uieSourceLabel, $uieSourceThumbnailBox,
      $uieVariantScroll, $uieFilterPresetsScroll, $uieCropPresetsScroll,
      $brightnessSlider, $contrastSlider, $saturationSlider, $hueSlider, $zoomSlider,
      $currentDimsSpan, $aspectLockBtn, $tagInputField, $selectedTagsContainer,
      $filterPresetsLoading, $cropPresetsLoading, $variantsLoading, $actionsPanelContent;


  // Forward declaration for debounced function
  let debouncedUpdateThumbnails = null;


  const showNotification = (message, type) => {
    if (typeof Notifications !== 'undefined' && Notifications.show) {
      Notifications.show(message, type);
    } else {
      console.error(`Notification: [${type}] ${message} (Notifications module not found)`);
      if (type === 'error' || type === 'warning') {
        alert(`[${type.toUpperCase()}] ${message}\n(Notifications module is not available for a better display)`);
      }
    }
  };

  const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  const getCurrentUserAdjustedFiltersObject = () => {
    if (!$brightnessSlider || !$brightnessSlider.length) $brightnessSlider = $('.uie-slider[data-filter="brightness"]');
    if (!$contrastSlider || !$contrastSlider.length) $contrastSlider = $('.uie-slider[data-filter="contrast"]');
    if (!$saturationSlider || !$saturationSlider.length) $saturationSlider = $('.uie-slider[data-filter="saturation"]');
    if (!$hueSlider || !$hueSlider.length) $hueSlider = $('.uie-slider[data-filter="hue"]');

    return {
        brightness: parseFloat($brightnessSlider.val()) || 100,
        contrast:   parseFloat($contrastSlider.val()) || 100,
        saturation: parseFloat($saturationSlider.val()) || 100,
        hue:        parseFloat($hueSlider.val()) || 0,
    };
  };

  const getCssFilterString = (filtersObject) => {
    const f = filtersObject || getCurrentUserAdjustedFiltersObject();
    return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`;
  };

  const applyCssFiltersToImage = (filtersObject) => {
    const filterString = getCssFilterString(filtersObject);

    if (cropper && cropper.cropper) {
        if (!$cropperViewBoxImage || !$cropperViewBoxImage.length) {
            $cropperViewBoxImage = $(cropper.cropper).find('.cropper-view-box img');
        }
        if ($cropperViewBoxImage && $cropperViewBoxImage.length) {
            $cropperViewBoxImage.css("filter", filterString);
        } else {
             if ($uieImage && $uieImage.length) {
                $uieImage.css("filter", filterString);
            }
        }
    } else if ($uieImage && $uieImage.length) {
        $uieImage.css("filter", filterString);
    }
  };


  const generateScaledThumbnail = (sourceCanvas, maxWidth = 80, maxHeight = 80) => {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    if (srcW === 0 || srcH === 0) {
        const emptyCanvas = document.createElement('canvas');
        emptyCanvas.width = maxWidth; emptyCanvas.height = maxHeight;
        const eCtx = emptyCanvas.getContext('2d');
        eCtx.fillStyle = '#555'; eCtx.fillRect(0,0,maxWidth,maxHeight);
        eCtx.fillStyle = '#fff'; eCtx.textAlign = 'center';
        eCtx.font = '10px Arial';
        eCtx.fillText('No Preview', maxWidth/2, maxHeight/2);
        return emptyCanvas;
    }
    const scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1);
    const thumbW = Math.round(srcW * scale);
    const thumbH = Math.round(srcH * scale);
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbW; thumbCanvas.height = thumbH;
    const ctx = thumbCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, srcW, srcH, 0, 0, thumbW, thumbH);
    return thumbCanvas;
  };

  const generateTransformedPreviewCanvas = (physicalImageElementForPreview, masterDefaultCrop, masterDefaultFilters, variantSpecificCrop, variantSpecificFilters) => {
    return new Promise((resolve, reject) => {
        if (!physicalImageElementForPreview || !physicalImageElementForPreview.naturalWidth) {
            console.warn("generateTransformedPreviewCanvas: Physical base image not ready.", physicalImageElementForPreview);
            const errorCanvas = document.createElement('canvas'); errorCanvas.width=1; errorCanvas.height=1;
            return resolve(errorCanvas);
        }

        let stage1Canvas = document.createElement('canvas');
        let stage1Ctx = stage1Canvas.getContext('2d');

        const cropForStage1 = (masterDefaultCrop && masterDefaultCrop.width > 0 && masterDefaultCrop.height > 0) ?
                              masterDefaultCrop :
                              { x: 0, y: 0, width: physicalImageElementForPreview.naturalWidth, height: physicalImageElementForPreview.naturalHeight };

        if (cropForStage1.width <= 0 || cropForStage1.height <= 0) {
            console.warn("generateTransformedPreviewCanvas: Master default crop has zero or negative dimensions.", cropForStage1);
            stage1Canvas.width = physicalImageElementForPreview.naturalWidth;
            stage1Canvas.height = physicalImageElementForPreview.naturalHeight;
            if (masterDefaultFilters) stage1Ctx.filter = getCssFilterString(masterDefaultFilters);
            stage1Ctx.drawImage(physicalImageElementForPreview, 0,0, stage1Canvas.width, stage1Canvas.height);
        } else {
            stage1Canvas.width = cropForStage1.width;
            stage1Canvas.height = cropForStage1.height;
            if (masterDefaultFilters) stage1Ctx.filter = getCssFilterString(masterDefaultFilters);
            stage1Ctx.drawImage(physicalImageElementForPreview, cropForStage1.x, cropForStage1.y, cropForStage1.width, cropForStage1.height, 0, 0, cropForStage1.width, cropForStage1.height);
        }

        if (!variantSpecificCrop && !variantSpecificFilters) {
            resolve(stage1Canvas);
            return;
        }

        let stage2Canvas = document.createElement('canvas');
        let stage2Ctx = stage2Canvas.getContext('2d');

        const cropForStage2 = (variantSpecificCrop && variantSpecificCrop.width > 0 && variantSpecificCrop.height > 0) ?
                              variantSpecificCrop :
                              { x: 0, y: 0, width: stage1Canvas.width, height: stage1Canvas.height };

        if (cropForStage2.width <= 0 || cropForStage2.height <= 0) {
            console.warn("generateTransformedPreviewCanvas: Variant specific crop has zero or negative dimensions.", cropForStage2);
            // If variant crop is invalid, but variant filters might be valid, apply them to stage1 result.
            if (variantSpecificFilters) {
                 const tempCanvas = document.createElement('canvas');
                 const tempCtx = tempCanvas.getContext('2d');
                 tempCanvas.width = stage1Canvas.width;
                 tempCanvas.height = stage1Canvas.height;
                 tempCtx.filter = getCssFilterString(variantSpecificFilters);
                 tempCtx.drawImage(stage1Canvas, 0, 0);
                 resolve(tempCanvas);
                 return;
            }
            resolve(stage1Canvas); // Return stage1 if variant crop is bad and no variant filters
            return;
        }

        stage2Canvas.width = cropForStage2.width;
        stage2Canvas.height = cropForStage2.height;

        if (variantSpecificFilters) {
            stage2Ctx.filter = getCssFilterString(variantSpecificFilters);
        }
        stage2Ctx.drawImage(stage1Canvas, cropForStage2.x, cropForStage2.y, cropForStage2.width, cropForStage2.height, 0, 0, cropForStage2.width, cropForStage2.height);

        resolve(stage2Canvas);
    });
};

  const getProcessedVirtualMasterCanvasDataUrl = (physicalImage, defaultCrop, defaultFilters) => {
    return new Promise((resolve, reject) => {
        if (!physicalImage || !physicalImage.naturalWidth || physicalImage.naturalWidth === 0 || physicalImage.naturalHeight === 0) {
            console.error("Virtual master processing: Physical image is invalid or has zero dimensions.", physicalImage);
            return reject("Physical image invalid or has zero dimensions for virtual master processing.");
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let cropToUse;

        if (defaultCrop &&
            typeof defaultCrop.x === 'number' && typeof defaultCrop.y === 'number' &&
            typeof defaultCrop.width === 'number' && defaultCrop.width > 0 &&
            typeof defaultCrop.height === 'number' && defaultCrop.height > 0) {

            cropToUse = { ...defaultCrop };
            cropToUse.x = Math.max(0, Math.min(cropToUse.x, physicalImage.naturalWidth));
            cropToUse.y = Math.max(0, Math.min(cropToUse.y, physicalImage.naturalHeight));
            cropToUse.width = Math.max(1, Math.min(cropToUse.width, physicalImage.naturalWidth - cropToUse.x));
            cropToUse.height = Math.max(1, Math.min(cropToUse.height, physicalImage.naturalHeight - cropToUse.y));
        } else {
            if (defaultCrop) {
                 console.warn("Virtual master processing: defaultCrop was null, empty, or had invalid/zero dimensions. Using full physical image dimensions.", JSON.stringify(defaultCrop));
            }
            cropToUse = {
                x: 0, y: 0,
                width: physicalImage.naturalWidth,
                height: physicalImage.naturalHeight
            };
        }

        if (cropToUse.width <= 0 || cropToUse.height <= 0) {
            console.error("Virtual master processing: Derived cropToUse has zero/negative dimensions. Physical:",
                          physicalImage.naturalWidth, "x", physicalImage.naturalHeight,
                          "Initial defaultCrop:", JSON.stringify(defaultCrop),
                          "Clamped cropToUse:", JSON.stringify(cropToUse),
                          ". Falling back to full physical image.");

            canvas.width = physicalImage.naturalWidth;
            canvas.height = physicalImage.naturalHeight;
            if (defaultFilters) { ctx.filter = getCssFilterString(defaultFilters); }
            ctx.drawImage(physicalImage, 0, 0);
            effectiveCropperSourceDimensions = { width: canvas.width, height: canvas.height }; // Update effective dimensions
            return resolve(canvas.toDataURL('image/png'));
        }

        canvas.width = cropToUse.width;
        canvas.height = cropToUse.height;

        if (defaultFilters) {
            ctx.filter = getCssFilterString(defaultFilters);
        }

        ctx.drawImage(
            physicalImage,
            cropToUse.x, cropToUse.y, cropToUse.width, cropToUse.height,
            0, 0, cropToUse.width, cropToUse.height
        );

        effectiveCropperSourceDimensions = { width: canvas.width, height: canvas.height }; // Update effective dimensions
        resolve(canvas.toDataURL('image/png'));
    });
  };

  const updateDisplayedDimensions = () => {
    if (!$currentDimsSpan || !$currentDimsSpan.length) $currentDimsSpan = $('#uie-current-dims');
    if (cropper && cropper.ready) {
        try {
            const cropData = cropper.getData(true);
            $currentDimsSpan.text(`${Math.round(cropData.width)}px × ${Math.round(cropData.height)}px`);
        } catch (e) {
            console.warn("Could not get crop data for dimensions display:", e);
            $currentDimsSpan.text('Error');
        }
    } else {
        $currentDimsSpan.text('N/A');
    }
  };

  const updateAspectRatioLockButton = () => {
    if (!$aspectLockBtn || !$aspectLockBtn.length) $aspectLockBtn = $('.uie-aspect-lock-btn');
    if (isAspectRatioLocked && !isNaN(currentLockedAspectRatio) && currentLockedAspectRatio > 0) {
        $aspectLockBtn.find('i').removeClass('fa-unlock-alt').addClass('fa-lock');
        $aspectLockBtn.attr('data-locked', 'true').attr('title', `Aspect Ratio Locked (${currentLockedAspectRatio.toFixed(2)})`);
    } else {
        $aspectLockBtn.find('i').removeClass('fa-lock').addClass('fa-unlock-alt');
        $aspectLockBtn.attr('data-locked', 'false').attr('title', 'Lock Aspect Ratio');
    }
  };

  const cacheSelectors = () => {
      $uieOverlay = $('#uie-overlay');
      $uieImage = $('#uie-image');
      $uieTitleInput = $('.uie-title-input');
      $uieCaptionInput = $('#uie-caption-input');
      $uieAltTextInput = $('#uie-alt-text-input');
      $uieSourceUrlInput = $('#uie-source-url-input');
      $uieAttributionInput = $('#uie-attribution-input');
      $uieSourceLabel = $('.uie-source-label');
      $uieSourceThumbnailBox = $('#uie-source-thumbnail-box');
      $uieVariantScroll = $('.uie-variant-scroll');
      $uieFilterPresetsScroll = $('.uie-filter-presets .uie-presets-scroll');
      $uieCropPresetsScroll = $('.uie-crop-presets .uie-presets-scroll');
      $brightnessSlider = $('.uie-slider[data-filter="brightness"]');
      $contrastSlider = $('.uie-slider[data-filter="contrast"]');
      $saturationSlider = $('.uie-slider[data-filter="saturation"]');
      $hueSlider = $('.uie-slider[data-filter="hue"]');
      $zoomSlider = $('.uie-slider[data-cropper="zoom"]');
      $currentDimsSpan = $('#uie-current-dims');
      $aspectLockBtn = $('.uie-aspect-lock-btn');
      $tagInputField = $('#uie-tag-input-field');
      $selectedTagsContainer = $('#uie-selected-tags-container');
      $filterPresetsLoading = $('.filter-presets-loading');
      $cropPresetsLoading = $('.crop-presets-loading');
      $variantsLoading = $('.variants-loading');
      $actionsPanelContent = $('.uie-actions-panel .uie-panel-content'); // Ensured
  };


  const ensureOverlayExists = () => {
    if ($('#uie-overlay').length === 0) {
      const editorHTML = `
        <div id="uie-overlay" class="uie-container hidden">
          <header class="uie-header">
            <span class="uie-source-label" style="display:none; margin-right: 5px; color: #aaa;"></span>
            <input type="text" class="uie-title-input" value="Image Title">
            <button class="uie-close-button">X</button>
          </header>
          <div class="uie-editor-body">
            <div class="uie-main-image-and-variants-column">
              <div class="uie-left-column">
                <div class="uie-image-editing">
                  <img id="uie-image" src="" alt="Editable Image">
                </div>
              </div>
              <div class="uie-variant-strip">
                <div class="uie-variant-source">
                  <div class="uie-panel-header">Source</div>
                  <div class="uie-thumbnail uie-box" id="uie-source-thumbnail-box">
                     <div class="image-container"><img class="uie-box-img" src="" alt="Source Thumbnail"></div>
                     <span class="uie-variant-caption uie-box-caption">Source Image</span>
                  </div>
                </div>
                <div class="uie-variant-thumbnails">
                  <div class="uie-panel-header">Variants</div>
                  <div class="uie-variant-scroll">
                     <div class="uie-loading-indicator variants-loading" style="display:none;"><i class="fas fa-spinner fa-spin"></i> Loading Variants...</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="uie-right-column">
              <div class="uie-panel uie-metadata-panel">
                <div class="uie-panel-header">Metadata (Public & Source)</div>
                <div class="uie-panel-content">
                  <label for="uie-caption-input" class="uie-metadata-label">Caption (Public):</label>
                  <textarea id="uie-caption-input" class="uie-caption" placeholder="Public caption for this image/variant..."></textarea>
                  <label for="uie-alt-text-input" class="uie-metadata-label">Alt Text (Public):</label>
                  <input type="text" id="uie-alt-text-input" class="uie-alt-text" placeholder="Descriptive alt text...">

                  <label for="uie-source-url-input" class="uie-metadata-label">Source URL (Master):</label>
                  <input type="url" id="uie-source-url-input" class="uie-source-url" placeholder="e.g., https://example.com/image.jpg">
                  <label for="uie-attribution-input" class="uie-metadata-label">Attribution (Master):</label>
                  <input type="text" id="uie-attribution-input" class="uie-attribution" placeholder="e.g., Photo by Jane Doe on Unsplash">
                  </div>
              </div>
              <div class="uie-panel uie-tags-global-panel">
                <div class="uie-panel-header">Tags (Global to Master)</div>
                <div class="uie-panel-content">
                  <div class="uie-tag-management-area">
                    <label for="uie-tag-input-field" class="uie-metadata-label">Tags:</label>
                    <input type="text" id="uie-tag-input-field" class="uie-tag-input" placeholder="Add tags (comma separated, or press Enter)">
                    <div id="uie-selected-tags-container" style="margin-top: 10px; min-height: 22px;">
                    </div>
                  </div>
                </div>
              </div>
              <div class="uie-panel uie-controls-presets-panel">
                <div class="uie-controls-presets-content">
                  <div class="uie-controls-column">
                    <div class="uie-subpanel-header">Image Controls</div>
                    <div class="uie-sliders">
                      <label class="uie-slider-label"><span class="uie-slider-text">Brightness</span><span class="uie-slider-input-container"><input type="range" class="uie-slider" data-filter="brightness" min="0" max="200" value="100"></span><span class="uie-reset-icon-container" data-reset-for="brightness" title="Reset Brightness"><i class="fas fa-sync-alt uie-reset-icon"></i></span></label>
                      <label class="uie-slider-label"><span class="uie-slider-text">Contrast</span><span class="uie-slider-input-container"><input type="range" class="uie-slider" data-filter="contrast" min="0" max="200" value="100"></span><span class="uie-reset-icon-container" data-reset-for="contrast" title="Reset Contrast"><i class="fas fa-sync-alt uie-reset-icon"></i></span></label>
                      <label class="uie-slider-label"><span class="uie-slider-text">Saturation</span><span class="uie-slider-input-container"><input type="range" class="uie-slider" data-filter="saturation" min="0" max="200" value="100"></span><span class="uie-reset-icon-container" data-reset-for="saturation" title="Reset Saturation"><i class="fas fa-sync-alt uie-reset-icon"></i></span></label>
                      <label class="uie-slider-label"><span class="uie-slider-text">Hue</span><span class="uie-slider-input-container"><input type="range" class="uie-slider" data-filter="hue" min="0" max="360" value="0"></span><span class="uie-reset-icon-container" data-reset-for="hue" title="Reset Hue"><i class="fas fa-sync-alt uie-reset-icon"></i></span></label>
                      <label class="uie-slider-label"><span class="uie-slider-text">Zoom</span><span class="uie-slider-input-container"><input type="range" class="uie-slider" data-cropper="zoom" min="0" max="300" value="0"></span><span class="uie-reset-icon-container" data-reset-for="zoom" title="Reset Zoom"><i class="fas fa-sync-alt uie-reset-icon"></i></span></label>
                    </div>
                    <div class="uie-reset-buttons-row">
                      <span class="uie-reset-btn" data-reset-for="crop" title="Reset Crop, Zoom & Filters"><i class="fas fa-undo"></i></span>
                      <span class="uie-reset-btn uie-reset-cropzoom-btn" data-reset-for="cropzoom" title="Reset Crop & Zoom"><i class="fas fa-expand-alt"></i></span>
                      <span class="uie-reset-btn" data-reset-for="position" title="Center Image"><i class="fas fa-arrows-alt"></i></span>
                      <span class="uie-reset-btn uie-clear-filters-btn" data-reset-for="filters" title="Clear All Filters"><i class="fas fa-eraser"></i></span>
                      <span class="uie-reset-btn uie-aspect-lock-btn" data-locked="false" title="Lock Aspect Ratio"><i class="fas fa-unlock-alt"></i></span>
                    </div>
                  </div>
                  <div class="uie-presets-column">
                    <div class="uie-presets-row uie-filter-presets">
                        <div class="uie-subpanel-header">Filter Presets</div>
                        <div class="uie-presets-scroll">
                            <div class="uie-loading-indicator presets-loading filter-presets-loading" style="display:none;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
                        </div>
                    </div>
                    <div class="uie-presets-row uie-crop-presets">
                        <div class="uie-subpanel-header">Crop Presets</div>
                        <div class="uie-presets-scroll">

                             <div class="uie-loading-indicator presets-loading crop-presets-loading" style="display:none;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="uie-panel uie-actions-panel">
                <div class="uie-panel-content">
                  </div>
              </div>
              <div class="uie-panel uie-image-info-panel">
                <div class="uie-panel-header">Image Information</div>
                <div class="uie-panel-content">
                  <p>Current Dimensions: <span id="uie-current-dims">N/A</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>`;
      $('body').append(editorHTML);
      cacheSelectors(); // Cache all selectors after HTML is appended
      bindStaticEvents(); // Bind events including dynamic buttons
    } else {
        cacheSelectors(); // Ensure selectors are cached if overlay already exists
        // If ensureOverlayExists is called multiple times for an open editor (e.g. error states),
        // ensure bindStaticEvents is robust or selectively called.
        // For now, it clears and re-adds standard buttons.
        bindStaticEvents();
    }
  };

  const updateActionButtons = () => {
      // Standard buttons are now added/removed by bindStaticEvents.
      // This function primarily manages visibility based on state.
      const $saveMasterBtn = $actionsPanelContent.find('.uie-save-master-details-button');
      const $saveAsVariantBtn = $actionsPanelContent.find('.uie-save-as-variant-button');
      const $updateVariantBtn = $actionsPanelContent.find('.uie-update-variant-button');
      const $saveAsNewVariantBtn = $actionsPanelContent.find('.uie-save-as-new-variant-button');
      const $saveNewImageBtn = $actionsPanelContent.find('.uie-save-as-new-image-button');

      $saveMasterBtn.hide();
      $saveAsVariantBtn.hide();
      $updateVariantBtn.hide();
      $saveAsNewVariantBtn.hide();
      // $saveNewImageBtn is handled by its presence/absence based on isCurrentMasterPhysical in bindStaticEvents

      if (isEditingMaster) {
          $saveMasterBtn.show();
          $saveAsVariantBtn.show();
          if (isCurrentMasterPhysical) {
            // $saveNewImageBtn visibility is now handled by bindStaticEvents add/remove
            // If it's present, it should be shown here.
             if ($saveNewImageBtn.length) $saveNewImageBtn.show();
          } else {
             if ($saveNewImageBtn.length) $saveNewImageBtn.hide(); // Explicitly hide if not physical
          }
          $uieSourceLabel.hide().empty();
          $uieSourceThumbnailBox.addClass('active-variant');
          $('.uie-variant-box').removeClass('active-variant');
          $uieSourceUrlInput.prop('disabled', !isCurrentMasterPhysical);
          $uieAttributionInput.prop('disabled', !isCurrentMasterPhysical);
      } else { // Editing a variant
          $updateVariantBtn.show().text(`Update Variant Details`); // Title might be set by variant load
          $saveAsNewVariantBtn.show();
          if (isCurrentMasterPhysical) {
            // $saveNewImageBtn visibility is now handled by bindStaticEvents
             if ($saveNewImageBtn.length) $saveNewImageBtn.show();
          } else {
             if ($saveNewImageBtn.length) $saveNewImageBtn.hide();
          }
          $uieSourceLabel.show().html(`${currentMediaAssetAdminTitleOriginal}&nbsp;&gt;&nbsp;`);
          $uieSourceThumbnailBox.removeClass('active-variant');
          // Source/Attribution fields should be disabled when editing a variant
          $uieSourceUrlInput.prop('disabled', true);
          $uieAttributionInput.prop('disabled', true);
      }
      // Contextual button visibility is handled by its presence (added in openEditor)
  };

  const pollZoomSlider = () => {
    if (!cropper || !cropper.ready) {
        requestAnimationFrame(pollZoomSlider);
        return;
    }
    try {
        const canvasData = cropper.getCanvasData();

        if (!canvasData || !effectiveCropperSourceDimensions.width || effectiveCropperSourceDimensions.width === 0 || initialZoomRatio === 0 ) {
             requestAnimationFrame(pollZoomSlider); return;
        }

        const currentAbsoluteZoom = canvasData.width / effectiveCropperSourceDimensions.width;
        let sliderValue = ((currentAbsoluteZoom / initialZoomRatio) - 1) * 100;

        const sliderMin = parseFloat($zoomSlider.attr("min"));
        const sliderMax = parseFloat($zoomSlider.attr("max"));
        sliderValue = Math.max(sliderMin, Math.min(sliderValue, sliderMax));

        if (Math.abs(parseFloat($zoomSlider.val()) - sliderValue) > 0.5) {
            $zoomSlider.val(sliderValue);
        }
    } catch (e) {
        // console.warn("PollZoomSlider error:", e);
    }
    requestAnimationFrame(pollZoomSlider);
  };

  const loadMediaPresets = () => {
    return new Promise((resolve, reject) => {
        if (!$filterPresetsLoading.length) cacheSelectors();
        $filterPresetsLoading.show();
        $cropPresetsLoading.show();

        $.ajax({
            url: 'ajax/getMediaPresets.php',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                presetsData = response;
                setupPresetSorting(); // Should ideally happen after thumbnails are in DOM
                resolve();
            },
            error: function(err) {
                console.error("Error loading media presets:", err);
                $filterPresetsLoading.hide();
                $cropPresetsLoading.hide();
                $uieFilterPresetsScroll.html('<p>Error loading presets.</p>');
                $uieCropPresetsScroll.html('<p>Error loading presets.</p>');
                reject(err);
            }
        });
    });
  };

  const generatePresetThumbnail = (preset) => {
    return new Promise((resolve, reject) => {
        if (!cropper || !cropper.ready || !activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
            console.warn("generatePresetThumbnail: Cropper or base image not ready for preset:", preset ? preset.name : 'N/A');
            const errorCanvas = document.createElement('canvas'); errorCanvas.width=1; errorCanvas.height=1;
            return resolve(generateScaledThumbnail(errorCanvas).toDataURL());
        }

        let baseCanvasFromCropperView;
        try {
            baseCanvasFromCropperView = cropper.getCroppedCanvas({ fillColor: '#fff' });
            if (!baseCanvasFromCropperView || baseCanvasFromCropperView.width === 0 || baseCanvasFromCropperView.height === 0) {
                console.warn("generatePresetThumbnail: cropper.getCroppedCanvas() returned invalid canvas for preset:", preset.name, ". Using fallback.");
                baseCanvasFromCropperView = document.createElement('canvas');
                baseCanvasFromCropperView.width = 80; baseCanvasFromCropperView.height = 80;
                const fbCtx = baseCanvasFromCropperView.getContext('2d');
                fbCtx.fillStyle = '#ddd'; fbCtx.fillRect(0,0,80,80);
            }
        } catch (e) {
            console.error("generatePresetThumbnail: Error getting baseCanvasFromCropperView for preset:", preset.name, e);
            const errorCanvas = document.createElement('canvas'); errorCanvas.width=1; errorCanvas.height=1;
            return resolve(generateScaledThumbnail(errorCanvas).toDataURL());
        }

        let sourceCanvasForPresetProcessing;
        if (preset.type === 'filter') {
            sourceCanvasForPresetProcessing = baseCanvasFromCropperView;
        } else if (preset.type === 'crop') {
            const sliderFilteredBase = document.createElement('canvas');
            sliderFilteredBase.width = baseCanvasFromCropperView.width;
            sliderFilteredBase.height = baseCanvasFromCropperView.height;
            const sfCtx = sliderFilteredBase.getContext('2d');
            sfCtx.filter = getCssFilterString(getCurrentUserAdjustedFiltersObject());
            sfCtx.drawImage(baseCanvasFromCropperView, 0, 0);
            sourceCanvasForPresetProcessing = sliderFilteredBase;
        } else {
            console.error("Unknown preset type for thumbnail generation:", preset.type);
            const errorCanvas = document.createElement('canvas'); errorCanvas.width=1; errorCanvas.height=1;
            return resolve(generateScaledThumbnail(errorCanvas).toDataURL());
        }
        
        processPresetApplication(preset, sourceCanvasForPresetProcessing, resolve, reject);
    });
  };

  const processPresetApplication = (preset, sourceCanvasForPreset, resolve, reject) => {
      let finalPreviewCanvas = document.createElement('canvas');
      let finalCtx = finalPreviewCanvas.getContext('2d');

      if (preset.type === 'filter') {
          try {
              const presetFilterDetails = JSON.parse(preset.preset_details);
              finalPreviewCanvas.width = sourceCanvasForPreset.width;
              finalPreviewCanvas.height = sourceCanvasForPreset.height;
              finalCtx.filter = getCssFilterString(presetFilterDetails);
              finalCtx.drawImage(sourceCanvasForPreset, 0, 0);
          } catch (err) { console.error("Error in filter preset processing for thumb:", preset.name, err); return reject(err); }
      } else if (preset.type === 'crop') {
          try {
              const presetCropDetails = JSON.parse(preset.preset_details);
              const parts = presetCropDetails.aspect_ratio.split(':');
              const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);

              const sourceW = sourceCanvasForPreset.width;
              const sourceH = sourceCanvasForPreset.height;
              let newCropW, newCropH, cropX, cropY;
              if (sourceW / sourceH > targetRatio) {
                  newCropH = sourceH; newCropW = newCropH * targetRatio;
                  cropX = (sourceW - newCropW) / 2; cropY = 0;
              } else {
                  newCropW = sourceW; newCropH = newCropW / targetRatio;
                  cropX = 0; cropY = (sourceH - newCropH) / 2;
              }
              finalPreviewCanvas.width = Math.round(newCropW);
              finalPreviewCanvas.height = Math.round(newCropH);
              finalCtx.drawImage(sourceCanvasForPreset, cropX, cropY, newCropW, newCropH, 0, 0, finalPreviewCanvas.width, finalPreviewCanvas.height);
          } catch (err) { console.error("Error in crop preset processing for thumb:", preset.name, err); return reject(err); }
      } else { return reject("Unknown preset type for thumbnail: " + preset.type); }

      const thumbCanvas = generateScaledThumbnail(finalPreviewCanvas);
      resolve(thumbCanvas.toDataURL());
  };

  const updatePresetThumbnails = () => {
    const callGeneratePresetThumbnail = (preset) => {
        if (typeof generatePresetThumbnail !== 'function') {
            console.error("!!! updatePresetThumbnails -> callGeneratePresetThumbnail: generatePresetThumbnail is NOT a function when invoked for preset:", preset ? preset.name : 'N/A');
            return Promise.resolve(`<div id="preset_${preset ? preset.id : 'error'}" class="uie-preset-box uie-box" data-preset-id="${preset ? preset.id : 'error'}" title="Generator Function Error"><div class="image-container" style="background:#800; color:white; display:flex; align-items:center; justify-content:center; font-size:0.7em; text-align:center;">Fn Err</div><span class="uie-preset-caption uie-box-caption">${preset ? preset.name : 'Error'}</span></div>`);
        }
        return generatePresetThumbnail(preset);
    };

    return new Promise((resolve, reject) => {
        if (!cropper || !cropper.ready) {
            console.warn("updatePresetThumbnails: Cropper not ready.");
            $filterPresetsLoading.hide();
            $cropPresetsLoading.hide();
            return reject(new Error("Cropper not ready for preset thumbnails."));
        }
        if (!presetsData || presetsData.length === 0) {
            console.log("updatePresetThumbnails: No presets data to render.");
            $filterPresetsLoading.hide();
            $cropPresetsLoading.hide();
            $uieFilterPresetsScroll.empty();
            $uieCropPresetsScroll.empty();
            return resolve();
        }

        $filterPresetsLoading.show();
        $cropPresetsLoading.show();

        const thumbnailPromises = presetsData.map(preset =>
            callGeneratePresetThumbnail(preset)
                .catch(err => {
                    console.error("Error generating thumbnail for preset (in map's catch):", preset.name, err);
                    return `<div id="preset_${preset.id}" class="uie-preset-box uie-box" data-preset-id="${preset.id}" title="Error loading preview">
                               <div class="image-container" style="background:#500; color:white; display:flex; align-items:center; justify-content:center; font-size:0.7em; text-align:center;">Preview Error</div>
                               <span class="uie-preset-caption uie-box-caption">${preset.name}</span>
                             </div>`;
                })
        );

        Promise.all(thumbnailPromises)
            .then(generatedHtmlOrDataUrls => {
                $uieFilterPresetsScroll.empty();
                $uieCropPresetsScroll.empty();

                generatedHtmlOrDataUrls.forEach((result, index) => {
                    const preset = presetsData[index];
                    let presetBoxHtml;
                    if (typeof result === 'string' && result.startsWith('<div')) {
                        presetBoxHtml = result;
                    } else {
                         presetBoxHtml = `
                          <div id="preset_${preset.id}" class="uie-preset-box uie-box" data-preset-id="${preset.id}" data-preset-type="${preset.type}" data-preset-details='${preset.preset_details.replace(/'/g, "&apos;")}'>
                            <div class="image-container"><img class="uie-box-img" src="${result}" alt="${preset.name}"></div>
                            <span class="uie-preset-caption uie-box-caption">${preset.name}</span>
                          </div>`;
                    }
                    if (preset.type === 'filter') {
                      $uieFilterPresetsScroll.append(presetBoxHtml);
                    } else if (preset.type === 'crop') {
                      $uieCropPresetsScroll.append(presetBoxHtml);
                    }
                });
                resolve();
            })
            .catch(overallError => {
                console.error("updatePresetThumbnails: Overall error processing preset thumbnails:", overallError);
                $uieFilterPresetsScroll.empty().html('<p>Error rendering presets.</p>');
                $uieCropPresetsScroll.empty().html('<p>Error rendering presets.</p>');
                reject(overallError);
            })
            .finally(() => {
                $filterPresetsLoading.hide();
                $cropPresetsLoading.hide();
            });
    });
  };

  const setupPresetSorting = () => {
    // Check if sortable is already initialized
    if ($uieFilterPresetsScroll.hasClass('ui-sortable')) {
        $uieFilterPresetsScroll.sortable('destroy');
    }
    if ($uieCropPresetsScroll.hasClass('ui-sortable')) {
        $uieCropPresetsScroll.sortable('destroy');
    }

    $uieFilterPresetsScroll.add($uieCropPresetsScroll).sortable({
      axis: 'x',
      items: '> .uie-preset-box',
      start: function(event, ui) { ui.item.css('flex', '0 0 auto'); },
      update: function(event, ui) {
        const newOrder = $(this).sortable("toArray", { attribute: "data-preset-id" });
        $.ajax({
          url: 'ajax/updatePresetOrder.php',
          type: 'POST',
          dataType: 'json',
          data: { order: newOrder },
          success: function(response) {
            showNotification("Preset order updated.", "info");
          },
          error: function(err) {
            showNotification("Error updating preset order.", "error");
          }
        });
      }
    });
  };

  debouncedUpdateThumbnails = debounce(() => {
    if (!cropper || !cropper.ready) return;
    updatePresetThumbnails();
  }, 350);


  const bindPresetEvents = () => {
    // Use $uieFilterPresetsScroll and $uieCropPresetsScroll for delegated events
    $uieFilterPresetsScroll.add($uieCropPresetsScroll).off('click.uiePreset').on('click.uiePreset', '.uie-preset-box', function() {
        const $this = $(this);
        const presetType = $this.attr('data-preset-type');
        let presetDetailsString = $this.attr('data-preset-details');
        let presetDetails;

        try {
            presetDetails = JSON.parse(presetDetailsString.replace(/&apos;/g, "'"));
        } catch (err) {
            console.error("Error parsing preset details on click:", err, "Raw:", presetDetailsString);
            showNotification("Error applying preset: Invalid details.", "error");
            return;
        }

        if (!cropper || !cropper.ready) {
            showNotification("Editor not ready to apply preset.", "info");
            return;
        }

        if (presetType === 'filter') {
            $brightnessSlider.val(presetDetails.brightness !== undefined ? presetDetails.brightness : 100);
            $contrastSlider.val(presetDetails.contrast !== undefined ? presetDetails.contrast : 100);
            $saturationSlider.val(presetDetails.saturation !== undefined ? presetDetails.saturation : 100);
            $hueSlider.val(presetDetails.hue !== undefined ? presetDetails.hue : 0);

            $brightnessSlider.trigger('input');
            $contrastSlider.trigger('input');
            $saturationSlider.trigger('input');
            $hueSlider.trigger('input').trigger('change');

        } else if (presetType === 'crop') {
            if (presetDetails.aspect_ratio) {
                const parts = presetDetails.aspect_ratio.split(':');
                if (parts.length === 2) {
                    const newAspectRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
                    if (!isNaN(newAspectRatio) && newAspectRatio > 0) {
                        cropper.setAspectRatio(newAspectRatio);
                        const canvasData = cropper.getCanvasData();
                        let newCropBoxWidth, newCropBoxHeight;

                        // Ensure canvasData is valid before using its properties
                        if (!canvasData || typeof canvasData.width !== 'number' || typeof canvasData.height !== 'number' ||
                            typeof canvasData.left !== 'number' || typeof canvasData.top !== 'number') {
                            showNotification("Error applying crop preset: Cropper canvas data unavailable.", "error");
                            return;
                        }

                        if (canvasData.width / canvasData.height > newAspectRatio) {
                           newCropBoxHeight = canvasData.height;
                           newCropBoxWidth = newCropBoxHeight * newAspectRatio;
                        } else {
                           newCropBoxWidth = canvasData.width;
                           newCropBoxHeight = newCropBoxWidth / newAspectRatio;
                        }
                        cropper.setCropBoxData({
                            left: canvasData.left + (canvasData.width - newCropBoxWidth) / 2,
                            top: canvasData.top + (canvasData.height - newCropBoxHeight) / 2,
                            width: newCropBoxWidth,
                            height: newCropBoxHeight
                        });
                        isAspectRatioLocked = true;
                        currentLockedAspectRatio = newAspectRatio;
                        updateAspectRatioLockButton();
                        if (debouncedUpdateThumbnails) debouncedUpdateThumbnails();
                    } else {
                         showNotification("Invalid aspect ratio in preset.", "error");
                    }
                } else {
                     showNotification("Malformed aspect ratio string in preset.", "error");
                }
            }
        }
    });
  };

  const initializeCropperInstance = (imageSrcForCropper, initialSettings = null, options = {}) => {
    const defaultOptions = { refreshVariants: true };
    const mergedOptions = { ...defaultOptions, ...options };

    const imageElementForCropperDOM = document.getElementById('uie-image');
    effectiveCropperSource = imageSrcForCropper;

    if (cropper) {
        try {
            if (cropper.element) {
                cropper.element.removeEventListener('zoom', debouncedUpdateThumbnails);
            }
            cropper.destroy();
        } catch (e) { console.warn("Error destroying previous cropper instance:", e); }
        cropper = null;
    }

    $(imageElementForCropperDOM).attr('src', imageSrcForCropper); // Set src attribute directly
    if (!$uieImage || !$uieImage.length) $uieImage = $('#uie-image');


    const tempImg = new Image();
    tempImg.onload = () => {
        // If imageSrcForCropper was a data URL from a processed virtual master,
        // its dimensions are the true "source" for the cropper at this point.
        effectiveCropperSourceDimensions = { width: tempImg.width, height: tempImg.height };

        if (effectiveCropperSourceDimensions.width === 0 || effectiveCropperSourceDimensions.height === 0) {
            console.error("Cannot initialize Cropper: effective source image has zero dimensions.", imageSrcForCropper.substring(0,100) + "...");
            showNotification("Error: Image data for editor is invalid (zero dimensions).", "error");
            closeEditor();
            return;
        }

        let cropperOptions = {
            viewMode: 1, movable: true, scalable: true, zoomable: true,
            cropBoxResizable: true, responsive: true, guides: false,
            zoomOnWheel: true, wheelZoomRatio: 0.1,
            minCropBoxWidth: 10, minCropBoxHeight: 10,
            cropstart: function(event) { /* For future use */ },
            cropmove: function(event) {
                if (event.detail.originalEvent) { updateDisplayedDimensions(); }
            },
            cropend: function(event) {
                if (event.detail.originalEvent) {
                    updateDisplayedDimensions();
                    if (debouncedUpdateThumbnails) debouncedUpdateThumbnails();
                }
            },
            crop: function(event) {
                updateDisplayedDimensions();
                if (!event.detail.originalEvent && cropper && cropper.ready) {
                   if (debouncedUpdateThumbnails) debouncedUpdateThumbnails();
                }
            },
            ready: function() {
                if (!cropper) { console.warn("Cropper instance became null during ready callback."); return; }

                $cropperViewBoxImage = $(cropper.cropper).find('.cropper-view-box img');
                if (this && this.element) { // 'this' is the Cropper instance here
                    this.element.removeEventListener('zoom', debouncedUpdateThumbnails); // Remove first to avoid duplicates
                    this.element.addEventListener('zoom', debouncedUpdateThumbnails);
                }

                const container = cropper.getContainerData();
                const imageW = effectiveCropperSourceDimensions.width; // Use the dimensions of the actual image loaded into cropper
                const imageH = effectiveCropperSourceDimensions.height;
                let fitZoom = 1.0;

                if (imageW > 0 && imageH > 0 && container.width > 0 && container.height > 0) {
                    fitZoom = Math.min(container.width / imageW, container.height / imageH);
                } else if (imageW > 0 && imageH > 0) { // Fallback if container dims are zero for some reason
                    fitZoom = 1.0; // Avoid division by zero
                    console.warn("[UIE Cropper Ready] Cropper container has zero dimensions. Defaulting fitZoom.", container);
                }


                cropper.zoomTo(fitZoom);

                const actualCanvasAfterInitialZoom = cropper.getCanvasData();
                if (imageW > 0 && actualCanvasAfterInitialZoom.width > 0) { initialZoomRatio = actualCanvasAfterInitialZoom.width / imageW; }
                else { initialZoomRatio = fitZoom > 0 ? fitZoom : 1; } // Prevent zero or negative initialZoomRatio

                // Center the image after initial zoom
                 if (actualCanvasAfterInitialZoom.width > 0 && actualCanvasAfterInitialZoom.height > 0) {
                    cropper.setCanvasData({
                        left: (container.width - actualCanvasAfterInitialZoom.width) / 2,
                        top: (container.height - actualCanvasAfterInitialZoom.height) / 2,
                        width: actualCanvasAfterInitialZoom.width, // Keep the width from zoomTo
                        height: actualCanvasAfterInitialZoom.height // Keep the height from zoomTo
                    });
                }


                const filtersForUI = (initialSettings && initialSettings.filters) ?
                                     initialSettings.filters :
                                     { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

                $brightnessSlider.val(filtersForUI.brightness);
                $contrastSlider.val(filtersForUI.contrast);
                $saturationSlider.val(filtersForUI.saturation);
                $hueSlider.val(filtersForUI.hue);

                applyCssFiltersToImage(filtersForUI);

                if (initialSettings && initialSettings.crop) {
                    // Ensure crop data is valid before applying
                    const csCrop = initialSettings.crop;
                    if (csCrop && typeof csCrop.x === 'number' && typeof csCrop.y === 'number' &&
                        typeof csCrop.width === 'number' && csCrop.width > 0 &&
                        typeof csCrop.height === 'number' && csCrop.height > 0) {
                       cropper.setData(csCrop);
                    } else {
                        console.warn("[UIE Cropper Ready] Invalid initial crop settings provided. Resetting crop box.", csCrop);
                        // Fallback to full crop box of the zoomed image
                        const canvasForInitialCropBox = cropper.getCanvasData();
                        if (canvasForInitialCropBox.width > 0 && canvasForInitialCropBox.height > 0) {
                            cropper.setCropBoxData({ left: canvasForInitialCropBox.left, top: canvasForInitialCropBox.top, width: canvasForInitialCropBox.width, height: canvasForInitialCropBox.height });
                        }
                    }
                } else {
                    // Default crop: set crop box to cover the entire (possibly zoomed) canvas.
                    const canvasForInitialCropBox = cropper.getCanvasData();
                     if (canvasForInitialCropBox.width > 0 && canvasForInitialCropBox.height > 0) {
                        cropper.setCropBoxData({ left: canvasForInitialCropBox.left, top: canvasForInitialCropBox.top, width: canvasForInitialCropBox.width, height: canvasForInitialCropBox.height });
                    }
                }

                $zoomSlider.val(0); // Zoom slider represents delta from initial fitZoom
                isAspectRatioLocked = false; currentLockedAspectRatio = NaN;
                updateAspectRatioLockButton();
                updateDisplayedDimensions();
                requestAnimationFrame(pollZoomSlider);

                setTimeout(async () => {
                    if (!cropper || !cropper.ready) return;
                    try {
                        await loadMediaPresets(); // Load preset definitions
                        if (presetsData.length > 0) { await updatePresetThumbnails(); } // Then generate their thumbnails
                        else { $filterPresetsLoading.hide(); $cropPresetsLoading.hide(); }
                    } catch (presetError) {
                        console.error("[UIE] Error loading or updating presets on ready:", presetError);
                        $filterPresetsLoading.hide(); $cropPresetsLoading.hide();
                     }

                    // Refresh variants or mark as loaded
                    if (mergedOptions.refreshVariants || !variantsInitiallyLoadedForMaster) {
                        loadAndDisplayVariants(currentOpenMasterAsset ? currentOpenMasterAsset.id : currentMediaAssetId);
                    } else {
                        // If not refreshing, ensure correct active state for variant/master
                        if (!isEditingMaster && currentVariantId) {
                            $('.uie-variant-box').removeClass('active-variant');
                            $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
                            $uieSourceThumbnailBox.removeClass('active-variant');
                            $uieSourceLabel.show().html(`${currentMediaAssetAdminTitleOriginal}&nbsp;&gt;&nbsp;`);
                        } else if (isEditingMaster) {
                            $('.uie-variant-box').removeClass('active-variant');
                            $uieSourceThumbnailBox.addClass('active-variant');
                            $uieSourceLabel.hide().empty();
                        }
                        $variantsLoading.hide();
                    }
                    bindPresetEvents(); // Bind clicks to preset thumbnails
                    updateActionButtons(); // Ensure correct buttons are visible
                }, 0); // Timeout to allow cropper to fully settle its UI

                // Clear these as they are now processed or were for a previous open
                localTargetVariantToPreloadId = null;
                localTargetVariantToPreloadDetails = null;
                localTargetVariantToPreloadTitle = null;
            }
        };

        const tempContainerEl = document.querySelector('.uie-left-column .uie-image-editing');
        if (tempContainerEl) {
            if (effectiveCropperSourceDimensions.width < tempContainerEl.clientWidth &&
                effectiveCropperSourceDimensions.height < tempContainerEl.clientHeight) {
                cropperOptions.minCanvasWidth = effectiveCropperSourceDimensions.width;
                cropperOptions.minCanvasHeight = effectiveCropperSourceDimensions.height;
            }
        }
        cropper = new Cropper(imageElementForCropperDOM, cropperOptions);
    };
    tempImg.onerror = () => {
        console.error("Failed to load image for Cropper initialization:", imageSrcForCropper.substring(0,100) + "...");
        showNotification("Error: Could not load image into editor.", "error");
        closeEditor();
    };
    tempImg.src = imageSrcForCropper;
  };

  const resetEditorToMasterState = async (applyAssetDefaults = true) => { // applyAssetDefaults not really used here anymore for crop/filters
    currentVariantId = null;
    isEditingMaster = true;
    currentOpenVariant = null;

    $uieTitleInput.val(currentMediaAssetAdminTitleOriginal);
    $uieCaptionInput.val(currentMasterPublicCaptionOriginal);
    $uieAltTextInput.val(currentMasterAltTextOriginal);
    $uieSourceUrlInput.val(currentMasterSourceUrlOriginal).prop('disabled', !isCurrentMasterPhysical);
    $uieAttributionInput.val(currentMasterAttributionOriginal).prop('disabled', !isCurrentMasterPhysical);


    if (!isCurrentMasterPhysical) {
      $uieSourceThumbnailBox.addClass('uie-source-is-virtual').attr('title', 'Virtual Master (Source ID: ' + currentPhysicalSourceAssetId + ')');
    } else {
      $uieSourceThumbnailBox.removeClass('uie-source-is-virtual').attr('title', 'Physical Master');
    }

    if (!activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
        showNotification("Cannot reset to master: Base physical image not loaded.", "error"); return;
    }

    let imageSrcForCropperToUse;
    let initialSettingsForCropper = null; // Master has no specific "variant" settings to apply by default

    if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
        try {
            imageSrcForCropperToUse = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
            // If virtual master, filters are baked in, so UI sliders should reflect neutral state unless master itself has filter_state
            // For simplicity, we always reset sliders here and the imageSrcForCropperToUse has the baked-in look.
             initialSettingsForCropper = { filters: { brightness:100, contrast:100, saturation:100, hue:0 }};
        }
        catch (error) {
            console.error("[UIE] Error processing virtual master for reset: ", error);
            imageSrcForCropperToUse = currentMediaAssetUrl; // Fallback to physical URL
            effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
        }
    } else { // Physical master
        imageSrcForCropperToUse = currentMediaAssetUrl;
        effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
        // For physical master, we might want to apply its own `filter_state` if it exists.
        // However, the current logic in openEditor and initializeCropperInstance handles default filter application.
        // For reset, typically means sliders to neutral and original image.
        initialSettingsForCropper = { filters: { brightness:100, contrast:100, saturation:100, hue:0 }};
        // If physical master had default_crop, that's part of its definition, not a "reset" target here.
        // The cropper will reset to full view of `imageSrcForCropperToUse`.
    }

    // Initialize cropper with the base image (physical or processed virtual master)
    // No specific 'crop' is passed to initialSettings, so cropper initializes to full view.
    // Filters are explicitly set to neutral (or could be master's defaults if desired).
    initializeCropperInstance(imageSrcForCropperToUse, initialSettingsForCropper, { refreshVariants: false });

    $uieSourceThumbnailBox.addClass('active-variant');
    $('.uie-variant-box').removeClass('active-variant');
    updateActionButtons();
  };

const openEditor = async (physicalImgUrl, assetDataObj, saveCb, closedCb, options = {}) => {
    console.log("[UIE] openEditor called. Master Asset ID:", assetDataObj.id, "Options:", options);
    ensureOverlayExists();

    currentEditorOptions = options || {}; // Store options for contextual button
    currentOpenMasterAsset = {...assetDataObj}; // Store a copy of the master asset object

    onSaveCallbackForContext = saveCb; // This is the main callback
    onEditorClosedCallback = closedCb;
    
    // Store original master details for comparison and UIE title reset
    currentMediaAssetId = assetDataObj.id;
    currentMediaAssetAdminTitleOriginal = assetDataObj.admin_title || assetDataObj.title || `Image ${assetDataObj.id}`; 
    currentMasterPublicCaptionOriginal = assetDataObj.public_caption || assetDataObj.caption || '';
    currentMasterAltTextOriginal = assetDataObj.alt_text || '';
    currentMasterSourceUrlOriginal = assetDataObj.source_url || ''; 
    currentMasterAttributionOriginal = assetDataObj.attribution || '';
    isCurrentMasterPhysical = (!assetDataObj.physical_source_asset_id || assetDataObj.physical_source_asset_id === assetDataObj.id || assetDataObj.physical_source_asset_id === null); 
    currentMediaAssetUrl = physicalImgUrl; 
    currentPhysicalSourceAssetId = isCurrentMasterPhysical ? assetDataObj.id : assetDataObj.physical_source_asset_id;
    
    try { 
        currentAssetDefaultCrop = (assetDataObj.default_crop && String(assetDataObj.default_crop).trim() !== "" && assetDataObj.default_crop !== "null") ? JSON.parse(assetDataObj.default_crop) : null;
        currentAssetDefaultFilters = (assetDataObj.filter_state && String(assetDataObj.filter_state).trim() !== "" && assetDataObj.filter_state !== "null") ? JSON.parse(assetDataObj.filter_state) : null;
    } catch (e) { currentAssetDefaultCrop = null; currentAssetDefaultFilters = null; console.error("[UIE] Error parsing asset defaults:", e); }

    uieCurrentMediaAssetIdForTags = assetDataObj.id; 
    if (uieCurrentMediaAssetIdForTags && typeof TagSystem !== 'undefined' && TagSystem.setItemContext) {
        TagSystem.setItemContext(uieCurrentMediaAssetIdForTags, 'mediaAsset'); // Use setItemContext for TagSystem
        TagSystem.init({ itemType: 'mediaAsset', itemId: uieCurrentMediaAssetIdForTags, inputSelector: '#uie-tag-input-field', listSelector: '#uie-selected-tags-container', addTagOnBlur: false });
    } else { if (typeof TagSystem !== 'undefined' && TagSystem.setItemContext) { TagSystem.setItemContext(null, 'mediaAsset');} }

    // Determine initial values for UIE fields based on whether a variant is being preloaded
    let initialTitleForUIE = currentMediaAssetAdminTitleOriginal;
    let initialCaptionForUIE = currentMasterPublicCaptionOriginal;
    let initialAltTextForUIE = currentMasterAltTextOriginal;

    isEditingMaster = true; 
    currentVariantId = null;
    currentOpenVariant = null; // Clear any previously open variant

    if (options.targetVariantId) {
        // Attempt to find variant in cache OR use provided details
        // Note: loadAndDisplayVariants (called later by initializeCropperInstance) will populate cachedVariantsForCurrentMaster.
        // This means on initial open with targetVariantId, cache might be empty.
        // So, relying on options.targetVariantDetails if cache miss is important.

        let variantToLoad = cachedVariantsForCurrentMaster.find(v => String(v.id) === String(options.targetVariantId));
        if (!variantToLoad && options.targetVariantDetails) {
             // Construct a temporary variant object if details are directly provided
             variantToLoad = {
                 id: options.targetVariantId,
                 variant_type: options.targetVariantTitle || `Variant ${options.targetVariantId}`,
                 variant_details: options.targetVariantDetails, // These are already parsed objects from caller
                 variant_details_parsed: options.targetVariantDetails // Store parsed too
             };
        }


        if (variantToLoad) {
            isEditingMaster = false;
            currentVariantId = variantToLoad.id;
            currentOpenVariant = variantToLoad; 

            initialTitleForUIE = variantToLoad.variant_type || `Variant ${currentVariantId}`;
            // Ensure variant_details are parsed if they are a string
            let details = variantToLoad.variant_details_parsed || variantToLoad.variant_details;
            if (typeof details === 'string') {
                try { details = JSON.parse(details.replace(/&apos;/g, "'")); }
                catch(e) { console.error("[UIE] Error parsing variant details for preload: ", e); details = {};}
            }
            currentOpenVariant.variant_details_parsed = details; // Store parsed version

            initialCaptionForUIE = details.caption || '';
            initialAltTextForUIE = details.altText || '';
            console.log("[UIE] Opening with target variant:", currentVariantId, "Title:", initialTitleForUIE);
        } else {
            console.warn(`[UIE] Target variant ID ${options.targetVariantId} provided but details not found/provided. Opening master.`);
        }
    }
    
    // Set UIE fields with the determined initial values
    $uieTitleInput.val(initialTitleForUIE);
    $uieCaptionInput.val(initialCaptionForUIE);
    $uieAltTextInput.val(initialAltTextForUIE);
    $uieSourceUrlInput.val(currentMasterSourceUrlOriginal).prop('disabled', !isEditingMaster || !isCurrentMasterPhysical);
    $uieAttributionInput.val(currentMasterAttributionOriginal).prop('disabled', !isEditingMaster || !isCurrentMasterPhysical);
    
    // Store these initial values for comparison by the contextual button
    currentUIEMetadataOriginal = { adminTitle: initialTitleForUIE, publicCaption: initialCaptionForUIE, altText: initialAltTextForUIE };
    
    // Dynamically add/update the contextual button
    if (!$actionsPanelContent || !$actionsPanelContent.length) cacheSelectors(); // Ensure cached
    $actionsPanelContent.find('.uie-contextual-use-button').remove(); 
    if (currentEditorOptions.contextualUseButtonText) {
        const $contextualButton = $(`<button type="button" class="uie-action-button uie-contextual-use-button">${currentEditorOptions.contextualUseButtonText}</button>`);
        $contextualButton.css({ backgroundColor: '#17a2b8', borderColor: '#138496', color: '#fff' }); 
        // Bind click handler directly to the new button instance
        $contextualButton.off('click.uiecontextual').on('click.uiecontextual', handleContextualUseButtonClick);
        $actionsPanelContent.prepend($contextualButton); 
    }
    updateActionButtons(); // Also correctly show/hide standard buttons based on isEditingMaster

    // Update source thumbnail display
    $uieSourceThumbnailBox.find('.uie-box-img').attr('src', '').attr('alt', 'Loading source preview...');
    $uieSourceThumbnailBox.find('.uie-box-caption').text(currentMediaAssetAdminTitleOriginal);
    $uieVariantScroll.empty(); // Clear variants, will be loaded by initializeCropperInstance->loadAndDisplayVariants
    if($variantsLoading && $variantsLoading.length) { // Show loading indicator for variants
        $uieVariantScroll.append($variantsLoading.show());
    }


    const imagePreloader = new Image(); 
    imagePreloader.crossOrigin = "Anonymous";
    imagePreloader.onload = async function() { 
        if (this.naturalWidth === 0 || this.naturalHeight === 0) {
            showNotification("Error: Preloaded physical image data is invalid (zero dimensions).", "error");
            if (typeof onEditorClosedCallback === 'function') onEditorClosedCallback(); return;
        }
        activeBaseImageElement = this; 
        
        const $sourceThumbBox = $uieSourceThumbnailBox; 
        if (!isCurrentMasterPhysical) { 
            $sourceThumbBox.addClass('uie-source-is-virtual').attr('title', 'Virtual Master (Physical Source ID: ' + currentPhysicalSourceAssetId + ')');
        } else {
            $sourceThumbBox.removeClass('uie-source-is-virtual').attr('title', 'Physical Master');
        }
        
        try {
            const masterPreviewCanvas = await generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, null, null);
            if (masterPreviewCanvas.width > 0 && masterPreviewCanvas.height > 0) {
                const scaledThumbCanvas = generateScaledThumbnail(masterPreviewCanvas, 85, 70); 
                $sourceThumbBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL()).attr('alt', 'Source Thumbnail');
            } else { $sourceThumbBox.find('.uie-box-img').attr('src','').attr('alt', 'Preview Error (Zero Dim)');}
        } catch (thumbError) { 
            console.error("[UIE] Error generating source thumbnail:", thumbError);
            $sourceThumbBox.find('.uie-box-img').attr('src','').attr('alt', 'Preview Error'); 
        }

        let imageSrcToLoadInCropper;
        let initialSettingsForCropper = null;

        if (currentVariantId && currentOpenVariant) { // If preloading a specific variant
            console.log("[UIE] Preloading variant for Cropper:", currentOpenVariant.variant_type);
            if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
                imageSrcToLoadInCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
            } else { 
                imageSrcToLoadInCropper = currentMediaAssetUrl; 
                effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight }; 
            }
            // currentOpenVariant.variant_details_parsed should be populated by now
            const detailsToUse = currentOpenVariant.variant_details_parsed || {};
            initialSettingsForCropper = { 
                crop: detailsToUse.crop, 
                filters: detailsToUse.filters 
            };
        } else { // Loading master
            console.log("[UIE] Loading master for Cropper.");
            if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
                imageSrcToLoadInCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
            } else { 
                imageSrcToLoadInCropper = currentMediaAssetUrl; 
                effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight }; 
            }
            // No specific crop/filter settings for master load beyond its defaults (which are baked into imageSrcToLoadInCropper for virtual)
            // or applied by cropper.ready for physical masters (neutral filters).
            // If physical master has currentAssetDefaultFilters, they will be applied by initializeCropperInstance if initialSettings.filters is null.
            // To ensure this, pass along the master's default filters if they exist.
            if (isCurrentMasterPhysical && currentAssetDefaultFilters) {
                initialSettingsForCropper = { filters: currentAssetDefaultFilters };
            } else { // Virtual master has filters baked in, or physical master has no default filters; sliders should be neutral.
                 initialSettingsForCropper = { filters: {brightness:100, contrast:100, saturation:100, hue:0}};
            }
        }
        
        $uieOverlay.removeClass('hidden').fadeIn(300, () => { 
            initializeCropperInstance(imageSrcToLoadInCropper, initialSettingsForCropper, { refreshVariants: true }); 
        });
    };
    imagePreloader.onerror = function() { 
        console.error("[UIE] Failed to preload physical source image:", currentMediaAssetUrl);
        showNotification("Error: Could not load the main image. Editor cannot open.", "error");
        activeBaseImageElement = null;
        $uieSourceThumbnailBox.find('.uie-box-img').attr('src','').attr('alt', 'Load Error');
        if ($variantsLoading && $variantsLoading.length) $variantsLoading.hide(); 
        if (typeof onEditorClosedCallback === 'function') onEditorClosedCallback();
    };
    imagePreloader.src = currentMediaAssetUrl; 
};


  const closeEditor = () => {
    if (cropper) {
        try {
            if (cropper.element) { cropper.element.removeEventListener('zoom', debouncedUpdateThumbnails); }
            cropper.destroy();
        } catch(e) { console.warn("Error destroying cropper on close:", e); }
        cropper = null;
    }
    activeBaseImageElement = null; effectiveCropperSource = null;
    effectiveCropperSourceDimensions = { width: 0, height: 0 };
    cachedVariantsForCurrentMaster = []; variantsInitiallyLoadedForMaster = false;
    localTargetVariantToPreloadId = null; localTargetVariantToPreloadDetails = null; localTargetVariantToPreloadTitle = null;

    currentOpenMasterAsset = null; // Clear the loaded master asset
    currentEditorOptions = {};    // NEW: Reset context options
    currentUIEMetadataOriginal = {};
    currentOpenVariant = null;

    // Clear callbacks
    onSaveCallbackForContext = null; 

    $uieOverlay.fadeOut(300, function() { $(this).addClass('hidden'); });
    uieCurrentMediaAssetIdForTags = null;
    if (typeof TagSystem !== 'undefined' && TagSystem.setItemContext) TagSystem.setItemContext(null, 'mediaAsset');
    if (typeof onEditorClosedCallback === 'function') {
        onEditorClosedCallback();
    }
    onEditorClosedCallback = null; // Clear after calling
  };

  const getFinalProcessedImageDataUrl = () => { // Removed 'includeFiltersGlobally' as it's not used by callers as per current base
    if (!cropper || !cropper.ready) { showNotification("Cropper not ready.", "error"); return null; }
    let croppedCanvas;
    try { croppedCanvas = cropper.getCroppedCanvas(); } // fillColor could be an option if transparency issues arise
    catch (e) { showNotification("Error getting cropped canvas: " + e.message, "error"); return null; }

    if (!croppedCanvas || croppedCanvas.width === 0 || croppedCanvas.height === 0) {
        showNotification("Could not get valid cropped canvas data (zero dimensions).", "error");
        return null;
    }

    const userAdjustedFilters = getCurrentUserAdjustedFiltersObject();
    const filterString = getCssFilterString(userAdjustedFilters);

    // Only apply filters via canvas if they are not default
    if (filterString !== "brightness(100%) contrast(100%) saturate(100%) hue-rotate(0deg)") {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = croppedCanvas.width; finalCanvas.height = croppedCanvas.height;
        const ctx = finalCanvas.getContext('2d');
        ctx.filter = filterString;
        ctx.drawImage(croppedCanvas, 0, 0);
        return finalCanvas.toDataURL('image/png');
    } else {
        // If no filters applied, return the data URL from the cropped canvas directly
        return croppedCanvas.toDataURL('image/png');
    }
  };
  
  // Placeholder for a function that might be defined in the broader application context
  // This is referenced by the new handleContextualUseButtonClick
  const getPreviewUrlForAsset = (asset, variantDetails) => {
      console.warn("[UIE] getPreviewUrlForAsset is a placeholder and needs implementation if used as primary preview source.");
      // Example: if asset has a direct thumbnail or if a specific URL generation logic exists
      if (asset && asset.thumbnail_url) return asset.thumbnail_url;
      return null; // Return null if no specific logic
  };


  const updateVariantThumbnailInStrip = (variantId, variantDetails) => {
    const $variantBox = $(`.uie-variant-box[data-variant-id="${variantId}"]`);
    if ($variantBox.length && activeBaseImageElement && activeBaseImageElement.complete && activeBaseImageElement.naturalWidth > 0) {
        // variantDetails should contain .crop and .filters
        const cropData = variantDetails.crop;
        const filtersData = variantDetails.filters;

        generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, cropData, filtersData)
            .then(previewCanvas => generateScaledThumbnail(previewCanvas, 85, 70))
            .then(scaledThumbCanvas => { $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL()); })
            .catch(err => {
                console.error("[UIE] Error updating variant thumbnail in strip:", err);
                $variantBox.find('.image-container').empty().append('<span style="color:red;font-size:9px;">Preview Error</span>');
             });
    }
  };

  const loadAndDisplayVariants = (mediaAssetIdToLoad) => {
    if (!$variantsLoading.length) cacheSelectors(); // Ensure $variantsLoading is cached
    $variantsLoading.show();
    $uieVariantScroll.empty().append($variantsLoading); // Show loading indicator

    if (!mediaAssetIdToLoad) {
        console.warn("[UIE] loadAndDisplayVariants: No mediaAssetIdToLoad provided.");
        $uieVariantScroll.empty().append('<p>No image selected.</p>'); $variantsLoading.hide(); return;
    }
    if (!activeBaseImageElement || !activeBaseImageElement.complete || !activeBaseImageElement.naturalWidth) {
        console.warn("[UIE] loadAndDisplayVariants: Base image not ready for variant previews.");
        $uieVariantScroll.empty().append('<p>Base image not ready for variant previews.</p>'); $variantsLoading.hide(); return;
    }

    $.ajax({
      url: 'ajax/getMediaVariants.php', type: 'GET', data: { media_asset_id: mediaAssetIdToLoad }, dataType: 'json',
      success: function(response) {
        $uieVariantScroll.empty(); cachedVariantsForCurrentMaster = [];
        if (response.success && response.variants && response.variants.length > 0) {
          cachedVariantsForCurrentMaster = response.variants.map(variant => {
              let detailsParsed = null;
              try { detailsParsed = JSON.parse(variant.variant_details); } catch(e) { /* ignore */ }
              return {...variant, variant_details_parsed: detailsParsed };
          });

          cachedVariantsForCurrentMaster.forEach(variant => {
            let variantAdminTitle = variant.variant_type || `Variant ${variant.id}`;
            // variant_details_parsed is populated above
            const variantDetailsForThumb = variant.variant_details_parsed || { crop: null, filters: null };


            const variantBoxHtml = `<div class="uie-variant-box uie-box" data-variant-id="${variant.id}" data-variant-title="${variantAdminTitle.replace(/"/g, "&quot;")}">
                                      <div class="image-container"><img class="uie-box-img" src="" alt="${variantAdminTitle}"></div>
                                      <span class="uie-variant-caption uie-box-caption">${variantAdminTitle}</span></div>`;
            const $variantBox = $(variantBoxHtml);
            // Store full variant data (including stringified details for consistency if needed elsewhere, though parsed is preferred)
            $variantBox.data('variantData', variant);
            $uieVariantScroll.append($variantBox);

            generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, variantDetailsForThumb.crop, variantDetailsForThumb.filters)
            .then(previewCanvas => generateScaledThumbnail(previewCanvas, 85, 70))
            .then(scaledThumbCanvas => { $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL()); })
            .catch(err => {
                console.error("[UIE] Error generating variant thumbnail:", err);
                $variantBox.find('.image-container').empty().append('<span style="color:red;font-size:9px;">Preview Error</span>');
            });
          });
          bindVariantSelectionEvents(); // Bind click events to these new variant boxes

          // After variants are loaded and displayed, correctly set the active one if UIE was opened with a target variant
            if (!isEditingMaster && currentVariantId) {
                $('.uie-variant-box').removeClass('active-variant');
                const $activeVariantBox = $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`);
                if ($activeVariantBox.length) {
                    $activeVariantBox.addClass('active-variant');
                } else {
                    console.warn(`[UIE] Variant ${currentVariantId} was target but not found in loaded list. Defaulting to master view.`);
                    resetEditorToMasterState(false); // Reset to master if target variant somehow isn't in the list
                }
                $uieSourceThumbnailBox.removeClass('active-variant');
                $uieSourceLabel.show().html(`${currentMediaAssetAdminTitleOriginal}&nbsp;&gt;&nbsp;`);
            } else if (isEditingMaster) {
                $('.uie-variant-box').removeClass('active-variant');
                $uieSourceThumbnailBox.addClass('active-variant');
                $uieSourceLabel.hide().empty();
            }

        } else if (response.success) { $uieVariantScroll.append('<p>No variants yet.</p>'); }
        else { $uieVariantScroll.append(`<p>Error loading variants: ${response.error || 'Unknown server error'}</p>`); }
        variantsInitiallyLoadedForMaster = true; $variantsLoading.hide();
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.error("[UIE] AJAX error loading variants:", textStatus, errorThrown);
        $uieVariantScroll.empty().append('<p>AJAX error loading variants.</p>'); $variantsLoading.hide(); variantsInitiallyLoadedForMaster = true;
      }
    });
  };

  const applyVariantStateToEditor = async (variantIdToApply, variantDataFull, isPreload = false) => {
    // variantDataFull is expected to be an object from cachedVariantsForCurrentMaster or similar
    // It should have id, variant_type, variant_details (string), and variant_details_parsed (object)

    if (!variantDataFull || !variantDataFull.id) {
        showNotification("Error: Variant data is incomplete. Cannot load.", "error");
        console.error("[UIE] applyVariantStateToEditor: Incomplete variant data", variantDataFull);
        return;
    }
    const variantAdminTitle = variantDataFull.variant_type || `Variant ${variantDataFull.id}`;
    let variantDetailsParsed = variantDataFull.variant_details_parsed;

    if (typeof variantDetailsParsed !== 'object' || variantDetailsParsed === null) {
        try {
            variantDetailsParsed = JSON.parse(String(variantDataFull.variant_details).replace(/&apos;/g, "'"));
        } catch (e) {
            showNotification("Error parsing variant details. Cannot load.", "error");
            console.error("[UIE] applyVariantStateToEditor: Error parsing variant_details string", variantDataFull.variant_details, e);
            return;
        }
    }


    currentVariantId = variantDataFull.id;
    isEditingMaster = false;
    currentOpenVariant = {...variantDataFull, variant_details_parsed: variantDetailsParsed}; // Store the currently active variant's full data

    if (!activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
        showNotification("Base physical image not ready to apply variant.", "error"); return;
    }

    let masterImageSrcForCropper;
    if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
        masterImageSrcForCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
    } else {
        masterImageSrcForCropper = currentMediaAssetUrl;
        if(!effectiveCropperSourceDimensions.width && activeBaseImageElement) {
             effectiveCropperSourceDimensions = {width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight};
        }
    }

    $uieTitleInput.val(variantAdminTitle);
    $uieCaptionInput.val(variantDetailsParsed.caption || '');
    $uieAltTextInput.val(variantDetailsParsed.altText || '');
    // Source/Attribution fields are for master, should be disabled and show master's values
    $uieSourceUrlInput.val(currentMasterSourceUrlOriginal).prop('disabled', true);
    $uieAttributionInput.val(currentMasterAttributionOriginal).prop('disabled', true);

    updateActionButtons(); // Updates button visibility and source label

    $uieSourceThumbnailBox.removeClass('active-variant');
    $('.uie-variant-box').removeClass('active-variant');
    $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
    $uieSourceLabel.show().html(`${currentMediaAssetAdminTitleOriginal}&nbsp;&gt;&nbsp;`); // Use original title of master

    // initializeCropperInstance will set sliders and cropper view
    initializeCropperInstance(masterImageSrcForCropper,
                              { crop: variantDetailsParsed.crop, filters: variantDetailsParsed.filters },
                              { refreshVariants: isPreload }); // isPreload might imply it's part of initial open

    showNotification(`Variant "${variantAdminTitle}" loaded for editing.`, "info");
};


  const bindVariantSelectionEvents = () => {
    $uieVariantScroll.off('click.variantBox').on('click.variantBox', '.uie-variant-box', async function() {
      const $this = $(this);
      const clickedVariantId = $this.data('variant-id');
      // Retrieve the full variant data stored on the element
      const selectedVariantData = $this.data('variantData');

      if (!selectedVariantData) {
          showNotification("Error loading variant: Data not found on element. Try refreshing.", "error");
          console.error("[UIE] Clicked variant box, but 'variantData' was not found. ID:", clickedVariantId);
          // Fallback attempt if data attribute was somehow missing but was in cache (less likely now)
          const cachedFallback = cachedVariantsForCurrentMaster.find(v => String(v.id) === String(clickedVariantId));
          if(cachedFallback) {
            await applyVariantStateToEditor(clickedVariantId, cachedFallback, false);
          }
          return;
      }
      await applyVariantStateToEditor(clickedVariantId, selectedVariantData, false);
    });
  };

  // --- NAMED HANDLERS FOR STANDARD SAVE BUTTONS (v2.2.28) ---
  const handleSaveMasterDetails = () => {
    if (!isEditingMaster || !currentOpenMasterAsset || !currentOpenMasterAsset.id) return;
    const newAdminTitle = $uieTitleInput.val(),
          newPublicCaption = $uieCaptionInput.val(),
          newAltText = $uieAltTextInput.val(),
          newSourceUrl = $uieSourceUrlInput.val(),
          newAttribution = $uieAttributionInput.val();

    $.ajax({
        url: 'ajax/updateMediaAssetDetails.php', type: 'POST',
        data: {
            media_asset_id: currentOpenMasterAsset.id,
            admin_title: newAdminTitle, title: newAdminTitle, // Assuming admin_title and title are kept same
            public_caption: newPublicCaption, alt_text: newAltText,
            source_url: newSourceUrl, attribution: newAttribution
        },
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                showNotification('Master asset details updated!', 'success');
                // Update local original values and the currentOpenMasterAsset object
                currentMediaAssetAdminTitleOriginal = newAdminTitle;
                currentMasterPublicCaptionOriginal = newPublicCaption;
                currentMasterAltTextOriginal = newAltText;
                currentMasterSourceUrlOriginal = newSourceUrl;
                currentMasterAttributionOriginal = newAttribution;

                if (currentOpenMasterAsset) {
                    currentOpenMasterAsset.admin_title = newAdminTitle;
                    currentOpenMasterAsset.title = newAdminTitle;
                    currentOpenMasterAsset.public_caption = newPublicCaption;
                    currentOpenMasterAsset.alt_text = newAltText;
                    currentOpenMasterAsset.source_url = newSourceUrl;
                    currentOpenMasterAsset.attribution = newAttribution;
                }

                $uieSourceThumbnailBox.find('.uie-box-caption').text(newAdminTitle);
                // If a variant is being edited, the source label prefix should reflect the new master title
                if ($uieSourceLabel.is(':visible') && !isEditingMaster) {
                    $uieSourceLabel.html(`${newAdminTitle}&nbsp;&gt;&nbsp;`);
                }

                if (typeof onSaveCallbackForContext === 'function') {
                    onSaveCallbackForContext({...currentOpenMasterAsset}, null); // Pass clone of updated master
                }
            } else {
                showNotification('Error updating master: ' + (response.error || 'Failed.'), 'error');
            }
        },
        error: (jqXHR, ts) => showNotification('AJAX Error updating master: ' + ts, 'error')
    });
  };

  const handleSaveAsVariant = () => {
    if (!isEditingMaster || !cropper || !cropper.ready || !currentOpenMasterAsset || !currentOpenMasterAsset.id) {
        showNotification("Please ensure you are editing the master image to save a new variant from it.", "info"); return;
    }
    const cropData = cropper.getData(true);
    const filters = getCurrentUserAdjustedFiltersObject();
    const caption = $uieCaptionInput.val();
    const altText = $uieAltTextInput.val();
    const details = JSON.stringify({ crop: cropData, filters: filters, caption: caption, altText: altText });
    const title = ($uieTitleInput.val() || currentMediaAssetAdminTitleOriginal || "Image") + " - Variant";

    $.ajax({
        url: 'ajax/saveMediaVariant.php', type: 'POST',
        data: { media_asset_id: currentOpenMasterAsset.id, variant_type: title, variant_details: details },
        dataType: 'json',
        success: function(response) {
            if (response.success && response.variant_id) {
                showNotification(`New Variant "${title}" (ID: ${response.variant_id}) saved!`, 'success');
                loadAndDisplayVariants(currentOpenMasterAsset.id); // Refresh variant strip

                // currentVariantId = response.variant_id; // Set currentVariantId
                // isEditingMaster = false; // Switch to editing the new variant
                // $uieTitleInput.val(title); // Update UIE title field
                // updateActionButtons(); // Update buttons for variant editing
                // Highlight the new variant in the strip (loadAndDisplayVariants might handle this if it finds currentVariantId)
                // setTimeout(() => { // Ensure DOM update before selection
                //    $('.uie-variant-box').removeClass('active-variant');
                //    $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
                //    $uieSourceThumbnailBox.removeClass('active-variant');
                // }, 100);


                const newVariantDataForCallback = {
                    id: response.variant_id, variant_id: response.variant_id,
                    media_asset_id: currentOpenMasterAsset.id,
                    variant_type: title, variant_details: details,
                    variant_details_parsed: JSON.parse(details),
                    image_url: currentOpenMasterAsset.image_url, // Physical URL is master's
                    preview_image_url: getFinalProcessedImageDataUrl() || getPreviewUrlForAsset(currentOpenMasterAsset, JSON.parse(details))
                };
                if (typeof onSaveCallbackForContext === 'function') {
                    onSaveCallbackForContext(currentOpenMasterAsset, newVariantDataForCallback);
                }
                // Do not auto-close. User might want to make it the active editing target or save another.
                // To make it active:
                const newlySavedVariant = cachedVariantsForCurrentMaster.find(v => String(v.id) === String(response.variant_id));
                if (newlySavedVariant) {
                    applyVariantStateToEditor(response.variant_id, newlySavedVariant, false);
                } else {
                    // If not immediately found in cache (should be after loadAndDisplayVariants),
                    // construct enough to switch context
                    applyVariantStateToEditor(response.variant_id, newVariantDataForCallback, false);

                }


            } else {
                showNotification('Error: ' + (response.error || 'Could not save new variant.'), 'error');
            }
        },
        error: (jqXHR, ts) => showNotification('AJAX Error saving new variant: ' + ts, 'error')
    });
  };

  const handleUpdateVariant = () => {
    if (isEditingMaster || !currentVariantId || !cropper || !cropper.ready || !currentOpenMasterAsset || !currentOpenMasterAsset.id) {
        showNotification("No variant selected or editor not ready.", "info"); return;
    }
    const cropData = cropper.getData(true);
    const filters = getCurrentUserAdjustedFiltersObject();
    const title = $uieTitleInput.val();
    const caption = $uieCaptionInput.val();
    const altText = $uieAltTextInput.val();
    const details = JSON.stringify({ crop: cropData, filters, caption, altText });

    $.ajax({
        url: 'ajax/updateMediaVariant.php', type: 'POST',
        data: { variant_id: currentVariantId, media_asset_id: currentOpenMasterAsset.id, variant_type: title, variant_details: details },
        dataType: 'json',
        success: function(response) {
            if (response.success) {
                showNotification(`Variant "${title}" updated!`, 'success');
                const variantIndex = cachedVariantsForCurrentMaster.findIndex(v => String(v.id) === String(currentVariantId));
                const parsedDetails = JSON.parse(details);
                if (variantIndex > -1) {
                    cachedVariantsForCurrentMaster[variantIndex].variant_type = title;
                    cachedVariantsForCurrentMaster[variantIndex].variant_details = details;
                    cachedVariantsForCurrentMaster[variantIndex].variant_details_parsed = parsedDetails;
                }
                 // Update currentOpenVariant if it's the one being edited
                if (currentOpenVariant && String(currentOpenVariant.id) === String(currentVariantId)) {
                    currentOpenVariant.variant_type = title;
                    currentOpenVariant.variant_details = details;
                    currentOpenVariant.variant_details_parsed = parsedDetails;
                }

                updateVariantThumbnailInStrip(currentVariantId, parsedDetails);
                const $variantBox = $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`);
                if ($variantBox.length) {
                    $variantBox.data('variantData', cachedVariantsForCurrentMaster[variantIndex]); // Update stored data
                    $variantBox.data('variant-title', title.replace(/"/g, "&quot;")); // Legacy, for safety
                    $variantBox.find('.uie-variant-caption').text(title);
                }


                const updatedVariantDataForCallback = {
                    id: currentVariantId, variant_id: currentVariantId,
                    media_asset_id: currentOpenMasterAsset.id,
                    variant_type: title, variant_details: details,
                    variant_details_parsed: parsedDetails,
                    image_url: currentOpenMasterAsset.image_url,
                    preview_image_url: getFinalProcessedImageDataUrl() || getPreviewUrlForAsset(currentOpenMasterAsset, parsedDetails)
                };
                if (typeof onSaveCallbackForContext === 'function') {
                    onSaveCallbackForContext(currentOpenMasterAsset, updatedVariantDataForCallback);
                }
            } else {
                showNotification('Error updating variant: ' + (response.error || 'Failed.'), 'error');
            }
        },
        error: (jqXHR, ts) => showNotification('AJAX Error updating variant: ' + ts, 'error')
    });
  };

  const handleSaveAsNewVariantFromExisting = () => { // Forking
    if (isEditingMaster || !currentVariantId || !cropper || !cropper.ready || !currentOpenMasterAsset || !currentOpenMasterAsset.id) {
         showNotification("Please select an existing variant to fork from.", "info"); return;
    }
    const cropData = cropper.getData(true);
    const filters = getCurrentUserAdjustedFiltersObject();
    const title = ($uieTitleInput.val() || "Forked Variant") + " (copy)";
    const caption = $uieCaptionInput.val();
    const altText = $uieAltTextInput.val();
    const details = JSON.stringify({ crop: cropData, filters, caption, altText });

    $.ajax({
        url: 'ajax/saveMediaVariant.php', type: 'POST', // Same endpoint as new variant
        data: { media_asset_id: currentOpenMasterAsset.id, variant_type: title, variant_details: details },
        dataType: 'json',
        success: function(response) {
            if (response.success && response.variant_id) {
                showNotification(`New Variant "${title}" (ID: ${response.variant_id}) forked and saved!`, 'success');
                loadAndDisplayVariants(currentOpenMasterAsset.id); // Refresh strip

                // currentVariantId = response.variant_id; // Make the new fork active
                // $uieTitleInput.val(title);
                // updateActionButtons(); // Should reflect that we are still editing a variant (the new one)
                // setTimeout(() => {
                //    $('.uie-variant-box').removeClass('active-variant');
                //    $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
                // }, 100);


                const newForkedVariantDataForCallback = {
                    id: response.variant_id, variant_id: response.variant_id,
                    media_asset_id: currentOpenMasterAsset.id,
                    variant_type: title, variant_details: details,
                    variant_details_parsed: JSON.parse(details),
                    image_url: currentOpenMasterAsset.image_url,
                    preview_image_url: getFinalProcessedImageDataUrl() || getPreviewUrlForAsset(currentOpenMasterAsset, JSON.parse(details))
                };
                if (typeof onSaveCallbackForContext === 'function') {
                    onSaveCallbackForContext(currentOpenMasterAsset, newForkedVariantDataForCallback);
                }
                 // Make the new fork active for editing
                const newlyForkedVariant = cachedVariantsForCurrentMaster.find(v => String(v.id) === String(response.variant_id));
                if (newlyForkedVariant) {
                    applyVariantStateToEditor(response.variant_id, newlyForkedVariant, false);
                } else {
                    applyVariantStateToEditor(response.variant_id, newForkedVariantDataForCallback, false);
                }

            } else {
                showNotification('Error forking variant: ' + (response.error || 'Failed.'), 'error');
            }
        },
        error: (jqXHR, ts) => showNotification('AJAX Error forking variant: ' + ts, 'error')
    });
  };

  const handleSaveAsNewImage = () => { // Virtual Master
    if (!isCurrentMasterPhysical) {
        showNotification("'Save as New Image' is only available when the current master image is a physical asset.", "warning"); return;
    }
    if (!cropper || !cropper.ready) {
        showNotification("Editor not ready to save new image.", "error"); return;
    }
    const cropData = cropper.getData(true);
    const filters = getCurrentUserAdjustedFiltersObject();
    const title = $uieTitleInput.val();
    const caption = $uieCaptionInput.val();
    const altText = $uieAltTextInput.val();
    const sourceUrlForNewVM = $uieSourceUrlInput.val(); // These should be from original master if not changed, or current inputs
    const attributionForNewVM = $uieAttributionInput.val();

    $.ajax({
        url: 'ajax/saveNewImage.php', type: 'POST',
        data: {
            source_media_asset_id: currentPhysicalSourceAssetId, // The physical asset ID this virtual master is based on
            current_crop_json: JSON.stringify(cropData),
            current_filters_json: JSON.stringify(filters),
            new_admin_title: title, new_public_caption: caption, new_alt_text: altText,
            new_source_url: sourceUrlForNewVM, new_attribution: attributionForNewVM
        },
        dataType: 'json',
        success: function(response) {
            if (response.success && response.media && response.media.id) {
                showNotification('New Virtual Master Image (ID: ' + response.media.id + ') created!', 'success');

                // The UIE will reload with this new virtual master.
                // The onSaveCallbackForContext for the *original* calling context (before this new master was made)
                // should receive this new master.
                if (typeof onSaveCallbackForContext === 'function') {
                    onSaveCallbackForContext(response.media, null); // Pass back the new master
                }

                // Re-open the editor with the new virtual master.
                // Pass the *original* save/close callbacks and editor options.
                // The old onSaveCallbackForContext has been called. For the *new* editor session,
                // we need to ensure it's set up correctly.
                // Let's capture them before they might be nulled by a potential closeEditor call path.
                const originalSaveCb = onSaveCallbackForContext;
                const originalClosedCb = onEditorClosedCallback;
                const originalOptions = currentEditorOptions;

                // Important: The openEditor call will set its own onSaveCallbackForContext.
                // We are passing the *original* one here to the openEditor call,
                // which will then assign it to its internal onSaveCallbackForContext.
                openEditor(response.media.image_url, response.media, originalSaveCb, originalClosedCb, originalOptions);

            } else {
                showNotification('Error creating new virtual master: ' + (response.error || 'Unknown'), 'error');
            }
        },
        error: (jqXHR, ts) => showNotification('AJAX error creating new virtual master: ' + ts, 'error')
    });
  };

  // --- NEW: CONTEXTUAL "USE FOR..." BUTTON HANDLER ---
  const handleContextualUseButtonClick = () => {
    if (!currentOpenMasterAsset || !currentOpenMasterAsset.id) { 
        showNotification("Error: No master asset is currently open for this action.", "error"); 
        return; 
    }
    if (!cropper || !cropper.ready) { 
        showNotification("Editor is not ready. Please wait for the image to load.", "error"); 
        return; 
    }

    console.log("[UIE] Contextual Use button clicked. Context:", currentEditorOptions.context);

    const cropData = cropper.getData(true); // Get precise, rounded crop data
    const filters = getCurrentUserAdjustedFiltersObject(); // Get current filter slider values
    
    // Capture metadata from UIE fields at the moment of click
    const uieAdminTitle = $uieTitleInput.val().trim();
    const uieCaption = $uieCaptionInput.val().trim();
    const uieAltText = $uieAltTextInput.val().trim();

    let variantType;
    // Compare UIE title with the title of the asset *as it was when UIE opened*
    // currentUIEMetadataOriginal.adminTitle holds the title that was in the UIE title field when it opened (master or variant)
    const originalTitleForComparison = currentUIEMetadataOriginal.adminTitle || 
                                     (isEditingMaster ? currentMediaAssetAdminTitleOriginal : (currentOpenVariant ? currentOpenVariant.variant_type : currentMediaAssetAdminTitleOriginal));


    if (uieAdminTitle && uieAdminTitle !== originalTitleForComparison) {
        // User has actively changed the title in UIE, use that as the base.
        variantType = `${uieAdminTitle} - ${currentEditorOptions.context || 'Applied'}`;
    } else { 
        // Title wasn't changed by user in this session, or is same as original; auto-generate using original master's title as base.
        variantType = `${currentMediaAssetAdminTitleOriginal} - ${currentEditorOptions.context || 'Contextual Variant'}`;
    }
    // Ensure variant title is not excessively long
    if (variantType.length > 250) variantType = variantType.substring(0, 245) + "...";


    const variantDetails = JSON.stringify({ 
        crop: cropData, 
        filters: filters, 
        caption: uieCaption, // Save the current UIE caption input value
        altText: uieAltText    // Save the current UIE alt text input value
    });

    showNotification(`Saving as variant: "${variantType}"...`, "info");
    $.ajax({
        url: 'ajax/saveMediaVariant.php', type: 'POST',
        data: { 
            media_asset_id: currentOpenMasterAsset.id, // Variant is always of the currentOpenMasterAsset
            variant_type: variantType, 
            variant_details: variantDetails 
        },
        dataType: 'json',
        success: function(response) {
          if (response.success && response.variant_id) {
            showNotification(`Variant "${variantType}" (ID: ${response.variant_id}) saved.`, 'success');
            
            const newVariantData = {
                id: response.variant_id, 
                variant_id: response.variant_id, 
                media_asset_id: currentOpenMasterAsset.id,
                variant_type: variantType, 
                variant_details: variantDetails, // Stringified JSON
                variant_details_parsed: JSON.parse(variantDetails), // Parsed for immediate use
                image_url: currentOpenMasterAsset.image_url, // Physical URL is master's
                // Attempt to generate a preview for the callback
                preview_image_url: getFinalProcessedImageDataUrl() || getPreviewUrlForAsset(currentOpenMasterAsset, JSON.parse(variantDetails))
            };
            
            if (typeof onSaveCallbackForContext === 'function') {
                onSaveCallbackForContext(currentOpenMasterAsset, newVariantData);
            }
            closeEditor(); // Close UIE after this specific contextual action
          } else { 
            showNotification('Error saving contextual variant: ' + (response.error || 'Failed.'), 'error'); 
          }
        }, 
        error: (jqXHR, ts) => showNotification('AJAX Error saving contextual variant: ' + ts, 'error')
    });
  };


  const bindStaticEvents = () => {
    // Close button (delegated to document as overlay might be recreated)
    $(document).off('click.uieClose').on('click.uieClose', '.uie-close-button', () => { closeEditor(); });

    // Source thumbnail click (delegated to document as it's within overlay)
    // No, this should be direct if $uieSourceThumbnailBox is cached and stable after ensureOverlayExists
    if (!$uieSourceThumbnailBox || !$uieSourceThumbnailBox.length) cacheSelectors();
    $uieSourceThumbnailBox.off('click.uieSourceThumb').on('click.uieSourceThumb', function() {
        resetEditorToMasterState(true); // true to apply defaults (which means neutral filters for physical master)
        showNotification("Editing master/source image.", "info");
    });

    // Reset icons and buttons (delegated as they are part of static HTML structure within overlay)
    $(document).off('click.uieReset').on('click.uieReset', '.uie-reset-icon-container, .uie-reset-btn', async function() {
        const resetTarget = $(this).data('reset-for');
        if (!resetTarget) return;
        if (!cropper && (resetTarget !== 'filters')) { showNotification("Editor not ready for reset.", "warning"); return; }
        if ((resetTarget !== 'filters') && (!cropper || !cropper.ready)) { showNotification("Editor (Cropper) not ready for reset action.", "warning"); return; }

        let requiresThumbnailUpdate = false;

        switch (resetTarget) {
            case "zoom": if (cropper && cropper.ready) { cropper.zoomTo(initialZoomRatio > 0 ? initialZoomRatio : 1); $zoomSlider.val(0); requiresThumbnailUpdate = true;} break;
            case "brightness": $brightnessSlider.val(100).trigger('input').trigger('change'); break;
            case "contrast":   $contrastSlider.val(100).trigger('input').trigger('change'); break;
            case "saturation": $saturationSlider.val(100).trigger('input').trigger('change'); break;
            case "hue":        $hueSlider.val(0).trigger('input').trigger('change'); break;
            case "crop": case "cropzoom":
                if (cropper && cropper.ready) {
                    cropper.reset(); // Resets crop box to initial state relative to canvas
                    // Then zoom to initial fit and center
                    if (initialZoomRatio > 0 && initialZoomRatio !== Infinity ) { cropper.zoomTo(initialZoomRatio); }
                    else { // Recalculate fit zoom if initialZoomRatio is invalid
                        const container = cropper.getContainerData(); const imgData = cropper.getImageData(); let fitZoomCalc = 1.0;
                        if (imgData.naturalWidth > 0 && imgData.naturalHeight > 0 && container.width > 0 && container.height > 0) {
                             fitZoomCalc = Math.min(container.width / imgData.naturalWidth, container.height / imgData.naturalHeight);
                        }
                        cropper.zoomTo(fitZoomCalc > 0 ? fitZoomCalc : 1);
                    }
                    const container = cropper.getContainerData(); const canvasDataAfterZoom = cropper.getCanvasData();
                    if (canvasDataAfterZoom.width > 0 && canvasDataAfterZoom.height > 0) {
                        cropper.setCanvasData({ left: (container.width - canvasDataAfterZoom.width) / 2, top: (container.height - canvasDataAfterZoom.height) / 2 });
                    }
                    // After resetting canvas and zoom, set crop box to fill the canvas
                    setTimeout(() => { // Allow cropper to settle
                        if (!cropper || !cropper.ready) return;
                        const finalCanvasDataForCropBox = cropper.getCanvasData();
                        if (finalCanvasDataForCropBox.width > 0 && finalCanvasDataForCropBox.height > 0) {
                            cropper.setCropBoxData({
                                left: finalCanvasDataForCropBox.left, top: finalCanvasDataForCropBox.top,
                                width: finalCanvasDataForCropBox.width, height: finalCanvasDataForCropBox.height
                            });
                        }
                        updateDisplayedDimensions();
                        if (debouncedUpdateThumbnails) debouncedUpdateThumbnails();
                    }, 50); // Increased delay slightly

                    $zoomSlider.val(0); isAspectRatioLocked = false; currentLockedAspectRatio = NaN;
                    updateAspectRatioLockButton(); if(cropper.ready) cropper.setAspectRatio(NaN);
                    requiresThumbnailUpdate = true;

                    if (resetTarget === "crop") { // Full reset also resets filters
                        $brightnessSlider.val(100).trigger('input'); $contrastSlider.val(100).trigger('input');
                        $saturationSlider.val(100).trigger('input'); $hueSlider.val(0).trigger('input').trigger('change');
                        showNotification("Crop, Zoom & Filters reset.", "info");
                    } else { // cropzoom only
                        showNotification("Crop & Zoom reset.", "info");
                        if (debouncedUpdateThumbnails) debouncedUpdateThumbnails(); // Explicit update if not via filter change
                    }
                }
                break;
            case "position":
                if (cropper && cropper.ready) {
                    const cd = cropper.getContainerData(); const canvasD = cropper.getCanvasData();
                    if(cd && canvasD && canvasD.width > 0 && canvasD.height > 0 ) {
                        cropper.setCanvasData({ left: (cd.width - canvasD.width) / 2, top: (cd.height - canvasD.height) / 2 });
                        requiresThumbnailUpdate = true;
                    }
                }
                break;
            case "filters":
                $brightnessSlider.val(100).trigger('input'); $contrastSlider.val(100).trigger('input');
                $saturationSlider.val(100).trigger('input'); $hueSlider.val(0).trigger('input').trigger('change'); // Last one triggers full update for thumbnails
                showNotification("Filters cleared.", "info");
                break;
        }
        if (requiresThumbnailUpdate && resetTarget !== "crop" && resetTarget !== "filters" && debouncedUpdateThumbnails) {
             debouncedUpdateThumbnails();
        }
    });

    // Aspect lock button
    if (!$aspectLockBtn || !$aspectLockBtn.length) cacheSelectors();
    $aspectLockBtn.off('click.uieAspectLock').on('click.uieAspectLock', function() {
        if (!cropper || !cropper.ready) return;
        isAspectRatioLocked = !isAspectRatioLocked;
        if (isAspectRatioLocked) {
            const cropBoxData = cropper.getCropBoxData();
            if (cropBoxData.width > 0 && cropBoxData.height > 0) { currentLockedAspectRatio = cropBoxData.width / cropBoxData.height; }
            else { // Fallback to image aspect ratio if crop box is zero (e.g. right after reset)
                 const imgData = cropper.getImageData();
                 if (imgData.naturalWidth > 0 && imgData.naturalHeight > 0) {
                    currentLockedAspectRatio = imgData.naturalWidth / imgData.naturalHeight;
                 } else { currentLockedAspectRatio = NaN;} // Cannot determine
            }

            if (!isNaN(currentLockedAspectRatio) && currentLockedAspectRatio > 0) {
                 cropper.setAspectRatio(currentLockedAspectRatio);
            } else { // Could not determine a valid aspect ratio
                 isAspectRatioLocked = false; // Revert lock state
                 currentLockedAspectRatio = NaN;
                 cropper.setAspectRatio(NaN); // Unlock in cropper
                 showNotification("Could not determine aspect ratio to lock.", "warning");
            }
        } else { // Unlocking
            currentLockedAspectRatio = NaN;
            cropper.setAspectRatio(NaN);
        }
        updateAspectRatioLockButton();
    });

    // Sliders (direct binding as they are part of static HTML)
    $('.uie-slider[data-filter]').off('input.filter change.filter').on('input.filter', function() {
        if (cropper && cropper.ready) { applyCssFiltersToImage(getCurrentUserAdjustedFiltersObject()); }
    }).on('change.filter', function() { if (debouncedUpdateThumbnails) debouncedUpdateThumbnails(); });

    $zoomSlider.off('input.zoom change.zoom').on('input.zoom', function() {
        if (cropper && cropper.ready && initialZoomRatio !== 0) {
            let sliderValue = parseFloat($(this).val()); let zoomFactor = 1 + (sliderValue / 100.0);
            let targetAbsoluteZoom = initialZoomRatio * zoomFactor;
            const MIN_CROPPER_ZOOM = 0.001; const MAX_CROPPER_ZOOM = 20; // Adjusted MAX for sanity
            targetAbsoluteZoom = Math.max(MIN_CROPPER_ZOOM, Math.min(targetAbsoluteZoom, MAX_CROPPER_ZOOM));
            if (targetAbsoluteZoom > 0.0001 && targetAbsoluteZoom < 100) { cropper.zoomTo(targetAbsoluteZoom); }
        } else if (cropper && cropper.ready && initialZoomRatio === 0 ) { // Should not happen if initZoomRatio always set > 0
            let sliderValue = parseFloat($(this).val()); let newAbsoluteZoomLevel = ((sliderValue / 100) + 1) * 0.1; // Default base zoom
            if (newAbsoluteZoomLevel > 0) { cropper.zoomTo(newAbsoluteZoomLevel); }
        }
    }).on('change.zoom', function() { if (debouncedUpdateThumbnails) debouncedUpdateThumbnails(); });

    // --- Action Button Bindings (v2.2.28) ---
    if (!$actionsPanelContent || !$actionsPanelContent.length) {
        cacheSelectors();
    }
    
    // Remove PREVIOUSLY bound standard action buttons to prevent duplicates. Contextual button is handled by openEditor.
    $actionsPanelContent.find('.uie-action-button:not(.uie-contextual-use-button)').remove(); 

    // Add Standard Action Buttons
    const buttons = [
        {name: 'SaveMasterDetails', class: 'uie-save-master-details-button', text: 'Save Master Details', action: handleSaveMasterDetails, style: 'display:none;'},
        {name: 'SaveAsVariant', class: 'uie-save-as-variant-button', text: 'Save as Variant', action: handleSaveAsVariant, style: 'display:block;'}, // Typically visible for master
        {name: 'UpdateVariant', class: 'uie-update-variant-button', text: 'Update Variant Details', action: handleUpdateVariant, style: 'display:none;'},
        {name: 'SaveAsNewVariant', class: 'uie-save-as-new-variant-button', text: 'Save as New Variant (Fork)', action: handleSaveAsNewVariantFromExisting, style: 'display:none;'},
        // Save as New Image button is conditional based on isCurrentMasterPhysical
    ];

    if (isCurrentMasterPhysical) { // Only add "Save as New Image" if master is physical
        buttons.push({
            name: 'SaveAsNewImage',
            class: 'uie-save-as-new-image-button',
            text: 'Save as New Image (VM)',
            action: handleSaveAsNewImage,
            style: 'display:block;' // Default to show if master is physical
        });
    }

    buttons.forEach(btnInfo => {
        const $btn = $(`<button type="button" class="uie-action-button ${btnInfo.class}">${btnInfo.text}</button>`);
        if (btnInfo.style) $btn.attr('style', btnInfo.style);
        // Ensure event handlers are bound correctly, prevent multiple bindings on the $btn instance
        $btn.off('click.uieaction').on('click.uieaction', btnInfo.action); 
        $actionsPanelContent.append($btn);
    });
    // updateActionButtons() will be called by openEditor/resetEditorToMasterState/applyVariantStateToEditor
    // to set the correct final visibility of these buttons.
  };


  // --- PUBLIC METHODS ---
  return {
    openEditor,
    closeEditor
    // getFinalProcessedImageDataUrl, // If needed externally for some reason
  };
})();