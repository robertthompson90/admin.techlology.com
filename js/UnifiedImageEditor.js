// UnifiedImageEditor.js – With Virtual Masters, refined variant workflow, preview generation, crop fixes, variant caching, source/attribution fields, and variant preloading.
// Version 2.22.23 (Corrected Preset Thumbnail Generation Base and Event Handling for Updates)

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
  let currentMediaAssetAdminTitle = '';
  let currentMasterPublicCaption = '';
  let currentMasterAltText = '';
  let currentMasterSourceUrl = '';
  let currentMasterAttribution = '';
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

  let onVariantSavedOrUpdatedCallback = null;
  let onEditorClosedCallback = null;

  let cachedVariantsForCurrentMaster = [];
  let variantsInitiallyLoadedForMaster = false;

  let localTargetVariantToPreloadId = null;
  let localTargetVariantToPreloadDetails = null;
  let localTargetVariantToPreloadTitle = null;

  // Cache for frequently accessed jQuery objects
  let $uieOverlay, $uieImage, $cropperViewBoxImage, $uieTitleInput, $uieCaptionInput, $uieAltTextInput,
      $uieSourceUrlInput, $uieAttributionInput, $uieSourceLabel, $uieSourceThumbnailBox,
      $uieVariantScroll, $uieFilterPresetsScroll, $uieCropPresetsScroll,
      $brightnessSlider, $contrastSlider, $saturationSlider, $hueSlider, $zoomSlider,
      $currentDimsSpan, $aspectLockBtn, $tagInputField, $selectedTagsContainer,
      $filterPresetsLoading, $cropPresetsLoading, $variantsLoading;


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
            if (variantSpecificFilters) stage1Ctx.filter = getCssFilterString(variantSpecificFilters);
            resolve(stage1Canvas);
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
            effectiveCropperSourceDimensions = { width: canvas.width, height: canvas.height };
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

        effectiveCropperSourceDimensions = { width: canvas.width, height: canvas.height };
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
                  <button class="uie-action-button uie-save-master-details-button" style="display:none;">Save Master Details</button>
                  <button class="uie-action-button uie-save-as-variant-button">Save as Variant</button>
                  <button class="uie-action-button uie-update-variant-button" style="display:none;">Update Variant Details</button>
                  <button class="uie-action-button uie-save-as-new-variant-button" style="display:none;">Save as New Variant</button>
                  <button class="uie-action-button uie-save-as-new-image-button">Save as New Image</button>
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
      bindStaticEvents();
    } else {
        cacheSelectors(); // Ensure selectors are cached if overlay already exists
    }
  };

  const updateActionButtons = () => {
      $('.uie-save-master-details-button, .uie-save-as-variant-button, .uie-update-variant-button, .uie-save-as-new-variant-button, .uie-save-as-new-image-button').hide();

      const $saveNewImageBtn = $('.uie-save-as-new-image-button');
      if (isEditingMaster) {
          $('.uie-save-master-details-button').show();
          $('.uie-save-as-variant-button').show();
          if (isCurrentMasterPhysical) {
            $saveNewImageBtn.show();
          }
          $uieSourceLabel.hide().empty();
          $uieSourceThumbnailBox.addClass('active-variant');
          $('.uie-variant-box').removeClass('active-variant');
      } else {
          $('.uie-update-variant-button').show().text(`Update Variant Details`);
          $('.uie-save-as-new-variant-button').show();
          if (isCurrentMasterPhysical) {
            $saveNewImageBtn.show();
          }
          $uieSourceLabel.show().html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);
          $uieSourceThumbnailBox.removeClass('active-variant');
      }
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
        if (!$filterPresetsLoading.length) cacheSelectors(); // Ensure cached if not already
        $filterPresetsLoading.show();
        $cropPresetsLoading.show();

        $.ajax({
            url: 'ajax/getMediaPresets.php',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                presetsData = response;
                setupPresetSorting();
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

 // ***** CORRECTED LOGIC FOR PRESET THUMBNAIL GENERATION (to be placed in your v2.2.23) *****
  const generatePresetThumbnail = (preset) => {
    return new Promise((resolve, reject) => {
        if (!cropper || !cropper.ready || !activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
            console.warn("generatePresetThumbnail: Cropper or base image not ready for preset:", preset ? preset.name : 'N/A');
            // Create a minimal placeholder if prerequisites aren't met
            const errorCanvas = document.createElement('canvas'); errorCanvas.width=1; errorCanvas.height=1;
            return resolve(generateScaledThumbnail(errorCanvas).toDataURL());
        }

        let baseCanvasFromCropperView; // This will hold the current crop/zoom/pan
        try {
            // Get the canvas representing the current visual state within the crop box.
            // This canvas already reflects the current crop, zoom, and pan of the source image.
            baseCanvasFromCropperView = cropper.getCroppedCanvas({ fillColor: '#fff' }); // Added fillColor for safety with transparent images

            if (!baseCanvasFromCropperView || baseCanvasFromCropperView.width === 0 || baseCanvasFromCropperView.height === 0) {
                console.warn("generatePresetThumbnail: cropper.getCroppedCanvas() returned invalid canvas for preset:", preset.name, ". Using fallback.");
                // Fallback for safety, though ideally getCroppedCanvas should work if cropper is ready.
                baseCanvasFromCropperView = document.createElement('canvas');
                baseCanvasFromCropperView.width = 80; // Default thumbnail width
                baseCanvasFromCropperView.height = 80; // Default thumbnail height
                const fbCtx = baseCanvasFromCropperView.getContext('2d');
                fbCtx.fillStyle = '#ddd'; fbCtx.fillRect(0,0,80,80); // Simple placeholder
            }
        } catch (e) {
            console.error("generatePresetThumbnail: Error getting baseCanvasFromCropperView for preset:", preset.name, e);
            const errorCanvas = document.createElement('canvas'); errorCanvas.width=1; errorCanvas.height=1;
            return resolve(generateScaledThumbnail(errorCanvas).toDataURL());
        }

        // This is the canvas that will be processed by processPresetApplication
        let sourceCanvasForPresetProcessing;

        if (preset.type === 'filter') {
            // For FILTER presets, their own filters are applied directly to the
            // base structural view (baseCanvasFromCropperView which contains crop/zoom/pan),
            // IGNORING any filters currently active on the main image via the sliders.
            sourceCanvasForPresetProcessing = baseCanvasFromCropperView;
        } else if (preset.type === 'crop') {
            // For CROP presets, they operate on the image as it *currently looks with slider filters*.
            // So, create a version of baseCanvasFromCropperView that HAS the current slider filters applied.
            const sliderFilteredBase = document.createElement('canvas');
            sliderFilteredBase.width = baseCanvasFromCropperView.width;
            sliderFilteredBase.height = baseCanvasFromCropperView.height;
            const sfCtx = sliderFilteredBase.getContext('2d');
            sfCtx.filter = getCssFilterString(getCurrentUserAdjustedFiltersObject()); // Apply current slider filters
            sfCtx.drawImage(baseCanvasFromCropperView, 0, 0);
            sourceCanvasForPresetProcessing = sliderFilteredBase;
        } else {
            console.error("Unknown preset type for thumbnail generation:", preset.type);
            const errorCanvas = document.createElement('canvas'); errorCanvas.width=1; errorCanvas.height=1; // Minimal canvas
            return resolve(generateScaledThumbnail(errorCanvas).toDataURL());
        }
        
        // Now, processPresetApplication will apply the specific preset's logic
        // to the correctly prepared sourceCanvasForPresetProcessing.
        processPresetApplication(preset, sourceCanvasForPresetProcessing, resolve, reject);
    });
  };
  // ***** END OF CORRECTED LOGIC FOR PRESET THUMBNAIL GENERATION *****


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

              const sourceW = sourceCanvasForPreset.width; // This is already slider-filtered
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
              // Draw from the sliderFilteredBaseCanvas, which is sourceCanvasForPreset
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
    $uieFilterPresetsScroll.add($uieCropPresetsScroll).sortable({ // Use cached selectors
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
    $(document).off('click.uiePreset').on('click.uiePreset', '.uie-preset-box', function() {
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
            $hueSlider.trigger('input').trigger('change'); // Last one triggers change for debouncedUpdateThumbnails

        } else if (presetType === 'crop') {
            if (presetDetails.aspect_ratio) {
                const parts = presetDetails.aspect_ratio.split(':');
                if (parts.length === 2) {
                    const newAspectRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
                    if (!isNaN(newAspectRatio) && newAspectRatio > 0) {
                        cropper.setAspectRatio(newAspectRatio);
                        const canvasData = cropper.getCanvasData();
                        let newCropBoxWidth, newCropBoxHeight;
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
                        if (debouncedUpdateThumbnails) debouncedUpdateThumbnails(); // Explicit call
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
            if (cropper.element) { // Check if cropper and its element exist
                cropper.element.removeEventListener('zoom', debouncedUpdateThumbnails);
            }
            cropper.destroy();
        } catch (e) { console.warn("Error destroying previous cropper instance:", e); }
        cropper = null;
    }

    $(imageElementForCropperDOM).attr('src', imageSrcForCropper);
    if (!$uieImage || !$uieImage.length) $uieImage = $('#uie-image');


    const tempImg = new Image();
    tempImg.onload = () => {
        effectiveCropperSourceDimensions = { width: tempImg.width, height: tempImg.height };

        if (effectiveCropperSourceDimensions.width === 0 || effectiveCropperSourceDimensions.height === 0) {
            console.error("Cannot initialize Cropper: effective source image has zero dimensions.", imageSrcForCropper);
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
                updateDisplayedDimensions(); // General update for all crop events
                 // If not a user event, it's programmatic. Thumbnails might need update.
                if (!event.detail.originalEvent && cropper && cropper.ready) {
                   if (debouncedUpdateThumbnails) debouncedUpdateThumbnails();
                }
            },
            ready: function() {
                if (!cropper) { console.warn("Cropper instance became null during ready callback."); return; }

                $cropperViewBoxImage = $(cropper.cropper).find('.cropper-view-box img');
                if (this && this.element) {
                    this.element.removeEventListener('zoom', debouncedUpdateThumbnails);
                    this.element.addEventListener('zoom', debouncedUpdateThumbnails);
                }

                const container = cropper.getContainerData();
                const imageW = effectiveCropperSourceDimensions.width;
                const imageH = effectiveCropperSourceDimensions.height;
                let fitZoom = 1.0;

                if (imageW > 0 && imageH > 0 && container.width > 0 && container.height > 0) {
                    fitZoom = Math.min(container.width / imageW, container.height / imageH);
                }

                cropper.zoomTo(fitZoom);

                const actualCanvasAfterInitialZoom = cropper.getCanvasData();
                if (imageW > 0) { initialZoomRatio = actualCanvasAfterInitialZoom.width / imageW; }
                else { initialZoomRatio = fitZoom; }

                cropper.setCanvasData({
                    left: (container.width - actualCanvasAfterInitialZoom.width) / 2,
                    top: (container.height - actualCanvasAfterInitialZoom.height) / 2,
                    width: actualCanvasAfterInitialZoom.width,
                    height: actualCanvasAfterInitialZoom.height
                });

                const filtersForUI = (initialSettings && initialSettings.filters) ?
                                     initialSettings.filters :
                                     { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

                $brightnessSlider.val(filtersForUI.brightness);
                $contrastSlider.val(filtersForUI.contrast);
                $saturationSlider.val(filtersForUI.saturation);
                $hueSlider.val(filtersForUI.hue);

                applyCssFiltersToImage(filtersForUI);

                if (initialSettings && initialSettings.crop) {
                    cropper.setData(initialSettings.crop);
                } else {
                    if (effectiveCropperSourceDimensions.width > 0 && effectiveCropperSourceDimensions.height > 0) {
                        cropper.setData({ x: 0, y: 0, width: effectiveCropperSourceDimensions.width, height: effectiveCropperSourceDimensions.height });
                    }
                    const canvasForInitialCropBox = cropper.getCanvasData();
                     if (canvasForInitialCropBox.width > 0 && canvasForInitialCropBox.height > 0) {
                        cropper.setCropBoxData({ left: canvasForInitialCropBox.left, top: canvasForInitialCropBox.top, width: canvasForInitialCropBox.width, height: canvasForInitialCropBox.height });
                    }
                }

                $zoomSlider.val(0);
                isAspectRatioLocked = false; currentLockedAspectRatio = NaN;
                updateAspectRatioLockButton();
                updateDisplayedDimensions();
                requestAnimationFrame(pollZoomSlider);

                setTimeout(async () => {
                    if (!cropper || !cropper.ready) return;
                    try {
                        await loadMediaPresets();
                        if (presetsData.length > 0) { await updatePresetThumbnails(); }
                        else { $filterPresetsLoading.hide(); $cropPresetsLoading.hide(); }
                    } catch (presetError) { $filterPresetsLoading.hide(); $cropPresetsLoading.hide(); }

                    if (mergedOptions.refreshVariants || !variantsInitiallyLoadedForMaster) {
                        loadAndDisplayVariants(currentMediaAssetId);
                    } else {
                        if (!isEditingMaster && currentVariantId) {
                            $('.uie-variant-box').removeClass('active-variant');
                            $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
                            $uieSourceThumbnailBox.removeClass('active-variant');
                            $uieSourceLabel.show().html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);
                        } else if (isEditingMaster) {
                            $('.uie-variant-box').removeClass('active-variant');
                            $uieSourceThumbnailBox.addClass('active-variant');
                            $uieSourceLabel.hide().empty();
                        }
                        $variantsLoading.hide();
                    }
                    bindPresetEvents();
                    updateActionButtons();
                }, 0);

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
        console.error("Failed to load image for Cropper initialization:", imageSrcForCropper);
        showNotification("Error: Could not load image into editor.", "error");
        closeEditor();
    };
    tempImg.src = imageSrcForCropper;
  };

  const resetEditorToMasterState = async (applyAssetDefaults = true) => {
    currentVariantId = null;
    isEditingMaster = true;

    $uieTitleInput.val(currentMediaAssetAdminTitle);
    $uieCaptionInput.val(currentMasterPublicCaption);
    $uieAltTextInput.val(currentMasterAltText);
    $uieSourceUrlInput.val(currentMasterSourceUrl);
    $uieAttributionInput.val(currentMasterAttribution);

    if (!isCurrentMasterPhysical) {
      $uieSourceThumbnailBox.addClass('uie-source-is-virtual').attr('title', 'Virtual Master (Source ID: ' + currentPhysicalSourceAssetId + ')');
    } else {
      $uieSourceThumbnailBox.removeClass('uie-source-is-virtual').attr('title', 'Physical Master');
    }

    if (!activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
        showNotification("Cannot reset to master: Base physical image not loaded.", "error"); return;
    }

    let imageSrcForCropperToUse;
    if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
        try { imageSrcForCropperToUse = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters); }
        catch (error) { imageSrcForCropperToUse = currentMediaAssetUrl; effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight }; }
    } else {
        imageSrcForCropperToUse = currentMediaAssetUrl;
        effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
    }

    initializeCropperInstance(imageSrcForCropperToUse, null, { refreshVariants: false });
    $uieSourceThumbnailBox.addClass('active-variant');
    $('.uie-variant-box').removeClass('active-variant');
    updateActionButtons();
  };

  const openEditor = async (physicalImgUrl, assetDataObj, saveCb, closedCb, options = {}) => {
    ensureOverlayExists();

    cachedVariantsForCurrentMaster = [];
    variantsInitiallyLoadedForMaster = false;
    localTargetVariantToPreloadId = options.targetVariantId || null;
    localTargetVariantToPreloadDetails = options.targetVariantDetails || null;
    localTargetVariantToPreloadTitle = options.targetVariantTitle || null;

    currentMediaAssetId = assetDataObj.id;
    currentMediaAssetAdminTitle = assetDataObj.admin_title || assetDataObj.title || `Image ${assetDataObj.id}`;
    currentMasterPublicCaption = assetDataObj.public_caption || assetDataObj.caption || '';
    currentMasterAltText = assetDataObj.alt_text || '';
    currentMasterSourceUrl = assetDataObj.source_url || '';
    currentMasterAttribution = assetDataObj.attribution || '';

    isCurrentMasterPhysical = (!assetDataObj.physical_source_asset_id || assetDataObj.physical_source_asset_id === assetDataObj.id || assetDataObj.physical_source_asset_id === null);
    currentMediaAssetUrl = physicalImgUrl;
    currentPhysicalSourceAssetId = isCurrentMasterPhysical ? assetDataObj.id : assetDataObj.physical_source_asset_id;

    try {
        currentAssetDefaultCrop = (assetDataObj.default_crop && assetDataObj.default_crop !== "null" && assetDataObj.default_crop.trim() !== "") ? JSON.parse(assetDataObj.default_crop) : null;
        currentAssetDefaultFilters = (assetDataObj.filter_state && assetDataObj.filter_state !== "null" && assetDataObj.filter_state.trim() !== "") ? JSON.parse(assetDataObj.filter_state) : null;
    } catch (e) { currentAssetDefaultCrop = null; currentAssetDefaultFilters = null; }

    onVariantSavedOrUpdatedCallback = saveCb;
    onEditorClosedCallback = closedCb;

    uieCurrentMediaAssetIdForTags = assetDataObj.id;
    if (uieCurrentMediaAssetIdForTags && typeof TagSystem !== 'undefined') {
        TagSystem.init({ itemType: 'mediaAsset', itemId: uieCurrentMediaAssetIdForTags, inputSelector: '#uie-tag-input-field', listSelector: '#uie-selected-tags-container', addTagOnBlur: false });
    } else { if (typeof TagSystem !== 'undefined' && TagSystem.setItemContext) TagSystem.setItemContext(null, 'mediaAsset'); }

    $uieSourceThumbnailBox.find('.uie-box-img').attr('src', '').attr('alt', 'Loading source preview...');
    $uieSourceThumbnailBox.find('.uie-box-caption').text(currentMediaAssetAdminTitle);
    $uieVariantScroll.empty().html($variantsLoading.show());
    $uieSourceUrlInput.val(currentMasterSourceUrl);
    $uieAttributionInput.val(currentMasterAttribution);

    const imagePreloader = new Image();
    imagePreloader.crossOrigin = "Anonymous";
    imagePreloader.onload = async function() {
        if (this.naturalWidth === 0 || this.naturalHeight === 0) {
            showNotification("Error: Preloaded physical image data is invalid (zero dimensions).", "error");
            if (typeof onEditorClosedCallback === 'function') onEditorClosedCallback(); return;
        }
        activeBaseImageElement = this;

        if (!isCurrentMasterPhysical) { $uieSourceThumbnailBox.addClass('uie-source-is-virtual').attr('title', 'Virtual Master (Physical Source ID: ' + currentPhysicalSourceAssetId + ')'); }
        else { $uieSourceThumbnailBox.removeClass('uie-source-is-virtual').attr('title', 'Physical Master'); }

        try {
            const masterPreviewCanvas = await generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, null, null);
            if (masterPreviewCanvas.width > 0 && masterPreviewCanvas.height > 0) {
                const scaledThumbCanvas = generateScaledThumbnail(masterPreviewCanvas, 85, 70);
                $uieSourceThumbnailBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL()).attr('alt', 'Source Thumbnail');
            } else { $uieSourceThumbnailBox.find('.uie-box-img').attr('src','').attr('alt', 'Preview Error (Zero Dim)');}
        } catch (thumbError) { $uieSourceThumbnailBox.find('.uie-box-img').attr('src','').attr('alt', 'Preview Error'); }

        let imageSrcToLoadInCropper;
        let initialSettingsForCropper = null;

        if (localTargetVariantToPreloadId && localTargetVariantToPreloadDetails) {
            isEditingMaster = false; currentVariantId = localTargetVariantToPreloadId;
            if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
                imageSrcToLoadInCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
            } else { imageSrcToLoadInCropper = currentMediaAssetUrl; effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight }; }
            initialSettingsForCropper = { crop: localTargetVariantToPreloadDetails.crop, filters: localTargetVariantToPreloadDetails.filters };
            $uieTitleInput.val(localTargetVariantToPreloadTitle || `Variant ${currentVariantId}`);
            $uieCaptionInput.val(localTargetVariantToPreloadDetails.caption || '');
            $uieAltTextInput.val(localTargetVariantToPreloadDetails.altText || '');
        } else {
            isEditingMaster = true; currentVariantId = null;
            if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
                imageSrcToLoadInCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
            } else { imageSrcToLoadInCropper = currentMediaAssetUrl; effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight }; }
            $uieTitleInput.val(currentMediaAssetAdminTitle);
            $uieCaptionInput.val(currentMasterPublicCaption);
            $uieAltTextInput.val(currentMasterAltText);
        }

        $uieOverlay.removeClass('hidden').fadeIn(300, () => { initializeCropperInstance(imageSrcToLoadInCropper, initialSettingsForCropper, { refreshVariants: true }); });
    };
    imagePreloader.onerror = function() {
        activeBaseImageElement = null; $uieSourceThumbnailBox.find('.uie-box-img').attr('src','').attr('alt', 'Load Error'); $variantsLoading.hide();
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

    $uieOverlay.fadeOut(300, function() { $(this).addClass('hidden'); });
    uieCurrentMediaAssetIdForTags = null;
    if (typeof TagSystem !== 'undefined' && TagSystem.setItemContext) TagSystem.setItemContext(null, 'mediaAsset');
    if (typeof onEditorClosedCallback === 'function') { onEditorClosedCallback(); }
  };

  const getFinalProcessedImageDataUrl = () => {
    if (!cropper || !cropper.ready) { showNotification("Cropper not ready.", "error"); return null; }
    let croppedCanvas;
    try { croppedCanvas = cropper.getCroppedCanvas(); }
    catch (e) { showNotification("Error getting cropped canvas: " + e.message, "error"); return null; }
    if (!croppedCanvas || croppedCanvas.width === 0 || croppedCanvas.height === 0) { showNotification("Could not get valid cropped canvas data (zero dimensions).", "error"); return null; }

    const userAdjustedFilters = getCurrentUserAdjustedFiltersObject();
    const filterString = getCssFilterString(userAdjustedFilters);
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = croppedCanvas.width; finalCanvas.height = croppedCanvas.height;
    const ctx = finalCanvas.getContext('2d');
    if (filterString !== "brightness(100%) contrast(100%) saturate(100%) hue-rotate(0deg)") { ctx.filter = filterString; }
    ctx.drawImage(croppedCanvas, 0, 0);
    return finalCanvas.toDataURL('image/png');
  };

  const updateVariantThumbnailInStrip = (variantId, variantDetails) => {
    const $variantBox = $(`.uie-variant-box[data-variant-id="${variantId}"]`);
    if ($variantBox.length && activeBaseImageElement && activeBaseImageElement.complete && activeBaseImageElement.naturalWidth > 0) {
        generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, variantDetails.crop, variantDetails.filters)
            .then(previewCanvas => generateScaledThumbnail(previewCanvas, 85, 70))
            .then(scaledThumbCanvas => { $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL()); })
            .catch(err => { $variantBox.find('.image-container').empty().append('<span style="color:red;font-size:9px;">Preview Error</span>'); });
    }
  };

  const loadAndDisplayVariants = (mediaAssetIdToLoad) => {
    $variantsLoading.show();
    $uieVariantScroll.empty().append($variantsLoading);

    if (!mediaAssetIdToLoad) { $uieVariantScroll.empty().append('<p>No image selected.</p>'); $variantsLoading.hide(); return; }
    if (!activeBaseImageElement || !activeBaseImageElement.complete || !activeBaseImageElement.naturalWidth) {
        $uieVariantScroll.empty().append('<p>Base image not ready for variant previews.</p>'); $variantsLoading.hide(); return;
    }

    $.ajax({
      url: 'ajax/getMediaVariants.php', type: 'GET', data: { media_asset_id: mediaAssetIdToLoad }, dataType: 'json',
      success: function(response) {
        $uieVariantScroll.empty(); cachedVariantsForCurrentMaster = [];
        if (response.success && response.variants && response.variants.length > 0) {
          cachedVariantsForCurrentMaster = response.variants;
          cachedVariantsForCurrentMaster.forEach(variant => {
            let variantAdminTitle = variant.variant_type || `Variant ${variant.id}`;
            let variantDetailsParsed;
            try { variantDetailsParsed = JSON.parse(variant.variant_details); }
            catch(e) { variantDetailsParsed = { crop: null, filters: null, caption: '', altText: '' }; }

            const variantBoxHtml = `<div class="uie-variant-box uie-box" data-variant-id="${variant.id}" data-variant-details='${variant.variant_details.replace(/'/g, "&apos;")}' data-variant-title="${variantAdminTitle.replace(/"/g, "&quot;")}">
                                      <div class="image-container"><img class="uie-box-img" src="" alt="${variantAdminTitle}"></div>
                                      <span class="uie-variant-caption uie-box-caption">${variantAdminTitle}</span></div>`;
            const $variantBox = $(variantBoxHtml);
            $uieVariantScroll.append($variantBox);

            generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, variantDetailsParsed.crop, variantDetailsParsed.filters)
            .then(previewCanvas => generateScaledThumbnail(previewCanvas, 85, 70))
            .then(scaledThumbCanvas => { $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL()); })
            .catch(err => { $variantBox.find('.image-container').empty().append('<span style="color:red;font-size:9px;">Preview Error</span>'); });
          });
          bindVariantSelectionEvents();

          if (!isEditingMaster && currentVariantId) {
              $('.uie-variant-box').removeClass('active-variant');
              $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
              $uieSourceThumbnailBox.removeClass('active-variant');
              $uieSourceLabel.show().html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);
          } else if (isEditingMaster) {
              $('.uie-variant-box').removeClass('active-variant');
              $uieSourceThumbnailBox.addClass('active-variant');
              $uieSourceLabel.hide().empty();
          }
        } else if (response.success) { $uieVariantScroll.append('<p>No variants yet.</p>'); }
        else { $uieVariantScroll.append(`<p>Error loading variants: ${response.error || 'Unknown server error'}</p>`); }
        variantsInitiallyLoadedForMaster = true; $variantsLoading.hide();
      },
      error: function(jqXHR, textStatus, errorThrown) { $uieVariantScroll.empty().append('<p>AJAX error loading variants.</p>'); $variantsLoading.hide(); variantsInitiallyLoadedForMaster = true; }
    });
  };

  const applyVariantStateToEditor = async (variantId, variantDetails, variantAdminTitle, isPreload = false) => {
    currentVariantId = variantId; isEditingMaster = false;

    if (!activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) { showNotification("Base physical image not ready to apply variant.", "error"); return; }

    let masterImageSrcForCropper;
    if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
        masterImageSrcForCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
    } else {
        masterImageSrcForCropper = currentMediaAssetUrl;
        if(!effectiveCropperSourceDimensions.width && activeBaseImageElement) { effectiveCropperSourceDimensions = {width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight}; }
    }

    $uieTitleInput.val(variantAdminTitle || `Variant ${variantId}`);
    $uieCaptionInput.val(variantDetails.caption || '');
    $uieAltTextInput.val(variantDetails.altText || '');
    $uieSourceUrlInput.val(currentMasterSourceUrl);
    $uieAttributionInput.val(currentMasterAttribution);
    updateActionButtons();

    $uieSourceThumbnailBox.removeClass('active-variant');
    $('.uie-variant-box').removeClass('active-variant');
    $(`.uie-variant-box[data-variant-id="${variantId}"]`).addClass('active-variant');
    $uieSourceLabel.show().html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);

    initializeCropperInstance(masterImageSrcForCropper, { crop: variantDetails.crop, filters: variantDetails.filters }, { refreshVariants: isPreload });
    showNotification(`Variant ${currentVariantId} loaded for editing.`, "info");
};


  const bindVariantSelectionEvents = () => {
    $uieVariantScroll.off('click.variantBox').on('click.variantBox', '.uie-variant-box', async function() {
      const $this = $(this);
      const clickedVariantId = $this.data('variant-id');
      const selectedVariantData = cachedVariantsForCurrentMaster.find(v => String(v.id) === String(clickedVariantId));

      if (!selectedVariantData) {
          const variantDetailsString = $this.data('variant-details');
          const variantAdminTitleFallback = $this.data('variant-title') || $this.find('.uie-variant-caption').text();
          try {
              const detailsToParse = typeof variantDetailsString === 'string' ? variantDetailsString : JSON.stringify(variantDetailsString);
              const fallbackDetails = JSON.parse(detailsToParse.replace(/&apos;/g, "'"));
              await applyVariantStateToEditor(clickedVariantId, fallbackDetails, variantAdminTitleFallback, false);
          } catch (e) { showNotification("Error loading variant details. Check console.", "error"); }
          return;
      }

      const variantAdminTitle = selectedVariantData.variant_type || `Variant ${selectedVariantData.id}`;
      let variantDetails;
      try { variantDetails = typeof selectedVariantData.variant_details === 'string' ? JSON.parse(selectedVariantData.variant_details.replace(/&apos;/g, "'")) : selectedVariantData.variant_details; }
      catch (e) { showNotification("Error loading variant details. Check console.", "error"); return; }
      await applyVariantStateToEditor(clickedVariantId, variantDetails, variantAdminTitle, false);
    });
  };


  const bindStaticEvents = () => {
    $(document).off('click.uieClose').on('click.uieClose', '.uie-close-button', () => { closeEditor(); });
    $(document).off('click.uieSourceThumb').on('click.uieSourceThumb', '#uie-source-thumbnail-box', function() { resetEditorToMasterState(true); showNotification("Editing master/source image.", "info"); });

    $(document).off('click.uieReset').on('click.uieReset', '.uie-reset-icon-container, .uie-reset-btn', async function() {
        const resetTarget = $(this).data('reset-for');
        if (!resetTarget) return;
        if (!cropper && (resetTarget !== 'filters')) { showNotification("Editor not ready for reset.", "warning"); return; }
        if ((resetTarget !== 'filters') && (!cropper || !cropper.ready)) { showNotification("Editor (Cropper) not ready for reset action.", "warning"); return; }

        let requiresThumbnailUpdate = false;

        switch (resetTarget) {
            case "zoom": if (cropper && cropper.ready) { cropper.zoomTo(initialZoomRatio); $zoomSlider.val(0); requiresThumbnailUpdate = true;} break;
            case "brightness": $brightnessSlider.val(100).trigger('input').trigger('change'); break;
            case "contrast":   $contrastSlider.val(100).trigger('input').trigger('change'); break;
            case "saturation": $saturationSlider.val(100).trigger('input').trigger('change'); break;
            case "hue":        $hueSlider.val(0).trigger('input').trigger('change'); break;
            case "crop": case "cropzoom":
                if (cropper && cropper.ready) {
                    cropper.reset();
                    if (effectiveCropperSourceDimensions.width > 0 && effectiveCropperSourceDimensions.height > 0) {
                        cropper.setData({ x: 0, y: 0, width: effectiveCropperSourceDimensions.width, height: effectiveCropperSourceDimensions.height, rotate: 0, scaleX: 1, scaleY: 1 });
                    }
                    if (initialZoomRatio > 0 && initialZoomRatio !== Infinity ) { cropper.zoomTo(initialZoomRatio); }
                    else {
                        const container = cropper.getContainerData(); const imgData = cropper.getImageData(); let fitZoom = 1.0;
                        if (imgData.naturalWidth > 0 && imgData.naturalHeight > 0 && container.width > 0 && container.height > 0) { fitZoom = Math.min(container.width / imgData.naturalWidth, container.height / imgData.naturalHeight); }
                        cropper.zoomTo(fitZoom);
                    }
                    const container = cropper.getContainerData(); const canvasDataAfterZoom = cropper.getCanvasData();
                    cropper.setCanvasData({ left: (container.width - canvasDataAfterZoom.width) / 2, top: (container.height - canvasDataAfterZoom.height) / 2, width: canvasDataAfterZoom.width, height: canvasDataAfterZoom.height });
                    setTimeout(() => {
                        if (!cropper || !cropper.ready) return;
                        const finalCanvasDataForCropBox = cropper.getCanvasData();
                        if (finalCanvasDataForCropBox.width > 0 && finalCanvasDataForCropBox.height > 0) {
                            cropper.setCropBoxData({ left: finalCanvasDataForCropBox.left, top: finalCanvasDataForCropBox.top, width: finalCanvasDataForCropBox.width, height: finalCanvasDataForCropBox.height });
                        }
                        updateDisplayedDimensions();
                        if (debouncedUpdateThumbnails) debouncedUpdateThumbnails(); // Explicit call after programmatic changes settle
                    }, 10);
                    $zoomSlider.val(0); isAspectRatioLocked = false; currentLockedAspectRatio = NaN;
                    updateAspectRatioLockButton(); if(cropper.ready) cropper.setAspectRatio(NaN);
                    requiresThumbnailUpdate = true;
                    if (resetTarget === "crop") {
                        $brightnessSlider.val(100).trigger('input'); $contrastSlider.val(100).trigger('input');
                        $saturationSlider.val(100).trigger('input'); $hueSlider.val(0).trigger('input').trigger('change'); // Last one triggers full update
                        showNotification("Crop & Filters reset.", "info");
                    } else { showNotification("Crop & Zoom reset.", "info"); if (debouncedUpdateThumbnails) debouncedUpdateThumbnails(); }
                }
                break;
            case "position": if (cropper && cropper.ready) { const cd = cropper.getContainerData(); const canvasD = cropper.getCanvasData(); if(cd && canvasD ) { cropper.setCanvasData({ left: (cd.width - canvasD.width) / 2, top: (cd.height - canvasD.height) / 2 }); requiresThumbnailUpdate = true;}} break;
            case "filters": $brightnessSlider.val(100).trigger('input'); $contrastSlider.val(100).trigger('input'); $saturationSlider.val(100).trigger('input'); $hueSlider.val(0).trigger('input').trigger('change'); showNotification("Filters cleared.", "info"); break;
        }
        if (requiresThumbnailUpdate && resetTarget !== "crop" && debouncedUpdateThumbnails) { // 'crop' (full reset) already calls it via filter change
             debouncedUpdateThumbnails();
        }
    });

    $(document).off('click.uieAspectLock').on('click.uieAspectLock', '.uie-aspect-lock-btn', function() {
        if (!cropper || !cropper.ready) return;
        isAspectRatioLocked = !isAspectRatioLocked;
        if (isAspectRatioLocked) {
            const cropBoxData = cropper.getCropBoxData();
            if (cropBoxData.width > 0 && cropBoxData.height > 0) { currentLockedAspectRatio = cropBoxData.width / cropBoxData.height; }
            else { const imgData = cropper.getImageData(); currentLockedAspectRatio = imgData.naturalWidth / imgData.naturalHeight; }
            if (!isNaN(currentLockedAspectRatio) && currentLockedAspectRatio > 0) { cropper.setAspectRatio(currentLockedAspectRatio); }
            else { isAspectRatioLocked = false; cropper.setAspectRatio(NaN); }
        } else { currentLockedAspectRatio = NaN; cropper.setAspectRatio(NaN); }
        updateAspectRatioLockButton();
    });

    $('.uie-slider[data-filter]').off('input.filter change.filter').on('input.filter', function() {
        if (cropper && cropper.ready) { applyCssFiltersToImage(getCurrentUserAdjustedFiltersObject()); }
    }).on('change.filter', function() { if (debouncedUpdateThumbnails) debouncedUpdateThumbnails(); });

    $zoomSlider.off('input.zoom change.zoom').on('input.zoom', function() {
        if (cropper && cropper.ready && initialZoomRatio !== 0) {
            let sliderValue = parseFloat($(this).val()); let zoomFactor = 1 + (sliderValue / 100.0);
            let targetAbsoluteZoom = initialZoomRatio * zoomFactor;
            const MIN_CROPPER_ZOOM = 0.01; const MAX_CROPPER_ZOOM = 15;
            targetAbsoluteZoom = Math.max(MIN_CROPPER_ZOOM, Math.min(targetAbsoluteZoom, MAX_CROPPER_ZOOM));
            if (targetAbsoluteZoom > 0.001 && targetAbsoluteZoom < 100) { cropper.zoomTo(targetAbsoluteZoom); }
        } else if (cropper && cropper.ready && initialZoomRatio === 0 ) {
            let sliderValue = parseFloat($(this).val()); let newAbsoluteZoomLevel = ((sliderValue / 100) + 1) * 0.1;
            if (newAbsoluteZoomLevel > 0) { cropper.zoomTo(newAbsoluteZoomLevel); }
        }
    }).on('change.zoom', function() { if (debouncedUpdateThumbnails) debouncedUpdateThumbnails(); });

    // --- Save/Update Button Event Handlers ---
    $(document).off('click.uieSaveMasterDetails').on('click.uieSaveMasterDetails', '.uie-save-master-details-button', function() {
        if (!isEditingMaster || !currentMediaAssetId) return;
        const newAdminTitle = $uieTitleInput.val(), newPublicCaption = $uieCaptionInput.val(), newAltText = $uieAltTextInput.val(), newSourceUrl = $uieSourceUrlInput.val(), newAttribution = $uieAttributionInput.val();
        $.ajax({ url: 'ajax/updateMediaAssetDetails.php', type: 'POST', data: { media_asset_id: currentMediaAssetId, admin_title: newAdminTitle, title: newAdminTitle, public_caption: newPublicCaption, alt_text: newAltText, source_url: newSourceUrl, attribution: newAttribution }, dataType: 'json',
            success: function(response) {
                if (response.success) {
                    showNotification('Master asset details updated!', 'success');
                    currentMediaAssetAdminTitle = newAdminTitle; currentMasterPublicCaption = newPublicCaption; currentMasterAltText = newAltText; currentMasterSourceUrl = newSourceUrl; currentMasterAttribution = newAttribution;
                    $uieSourceThumbnailBox.find('.uie-box-caption').text(currentMediaAssetAdminTitle);
                    if ($uieSourceLabel.is(':visible') && !isEditingMaster) { $uieSourceLabel.html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);}
                    if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
                } else { showNotification('Error updating master: ' + (response.error || 'Failed.'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX Error updating master: ' + ts, 'error')
        });
    });

    $(document).off('click.uieSaveAsVariant').on('click.uieSaveAsVariant', '.uie-save-as-variant-button', function() {
        if (!isEditingMaster || !cropper || !cropper.ready || !currentMediaAssetId) { showNotification("Please ensure you are editing the master image to save a new variant from it.", "info"); return; }
        const cropData = cropper.getData(true), filters = getCurrentUserAdjustedFiltersObject(), caption = $uieCaptionInput.val(), altText = $uieAltTextInput.val();
        const details = JSON.stringify({ crop: cropData, filters: filters, caption: caption, altText: altText });
        const title = ($uieTitleInput.val() || currentMediaAssetAdminTitle || "Image") + " - Variant";
        $.ajax({ url: 'ajax/saveMediaVariant.php', type: 'POST', data: { media_asset_id: currentMediaAssetId, variant_type: title, variant_details: details }, dataType: 'json',
            success: function(response) {
              if (response.success && response.variant_id) {
                showNotification(`New Variant ${response.variant_id} saved!`, 'success'); loadAndDisplayVariants(currentMediaAssetId);
                currentVariantId = response.variant_id; isEditingMaster = false;
                $uieTitleInput.val(title); updateActionButtons();
                $('.uie-variant-box').removeClass('active-variant'); $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant'); $uieSourceThumbnailBox.removeClass('active-variant');
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error: ' + (response.error || 'Could not save new variant.'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX Error saving new variant: ' + ts, 'error')
        });
    });

    $(document).off('click.uieUpdateVariant').on('click.uieUpdateVariant', '.uie-update-variant-button', function() {
        if (isEditingMaster || !currentVariantId || !cropper || !cropper.ready || !currentMediaAssetId) return;
        const cropData = cropper.getData(true), filters = getCurrentUserAdjustedFiltersObject(), title = $uieTitleInput.val(), caption = $uieCaptionInput.val(), altText = $uieAltTextInput.val();
        const details = JSON.stringify({ crop: cropData, filters, caption, altText });
        $.ajax({ url: 'ajax/updateMediaVariant.php', type: 'POST', data: { variant_id: currentVariantId, media_asset_id: currentMediaAssetId, variant_type: title, variant_details: details }, dataType: 'json',
            success: function(response) {
              if (response.success) {
                showNotification(`Variant ${currentVariantId} updated!`, 'success');
                const variantIndex = cachedVariantsForCurrentMaster.findIndex(v => String(v.id) === String(currentVariantId));
                if (variantIndex > -1) { cachedVariantsForCurrentMaster[variantIndex].variant_type = title; cachedVariantsForCurrentMaster[variantIndex].variant_details = details; }
                updateVariantThumbnailInStrip(currentVariantId, { crop: cropData, filters });
                const $variantBox = $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`);
                $variantBox.data('variant-details', details.replace(/'/g, "&apos;")).data('variant-title', title.replace(/"/g, "&quot;")).find('.uie-variant-caption').text(title);
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error updating variant: ' + (response.error || 'Failed.'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX Error updating variant: ' + ts, 'error')
        });
    });

    $(document).off('click.uieSaveAsNewVariantFromExisting').on('click.uieSaveAsNewVariantFromExisting', '.uie-save-as-new-variant-button', function() {
        if (isEditingMaster || !currentVariantId || !cropper || !cropper.ready || !currentMediaAssetId) return;
        const cropData = cropper.getData(true), filters = getCurrentUserAdjustedFiltersObject(), title = ($uieTitleInput.val() || "Forked Variant") + " (copy)", caption = $uieCaptionInput.val(), altText = $uieAltTextInput.val();
        const details = JSON.stringify({ crop: cropData, filters, caption, altText });
        $.ajax({ url: 'ajax/saveMediaVariant.php', type: 'POST', data: { media_asset_id: currentMediaAssetId, variant_type: title, variant_details: details }, dataType: 'json',
            success: function(response) {
              if (response.success && response.variant_id) {
                showNotification(`New Variant ${response.variant_id} (forked) saved!`, 'success'); loadAndDisplayVariants(currentMediaAssetId);
                currentVariantId = response.variant_id; $uieTitleInput.val(title); updateActionButtons();
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error forking variant: ' + (response.error || 'Failed.'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX Error forking variant: ' + ts, 'error')
        });
    });

    $(document).off('click.uieSaveNewImage').on('click.uieSaveNewImage', '.uie-save-as-new-image-button', function() {
        if (!isCurrentMasterPhysical) { showNotification("'Save as New Image' is only available when the current master image is a physical asset.", "warning"); return; }
        if (!cropper || !cropper.ready) { showNotification("Editor not ready to save new image.", "error"); return; }
        const cropData = cropper.getData(true), filters = getCurrentUserAdjustedFiltersObject(), title = $uieTitleInput.val(), caption = $uieCaptionInput.val(), altText = $uieAltTextInput.val();
        const sourceUrlForNewVM = $uieSourceUrlInput.val(), attributionForNewVM = $uieAttributionInput.val();
        $.ajax({ url: 'ajax/saveNewImage.php', type: 'POST', data: { source_media_asset_id: currentPhysicalSourceAssetId, current_crop_json: JSON.stringify(cropData), current_filters_json: JSON.stringify(filters), new_admin_title: title, new_public_caption: caption, new_alt_text: altText, new_source_url: sourceUrlForNewVM, new_attribution: attributionForNewVM }, dataType: 'json',
            success: function(response) {
                if (response.success && response.media && response.media.id) {
                    showNotification('New Virtual Master Image (ID: ' + response.media.id + ') created!', 'success');
                    if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
                    openEditor(response.media.image_url, response.media, onVariantSavedOrUpdatedCallback, onEditorClosedCallback);
                } else { showNotification('Error creating new virtual master: ' + (response.error || 'Unknown'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX error creating new virtual master: ' + ts, 'error')
        });
    });
  };
  return { openEditor, closeEditor };
})();