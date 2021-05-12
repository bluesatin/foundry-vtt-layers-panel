// ┌─────────────────────────┐
// │  #Init - Initial Setup  │
// ╘═════════════════════════╛
const module = "layers-panel";
// ┌───────────────────────────────────┐
// │  #Events - Global Event Handlers  │
// ╘═══════════════════════════════════╛
// When game initialises
Hooks.once("init", () => {
    // Patch Classes
    patchPlaceableObjectClass();
    patchDrawingClass();
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
    	hideClearAllButton(controls);
    }
});
// When entity selection within scene changes
Hooks.on("controlDrawing", (entity, changes) => {
    // Reset controlled entity's interactive setting
    if (entity.interactive == false) {
        console.log("Reset interactive setting");
        entity.interactive = true;
    }
});
// ┌──────────────────────────────────────────┐
// │  #Functions - Hide 'Clear All Drawings'  │
// ╘══════════════════════════════════════════╛
// Used to hide the default 'Clear All Drawings' button
function hideClearAllButton(controls) {
	// Remove the 'Clear Drawings' tool button
	const tools = controls.find(control => control.name == ui.controls.activeControl).tools;
    const pos = tools.findIndex(tool => tool.name == "clear");
    const removedButton = tools.splice(pos, 1);
    // Return
    return removedButton;
}
// ┌────────────────────────────────────────────┐
// │  #Functions - Patch PlaceableObject Class  │
// ╘════════════════════════════════════════════╛
// Patch the PlaceableObject Class 
// + (Allow right-click panning over object)
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
        const callbacks = {
            hoverIn: this._onHoverIn, //Hook before default onHover
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
            dragRightMove: canvas._onDragRightMove.bind(canvas), //Pass panning to canvas
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
// ┌────────────────────────────────────┐
// │  #Functions - Patch Drawing Class  │
// ╘════════════════════════════════════╛
// Patch the Drawing Class 
// + (Make locked drawing objects non-interactable)
function patchDrawingClass() {
    // Patched onHoverIn event-handler
    const onHoverInPatched = {
        apply (target, ctx, params) {
            // If object is locked and unselected, make it non-interactive
            if (ctx.data.locked
                && ctx._controlled == false
                && game.settings.get(module, "makeLockedNonInteractable")) {
                    ctx.interactive = false;
            }
          // Force onHoverIn param 'hoverOutOthers = false'
          // if (params[1] == undefined) { params[1] = {}; }
          // if (params[1].hoverOutOthers == undefined) { params[1].hoverOutOthers = false };
          // Call original function
          return Reflect.apply(target, ctx, params);
        }
    }
    // Replace original onHoverIn with proxy
    Drawing.prototype._onHoverIn = new Proxy(
      Drawing.prototype._onHoverIn, onHoverInPatched);
}