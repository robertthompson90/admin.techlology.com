$(document).ready(function(){
  console.log("Initializing application modules...");

  // Initialize all existing modules.
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
  if (AdvancedImageEditor.init) AdvancedImageEditor.init();
  if (ImageEditor.init) ImageEditor.init();
  FormTabs.init();
  MediaUpload.init();
  StagingArea.init();   // Moved before UndoRedo.saveState()
  UndoRedo.saveState();
  
  Notifications.show("Application initialized", "success");

  // Sample Trigger: When '#some-open-editor-button' is clicked,
  // open the Advanced Image Editor. Replace with your actual trigger.
  $("#some-open-editor-button").on("click", function(){
    var imageUrl = "path/to/your/image.jpg"; // Replace with a real URL.
    AdvancedImageEditor.openEditor(imageUrl, function(croppedDataUrl, mediaId, editMetaData){
      // Add the edited image along with non-destructive metadata to staging.
      StagingArea.addMediaToStaging(croppedDataUrl, mediaId, editMetaData);
      Notifications.show("Image cropped and added to staging", "success");
    });
  });

  console.log("All modules have been initialized.");
});
