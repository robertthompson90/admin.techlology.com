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
  <!-- Main Merged Stylesheet -->
  <link href="css/techlology.css?v=<?php echo filemtime('css/techlology.css'); ?>" rel="stylesheet" type="text/css">

  <!-- jQuery & jQuery UI for autocomplete and sortable interactions -->
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
  <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/smoothness/jquery-ui.css">
  
  <!-- Optional: Cropper.js default CSS (if desired) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css" crossorigin="anonymous" />
</head>
<body>
<div class="layout">
  <!-- Sidebar Navigation (existing) -->
  <div class="sidebar">
    <?php include 'inc/nav.php'; ?>
  </div>
  
  <!-- Main Content -->
  <div class="main">
    <h1>Add New Article</h1>
    <!-- Autosave Status -->
    <div id="autosave-status" style="margin-bottom:10px; font-style:italic; color:#aaa;">Autosave status...</div>
    
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
				<div class="card">
					<h2>SEO &amp; Metadata</h2>
					<label for="seo_title">SEO Title:</label>
					<input type="text" name="seo_title" id="seo_title" placeholder="Enter SEO title">
					<label for="meta_description">Meta Description:</label>
					<textarea name="meta_description" id="meta_description" rows="3" placeholder="Enter meta description"></textarea>
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
  
  <!-- Global Media Library and Staging Area Panel -->
  <div class="media-panels">
    <div id="staging-area">
      <h3>Staging Area</h3>
      <div id="staging-media">
        <!-- Your JS can load media assets here that are used in this article -->
      </div>
    </div>
    <div id="global-media-library">
      <h3>Global Media Library</h3>
      <div id="global-media">
        <!-- Your JS can load all global media assets along with tag filters -->
      </div>
    </div>
  </div>
  
</div> <!-- End of .layout -->

<!-- Advanced Cropper Modal for Image Editing -->
<div id="cropper-modal" class="cropper-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="cropper-modal-title">
  <div id="cropper-area" class="cropper-area">
    <img id="cropper-image" src="" alt="Crop your image">
  </div>
  <div id="cropper-controls" class="cropper-controls">
    <h2 id="cropper-modal-title" class="visually-hidden">Advanced Image Editor</h2>
    <div class="advanced-controls">
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
    </div>
    <div class="action-buttons">
      <button type="button" id="cropper-crop-button">Crop</button>
      <button type="button" id="cropper-save-new-image">Save New Image</button>
      <button type="button" id="cropper-cancel-button">Cancel</button>
    </div>
    <div class="live-preview-wrapper">
      <div class="live-preview">
        <h3>Live Preview</h3>
        <div id="cropper-live-preview"></div>
      </div>
    </div>
  </div>
</div>

<!-- Preview Modal for Live Article Preview -->
<div id="preview-modal" class="preview-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
  <div class="preview-modal-content">
    <button type="button" id="preview-close" class="preview-close" aria-label="Close Preview">&times;</button>
    <h2 id="preview-modal-title" class="visually-hidden">Article Preview</h2>
    <div id="preview-modal-content"></div>
  </div>
</div>

<!-- Cropper.js Script -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js" crossorigin="anonymous"></script>

<!-- Custom Script Modules – Ensure proper load order -->
<script src="js/sections.js"></script>
<script src="js/imageEditor.js"></script>
<script src="js/advancedImageEditor.js"></script>
<script src="js/dropzones.js"></script>
<script src="js/tags.js"></script>
<script src="js/sources.js"></script>
<script src="js/lightbox.js"></script>
<script src="js/notifications.js"></script>
<script src="js/autosave.js"></script>
<script src="js/validation.js"></script>
<script src="js/preview.js"></script>
<script src="js/segmented.js"></script>
<script src="js/keyboard.js"></script>
<script src="js/mediaLibrary.js"></script>
<script src="js/formTabs.js"></script>
<script src="js/globalErrorHandler.js"></script>
<script src="js/mediaUpload.js"></script>
<script src="js/pluginManager.js"></script>
<script src="js/samplePlugin.js"></script>
<script src="js/roleBasedUI.js"></script>
<script src="js/undoRedo.js"></script>
<script src="js/stagingArea.js"></script>
<script src="js/app.js"></script>

</body>
</html>
