// UnifiedImageEditor.js – With Virtual Masters, refined variant workflow, preview generation, and crop fixes.

const UnifiedImageEditor = (() => {
  'use strict';

  let cropper = null;
  let initialZoomRatio = 1;
  let presetsData = [];

  // State variables
  let currentMediaAssetId = null;       
  let currentMediaAssetTitle = '';    
  let currentMediaAssetUrl = '';      // URL of the *physical source file* for this asset
  let currentPhysicalSourceAssetId = null; 
  let currentAssetDefaultCrop = null;   
  let currentAssetDefaultFilters = null;

  let currentVariantId = null;        
  let isEditingMaster = true;         

  let activeBaseImageElement = null; 

  // Callbacks
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

  const getCurrentFiltersObject = () => {
    return {
        brightness: parseFloat($('.uie-slider[data-filter="brightness"]').val()) || 100,
        contrast:   parseFloat($('.uie-slider[data-filter="contrast"]').val()) || 100,
        saturation: parseFloat($('.uie-slider[data-filter="saturation"]').val()) || 100,
        hue:        parseFloat($('.uie-slider[data-filter="hue"]').val()) || 0,
    };
  };
  
  const getCurrentFilterString = (filters) => {
    const f = filters || getCurrentFiltersObject();
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

  const generateTransformedPreviewCanvas = (physicalImageElement, baseCrop, baseFilters, variantCrop, variantFilters) => {
    return new Promise((resolve, reject) => {
        if (!physicalImageElement || !physicalImageElement.naturalWidth) {
            return reject("Physical base image not ready for preview generation.");
        }

        let stage1Canvas = document.createElement('canvas');
        let stage1Ctx = stage1Canvas.getContext('2d');
        
        const initialCrop = baseCrop || { x: 0, y: 0, width: physicalImageElement.naturalWidth, height: physicalImageElement.naturalHeight };
        if (initialCrop.width === 0 || initialCrop.height === 0) return reject("Base crop has zero dimensions.");
        stage1Canvas.width = initialCrop.width;
        stage1Canvas.height = initialCrop.height;

        if (baseFilters) {
            stage1Ctx.filter = getCurrentFilterString(baseFilters);
        }
        stage1Ctx.drawImage(physicalImageElement, initialCrop.x, initialCrop.y, initialCrop.width, initialCrop.height, 0, 0, initialCrop.width, initialCrop.height);

        if (!variantCrop && !variantFilters) {
            resolve(stage1Canvas);
            return;
        }

        let stage2Canvas = document.createElement('canvas');
        let stage2Ctx = stage2Canvas.getContext('2d');
        
        const finalCrop = variantCrop || { x: 0, y: 0, width: stage1Canvas.width, height: stage1Canvas.height }; 
        if (finalCrop.width === 0 || finalCrop.height === 0) return reject("Variant crop has zero dimensions.");
        stage2Canvas.width = finalCrop.width;
        stage2Canvas.height = finalCrop.height;

        if (variantFilters) {
            stage2Ctx.filter = getCurrentFilterString(variantFilters);
        }
        stage2Ctx.drawImage(stage1Canvas, finalCrop.x, finalCrop.y, finalCrop.width, finalCrop.height, 0, 0, finalCrop.width, finalCrop.height);
        
        resolve(stage2Canvas);
    });
};

  const ensureOverlayExists = () => { 
    if ($('#uie-overlay').length === 0) {
      const editorHTML = `
        <div id="uie-overlay" class="uie-container hidden">
          <header class="uie-header">
            <span class="uie-source-label">Source:</span>
            <input type="text" class="uie-title-input" value="Image Title">
            <button class="uie-close-button">X</button>
          </header>
          <div class="uie-main-content">
            <div class="uie-left-column">
              <div class="uie-image-editing">
                <img id="uie-image" src="" alt="Editable Image">
              </div>
            </div>
            <div class="uie-right-column">
              <div class="uie-panel uie-metadata-panel">
                <div class="uie-panel-header">Metadata</div>
                <div class="uie-panel-content">
                  <input type="text" class="uie-alt-text" placeholder="Alt Text">
                  <textarea class="uie-caption" placeholder="Caption"></textarea>
                </div>
              </div>
              <div class="uie-panel uie-tags-panel">
                <div class="uie-panel-header">Tags</div>
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
                      <span class="uie-reset-btn" data-reset-for="crop" title="Reset Crop to Full Image"><i class="fas fa-crop"></i></span>
                      <span class="uie-reset-btn" data-reset-for="position" title="Center Image"><i class="fas fa-arrows-alt"></i></span>
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
                  <button class="uie-action-button uie-save-as-variant-button">Save as Variant</button>
                  <button class="uie-action-button uie-update-variant-button" style="display:none;">Update Current Variant</button>
                  <button class="uie-action-button uie-save-as-new-variant-button" style="display:none;">Save as New Variant</button>
                  <button class="uie-action-button uie-save-as-new-image-button">Save as New Image</button>
                </div>
              </div>
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
              <div class="uie-variant-scroll"></div>
            </div>
          </div>
        </div>`;
      $('body').append(editorHTML);
      bindStaticEvents(); 
    }
  };
  
  const updateActionButtons = () => {
      if (isEditingMaster) {
          $('.uie-save-as-variant-button').show();
          $('.uie-update-variant-button').hide();
          $('.uie-save-as-new-variant-button').hide();
          $('.uie-save-as-new-image-button').show(); 
          $('.uie-title-input').val(currentMediaAssetTitle); 
          $('.uie-source-label').hide();
          $('#uie-source-thumbnail-box').addClass('active-variant'); 
      } else { 
          $('.uie-save-as-variant-button').hide();
          $('.uie-update-variant-button').show().text(`Update Variant ${currentVariantId}`);
          $('.uie-save-as-new-variant-button').show();
          $('.uie-save-as-new-image-button').show();
          $('.uie-source-label').show().text(`Source: ${currentMediaAssetTitle}`);
          $('#uie-source-thumbnail-box').removeClass('active-variant');
      }
  };

  const pollZoomSlider = () => { 
    if (!cropper || !cropper.ready) return;
    try {
        const data = cropper.getImageData();
        if (!data || !data.naturalWidth) return; 
        const currentRatio = data.width / data.naturalWidth;
        const sliderMax = parseFloat($(".uie-slider[data-cropper='zoom']").attr("max"));
        const maxZoomAllowed = (((sliderMax) / 100) + 1) * initialZoomRatio;

        if (currentRatio > maxZoomAllowed) {
            cropper.zoomTo(maxZoomAllowed);
        }
        let sliderValue = ((currentRatio / initialZoomRatio) - 1) * 100;
        if (sliderValue < 0) sliderValue = 0;
        if (sliderValue > sliderMax) sliderValue = sliderMax;
        $(".uie-slider[data-cropper='zoom']").val(sliderValue);
    } catch (e) {
        // console.warn("PollZoomSlider: Cropper not fully ready:", e);
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
      let sourceCanvas;
      try {
        sourceCanvas = cropper.getCroppedCanvas(); 
         if (!sourceCanvas) return reject("generatePresetThumbnail: Could not get cropped canvas (null).");
      } catch (e) {
        return reject("generatePresetThumbnail: Error getting cropped canvas: " + e.message);
      }

       if (preset.type === 'filter') {
        try {
          const details = JSON.parse(preset.preset_details);
          const filters = {
            brightness: details.brightness || 100,
            contrast: details.contrast || 100,
            saturation: details.saturation || 100,
            hue: details.hue || 0
          };
          const presetFilterString = getCurrentFilterString(filters);
          let tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = sourceCanvas.width;
          tmpCanvas.height = sourceCanvas.height;
          let tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.filter = presetFilterString;
          tmpCtx.drawImage(sourceCanvas, 0, 0);
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

          const imgData = cropper.getImageData();
           if (!imgData || !imgData.naturalWidth) return reject("generatePresetThumbnail (crop): Cropper image data invalid.");
          
          const currentCroppedCanvas = cropper.getCroppedCanvas(); 
          if (!currentCroppedCanvas) return reject("generatePresetThumbnail (crop): Could not get current cropped canvas.");

          let tempThumbCanvas = document.createElement('canvas');
          let tempThumbCtx = tempThumbCanvas.getContext('2d');
          let previewWidth, previewHeight;

          if (currentCroppedCanvas.width / currentCroppedCanvas.height > targetRatio) {
            previewHeight = 80; 
            previewWidth = previewHeight * targetRatio;
          } else {
            previewWidth = 80; 
            previewHeight = previewWidth / targetRatio;
          }
          tempThumbCanvas.width = previewWidth;
          tempThumbCanvas.height = previewHeight;
          tempThumbCtx.drawImage(currentCroppedCanvas, 0, 0, previewWidth, previewHeight);
          
          resolve(tempThumbCanvas.toDataURL());

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
                    const ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
                    if (!isNaN(ratio)) {
                        cropper.setAspectRatio(ratio);
                        const imageData = cropper.getImageData();
                        if (!imageData || !imageData.naturalWidth) {
                            showNotification("Cannot apply crop preset, image data invalid.", "error");
                            return;
                        }
                        let newCropBoxWidth, newCropBoxHeight;
                        if (imageData.naturalWidth / imageData.naturalHeight > ratio) {
                            newCropBoxHeight = imageData.naturalHeight;
                            newCropBoxWidth = newCropBoxHeight * ratio;
                        } else {
                            newCropBoxWidth = imageData.naturalWidth;
                            newCropBoxHeight = newCropBoxWidth / ratio;
                        }
                        const newCropBoxX = (imageData.naturalWidth - newCropBoxWidth) / 2;
                        const newCropBoxY = (imageData.naturalHeight - newCropBoxHeight) / 2;
                        cropper.setCropBoxData({
                            left: newCropBoxX, top: newCropBoxY,
                            width: newCropBoxWidth, height: newCropBoxHeight
                        });
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

  const initializeCropperInstance = (imageElement, imageUrl) => { 
    try {
        cropper = new Cropper(imageElement, {
            viewMode: 1, 
            autoCropArea: 1, 
            movable: true, scalable: true, zoomable: true,
            cropBoxResizable: true, responsive: true, guides: false,
            crop: debouncedUpdateThumbnails,
            ready: function() {
                if (!cropper) {
                    console.warn("Cropper instance became null during ready callback. Aborting ready sequence.");
                    return;
                }
                const imageEl = document.getElementById('uie-image'); 
                console.log("Cropper ready event. Image Element src:", imageEl.src, "naturalWidth:", imageEl.naturalWidth, "naturalHeight:", imageEl.naturalHeight);

                if (!imageEl.naturalWidth || !imageEl.naturalHeight) {
                    console.error("CRITICAL: Cropper ready, but HTMLImageElement has no natural dimensions. Image URL:", imageEl.src);
                    showNotification("Editor cannot proceed: Image has no dimensions. Please select a valid image.", "error");
                    closeEditor();
                    return;
                }

                let cropperImgData = null;
                try {
                    cropperImgData = cropper.getImageData();
                } catch(e) {
                    console.warn("cropper.getImageData() threw error in ready:", e);
                }
                
                console.log("Data from cropper.getImageData() in ready:", cropperImgData ? JSON.parse(JSON.stringify(cropperImgData)) : "null");

                let baseNaturalWidth = imageEl.naturalWidth;
                const canvasData = cropper.getCanvasData(); 
                let currentDisplayWidth = canvasData && canvasData.width ? canvasData.width : imageEl.width;


                if (baseNaturalWidth > 0 && currentDisplayWidth > 0) {
                    initialZoomRatio = currentDisplayWidth / baseNaturalWidth;
                } else {
                    initialZoomRatio = 1;
                    console.warn("Could not determine valid initialZoomRatio (baseNaturalWidth or currentDisplayWidth is 0). Setting to 1. BaseNW:", baseNaturalWidth, "DispW:", currentDisplayWidth);
                }
                                
                console.log("Final calculated initialZoomRatio:", initialZoomRatio);

                $(".uie-slider[data-cropper='zoom']").val(0);
                requestAnimationFrame(pollZoomSlider); 
                loadMediaPresets();
                loadAndDisplayVariants(currentMediaAssetId); 
                bindPresetEvents();
            }
        });
    } catch (e) {
        console.error("Error initializing Cropper for URL:", imageUrl, e);
        showNotification("Fatal error initializing image editor: " + e.message, "error");
        closeEditor();
    }
  };
  
  const resetEditorToMasterState = (applyAssetDefaults = true) => {
    currentVariantId = null;
    isEditingMaster = true;
    $('.uie-variant-box').removeClass('active-variant');
    $('#uie-source-thumbnail-box').addClass('active-variant');

    if (cropper && cropper.ready) {
        const imageEl = document.getElementById('uie-image'); // This is the physical source
        let baseCropToApply = (applyAssetDefaults && currentAssetDefaultCrop) 
                              ? currentAssetDefaultCrop 
                              : { x: 0, y: 0, width: imageEl.naturalWidth, height: imageEl.naturalHeight };
        let baseFiltersToApply = (applyAssetDefaults && currentAssetDefaultFilters) 
                                ? currentAssetDefaultFilters 
                                : { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

        if (imageEl && imageEl.naturalWidth > 0) { 
            cropper.setCropBoxData(baseCropToApply); 
            cropper.setAspectRatio(NaN); 
            
            const containerData = cropper.getContainerData();
            if(containerData && baseCropToApply.width > 0){ 
                const newZoom = Math.min(containerData.width / baseCropToApply.width, containerData.height / baseCropToApply.height);
                cropper.zoomTo(newZoom);
            } else {
                 cropper.reset(); 
                 if (imageEl && imageEl.naturalWidth > 0) { 
                    cropper.setCropBoxData({left:0, top:0, width: imageEl.naturalWidth, height: imageEl.naturalHeight});
                 }
            }

            $('.uie-slider[data-filter="brightness"]').val(baseFiltersToApply.brightness).trigger('input');
            $('.uie-slider[data-filter="contrast"]').val(baseFiltersToApply.contrast).trigger('input');
            $('.uie-slider[data-filter="saturation"]').val(baseFiltersToApply.saturation).trigger('input');
            $('.uie-slider[data-filter="hue"]').val(baseFiltersToApply.hue).trigger('input');
        }
    }
    const filtersForPreview = (applyAssetDefaults && currentAssetDefaultFilters) ? currentAssetDefaultFilters : { brightness: 100, contrast: 100, saturation: 100, hue: 0 };
    $('#uie-image, .cropper-view-box img').css("filter", getCurrentFilterString(filtersForPreview));
    if (cropper && cropper.ready) debouncedUpdateThumbnails();

    updateActionButtons();
  };


  const openEditor = (physicalImgUrl, assetDataObj, saveCb, closedCb) => {
    ensureOverlayExists(); 
    
    currentMediaAssetId = assetDataObj.id;
    currentMediaAssetTitle = assetDataObj.title || `Image ${assetDataObj.id}`; 
    currentMediaAssetUrl = physicalImgUrl; 
    currentPhysicalSourceAssetId = assetDataObj.physical_source_asset_id || assetDataObj.id; 
    
    try {
        currentAssetDefaultCrop = (assetDataObj.default_crop && assetDataObj.default_crop !== "null" && assetDataObj.default_crop.trim() !== "") ? JSON.parse(assetDataObj.default_crop) : null;
        currentAssetDefaultFilters = (assetDataObj.filter_state && assetDataObj.filter_state !== "null" && assetDataObj.filter_state.trim() !== "") ? JSON.parse(assetDataObj.filter_state) : null;
    } catch (e) {
        console.error("Error parsing default crop/filter state for asset:", assetDataObj.id, e, "Raw crop:", assetDataObj.default_crop, "Raw filter:", assetDataObj.filter_state);
        currentAssetDefaultCrop = null;
        currentAssetDefaultFilters = null;
    }
    
    onVariantSavedOrUpdatedCallback = saveCb; 
    onEditorClosedCallback = closedCb;
    
    isEditingMaster = true; 
    currentVariantId = null; 
    
    const imageElementForCropper = document.getElementById('uie-image');
    $(imageElementForCropper).attr('src', "").attr('alt', currentMediaAssetTitle); 
    
    $('#uie-source-thumbnail-box .uie-box-img').attr('src', currentMediaAssetUrl).attr('alt', 'Physical Source Thumbnail');
    $('.uie-variant-scroll').empty().html('<p>Loading image for variants...</p>'); // Update status
    
    resetEditorToMasterState(true); 
    updateActionButtons(); 

    // Create a new Image object for this specific openEditor call.
    // This will become the activeBaseImageElement once loaded.
    const imagePreloader = new Image();
    imagePreloader.crossOrigin = "Anonymous";

    imagePreloader.onload = function() { // 'this' is imagePreloader
        console.log("Physical source image preloaded successfully:", this.src, "Dimensions:", this.naturalWidth, "x", this.naturalHeight);
        if (this.naturalWidth === 0 || this.naturalHeight === 0) {
            console.error("Preloaded image has zero dimensions:", this.src);
            showNotification("Error: Preloaded image data is invalid (zero dimensions).", "error");
            if (typeof onEditorClosedCallback === 'function') onEditorClosedCallback();
            return;
        }

        activeBaseImageElement = this; // Set the successfully loaded image for preview generation

        // Now that the image is confirmed loaded, show the overlay and init Cropper
        $('#uie-overlay').removeClass('hidden').fadeIn(300, function() {
            if (cropper) { cropper.destroy(); cropper = null; } // Ensure previous instance is gone
            
            $(imageElementForCropper).attr('src', currentMediaAssetUrl); // Set src for the Cropper's img tag
            
            // No need for separate load/error on imageElementForCropper if preloader worked.
            // Cropper will use the image from the DOM which should be ready.
            initializeCropperInstance(imageElementForCropper, currentMediaAssetUrl);
            // Re-apply defaults once cropper is truly ready with the physical image
            // This might be redundant if initializeCropperInstance's ready callback handles it,
            // but can help ensure state if there are timing issues.
            if (cropper && cropper.ready) {
                resetEditorToMasterState(true); 
            } else {
                // If cropper is not immediately ready, its own ready handler will call reset/load variants.
            }
        });
    };

    imagePreloader.onerror = function() {
        console.error("Failed to preload physical source image:", currentMediaAssetUrl);
        showNotification("Error: Could not load the main image. Editor cannot open.", "error");
        activeBaseImageElement = null; 
        if (typeof onEditorClosedCallback === 'function') onEditorClosedCallback();
    };

    imagePreloader.src = currentMediaAssetUrl; // Start preloading
  };

  const closeEditor = () => { 
    if (cropper) { cropper.destroy(); cropper = null; }
    activeBaseImageElement = null; 
    $('#uie-overlay').fadeOut(300, function() { $(this).addClass('hidden'); });
    if (typeof onEditorClosedCallback === 'function') { onEditorClosedCallback(); }
  };

  const getFilteredCroppedImageUrl = (canvas) => { 
    const filterString = getCurrentFilterString();
    const filteredCanvas = document.createElement('canvas');
    if (!canvas || canvas.width === 0 || canvas.height === 0) { 
        console.warn("getFilteredCroppedImageUrl called with invalid canvas.");
        return filteredCanvas.toDataURL(); 
    }
    filteredCanvas.width = canvas.width;
    filteredCanvas.height = canvas.height;
    const ctx = filteredCanvas.getContext('2d');
    ctx.filter = filterString;
    ctx.drawImage(canvas, 0, 0);
    return filteredCanvas.toDataURL('image/png');
  };

  const updateVariantThumbnailInStrip = (variantId, variantDetails) => { 
    const $variantBox = $(`.uie-variant-box[data-variant-id="${variantId}"]`);
    if ($variantBox.length && activeBaseImageElement && activeBaseImageElement.complete && activeBaseImageElement.naturalWidth > 0) {
        generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, variantDetails.crop, variantDetails.filters)
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
            let variantName = variant.variant_type || `Variant ${variant.id}`;
            let variantDetailsParsed;
            try {
                variantDetailsParsed = JSON.parse(variant.variant_details);
            } catch(e) {
                console.error("Failed to parse variant_details for variant ID:", variant.id, variant.variant_details);
                variantDetailsParsed = null; 
            }
            
            const variantBoxHtml = `
              <div class="uie-variant-box uie-box" data-variant-id="${variant.id}" data-variant-details='${variant.variant_details.replace(/'/g, "&apos;")}'>
                <div class="image-container">
                  <img class="uie-box-img" src="" alt="${variantName}">
                </div>
                <span class="uie-variant-caption uie-box-caption">${variantName}</span>
              </div>`;
            const $variantBox = $(variantBoxHtml);
            $('.uie-variant-scroll').append($variantBox);

            if (variantDetailsParsed) { // No need to check activeBaseImageElement again, already checked above
                generateTransformedPreviewCanvas(activeBaseImageElement, currentAssetDefaultCrop, currentAssetDefaultFilters, variantDetailsParsed.crop, variantDetailsParsed.filters)
                    .then(previewCanvas => generateScaledThumbnail(previewCanvas))
                    .then(scaledThumbCanvas => {
                        $variantBox.find('.uie-box-img').attr('src', scaledThumbCanvas.toDataURL());
                    })
                    .catch(err => {
                         console.error("Error generating preview for variant box:", variant.id, err);
                         $variantBox.find('.image-container').html('Preview Error').css({'background':'#500', 'color':'white'});
                    });
            } else {
                 $variantBox.find('.image-container').html('Details Err').css({'background':'#500', 'color':'white'});
            }
          });
          bindVariantSelectionEvents();
        } else if (response.success) {
          $('.uie-variant-scroll').append('<p>No variants yet. Click "Save as Variant" to create one.</p>');
        } else {
          $('.uie-variant-scroll').append(`<p>Error loading variants: ${response.error || 'Unknown server error'}</p>`);
          console.error("Error loading variants from server:", response.error);
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        $('.uie-variant-scroll').empty().append('<p>AJAX error loading variants.</p>');
        console.error("AJAX error loading variants:", textStatus, errorThrown);
      }
    });
  };
  
  const bindVariantSelectionEvents = () => { 
    $('.uie-variant-scroll').off('click.variantBox').on('click.variantBox', '.uie-variant-box', function() {
      const $this = $(this);
      $('.uie-variant-box, #uie-source-thumbnail-box').removeClass('active-variant'); 
      $this.addClass('active-variant');

      currentVariantId = $this.data('variant-id');
      isEditingMaster = false;
      const variantDetailsString = $this.data('variant-details');
      
      try {
        const detailsToParse = typeof variantDetailsString === 'string' ? variantDetailsString : JSON.stringify(variantDetailsString);
        const variantDetails = JSON.parse(detailsToParse.replace(/&apos;/g, "'"));
        
        if (!cropper || !cropper.ready) {
            showNotification("Editor not ready to apply variant settings.", "warning");
            return;
        }

        if (variantDetails.crop) {
          cropper.setData(variantDetails.crop); 
        }
        
        let effectiveFilters = variantDetails.filters || { brightness: 100, contrast: 100, saturation: 100, hue: 0 };
        
        $('.uie-slider[data-filter="brightness"]').val(effectiveFilters.brightness).trigger('input');
        $('.uie-slider[data-filter="contrast"]').val(effectiveFilters.contrast).trigger('input');
        $('.uie-slider[data-filter="saturation"]').val(effectiveFilters.saturation).trigger('input');
        $('.uie-slider[data-filter="hue"]').val(effectiveFilters.hue).trigger('input');
        
        if (cropper && cropper.ready) {
            $('#uie-image, .cropper-view-box img').css("filter", getCurrentFilterString(effectiveFilters));
            debouncedUpdateThumbnails();
        } else {
            $('#uie-image').css("filter", getCurrentFilterString(effectiveFilters));
        }
        
        $('.uie-title-input').val($this.find('.uie-variant-caption').text()); 
        updateActionButtons();
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

    $(document).off('click.uieReset').on('click.uieReset', '.uie-reset-icon-container, .uie-reset-btn', function() {
        const resetTarget = $(this).data('reset-for');
        if (!resetTarget) return;
        if (!cropper && (resetTarget === 'zoom' || resetTarget === 'crop' || resetTarget === 'position')) {
            showNotification("Editor not ready for reset.", "warning"); return;
        }
        switch (resetTarget) {
            case "zoom": if (cropper && cropper.ready) { cropper.zoomTo(initialZoomRatio); $(".uie-slider[data-cropper='zoom']").val(0); } break;
            case "brightness": $('.uie-slider[data-filter="brightness"]').val(100).trigger('input').trigger('change'); break;
            case "contrast":   $('.uie-slider[data-filter="contrast"]').val(100).trigger('input').trigger('change'); break;
            case "saturation": $('.uie-slider[data-filter="saturation"]').val(100).trigger('input').trigger('change'); break;
            case "hue":        $('.uie-slider[data-filter="hue"]').val(0).trigger('input').trigger('change'); break;
            case "crop": 
                if (cropper && cropper.ready) { 
                    const imageEl = document.getElementById('uie-image');
                    let cropToApply = currentAssetDefaultCrop || (imageEl && imageEl.naturalWidth > 0 ? { x: 0, y: 0, width: imageEl.naturalWidth, height: imageEl.naturalHeight } : null);
                    if (cropToApply) {
                        cropper.setCropBoxData(cropToApply);
                        cropper.setAspectRatio(NaN); 
                        const containerData = cropper.getContainerData();
                        if(containerData && cropToApply.width > 0){ 
                            const newZoom = Math.min(containerData.width / cropToApply.width, containerData.height / cropToApply.height);
                            cropper.zoomTo(newZoom);
                        }
                    } else {
                        cropper.reset(); // Fallback if no valid crop data
                    }
                }
                break; 
            case "position": if (cropper && cropper.ready) { const cd = cropper.getContainerData(); const id = cropper.getImageData(); if(cd && id && id.width && id.height) cropper.setCanvasData({ left: (cd.width - id.width) / 2, top: (cd.height - id.height) / 2 });} break;
        }
    });

    $('.uie-slider[data-filter]').off('input.filter').on('input.filter', function() {
      if (cropper && cropper.ready) { 
          $('#uie-image, .cropper-view-box img').css("filter", getCurrentFilterString());
      }
    }).off('change.filter').on('change.filter', function() {
      debouncedUpdateThumbnails(); 
    });
    
    $('.uie-slider[data-cropper="zoom"]').off('input.zoom').on('input.zoom', function() {
      if (cropper && cropper.ready) {
        let sliderValue = parseFloat($(this).val());
        let newZoom = ((sliderValue / 100) + 1) * initialZoomRatio;
        cropper.zoomTo(newZoom);
      }
    }).off('change.zoom').on('change.zoom', function() {
        debouncedUpdateThumbnails();
    });

    $(document).off('click.uieSaveAsVariant').on('click.uieSaveAsVariant', '.uie-save-as-variant-button', function() {
        if (!isEditingMaster) return; 
        if (!cropper || !cropper.ready || !currentMediaAssetId) {
            showNotification("Cannot save: Editor not ready or no master image loaded.", "error"); return;
        }
        const cropData = cropper.getData(true); 
        const filterData = getCurrentFiltersObject();
        const variantDetails = JSON.stringify({ crop: cropData, filters: filterData });
        const variantNameInput = $('.uie-title-input').val() + " - Variant"; 

        $.ajax({
            url: 'ajax/saveMediaVariant.php', type: 'POST', 
            data: { media_asset_id: currentMediaAssetId, variant_type: variantNameInput, variant_details: variantDetails }, 
            dataType: 'json',
            success: function(response) {
              if (response.success && response.variant_id) {
                showNotification(`New Variant ${response.variant_id} saved!`, 'success');
                loadAndDisplayVariants(currentMediaAssetId); 
                currentVariantId = response.variant_id;
                isEditingMaster = false;
                updateActionButtons();
                setTimeout(() => { 
                    $('.uie-variant-box').removeClass('active-variant');
                    $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
                    $('.uie-title-input').val(variantNameInput);
                }, 200);
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error: ' + (response.error || 'Could not save new variant.'), 'error'); }
            },
            error: function(jqXHR, ts, et) { showNotification('AJAX Error saving new variant: ' + ts, 'error'); }
        });
    });
    
    $(document).off('click.uieUpdateVariant').on('click.uieUpdateVariant', '.uie-update-variant-button', function() {
        if (isEditingMaster || !currentVariantId) return; 
        if (!cropper || !cropper.ready || !currentMediaAssetId) {
            showNotification("Cannot update: Editor not ready or no master image loaded.", "error"); return;
        }
        const cropData = cropper.getData(true); 
        const filterData = getCurrentFiltersObject();
        const variantDetails = JSON.stringify({ crop: cropData, filters: filterData });
        const variantNameInput = $('.uie-title-input').val();

        $.ajax({
            url: 'ajax/updateMediaVariant.php', type: 'POST',
            data: { variant_id: currentVariantId, media_asset_id: currentMediaAssetId, variant_type: variantNameInput, variant_details: variantDetails },
            dataType: 'json',
            success: function(response) {
              if (response.success) {
                showNotification(`Variant ${currentVariantId} updated!`, 'success');
                updateVariantThumbnailInStrip(currentVariantId, {crop: cropData, filters: filterData});
                $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`)
                    .data('variant-details', variantDetails.replace(/'/g, "&apos;"))
                    .find('.uie-variant-caption').text(variantNameInput);
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error updating variant: ' + (response.error || 'Operation failed.'), 'error'); }
            },
            error: function(jqXHR, ts, et) { showNotification('AJAX Error updating variant: ' + ts, 'error'); }
        });
    });

    $(document).off('click.uieSaveAsNewVariantFromExisting').on('click.uieSaveAsNewVariantFromExisting', '.uie-save-as-new-variant-button', function() {
        if (isEditingMaster || !currentVariantId) return; 
        if (!cropper || !cropper.ready || !currentMediaAssetId) {
            showNotification("Cannot save: Editor not ready or no master image loaded.", "error"); return;
        }
        const cropData = cropper.getData(true); 
        const filterData = getCurrentFiltersObject();
        const variantDetails = JSON.stringify({ crop: cropData, filters: filterData });
        const variantNameInput = $('.uie-title-input').val() + " (copy)"; 

        $.ajax({
            url: 'ajax/saveMediaVariant.php', type: 'POST', 
            data: { media_asset_id: currentMediaAssetId, variant_type: variantNameInput, variant_details: variantDetails }, 
            dataType: 'json',
            success: function(response) {
              if (response.success && response.variant_id) {
                showNotification(`New Variant ${response.variant_id} (forked) saved!`, 'success');
                loadAndDisplayVariants(currentMediaAssetId); 
                currentVariantId = response.variant_id; 
                updateActionButtons(); 
                setTimeout(() => { 
                    $('.uie-variant-box').removeClass('active-variant');
                    $(`.uie-variant-box[data-variant-id="${currentVariantId}"]`).addClass('active-variant');
                    $('.uie-title-input').val(variantNameInput);
                }, 200);
                if (typeof onVariantSavedOrUpdatedCallback === 'function') onVariantSavedOrUpdatedCallback();
              } else { showNotification('Error forking variant: ' + (response.error || 'Operation failed.'), 'error'); }
            },
            error: function(jqXHR, ts, et) { showNotification('AJAX Error forking variant: ' + ts, 'error'); }
        });
    });

    $(document).off('click.uieSaveNewImage').on('click.uieSaveNewImage', '.uie-save-as-new-image-button', function() {
        if (!cropper || !cropper.ready) {
            showNotification("Editor not ready to save new image.", "error"); return;
        }
        let canvas;
        try { canvas = cropper.getCroppedCanvas(); } catch (e) {
            showNotification("Error getting cropped canvas: " + e.message, "error"); return;
        }
        if (!canvas) {
            showNotification("Could not get cropped canvas data.", "error"); return;
        }
        
        const cropDataForNewMaster = cropper.getData(true);
        const filterDataForNewMaster = getCurrentFiltersObject();

        $.ajax({
            url: 'ajax/saveNewImage.php', 
            type: 'POST', 
            data: { 
                source_media_asset_id: currentPhysicalSourceAssetId, 
                current_crop_json: JSON.stringify(cropDataForNewMaster),
                current_filters_json: JSON.stringify(filterDataForNewMaster),
                new_caption: $('.uie-title-input').val() + " (New Base)", 
                new_alt_text: $('.uie-alt-text').val(), 
                new_attribution: '' 
            }, 
            dataType: 'json',
            success: function(response) {
                if (response.success && response.media && response.media.id) {
                    showNotification('Virtual Master Image (ID: ' + response.media.id + ') created!', 'success');
                    if (typeof onVariantSavedOrUpdatedCallback === 'function') { 
                        onVariantSavedOrUpdatedCallback(); 
                    }
                    openEditor(
                        response.media.file_path, 
                        response.media,           
                        onVariantSavedOrUpdatedCallback, 
                        onEditorClosedCallback
                    );
                } else {
                    showNotification('Error creating virtual master: ' + (response.error || 'Unknown error'), 'error');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                showNotification('AJAX error creating virtual master: ' + textStatus, 'error');
            }
        });
    });
  };
  return { openEditor, closeEditor };
})();
