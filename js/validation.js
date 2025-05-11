// js/validation.js
var Validation = (function(){
  // Initialization function: bind events to form fields and form submission.
  function init() {
    // On blur, validate the field.
    $("#article-form input, #article-form textarea, #article-form select").on("blur", function(){
      validateField($(this));
    });
    
    // On form submission, validate every field.
    $("#article-form").on("submit", function(e){
      var valid = true;
      $(this).find("input, textarea, select").each(function(){
        if(!validateField($(this))){
          valid = false;
        }
      });
      if (!valid){
        Notifications.show("Please fix errors before submitting the form.", "error");
        e.preventDefault();
      }
    });
  }

  // Validate an individual field and return true/false.
  function validateField($field) {
    var isValid = true;
    var value = $.trim($field.val());
    var errorMessage = "";
    
    // Check if the field is required.
    if ($field.prop("required") && value === "") {
      isValid = false;
      errorMessage = "This field is required.";
    }
    
    // Example: You can add custom validation logic here.
    // For instance, for a URL field you might do:
    // if($field.attr("type") === "url" && value !== "" && !isValidURL(value)){
    //    isValid = false;
    //    errorMessage = "Please enter a valid URL.";
    // }

    // Remove any existing error message.
    $field.next(".error-message").remove();
    
    // Add or remove error styling.
    if(!isValid){
      $field.addClass("input-error");
      $("<div class='error-message'>" + errorMessage + "</div>").insertAfter($field);
    } else {
      $field.removeClass("input-error");
    }
    return isValid;
  }
  
  return {
    init: init,
    validateField: validateField
  };
})();
