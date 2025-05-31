// js/sources.js
// Version 1.2 - Made resilient to initially empty sources container.
//               Ensures first source inputs are not 'required' by default. Uses Font Awesome.

var Sources = (function($){
  
  function checkSourceCompletion(){
    var $sources = $("#sources-container .source");
    var $addBtn = $("#add-source-btn");

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
    $(document).trigger("source:updated");
  }
  
  function createNewSourceBlock(isFirstSource = false) {
    var $sourceDiv = $("<div></div>").addClass("source");
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
    return $sourceDiv;
  }

  function initSources(){
    if ($("#sources-container").length === 0 && $("#add-source-btn").length === 0) {
        // console.log("[Sources] Sources section not found on this page. Skipping init.");
        return; 
    }

    if ($("#sources-container .source").length === 0) {
        $("#sources-container").append(createNewSourceBlock(true));
    } else {
        $("#sources-container .source .remove-source").off('click').on("click", function(){
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
    checkSourceCompletion();

    $("#sources-container").on("input", "input[name='source_title[]'], input[name='source_url[]']", function(){
      checkSourceCompletion();
    });
    
    $("#add-source-btn").off('click').on("click", function(){
      var $newSourceBlock = createNewSourceBlock();
      $("#sources-container").append($newSourceBlock);
      $newSourceBlock.find("input[name='source_title[]']").focus();
      checkSourceCompletion();
      $(document).trigger("source:added", [$newSourceBlock]);
      $('#article-form').trigger('input');
    });
    // console.log("[Sources] Initialized for addarticle.php (if #sources-section exists).");
  }
  
  return {
    init: initSources
  };
})(jQuery);
