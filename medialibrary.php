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
  
  <link href="css/global.css?v=<?php echo filemtime('css/global.css'); ?>" rel="stylesheet" type="text/css">
  <link href="css/medialibrary.css?v=<?php echo filemtime('css/medialibrary.css'); ?>" rel="stylesheet" type="text/css">
  <link href="css/unifiedimageeditor.css?v=<?php echo filemtime('css/unifiedimageeditor.css'); ?>" rel="stylesheet" type="text/css">
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">

  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
  <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/smoothness/jquery-ui.css">
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.css" crossorigin="anonymous">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.12/cropper.min.js" crossorigin="anonymous"></script>
</head>
<body class="media-library-page">
  <div class="layout">
    <div class="sidebar">
      <?php include 'inc/nav.php'; ?>
    </div>
    
    <div class="main medialibrary-dropzone">
      <h1>Global Media Library Manager</h1>

      <div class="media-filters">
        <div>
          <label for="media-search-input">Search:</label>
          <input type="text" id="media-search-input" placeholder="Search by title, caption, alt...">
        </div>
        <div>
          <label for="media-tag-filter">Filter by Tag:</label>
          <select id="media-tag-filter">
            <option value="">All Tags</option>
            </select>
        </div>
        <div>
          <input type="checkbox" id="media-show-variants" name="media-show-variants">
          <label for="media-show-variants">Show Variants</label>
        </div>
        <button id="media-upload-button" type="button" class="upload-btn" style="margin-left: auto;">Upload Media</button>
      </div>
      
      <div id="global-media">
        </div>
    </div>
  </div>

  <input type="file" id="media-file-input-hidden" accept="image/*" style="display: none;">


  <script src="js/notifications.js"></script> 
  <script src="js/globalErrorHandler.js"></script>
  <script src="js/dropzones.js"></script>
  <script src="js/tags.js"></script>
  <script src="js/UnifiedImageEditor.js"></script>
  <script src="js/mediaLibrary.js"></script>
  <script src="js/mediaUpload.js"></script> 
  <script src="js/app.js"></script> 

</body>
</html>
