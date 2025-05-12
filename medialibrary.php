<?php
// globalMediaLibrary.php
include 'inc/loginanddb.php';
// Any additional initialization related to media can be done here.
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Global Media Library Manager</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Centralized stylesheets with dynamic versioning -->
  <link href="css/techlology.css?v=<?php echo filemtime('css/techlology.css'); ?>" rel="stylesheet" type="text/css">
  <link href="css/medialibrary.css?v=<?php echo filemtime('css/medialibrary.css'); ?>" rel="stylesheet" type="text/css">
  
  <!-- jQuery & jQuery UI (as used in addarticle.php) -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
  <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/smoothness/jquery-ui.css">

  <!-- Cropper.js CSS and JS for image manipulation -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css" crossorigin="anonymous" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js" crossorigin="anonymous"></script>
  
  <!-- Unified Image Editor to share the same image manipulation workflow -->
  <script src="js/UnifiedImageEditor.js"></script>
  
  <!-- Minimal Custom JS for the Media Library page -->
  <script src="js/mediaLibrary.js"></script>
</head>
<body>
  <div class="layout">
    <!-- Left Sidebar Navigation (same as in addarticle.php) -->
    <div class="sidebar">
      <?php include 'inc/nav.php'; ?>
    </div>
    
    <!-- Middle Column: Global Media Library Manager -->
    <div class="main">
      <h1>Global Media Library Manager</h1>
      <!-- A status area (can show “loading…” or error messages) -->
      <div id="status" style="margin-bottom:10px; font-style:italic; color:#aaa;">Loading media items...</div>
      
      <!-- Search Bar -->
      <div class="search-bar">
        <input type="text" id="searchInput" placeholder="Search media by tags or filename...">
      </div>
      
      <!-- Media Library Container -->
      <div class="media-library-container">
        <div class="media-grid" id="mediaGrid">
          <!-- Media items will be loaded dynamically via AJAX from /ajax/getMediaItems.php -->
        </div>
      </div>
    </div>
    
    <!-- (Optional) Right Column: If you want to add bulk controls, you can include them here -->
    <!-- 
    <div class="controls">
      <div class="card">
        <h3>Bulk Actions</h3>
        <button type="button" id="bulkDelete">Delete Selected</button>
      </div>
    </div>
    -->
  </div>
  <!-- End .layout -->
  
  <!-- Cropper Modal (shared with addarticle.php) -->
  <div id="cropper-modal" class="cropper-modal" style="display: none;">
    <div class="cropper-area">
      <img id="cropper-image" src="" alt="Crop your image">
    </div>
    <div class="cropper-controls">
      <div class="slider-group">
        <label for="brightness-slider">Brightness</label>
        <input type="range" id="brightness-slider" min="50" max="150" value="100">
      </div>
      <div class="slider-group">
        <label for="contrast-slider">Contrast</label>
        <input type="range" id="contrast-slider" min="50" max="150" value="100">
      </div>
      <div class="slider-group">
        <label for="saturation-slider">Saturation</label>
        <input type="range" id="saturation-slider" min="50" max="150" value="100">
      </div>
      <div class="slider-group">
        <label for="hue-slider">Hue</label>
        <input type="range" id="hue-slider" min="0" max="360" value="0">
      </div>
      <div class="action-buttons">
        <button type="button" id="cropper-crop-button">Crop</button>
        <button type="button" id="cropper-save-new-image">Save New Image</button>
        <button type="button" id="cropper-cancel-button">Cancel</button>
        <button type="button" id="cropper-zoom-in">Zoom In</button>
        <button type="button" id="cropper-zoom-out">Zoom Out</button>
        <button type="button" id="cropper-reset">Reset</button>
      </div>
      <div id="cropper-live-preview" class="live-preview"></div>
    </div>
  </div>
</body>
</html>
