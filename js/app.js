// js/app.js
// Version 1.8 - Finalized initialization logic for TagSystem, Sources, MediaLibrary.
// Ensures modules are initialized with correct context for addarticle.php vs other pages.
$(document).ready(function(){
  console.log("[App.js] Initializing application modules v1.8...");

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
    // "UnifiedImageEditor" // No global init() method
    // "addarticle_interactions" // Self-initializing
  ];

  if (typeof Notifications !== "undefined" && typeof Notifications.init === "function") {
    Notifications.init();
  } else if (typeof Notifications !== "undefined" && Notifications.show) {
    console.log("[Notifications] module available (show function exists).");
  } else {
    console.warn("[Notifications] module not loaded.");
  }

  var onAddArticlePage = $('body').hasClass('add-article-page');
  var onMediaLibraryPage = $('body').hasClass('media-library-page');

  modules.forEach(function(moduleName) {
    if (moduleName === "addarticle_interactions" && onAddArticlePage) {
        // This module is self-initializing via its own $(document).ready()
        // console.log("[AddArticleInteractions] is self-initializing.");
        return; 
    }

    // Contextual Initialization
    if (moduleName === "TagSystem") {
      if (onAddArticlePage) {
        if (typeof window.TagSystem !== 'undefined' && typeof window.TagSystem.init === 'function') {
          try {
            window.TagSystem.init({
              itemType: 'article', 
              itemId: null, // For new articles
              inputSelector: '#tags-input-field', 
              listSelector: '#selected-tags-container',
              addTagOnBlur: true
            });
            console.log("[TagSystem] initialized for addarticle.php.");
          } catch (e) { console.error("Error initializing [TagSystem] for addarticle.php:", e); }
        } else { console.warn("[TagSystem] module not found for addarticle.php."); }
      }
      // TagSystem for UIE is initialized by UIE itself when it sets context.
      // No generic init for media-library-page here for TagSystem.
      return; 
    }
    
    if (moduleName === "Sources") {
        if (onAddArticlePage && $('#sources-section').length > 0) { // Only init if sources section exists
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
                let mediaLibOptions = { targetPage: null }; // Default to unknown
                if (onAddArticlePage) {
                    mediaLibOptions.targetPage = 'addarticle';
                    mediaLibOptions.searchInput = '#media-search-input-addarticle';
                    mediaLibOptions.tagFilterInput = '#media-tag-filter-addarticle';
                    mediaLibOptions.showVariantsCheckbox = '#media-show-variants-addarticle';
                } else if (onMediaLibraryPage) {
                    mediaLibOptions.targetPage = 'medialibrary';
                    // Uses default selectors defined within mediaLibrary.js if not overridden by options
                }
                // Only init if we have a known page context for media library
                if (mediaLibOptions.targetPage) {
                    window.MediaLibrary.init(mediaLibOptions);
                    console.log(`[MediaLibrary] initialized for ${mediaLibOptions.targetPage}.`);
                } else {
                    // console.log("[MediaLibrary] Not on a page requiring MediaLibrary init (addarticle or medialibrary).");
                }
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
          'media-library-page': ["UnifiedImageEditor", "MediaUpload"] // MediaLibrary & TagSystem handled above
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
