// UnifiedImageEditor.js – Updated Static Example with Full Screen Overlay, Variant Strip, Metadata, and Controls
const UnifiedImageEditor = (() => {
  'use strict';

  /**
   * Injects the new editor overlay HTML into the DOM if it doesn't already exist.
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
								<img id="uie-image" src="your-image.jpg" alt="Editable Image">
								<!-- Crop overlay (areas outside active crop are heavily darkened) -->
								<div class="uie-crop-overlay"></div>
							</div>
						</div>
						
						<!-- Right Column: Control Panel -->
						<div class="uie-right-column">
							<!-- Row 1: Metadata Panel -->
							<div class="uie-panel uie-metadata-panel">
								<div class="uie-panel-header">Metadata</div>
								<div class="uie-panel-content">
									<input type="text" class="uie-alt-text" placeholder="Alt Text">
									<textarea class="uie-caption" placeholder="Caption"></textarea>
								</div>
							</div>
							
							<!-- Row 2: Tags Panel -->
							<div class="uie-panel uie-tags-panel">
								<div class="uie-panel-header">Tags</div>
								<div class="uie-panel-content">
									<input type="text" class="uie-tag-input" placeholder="Add tag...">
									<div class="uie-tag-list"></div>
								</div>
							</div>
							
							<!-- Row 3: Combined Controls & Presets Panel -->
							<div class="uie-panel uie-controls-presets-panel">
								<div class="uie-controls-presets-content">
									<!-- Left Sub-Panel: Slider Controls -->
									<div class="uie-controls-column">
										<div class="uie-subpanel-header">Image Controls</div>
										<div class="uie-sliders">
											<label>Brightness <input type="range" class="uie-slider" min="0" max="200" value="100"></label>
											<label>Contrast <input type="range" class="uie-slider" min="0" max="200" value="100"></label>
											<label>Saturation <input type="range" class="uie-slider" min="0" max="200" value="100"></label>
											<label>Hue <input type="range" class="uie-slider" min="0" max="360" value="0"></label>
											<label>Zoom <input type="range" class="uie-slider" min="50" max="200" value="100"></label>
										</div>
									</div>
									<!-- Right Sub-Panel: Presets -->
									<div class="uie-presets-column">
										<!-- Filter Presets Row -->
										<div class="uie-presets-row uie-filter-presets">
											<div class="uie-subpanel-header">Filter Presets</div>
											<div class="uie-presets-scroll">
												<!-- Example preset box -->
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<!-- Add additional preset boxes as needed -->
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
												<div class="uie-preset-box" data-filter="sepia">
													<img src="filter-sepia.jpg" alt="Sepia preview">
													<span class="uie-preset-caption">Sepia</span>
												</div>
											</div>
										</div>
										<!-- Crop Presets Row -->
										<div class="uie-presets-row uie-crop-presets">
											<div class="uie-subpanel-header">Crop Presets</div>
											<div class="uie-presets-scroll">
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<!-- Add additional crop preset boxes as needed -->
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
												<div class="uie-preset-box" data-crop="16:9">
													<img src="crop-16-9.jpg" alt="16:9 preview">
													<span class="uie-preset-caption">16:9</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
							
							<!-- Row 4: Action Buttons Panel (no header here) -->
							<div class="uie-panel uie-actions-panel">
								<div class="uie-panel-content">
									<button class="uie-action-button uie-save-button">Save</button>
									<button class="uie-action-button uie-reset-crop-button">Reset Crop</button>
									<button class="uie-action-button uie-reset-zoom-button">Reset Zoom</button>
								</div>
							</div>
						</div>
					</div>
					
					<!-- Bottom Variant Strip -->
					<div class="uie-variant-strip">
						<!-- Left: Source Section -->
						<div class="uie-variant-source">
							<div class="uie-panel-header">Source</div>
							<div class="uie-thumbnail">
								<img src="source-thumbnail.jpg" alt="Source Thumbnail">
							</div>
						</div>
						<!-- Right: Variants Section -->
						<div class="uie-variant-thumbnails">
							<div class="uie-panel-header">Variants</div>
							<div class="uie-variant-scroll">
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<!-- Additional variant boxes as needed -->
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
								<div class="uie-variant-box">
									<img src="variant1.jpg" alt="Variant 1">
									<span class="uie-variant-caption">Variant 1</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			`;
			$('body').append(editorHTML);
		}
	};

  /**
   * Opens the editor overlay (static sample).
   * @param {string} imageUrl - The URL of the image to display.
   * @param {function} callback - (Not used in static mode)
   */
  const openEditor = (imageUrl, callback) => {
    ensureOverlayExists();
    // Set the main image and original thumbnail (currently using the same image).
    $('#uie-image').attr('src', imageUrl);
    $('#uie-original-thumb').attr('src', imageUrl);
    // Show the overlay.
    $('#uie-overlay').removeClass('hidden').fadeIn(300);
    console.log("Opened static Unified Image Editor overlay for image:", imageUrl);
  };

  /**
   * Closes the editor overlay.
   */
  const closeEditor = () => {
    $('#uie-overlay').fadeOut(300, () => {
      $('#uie-overlay').addClass('hidden');
    });
    console.log("Closed static editor overlay.");
  };

  /**
   * Binds static event handlers for controls.
   */
  const bindStaticEvents = () => {
    ensureOverlayExists();

    // Close button
    $('#uie-close-btn').off('click').on('click', () => { closeEditor(); });

    // Cancel button.
    $('#uie-cancel-btn').off('click').on('click', () => { closeEditor(); });

    // Revert to source button.
    $('#uie-back-to-source').off('click').on('click', () => {
      console.log("Reverting to original source image.");
    });

    // Log actions for Crop, Save, Zoom In/Out, Reset.
    $('#uie-crop-btn').off('click').on('click', () => { console.log("Static: Crop button clicked."); });
    $('#uie-save-btn').off('click').on('click', () => { console.log("Static: Save New Image button clicked."); });
    $('#uie-zoom-in-btn').off('click').on('click', () => { console.log("Static: Zoom In button clicked."); });
    $('#uie-zoom-out-btn').off('click').on('click', () => { console.log("Static: Zoom Out button clicked."); });
    $('#uie-reset-btn').off('click').on('click', () => { console.log("Static: Reset button clicked."); });

    // Bind slider events for logging.
    $('.uie-slider-group input[type="range"]').off('input').on('input', function() {
      console.log(this.id, "changed to", this.value);
    });

    // Tags: add tag when Enter is pressed.
    $('#uie-new-tag').off('keyup').on('keyup', function(e) {
      if (e.key === 'Enter' && this.value.trim() !== "") {
        let tagText = this.value.trim();
        let $tag = $('<div class="uie-tag"></div>').text(tagText);
        $('#uie-tags-container').append($tag);
        this.value = "";
        console.log("Added tag:", tagText);
      }
    });

    // Variant selection: update main image source when a variant is clicked.
    $('.variant-item').off('click').on('click', function() {
      $('.variant-item').removeClass('active');
      $(this).addClass('active');
      let newSrc = $(this).find('img').attr('src');
      $('#uie-image').attr('src', newSrc);
      console.log("Switched to variant:", newSrc);
    });
  };

  // Initialize static events on document ready.
  $(document).ready(() => {
    bindStaticEvents();
    console.log("Static UnifiedImageEditor initialized for styling.");
  });

  return { openEditor, closeEditor };
})();
