<?php
// addarticle.php
include 'inc/loginanddb.php';

// Retrieve section types from the database.
$sectionQuery = $db->query("SELECT id, name FROM section_types ORDER BY id");
$sectionTypes = $sectionQuery->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Add New Article</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Main Stylesheet -->
  <link href="css/techlology.css?v=<?php echo filemtime('css/techlology.css'); ?>" rel="stylesheet" type="text/css">
  <!-- jQuery & jQuery UI for autocomplete and sortable interactions -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
  <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/smoothness/jquery-ui.css">
  <!-- Cropper.js CSS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css" crossorigin="anonymous" />
</head>
<body>
<div class="layout">
  <!-- Sidebar Navigation -->
  <div class="sidebar">
    <?php include 'inc/nav.php'; ?>
  </div>
  <!-- Main Content -->
  <div class="main">
    <h1>Add New Article</h1>
    <!-- Autosave Status -->
    <div id="autosave-status" style="margin-bottom:10px; font-style:italic; color:#aaa;"></div>
    
    <!-- Segmented Form -->
    <form action="addarticlepost.php" method="post" enctype="multipart/form-data" id="article-form">
      
      <!-- Step 1: Fixed Information & Tags -->
      <div class="form-step" id="step-1">
        <div class="card">
          <h2>Fixed Information</h2>
          <label for="title">Article Title:</label>
          <input type="text" name="title" id="title" required>
          <label for="tagline">Tagline:</label>
          <input type="text" name="tagline" id="tagline" required>
          <!-- Thumbnail Dropzone -->
          <div class="dropzone dropzone-thumbnail">
            <p>Drag &amp; drop thumbnail here or click to upload</p>
            <input type="file" name="thumbnail" accept="image/*" class="hidden-file-input">
          </div>
          <div class="thumbnail-preview"></div>
        </div>
        <div class="card">
          <h2>Tags</h2>
          <input type="text" name="tags" id="tags" placeholder="Type a tag (min 3 characters)" autocomplete="off">
          <div id="selected-tags"></div>
          <input type="hidden" name="selected_tags" id="selected_tags_input">
        </div>
        <div class="nav-buttons">
          <button type="button" class="next-step">Next &raquo;</button>
        </div>
      </div>
      
      <!-- Step 2: Modular Content Sections -->
      <div class="form-step" id="step-2">
        <div class="card" id="modular-content">
          <h2>Modular Content</h2>
          <!-- Top Section Selector -->
          <select id="section-type-selector-top">
            <option value="" disabled selected>Select Section Type</option>
            <?php foreach($sectionTypes as $section): ?>
              <option value="<?php echo $section['id']; ?>"><?php echo ucfirst($section['name']); ?></option>
            <?php endforeach; ?>
          </select>
          <div id="sections-container">
            <!-- Dynamically added sections will appear here -->
          </div>
          <!-- Bottom Section Selector; hidden if no section added -->
          <select id="section-type-selector-bottom" style="display:none;">
            <option value="" disabled selected>Select Section Type</option>
            <?php foreach($sectionTypes as $section): ?>
              <option value="<?php echo $section['id']; ?>"><?php echo ucfirst($section['name']); ?></option>
            <?php endforeach; ?>
          </select>
          <small class="section-note">* Use the selector to add a new section</small>
          <input type="hidden" name="section_present" id="section_present_input">
        </div>
        <div class="nav-buttons">
          <button type="button" class="prev-step">&laquo; Back</button>
          <button type="button" class="next-step">Next &raquo;</button>
        </div>
      </div>
      
      <!-- Step 3: Sources, Preview, and Save -->
      <div class="form-step" id="step-3">
        <div class="card" id="sources-section">
          <h2>Sources &amp; Citations</h2>
          <div id="sources-container">
            <div class="source">
              <label>Source Title:</label>
              <input type="text" name="source_title[]" required>
              <label>URL:</label>
              <input type="url" name="source_url[]" required>
              <label>Note:</label>
              <textarea name="source_note[]" rows="2" placeholder="Optional note"></textarea>
            </div>
          </div>
          <button type="button" id="add-source-btn">Add Source</button>
        </div>
        <div class="card">
          <button type="button" id="preview-button">Preview Article</button>
          <input type="submit" value="Save Article">
        </div>
        <div class="nav-buttons">
          <button type="button" class="prev-step">&laquo; Back</button>
        </div>
      </div>
      
    </form>
  </div>
</div>

<!-- Cropper Modal -->
<div id="cropper-modal" class="cropper-modal" style="display: none;">
  <!-- Cropper Area: Holds the image only -->
  <div id="cropper-area" class="cropper-area">
    <img id="cropper-image" src="" alt="Crop your image">
  </div>
  
  <!-- Gallery Navigation Controls (only visible in gallery mode) -->
  <div id="gallery-nav" class="gallery-nav" style="display: none;">
    <button type="button" id="prev-image-btn">&larr;</button>
    <span id="gallery-counter"></span>
    <button type="button" id="next-image-btn">&rarr;</button>
  </div>

  <!-- Controls Section (placed outside the crop area) -->
  <div id="cropper-controls" class="cropper-controls">
    <!-- Aspect Ratio Buttons -->
    <div class="aspect-ratio-controls">
      <button type="button" class="aspect-btn" data-ratio="1">1:1</button>
      <button type="button" class="aspect-btn" data-ratio="16/9">16:9</button>
      <button type="button" class="aspect-btn" data-ratio="4/3">4:3</button>
      <button type="button" class="aspect-btn" data-ratio="NaN">Freeform</button>
    </div>

    <!-- Zoom & Fit Controls -->
    <div class="zoom-fit-controls">
      <div class="zoom-control">
        <label for="zoom-slider">Zoom:</label>
        <input type="range" id="zoom-slider" min="0.1" max="2" step="0.05" value="1">
      </div>
      <button type="button" id="reset-zoom-btn">Reset Zoom</button>
      <button type="button" id="fit-image-btn">Fit Image</button>
    </div>

    <!-- Live Preview -->
    <div class="live-preview-wrapper">
      <div class="live-preview">
        <h3>Live Preview</h3>
        <div id="cropper-live-preview"></div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button type="button" id="cropper-crop-button">Crop</button>
      <button type="button" id="cropper-cancel-button">Cancel</button>
    </div>
  </div>
</div>

<!-- Preview Modal -->
<div id="preview-modal" class="preview-modal" style="display: none;">
  <div class="preview-modal-content">
    <button type="button" id="preview-close" class="preview-close">&times;</button>
    <div id="preview-modal-content"></div>
  </div>
</div>

<!-- Cropper.js Script -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js" crossorigin="anonymous"></script>
<!-- Custom Script Modules (ensure proper order: Sections loads first) -->
<script src="js/sections.js"></script>
<script src="js/imageEditor.js"></script>
<script src="js/dropzones.js"></script>
<script src="js/tags.js"></script>
<script src="js/sources.js"></script>
<script src="js/lightbox.js"></script>
<script src="js/autosave.js"></script>
<script src="js/validation.js"></script>
<script src="js/preview.js"></script>
<script src="js/segmented.js"></script>
<script src="js/keyboard.js"></script>
<script src="js/app.js"></script>
</body>
</html>
