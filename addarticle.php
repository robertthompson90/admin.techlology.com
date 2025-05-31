<?php
// addarticle.php
// Version 1.4 - Removed HTML comments, "optional" from Sources header,
//               Adjusted Thumbnail for dropzone-first, ensured 3 steps for FormNavigation.
include 'inc/loginanddb.php';

$sectionQuery = $db->query("SELECT id, name FROM section_types ORDER BY id");
$sectionTypes = $sectionQuery->fetchAll(PDO::FETCH_ASSOC);

$placeholderImagePath = "img/placeholder.png"; // Ensure this exists
$placeholderSmallImagePath = "img/placeholder_small.png"; // Ensure this exists
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Add New Article</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <link href="css/global.css?v=<?php echo filemtime('css/global.css'); ?>" rel="stylesheet" type="text/css">
  <link href="css/addarticle.css?v=<?php echo filemtime('css/addarticle.css'); ?>" rel="stylesheet" type="text/css">
  <link href="css/medialibrary.css?v=<?php echo filemtime('css/medialibrary.css'); ?>" rel="stylesheet" type="text/css">
  <link href="css/unifiedimageeditor.css?v=<?php echo filemtime('css/unifiedimageeditor.css'); ?>" rel="stylesheet" type="text/css">
  
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
  <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/smoothness/jquery-ui.css">
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css" crossorigin="anonymous" />
</head>
<body class="add-article-page">
<div class="layout">
  <div class="sidebar">
    <?php include 'inc/nav.php'; ?>
  </div>
  
  <div class="main">
    <h1>Add New Article</h1>
    <div id="autosave-status">Autosave status...</div>
    <div class="undo-redo-controls">
			<button type="button" id="undo-button" class="btn btn-undo"><i class="fas fa-undo"></i> Undo</button>
			<button type="button" id="redo-button" class="btn btn-redo"><i class="fas fa-redo"></i> Redo</button>
		</div>
    <form action="addarticlepost.php" method="post" enctype="multipart/form-data" id="article-form">
      
      <ul class="form-tabs"></ul>

      <div class="form-step" id="step-1" data-step-title="Fixed Information">
        <div class="card">
          <h2>Fixed Information</h2>
          <label for="title">Article Title:</label>
          <input type="text" name="title" id="title" required>
          <label for="tagline">Tagline:</label>
          <input type="text" name="tagline" id="tagline" required>
          
          <label>Article Thumbnail:</label>
          <div class="thumbnail-module">
            <div class="thumbnail-dropzone-area dropzone section-specific-dropzone no-image" data-target-type="thumbnail" title="Click, Drop, or Paste Image for Thumbnail">
                <div class="thumbnail-preview-container" style="display:none;"> {/* Initially hidden */}
                    <img src="" alt="Thumbnail Preview" id="articleThumbnailPreview">
                </div>
                <span id="thumbnailInfo" class="media-item-title dropzone-placeholder-text">Click, Drop, or Paste Thumbnail</span>
            </div>
            <div class="thumbnail-actions" style="display:none;">
                <button type="button" id="changeEditThumbnailBtn" class="btn btn-change-thumbnail action-icon" title="Change/Edit Thumbnail"><i class="fas fa-edit"></i></button>
                <button type="button" id="removeThumbnailBtn" class="btn btn-remove-thumbnail action-icon" title="Remove Thumbnail"><i class="fas fa-trash-alt"></i></button>
            </div>
          </div>
          <input type="hidden" name="thumbnail_media_asset_id" id="thumbnail_media_asset_id" value="">
          <input type="hidden" name="thumbnail_media_variant_id" id="thumbnail_media_variant_id" value="">
        </div>

        <div class="card">
          <h2>Tags</h2>
          <input type="text" id="tags-input-field" placeholder="Type a tag (min 3 characters)" autocomplete="off">
          <div id="selected-tags-container"></div>
          <input type="hidden" name="selected_tags_string" id="selected_tags_hidden_input">
        </div>
        <div class="card">
          <h2>SEO &amp; Metadata</h2>
          <label for="seo_title">SEO Title:</label>
          <input type="text" name="seo_title" id="seo_title" placeholder="Enter SEO title">
          <label for="meta_description">Meta Description:</label>
          <textarea name="meta_description" id="meta_description" rows="3" placeholder="Enter meta description"></textarea>
        </div>
        <div class="nav-buttons">
          <button type="button" class="next-step btn">Next &raquo;</button>
        </div>
      </div>
      
      <div class="form-step" id="step-2" data-step-title="Modular Content">
        <div class="card" id="modular-content">
          <h2>Modular Content</h2>
          <select id="section-type-selector-top">
            <option value="" disabled selected>Select Section Type to Add</option>
            <?php foreach($sectionTypes as $section): ?>
              <option value="<?php echo $section['id']; ?>"><?php echo ucfirst(htmlspecialchars($section['name'])); ?></option>
            <?php endforeach; ?>
          </select>
          <div id="sections-container">
          </div>
          <select id="section-type-selector-bottom" style="display:none;">
            <option value="" disabled selected>Select Section Type to Add</option>
             <?php foreach($sectionTypes as $section): ?>
              <option value="<?php echo $section['id']; ?>"><?php echo ucfirst(htmlspecialchars($section['name'])); ?></option>
            <?php endforeach; ?>
          </select>
          <small class="section-note">* Use the selector to add a new section to the end.</small>
          <input type="hidden" name="section_present" id="section_present_input">
        </div>
        <div class="nav-buttons">
          <button type="button" class="prev-step btn">&laquo; Back</button>
          <button type="button" class="next-step btn">Next &raquo;</button>
        </div>
      </div>
      
      <div class="form-step" id="step-3" data-step-title="Sources &amp; Save">
        <div class="card" id="sources-section">
          <h2>Sources &amp; Citations</h2> {/* "Optional" removed */}
          <div id="sources-container">
            {/* js/sources.js will add the first source block if this is empty, or restore. */}
            {/* Inputs should not have 'required' by default if section is optional */}
          </div>
          <button type="button" id="add-source-btn" class="btn btn-secondary">Add Source</button>
        </div>
        <div class="card">
          <h2>Final Actions</h2>
          <button type="button" id="preview-button" class="btn btn-secondary">Preview Article</button>
          <input type="submit" value="Save Article" class="btn">
        </div>
        <div class="nav-buttons">
          <button type="button" class="prev-step btn">&laquo; Back</button>
        </div>
      </div>
    </form>
  </div>
  
  <div class="media-panels">
    <div id="global-media-library">
			<h3>Global Media Library</h3>
      <div class="media-filters">
        <div>
          <label for="media-search-input-addarticle">Search:</label>
          <input type="text" id="media-search-input-addarticle" placeholder="Search by title...">
        </div>
        <div>
          <label for="media-tag-filter-addarticle">Tag:</label>
          <select id="media-tag-filter-addarticle"> <option value="">All Tags</option> </select>
        </div>
        <div>
          <input type="checkbox" id="media-show-variants-addarticle" name="media-show-variants-addarticle">
          <label for="media-show-variants-addarticle" class="checkbox-label">Show Variants</label>
        </div>
      </div>
			<div id="global-media"></div>
		</div>
    <div id="staging-area">
			<h3>Staging Area</h3>
			<div id="staging-media"></div>
		</div>
  </div>
</div>

<div id="preview-modal" class="preview-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
  <div class="preview-modal-content">
    <button type="button" id="preview-close" class="preview-close action-icon" aria-label="Close Preview"><i class="fas fa-times"></i></button>
    <h2 id="preview-modal-title" class="visually-hidden">Article Preview</h2>
    <div id="preview-modal-content-target"></div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js" crossorigin="anonymous"></script>
<script>
  var G_PLACEHOLDER_IMAGE_PATH = "<?php echo htmlspecialchars($placeholderImagePath, ENT_QUOTES, 'UTF-8'); ?>";
  var G_PLACEHOLDER_SMALL_IMAGE_PATH = "<?php echo htmlspecialchars($placeholderSmallImagePath, ENT_QUOTES, 'UTF-8'); ?>";
</script>

<script src="js/notifications.js?v=<?php echo filemtime('js/notifications.js'); ?>"></script>
<script src="js/globalErrorHandler.js?v=<?php echo filemtime('js/globalErrorHandler.js'); ?>"></script>
<script src="js/UnifiedImageEditor.js?v=<?php echo filemtime('js/UnifiedImageEditor.js'); ?>"></script>
<script src="js/mediaUpload.js?v=<?php echo filemtime('js/mediaUpload.js'); ?>"></script>
<script src="js/mediaLibrary.js?v=<?php echo filemtime('js/mediaLibrary.js'); ?>"></script>
<script src="js/sections.js?v=<?php echo filemtime('js/sections.js'); ?>"></script>
<script src="js/dropzones.js?v=<?php echo filemtime('js/dropzones.js'); ?>"></script>
<script src="js/tags.js?v=<?php echo filemtime('js/tags.js'); ?>"></script>
<script src="js/sources.js?v=<?php echo filemtime('js/sources.js'); ?>"></script>
<script src="js/lightbox.js?v=<?php echo filemtime('js/lightbox.js'); ?>"></script>
<script src="js/addarticle_interactions.js?v=<?php echo filemtime('js/addarticle_interactions.js'); ?>"></script>
<script src="js/autosave.js?v=<?php echo filemtime('js/autosave.js'); ?>"></script>
<script src="js/undoRedo.js?v=<?php echo filemtime('js/undoRedo.js'); ?>"></script>
<script src="js/validation.js?v=<?php echo filemtime('js/validation.js'); ?>"></script>
<script src="js/preview.js?v=<?php echo filemtime('js/preview.js'); ?>"></script>
<script src="js/keyboard.js?v=<?php echo filemtime('js/keyboard.js'); ?>"></script>
<script src="js/formNavigation.js?v=<?php echo filemtime('js/formNavigation.js'); ?>"></script>
<script src="js/stagingArea.js?v=<?php echo filemtime('js/stagingArea.js'); ?>"></script>
<script src="js/app.js?v=<?php echo filemtime('js/app.js'); ?>"></script>
</body>
</html>
