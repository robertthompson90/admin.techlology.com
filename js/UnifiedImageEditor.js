// UnifiedImageEditor.js

// We use an IIFE to encapsulate our unified editor
const UnifiedImageEditor = (() => {
  'use strict';

  let cropper = null;
  let _saveCallback = null;
  let currentFilters = { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

  /**
   * Opens the editor modal, loads the image, and initializes Cropper.js.
   * @param {string} imageUrl - The URL of the image to edit.
   * @param {function} callback - Called with the edited image data URL when saved.
   */
  const openEditor = (imageUrl, callback) => {
    _saveCallback = callback;
    // Set the source of the image element in the modal.
    $('#cropper-image').attr('src', imageUrl);
    // Display the modal.
    $('#cropper-modal').fadeIn(300, () => {
      // Once visible, initialize Cropper.js.
      initializeCropper();
    });
  };

  /**
   * Initializes Cropper.js on the image element.
   */
  const initializeCropper = () => {
    const imageElement = document.getElementById('cropper-image');
    if (cropper) {
      cropper.destroy();
    }
    cropper = new Cropper(imageElement, {
      aspectRatio: 16 / 9, // Example ratio. Adjust as needed.
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
    });
  };

  /**
   * Updates the live preview element by applying CSS filters.
   */
  const updateLivePreview = () => {
    const filterStr = `brightness(${currentFilters.brightness}%) contrast(${currentFilters.contrast}%) ` +
                      `saturate(${currentFilters.saturation}%) hue-rotate(${currentFilters.hue}deg)`;
    $('#cropper-live-preview').css('filter', filterStr);
  };

  /**
   * Binds slider events to update filter values.
   */
  const bindFilterControls = () => {
    $('#brightness-slider').on('input', function () {
      currentFilters.brightness = parseInt(this.value, 10);
      updateLivePreview();
    });
    $('#contrast-slider').on('input', function () {
      currentFilters.contrast = parseInt(this.value, 10);
      updateLivePreview();
    });
    $('#saturation-slider').on('input', function () {
      currentFilters.saturation = parseInt(this.value, 10);
      updateLivePreview();
    });
    $('#hue-slider').on('input', function () {
      currentFilters.hue = parseInt(this.value, 10);
      updateLivePreview();
    });
  };

  /**
   * Resets filter values to defaults.
   */
  const resetFilters = () => {
    currentFilters = { brightness: 100, contrast: 100, saturation: 100, hue: 0 };
    $('#brightness-slider').val(100);
    $('#contrast-slider').val(100);
    $('#saturation-slider').val(100);
    $('#hue-slider').val(0);
    updateLivePreview();
  };

  /**
   * Zooms the image via Cropper.js.
   * @param {number} ratio - The amount to zoom in (positive) or out (negative).
   */
  const zoomImage = (ratio) => {
    if (cropper) {
      cropper.zoom(ratio);
    }
  };

  /**
   * Resets the cropper and filter values.
   */
  const resetCropper = () => {
    if (cropper) {
      cropper.reset();
      resetFilters();
    }
  };

  /**
   * Crops the current image and applies the filters non-destructively.
   * Returns a data URL of the final image.
   * @returns {string} data URL of the processed image.
   */
  const cropImage = () => {
    if (!cropper) return '';
    // Get the cropped canvas from Cropper.js.
    const croppedCanvas = cropper.getCroppedCanvas();
    // Apply the CSS filters onto a new canvas.
    const offCanvas = document.createElement('canvas');
    offCanvas.width = croppedCanvas.width;
    offCanvas.height = croppedCanvas.height;
    const ctx = offCanvas.getContext('2d');
    const filterStr = `brightness(${currentFilters.brightness}%) contrast(${currentFilters.contrast}%) ` +
                      `saturate(${currentFilters.saturation}%) hue-rotate(${currentFilters.hue}deg)`;
    // Set the context filter before drawing.
    ctx.filter = filterStr;
    ctx.drawImage(croppedCanvas, 0, 0);
    return offCanvas.toDataURL('image/jpeg');
  };

  /**
   * Closes the editor modal and cleans up the Cropper instance.
   */
  const closeEditor = () => {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    $('#cropper-modal').fadeOut(300);
    resetFilters();
  };

  /**
   * Binds all necessary event handlers within the modal.
   */
  const bindEditorEvents = () => {
    // Crop button: simply crop and return the image.
    $('#cropper-crop-button').on('click', () => {
      try {
        const dataURL = cropImage();
        if (typeof _saveCallback === 'function') {
          _saveCallback(dataURL);
        }
        closeEditor();
        Notifications.show('Image cropped successfully.', 'success');
      } catch (err) {
        Notifications.show('Error during cropping: ' + err.message, 'error');
      }
    });

    // Save New Image: same as cropping but keyed as “save new”.
    $('#cropper-save-new-image').on('click', () => {
      try {
        const dataURL = cropImage();
        if (typeof _saveCallback === 'function') {
          _saveCallback(dataURL);
        }
        closeEditor();
        Notifications.show('New image saved.', 'success');
      } catch (err) {
        Notifications.show('Error saving new image: ' + err.message, 'error');
      }
    });

    // Cancel button: close editor without changes.
    $('#cropper-cancel-button').on('click', () => {
      closeEditor();
      Notifications.show('Image editing cancelled.', 'info');
    });

    // Example zoom controls (ensure corresponding buttons exist in your HTML)
    $('#cropper-zoom-in').on('click', () => zoomImage(0.1));
    $('#cropper-zoom-out').on('click', () => zoomImage(-0.1));
    $('#cropper-reset').on('click', () => resetCropper());
  };

  /**
   * Initializes the unified image editor by binding filter controls and editor events.
   */
  const init = () => {
    bindFilterControls();
    bindEditorEvents();
  };

  // Auto-initialize once the document is ready.
  $(document).ready(() => {
    init();
  });

  // The module's public API.
  return { openEditor };
})();

// Export for later use if using a module bundler (optional)
// export default UnifiedImageEditor;
