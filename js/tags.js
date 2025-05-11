// js/tags.js

var Tags = (function(){
  function initTags(){
    // When the user types in the tag input field, force it to lowercase
    $("#tags").on("input", function(){
       var currentVal = $(this).val().toLowerCase();
       $(this).val(currentVal);
       
       // If a comma is typed, split the input and add each tag
       if(currentVal.indexOf(",") !== -1){
          var tagsArray = currentVal.split(",");
          tagsArray.forEach(function(tag){
              tag = tag.trim();
              if(tag){
                  addTag(tag);
              }
          });
          $(this).val(""); // Clear the input after processing
       }
    });
    
    // Set up jQuery UI autocomplete for tag suggestions
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
  
    // Handle Enter key separately on the tag input field
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
          // If suggestions are visible, search for an exact match
          if(ac && ac.menu.element.is(":visible")){
            ac.menu.element.find("li").each(function(){
              var suggestion = $(this).find("div").text().toLowerCase();
              if(suggestion === term){
                addTag(suggestion);
                matchFound = true;
                return false; // Exit loop on match
              }
            });
          }
          // If no match is found, try adding it via AJAX
          if(!matchFound){
            addNewTagAjax(term);
          }
          $this.val('');
          return false;
       }
    });

    // Also add any leftover text as a tag on blur
    $("#tags").on("blur", function(){
      var term = $(this).val().trim().toLowerCase();
      if(term !== ""){
          addTag(term);
          $(this).val("");
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
                          // Fade out and remove the tag element.
                          $(this).parent().fadeOut(300, function(){
                              $(this).remove();
                          });
                      });
      tagSpan.append(removeLink);
      $("#selected-tags").append(tagSpan);
      // Fade in the tag, then remove the temporary "tag-added" class.
      tagSpan.hide().fadeIn(300, function(){
          $(this).removeClass("tag-added");
      });
  }
  
  // Adds a new tag via AJAX in case it doesn’t already exist.
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
