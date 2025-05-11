// js/app.js

$(document).ready(function(){
  console.log("Initializing application modules...");

  // Initialize all modules.
  Validation.init();
  Sections.init();
  Dropzones.init();
  Tags.init();
  Sources.init();
  Lightbox.init();
  Autosave.init();
  Preview.init();
  FormNavigation.init();
  KeyboardShortcuts.init();
  MediaLibrary.init();
  if (AdvancedImageEditor.init) { AdvancedImageEditor.init(); }
  if (ImageEditor.init) { ImageEditor.init(); }
  FormTabs.init();
  MediaUpload.init();
  RoleBasedUI.init();
  PluginManager.init();
  UndoRedo.saveState(); // Save the initial state.
  StagingArea.init();
  
  Notifications.show("Application initialized", "success");

  console.log("All modules have been initialized.");

  // Sample integration:
  // Simulate opening the advanced image editor when a button is clicked.
  // Replace '#some-open-editor-button' with your actual trigger element.
  $("#some-open-editor-button").on("click", function(){
    var imageUrl = "path/to/your/image.jpg"; // Replace with an actual image URL.
    AdvancedImageEditor.openEditor(imageUrl, function(croppedDataUrl, mediaId){
      // Once editing is done, add the new media to the staging area.
      StagingArea.addMediaToStaging(croppedDataUrl, mediaId);
      Notifications.show("Image cropped and added to staging", "success");
    });
  });
});
