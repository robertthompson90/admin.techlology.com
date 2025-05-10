// js/validation.js

var Validation = (function(){
  /**
   * Validates a single field by checking if it is empty.
   * Adds an error message if validation fails; otherwise, clears any error indicators.
   * @param {jQuery} $field - The field element to validate.
   * @return {boolean} True if the field is valid, false otherwise.
   */
  function validateField($field) {
    var value = $field.val().trim();
    // Remove any existing error message.
    $field.next(".error-message").remove();
    
    if(value === ""){
      $field.addClass("input-error");
      // Insert an inline error message immediately after the field.
      $field.after('<span class="error-message">This field is required.</span>');
      return false;
    } else {
      $field.removeClass("input-error");
      return true;
    }
  }
  
  /**
   * Initializes inline validation for required fields.
   * Attaches blur and keyup events on fields to provide real-time feedback and also validates on form submission.
   */
  function initInlineValidation(){
    // Validate fixed fields (e.g., title and tagline).
    $("#title, #tagline").on("blur keyup", function(){
      validateField($(this));
    });
    
    // Validate required fields within source blocks.
    $("#sources-container").on("blur keyup", "input[name='source_title[]'], input[name='source_url[]']", function(){
      validateField($(this));
    });
    
    // Validate all required fields on form submission.
    $("#article-form").on("submit", function(e){
      var valid = true;
      $(this).find("input[required]").each(function(){
        if(!validateField($(this))){
          valid = false;
        }
      });
      if(!valid){
        e.preventDefault();
        // Optionally, scroll to the first error field.
        // $("html, body").animate({ scrollTop: $(".input-error").first().offset().top - 20 }, 300);
      }
    });
  }
  
  return {
    init: initInlineValidation,
    validateField: validateField
  };
})();
