// UnifiedImageEditor.js – Full code with dynamic preset integration,
// variant‐like proportional scaling, enhanced (centered) crop preset logic,
// and immediate 1:1 zoom slider updates.

const UnifiedImageEditor = (() => {
  'use strict';

  // Variables for the Cropper instance and initial settings
  let cropper = null;
  let initialZoomRatio = 1;
  let initialCanvasData = null;
  // Store presets globally for dynamic updates
  let presetsData = [];

  // Debounce helper: delays execution until after delay milliseconds have elapsed since the last call.
  const debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  // We'll assign the debounced version of updatePresetThumbnails after that function is defined.
  let debouncedUpdateThumbnails = null;

  // Helper: Returns the current filter string from active slider values.
  const getCurrentFilterString = () => {
    const brightness = $('.uie-slider[data-filter="brightness"]').val() || 100;
    const contrast   = $('.uie-slider[data-filter="contrast"]').val() || 100;
    const saturation = $('.uie-slider[data-filter="saturation"]').val() || 100;
    const hue        = $('.uie-slider[data-filter="hue"]').val() || 0;
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;
  };

  // Helper: Scales a source canvas proportionally down to a thumbnail
  // (mimicking the variant saving behavior without forcing letterboxing).
  const generateScaledThumbnail = (sourceCanvas, maxWidth = 80, maxHeight = 80) => {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const scale = Math.min(maxWidth / srcW, maxHeight / srcH);
    const thumbW = Math.round(srcW * scale);
    const thumbH = Math.round(srcH * scale);
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const ctx = thumbCanvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0, srcW, srcH, 0, 0, thumbW, thumbH);
    return thumbCanvas;
  };

  /**
   * Inserts the editor overlay HTML into the DOM if it doesn't exist.
   */
  const ensureOverlayExists = () => {
    if ($('#uie-overlay').length === 0) {
      const editorHTML = `
        <div id="uie-overlay" class="uie-container hidden">
          <!-- Main Title Module (Overall Header) -->
          <header class="uie-header">
            <span class="uie-source-label" style="display: none;">Source:</span>
            <input type="text" class="uie-title-input" value="Image Title">
            <button class="uie-close-button">X</button>
          </header>
          
          <!-- Main Content Area -->
          <div class="uie-main-content">
            <!-- Left Column: Image Editing Panel -->
            <div class="uie-left-column">
              <div class="uie-image-editing">
                <!-- This image is dynamically loaded -->
                <img id="uie-image" src="your-image.jpg" alt="Editable Image">
              </div>
            </div>
            
            <!-- Right Column: Control Panel -->
            <div class="uie-right-column">
              <!-- Metadata Panel -->
              <div class="uie-panel uie-metadata-panel">
                <div class="uie-panel-header">Metadata</div>
                <div class="uie-panel-content">
                  <input type="text" class="uie-alt-text" placeholder="Alt Text">
                  <textarea class="uie-caption" placeholder="Caption"></textarea>
                </div>
              </div>
              <!-- Tags Panel -->
              <div class="uie-panel uie-tags-panel">
                <div class="uie-panel-header">Tags</div>
                <div class="uie-panel-content">
                  <input type="text" class="uie-tag-input" placeholder="Add tag...">
                  <div class="uie-tag-list"></div>
                </div>
              </div>
              <!-- Controls & Presets Panel -->
              <div class="uie-panel uie-controls-presets-panel">
                <div class="uie-controls-presets-content">
                  <div class="uie-controls-column">
                    <div class="uie-subpanel-header">Image Controls</div>
                    <div class="uie-sliders">
                      <label class="uie-slider-label">
                        <span class="uie-slider-text">Brightness</span>
                        <span class="uie-slider-input-container">
                          <input type="range" class="uie-slider" data-filter="brightness" min="0" max="200" value="100">
                        </span>
                        <span class="uie-reset-icon-container" data-reset-for="brightness" title="Reset Brightness">
                          <i class="fas fa-sync-alt uie-reset-icon"></i>
                        </span>
                      </label>
                      <label class="uie-slider-label">
                        <span class="uie-slider-text">Contrast</span>
                        <span class="uie-slider-input-container">
                          <input type="range" class="uie-slider" data-filter="contrast" min="0" max="200" value="100">
                        </span>
                        <span class="uie-reset-icon-container" data-reset-for="contrast" title="Reset Contrast">
                          <i class="fas fa-sync-alt uie-reset-icon"></i>
                        </span>
                      </label>
                      <label class="uie-slider-label">
                        <span class="uie-slider-text">Saturation</span>
                        <span class="uie-slider-input-container">
                          <input type="range" class="uie-slider" data-filter="saturation" min="0" max="200" value="100">
                        </span>
                        <span class="uie-reset-icon-container" data-reset-for="saturation" title="Reset Saturation">
                          <i class="fas fa-sync-alt uie-reset-icon"></i>
                        </span>
                      </label>
                      <label class="uie-slider-label">
                        <span class="uie-slider-text">Hue</span>
                        <span class="uie-slider-input-container">
                          <input type="range" class="uie-slider" data-filter="hue" min="0" max="360" value="0">
                        </span>
                        <span class="uie-reset-icon-container" data-reset-for="hue" title="Reset Hue">
                          <i class="fas fa-sync-alt uie-reset-icon"></i>
                        </span>
                      </label>
                      <label class="uie-slider-label">
                        <span class="uie-slider-text">Zoom</span>
                        <span class="uie-slider-input-container">
                          <input type="range" class="uie-slider" data-cropper="zoom" min="0" max="200" value="0">
                        </span>
                        <span class="uie-reset-icon-container" data-reset-for="zoom" title="Reset Zoom">
                          <i class="fas fa-sync-alt uie-reset-icon"></i>
                        </span>
                      </label>
                    </div>
                    <div class="uie-reset-buttons-row">
                      <span class="uie-reset-btn" data-reset-for="crop" title="Reset Crop">
                        <i class="fas fa-crop"></i>
                      </span>
                      <span class="uie-reset-btn" data-reset-for="position" title="Center Image">
                        <i class="fas fa-arrows-alt"></i>
                      </span>
                    </div>
                  </div>
                  <div class="uie-presets-column">
                    <!-- Filter Presets Section -->
                    <div class="uie-presets-row uie-filter-presets">
                      <div class="uie-subpanel-header">Filter Presets</div>
                      <div class="uie-presets-scroll">
                        <!-- Dynamic filter presets will be loaded here -->
                      </div>
                    </div>
                    <!-- Crop Presets Section -->
                    <div class="uie-presets-row uie-crop-presets">
                      <div class="uie-subpanel-header">Crop Presets</div>
                      <div class="uie-presets-scroll">
                        <!-- Dynamic crop presets will be loaded here -->
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Action Buttons Panel -->
              <div class="uie-panel uie-actions-panel">
                <div class="uie-panel-content">
                  <button class="uie-action-button uie-save-button">Save</button>
                  <button class="uie-action-button uie-save-as-new-button">Save as New</button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Bottom Variant Strip -->
          <div class="uie-variant-strip">
            <div class="uie-variant-source">
              <div class="uie-panel-header">Source</div>
              <div class="uie-thumbnail uie-box">
                <div class="image-container">
                  <img class="uie-box-img" src="source-thumbnail.jpg" alt="Source Thumbnail">
                </div>
              </div>
            </div>
            <div class="uie-variant-thumbnails">
              <div class="uie-panel-header">Variants</div>
              <div class="uie-variant-scroll">
                <!-- Dynamically appended variant boxes will appear here -->
              </div>
            </div>
          </div>
        </div>
      `;
      $('body').append(editorHTML);
    }
  };

  /**
   * Polls the cropper state continuously to update the zoom slider.
   * Uses the formula: sliderValue = ((currentRatio / initialZoomRatio) - 1) * 100,
   * clamped to the slider's max value.
   */
  const pollZoomSlider = () => {
    if (!cropper) return;
    const data = cropper.getImageData();
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
    requestAnimationFrame(pollZoomSlider);
  };

  /**
   * Generates a thumbnail for a given preset.
   *
   * For filter presets:
   *   - Uses the current cropped canvas.
   *   - Applies the preset’s filter settings from preset_details.
   *   - Scales the result down proportionally.
   *
   * For crop presets:
   *   - Uses container and canvas data to determine the currently visible image region.
   *   - Simulates a new crop region whose width matches the full visible width.
   *   - The height is computed from the preset’s aspect ratio.
   *   - Pan and zoom are respected so that if part of the image is off-screen,
   *     the preview reflects what is visible – and the simulated crop is centered
   *     both horizontally and vertically.
   *   - The result is then scaled down proportionally.
   */
  const generatePresetThumbnail = (preset) => {
    return new Promise((resolve, reject) => {
      let sourceCanvas;
      if (cropper) {
        sourceCanvas = cropper.getCroppedCanvas();
      } else {
        const imgElement = document.getElementById('uie-image');
        if (!imgElement) return reject("No image element found.");
        sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = imgElement.naturalWidth;
        sourceCanvas.height = imgElement.naturalHeight;
        const sCtx = sourceCanvas.getContext('2d');
        sCtx.drawImage(imgElement, 0, 0);
      }

      if (preset.type === 'filter') {
        try {
          const details = JSON.parse(preset.preset_details);
          const { brightness, contrast, saturation, hue } = details;
          const presetFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;
          let tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = sourceCanvas.width;
          tmpCanvas.height = sourceCanvas.height;
          let tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.filter = presetFilter;
          tmpCtx.drawImage(sourceCanvas, 0, 0);
          const thumbCanvas = generateScaledThumbnail(tmpCanvas);
          resolve(thumbCanvas.toDataURL());
        } catch (err) {
          console.error("Error parsing filter preset details", err);
          reject(err);
        }
      } else if (preset.type === 'crop') {
        try {
          const details = JSON.parse(preset.preset_details);
          const aspectRatioStr = details.aspect_ratio; // e.g. "16:9"
          const parts = aspectRatioStr.split(':');
          const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);

          // Retrieve container and canvas data to determine visible area.
          const containerData = cropper.getContainerData();
          const canvasData = cropper.getCanvasData();
          const imageRect = { x: canvasData.left, y: canvasData.top, width: canvasData.width, height: canvasData.height };
          const containerRect = { x: 0, y: 0, width: containerData.width, height: containerData.height };
          const intX = Math.max(imageRect.x, containerRect.x);
          const intY = Math.max(imageRect.y, containerRect.y);
          const intRight = Math.min(imageRect.x + imageRect.width, containerRect.width);
          const intBottom = Math.min(imageRect.y + imageRect.height, containerRect.height);
          const visibleWidth = intRight - intX;
          const visibleHeight = intBottom - intY;

          // Convert visible area to natural image coordinates.
          const imgData = cropper.getImageData();
          const scaleX = imgData.naturalWidth / canvasData.width;
          const scaleY = imgData.naturalHeight / canvasData.height;
          const visibleNaturalX = (intX - canvasData.left) * scaleX;
          const visibleNaturalY = (intY - canvasData.top) * scaleY;
          const visibleNaturalWidth = visibleWidth * scaleX;
          const visibleNaturalHeight = visibleHeight * scaleY;

          // Simulate a new crop region that spans the full visible width.
          const newCropWidth = visibleNaturalWidth;
          const newCropHeight = newCropWidth / targetRatio;
          let finalCropWidth, finalCropHeight, finalCropX, finalCropY;
          if (newCropHeight > visibleNaturalHeight) {
            finalCropHeight = visibleNaturalHeight;
            finalCropWidth = finalCropHeight * targetRatio;
          } else {
            finalCropWidth = newCropWidth;
            finalCropHeight = newCropHeight;
          }
          // Center both horizontally and vertically within the visible natural region.
          finalCropX = visibleNaturalX + (visibleNaturalWidth - finalCropWidth) / 2;
          finalCropY = visibleNaturalY + (visibleNaturalHeight - finalCropHeight) / 2;

          // Draw the simulated crop region from the original image element,
          // applying the current active filter settings.
          const imageElem = document.getElementById('uie-image');
          let tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = finalCropWidth;
          tmpCanvas.height = finalCropHeight;
          let tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.filter = getCurrentFilterString();
          tmpCtx.drawImage(imageElem, finalCropX, finalCropY, finalCropWidth, finalCropHeight, 0, 0, finalCropWidth, finalCropHeight);
          const thumbCanvas = generateScaledThumbnail(tmpCanvas);
          resolve(thumbCanvas.toDataURL());
        } catch (err) {
          console.error("Error parsing crop preset details", err);
          reject(err);
        }
      } else {
        reject("Unknown preset type.");
      }
    });
  };

  /**
   * Loads media presets from the AJAX endpoint, dynamically renders them,
   * and stores them globally for later updates.
   */
  const loadMediaPresets = () => {
    $.ajax({
      url: '/ajax/getMediaPresets.php',
      method: 'GET',
      dataType: 'json',
      success: function(response) {
        presetsData = response;
        $('.uie-filter-presets .uie-presets-scroll').empty();
        $('.uie-crop-presets .uie-presets-scroll').empty();
        response.forEach(function(preset) {
          generatePresetThumbnail(preset).then(function(dataUrl) {
            const presetBox = `
              <div class="uie-preset-box uie-box" data-preset-id="${preset.id}" data-preset-type="${preset.type}" data-preset-details='${preset.preset_details}'>
                <div class="image-container">
                  <img class="uie-box-img" src="${dataUrl}" alt="${preset.name}">
                </div>
                <span class="uie-preset-caption uie-box-caption">${preset.name}</span>
              </div>
            `;
            if (preset.type === 'filter') {
              $('.uie-filter-presets .uie-presets-scroll').append(presetBox);
            } else if (preset.type === 'crop') {
              $('.uie-crop-presets .uie-presets-scroll').append(presetBox);
            }
          }).catch(function(err) {
            console.error("Error generating thumbnail for preset:", err);
          });
        });
      },
      error: function(err) {
        console.error("Error loading media presets:", err);
      }
    });
  };

  /**
   * Updates all preset thumbnails dynamically based on the current crop and filter settings.
   */
  const updatePresetThumbnails = () => {
    $('.uie-preset-box').each(function() {
      let $box = $(this);
      let presetType = $box.attr('data-preset-type');
      let details = $box.attr('data-preset-details');
      if (!details) return;
      let preset = { type: presetType, preset_details: details };
      generatePresetThumbnail(preset).then(function(dataUrl) {
        $box.find('.uie-box-img').attr('src', dataUrl);
      }).catch(function(err) {
        console.error("Error updating preset thumbnail:", err);
      });
    });
  };

  // Create a debounced version for updating preset thumbnails (300ms delay)
  debouncedUpdateThumbnails = debounce(updatePresetThumbnails, 300);

  /**
   * Binds click events for dynamically generated preset boxes.
   * When a preset is clicked, its settings are applied to the editor.
   *
   * For filter presets: update filter sliders.
   * For crop presets: compute new crop data (centering the crop) and update via cropper.setData() so the aspect ratio is not locked.
   */
  const bindPresetEvents = () => {
    $(document).off('click', '.uie-preset-box').on('click', '.uie-preset-box', function() {
      const presetType = $(this).attr('data-preset-type');
      let presetDetails;
      try {
        presetDetails = JSON.parse($(this).attr('data-preset-details'));
      } catch (err) {
        console.error("Error parsing preset details:", err);
        return;
      }
      if (presetType === 'filter') {
        if (presetDetails.brightness !== undefined)
          $('.uie-slider[data-filter="brightness"]').val(presetDetails.brightness).trigger('change');
        if (presetDetails.contrast !== undefined)
          $('.uie-slider[data-filter="contrast"]').val(presetDetails.contrast).trigger('change');
        if (presetDetails.saturation !== undefined)
          $('.uie-slider[data-filter="saturation"]').val(presetDetails.saturation).trigger('change');
        if (presetDetails.hue !== undefined)
          $('.uie-slider[data-filter="hue"]').val(presetDetails.hue).trigger('change');
        console.log("Applied filter preset:", presetDetails);
      } else if (presetType === 'crop') {
        if (presetDetails.aspect_ratio) {
          const parts = presetDetails.aspect_ratio.split(':');
          const ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
          if (cropper && ratio) {
            // Rather than locking the aspect ratio, we compute a centered crop region.
            const containerData = cropper.getContainerData();
            const canvasData = cropper.getCanvasData();
            const imageRect = { x: canvasData.left, y: canvasData.top, width: canvasData.width, height: canvasData.height };
            const containerRect = { x: 0, y: 0, width: containerData.width, height: containerData.height };
            const intX = Math.max(imageRect.x, containerRect.x);
            const intY = Math.max(imageRect.y, containerRect.y);
            const intRight = Math.min(imageRect.x + imageRect.width, containerRect.width);
            const intBottom = Math.min(imageRect.y + imageRect.height, containerRect.height);
            const visibleWidth = intRight - intX;
            const visibleHeight = intBottom - intY;
            const imgData = cropper.getImageData();
            const scaleX = imgData.naturalWidth / canvasData.width;
            const scaleY = imgData.naturalHeight / canvasData.height;
            const visibleNaturalX = (intX - canvasData.left) * scaleX;
            const visibleNaturalY = (intY - canvasData.top) * scaleY;
            const visibleNaturalWidth = visibleWidth * scaleX;
            const visibleNaturalHeight = visibleHeight * scaleY;
            const newCropWidth = visibleNaturalWidth;
            const newCropHeight = newCropWidth / ratio;
            let finalCropWidth, finalCropHeight, finalCropX, finalCropY;
            if (newCropHeight > visibleNaturalHeight) {
              finalCropHeight = visibleNaturalHeight;
              finalCropWidth = finalCropHeight * ratio;
            } else {
              finalCropWidth = newCropWidth;
              finalCropHeight = newCropHeight;
            }
            // Center the crop region within the visible natural area.
            finalCropX = visibleNaturalX + (visibleNaturalWidth - finalCropWidth) / 2;
            finalCropY = visibleNaturalY + (visibleNaturalHeight - finalCropHeight) / 2;
            cropper.setData({
              x: finalCropX,
              y: finalCropY,
              width: finalCropWidth,
              height: finalCropHeight
            });
            console.log("Applied crop preset with data:", { x: finalCropX, y: finalCropY, width: finalCropWidth, height: finalCropHeight });
          }
        }
      }
    });
  };

  /**
   * Opens the editor overlay, loads the image, initializes Cropper,
   * binds a debounced crop event to trigger preset updates,
   * loads media presets, and binds preset click events.
   */
  const openEditor = (imageUrl, callback) => {
    ensureOverlayExists();
    $('#uie-image').attr('src', imageUrl);
    $('.uie-thumbnail img').attr('src', imageUrl);
    $('#uie-overlay').removeClass('hidden').fadeIn(300, function() {
      if (cropper) { cropper.destroy(); }
      cropper = new Cropper(document.getElementById('uie-image'), {
        viewMode: 1,
        autoCropArea: 1,
        movable: true,
        scalable: true,
        zoomable: true,
        cropBoxResizable: true,
        responsive: true,
        guides: false,
        // Debounced crop event: update presets after changes settle.
        crop: function(e) {
          debouncedUpdateThumbnails();
        },
        ready: function() {
          const imageData = cropper.getImageData();
          initialZoomRatio = imageData.width / imageData.naturalWidth;
          initialCanvasData = cropper.getCanvasData();
          console.log("Initial zoom ratio:", initialZoomRatio);
          console.log("Initial canvas data:", initialCanvasData);
          $(".uie-slider[data-cropper='zoom']").val(0);
          requestAnimationFrame(pollZoomSlider);
          loadMediaPresets();
          bindPresetEvents();
        }
      });
      console.log("Cropper initialized on image:", imageUrl);
    });
    $('.uie-close-button').off('click').on('click', () => { closeEditor(); });
  };

  /**
   * Closes the editor overlay and destroys the Cropper instance.
   */
  const closeEditor = () => {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    $('#uie-overlay').fadeOut(300, function() {
      $('#uie-overlay').addClass('hidden');
    });
    console.log("Closed editor overlay.");
  };

  /**
   * Generates a filtered data URL from the cropped canvas
   * (using the same logic as variant saving).
   */
  const getFilteredCroppedImageUrl = (canvas) => {
    const brightness = $('.uie-slider[data-filter="brightness"]').val() || 100;
    const contrast   = $('.uie-slider[data-filter="contrast"]').val() || 100;
    const saturation = $('.uie-slider[data-filter="saturation"]').val() || 100;
    const hue        = $('.uie-slider[data-filter="hue"]').val() || 0;
    const filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;
    
    const filteredCanvas = document.createElement('canvas');
    filteredCanvas.width = canvas.width;
    filteredCanvas.height = canvas.height;
    const ctx = filteredCanvas.getContext('2d');
    ctx.filter = filterString;
    ctx.drawImage(canvas, 0, 0);
    return filteredCanvas.toDataURL();
  };

  /**
   * Binds static event handlers for various UI controls.
   * Also triggers debounced preset thumbnail updates when filters, zoom, or pan change.
   */
  const bindStaticEvents = () => {
    ensureOverlayExists();
		
		$('.uie-save-button').off('click').on('click', function() {
			if (cropper) {
				const canvas = cropper.getCroppedCanvas();
				if (canvas) {
					const croppedImageUrl = getFilteredCroppedImageUrl(canvas);
					console.log("Cropped image data URL (Save):", croppedImageUrl);
					$('.uie-variant-scroll').append(`
						<div class="uie-variant-box uie-box">
							<div class="image-container">
								<img class="uie-box-img" src="${croppedImageUrl}" alt="Cropped Variant">
							</div>
							<span class="uie-variant-caption uie-box-caption">New Variant</span>
						</div>
					`);
				} else {
					console.error("No cropped canvas available.");
				}
			}
		});
		
		$('.uie-save-as-new-button').off('click').on('click', function() {
			if (cropper) {
				const canvas = cropper.getCroppedCanvas();
				if (canvas) {
					const croppedImageUrl = getFilteredCroppedImageUrl(canvas);
					console.log("Cropped image data URL (Save as New):", croppedImageUrl);
					$('.uie-variant-scroll').append(`
						<div class="uie-variant-box uie-box">
							<div class="image-container">
								<img class="uie-box-img" src="${croppedImageUrl}" alt="Cropped Variant">
							</div>
							<span class="uie-variant-caption uie-box-caption">New Variant</span>
						</div>
					`);
				} else {
					console.error("No cropped canvas available.");
				}
			}
		});

		
    $('.uie-reset-icon-container').off('click').on('click', function() {
      const resetTarget = $(this).data('reset-for');
      if (!resetTarget) return;
      switch (resetTarget) {
        case "zoom":
          if (cropper) {
            cropper.zoomTo(initialZoomRatio);
            $(".uie-slider[data-cropper='zoom']").val(0);
            console.log('Zoom reset to fitted state:', initialZoomRatio);
          }
          break;
        case "brightness":
          $('.uie-slider[data-filter="brightness"]').val(100).trigger('change');
          break;
        case "contrast":
          $('.uie-slider[data-filter="contrast"]').val(100).trigger('change');
          break;
        case "saturation":
          $('.uie-slider[data-filter="saturation"]').val(100).trigger('change');
          break;
        case "hue":
          $('.uie-slider[data-filter="hue"]').val(0).trigger('change');
          break;
      }
    });
    $('.uie-reset-btn').off('click').on('click', function() {
      const resetTarget = $(this).data('reset-for');
      if (!resetTarget) return;
      switch (resetTarget) {
        case "crop":
          if (cropper) {
            const savedCanvasData = cropper.getCanvasData();
            cropper.reset();
            cropper.setCanvasData(savedCanvasData);
            console.log('Crop reset while preserving pan and zoom:', savedCanvasData);
          }
          break;
        case "position":
          if (cropper) {
            const containerData = cropper.getContainerData();
            const imageData = cropper.getImageData();
            const newLeft = (containerData.width - imageData.width) / 2;
            const newTop = (containerData.height - imageData.height) / 2;
            cropper.setCanvasData({ left: newLeft, top: newTop });
            console.log("Centered the image:", newLeft, newTop);
          }
          break;
      }
    });
    // For filter sliders, use "change".
    $('.uie-slider[data-filter]').off('change').on('change', function() {
      const brightness = $('.uie-slider[data-filter="brightness"]').val();
      const contrast   = $('.uie-slider[data-filter="contrast"]').val();
      const saturation = $('.uie-slider[data-filter="saturation"]').val();
      const hue        = $('.uie-slider[data-filter="hue"]').val();
      $('#uie-image, .cropper-view-box img').css("filter",
        `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`
      );
      console.log("Filter updated:", brightness, contrast, saturation, hue);
      debouncedUpdateThumbnails();
    });
    // For zoom slider, use "input" for immediate zoom‐updating, and "change" for updating thumbnails.
    $('.uie-slider[data-cropper="zoom"]').off('input').on('input', function() {
      if (cropper) {
        let sliderValue = parseFloat($(this).val());
        const sliderMax = parseFloat($(this).attr("max"));
        let newZoom = ((sliderValue / 100) + 1) * initialZoomRatio;
        const maxZoom = (((sliderMax) / 100) + 1) * initialZoomRatio;
        if (newZoom > maxZoom) { newZoom = maxZoom; }
        if (newZoom < initialZoomRatio) { newZoom = initialZoomRatio; }
        cropper.zoomTo(newZoom);
        console.log("Zoom updated via slider (input):", newZoom);
      }
    });
    $('.uie-slider[data-cropper="zoom"]').off('change').on('change', function() {
      debouncedUpdateThumbnails();
    });
  };

  $(document).ready(() => {
    bindStaticEvents();
    console.log("Static UnifiedImageEditor initialized.");
  });

  return { openEditor, closeEditor };
})();
