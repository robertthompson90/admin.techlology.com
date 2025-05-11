// js/undoRedo.js
var UndoRedo = (function(){
  var undoStack = [];
  var redoStack = [];

  // Save the current order state of the staging area.
  function saveState() {
    var state = $("#staging-media").sortable("toArray", { attribute: "data-media-id" });
    // Push a clone so that further DOM mutations don't affect our saved state.
    undoStack.push(JSON.parse(JSON.stringify(state)));
    // Clear redo stack on new action.
    redoStack = [];
  }

  // Apply a saved state: return the items in the order specified in the state array.
  function applyState(state) {
    var $staging = $("#staging-media");
    // Loop over the saved state and append items in that order.
    state.forEach(function(mediaId){
      var $item = $staging.find("[data-media-id='" + mediaId + "']");
      $staging.append($item);
    });
  }

  function undo() {
    if (undoStack.length > 1) { // leave at least one state
      var current = undoStack.pop();
      redoStack.push(current);
      var prev = undoStack[undoStack.length - 1];
      applyState(prev);
      Notifications.show("Undo action completed", "info");
    } else {
      Notifications.show("No more undo available", "info");
    }
  }

  function redo() {
    if (redoStack.length) {
      var state = redoStack.pop();
      undoStack.push(state);
      applyState(state);
      Notifications.show("Redo action completed", "info");
    } else {
      Notifications.show("No more redo available", "info");
    }
  }

  return {
    saveState: saveState,
    undo: undo,
    redo: redo
  };
})();
