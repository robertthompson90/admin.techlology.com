// js/formNavigation.js
var FormNavigation = (function(){
  var currentStep = 0;
  // Cache all form steps.
  var $steps = $("#article-form .form-step");
  // Create a tab container for the navigation tabs.
  var $tabContainer = $("<ul>").addClass("form-tabs");

  /**
   * Dynamically creates tab navigation items based on the form steps.
   */
  function createTabs() {
    $steps.each(function(index){
      var $step = $(this);
      // Use the first <h2> as label. Fallback to "Step X" if none.
      var stepTitle = $step.find("h2").first().text().trim();
      if (!stepTitle) {
        stepTitle = "Step " + (index + 1);
      }
      var $tab = $("<li>")
                  .text(stepTitle)
                  .attr("data-step-index", index);
      $tabContainer.append($tab);
    });
    // Prepend the tab container to the form.
    $("#article-form").prepend($tabContainer);
    
    // Bind click events on tabs.
    $tabContainer.find("li").on("click", function(){
      var newIndex = $(this).data("step-index");
      currentStep = newIndex;
      showStep(currentStep);
      // Save the active step so it can be restored on reload.
      localStorage.setItem("addArticleStep", currentStep);
    });
  }
  
  /**
   * Shows the form step corresponding to the given index,
   * hides all other steps, and updates the active tab styling.
   * Also stores the current step in localStorage.
   * @param {number} index - The index to display.
   */
  function showStep(index) {
    if(index < 0 || index >= $steps.length) {
      index = 0;
    }
    $steps.hide().eq(index).show();
    $tabContainer.find("li").removeClass("active")
                 .eq(index).addClass("active");
    // Save the current step in localStorage.
    localStorage.setItem("addArticleStep", index);
    // Optionally trigger an event (e.g., $(document).trigger("step:changed", [index]);)
  }
  
  /**
   * Initializes the form navigation.
   * Restores the active step from localStorage (if available),
   * creates the tab navigation, and binds next/prev button events.
   */
  function init() {
    $steps.hide();
    
    // Try to restore the last active step from localStorage.
    var savedStep = localStorage.getItem("addArticleStep");
    if(savedStep !== null && !isNaN(savedStep)) {
      currentStep = parseInt(savedStep, 10);
      // Validate currentStep.
      if(currentStep < 0 || currentStep >= $steps.length) {
        currentStep = 0;
      }
    } else {
      currentStep = 0;
    }
    
    createTabs();
    showStep(currentStep);
    
    // Bind "Next" button: move to the next step.
    $(".next-step").on("click", function(e){
      e.preventDefault();
      if (currentStep < $steps.length - 1) {
        currentStep++;
        showStep(currentStep);
      }
    });
    
    // Bind "Previous" button: move to the previous step.
    $(".prev-step").on("click", function(e){
      e.preventDefault();
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
      }
    });
  }

  // Expose the init function.
  return {
    init: init,
    showStep: showStep
  };
})();
