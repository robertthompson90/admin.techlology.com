// js/tags.js
// Version 2.0 - Generic Tagging System

var TagSystem = (function($){
  let config = {
    itemType: 'article', // Default item type ('article' or 'mediaAsset')
    itemId: null,        // ID of the current item being tagged
    inputSelector: '#tags', // Default jQuery selector for the tag input text field
    listSelector: '#selected-tags', // Default jQuery selector for the container displaying tag pills
    suggestionsSelector: null, // Optional: jQuery selector for a dedicated suggestions box, otherwise appends to input's parent
    getTagsUrl: 'ajax/gettags.php',
    addTagUrl: 'ajax/addtag.php',
    removeTagUrl: 'ajax/removeTagFromItem.php',
    getItemTagsUrl: 'ajax/getItemTags.php',
    minCharsForAutocomplete: 3,
    autoFocusAutocomplete: true,
    addTagOnBlur: true // New option: whether to add tag on input blur
  };

  function init(options) {
    config = $.extend({}, config, options); // Merge provided options with defaults

    if (!config.itemId && config.itemType !== null) { 
        console.warn('TagSystem: itemId not provided for initialization. Tag loading and saving for a specific item will be affected unless itemId is set later.');
    }

    const $inputField = $(config.inputSelector);
    if (!$inputField.length) {
        console.error('TagSystem: Input field not found with selector:', config.inputSelector);
        return;
    }
    // Clear previous event handlers to prevent multiple bindings if init is called again on the same element.
    $inputField.off("input keydown blur");
    if ($inputField.data("ui-autocomplete")) {
        try {
            $inputField.autocomplete("destroy");
        } catch (e) {
            console.warn("TagSystem: Error destroying previous autocomplete instance.", e);
        }
    }

    $inputField.on("input", function(){
       let currentVal = $(this).val().toLowerCase();
       $(this).val(currentVal);
       
       if(currentVal.indexOf(",") !== -1){
          let tagsArray = currentVal.split(",");
          tagsArray.forEach(function(tag){
              tag = tag.trim();
              if(tag){
                  processTagAddition(tag);
              }
          });
          $(this).val(""); 
       }
    });
    
    $inputField.autocomplete({
       minLength: config.minCharsForAutocomplete,
       autoFocus: config.autoFocusAutocomplete,
       appendTo: config.suggestionsSelector || $inputField.parent(),
       source: function(request, response){
         $.ajax({
           url: config.getTagsUrl,
           type: 'POST', 
           dataType: 'json',
           data: { 
             term: request.term.toLowerCase(),
             item_id: config.itemId, 
             item_type: config.itemType 
           },
           success: function(data){
              response(data);
           },
           error: function(jqXHR, textStatus, errorThrown) {
             console.error("Error fetching tag suggestions:", textStatus, errorThrown, jqXHR.responseText);
             response([]);
           }
         });
       },
       select: function(event, ui){
         processTagAddition(ui.item.value.toLowerCase(), ui.item.id); 
         $inputField.val('');
         return false;
       }
    });
  
    $inputField.on("keydown", function(event){
       if(event.keyCode === 13){ // Enter key
          event.preventDefault();
          const term = $inputField.val().trim().toLowerCase();
          if(term === ""){
            return false;
          }

          let matchFoundInSuggestions = false;
          const $autocompleteWidget = $inputField.data("ui-autocomplete");

          if ($autocompleteWidget && $autocompleteWidget.menu.element.is(":visible")) {
            $autocompleteWidget.menu.element.find("li").each(function() {
                const $li = $(this);
                // jQuery UI stores the item data on the LI element itself if you used an object source
                const suggestionItem = $li.data("ui-autocomplete-item") || { value: $li.text(), id: null }; 
                if (suggestionItem && suggestionItem.value.toLowerCase() === term) {
                    processTagAddition(suggestionItem.value.toLowerCase(), suggestionItem.id);
                    matchFoundInSuggestions = true;
                    return false; 
                }
            });
          }
          
          if (!matchFoundInSuggestions) {
            processTagAddition(term); 
          }
          
          $inputField.val('');
          return false;
       }
    });

    if (config.addTagOnBlur) {
        $inputField.on("blur", function(){
          const term = $inputField.val().trim().toLowerCase();
          if(term !== ""){
              processTagAddition(term);
              $inputField.val("");
          }
        });
    }

    if (config.itemId) {
        loadItemTags();
    } else {
        // If no itemId, ensure the list is clear if init is called without one.
        const $tagList = $(config.listSelector);
        if ($tagList.length) {
            $tagList.empty();
        }
    }
  }
  
  function processTagAddition(tagName, existingTagId = null) {
    if (!tagName) return;
    
    if (isTagAlreadyAddedToDOM(tagName, existingTagId)) {
        return;
    }
    
    if (!config.itemType){ // If itemType is null, we can't save.
        console.warn("TagSystem: No itemType configured. Cannot save tag association. Adding to DOM optimistically for non-item contexts if desired.");
        // If you want to allow adding to DOM without saving (e.g., a generic tag input not tied to an item)
        // addTagToDOM(tagName, existingTagId || 'temp_' + new Date().getTime());
        return;
    }
    if (!config.itemId && config.itemType) { // If itemType IS set, but itemId is not, it's an issue for saving.
         console.warn(`TagSystem: No itemId for itemType '${config.itemType}'. Cannot save tag association. Tag '${tagName}' not added.`);
         return;
    }


    $.ajax({
        url: config.addTagUrl,
        type: 'POST',
        dataType: 'json',
        data: {
            tag_name: tagName,
            existing_tag_id: existingTagId, 
            item_id: config.itemId,
            item_type: config.itemType
        },
        success: function(data) {
            if (data.success && data.tag) {
                if (!isTagAlreadyAddedToDOM(data.tag.name, data.tag.id)) { 
                    addTagToDOM(data.tag.name, data.tag.id);
                }
            } else if (data.message) {
                console.warn("Couldn't add tag association: ", data.message, "Tag:", tagName);
                if (data.tag && (data.message.toLowerCase().includes("already associated") || data.message.toLowerCase().includes("tag associated successfully") )) {
                    if(!isTagAlreadyAddedToDOM(data.tag.name, data.tag.id)){
                        addTagToDOM(data.tag.name, data.tag.id);
                    }
                }
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Error adding tag via AJAX:", textStatus, errorThrown, jqXHR.responseText);
        }
    });
  }

  function addTagToDOM(tagName, tagId) {
      const $tagList = $(config.listSelector);
      if (!$tagList.length) {
          console.error('TagSystem: Tag list container not found:', config.listSelector);
          return;
      }
      if (isTagAlreadyAddedToDOM(tagName, tagId)) return;

      const $tagSpan = $("<span></span>")
                      .addClass("selected-tag") 
                      .attr("data-tag-name", tagName)
                      .attr("data-tag-id", tagId)
                      .text(tagName);
      const $removeLink = $("<a href='#' title='Remove tag'> &times;</a>") 
                      .addClass("remove-tag") 
                      .on("click", function(e){
                          e.preventDefault();
                          removeTagFromItem(tagId, $tagSpan);
                      });
      $tagSpan.append($removeLink);
      $tagList.append($tagSpan);
      $tagSpan.hide().fadeIn(300);
  }

  function removeTagFromItem(tagId, $tagElement) {
    if (!config.itemType) { // If no itemType, assume it's just DOM removal.
        $tagElement.fadeOut(300, function(){ $(this).remove(); });
        return;
    }
    if (!config.itemId && config.itemType) {
        console.warn("TagSystem: itemId not set, cannot remove tag from item via AJAX.");
        $tagElement.fadeOut(300, function(){ $(this).remove(); });
        return;
    }

    $.ajax({
        url: config.removeTagUrl,
        type: 'POST',
        dataType: 'json',
        data: {
            tag_id: tagId,
            item_id: config.itemId,
            item_type: config.itemType
        },
        success: function(data) {
            if (data.success) {
                $tagElement.fadeOut(300, function(){ $(this).remove(); });
            } else {
                console.error("Error removing tag association:", data.message || "Unknown error");
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("AJAX error removing tag:", textStatus, errorThrown, jqXHR.responseText);
        }
    });
  }

  function isTagAlreadyAddedToDOM(tagName, tagId = null) {
    const $tagList = $(config.listSelector);
    if (tagId) {
        return $tagList.find(`span.selected-tag[data-tag-id="${tagId}"]`).length > 0;
    }
    // Fallback to check by name if ID isn't provided (e.g., before tag is confirmed by server)
    return $tagList.find(`span.selected-tag[data-tag-name="${tagName}"]`).length > 0;
  }

  function loadItemTags() {
    const $tagList = $(config.listSelector);
    if (!$tagList.length) {
        console.error('TagSystem: Tag list container not found for loading tags:', config.listSelector);
        return;
    }
    $tagList.empty(); // Clear current tags in DOM first

    if (!config.itemId || !config.itemType) {
        return;
    }
    $.ajax({
        url: config.getItemTagsUrl,
        type: 'GET', 
        dataType: 'json',
        data: {
            item_id: config.itemId,
            item_type: config.itemType
        },
        success: function(tags) {
            if (tags && tags.length > 0) {
                tags.forEach(function(tag) {
                    addTagToDOM(tag.name, tag.id);
                });
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Error loading item tags:", textStatus, errorThrown, jqXHR.responseText);
        }
    });
  }
  
  // Allows updating the item ID (e.g., when UIE loads a new asset)
  // and optionally re-initializes/re-loads tags for the new item.
  function setItemContext(itemId, itemType = config.itemType) {
    config.itemId = itemId;
    config.itemType = itemType || config.itemType; // Keep current itemType if new one isn't provided
    
    // Re-load tags for the new item context
    if (config.itemId && config.itemType) {
        loadItemTags();
    } else {
        // If itemId is null or itemType is null, clear the tag list.
        const $tagList = $(config.listSelector);
        if ($tagList.length) {
            $tagList.empty();
        }
    }
  }

  return {
    init: init,
    setItemContext: setItemContext, // Use this to change the item being tagged
    addTagToDOM: addTagToDOM // Exposing for potential external use if needed, though typically internal
  };
})(jQuery);