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
    // Patched _createInteractionManager function
    const interactionManagerPatched = {
        apply (target, ctx, params) {
            // Call the original function
            const interactionManager = Reflect.apply(target, ctx, params);
            // Modify returned data
            interactionManager.callbacks.dragRightMove = canvas._onDragRightMove.bind(canvas);
            // Return
            return interactionManager;
        }
    }
    // Replace original drawing function with proxy
    PlaceableObject.prototype._createInteractionManager = new Proxy(
      PlaceableObject.prototype._createInteractionManager, interactionManagerPatched);
}
// ┌────────────────────────────────────┐
// │  #Functions - Patch Drawing Class  │
// ╘════════════════════════════════════╛
// Patch the Drawing Class
// + (On Refresh - Make locked drawing objects non-interactable)
function patchDrawingClass() {
    // Patched draw function
    const refreshFuncPatched = {
        apply (target, ctx, params) {
            // If object is locked and unselected, make it non-interactive
            if (ctx.data.locked == true
                && ctx._controlled == false
                && game.settings.get(module, "makeLockedNonInteractable")) {
                    ctx.interactive = false;
            }
            // Otherwise, make interactive
            else {
                ctx.interactive = true;
            }
            // Return original function
            return Reflect.apply(target, ctx, params);
        }
    }
    // Replace original drawing function with proxy
    Drawing.prototype.refresh = new Proxy(
      Drawing.prototype.refresh, refreshFuncPatched);
}