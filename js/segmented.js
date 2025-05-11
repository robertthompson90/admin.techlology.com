var FormNavigation = (function(){
  var currentStep = 0;
  var $steps = $(".form-step");
  // Optional: Bind tabs if the tab-navigation element exists.
  var $tabs = $(".tab-navigation ul li");

  /**
   * Shows the form step at the given index and hides all others.
   * Also updates the active state of any tab navigation.
   * @param {number} index - Index of the form step to display.
   */
  function showStep(index) {
    $steps.hide().eq(index).show();
    // If tab navigation exists, update the active class.
    if($tabs.length) {
      $tabs.removeClass("active");
      $tabs.eq(index).addClass("active");
    }
    // Optionally, trigger a custom event when the step changes.
    $(document).trigger("step:changed", currentStep);
  }
  
  /**
   * Initializes segmented form navigation.
   * Binds click events for Next/Previous buttons as well as tab click events.
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
    
    // Bind click events on tab navigation items if they exist.
    if($tabs.length){
      $tabs.on("click", function(e){
        e.preventDefault();
        currentStep = $(this).index();
        showStep(currentStep);
      });
    }
  }
  
  return {
    init: init
  };
})();
