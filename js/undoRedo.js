// js/undoRedo.js

var UndoRedo = (function(){
  var undoStack = [];
  var redoStack = [];

  // Save the current order state of the staging area.
  function saveState() {
    var state = $("#staging-media").sortable("toArray", { attribute: "data-media-id" });
    // Push a clone of the state so that future DOM changes will not affect it.
    undoStack.push(JSON.parse(JSON.stringify(state)));
    // Clear the redo stack on any new action.
    redoStack = [];
  }

  // Apply a saved state: reorder the items in the staging area.
  function applyState(state) {
    var $staging = $("#staging-media");
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
