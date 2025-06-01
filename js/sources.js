// js/sources.js
// Version 1.2 - Made resilient to initially empty sources container.
//               Ensures first source inputs are not 'required' by default. Uses Font Awesome.

var Sources = (function($){
  
  function checkSourceCompletion(){
    var $sourcesContainer = $("#sources-container");
    if (!$sourcesContainer.length) return; // No sources section on page

    var $sources = $sourcesContainer.find(".source");
    var $addBtn = $("#add-source-btn");
    if (!$addBtn.length) return;

    if ($sources.length === 0) {
        $addBtn.show(); 
        return;
    }

    var $lastSource = $sources.last();
    var titleInput = $lastSource.find("input[name='source_title[]']");
    var urlInput = $lastSource.find("input[name='source_url[]']");

    var title = titleInput.length ? titleInput.val().trim() : "";
    var url   = urlInput.length ? urlInput.val().trim() : "";

    if ( ($sources.length > 0 && title !== "" && url !== "") || $sources.length === 0 ) {
      $addBtn.show();
    } else {
      $addBtn.hide();
    }
    $(document).trigger("source:updated"); // For autosave
  }
  
  function createNewSourceBlock(isFirstSource = false) {
    var $sourceDiv = $("<div></div>").addClass("source");
    // Inputs are not 'required' by default, making the section optional.
    $sourceDiv.html(
       '<label>Source Title:</label>' +
       '<input type="text" name="source_title[]" placeholder="e.g., Article Name">' + 
       '<label>URL:</label>' +
       '<input type="url" name="source_url[]" placeholder="e.g., https://example.com/article">' +
       '<label>Note:</label>' +
       '<textarea name="source_note[]" rows="2" placeholder="Optional note"></textarea>' +
       '<button type="button" class="btn remove-source action-icon" title="Remove this source"><i class="fas fa-times"></i></button>'
    );
    
    $sourceDiv.find(".remove-source").on("click", function(){
       var $parentSourceBlock = $(this).closest(".source");
       var $sourcesContainer = $("#sources-container"); // Re-select for current state

       if ($sourcesContainer.find(".source").length > 1 || 
           ($parentSourceBlock.find("input[name='source_title[]']").val().trim() !== "" ||
            $parentSourceBlock.find("input[name='source_url[]']").val().trim() !== "") ) {
          $parentSourceBlock.remove();
          if ($sourcesContainer.find(".source").length === 0) {
              $sourcesContainer.append(createNewSourceBlock(true));
          }
       } else {
          // Clear fields of the last empty block instead of removing it, effectively resetting it.
          $parentSourceBlock.find("input, textarea").val("");
       }
       checkSourceCompletion();
       $('#article-form').trigger('input'); 
    });
    return $sourceDiv;
  }

  function initSources(){
    var $sourcesContainer = $("#sources-container");
    if (!$sourcesContainer.length && !$("#add-source-btn").length) {
        // console.log("[Sources] Sources section elements not found. Skipping init.");
        return; 
    }

    // If #sources-container is empty on init (e.g. new article, or after autosave restore cleared it), add one optional block.
    if ($sourcesContainer.find(".source").length === 0) {
        $sourcesContainer.append(createNewSourceBlock(true)); // Mark as first for potential logic
    } else {
        // Bind remove event to any existing source blocks (e.g., from autosave restore)
        $sourcesContainer.find(".source .remove-source").off('click').on("click", function(){ // Ensure events aren't double-bound
            var $parentSourceBlock = $(this).closest(".source");
            // Re-check current number of sources within the click handler's scope
            if ($("#sources-container .source").length > 1 || 
                ($parentSourceBlock.find("input[name='source_title[]']").val().trim() !== "" ||
                 $parentSourceBlock.find("input[name='source_url[]']").val().trim() !== "") ) {
               $parentSourceBlock.remove();
               if ($("#sources-container .source").length === 0) { // Check again after removal
                  $("#sources-container").append(createNewSourceBlock(true));
               }
            } else {
               // If it's the last one and it's empty, just clear its fields
               $parentSourceBlock.find("input, textarea").val("");
            }
            checkSourceCompletion();
            $('#article-form').trigger('input'); // For autosave
        });
    }
    checkSourceCompletion(); // Initial check for the "Add Source" button visibility

    // Re-bind delegated input listener to container
    $sourcesContainer.off("input.sources").on("input.sources", "input[name='source_title[]'], input[name='source_url[]']", function(){
      checkSourceCompletion(); // Re-check when user types in the last block
    });
    
    $("#add-source-btn").off('click').on("click", function(){
      var $newSourceBlock = createNewSourceBlock();
      $sourcesContainer.append($newSourceBlock);
      $newSourceBlock.find("input[name='source_title[]']").focus();
      checkSourceCompletion(); // This will hide the "Add Source" button as new one is empty
      $(document).trigger("source:added", [$newSourceBlock]); // For autosave if needed
      $('#article-form').trigger('input'); // For autosave
    });
    // console.log("[Sources] Initialized (if #sources-section exists).");
  }
  
  return {
    init: initSources
  };
})(jQuery);
