$(document).ready(function(){
  console.log("Initializing application modules...");

  // List the module names to initialize.
  var modules = [
    "Validation",
    "Sections",
    "Dropzones",
    "Tags",
    "Sources",
    "Lightbox",
    "Autosave",
    "Preview",
    "KeyboardShortcuts",
    "MediaLibrary",
    "FormNavigation",
    "MediaUpload",
    "StagingArea",   // Moved before UndoRedo.saveState()
    "UndoRedo"
  ];

  // Loop through each module name and attempt to call its init() function.
  modules.forEach(function(moduleName) {
    if (typeof window[moduleName] !== "undefined" && typeof window[moduleName].init === "function") {
      window[moduleName].init();
      console.log("[" + moduleName + "] initialized.");
    } else {
      console.log("[" + moduleName + "] module not loaded.");
    }
  });

  // Initialize Notifications if available, used to display messages.
  if (typeof Notifications !== "undefined" && typeof Notifications.show === "function") {
    Notifications.show("Application initialized", "success");
  } else {
    console.log("[Notifications] module not loaded.");
  }

  console.log("All modules have been initialized.");
});
