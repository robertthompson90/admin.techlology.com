$(document).ready(function(){
  console.log("Initializing application modules...");

  Validation.init();
  Sections.init();
  Dropzones.init();
  Tags.init();
  Sources.init();
  Lightbox.init();
  Autosave.init();
  Preview.init();         // Initialize the preview module
  FormNavigation.init();
  KeyboardShortcuts.init();
  MediaLibrary.init();
  ImageEditor.init();
  FormTabs.init();
  MediaUpload.init();
  Notifications.show("Application initialized", "success");

  console.log("All modules have been initialized.");
});
