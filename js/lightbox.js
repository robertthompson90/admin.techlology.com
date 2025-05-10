// js/lightbox.js

var Lightbox = (function(){
  /**
   * Initializes the lightbox functionality.
   * Listens for clicks on images within polaroid containers and opens them in an overlay.
   */
  function init() {
    // Delegate click event for polaroid images.
    $("body").on("click", ".polaroid img", function(e) {
      e.preventDefault();
      var imgSrc = $(this).attr("src");
      
      // If lightbox overlay doesn't exist yet, create it.
      if ($("#lightbox-overlay").length === 0) {
        $("body").append(
          '<div id="lightbox-overlay">' +
            '<div id="lightbox-content">' +
                '<img src="" alt="Lightbox Image">' +
            '</div>' +
          '</div>'
        );
        
        // Basic styles for the overlay via jQuery (you may also include these in your CSS)
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
      
      // Set the image source and display the lightbox.
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
