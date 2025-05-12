// js/undoRedo.js
var UndoRedo = (function(){
  "use strict";

  // Undo and redo stacks
  let undoStack = [];
  let redoStack = [];
  const maxHistory = 20; // Maximum states to retain

  /**
   * captureState:
   * Use the same function that your autosave module uses to capture the form state.
   * If you already have captureFormState() defined (in autosave.js), you can call that.
   */
  function captureState() {
    // We assume captureFormState() is available in the global scope.
    // If not, copy its logic here.
    return captureFormState();
  }

  /**
   * restoreState:
   * Restores the form to a given state.
   * This function should match the logic from restoreFormState() in autosave.js.
   * You might want to ensure both functions are in sync.
   * @param {Object} state - The state object to restore.
   */
  function restoreState(state) {
    // We assume restoreFormState(state) is available.
    // Alternatively, you can inline the restoration code here.
    restoreFormState(state);
  }

  /**
   * pushState:
   * Capture the current form state and push it onto the undo stack.
   * Also, clear the redo stack because a new action "diverges" from past history.
   */
  function pushState() {
    const currentState = captureState();
    undoStack.push(currentState);

    // Avoid excessive memory use
    if (undoStack.length > maxHistory) {
      undoStack.shift();
    }
    // A new action resets the redo stack.
    redoStack = [];
    updateUndoRedoButtons();
  }

  /**
   * undo:
   * Revert to the previous state, if available.
   */
  function undo() {
    if (undoStack.length > 1) {  // Ensure there is at least one previous state.
      const currentState = undoStack.pop();
      redoStack.push(currentState);
      const previousState = undoStack[undoStack.length - 1];
      restoreState(previousState);
      Notifications.show("Undo performed", "info");
      updateUndoRedoButtons();
    }
  }

  /**
   * redo:
   * Reapply a state that was undone.
   */
  function redo() {
    if (redoStack.length > 0) {
      const redoState = redoStack.pop();
      undoStack.push(redoState);
      restoreState(redoState);
      Notifications.show("Redo performed", "info");
      updateUndoRedoButtons();
    }
  }

  /**
   * updateUndoRedoButtons:
   * Enable or disable UI buttons for undo/redo based on available history.
   */
  function updateUndoRedoButtons() {
    // Ensure you have buttons with the IDs "undo-button" and "redo-button"
    $("#undo-button").prop("disabled", undoStack.length <= 1);
    $("#redo-button").prop("disabled", redoStack.length === 0);
  }

  /**
   * init:
   * Initialize the undo/redo module.
   * Capture the initial state and bind UI events and keyboard shortcuts.
   */
  function init() {
  // Capture the initial state
  let initialState = captureState();
  undoStack = [initialState];
  redoStack = [];
  updateUndoRedoButtons();

  // Bind UI button events:
  $("#undo-button").on("click", undo);
  $("#redo-button").on("click", redo);

  // Bind keyboard shortcuts (Ctrl+Z/Ctrl+Y or Cmd+Z/Cmd+Y)
  $(document).on("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    }
  });
}


  return {
    init: init,
    pushState: pushState,
    undo: undo,
    redo: redo
  };
})();
