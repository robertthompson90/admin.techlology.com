// js/formTabs.js
var FormTabs = (function(){
  // Initializes the tabbed navigation
  function init() {
    // Cache the form element
    var $form = $("#article-form");
    // Create a container for the tabs
    var $tabContainer = $("<ul>").addClass("form-tabs");
    
    // For each form step, extract a tab label from the first <h2>
    $form.find(".form-step").each(function(index){
      var $step = $(this);
      var stepTitle = $step.find("h2").first().text().trim();
      if (!stepTitle) {
        stepTitle = "Step " + (index + 1);
      }
      
      // Create a tab from the title
      var $tab = $("<li>")
        .text(stepTitle)
        .attr("data-step-index", index);
      
      $tabContainer.append($tab);
    });
    
    // Prepend the tab container to the form
    $form.prepend($tabContainer);
    
    // Bind click events on each tab
    $tabContainer.find("li").on("click", function(){
      var stepIndex = $(this).data("step-index");
      showStep(stepIndex);
    });
    
    // Initially show the first step
    showStep(0);
  }
  
  // Hides all steps and shows the one specified by index.
  function showStep(index) {
    var $steps = $("#article-form .form-step");
    $steps.hide();
    $steps.eq(index).show();
    
    // Update active tab styling
    $("#article-form ul.form-tabs li").removeClass("active");
    $("#article-form ul.form-tabs li").eq(index).addClass("active");
  }
  
  return {
    init: init,
    showStep: showStep
  };
})();
