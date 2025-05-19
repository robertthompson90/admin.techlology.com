// UnifiedImageEditor.js – With Virtual Masters, refined variant workflow, preview generation, and crop fixes.
// Version 2.19 (Continued - Layout Restructure)

const UnifiedImageEditor = (() => {
  'usestrict';

  let cropper = null;
  let initialZoomRatio = 1; 
  let presetsData = [];

  // State variables for new controls
  let isAspectRatioLocked = false;
  let currentLockedAspectRatio = NaN;

  let currentMediaAssetId = null;
  let currentMediaAssetAdminTitle = ''; 
  let currentMasterPublicCaption = '';  
  let currentMasterAltText = '';        
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
        eCtx.fillText('No Preview', maxWidth/2, maxHeight/2);
        return emptyCanvas;
    }
    const scale = Math.min(maxWidth / srcW, maxHeight / srcH);
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
            return reject("Physical base image not ready for preview generation.");
        }

        let stage1Canvas = document.createElement('canvas');
        let stage1Ctx = stage1Canvas.getContext('2d');

        const cropForStage1 = masterDefaultCrop || { x: 0, y: 0, width: physicalImageElementForPreview.naturalWidth, height: physicalImageElementForPreview.naturalHeight };
        if (cropForStage1.width <= 0 || cropForStage1.height <= 0) return reject("Master default crop has zero or negative dimensions.");

        stage1Canvas.width = cropForStage1.width;
        stage1Canvas.height = cropForStage1.height;

        if (masterDefaultFilters) {
            stage1Ctx.filter = getCssFilterString(masterDefaultFilters);
        }
        stage1Ctx.drawImage(physicalImageElementForPreview, cropForStage1.x, cropForStage1.y, cropForStage1.width, cropForStage1.height, 0, 0, cropForStage1.width, cropForStage1.height);

        if (!variantSpecificCrop && !variantSpecificFilters) {
            resolve(stage1Canvas);
            return;
        }

        let stage2Canvas = document.createElement('canvas');
        let stage2Ctx = stage2Canvas.getContext('2d');

        const cropForStage2 = variantSpecificCrop || { x: 0, y: 0, width: stage1Canvas.width, height: stage1Canvas.height };
        if (cropForStage2.width <= 0 || cropForStage2.height <= 0) return reject("Variant specific crop has zero or negative dimensions.");

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
            $('#uie-current-dims').text(`${cropData.width}px × ${cropData.height}px`);
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
      // Main container with new structure: uie-editor-body is now the main flex row container
      const editorHTML = `
        <div id="uie-overlay" class="uie-container hidden">
          <header class="uie-header">
            <span class="uie-source-label" style="display:none; margin-right: 5px; color: #aaa;"></span>
            <input type="text" class="uie-title-input" value="Image Title">
            <button class="uie-close-button">X</button>
          </header>

          <div class="uie-editor-body"> <div class="uie-main-image-and-variants-column"> <div class="uie-left-column"> <div class="uie-image-editing">
                  <img id="uie-image" src="" alt="Editable Image">
                </div>
              </div>
              <div class="uie-variant-strip"> <div class="uie-variant-source">
                  <div class="uie-panel-header">Source</div>
                  <div class="uie-thumbnail uie-box" id="uie-source-thumbnail-box">
                     <div class="image-container"><img class="uie-box-img" src="" alt="Source Thumbnail"></div>
                     <span class="uie-variant-caption uie-box-caption">Source Image</span> 
                  </div>
                </div>
                <div class="uie-variant-thumbnails">
                  <div class="uie-panel-header">Variants</div>
                  <div class="uie-variant-scroll"></div>
                </div>
              </div>
            </div>

            <div class="uie-right-column"> <div class="uie-panel uie-metadata-panel">
                <div class="uie-panel-header">Metadata (Public)</div> 
                <div class="uie-panel-content">
                  <label for="uie-caption-input" class="uie-metadata-label">Caption:</label>
                  <textarea id="uie-caption-input" class="uie-caption" placeholder="Public caption for this image/variant..."></textarea>
                  <label for="uie-alt-text-input" class="uie-metadata-label">Alt Text:</label>
                  <input type="text" id="uie-alt-text-input" class="uie-alt-text" placeholder="Descriptive alt text...">
                </div>
              </div>
              <div class="uie-panel uie-tags-panel">
                <div class="uie-panel-header">Tags (Global)</div>
                <div class="uie-panel-content">
                  <input type="text" class="uie-tag-input" placeholder="Add tag...">
                  <div class="uie-tag-list"></div>
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
                    <div class="uie-presets-row uie-filter-presets"><div class="uie-subpanel-header">Filter Presets</div><div class="uie-presets-scroll"></div></div>
                    <div class="uie-presets-row uie-crop-presets"><div class="uie-subpanel-header">Crop Presets</div><div class="uie-presets-scroll"></div></div>
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
          if (isCurrentMasterPhysical) { // Only show "Save as New Image" if master is physical
            $saveNewImageBtn.show(); 
          }
          $('.uie-source-label').hide().empty(); 
          $('#uie-source-thumbnail-box').addClass('active-variant'); 
          $('.uie-variant-box').removeClass('active-variant'); 
      } else { // Editing a variant
          $('.uie-update-variant-button').show().text(`Update Variant Details`); 
          $('.uie-save-as-new-variant-button').show();
          if (isCurrentMasterPhysical) { // Only show "Save as New Image" if variant's master is physical
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
        if (!currentImageData || !effectiveCropperSourceDimensions.width) return;

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
    $.ajax({
      url: 'ajax/getMediaPresets.php',
      method: 'GET',
      dataType: 'json',
      success: function(response) {
        presetsData = response;
        $('.uie-filter-presets .uie-presets-scroll').empty();
        $('.uie-crop-presets .uie-presets-scroll').empty();
        if (!cropper || !cropper.ready) {
            console.warn("loadMediaPresets: Cropper not ready for preset thumbnails.");
            return;
        }
        response.forEach(function(preset) {
          generatePresetThumbnail(preset).then(function(dataUrl) {
            const presetBox = `
              <div id="preset_${preset.id}" class="uie-preset-box uie-box" data-preset-id="${preset.id}" data-preset-type="${preset.type}" data-preset-details='${preset.preset_details.replace(/'/g, "&apos;")}'>
                <div class="image-container"><img class="uie-box-img" src="${dataUrl}" alt="${preset.name}"></div>
                <span class="uie-preset-caption uie-box-caption">${preset.name}</span>
              </div>`;
            if (preset.type === 'filter') {
              $('.uie-filter-presets .uie-presets-scroll').append(presetBox);
            } else if (preset.type === 'crop') {
              $('.uie-crop-presets .uie-presets-scroll').append(presetBox);
            }
          }).catch(function(err) {
            console.error("Error generating thumbnail for preset:", preset.name, err);
             const errorBox = `
              <div id="preset_${preset.id}" class="uie-preset-box uie-box" data-preset-id="${preset.id}" title="Error loading preview">
                <div class="image-container" style="background:#500; color:white; display:flex; align-items:center; justify-content:center; font-size:0.7em; text-align:center;">Preview Error</div>
                <span class="uie-preset-caption uie-box-caption">${preset.name}</span>
              </div>`;
            if (preset.type === 'filter') $('.uie-filter-presets .uie-presets-scroll').append(errorBox);
            else if (preset.type === 'crop') $('.uie-crop-presets .uie-presets-scroll').append(errorBox);
          });
        });
        setupPresetSorting();
      },
      error: function(err) {
        console.error("Error loading media presets:", err);
      }
    });
  };

  const generatePresetThumbnail = (preset) => {
    return new Promise((resolve, reject) => {
      if (!cropper || !cropper.ready) {
        return reject("generatePresetThumbnail: Cropper not ready.");
      }
      let sourceCanvasForPresetThumb; 
      try {
        sourceCanvasForPresetThumb = cropper.getCroppedCanvas();
         if (!sourceCanvasForPresetThumb) return reject("generatePresetThumbnail: Could not get cropped canvas (null).");
      } catch (e) {
        return reject("generatePresetThumbnail: Error getting cropped canvas: " + e.message);
      }

       if (preset.type === 'filter') {
        try {
          const details = JSON.parse(preset.preset_details);
          const presetFilterValues = { 
            brightness: details.brightness || 100,
            contrast: details.contrast || 100,
            saturation: details.saturation || 100,
            hue: details.hue || 0
          };
          let tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = sourceCanvasForPresetThumb.width;
          tmpCanvas.height = sourceCanvasForPresetThumb.height;
          let tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.filter = getCssFilterString(presetFilterValues); 
          tmpCtx.drawImage(sourceCanvasForPresetThumb, 0, 0); 
          
          const thumbCanvas = generateScaledThumbnail(tmpCanvas);
          resolve(thumbCanvas.toDataURL());
        } catch (err) {
          console.error("Error parsing filter preset details for '" + preset.name + "':", err, preset.preset_details);
          reject(err);
        }
      } else if (preset.type === 'crop') {
        try {
          const details = JSON.parse(preset.preset_details);
          const aspectRatioStr = details.aspect_ratio;
          const parts = aspectRatioStr.split(':');
          const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);

          const baseImageForCropPreset = new Image();
          baseImageForCropPreset.onload = () => {
            let tempCroppedCanvas = document.createElement('canvas');
            let tempCroppedCtx = tempCroppedCanvas.getContext('2d');
            
            let newCropWidth, newCropHeight, newCropX, newCropY;

            if (baseImageForCropPreset.width / baseImageForCropPreset.height > targetRatio) {
                newCropHeight = baseImageForCropPreset.height;
                newCropWidth = newCropHeight * targetRatio;
            } else {
                newCropWidth = baseImageForCropPreset.width;
                newCropHeight = newCropWidth / targetRatio;
            }
            newCropX = (baseImageForCropPreset.width - newCropWidth) / 2;
            newCropY = (baseImageForCropPreset.height - newCropHeight) / 2;

            tempCroppedCanvas.width = newCropWidth;
            tempCroppedCanvas.height = newCropHeight;
            tempCroppedCtx.drawImage(baseImageForCropPreset, newCropX, newCropY, newCropWidth, newCropHeight, 0, 0, newCropWidth, newCropHeight);

            const thumbCanvas = generateScaledThumbnail(tempCroppedCanvas);
            resolve(thumbCanvas.toDataURL());
          };
          baseImageForCropPreset.onerror = () => reject("Failed to load effectiveCropperSource for crop preset thumbnail");
          baseImageForCropPreset.src = effectiveCropperSource; 

        } catch (err) {
          console.error("Error parsing crop preset details for '" + preset.name + "':", err, preset.preset_details);
          reject(err);
        }
      } else {
        reject("Unknown preset type: " + preset.type);
      }
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
    updatePresetThumbnails();
  }, 300); 

  const updatePresetThumbnails = () => {
    $('.uie-preset-box').each(function() {
      let $box = $(this);
      let presetId = $box.data('preset-id');
      let preset = presetsData.find(p => String(p.id) === String(presetId));
      if (!preset) {
        return;
      }

      generatePresetThumbnail(preset).then(function(dataUrl) {
        $box.find('.uie-box-img').attr('src', dataUrl);
      }).catch(function(err) {
        console.error("Error updating preset thumbnail for ID:", presetId, err);
         $box.find('.image-container').html('Preview Error').css({'background':'#500', 'color':'white', 'display':'flex', 'align-items':'center', 'justify-content':'center', 'font-size':'0.7em', 'text-align':'center'});
      });
    });
  };

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
                    if (!isNaN(newAspectRatio)) {
                        cropper.setAspectRatio(newAspectRatio);
                        const imageData = cropper.getImageData(); 
                        
                        let newCropBoxWidth, newCropBoxHeight;
                        if (imageData.width / imageData.height > newAspectRatio) {
                           newCropBoxHeight = imageData.height;
                           newCropBoxWidth = newCropBoxHeight * newAspectRatio;
                        } else {
                           newCropBoxWidth = imageData.width;
                           newCropBoxHeight = newCropBoxWidth / newAspectRatio;
                        }
                        cropper.setCropBoxData({
                            left: (imageData.width - newCropBoxWidth) / 2 + imageData.left,
                            top: (imageData.height - newCropBoxHeight) / 2 + imageData.top,
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

  const initializeCropperInstance = (imageSrcForCropper, initialSettings = null) => {
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
            viewMode: 1, 
            movable: true, scalable: true, zoomable: true,
            cropBoxResizable: true, responsive: true, guides: false,
            zoomOnWheel: true,
            wheelZoomRatio: 0.1,
            minCropBoxWidth: 10,
            minCropBoxHeight: 10,
            crop: function(event) {
                debouncedUpdateThumbnails(); 
                updateDisplayedDimensions(); 
            },
            ready: function() {
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
                if (imageW > 0) { // Use imageW (natural width of effectiveCropperSource)
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
                    console.log("Applying variant's initial settings (crop & implied zoom/pan):", initialSettings.crop);
                    cropper.setData(initialSettings.crop); 
                } else {
                    console.log("Applying full crop box for master/virtual master.");
                    cropper.setCropBoxData({ left: 0, top: 0, width: imageW,  height: imageH });
                    if(!initialSettings) { 
                        cropper.zoomTo(initialZoomRatio); // Re-ensure fit zoom for master
                    }
                }
                
                const currentImageData = cropper.getImageData();
                if (currentImageData.naturalWidth > 0) { 
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
                loadMediaPresets(); 
                loadAndDisplayVariants(currentMediaAssetId);
                bindPresetEvents();
                updateActionButtons(); 
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
    
    $('.uie-title-input').val(currentMediaAssetAdminTitle); 
    $('.uie-caption').val(currentMasterPublicCaption); 
    $('.uie-alt-text').val(currentMasterAltText);   

    if (!activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
        showNotification("Cannot reset to master: Base physical image not loaded.", "error");
        return;
    }

    let imageSrcForCropperToUse;

    if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) { // Check if it's a virtual master
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
    
    initializeCropperInstance(imageSrcForCropperToUse, null); 
  };


  const openEditor = async (physicalImgUrl, assetDataObj, saveCb, closedCb) => {
    ensureOverlayExists();

    currentMediaAssetId = assetDataObj.id;
    currentMediaAssetAdminTitle = assetDataObj.admin_title || assetDataObj.title || `Image ${assetDataObj.id}`; 
    currentMasterPublicCaption = assetDataObj.public_caption || assetDataObj.caption || '';
    currentMasterAltText = assetDataObj.alt_text || '';

    isCurrentMasterPhysical = (!assetDataObj.physical_source_asset_id || 
                             assetDataObj.physical_source_asset_id === assetDataObj.id ||
                             assetDataObj.physical_source_asset_id === null); // Added null check for safety
    console.log("Opening asset ID:", assetDataObj.id, "Is master physical?", isCurrentMasterPhysical, "Phys Src ID:", assetDataObj.physical_source_asset_id);


    currentMediaAssetUrl = physicalImgUrl; 
    currentPhysicalSourceAssetId = assetDataObj.physical_source_asset_id || assetDataObj.id;

    try {
        currentAssetDefaultCrop = (assetDataObj.default_crop && assetDataObj.default_crop !== "null" && assetDataObj.default_crop.trim() !== "") ? JSON.parse(assetDataObj.default_crop) : null;
        currentAssetDefaultFilters = (assetDataObj.filter_state && assetDataObj.filter_state !== "null" && assetDataObj.filter_state.trim() !== "") ? JSON.parse(assetDataObj.filter_state) : null;
    } catch (e) {
        console.error("Error parsing default crop/filter state for asset:", assetDataObj.id, e);
        currentAssetDefaultCrop = null;
        currentAssetDefaultFilters = null;
    }

    onVariantSavedOrUpdatedCallback = saveCb;
    onEditorClosedCallback = closedCb;

    isEditingMaster = true; 
    currentVariantId = null;

    $('#uie-source-thumbnail-box .uie-box-img').attr('src', currentMediaAssetUrl).attr('alt', 'Physical Source Thumbnail');
    $('#uie-source-thumbnail-box .uie-box-caption').text(currentMediaAssetAdminTitle); 
    $('.uie-variant-scroll').empty().html('<p>Loading image for variants...</p>');
    
    $('.uie-title-input').val(currentMediaAssetAdminTitle); 
    $('.uie-caption').val(currentMasterPublicCaption);
    $('.uie-alt-text').val(currentMasterAltText);


    const imagePreloader = new Image();
    imagePreloader.crossOrigin = "Anonymous"; 

    imagePreloader.onload = async function() { 
        if (this.naturalWidth === 0 || this.naturalHeight === 0) {
            showNotification("Error: Preloaded physical image data is invalid (zero dimensions).", "error");
            if (typeof onEditorClosedCallback === 'function') onEditorClosedCallback();
            return;
        }
        activeBaseImageElement = this; 
        console.log("Physical source image preloaded:", activeBaseImageElement.src, activeBaseImageElement.width, activeBaseImageElement.height);

        let imageSrcToLoadInCropper;
        
        if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) { 
            console.log("Opening Virtual Master: Preparing processed canvas with baked-in defaults.");
            try {
                imageSrcToLoadInCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
            } catch (processingError) {
                console.error("Failed to process virtual master defaults:", processingError);
                showNotification("Error applying virtual master defaults. Loading physical image.", "warning");
                imageSrcToLoadInCropper = currentMediaAssetUrl; 
                effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
            }
        } else { // Physical Master
            console.log("Opening Physical Master (or VM without defaults to bake).");
            imageSrcToLoadInCropper = currentMediaAssetUrl;
            effectiveCropperSourceDimensions = { width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight };
        }
        
        $('#uie-overlay').removeClass('hidden').fadeIn(300, () => {
            initializeCropperInstance(imageSrcToLoadInCropper, null); 
        });
    };

    imagePreloader.onerror = function() {
        console.error("Failed to preload physical source image:", currentMediaAssetUrl);
        showNotification("Error: Could not load the main image. Editor cannot open.", "error");
        activeBaseImageElement = null;
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
    $('#uie-overlay').fadeOut(300, function() { $(this).addClass('hidden'); });
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
            .then(previewCanvas => generateScaledThumbnail(previewCanvas))
            .then(scaledThumbCanvas => {
                $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL());
            })
            .catch(err => {
                console.error("Error generating preview for variant box update:", variantId, err);
                $variantBox.find('.image-container').html('Preview Error').css({'background':'#500', 'color':'white'});
            });
    } else {
        console.warn("Could not update variant thumbnail in strip. Variant box or base image not ready. Variant ID:", variantId);
    }
  };


  const loadAndDisplayVariants = (mediaAssetIdToLoad) => {
    if (!mediaAssetIdToLoad) {
        $('.uie-variant-scroll').empty().append('<p>No image selected.</p>');
        return;
    }
    if (!activeBaseImageElement || !activeBaseImageElement.complete || !activeBaseImageElement.naturalWidth) {
        $('.uie-variant-scroll').empty().append('<p>Base image not ready for variant previews.</p>');
        console.warn("loadAndDisplayVariants: activeBaseImageElement not ready.");
        return;
    }
    $('.uie-variant-scroll').empty().html('<p>Loading variants...</p>');

    $.ajax({
      url: 'ajax/getMediaVariants.php',
      type: 'GET',
      data: { media_asset_id: mediaAssetIdToLoad }, 
      dataType: 'json',
      success: function(response) {
        $('.uie-variant-scroll').empty();
        if (response.success && response.variants && response.variants.length > 0) {
          response.variants.forEach(variant => {
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
                activeBaseImageElement,         
                currentAssetDefaultCrop,        
                currentAssetDefaultFilters,     
                variantDetailsParsed.crop,      
                variantDetailsParsed.filters    
            )
            .then(previewCanvas => generateScaledThumbnail(previewCanvas))
            .then(scaledThumbCanvas => {
                $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL());
            })
            .catch(err => {
                 console.error("Error generating preview for variant box:", variant.id, err);
                 $variantBox.find('.image-container').html('Preview Error').css({'background':'#500', 'color':'white'});
            });
          });
          bindVariantSelectionEvents();

          if (!isEditingMaster && currentVariantId) {
            $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
          } else if (isEditingMaster) { 
            $('#uie-source-thumbnail-box').addClass('active-variant');
          }

        } else if (response.success) {
          $('.uie-variant-scroll').append('<p>No variants yet. Click "Save as Variant" to create one.</p>');
        } else {
          $('.uie-variant-scroll').append(`<p>Error loading variants: ${response.error || 'Unknown server error'}</p>`);
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        $('.uie-variant-scroll').empty().append('<p>AJAX error loading variants.</p>');
      }
    });
  };

  const bindVariantSelectionEvents = () => {
    $('.uie-variant-scroll').off('click.variantBox').on('click.variantBox', '.uie-variant-box', async function() {
      const $this = $(this);
      
      $('#uie-source-thumbnail-box').removeClass('active-variant');
      $('.uie-variant-box').removeClass('active-variant');
      $this.addClass('active-variant'); 

      currentVariantId = $this.data('variant-id');
      isEditingMaster = false; 
      const variantDetailsString = $this.data('variant-details');
      const variantAdminTitle = $this.data('variant-title') || $this.find('.uie-variant-caption').text(); 


      try {
        const detailsToParse = typeof variantDetailsString === 'string' ? variantDetailsString : JSON.stringify(variantDetailsString);
        const variantDetails = JSON.parse(detailsToParse.replace(/&apos;/g, "'"));

        if (!activeBaseImageElement || !activeBaseImageElement.complete || activeBaseImageElement.naturalWidth === 0) {
            showNotification("Base physical image not ready to apply variant.", "error");
            return;
        }
        
        let masterImageSrcForCropper;
        if (!isCurrentMasterPhysical && (currentAssetDefaultCrop || currentAssetDefaultFilters)) { 
            console.log("Variant's master is a Virtual Master. Processing master's defaults for Cropper base.");
            masterImageSrcForCropper = await getProcessedVirtualMasterCanvasDataUrl(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters);
        } else { 
            console.log("Variant's master is Physical. Using direct physical URL for Cropper base.");
            masterImageSrcForCropper = currentMediaAssetUrl;
            if(!effectiveCropperSourceDimensions.width && activeBaseImageElement) { 
                effectiveCropperSourceDimensions = {width: activeBaseImageElement.naturalWidth, height: activeBaseImageElement.naturalHeight};
            }
        }
        
        $('.uie-title-input').val(variantAdminTitle); 
        $('.uie-caption').val(variantDetails.caption || ''); 
        $('.uie-alt-text').val(variantDetails.altText || ''); 
        updateActionButtons(); 
        
        initializeCropperInstance(masterImageSrcForCropper, {
            crop: variantDetails.crop, 
            filters: variantDetails.filters 
        });
        showNotification(`Variant ${currentVariantId} loaded.`, "info");

      } catch (e) {
        console.error("Error applying variant details:", e, "Raw data:", variantDetailsString);
        showNotification("Error loading variant details. Check console.", "error");
      }
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
                    cropper.reset(); 
                    
                    const container = cropper.getContainerData();
                    const imageW = effectiveCropperSourceDimensions.width;
                    const imageH = effectiveCropperSourceDimensions.height;
                    
                    let fitRatio = 1;
                    if (imageW > 0 && imageH > 0 && container.width > 0 && container.height > 0) {
                        fitRatio = Math.min(container.width / imageW, container.height / imageH);
                    }
                    initialZoomRatio = fitRatio; 

                    cropper.zoomTo(initialZoomRatio); 

                    const canvasData = cropper.getCanvasData(); 
                    cropper.setCanvasData({
                        left: (container.width - canvasData.width) / 2,
                        top: (container.height - canvasData.height) / 2,
                        width: canvasData.width, 
                        height: canvasData.height 
                    });

                    cropper.setCropBoxData({
                        left: 0, 
                        top: 0,
                        width: effectiveCropperSourceDimensions.width,
                        height: effectiveCropperSourceDimensions.height
                    });
                    cropper.setAspectRatio(NaN); 
                    $('.uie-slider[data-cropper="zoom"]').val(0); 
                    
                    isAspectRatioLocked = false;
                    currentLockedAspectRatio = NaN;
                    updateAspectRatioLockButton();

                    if (resetTarget === "crop") { 
                        $('.uie-slider[data-filter="brightness"]').val(100).trigger('input').trigger('change');
                        $('.uie-slider[data-filter="contrast"]').val(100).trigger('input').trigger('change');
                        $('.uie-slider[data-filter="saturation"]').val(100).trigger('input').trigger('change');
                        $('.uie-slider[data-filter="hue"]').val(0).trigger('input').trigger('change');
                        showNotification("Crop & Filters reset.", "info");
                    } else {
                        showNotification("Crop & Zoom reset.", "info");
                    }
                }
                break;
            case "position":
                 if (cropper && cropper.ready) {
                    const cd = cropper.getContainerData();
                    const id = cropper.getImageData(); 
                    if(cd && id && id.width && id.height) {
                        cropper.setCanvasData({
                            left: (cd.width - id.width) / 2,
                            top: (cd.height - id.height) / 2
                        });
                    }
                }
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

    $(document).off('click.uieAspectLock').on('click.uieAspectLock', '.uie-aspect-lock-btn', function() {
        if (!cropper || !cropper.ready) return;
        isAspectRatioLocked = !isAspectRatioLocked;
        if (isAspectRatioLocked) {
            const cropBoxData = cropper.getCropBoxData();
            if (cropBoxData.width > 0 && cropBoxData.height > 0) {
                currentLockedAspectRatio = cropBoxData.width / cropBoxData.height;
                cropper.setAspectRatio(currentLockedAspectRatio);
            } else { 
                currentLockedAspectRatio = effectiveCropperSourceDimensions.width / effectiveCropperSourceDimensions.height;
                cropper.setAspectRatio(currentLockedAspectRatio);
            }
        } else {
            currentLockedAspectRatio = NaN;
            cropper.setAspectRatio(NaN);
        }
        updateAspectRatioLockButton();
    });


    $('.uie-slider[data-filter]').off('input.filter').on('input.filter', function() {
      if (cropper && cropper.ready) {
          $('#uie-image, .cropper-view-box img').css("filter", getCssFilterString(getCurrentUserAdjustedFiltersObject()));
      }
    }).off('change.filter').on('change.filter', function() {
      debouncedUpdateThumbnails();
    });

    $('.uie-slider[data-cropper="zoom"]').off('input.zoom').on('input.zoom', function() {
      if (cropper && cropper.ready) {
        let sliderValue = parseFloat($(this).val()); 
        let newAbsoluteZoomLevel = ((sliderValue / 100) + 1) * initialZoomRatio;
        cropper.zoomTo(newAbsoluteZoomLevel);
      }
    }).off('change.zoom').on('change.zoom', function() {
        debouncedUpdateThumbnails();
    });

    $(document).off('click.uieSaveMasterDetails').on('click.uieSaveMasterDetails', '.uie-save-master-details-button', function() {
        if (!isEditingMaster || !currentMediaAssetId) {
            showNotification("No source image loaded or not in master edit mode.", "warning");
            return;
        }
        const newAdminTitle = $('.uie-title-input').val();
        const newPublicCaption = $('.uie-caption').val(); 
        const newAltText = $('.uie-alt-text').val();     

        $.ajax({
            url: 'ajax/updateMediaAssetDetails.php',
            type: 'POST',
            data: {
                media_asset_id: currentMediaAssetId,
                admin_title: newAdminTitle, 
                public_caption: newPublicCaption, 
                alt_text: newAltText             
            },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    showNotification('Master asset details updated successfully!', 'success');
                    currentMediaAssetAdminTitle = newAdminTitle; 
                    currentMasterPublicCaption = newPublicCaption; 
                    currentMasterAltText = newAltText;         
                    $('#uie-source-thumbnail-box .uie-box-caption').text(currentMediaAssetAdminTitle);
                    
                    if ($('.uie-source-label').is(':visible') && !isEditingMaster) { 
                        $('.uie-source-label').html(`${currentMediaAssetAdminTitle}&nbsp;&gt;&nbsp;`);
                    }
                    if (typeof onVariantSavedOrUpdatedCallback === 'function') { 
                        onVariantSavedOrUpdatedCallback(); 
                    }
                } else {
                    showNotification('Error updating master asset details: ' + (response.error || 'Operation failed.'), 'error');
                }
            },
            error: function(jqXHR, ts, et) {
                showNotification('AJAX Error updating master asset details: ' + ts, 'error');
            }
        });
    });


    $(document).off('click.uieSaveAsVariant').on('click.uieSaveAsVariant', '.uie-save-as-variant-button', function() {
        if (!isEditingMaster) {
            showNotification("Please select the Source image to create a new variant from it.", "info");
            return;
        }
        if (!cropper || !cropper.ready || !currentMediaAssetId) {
            showNotification("Cannot save: Editor not ready or no master image loaded.", "error"); return;
        }

        const cropDataForVariant = cropper.getData(true); 
        const userFiltersForVariant = getCurrentUserAdjustedFiltersObject(); 
        const variantPublicCaption = $('.uie-caption').val(); 
        const variantAltText = $('.uie-alt-text').val();   

        const variantDetails = JSON.stringify({ 
            crop: cropDataForVariant, 
            filters: userFiltersForVariant,
            caption: variantPublicCaption,
            altText: variantAltText
        });
        const variantAdminTitle = (currentMediaAssetAdminTitle || "Image") + " - Variant"; 

        $.ajax({
            url: 'ajax/saveMediaVariant.php', type: 'POST',
            data: {
                media_asset_id: currentMediaAssetId, 
                variant_type: variantAdminTitle, 
                variant_details: variantDetails
            },
            dataType: 'json',
            success: function(response) {
              if (response.success && response.variant_id) {
                showNotification(`New Variant ${response.variant_id} saved!`, 'success');
                loadAndDisplayVariants(currentMediaAssetId); 
                currentVariantId = response.variant_id;
                isEditingMaster = false;
                $('.uie-title-input').val(variantAdminTitle); 
                $('.uie-caption').val(variantPublicCaption); 
                $('.uie-alt-text').val(variantAltText);     
                updateActionButtons();
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error: ' + (response.error || 'Could not save new variant.'), 'error'); }
            },
            error: function(jqXHR, ts, et) { showNotification('AJAX Error saving new variant: ' + ts, 'error'); }
        });
    });

    $(document).off('click.uieUpdateVariant').on('click.uieUpdateVariant', '.uie-update-variant-button', function() {
        if (isEditingMaster || !currentVariantId) {
             showNotification("No variant selected to update.", "info");
             return;
        }
        if (!cropper || !cropper.ready || !currentMediaAssetId) {
            showNotification("Cannot update: Editor not ready or no master image loaded.", "error"); return;
        }
        const cropDataForVariant = cropper.getData(true); 
        const userFiltersForVariant = getCurrentUserAdjustedFiltersObject(); 
        const newVariantAdminTitle = $('.uie-title-input').val(); 
        const newVariantPublicCaption = $('.uie-caption').val();
        const newVariantAltText = $('.uie-alt-text').val();

        const variantDetails = JSON.stringify({ 
            crop: cropDataForVariant, 
            filters: userFiltersForVariant,
            caption: newVariantPublicCaption,
            altText: newVariantAltText
        });

        $.ajax({
            url: 'ajax/updateMediaVariant.php', type: 'POST',
            data: {
                variant_id: currentVariantId,
                media_asset_id: currentMediaAssetId, 
                variant_type: newVariantAdminTitle, 
                variant_details: variantDetails
            },
            dataType: 'json',
            success: function(response) {
              if (response.success) {
                showNotification(`Variant ${currentVariantId} updated!`, 'success');
                updateVariantThumbnailInStrip(currentVariantId, {
                    crop: cropDataForVariant, 
                    filters: userFiltersForVariant
                });
                const $variantBox = $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`);
                $variantBox.data('variant-details', variantDetails.replace(/'/g, "&apos;")) 
                           .data('variant-title', newVariantAdminTitle.replace(/"/g, "&quot;"))
                           .find('.uie-variant-caption').text(newVariantAdminTitle);
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error updating variant: ' + (response.error || 'Operation failed.'), 'error'); }
            },
            error: function(jqXHR, ts, et) { showNotification('AJAX Error updating variant: ' + ts, 'error'); }
        });
    });

    $(document).off('click.uieSaveAsNewVariantFromExisting').on('click.uieSaveAsNewVariantFromExisting', '.uie-save-as-new-variant-button', function() {
        if (isEditingMaster || !currentVariantId) { 
            showNotification("Select an existing variant to fork from.", "info");
            return;
        }
        if (!cropper || !cropper.ready || !currentMediaAssetId) {
            showNotification("Cannot save: Editor not ready or no master image loaded.", "error"); return;
        }
        const cropDataForNewVariant = cropper.getData(true); 
        const userFiltersForNewVariant = getCurrentUserAdjustedFiltersObject(); 
        const newVariantAdminTitle = ($('.uie-title-input').val() || "Forked Variant") + " (copy)"; 
        const newVariantPublicCaption = $('.uie-caption').val(); 
        const newVariantAltText = $('.uie-alt-text').val();   

        const variantDetails = JSON.stringify({ 
            crop: cropDataForNewVariant, 
            filters: userFiltersForNewVariant,
            caption: newVariantPublicCaption,
            altText: newVariantAltText
        });

        $.ajax({
            url: 'ajax/saveMediaVariant.php', type: 'POST', 
            data: {
                media_asset_id: currentMediaAssetId, 
                variant_type: newVariantAdminTitle, 
                variant_details: variantDetails
            },
            dataType: 'json',
            success: function(response) {
              if (response.success && response.variant_id) {
                showNotification(`New Variant ${response.variant_id} (forked) saved!`, 'success');
                loadAndDisplayVariants(currentMediaAssetId); 
                currentVariantId = response.variant_id; 
                $('.uie-title-input').val(newVariantAdminTitle); 
                updateActionButtons();
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error forking variant: ' + (response.error || 'Operation failed.'), 'error'); }
            },
            error: function(jqXHR, ts, et) { showNotification('AJAX Error forking variant: ' + ts, 'error'); }
        });
    });

    $(document).off('click.uieSaveNewImage').on('click.uieSaveNewImage', '.uie-save-as-new-image-button', function() {
        if ((isEditingMaster && !isCurrentMasterPhysical) || (!isEditingMaster && !isCurrentMasterPhysical)) {
            showNotification("'Save as New Image' is only available when the base image is a physical asset.", "warning");
            return;
        }

        if (!cropper || !cropper.ready) {
            showNotification("Editor not ready to save new image.", "error"); return;
        }
        
        const finalCropDataForNewMaster = cropper.getData(true); 
        const newMasterDefaultFilters = getCurrentUserAdjustedFiltersObject();
        const newMasterAdminTitle = $('.uie-title-input').val(); 
        const newMasterPublicCaption = $('.uie-caption').val();
        const newMasterAltText = $('.uie-alt-text').val();

        $.ajax({
            url: 'ajax/saveNewImage.php',
            type: 'POST',
            data: {
                source_media_asset_id: currentPhysicalSourceAssetId, 
                current_crop_json: JSON.stringify(finalCropDataForNewMaster), 
                current_filters_json: JSON.stringify(newMasterDefaultFilters), 
                new_admin_title: newMasterAdminTitle, 
                new_public_caption: newMasterPublicCaption,
                new_alt_text: newMasterAltText,
                new_attribution: '' 
            },
            dataType: 'json',
            success: function(response) {
                if (response.success && response.media && response.media.id) {
                    showNotification('New Virtual Master Image (ID: ' + response.media.id + ') created!', 'success');
                    if (typeof onVariantSavedOrUpdatedCallback === 'function') {
                        onVariantSavedOrUpdatedCallback(); 
                    }
                    openEditor(
                        response.media.image_url, 
                        response.media,           
                        onVariantSavedOrUpdatedCallback,
                        onEditorClosedCallback
                    );
                } else {
                    showNotification('Error creating new virtual master: ' + (response.error || 'Unknown error'), 'error');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                showNotification('AJAX error creating new virtual master: ' + textStatus, 'error');
            }
        });
    });
  };
  return { openEditor, closeEditor };
})();
