// UnifiedImageEditor.js – With Virtual Masters, refined variant workflow, preview generation, crop fixes, variant caching, source/attribution fields, and variant preloading.
// Version 2.22.11 (Deferred Thumbnail Loading & Indicators - Defensive Ref for Thumbnail Gen)

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

  let debouncedUpdateThumbnails = null;

  const getCurrentUserAdjustedFiltersObject = () => {
    return {
        brightness: parseFloat($('.uie-slider[data-filter="brightness"]').val()) || 100,
        contrast:   parseFloat($('.uie-slider[data-filter="contrast"]').val()) || 100,
        saturation: parseFloat($('.uie-slider[data-filter="saturation"]').val()) || 100,
        hue:        parseFloat($('.uie-slider[data-filter="hue"]').val()) || 0,
    };
  };

  const getCssFilterString = (filtersObject) => {
    const f = filtersObject || getCurrentUserAdjustedFiltersObject(); 
    return `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`;
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
        console.log("Processed virtual master canvas. Dimensions:", canvas.width, "x", canvas.height, "Source crop used:", cropToUse);
        resolve(canvas.toDataURL('image/png'));
    });
  };

  const updateDisplayedDimensions = () => {
    if (cropper && cropper.ready) {
        try {
            const cropData = cropper.getData(true); 
            $('#uie-current-dims').text(`${Math.round(cropData.width)}px × ${Math.round(cropData.height)}px`);
        } catch (e) {
            console.warn("Could not get crop data for dimensions display:", e);
            $('#uie-current-dims').text('Error');
        }
    } else {
        $('#uie-current-dims').text('N/A');
    }
  };

  const updateAspectRatioLockButton = () => {
    const $btn = $('.uie-aspect-lock-btn');
    if (isAspectRatioLocked && !isNaN(currentLockedAspectRatio)) {
        $btn.find('i').removeClass('fa-unlock-alt').addClass('fa-lock');
        $btn.attr('data-locked', 'true').attr('title', `Aspect Ratio Locked (${currentLockedAspectRatio.toFixed(2)})`);
    } else {
        $btn.find('i').removeClass('fa-lock').addClass('fa-unlock-alt');
        $btn.attr('data-locked', 'false').attr('title', 'Lock Aspect Ratio');
    }
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
                      <label class="uie-slider-label"><span class="uie-slider-text">Zoom</span><span class="uie-slider-input-container"><input type="range" class="uie-slider" data-cropper="zoom" min="0" max="200" value="0"></span><span class="uie-reset-icon-container" data-reset-for="zoom" title="Reset Zoom"><i class="fas fa-sync-alt uie-reset-icon"></i></span></label>
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
      bindStaticEvents();
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
          $('.uie-source-label').hide().empty(); 
          $('#uie-source-thumbnail-box').addClass('active-variant'); 
          $('.uie-variant-box').removeClass('active-variant'); 
      } else { 
          $('.uie-update-variant-button').show().text(`Update Variant Details`); 
          $('.uie-save-as-new-variant-button').show();
          if (isCurrentMasterPhysical) { 
            $saveNewImageBtn.show();
          }
          $('.uie-source-label').show().html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`); 
          $('#uie-source-thumbnail-box').removeClass('active-variant');
      }
  };

  const pollZoomSlider = () => {
    if (!cropper || !cropper.ready) return;
    try {
        const currentImageData = cropper.getImageData(); 
        if (!currentImageData || !effectiveCropperSourceDimensions.width || effectiveCropperSourceDimensions.width === 0 || initialZoomRatio === 0 ) return;
        const currentZoomOfBaseImage = currentImageData.width / effectiveCropperSourceDimensions.width;
        
        let sliderValue = ((currentZoomOfBaseImage / initialZoomRatio) - 1) * 100;

        const sliderMax = parseFloat($(".uie-slider[data-cropper='zoom']").attr("max"));
        if (sliderValue < -99) sliderValue = -99; 
        if (sliderValue > sliderMax) sliderValue = sliderMax;
        
        $(".uie-slider[data-cropper='zoom']").val(sliderValue);
    } catch (e) {
        // console.warn("PollZoomSlider: Cropper not fully ready or error:", e);
    }
    requestAnimationFrame(pollZoomSlider);
  };

  const loadMediaPresets = () => {
    return new Promise((resolve, reject) => {
        $('.presets-loading').show();
        $('.uie-filter-presets .uie-presets-scroll').empty().html($('.filter-presets-loading').show().clone()); 
        $('.uie-crop-presets .uie-presets-scroll').empty().html($('.crop-presets-loading').show().clone());

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
                $('.presets-loading').hide();
                $('.uie-filter-presets .uie-presets-scroll').html('<p>Error loading presets.</p>');
                $('.uie-crop-presets .uie-presets-scroll').html('<p>Error loading presets.</p>');
                reject(err);
            }
        });
    });
  };

  // This function is defined before updatePresetThumbnails
  const generatePresetThumbnail = (preset) => {
    return new Promise((resolve, reject) => {
        if (!cropper || !cropper.ready) {
            return reject("generatePresetThumbnail: Cropper not ready.");
        }

        let baseCanvasForPreset;
        try {
            baseCanvasForPreset = cropper.getCroppedCanvas();
            if (!baseCanvasForPreset || baseCanvasForPreset.width === 0 || baseCanvasForPreset.height === 0) {
                return reject("generatePresetThumbnail: Could not get valid base cropped canvas from main cropper.");
            }
        } catch (e) {
            return reject("generatePresetThumbnail: Error getting base cropped canvas: " + e.message);
        }

        const currentlyFilteredBaseCanvas = document.createElement('canvas');
        currentlyFilteredBaseCanvas.width = baseCanvasForPreset.width;
        currentlyFilteredBaseCanvas.height = baseCanvasForPreset.height;
        const cfbcCtx = currentlyFilteredBaseCanvas.getContext('2d');
        
        const currentSliderFilters = getCurrentUserAdjustedFiltersObject();
        cfbcCtx.filter = getCssFilterString(currentSliderFilters);
        cfbcCtx.drawImage(baseCanvasForPreset, 0, 0);

        let finalPreviewCanvas = document.createElement('canvas');
        let finalCtx = finalPreviewCanvas.getContext('2d');

        if (preset.type === 'filter') {
            try {
                const presetFilterDetails = JSON.parse(preset.preset_details);
                const presetFilterValues = {
                    brightness: presetFilterDetails.brightness || 100,
                    contrast: presetFilterDetails.contrast || 100,
                    saturation: presetFilterDetails.saturation || 100,
                    hue: presetFilterDetails.hue || 0
                };
                finalPreviewCanvas.width = currentlyFilteredBaseCanvas.width;
                finalPreviewCanvas.height = currentlyFilteredBaseCanvas.height;
                finalCtx.filter = getCssFilterString(presetFilterValues);
                finalCtx.drawImage(currentlyFilteredBaseCanvas, 0, 0);
            } catch (err) {
                console.error("Error processing filter preset details for '" + preset.name + "':", err, preset.preset_details);
                return reject(err);
            }
        } else if (preset.type === 'crop') {
            try {
                const presetCropDetails = JSON.parse(preset.preset_details);
                const aspectRatioStr = presetCropDetails.aspect_ratio;
                const parts = aspectRatioStr.split(':');
                if (parts.length !== 2) return reject("Malformed aspect ratio string in preset.");
                
                const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
                if (isNaN(targetRatio) || targetRatio <= 0) return reject("Invalid aspect ratio in preset.");

                const sourceW = currentlyFilteredBaseCanvas.width;
                const sourceH = currentlyFilteredBaseCanvas.height;
                let newCropW, newCropH, cropX, cropY;

                if (sourceW / sourceH > targetRatio) {
                    newCropH = sourceH;
                    newCropW = newCropH * targetRatio;
                    cropX = (sourceW - newCropW) / 2;
                    cropY = 0;
                } else {
                    newCropW = sourceW;
                    newCropH = newCropW / targetRatio;
                    cropX = 0;
                    cropY = (sourceH - newCropH) / 2;
                }
                finalPreviewCanvas.width = Math.round(newCropW);
                finalPreviewCanvas.height = Math.round(newCropH);
                finalCtx.drawImage(currentlyFilteredBaseCanvas, 
                                   cropX, cropY, newCropW, newCropH,
                                   0, 0, finalPreviewCanvas.width, finalPreviewCanvas.height);
            } catch (err) {
                console.error("Error processing crop preset details for '" + preset.name + "':", err, preset.preset_details);
                return reject(err);
            }
        } else {
            return reject("Unknown preset type: " + preset.type);
        }
        
        const thumbCanvas = generateScaledThumbnail(finalPreviewCanvas);
        resolve(thumbCanvas.toDataURL());
    });
  };


  const updatePresetThumbnails = () => {
    // Helper to ensure closure captures the correct generatePresetThumbnail
    // This is a defensive measure.
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
            $('.presets-loading').hide();
            return reject(new Error("Cropper not ready for preset thumbnails."));
        }
        if (!presetsData || presetsData.length === 0) {
            console.log("updatePresetThumbnails: No presets data to render.");
            $('.presets-loading').hide();
            $('.uie-filter-presets .uie-presets-scroll').empty();
            $('.uie-crop-presets .uie-presets-scroll').empty();
            return resolve();
        }

        console.log("updatePresetThumbnails: Starting generation for", presetsData.length, "presets.");
        $('.uie-filter-presets .uie-presets-scroll').empty(); 
        $('.uie-crop-presets .uie-presets-scroll').empty();
        $('.presets-loading').show();

        const thumbnailPromises = presetsData.map(preset =>
            callGeneratePresetThumbnail(preset) // Use the helper
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
                      $('.uie-filter-presets .uie-presets-scroll').append(presetBoxHtml);
                    } else if (preset.type === 'crop') {
                      $('.uie-crop-presets .uie-presets-scroll').append(presetBoxHtml);
                    }
                });
                console.log("updatePresetThumbnails: All preset thumbnails processed.");
                resolve(); 
            })
            .catch(overallError => {
                console.error("updatePresetThumbnails: Overall error processing preset thumbnails:", overallError);
                reject(overallError); 
            })
            .finally(() => {
                $('.presets-loading').hide();
            });
    });
  };


  const setupPresetSorting = () => {
    $('.uie-filter-presets .uie-presets-scroll, .uie-crop-presets .uie-presets-scroll').sortable({
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
    console.log("Debounced call to updatePresetThumbnails triggered.");
    updatePresetThumbnails();
  }, 500); 

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
            if (presetDetails.brightness !== undefined) $('.uie-slider[data-filter="brightness"]').val(presetDetails.brightness).trigger('input').trigger('change');
            if (presetDetails.contrast !== undefined) $('.uie-slider[data-filter="contrast"]').val(presetDetails.contrast).trigger('input').trigger('change');
            if (presetDetails.saturation !== undefined) $('.uie-slider[data-filter="saturation"]').val(presetDetails.saturation).trigger('input').trigger('change');
            if (presetDetails.hue !== undefined) $('.uie-slider[data-filter="hue"]').val(presetDetails.hue).trigger('input').trigger('change');
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
    console.log("initializeCropperInstance: isEditingMaster=", isEditingMaster, "currentVariantId=", currentVariantId, "options=", mergedOptions);


    const imageElementForCropperDOM = document.getElementById('uie-image');
    effectiveCropperSource = imageSrcForCropper; 

    if (cropper) {
        try { cropper.destroy(); } catch (e) { console.warn("Error destroying previous cropper instance:", e); }
        cropper = null;
    }
    
    $(imageElementForCropperDOM).attr('src', imageSrcForCropper);

    const tempImg = new Image();
    tempImg.onload = () => {
        effectiveCropperSourceDimensions = { width: tempImg.width, height: tempImg.height };
        console.log("Effective Cropper Source Dimensions:", effectiveCropperSourceDimensions);

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
            crop: function(event) {
                if (event.detail.originalEvent) { 
                    debouncedUpdateThumbnails(); 
                    updateDisplayedDimensions(); 
                }
            }
        };
        
        cropperOptions.ready = function() { 
            if (!cropper) {
                console.warn("Cropper instance became null during ready callback.");
                return;
            }
            console.log("Cropper ready. Effective source dimensions:", effectiveCropperSourceDimensions);
            
            const container = cropper.getContainerData();
            const imageW = effectiveCropperSourceDimensions.width;
            const imageH = effectiveCropperSourceDimensions.height;
            let fitZoom = 1.0; 

            if (imageW > 0 && imageH > 0 && container.width > 0 && container.height > 0) {
                fitZoom = Math.min(container.width / imageW, container.height / imageH);
            }
            
            cropper.zoomTo(fitZoom); 
            
            const actualCanvasAfterInitialZoom = cropper.getCanvasData();
            if (imageW > 0) { 
                initialZoomRatio = actualCanvasAfterInitialZoom.width / imageW;
            } else {
                initialZoomRatio = fitZoom; 
            }
            console.log("Initial fitZoom commanded:", fitZoom, "Actual initialZoomRatio for slider baseline:", initialZoomRatio);

            cropper.setCanvasData({
                left: (container.width - actualCanvasAfterInitialZoom.width) / 2,
                top: (container.height - actualCanvasAfterInitialZoom.height) / 2,
                width: actualCanvasAfterInitialZoom.width,
                height: actualCanvasAfterInitialZoom.height
            });
        
            const filtersForUI = (initialSettings && initialSettings.filters) ? 
                                 initialSettings.filters : 
                                 { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

            $('.uie-slider[data-filter="brightness"]').val(filtersForUI.brightness);
            $('.uie-slider[data-filter="contrast"]').val(filtersForUI.contrast);
            $('.uie-slider[data-filter="saturation"]').val(filtersForUI.saturation);
            $('.uie-slider[data-filter="hue"]').val(filtersForUI.hue);
            
            $('#uie-image, .cropper-view-box img').css("filter", getCssFilterString(filtersForUI));
            
            if (initialSettings && initialSettings.crop) {
                console.log("Applying initialSettings (crop & implied zoom/pan):", initialSettings.crop);
                cropper.setData(initialSettings.crop); 
            } else {
                console.log("Applying full natural crop DATA for master/virtual master using setData with effectiveCropperSourceDimensions:", effectiveCropperSourceDimensions);
                if (effectiveCropperSourceDimensions.width > 0 && effectiveCropperSourceDimensions.height > 0) {
                    cropper.setData({
                        x: 0, y: 0,
                        width: effectiveCropperSourceDimensions.width,
                        height: effectiveCropperSourceDimensions.height
                    });
                } else {
                    console.error("Ready: effectiveCropperSourceDimensions are invalid. Cannot set initial full crop data.");
                }
                const canvasForInitialCropBox = cropper.getCanvasData();
                 if (canvasForInitialCropBox.width > 0 && canvasForInitialCropBox.height > 0) {
                    cropper.setCropBoxData({
                        left: canvasForInitialCropBox.left,
                        top: canvasForInitialCropBox.top,
                        width: canvasForInitialCropBox.width,
                        height: canvasForInitialCropBox.height
                    });
                    console.log("Ready: Initial visual crop box set to canvas dimensions:", cropper.getCropBoxData());
                } else {
                    console.error("Ready: Canvas for initial crop box has zero dimensions.");
                }
            }
            
            const currentImageData = cropper.getImageData();
            if (currentImageData.naturalWidth > 0 && initialZoomRatio > 0 ) { 
                const actualCurrentZoom = currentImageData.width / currentImageData.naturalWidth;
                let sliderVal = ((actualCurrentZoom / initialZoomRatio) - 1) * 100;
                
                const sliderMax = parseFloat($(".uie-slider[data-cropper='zoom']").attr("max"));
                if (sliderVal < -99) sliderVal = -99; 
                if (sliderVal > sliderMax) sliderVal = sliderMax;
                $('.uie-slider[data-cropper="zoom"]').val(sliderVal);
            } else {
                 $('.uie-slider[data-cropper="zoom"]').val(0);
            }

            isAspectRatioLocked = false;
            currentLockedAspectRatio = NaN;
            updateAspectRatioLockButton();
            
            updateDisplayedDimensions(); 
            requestAnimationFrame(pollZoomSlider);
            
            // --- Deferred loading for thumbnails ---
            setTimeout(async () => {
                if (!cropper || !cropper.ready) return; // Re-check cropper
                console.log("Deferred: Starting to load presets and variants thumbnails.");
                
                // Load Presets and then update their thumbnails
                try {
                    await loadMediaPresets(); // Fetches data
                    if (presetsData.length > 0) {
                        await updatePresetThumbnails(); // Renders thumbnails
                    } else {
                         $('.presets-loading').hide(); // Hide if no presets
                    }
                } catch (presetError) {
                    console.error("Deferred: Error in preset loading/rendering chain:", presetError);
                     $('.presets-loading').hide();
                }

                // Load Variants and their thumbnails
                if (mergedOptions.refreshVariants || !variantsInitiallyLoadedForMaster) {
                    console.log("Deferred: Calling loadAndDisplayVariants. isEditingMaster=", isEditingMaster, "currentVariantId=", currentVariantId);
                    loadAndDisplayVariants(currentMediaAssetId); // This will handle its own loading indicator
                } else {
                    // If not refreshing, ensure correct highlighting based on current state
                    console.log("Deferred: Skipped refetching variants. Highlighting based on: isEditingMaster=", isEditingMaster, "currentVariantId=", currentVariantId);
                    if (!isEditingMaster && currentVariantId) {
                        $('.uie-variant-box').removeClass('active-variant'); 
                        $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
                        $('#uie-source-thumbnail-box').removeClass('active-variant');
                        $('.uie-source-label').show().html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);
                    } else if (isEditingMaster) {
                        $('.uie-variant-box').removeClass('active-variant');
                        $('#uie-source-thumbnail-box').addClass('active-variant');
                        $('.uie-source-label').hide().empty();
                    }
                    $('.variants-loading').hide(); // Hide if not refreshing
                }
                
                bindPresetEvents(); 
                updateActionButtons(); // Ensure buttons are correct after all async ops
                
            }, 0);
            // --- End Deferred loading ---


            localTargetVariantToPreloadId = null;
            localTargetVariantToPreloadDetails = null;
            localTargetVariantToPreloadTitle = null;
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
    console.log("resetEditorToMasterState: Set isEditingMaster=true, currentVariantId=null");
    
    $('.uie-title-input').val(currentMediaAssetAdminTitle); 
    $('.uie-caption').val(currentMasterPublicCaption); 
    $('.uie-alt-text').val(currentMasterAltText);   
    $('#uie-source-url-input').val(currentMasterSourceUrl);
    $('#uie-attribution-input').val(currentMasterAttribution);

    const $sourceThumbBox = $('#uie-source-thumbnail-box');
    if (!isCurrentMasterPhysical) { 
      $sourceThumbBox.addClass('uie-source-is-virtual');
      $sourceThumbBox.attr('title', 'Virtual Master (Source ID: ' + currentPhysicalSourceAssetId + ')');
    } else {
      $sourceThumbBox.removeClass('uie-source-is-virtual');
      $sourceThumbBox.attr('title', 'Physical Master');
    }

    if (!activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
        showNotification("Cannot reset to master: Base physical image not loaded.", "error");
        return;
    }

    let imageSrcForCropperToUse;
    if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
        console.log("Resetting to Virtual Master state. Its defaults will be baked into the source for Cropper.");
        try {
            imageSrcForCropperToUse = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
        } catch (error) {
            console.error("Error processing virtual master for reset:", error);
            showNotification("Error resetting to virtual master state. Loading physical.", "error");
            imageSrcForCropperToUse = currentMediaAssetUrl; 
            effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
        }
    } else { 
        console.log("Resetting to Physical Master state (or VM without specific defaults to bake).");
        imageSrcForCropperToUse = currentMediaAssetUrl; 
        effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
    }
    
    initializeCropperInstance(imageSrcForCropperToUse, null, { refreshVariants: false }); 
    
    $('#uie-source-thumbnail-box').addClass('active-variant');
    $('.uie-variant-box').removeClass('active-variant');
    updateActionButtons(); 
  };

  const openEditor = async (physicalImgUrl, assetDataObj, saveCb, closedCb, options = {}) => {
    console.log("openEditor called. Master Asset ID:", assetDataObj.id, "Options:", options);
    ensureOverlayExists();

    cachedVariantsForCurrentMaster = [];
    variantsInitiallyLoadedForMaster = false;
    localTargetVariantToPreloadId = options.targetVariantId || null;
    localTargetVariantToPreloadDetails = options.targetVariantDetails || null;
    localTargetVariantToPreloadTitle = options.targetVariantTitle || null;

    console.log("openEditor: Preload targetVariantId:", localTargetVariantToPreloadId);


    currentMediaAssetId = assetDataObj.id;
    currentMediaAssetAdminTitle = assetDataObj.admin_title || assetDataObj.title || `Image ${assetDataObj.id}`; 
    currentMasterPublicCaption = assetDataObj.public_caption || assetDataObj.caption || '';
    currentMasterAltText = assetDataObj.alt_text || '';
    currentMasterSourceUrl = assetDataObj.source_url || ''; 
    currentMasterAttribution = assetDataObj.attribution || '';

    isCurrentMasterPhysical = (!assetDataObj.physical_source_asset_id || 
                             assetDataObj.physical_source_asset_id === assetDataObj.id ||
                             assetDataObj.physical_source_asset_id === null); 
    
    currentMediaAssetUrl = physicalImgUrl; 
    currentPhysicalSourceAssetId = isCurrentMasterPhysical ? assetDataObj.id : assetDataObj.physical_source_asset_id;

    try {
        currentAssetDefaultCrop = (assetDataObj.default_crop && assetDataObj.default_crop !== "null" && assetDataObj.default_crop.trim() !== "") ? JSON.parse(assetDataObj.default_crop) : null;
        currentAssetDefaultFilters = (assetDataObj.filter_state && assetDataObj.filter_state !== "null" && assetDataObj.filter_state.trim() !== "") ? JSON.parse(assetDataObj.filter_state) : null;
    } catch (e) {
        console.error("Error parsing default crop/filter state for asset:", assetDataObj.id, e);
        currentAssetDefaultCrop = null; currentAssetDefaultFilters = null;
    }

    onVariantSavedOrUpdatedCallback = saveCb;
    onEditorClosedCallback = closedCb;
    
    uieCurrentMediaAssetIdForTags = assetDataObj.id; 
    if (uieCurrentMediaAssetIdForTags && typeof TagSystem !== 'undefined') {
        TagSystem.init({
            itemType: 'mediaAsset',
            itemId: uieCurrentMediaAssetIdForTags,
            inputSelector: '#uie-tag-input-field', 
            listSelector: '#uie-selected-tags-container', 
            addTagOnBlur: false 
        });
    } else {
        console.warn("UIE: TagSystem not available or asset ID missing for tags init.");
        if (typeof TagSystem !== 'undefined' && TagSystem.setItemContext) {
            TagSystem.setItemContext(null, 'mediaAsset'); 
        }
    }

    $('#uie-source-thumbnail-box .uie-box-img').attr('src', '').attr('alt', 'Loading source preview...');
    $('#uie-source-thumbnail-box .uie-box-caption').text(currentMediaAssetAdminTitle); 
    $('.uie-variant-scroll').empty().html('<div class="uie-loading-indicator variants-loading"><i class="fas fa-spinner fa-spin"></i> Loading Variants...</div>'); // Show loader immediately
    
    $('#uie-source-url-input').val(currentMasterSourceUrl);
    $('#uie-attribution-input').val(currentMasterAttribution);


    const imagePreloader = new Image();
    imagePreloader.crossOrigin = "Anonymous"; 
    imagePreloader.onload = async function() { 
        if (this.naturalWidth === 0 || this.naturalHeight === 0) {
            showNotification("Error: Preloaded physical image data is invalid (zero dimensions).", "error");
            if (typeof onEditorClosedCallback === 'function') onEditorClosedCallback();
            return;
        }
        activeBaseImageElement = this; 
        console.log("Physical source image preloaded:", activeBaseImageElement.src, "Dimensions:", activeBaseImageElement.naturalWidth, "x", activeBaseImageElement.naturalHeight);
        
        const $sourceThumbBox = $('#uie-source-thumbnail-box');
        if (!isCurrentMasterPhysical) { 
          $sourceThumbBox.addClass('uie-source-is-virtual');
          $sourceThumbBox.attr('title', 'Virtual Master (Physical Source ID: ' + currentPhysicalSourceAssetId + ')');
        } else {
          $sourceThumbBox.removeClass('uie-source-is-virtual');
          $sourceThumbBox.attr('title', 'Physical Master');
        }
        
        try {
            console.log("UIE Source Thumb: Generating for master. Base image natural dims:", activeBaseImageElement.naturalWidth, "x", activeBaseImageElement.naturalHeight);
            const masterPreviewCanvas = await generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, null, null);
            if (masterPreviewCanvas.width === 0 || masterPreviewCanvas.height === 0) {
                console.warn("UIE Source Thumb: masterPreviewCanvas has zero dimensions. Thumbnail will be empty/error.");
                 $('#uie-source-thumbnail-box .uie-box-img').attr('src','').attr('alt', 'Preview Error (Zero Dim)');
            } else {
                const scaledThumbCanvas = generateScaledThumbnail(masterPreviewCanvas, 85, 70); 
                $('#uie-source-thumbnail-box .uie-box-img').attr('src', scaledThumbCanvas.toDataURL()).attr('alt', 'Source Thumbnail');
            }
        } catch (thumbError) {
            console.error("Error generating UIE source thumbnail:", thumbError);
            $('#uie-source-thumbnail-box .uie-box-img').attr('src','').attr('alt', 'Preview Error');
        }

        let imageSrcToLoadInCropper;
        let initialSettingsForCropper = null;

        // This logic determines the initial state of the editor (master vs. variant)
        if (localTargetVariantToPreloadId && localTargetVariantToPreloadDetails) {
            console.log("openEditor (preload path): Setting state for variant:", localTargetVariantToPreloadId);
            isEditingMaster = false; // CRITICAL: Set state before initializing cropper
            currentVariantId = localTargetVariantToPreloadId;

            if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
                imageSrcToLoadInCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
            } else {
                imageSrcToLoadInCropper = currentMediaAssetUrl;
                effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
            }
            initialSettingsForCropper = {
                crop: localTargetVariantToPreloadDetails.crop, 
                filters: localTargetVariantToPreloadDetails.filters
            };
            $('.uie-title-input').val(localTargetVariantToPreloadTitle || `Variant ${currentVariantId}`);
            $('.uie-caption').val(localTargetVariantToPreloadDetails.caption || '');
            $('.uie-alt-text').val(localTargetVariantToPreloadDetails.altText || '');
        } else { 
            console.log("openEditor (master path): Setting state for master:", currentMediaAssetId);
            isEditingMaster = true; // CRITICAL: Set state
            currentVariantId = null;
            if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) {
                imageSrcToLoadInCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
            } else {
                imageSrcToLoadInCropper = currentMediaAssetUrl;
                effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
            }
            $('.uie-title-input').val(currentMediaAssetAdminTitle);
            $('.uie-caption').val(currentMasterPublicCaption);
            $('.uie-alt-text').val(currentMasterAltText);
        }
        
        $('#uie-overlay').removeClass('hidden').fadeIn(300, () => {
            // Pass refreshVariants: true so variants are always loaded on open,
            // this allows highlighting logic in loadAndDisplayVariants to work correctly.
            initializeCropperInstance(imageSrcToLoadInCropper, initialSettingsForCropper, { refreshVariants: true }); 
        });
    };
    imagePreloader.onerror = function() { 
        console.error("Failed to preload physical source image:", currentMediaAssetUrl);
        showNotification("Error: Could not load the main image. Editor cannot open.", "error");
        activeBaseImageElement = null;
        $('#uie-source-thumbnail-box .uie-box-img').attr('src','').attr('alt', 'Load Error');
        $('.variants-loading').hide(); // Hide loader on error too
        if (typeof onEditorClosedCallback === 'function') onEditorClosedCallback();
    };
    imagePreloader.src = currentMediaAssetUrl; 
  };

  const closeEditor = () => {
    if (cropper) {
        try { cropper.destroy(); } catch(e) { console.warn("Error destroying cropper on close:", e); }
        cropper = null;
    }
    activeBaseImageElement = null;
    effectiveCropperSource = null;
    effectiveCropperSourceDimensions = { width: 0, height: 0 };
    cachedVariantsForCurrentMaster = [];
    variantsInitiallyLoadedForMaster = false;
    localTargetVariantToPreloadId = null;
    localTargetVariantToPreloadDetails = null;
    localTargetVariantToPreloadTitle = null;

    $('#uie-overlay').fadeOut(300, function() { $(this).addClass('hidden'); });
    uieCurrentMediaAssetIdForTags = null;
    if (typeof TagSystem !== 'undefined' && TagSystem.setItemContext) {
      TagSystem.setItemContext(null, 'mediaAsset'); 
    }
    if (typeof onEditorClosedCallback === 'function') { onEditorClosedCallback(); }
  };

  const getFinalProcessedImageDataUrl = () => {
    if (!cropper || !cropper.ready) {
        showNotification("Cropper not ready.", "error");
        return null;
    }
    let croppedCanvas;
    try {
        croppedCanvas = cropper.getCroppedCanvas(); 
    } catch (e) {
        showNotification("Error getting cropped canvas: " + e.message, "error");
        return null;
    }
    if (!croppedCanvas || croppedCanvas.width === 0 || croppedCanvas.height === 0) { 
        showNotification("Could not get valid cropped canvas data (zero dimensions).", "error");
        return null;
    }

    const userAdjustedFilters = getCurrentUserAdjustedFiltersObject();
    const filterString = getCssFilterString(userAdjustedFilters);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = croppedCanvas.width;
    finalCanvas.height = croppedCanvas.height;
    const ctx = finalCanvas.getContext('2d');

    if (filterString !== "brightness(100%) contrast(100%) saturate(100%) hue-rotate(0deg)") { 
        ctx.filter = filterString;
    }
    ctx.drawImage(croppedCanvas, 0, 0);
    return finalCanvas.toDataURL('image/png'); 
  };

  const updateVariantThumbnailInStrip = (variantId, variantDetails) => {
    const $variantBox = $(`.uie-variant-box[data-variant-id="${variantId}"]`);
    if ($variantBox.length && activeBaseImageElement && activeBaseImageElement.complete && activeBaseImageElement.naturalWidth > 0) {
        const variantSpecificCrop = variantDetails.crop;
        const variantSpecificFilters = variantDetails.filters;

        generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, variantSpecificCrop, variantSpecificFilters)
            .then(previewCanvas => generateScaledThumbnail(previewCanvas, 85, 70)) 
            .then(scaledThumbCanvas => {
                $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL());
            })
            .catch(err => {
                console.error("Error generating preview for variant box update:", variantId, err);
                $variantBox.find('.image-container').empty().append('<span style="color:red;font-size:9px;">Preview Error</span>');
            });
    } else {
        console.warn("Could not update variant thumbnail in strip. Variant box or base image not ready. Variant ID:", variantId);
    }
  };

  const loadAndDisplayVariants = (mediaAssetIdToLoad) => {
    console.log("loadAndDisplayVariants: Entered. isEditingMaster=", isEditingMaster, "currentVariantId=", currentVariantId);
     // Show loading indicator for variants when this function starts
    $('.variants-loading').show();
    $('.uie-variant-scroll').empty().append($('.variants-loading'));


    if (!mediaAssetIdToLoad) {
        $('.uie-variant-scroll').empty().append('<p>No image selected.</p>');
        $('.variants-loading').hide();
        return;
    }
    if (!activeBaseImageElement || !activeBaseImageElement.complete || !activeBaseImageElement.naturalWidth) {
        $('.uie-variant-scroll').empty().append('<p>Base image not ready for variant previews.</p>');
        $('.variants-loading').hide();
        console.warn("loadAndDisplayVariants: activeBaseImageElement not ready.");
        return;
    }
    
    $.ajax({
      url: 'ajax/getMediaVariants.php',
      type: 'GET',
      data: { media_asset_id: mediaAssetIdToLoad }, 
      dataType: 'json',
      success: function(response) {
        $('.uie-variant-scroll').empty(); // Clear loader before adding content
        cachedVariantsForCurrentMaster = []; 

        if (response.success && response.variants && response.variants.length > 0) {
          cachedVariantsForCurrentMaster = response.variants; 

          cachedVariantsForCurrentMaster.forEach(variant => {
            let variantAdminTitle = variant.variant_type || `Variant ${variant.id}`; 
            let variantDetailsParsed;
            try {
                variantDetailsParsed = JSON.parse(variant.variant_details);
            } catch(e) {
                console.error("Failed to parse variant_details for variant ID:", variant.id, variant.variant_details);
                variantDetailsParsed = { crop: null, filters: null, caption: '', altText: '' }; 
            }

            const variantBoxHtml = `
              <div class="uie-variant-box uie-box" data-variant-id="${variant.id}" 
                   data-variant-details='${variant.variant_details.replace(/'/g, "&apos;")}'
                   data-variant-title="${variantAdminTitle.replace(/"/g, "&quot;")}">
                <div class="image-container">
                  <img class="uie-box-img" src="" alt="${variantAdminTitle}">
                </div>
                <span class="uie-variant-caption uie-box-caption">${variantAdminTitle}</span>
              </div>`;
            const $variantBox = $(variantBoxHtml);
            $('.uie-variant-scroll').append($variantBox);

            generateTransformedPreviewCanvas(
                activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, 
                variantDetailsParsed.crop, variantDetailsParsed.filters    
            )
            .then(previewCanvas => generateScaledThumbnail(previewCanvas, 85, 70)) 
            .then(scaledThumbCanvas => {
                $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL());
            })
            .catch(err => {
                 console.error("Error generating preview for variant box:", variant.id, err);
                 $variantBox.find('.image-container').empty().append('<span style="color:red;font-size:9px;">Preview Error</span>');
            });
          });
          bindVariantSelectionEvents();
        
          console.log("Highlighting check (after loading variants): isEditingMaster=", isEditingMaster, "currentVariantId=", currentVariantId);
          if (!isEditingMaster && currentVariantId) {
              const $targetVariantBox = $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`);
              console.log("Target variant box for highlighting:", $targetVariantBox.length > 0 ? $targetVariantBox[0] : "Not found");
              $('.uie-variant-box').removeClass('active-variant');
              $targetVariantBox.addClass('active-variant');
              $('#uie-source-thumbnail-box').removeClass('active-variant');
              $('.uie-source-label').show().html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);
          } else if (isEditingMaster) {
              $('.uie-variant-box').removeClass('active-variant');
              $('#uie-source-thumbnail-box').addClass('active-variant');
              $('.uie-source-label').hide().empty();
          }

        } else if (response.success) {
          $('.uie-variant-scroll').append('<p>No variants yet. Click "Save as Variant" to create one.</p>');
        } else {
          $('.uie-variant-scroll').append(`<p>Error loading variants: ${response.error || 'Unknown server error'}</p>`);
        }
        variantsInitiallyLoadedForMaster = true; 
        $('.variants-loading').hide(); // Hide loader on success
      },
      error: function(jqXHR, textStatus, errorThrown) {
        $('.uie-variant-scroll').empty().append('<p>AJAX error loading variants.</p>');
        $('.variants-loading').hide(); // Hide loader on error
        variantsInitiallyLoadedForMaster = true; 
      }
    });
  };
  
  const applyVariantStateToEditor = async (variantId, variantDetails, variantAdminTitle, isPreload = false) => {
    console.log("applyVariantStateToEditor called for variantId:", variantId, "isPreload:", isPreload);
    currentVariantId = variantId;
    isEditingMaster = false;
    console.log("applyVariantStateToEditor: Set isEditingMaster=false, currentVariantId=", currentVariantId);


    if (!activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
        showNotification("Base physical image not ready to apply variant.", "error");
        return;
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

    $('.uie-title-input').val(variantAdminTitle || `Variant ${variantId}`);
    $('.uie-caption').val(variantDetails.caption || '');
    $('.uie-alt-text').val(variantDetails.altText || '');
    $('#uie-source-url-input').val(currentMasterSourceUrl);
    $('#uie-attribution-input').val(currentMasterAttribution);
    
    updateActionButtons(); 

    $('#uie-source-thumbnail-box').removeClass('active-variant');
    $('.uie-variant-box').removeClass('active-variant');
    $(`.uie-variant-box[data-variant-id="${variantId}"]`).addClass('active-variant');
    $('.uie-source-label').show().html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);

    initializeCropperInstance(masterImageSrcForCropper, {
        crop: variantDetails.crop,
        filters: variantDetails.filters
    }, { refreshVariants: isPreload }); 

    showNotification(`Variant ${currentVariantId} loaded for editing.`, "info");
};


  const bindVariantSelectionEvents = () => {
    $('.uie-variant-scroll').off('click.variantBox').on('click.variantBox', '.uie-variant-box', async function() {
      const $this = $(this);
      const clickedVariantId = $this.data('variant-id');
      
      const selectedVariantData = cachedVariantsForCurrentMaster.find(v => String(v.id) === String(clickedVariantId));

      if (!selectedVariantData) {
          showNotification("Error: Could not find data for the selected variant.", "error");
          const variantDetailsString = $this.data('variant-details');
          const variantAdminTitleFallback = $this.data('variant-title') || $this.find('.uie-variant-caption').text();
          try {
              const detailsToParse = typeof variantDetailsString === 'string' ? variantDetailsString : JSON.stringify(variantDetailsString);
              const fallbackDetails = JSON.parse(detailsToParse.replace(/&apos;/g, "'"));
              console.warn("Using fallback details from data-attribute for variant:", clickedVariantId);
              await applyVariantStateToEditor(clickedVariantId, fallbackDetails, variantAdminTitleFallback, false); // isPreload is false for clicks within UIE
          } catch (e) {
              console.error("Completely failed to get variant details for ID:", clickedVariantId, e);
              showNotification("Error loading variant details. Check console.", "error");
          }
          return;
      }

      const variantAdminTitle = selectedVariantData.variant_type || `Variant ${selectedVariantData.id}`;
      let variantDetails;
      try {
          variantDetails = typeof selectedVariantData.variant_details === 'string' ? 
                           JSON.parse(selectedVariantData.variant_details.replace(/&apos;/g, "'")) : 
                           selectedVariantData.variant_details; 
      } catch (e) {
          console.error("Error parsing variant details from cache for variant ID:", selectedVariantData.id, e, "Raw data:", selectedVariantData.variant_details);
          showNotification("Error loading variant details. Check console.", "error");
          return;
      }
      
      await applyVariantStateToEditor(clickedVariantId, variantDetails, variantAdminTitle, false); // isPreload is false for clicks within UIE
    });
  };


  const bindStaticEvents = () => {
    $(document).off('click.uieClose').on('click.uieClose', '.uie-close-button', () => { closeEditor(); });

    $(document).off('click.uieSourceThumb').on('click.uieSourceThumb', '#uie-source-thumbnail-box', function() {
        resetEditorToMasterState(true); 
        showNotification("Editing master/source image.", "info");
    });

    $(document).off('click.uieReset').on('click.uieReset', '.uie-reset-icon-container, .uie-reset-btn', async function() {
        const resetTarget = $(this).data('reset-for');
        if (!resetTarget) return;

        if (!cropper && (resetTarget !== 'filters')) { 
            showNotification("Editor not ready for reset.", "warning"); return;
        }
        if ((resetTarget !== 'filters') && (!cropper || !cropper.ready)) { 
             showNotification("Editor (Cropper) not ready for reset action.", "warning"); return;
        }

        switch (resetTarget) {
            case "zoom": 
                if (cropper && cropper.ready) {
                    cropper.zoomTo(initialZoomRatio); 
                    $(".uie-slider[data-cropper='zoom']").val(0); 
                }
                break;
            case "brightness": $('.uie-slider[data-filter="brightness"]').val(100).trigger('input').trigger('change'); break;
            case "contrast":   $('.uie-slider[data-filter="contrast"]').val(100).trigger('input').trigger('change'); break;
            case "saturation": $('.uie-slider[data-filter="saturation"]').val(100).trigger('input').trigger('change'); break;
            case "hue":        $('.uie-slider[data-filter="hue"]').val(0).trigger('input').trigger('change'); break;
            
            case "crop": 
            case "cropzoom": 
                if (cropper && cropper.ready) {
                    console.log("--- CROP/ZOOM RESET START ---");
                    cropper.reset();
                    if (effectiveCropperSourceDimensions.width > 0 && effectiveCropperSourceDimensions.height > 0) {
                        cropper.setData({
                            x: 0, y: 0,
                            width: effectiveCropperSourceDimensions.width,
                            height: effectiveCropperSourceDimensions.height,
                            rotate: 0, scaleX: 1, scaleY: 1
                        });
                    }
                    if (initialZoomRatio > 0 && initialZoomRatio !== Infinity ) {
                        cropper.zoomTo(initialZoomRatio);
                    } else { /* ... fallback zoom ... */ }
                    
                    const container = cropper.getContainerData(); 
                    const canvasDataAfterZoom = cropper.getCanvasData();
                    cropper.setCanvasData({
                        left: (container.width - canvasDataAfterZoom.width) / 2,
                        top: (container.height - canvasDataAfterZoom.height) / 2,
                        width: canvasDataAfterZoom.width,
                        height: canvasDataAfterZoom.height
                    });
                    setTimeout(() => {
                        if (!cropper || !cropper.ready) return;
                        const finalCanvasDataForCropBox = cropper.getCanvasData(); 
                        if (finalCanvasDataForCropBox.width > 0 && finalCanvasDataForCropBox.height > 0) {
                            cropper.setCropBoxData({
                                left: finalCanvasDataForCropBox.left,
                                top: finalCanvasDataForCropBox.top,
                                width: finalCanvasDataForCropBox.width,
                                height: finalCanvasDataForCropBox.height
                            });
                        }
                        updateDisplayedDimensions();
                    }, 10); 
                    $('.uie-slider[data-cropper="zoom"]').val(0); 
                    isAspectRatioLocked = false; currentLockedAspectRatio = NaN;
                    updateAspectRatioLockButton();
                    if(cropper.ready) cropper.setAspectRatio(NaN); 
                    if (resetTarget === "crop") { 
                        $('.uie-slider[data-filter="brightness"]').val(100).trigger('input').trigger('change');
                        $('.uie-slider[data-filter="contrast"]').val(100).trigger('input').trigger('change');
                        $('.uie-slider[data-filter="saturation"]').val(100).trigger('input').trigger('change');
                        $('.uie-slider[data-filter="hue"]').val(0).trigger('input').trigger('change');
                        showNotification("Crop & Filters reset.", "info");
                    } else {
                        showNotification("Crop & Zoom reset.", "info");
                    }
                    console.log("--- CROP/ZOOM RESET END ---");
                }
                break;
            case "position":
                 if (cropper && cropper.ready) { /* ... center logic ... */ }
                break;
            case "filters": 
                $('.uie-slider[data-filter="brightness"]').val(100).trigger('input').trigger('change');
                $('.uie-slider[data-filter="contrast"]').val(100).trigger('input').trigger('change');
                $('.uie-slider[data-filter="saturation"]').val(100).trigger('input').trigger('change');
                $('.uie-slider[data-filter="hue"]').val(0).trigger('input').trigger('change');
                showNotification("Filters cleared.", "info");
                break;
        }
    });

    $(document).off('click.uieAspectLock').on('click.uieAspectLock', '.uie-aspect-lock-btn', function() { /* ... existing aspect lock logic ... */ });
    $('.uie-slider[data-filter]').off('input.filter change.filter').on('input.filter', function() { /* ... existing filter slider logic ... */ })
                                 .on('change.filter', function() { debouncedUpdateThumbnails(); });
    $('.uie-slider[data-cropper="zoom"]').off('input.zoom change.zoom').on('input.zoom', function() { /* ... existing zoom slider logic ... */ })
                                     .on('change.zoom', function() { debouncedUpdateThumbnails(); });

    // --- Save/Update Button Event Handlers ---
    $(document).off('click.uieSaveMasterDetails').on('click.uieSaveMasterDetails', '.uie-save-master-details-button', function() {
        if (!isEditingMaster || !currentMediaAssetId) return;
        const newAdminTitle = $('.uie-title-input').val();
        const newPublicCaption = $('.uie-caption').val(); 
        const newAltText = $('.uie-alt-text').val();     
        const newSourceUrl = $('#uie-source-url-input').val();
        const newAttribution = $('#uie-attribution-input').val();

        $.ajax({
            url: 'ajax/updateMediaAssetDetails.php', type: 'POST',
            data: {
                media_asset_id: currentMediaAssetId, admin_title: newAdminTitle, 
                title: newAdminTitle, public_caption: newPublicCaption, alt_text: newAltText,
                source_url: newSourceUrl, attribution: newAttribution
            },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    showNotification('Master asset details updated!', 'success');
                    currentMediaAssetAdminTitle = newAdminTitle; 
                    currentMasterPublicCaption = newPublicCaption; 
                    currentMasterAltText = newAltText;         
                    currentMasterSourceUrl = newSourceUrl;
                    currentMasterAttribution = newAttribution;
                    $('#uie-source-thumbnail-box .uie-box-caption').text(currentMediaAssetAdminTitle);
                    if ($('.uie-source-label').is(':visible') && !isEditingMaster) { 
                        $('.uie-source-label').html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);
                    }
                    if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback(); 
                } else { showNotification('Error updating master: ' + (response.error || 'Failed.'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX Error updating master: ' + ts, 'error')
        });
    });

    $(document).off('click.uieSaveAsVariant').on('click.uieSaveAsVariant', '.uie-save-as-variant-button', function() {
        if (!isEditingMaster || !cropper || !cropper.ready || !currentMediaAssetId) {
             showNotification("Please ensure you are editing the master image to save a new variant from it.", "info");
            return;
        }
        const cropData = cropper.getData(true); 
        const filters = getCurrentUserAdjustedFiltersObject(); 
        const caption = $('.uie-caption').val(); 
        const altText = $('.uie-alt-text').val();   
        
        const details = JSON.stringify({ crop: cropData, filters: filters, caption: caption, altText: altText });
        const title = ($('.uie-title-input').val() || currentMediaAssetAdminTitle || "Image") + " - Variant"; 
        
        $.ajax({
            url: 'ajax/saveMediaVariant.php', type: 'POST',
            data: { media_asset_id: currentMediaAssetId, variant_type: title, variant_details: details },
            dataType: 'json',
            success: function(response) {
              if (response.success && response.variant_id) {
                showNotification(`New Variant ${response.variant_id} saved!`, 'success');
                loadAndDisplayVariants(currentMediaAssetId); 
                
                currentVariantId = response.variant_id;
                isEditingMaster = false; 
                
                $('.uie-title-input').val(title); 
                updateActionButtons();
                
                $('.uie-variant-box').removeClass('active-variant');
                $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
                $('#uie-source-thumbnail-box').removeClass('active-variant');

                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error: ' + (response.error || 'Could not save new variant.'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX Error saving new variant: ' + ts, 'error')
        });
    });

    $(document).off('click.uieUpdateVariant').on('click.uieUpdateVariant', '.uie-update-variant-button', function() {
        if (isEditingMaster || !currentVariantId || !cropper || !cropper.ready || !currentMediaAssetId) return;
        const cropData = cropper.getData(true); 
        const filters = getCurrentUserAdjustedFiltersObject(); 
        const title = $('.uie-title-input').val(); 
        const caption = $('.uie-caption').val();
        const altText = $('.uie-alt-text').val();
        const details = JSON.stringify({ crop: cropData, filters, caption, altText });
        $.ajax({
            url: 'ajax/updateMediaVariant.php', type: 'POST',
            data: {
                variant_id: currentVariantId, media_asset_id: currentMediaAssetId, 
                variant_type: title, variant_details: details
            },
            dataType: 'json',
            success: function(response) {
              if (response.success) {
                showNotification(`Variant ${currentVariantId} updated!`, 'success');
                const variantIndex = cachedVariantsForCurrentMaster.findIndex(v => String(v.id) === String(currentVariantId));
                if (variantIndex > -1) {
                    cachedVariantsForCurrentMaster[variantIndex].variant_type = title;
                    cachedVariantsForCurrentMaster[variantIndex].variant_details = details; 
                }
                updateVariantThumbnailInStrip(currentVariantId, { crop: cropData, filters });
                const $variantBox = $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`);
                $variantBox.data('variant-details', details.replace(/'/g, "&apos;")) 
                           .data('variant-title', title.replace(/"/g, "&quot;"))
                           .find('.uie-variant-caption').text(title);
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error updating variant: ' + (response.error || 'Failed.'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX Error updating variant: ' + ts, 'error')
        });
    });

    $(document).off('click.uieSaveAsNewVariantFromExisting').on('click.uieSaveAsNewVariantFromExisting', '.uie-save-as-new-variant-button', function() {
        if (isEditingMaster || !currentVariantId || !cropper || !cropper.ready || !currentMediaAssetId) return;
        const cropData = cropper.getData(true); 
        const filters = getCurrentUserAdjustedFiltersObject(); 
        const title = ($('.uie-title-input').val() || "Forked Variant") + " (copy)"; 
        const caption = $('.uie-caption').val(); 
        const altText = $('.uie-alt-text').val();   
        const details = JSON.stringify({ crop: cropData, filters, caption, altText });
        $.ajax({
            url: 'ajax/saveMediaVariant.php', type: 'POST', 
            data: { media_asset_id: currentMediaAssetId, variant_type: title, variant_details: details },
            dataType: 'json',
            success: function(response) {
              if (response.success && response.variant_id) {
                showNotification(`New Variant ${response.variant_id} (forked) saved!`, 'success');
                loadAndDisplayVariants(currentMediaAssetId); 
                currentVariantId = response.variant_id; 
                $('.uie-title-input').val(title); 
                updateActionButtons();
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error forking variant: ' + (response.error || 'Failed.'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX Error forking variant: ' + ts, 'error')
        });
    });

    $(document).off('click.uieSaveNewImage').on('click.uieSaveNewImage', '.uie-save-as-new-image-button', function() {
        if (!isCurrentMasterPhysical) { 
            showNotification("'Save as New Image' is only available when the current master image is a physical asset.", "warning");
            return;
        }
        if (!cropper || !cropper.ready) {
            showNotification("Editor not ready to save new image.", "error"); return;
        }
        const cropData = cropper.getData(true); 
        const filters = getCurrentUserAdjustedFiltersObject();
        const title = $('.uie-title-input').val(); 
        const caption = $('.uie-caption').val();
        const altText = $('.uie-alt-text').val();
        const sourceUrlForNewVM = $('#uie-source-url-input').val(); 
        const attributionForNewVM = $('#uie-attribution-input').val();
        
        $.ajax({
            url: 'ajax/saveNewImage.php', type: 'POST',
            data: {
                source_media_asset_id: currentPhysicalSourceAssetId, 
                current_crop_json: JSON.stringify(cropData), 
                current_filters_json: JSON.stringify(filters), 
                new_admin_title: title, 
                new_public_caption: caption,
                new_alt_text: altText, 
                new_source_url: sourceUrlForNewVM, 
                new_attribution: attributionForNewVM 
            },
            dataType: 'json',
            success: function(response) {
                if (response.success && response.media && response.media.id) {
                    showNotification('New Virtual Master Image (ID: ' + response.media.id + ') created!', 'success');
                    if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback(); 
                    openEditor(
                        response.media.image_url, response.media,           
                        onVariantSavedOrUpdatedCallback, onEditorClosedCallback
                    );
                } else { showNotification('Error creating new virtual master: ' + (response.error || 'Unknown'), 'error'); }
            }, error: (jqXHR, ts) => showNotification('AJAX error creating new virtual master: ' + ts, 'error')
        });
    });
  }; // End of bindStaticEvents

  return { openEditor, closeEditor };
})();
