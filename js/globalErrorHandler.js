// js/globalErrorHandler.js
$(document).ajaxError(function(event, jqxhr, settings, thrownError) {
  // Display the error message using Notifications module.
  Notifications.show("AJAX Error in (" + settings.url + "): " + thrownError, "error");
});
