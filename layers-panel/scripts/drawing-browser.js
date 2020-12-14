// ┌───────────────────────────────────┐
// │  #Events - Global Event Handlers  │
// ╘═══════════════════════════════════╛
// When game has loaded and is ready
Hooks.once("ready", () => {
    // Debugging
    console.log("layers-panel | drawing-browser | Module Loaded.");
    // Add drop-event to canvas drawings layer
    canvas.drawings._onDropDrawingData = async function(event, data) {
        // Validation
        if (data.type !== "Drawing") return;
        if ( !data.img ) return;
        if ( !this._active ) this.activate();
        // Determine the tile size
        const tex = await loadTexture(data.img);
        const ratio = canvas.dimensions.size / (data.tileSize || canvas.dimensions.size);
        data.width = tex.baseTexture.width * ratio;
        data.height = tex.baseTexture.height * ratio;
        // Validate that the drop position is in-bounds and snap to grid
        if ( !canvas.grid.hitArea.contains(data.x, data.y) ) return false;
        data.x = data.x - (data.width / 2);
        data.y = data.y - (data.height / 2);
        if ( !event.shiftKey ) mergeObject(data, canvas.grid.getSnappedPosition(data.x, data.y));
        // Create the tile as hidden if the ALT key is pressed
        if ( event.altKey ) data.hidden = true;
        // Convert to drawing data values
        data = {
            type: CONST.DRAWING_TYPES.RECTANGLE,
            author: game.user._id,
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
            fillType: CONST.DRAWING_FILL_TYPES.PATTERN,
            fillColor: "#FFFFFF",
            fillAlpha: 1.0,
            strokeWidth: 0,
            strokeColor: "#FFFFFF",
            strokeAlpha: 0.0,
            texture: data.img,
            textureAlpha: 1.0,
        }
        // Create the Drawing
        return this.constructor.placeableClass.create(data);
    }
});
// When foundry requests a list of controls in top-left
Hooks.on("getSceneControlButtons", (controls) => {
    // If active control isn't the drawing menu, do nothing
    if (ui.controls?.activeControl !== "drawings") { return; }
    // Prepare tool button to add to the list of controls
    let toolButton = {
        name: "browse",
        title: "CONTROLS.TileBrowser",
        icon: "fas fa-folder",
        button: true,
        onClick: () => {
            new DrawingPicker({
                type: "imagevideo",
                displayMode: "tiles",
                tileSize: true,
            }).render(true);
        }
    };
    // Add button to top-left controls
    controls.find(control => control.name == ui.controls.activeControl).tools.push(toolButton);
});
// When something is dropped on canvas
Hooks.on("dropCanvasData", (event, data) => {
    // If not a drawing type, do nothing
    if (data.type !== "Drawing") return;
    // Call async drop data event
    canvas.drawings._onDropDrawingData(event, data);
});
// ┌────────────────────────────────┐
// │  #Class - DrawingPicker class  │
// ╘════════════════════════════════╛
// Modification of FilePicker class to drag-n-drop on drawings layer
class DrawingPicker extends FilePicker {
    // @override - Allow drag-n-drop on drawings layer
    _canDragStart(selector) {
        return (game.user && game.user.isGM) && (canvas && canvas.drawings._active);
    }
    // @override - Change dragData type to drawings rather than tiles
    _onDragStart(event) {
        const li = event.currentTarget;

        // Get the tile size ratio
        const tileSize = parseInt(li.closest("form").tileSize.value) || canvas.dimensions.size;
        FilePicker.LAST_TILE_SIZE = tileSize;
        const ratio = canvas.dimensions.size / tileSize;

        // Set drag data
        const dragData = {
            type: "Drawing",
            img: li.dataset.path,
            tileSize: tileSize,
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        // Create the drag preview for the image
        const img = li.querySelector("img");
        const w = img.naturalWidth * ratio * canvas.stage.scale.x;
        const h = img.naturalHeight * ratio * canvas.stage.scale.y;
        const preview = DragDrop.createDragImage(img, w, h);
        event.dataTransfer.setDragImage(preview, w/2, h/2);
    }
}