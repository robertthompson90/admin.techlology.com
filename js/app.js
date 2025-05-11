$(document).ready(function(){
  console.log("Initializing application modules...");

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
  AdvancedImageEditor.init && AdvancedImageEditor.init();
  ImageEditor.init();
  FormTabs.init();
  MediaUpload.init();
  RoleBasedUI.init();
  PluginManager.init();
  StagingArea.init();
  
  Notifications.show("Application initialized", "success");

  console.log("All modules have been initialized.");
});
