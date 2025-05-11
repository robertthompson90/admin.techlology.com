// js/sources.js

var Sources = (function(){
  
  /**
   * Checks if the last source block has both title and URL filled.
   * If so, the "Add Source" button is displayed; otherwise, it remains hidden.
   * Triggers a custom event "source:updated" after checking.
   */
  function checkSourceCompletion(){
    var $lastSource = $("#sources-container .source").last();
    var title = $lastSource.find("input[name='source_title[]']").val().trim();
    var url   = $lastSource.find("input[name='source_url[]']").val().trim();

    if(title !== "" && url !== ""){
      $("#add-source-btn").show();
    } else {
      $("#add-source-btn").hide();
    }
    
    // Trigger a custom event for any external bound modules (for example, autosave)
    $(document).trigger("source:updated");
  }
  
  /**
   * Initializes source block interactions.
   * Sets up inline validation to check source fields and binds actions for adding or removing sources.
   */
  function initSources(){
    // Initially evaluate the visibility of the Add Source button.
    checkSourceCompletion();

    // When either the title or URL changes in any source block, re-check the completion.
    $("#sources-container").on("input", "input[name='source_title[]'], input[name='source_url[]']", function(){
      checkSourceCompletion();
    });
    
    // Bind the click event for the "Add Source" button.
    $("#add-source-btn").on("click", function(){
      // Create a new source block.
      var sourceDiv = $("<div></div>").addClass("source");
      sourceDiv.html(
         '<label>Source Title:</label>' +
         '<input type="text" name="source_title[]" required>' +
         '<label>URL:</label>' +
         '<input type="url" name="source_url[]" required>' +
         '<label>Note:</label>' +
         '<textarea name="source_note[]" rows="2" placeholder="Optional note"></textarea>' +
         '<button type="button" class="remove-source">Remove Source</button>'
      );
      
      // Bind the remove action for the new source block.
      sourceDiv.find(".remove-source").on("click", function(){
         if($("#sources-container .source").length > 1){
            sourceDiv.remove();
            // Re-check source completion after removal.
            checkSourceCompletion();
         }
      });
      
      // Append the new source block.
      $("#sources-container").append(sourceDiv);
      
      // Hide the Add Source button until the new block is properly filled.
      $("#add-source-btn").hide();
      
      // Trigger an event to signal that a new source was added.
      $(document).trigger("source:added", [sourceDiv]);
    });
  }
  
  return {
    init: initSources
  };
})();
