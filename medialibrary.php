<?php
// medialibrary.php
include 'inc/loginanddb.php';
// Any additional initialization if needed.
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Global Media Library Manager</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Core and override stylesheets -->
  <link href="css/global.css?v=<?php echo filemtime('css/global.css'); ?>" rel="stylesheet" type="text/css">
  <link href="css/medialibrary.css?v=<?php echo filemtime('css/medialibrary.css'); ?>" rel="stylesheet" type="text/css">
	<link href="css/unifiedimageeditor.css?v=<?php echo filemtime('css/unifiedimageeditor.css'); ?>" rel="stylesheet" type="text/css">
  
  <!-- jQuery and jQuery UI (same as addarticle.php) -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
  <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/smoothness/jquery-ui.css">
  
  <!-- Cropper.js for image manipulation -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css" crossorigin="anonymous">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js" crossorigin="anonymous"></script>
  
  <!-- Shared Image Editor and Media Library JavaScript modules -->
  <script src="js/UnifiedImageEditor.js"></script>
  <script src="js/mediaLibrary.js"></script>
	<script src="js/app.js"></script>
</head>
<body class="media-library-page">
  <div class="layout">
    <!-- Sidebar (Navigation) -->
    <div class="sidebar">
      <?php include 'inc/nav.php'; ?>
    </div>
    
    <!-- Main Content Area -->
    <div class="main">
      <h1>Global Media Library Manager</h1>
      
      <!-- Container for Media Grid -->
      <div id="global-media">
        <!-- Media items will be dynamically inserted here via mediaLibrary.js -->
      </div>
    </div>
  </div>
  <!-- End .layout -->
  
  <!-- Cropper Modal (shared with addarticle.php for image editing) -->
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
