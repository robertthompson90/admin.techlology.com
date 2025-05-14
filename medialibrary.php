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
</body>
</html>
