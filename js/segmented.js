// js/segmented.js

var FormNavigation = (function(){
  var currentStep = 0;
  var $steps = $(".form-step");
  
  /**
   * Shows the form step at the given index and hides all others.
   * @param {number} index - Index of the form step to display.
   */
  function showStep(index) {
    $steps.hide().eq(index).show();
  }
  
  /**
   * Initializes segmented form navigation.
   * Binds click events for "Next" and "Previous" buttons to hide/show appropriate steps.
   */
  function init() {
    // Initially hide all steps and show only the first one.
    $steps.hide();
    currentStep = 0;
    showStep(currentStep);
    
    // Bind Next button: move to the next step.
    $(".next-step").on("click", function(e){
      e.preventDefault();
      if (currentStep < $steps.length - 1) {
        currentStep++;
        showStep(currentStep);
      }
    });
    
    // Bind Previous button: move to the previous step.
    $(".prev-step").on("click", function(e){
      e.preventDefault();
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
      }
    });
  }
  
  return {
    init: init
  };
})();
