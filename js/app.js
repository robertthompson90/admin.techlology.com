// js/app.js
// Version 1.7 - Finalized initialization logic for TagSystem, Sources, MediaLibrary, and UIE.
$(document).ready(function(){
  console.log("[App.js] Initializing application modules v1.7...");

  var modules = [
    "Validation",
    "Sections",
    "Dropzones",
    "TagSystem", // Contextual init below
    "Sources",   // Contextual init below
    "Lightbox",
    "Autosave",
    "Preview",
    "KeyboardShortcuts",
    "MediaLibrary", // Contextual init below
    "FormNavigation",
    "MediaUpload",
    "StagingArea",
    "UndoRedo"
    // "UnifiedImageEditor" // No global init() method, it's self-contained or called directly
    // "addarticle_interactions" // Self-initializing via its own $(document).ready()
  ];

  // Initialize Notifications first if it exists
  if (typeof Notifications !== "undefined" && typeof Notifications.init === "function") {
    Notifications.init(); // Assuming it has an init
    console.log("[Notifications] initialized.");
  } else if (typeof Notifications !== "undefined" && Notifications.show) {
    console.log("[Notifications] module available (show function exists).");
  } else {
    console.warn("[Notifications] module not loaded. Some feedback may be missing.");
  }

  modules.forEach(function(moduleName) {
    if (moduleName === "addarticle_interactions" && $('body').hasClass('add-article-page')) {
        // This module is self-initializing via its own $(document).ready()
        // console.log("[AddArticleInteractions] is self-initializing.");
        return; 
    }

    // Contextual Initialization for specific modules
    if (moduleName === "TagSystem") {
      if ($('body').hasClass('add-article-page')) { // Only on addarticle page
        if (typeof window.TagSystem !== 'undefined' && typeof window.TagSystem.init === 'function') {
          try {
            window.TagSystem.init({
              itemType: 'article', 
              itemId: null,        // itemId is null for a new article, TagSystem should handle this
              inputSelector: '#tags-input-field', 
              listSelector: '#selected-tags-container',
              addTagOnBlur: true
            });
            console.log("[TagSystem] initialized for addarticle.php.");
          } catch (e) { console.error("Error initializing [TagSystem] for addarticle.php:", e); }
        } else { console.warn("[TagSystem] module not found or init function missing for addarticle.php."); }
      }
      // TagSystem for UIE is initialized by UIE itself when it sets context.
      return; 
    }
    
    if (moduleName === "Sources") {
        if ($('body').hasClass('add-article-page') && $('#sources-section').length > 0) {
            if (typeof window.Sources !== 'undefined' && typeof window.Sources.init === 'function') {
                try { window.Sources.init(); console.log("[Sources] initialized for addarticle.php."); }
                catch (e) { console.error("Error initializing module [Sources]:", e); }
            } else { console.warn("[Sources] module not found or init function missing for addarticle.php."); }
        }
        return; 
    }
    
    if (moduleName === "MediaLibrary") {
        if (typeof window.MediaLibrary !== 'undefined' && typeof window.MediaLibrary.init === 'function') {
            try {
                let mediaLibOptions = {};
                if ($('body').hasClass('add-article-page')) {
                    mediaLibOptions.targetPage = 'addarticle';
                    mediaLibOptions.searchInput = '#media-search-input-addarticle';
                    mediaLibOptions.tagFilterInput = '#media-tag-filter-addarticle';
                    mediaLibOptions.showVariantsCheckbox = '#media-show-variants-addarticle';
                } else if ($('body').hasClass('media-library-page')) {
                    mediaLibOptions.targetPage = 'medialibrary';
                    // Default selectors in mediaLibrary.js will be used
                }
                window.MediaLibrary.init(mediaLibOptions);
                // console.log(`[MediaLibrary] initialized for ${mediaLibOptions.targetPage || 'unknown page context'}.`);
            } catch (e) { console.error("Error initializing module [MediaLibrary]:", e); }
        } else { console.warn("[MediaLibrary] module not found or init function missing.");}
        return;
    }

    // Generic initialization for other modules
    if (typeof window[moduleName] !== "undefined" && typeof window[moduleName].init === "function") {
      try {
        window[moduleName].init();
        console.log("[" + moduleName + "] initialized.");
      } catch (e) {
        console.error("Error initializing module [" + moduleName + "]:", e);
         if (typeof Notifications !== 'undefined' && Notifications.show) {
            Notifications.show("Error initializing module: " + moduleName, "error");
        }
      }
    } else {
      // Refined critical module check
      const criticalModules = {
          'add-article-page': ["Sections", "Autosave", "MediaUpload", "Dropzones", "FormNavigation", "UnifiedImageEditor"],
          'media-library-page': ["UnifiedImageEditor", "MediaUpload", "TagSystem"] // MediaLibrary is handled above
      };
      let pageClass = $('body').attr('class') || "";
      let isCriticalOnThisPage = false;
      let pageContext = "this page";

      for (const page in criticalModules) {
          if (pageClass.includes(page)) {
              pageContext = page;
              if (criticalModules[page].includes(moduleName)) isCriticalOnThisPage = true;
              break;
          }
      }
      if (isCriticalOnThisPage && moduleName !== "UnifiedImageEditor") { 
          console.warn(`[${moduleName}] module not found or init function missing. This WILL affect functionality on ${pageContext}.`);
      }
    }
  });
  console.log("[App.js] All relevant modules have been attempted to initialize.");
});
