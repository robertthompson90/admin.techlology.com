var UndoRedo = (function(){
  var undoStack = [];
  var redoStack = [];

  // Save the current order state of the staging area.
  function saveState() {
    var state = $("#staging-media").sortable("toArray", { attribute: "data-media-id" });
    undoStack.push(JSON.parse(JSON.stringify(state)));
    redoStack = [];
  }

  // Apply a saved state by reordering staging items.
  function applyState(state) {
    var $staging = $("#staging-media");
    state.forEach(function(mediaId){
      var $item = $staging.find("[data-media-id='" + mediaId + "']");
      $staging.append($item);
    });
  }

  function undo() {
    if (undoStack.length > 1) {
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
