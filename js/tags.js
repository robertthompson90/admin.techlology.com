// js/tags.js

var Tags = (function(){
  function initTags(){
    // When the user types in the tag input field:
    $("#tags").on("input", function(){
       // Force lowercase for consistency.
       var currentVal = $(this).val().toLowerCase();
       $(this).val(currentVal);
       
       // If the user has typed a comma, split the input on commas.
       if(currentVal.indexOf(",") !== -1){
          var tagsArray = currentVal.split(",");
          tagsArray.forEach(function(tag){
              tag = tag.trim();
              if(tag){
                  addTag(tag);
              }
          });
          $(this).val(""); // Clear the input after processing commas.
       }
    });
    
    // Set up autocomplete for the tag field.
    $("#tags").autocomplete({
       minLength: 3,
       autoFocus: true,
       source: function(request, response){
         $.ajax({
           url: 'ajax/gettags.php',
           type: 'POST',
           dataType: 'json',
           data: { term: request.term.toLowerCase() },
           success: function(data){
              response(data);
           }
         });
       },
       select: function(event, ui){
         addTag(ui.item.value.toLowerCase());
         $(this).val('');
         return false;
       }
    });
  
    // Handle the Enter key separately.
    $("#tags").on("keydown", function(event){
       if(event.keyCode === 13){ // Enter key
          event.preventDefault();
          var $this = $(this),
              term = $this.val().trim().toLowerCase();
          if(term === ""){
            return false;
          }
          var ac = $this.data("ui-autocomplete");
          var matchFound = false;
          // If the suggestions menu is visible, look for an exact match.
          if(ac && ac.menu.element.is(":visible")){
            ac.menu.element.find("li").each(function(){
              var suggestion = $(this).find("div").text().toLowerCase();
              if(suggestion === term){
                addTag(suggestion);
                matchFound = true;
                return false; // Exit the loop when a match is found.
              }
            });
          }
          // If no exact match exists, add it as a new tag via AJAX.
          if(!matchFound){
            addNewTagAjax(term);
          }
          $this.val('');
          return false;
       }
    });
  }
  
  // Adds a tag element to the selected tags container.
  function addTag(tagValue){
      // Prevent duplicate entries.
      if($("#selected-tags span[data-tag='" + tagValue + "']").length) return;
      
      var tagSpan = $("<span></span>")
                      .addClass("selected-tag tag-added")
                      .attr("data-tag", tagValue)
                      .text(tagValue);
      var removeLink = $("<a href='#' title='Remove tag'> ×</a>")
                      .addClass("remove-tag")
                      .on("click", function(e){
                          e.preventDefault();
                          // Fade out the tag, then remove it.
                          $(this).parent().fadeOut(300, function(){
                              $(this).remove();
                          });
                      });
      tagSpan.append(removeLink);
      $("#selected-tags").append(tagSpan);
      // Fade the tag in and then remove the temporary "tag-added" class.
      tagSpan.hide().fadeIn(300, function(){
          $(this).removeClass("tag-added");
      });
  }
  
  // Adds a new tag via AJAX in case it doesn’t exist.
  function addNewTagAjax(tagValue){
      $.ajax({
          url: 'ajax/addtag.php',
          type: 'POST',
          dataType: 'json',
          data: { term: tagValue, tag: tagValue },
          success: function(data){
             addTag(data.value.toLowerCase());
          },
          error: function(){
             addTag(tagValue);
          }
      });
  }
  
  return {
    init: initTags
  };
})();
