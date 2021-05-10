// ┌─────────────────────────┐
// │  #Init - Initial Setup  │
// ╘═════════════════════════╛
const module = "layers-panel";
// ┌───────────────────────────────────┐
// │  #Events - Global Event Handlers  │
// ╘═══════════════════════════════════╛
// When game initialises
Hooks.once("init", () => {
    // Patch PlaceableObject Class
    patchPlaceableObjectClass();
    // Debugging
    console.log(`${module} | Module Loaded.`);
});
// When foundry requests a list of controls in top-left
Hooks.on("getSceneControlButtons", (controls) => {
    // If active control isn't the drawing menu, do nothing
    if (ui.controls?.activeControl !== "drawings") { return; }
    // If setting is enabled, remove the 'Clear Drawings' tool button
    if(game.settings.get(module, "hideClearAllButton")) {
    	// Hide the button
    	_hideClearAllButton(controls);
    }
    
});
// Used to hide the default 'Clear All Drawings' button
function _hideClearAllButton(controls) {
	// Remove the 'Clear Drawings' tool button
	const tools = controls.find(control => control.name == ui.controls.activeControl).tools;
    const pos = tools.findIndex(tool => tool.name == "clear");
    tools.splice(pos, 1);
}
// ┌────────────────────────────────────────────┐
// │  #Functions - Patch PlaceableObject Class  │
// ╘════════════════════════════════════════════╛
// Patch the PlaceableObject Class to allow canvas panning
function patchPlaceableObjectClass() {
    // Modify the default interaction handler
    PlaceableObject.prototype._createInteractionManager = function() {
        // Handle permissions to perform various actions
        const permissions = {
          hoverIn: this._canHover,
          hoverOut: this._canHover,
          clickLeft: this._canControl,
          clickLeft2: this._canView,
          clickRight: this._canHUD,
          clickRight2: this._canConfigure,
          dragStart: this._canDrag
        };
        // Define callback functions for each workflow step
        // → (Add dragRightMove event callback to the canvas)
        const callbacks = {
          hoverIn: this._onHoverIn,
          hoverOut: this._onHoverOut,
          clickLeft: this._onClickLeft,
          clickLeft2: this._onClickLeft2,
          clickRight: this._onClickRight,
          clickRight2: this._onClickRight2,
          dragLeftStart: this._onDragLeftStart,
          dragLeftMove: this._onDragLeftMove,
          dragLeftDrop: this._onDragLeftDrop,
          dragLeftCancel: this._onDragLeftCancel,
          dragRightStart: null,
          dragRightMove: canvas._onDragRightMove.bind(canvas),
          dragRightDrop: null,
          dragRightCancel: null
        };
        // Define options
        const options = {
          target: this.controlIcon ? "controlIcon" : null
        };
        // Create the interaction manager
        return new MouseInteractionManager(this, canvas.stage, permissions, callbacks, options);
    }
}
