// ┌─────────────────────────┐
// │  #Init - Initial Setup  │
// ╘═════════════════════════╛
const module = "layers-panel";
// ┌───────────────────────────────────┐
// │  #Events - Global Event Handlers  │
// ╘═══════════════════════════════════╛
// When game has loaded and is ready
Hooks.once("ready", () => {
    // Patch Classes
    patchPlaceableObjectClass();
    patchDrawingClass();
    // Debugging
    console.log(`${module} | Module Loaded.`);
});
// When canvas is redrawn and ready
Hooks.on("canvasReady", (canvas) => {
    // Switch rendering order of drawings/tiles
    switchDrawingsTilesOrder(canvas);
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
            // Return original function's data
            return Reflect.apply(target, ctx, params);
        }
    }
    // Replace original drawing function with proxy
    Drawing.prototype.refresh = new Proxy(
      Drawing.prototype.refresh, refreshFuncPatched);
}
// ┌───────────────────────────────────────────────────┐
// │  #Functions - Switch Tiles/Drawings Render Order  │
// ╘═══════════════════════════════════════════════════╛
// Switch the Tiles/Drawings render order, so tiles are above drawings
function switchDrawingsTilesOrder(canvas) {
    // If module setting isn't enabled, do nothing
    if (!game.settings.get(module, "switchDrawingsTilesOrder")) { return; }
    // If tiles are already above drawings, do nothing
    if (canvas.tiles.zIndex >= canvas.drawings.zIndex) { return; }
    // Switch the permanent zIndex properties
    // Get the original data and functions
    const drawingsZIndex = canvas.drawings.zIndex;
    const tilesZIndex = canvas.tiles.zIndex;
    const originalDrawingsFunc = Object.getOwnPropertyDescriptor(canvas.drawings.constructor, "layerOptions").get;
    const originalTilesFunc = Object.getOwnPropertyDescriptor(canvas.tiles.constructor, "layerOptions").get;
    // Patched drawings LayerOptions get function
    const patchedDrawingsFunc = {
        apply (target, ctx, params) {
            // Call original func
            let drawingLayerOptions = Reflect.apply(target, ctx, params);
            // Modify data
            drawingLayerOptions.zIndex = tilesZIndex;
            // Return modified data
            return drawingLayerOptions;
        }
    }
    // Replace original drawings get function with proxy
    Object.defineProperty(canvas.drawings.constructor, "layerOptions", {
        get: new Proxy(originalDrawingsFunc, patchedDrawingsFunc)
    });
    // Patched tiles LayerOptions get function
    const patchedTilesFunc = {
        apply (target, ctx, params) {
            // Call original func
            let tileLayerOptions = Reflect.apply(target, ctx, params);
            // Modify data
            tileLayerOptions.zIndex = drawingsZIndex;
            // Return modified data
            return tileLayerOptions;
        }
    }
    // Replace original tiles get function with proxy
    Object.defineProperty(canvas.tiles.constructor, "layerOptions", {
        get: new Proxy(originalTilesFunc, patchedTilesFunc)
    });
    // Switch the current zIndex properties
    [canvas.drawings.zIndex, canvas.tiles.zIndex] = 
    [canvas.tiles.zIndex, canvas.drawings.zIndex];
}
