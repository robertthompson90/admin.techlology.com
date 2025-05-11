// js/notifications.js
var Notifications = (function(){
  // Display a toast message. Type can be "info", "success", or "error".
  function show(message, type) {
    type = type || "info";
    var $toast = $("<div class='toast " + type + "'>" + message + "</div>");
    // Append to body
    $("body").append($toast);
    // Use CSS animations (fade in/out)
    $toast.fadeIn(300).delay(3000).fadeOut(300, function(){
      $(this).remove();
    });
  }
  return {
    show: show
  };
})();
