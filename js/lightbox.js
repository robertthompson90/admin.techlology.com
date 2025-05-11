var Lightbox = (function(){
  function init() {
    // Delegate a click event for images inside polaroid containers.
    $("body").on("click", ".polaroid img", function(e) {
      e.preventDefault();
      var imgSrc = $(this).attr("src");

      // Optional: if the full screen cropper overlay is active, do not open the lightbox.
      if ($("#cropper-modal").is(":visible")) {
        return; // Avoid conflict with full-screen image editor.
      }
      
      // If the lightbox overlay does not exist, create it.
      if ($("#lightbox-overlay").length === 0) {
        $("body").append(
          '<div id="lightbox-overlay">' +
            '<div id="lightbox-content">' +
              '<img src="" alt="Lightbox Image">' +
            '</div>' +
          '</div>'
        );
        
        // Basic styling for the overlay (ideally, move these styles into your CSS file)
        $("#lightbox-overlay").css({
          "position": "fixed",
          "top": "0",
          "left": "0",
          "width": "100%",
          "height": "100%",
          "background": "rgba(0,0,0,0.8)",
          "display": "none",
          "align-items": "center",
          "justify-content": "center",
          "z-index": "3000"
        });
        
        $("#lightbox-content").css({
          "max-width": "90%",
          "max-height": "90%"
        });
        
        $("#lightbox-content img").css({
          "width": "100%",
          "height": "auto",
          "display": "block"
        });
      }
      
      // Set the image source for the lightbox and display it.
      $("#lightbox-overlay img").attr("src", imgSrc);
      $("#lightbox-overlay").fadeIn(200);
    });
    
    // Hide the lightbox when clicking anywhere on the overlay.
    $("body").on("click", "#lightbox-overlay", function() {
      $(this).fadeOut(200);
    });
  }
  
  return {
    init: init
  };
})();
