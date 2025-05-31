// js/sources.js
// Version 1.2 - Made resilient to initially empty sources container.
//               Ensures first source inputs are not 'required' by default.

var Sources = (function($){
  
  function checkSourceCompletion(){
    var $sources = $("#sources-container .source");
    var $addBtn = $("#add-source-btn");

    if ($sources.length === 0) {
        $addBtn.show(); // Show if no sources, so user can add the first one
        return;
    }

    var $lastSource = $sources.last();
    var titleInput = $lastSource.find("input[name='source_title[]']");
    var urlInput = $lastSource.find("input[name='source_url[]']");

    // Ensure inputs exist before trying to get their value
    var title = titleInput.length ? titleInput.val().trim() : "";
    var url   = urlInput.length ? urlInput.val().trim() : "";

    // Show "Add Source" button only if the last source is filled (making it effectively required to add another)
    // OR if there are no sources at all.
    if ( ($sources.length > 0 && title !== "" && url !== "") || $sources.length === 0 ) {
      $addBtn.show();
    } else {
      $addBtn.hide();
    }
    // Note: 'required' attribute on inputs is handled by HTML or validation.js
    // This logic only controls the visibility of the "Add Source" button.
    $(document).trigger("source:updated"); // For autosave
  }
  
  function createNewSourceBlock(isFirstSource = false) {
    var $sourceDiv = $("<div></div>").addClass("source");
    // Inputs are not 'required' by default, making the section optional.
    // If isFirstSource is true AND user starts typing, then they could become required by validation.js.
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
       // Always allow removal if it's not the very last (and potentially empty) one.
       // Or if it is the last one, but it has content.
       if ($("#sources-container .source").length > 1 || 
           ($parentSourceBlock.find("input[name='source_title[]']").val().trim() !== "" ||
            $parentSourceBlock.find("input[name='source_url[]']").val().trim() !== "") ) {
          $parentSourceBlock.remove();
          // If all sources are removed, add back one empty optional block
          if ($("#sources-container .source").length === 0) {
              $("#sources-container").append(createNewSourceBlock(true));
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
    if ($("#sources-container").length === 0) return; // No sources section on page

    // If #sources-container is empty on init (e.g. new article), add one optional block.
    if ($("#sources-container .source").length === 0) {
        $("#sources-container").append(createNewSourceBlock(true)); // Mark as first for potential logic
    } else {
        // Bind remove event to any existing source blocks (e.g., from autosave restore)
        $("#sources-container .source .remove-source").off('click').on("click", function(){ // Ensure events aren't double-bound
            var $parentSourceBlock = $(this).closest(".source");
            if ($("#sources-container .source").length > 1 || 
                ($parentSourceBlock.find("input[name='source_title[]']").val().trim() !== "" ||
                 $parentSourceBlock.find("input[name='source_url[]']").val().trim() !== "") ) {
               $parentSourceBlock.remove();
               if ($("#sources-container .source").length === 0) {
                  $("#sources-container").append(createNewSourceBlock(true));
               }
            } else {
               $parentSourceBlock.find("input, textarea").val("");
            }
            checkSourceCompletion();
            $('#article-form').trigger('input');
        });
    }
    checkSourceCompletion(); // Initial check for the "Add Source" button visibility

    $("#sources-container").on("input", "input[name='source_title[]'], input[name='source_url[]']", function(){
      checkSourceCompletion(); // Re-check when user types in the last block
    });
    
    $("#add-source-btn").off('click').on("click", function(){
      var $newSourceBlock = createNewSourceBlock();
      $("#sources-container").append($newSourceBlock);
      $newSourceBlock.find("input[name='source_title[]']").focus();
      checkSourceCompletion(); // This will hide the "Add Source" button as new one is empty
      $(document).trigger("source:added", [$newSourceBlock]);
      $('#article-form').trigger('input');
    });
    console.log("[Sources] Initialized for addarticle.php (if #sources-section exists).");
  }
  
  return {
    init: initSources
  };
})(jQuery);
