// ┌─────────────────────────┐
// │  #Init - Initial Setup  │
// ╘═════════════════════════╛
const module = "layers-panel";
// ┌──────────────────────────────────┐
// │  #Hooks - Global Event Handlers  │
// ╘══════════════════════════════════╛
// When game initialises
Hooks.once("init", () => {
    // Create UI class to be rendered
    ui.layersPanel = new LayersPanel;
    console.log(`${module} | Layers-Panel Loaded.`);
});
// When foundry requests a list of controls in top-left
Hooks.on("getSceneControlButtons", (controls) => {
    // Add button to list of controls
    addLayersPanelButton(controls);
});
// When scene changes and canvas re-renders
Hooks.on("canvasReady", (canvas) => {
    // If panel is open
    if (ui.layersPanel.rendered) {
        ui.layersPanel.render(); //Refresh panel
        ui.layersPanel._collapseFolders(true); //Collapse folders
    }
});
// When entity within scene gets updated
Hooks.on("updateDrawing", (scene, entity, changes, diff) => {
    // If panel is open, refresh it
    if (ui.layersPanel.rendered) {
        ui.layersPanel.render(); //Refresh panel
    }
});
// When entity selection within scene changes
Hooks.on("controlDrawing", (entity, changes) => {
    // If panel isn't open, do nothing
    if (!ui.layersPanel.rendered) { return; }
    // Otherwise, call event after a delay (to stop multiple re-renders)
    const delayLength = 50; //How long to wait after events to call update (in ms)
    // clearTimeout(ui.layersPanel._onSelectionChangeTimer); //Reset existing delay timer
    ui.layersPanel._onSelectionChangeTimer = setTimeout(() => {
        ui.layersPanel.render(); //Refresh panel
    }, delayLength);
});
// ┌─────────────────────────────┐
// │  #Events - Event Functions  │
// ╘═════════════════════════════╛
// For adding the layers-panel button to a list of controls
function addLayersPanelButton(controls) {
    // If active control isn't the drawing menu
    if (ui.controls?.activeControl !== "drawings") {
        // If panel is open, close it
        if (ui.layersPanel.rendered) { ui.layersPanel.close(); }
        // Don't add button
        return;
    }
    // If user isn't a GM, don't add button
    if (!game.user.isGM) { return; }
    // If button isn't enabled in settings, don't add button
    if(!game.settings.get(module, "showLayersPanelButton")) { return; }
    // Prepare tool button to add to the list of controls
    let toolButton = {
        name: "layers",
        title: "Open layers panel",
        icon: "fas fa-layer-group",
        button: true,
        onClick: event => {
            ui.layersPanel.open();
        },
    };
    // Add button to top-left controls
    controls.find(control => control.name == ui.controls.activeControl).tools.push(toolButton);
}

// ┌──────────────────────────────┐
// │  #Class - LayersPanel class  │
// ╘══════════════════════════════╛
class LayersPanel extends Application {
    // @override - defaultOptions() - Default Options
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "layers-panel",
            title: "Drawing Layers",
            template: "modules/layers-panel/templates/layers-panel.html",
            classes: ["sidebar-popout"],
            popOut: true,
            resizable: true,
            width: 260,
            dragDrop: [{dragSelector: ".directory-item",  dropSelector: ".directory-list"}],
            filters: [{inputSelector: 'input[name="search"]', contentSelector: ".directory-list"}],
            scrollY: [".directory-list"],
        })
    }
    // ┌──────────────────────────┐
    // │  #Data - Data Retrieval  │
    // ╘══════════════════════════╛
    // @override - entity - Type of entity that is displayed
    static get entity() {
        return "Drawing";
    }
    // @override - collection - The collection entities are contained in
    static get collection() {
        return canvas.drawings;
    }
    // @override - getData() - Get data for the application to use/render in template
    getData(options) {
        // Assign Entities
        this.entities = this.getEntities();
        // Assign Folders
        this.folders = this.getFolders();
        // Build Tree
        this.tree = this.getTree(this.folders, this.entities);
        // Selected Entities
        this.selected = canvas.activeLayer.controlled;
        // Return
        return {
            user: game.user,
            tree: this.tree,
            selected: this.selected,
            activeTool: this.tool,
        }
    }
    // getEntities() - Get placeable entities and extra display data
    getEntities() {
        // Get base data
        const entities = canvas.drawings.placeables.filter(e => e.visible);
        // Add extra details
        for(const entity of entities) {
            // Assign z-level folder for tree function
            entity.data.folder = entity.data.z;
            // Assign some extra info for rendering the template
            entity.data.panel = this.getEntityPanelData(entity);
        };
        // Return
        return entities;
    }
    // getEntityPanelData() - Generate extra display data for placeable entities
    getEntityPanelData(entity) {
        // Initialise vars
        const panel = {};
        // Assign type of entity
        panel.type = entity.data.type;
        // If it's a textured drawing
        if (entity.isTiled) panel.type = "i";
        // Assign details based on type of entity (name, icon)
        switch(panel.type) {
            case "r": //Rectangles
                panel.name = `${entity.data._id}`;
                panel.icon = "fas fa-square";
                break;
            case "e": //Ellipses
                panel.name = `${entity.data._id}`;
                panel.icon = "fas fa-circle";
                break;
            case "p": //Polygons
                panel.name = `${entity.data._id}`;
                panel.icon = "fas fa-draw-polygon";
                break;
            case "i": //Images
                let regex = /[^/\\]*$/;
                panel.name = `${entity.data.texture.match(regex)}`;
                panel.icon = "fas fa-image";
                break;
            case "t": //Text
                panel.name = `${entity.data.text}`;
                panel.icon = "fas fa-font";
                break;
            case "f": //Freehand Drawings
                panel.name = `${entity.data._id}`;
                panel.icon = "fas fa-pencil-alt";
                break;
            default: //Fallback for unknown types
                panel.name = `${entity.data._id}`;
                panel.icon = "fas fa-question";
                break;
        }
        // Return
        return panel;
    }
    // getFolders() - Generate folders for z-levels that are in use by entities
    getFolders() {
        // Initialise
        const entities = this.entities;
        // Generate z-level 'folders'
        const folders = [];
        const tracker = new Set();
        for (const entity of entities) {
            // If zIndex folder has been made already, skip it
            if (tracker.has(entity.data.z)) {
                continue;
            }
            // Make zIndex folder
            folders.push({
                id: entity.data.z, _id: entity.data.z,
                visible: true,
                children: [],
                content: [],
                data: {
                    _id: entity.data.z,
                    id: entity.data.z,
                    name: entity.data.z,
                    type: "Layer",
                    z: entity.data.z,
                    sort: entity.data.z,
                    color: "#333",
                },
            });
            // Add zIndex to tracker for skipping
            tracker.add(entity.data.z);
        }
        // Return
        return folders;
    }
    // getTree() - Generate data tree for rendering
    getTree(folders, entities) {
        // Only use entities marked as visible
        entities = entities.filter(a => a.visible);
        // Reverse order of entities to reflect display order (instead of render order)
        entities.reverse();
        // Place entities into the folders
        for(const entity of entities) {
            // Find entity's folder
            const folder = folders.find(folder => folder.data.z == entity.data.z);
            // Place entity into folder
            folder.content.push(entity);
            // Mark folder as being expanded if an entity is selected
            if(entity._controlled == true) {
                game.folders._expanded[folder._id] = true;
            }
        }
        // Sort folders
        folders.sort((a, b) => b.data.sort - a.data.sort); //Numerical Desc
        // Return the root level contents of folders and entities
        return {
          root: true,
          content: [],
          children: folders,
        };
    }
    // ┌──────────────────────────────────┐
    // │  #Events - Class Event Handlers  │
    // ╘══════════════════════════════════╛
    // @override - activateListeners() - Activate GUI listeners
    activateListeners(html) {
        // Initialise
        super.activateListeners(html);
        const header = html.find(".directory-header");
        const directory = html.find(".directory-list");
        const footer = html.find(".directory-footer");
        const entities = html.find(".entity");
        // Keyboard events
        this._keyHandler = this._keyHandler || this._onKeyDown.bind(this);
        document.addEventListener("keydown", this._keyHandler);
        // Header section events
        header.find(".collapse-all").click(this._collapseFolders.bind(this));
        header.find(".layer-tools").on("click", ".layer-tool", this._onClickTool.bind(this));
        // Directory section events
        directory.on("click", ".folder-header", this._toggleFolder.bind(this));
        directory.on("click", ".entity-name", this._onClickEntityName.bind(this));
        directory.on("dblclick", ".entity-name", this._onClickEntityName.bind(this));
        directory.on("click", ".entity-locked", this._onClickEntityLocked.bind(this));
        this._contextMenu(html);
        // Directory drag events
        const dh = this._onDragHighlight.bind(this);
        directory.find(".folder").on("dragenter", dh).on("dragleave", dh);
        // Footer section events
    }
    // @override - Open the panel
    open(options) {
        // If panel is already open, bring it up
        if (this.rendered) {
            this.maximize();
            this.bringToTop();
        }
        // Otherwise, open the panel
        else {
            this.render(true);
        }
    }
    // @override - Close the panel
    async close(options) {
        // Clear up event-listeners
        document.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
        // Clear tool
        this.tool = false;
        // Call default close function
        return super.close(options);
    }
    // @override - Render the actual application, fix issues with re-rendering
    render(force=false, options={}) {
        // Initialise
        const html = this.element;
        // Before re-rendering
        // Store active element to re-focus after re-rendering
        const activeElement = html.find(":focus");
        // Async re-render the HTML
        this._render(force, options)
            // Things to do after re-rendering
            .then(() => {
                // Refocus an input if there was one focused
                const input = $("#" + activeElement.attr("id"));
                // Focus and reset value, to move caret to end of text
                const value = input.val();
                input.focus().val("").val(value);
            })
            // Error catching
            .catch(err => {
                err.message = `An error occurred while rendering ${this.constructor.name} ${this.appId}: ${err.message}`;
                console.error(err);
                this._state = Application.RENDER_STATES.ERROR;
            });
        // Return
        return this;
    }
    // _toggleFolder() - Handle toggling the collapsed or expanded state of a folder
    _toggleFolder(event) {
        // Initialise
        let folder = $(event.currentTarget.parentElement);
        let folderId = folder.attr("data-folder-id");
        let collapsed = folder.hasClass("collapsed");
        game.folders._expanded[folderId] = collapsed;
        // Expand
        if (collapsed) { 
            folder.removeClass("collapsed");
        }
        // Collapse
        else {
            folder.addClass("collapsed");
            const subs = folder.find('.folder').addClass("collapsed");
            subs.each((i, f) => game.folders._expanded[f.dataset.folderId] = false);
        }
        // Record container position
        if (this.popOut) this.setPosition();
    }
    // _onClickEntityName() - Handle clicking on an Entity name in the Sidebar directory
    _onClickEntityName(event) {
        // Initialise
        event.preventDefault();
        const element = event.currentTarget;
        const entityId = element.parentElement.dataset.entityId;
        const entity = this.entities.find(e => e.id == entityId);
        const sheet = entity.sheet;
        // Switch to selection tool, to allow selection change
        $("#controls .active [data-tool=select]").click();
        // If single-click
        if (event.type == "click") {
            // If ctrl pressed down, allow multiple selections
            if (event.ctrlKey == true || event.shiftKey == true) {
                // If entity is already selected, remove from selection group
                if (entity._controlled == true) {
                    entity.release();
                }
                // Otherwise, add to selection group
                else {
                    entity.control({releaseOthers: false}); //Don't deselect other entities
                }
            }
            // Otherwise, normal selection
            else {
                entity.control(); //Select the entity on canvas
            }
        }
        // If it was a double-click, open drawing configuration
        else if (event.type == "dblclick") {
            // If the sheet is already rendered
            if (sheet.rendered) {
                sheet.maximize();
                sheet.bringToTop();
            }
            // Otherwise, render the sheet
            else {
                sheet.render(true);
            }
        }
    }
    // _onClickEntityLocked() - Handle clicking on an Entity locked status
    _onClickEntityLocked(event) {
        // Initialise
        event.preventDefault();
        const element = event.currentTarget;
        const entityId = element.parentElement.dataset.entityId;
        const entity = this.entities.find(e => e.id == entityId);
        const sheet = entity.sheet;
        // If the entity isn't selected, just toggle locked
        if (entity._controlled == false) {
            // Toggle locked status
            entity.update({locked:!entity.data.locked});
        }
        // Otherwise, toggle locked status on all selected
        else {
            // Get toggle status
            const isLocked = entity.data.locked;
            const updates = canvas.activeLayer.controlled.map(o => {
                return {_id: o.id, locked: !isLocked};
            });
            // Update all objects
            canvas.activeLayer.updateMany(updates);
        }
    }
    // collapseFolders() - Folder collapse toggle functionality
    _collapseFolders(collapse) {
        // Initialize
        let foldersOpen = true;
        // Check if all folders are collapsed
        if (this.element.find('li.folder').not(".collapsed").length === 0) {
            foldersOpen = false;
        }
        // If any folders are open, collapse everything
        if (foldersOpen || collapse == true) {
            this.element.find('li.folder').addClass('collapsed');
            for(const f of this.folders) {
              game.folders._expanded[f._id] = false;
            }
        }
        // Else if everything is collapsed, open everything
        else {
            this.element.find('li.folder').removeClass('collapsed');
            for(const f of this.folders) {
              game.folders._expanded[f._id] = true;
            }
        }
        // Store window location
        if (this.popOut) this.setPosition();
    }
    // _contextMenu() - Context-menu handler when right-clicking something
    _contextMenu(html) {
        // Folder Context
        const folderOptions = this._getFolderContextOptions();
        Hooks.call(`get${this.constructor.name}FolderContext`, html, folderOptions);
        if (folderOptions) new ContextMenu(html, ".folder .folder-header", folderOptions);
        // Entity Context
        const entryOptions = this._getEntryContextOptions();
        Hooks.call(`get${this.constructor.name}EntryContext`, html, entryOptions);
        if (entryOptions) new ContextMenu(html, ".entity", entryOptions);
    }
    // _getFolderContextOptions() - Context-menu options for folders
    _getFolderContextOptions() {
        return [
            // Select All Entities within Folder
            {
                name: "Select All",
                icon: '<i class="fas fa-object-group"></i>',
                // condition: () => game.user.isGM,
                callback: header => {
                    // Initialise
                    const li = header.parent()[0];
                    const folder = this.folders.find(f => f.id == li.dataset.folderId);
                    // Clear selection first
                    canvas.drawings.releaseAll();
                    // Select all entities in folder
                    for(const entity of folder.content) {
                        entity.control({releaseOthers: false});
                    }
                }
            },
        ];
    }
    // _getFolderContextOptions() - Context-menu options for entities
    _getEntryContextOptions() {
        return [
            // Edit Object (e.g. open sheet)
            {
                name: "Locate Drawing",
                icon: '<i class="fas fa-search"></i>',
                // condition: () => game.user.isGM,
                callback: li => {
                    // Initialise
                    const entity = this.entities.find(e => e.id == li.data("entityId"));
                    const sheet = entity.sheet;
                    const coords = entity.center; //Center coords of object
                    // Select entity
                    entity.control();
                    // Locate and move to entity
                    canvas.animatePan({x:coords.x, y:coords.y});
                }
            },
            {
                name: "Configure Drawing",
                icon: '<i class="fas fa-cog"></i>',
                // condition: () => game.user.isGM,
                callback: li => {
                    // Initialise
                    const entity = this.entities.find(e => e.id == li.data("entityId"));
                    const sheet = entity.sheet;
                    // Select entity
                    entity.control();
                    // If the sheet is already rendered
                    if (sheet.rendered) {
                        sheet.maximize();
                        sheet.bringToTop();
                    }
                    // Otherwise render the sheet
                    else {
                        sheet.render(true);
                    }
                }
            },
        ];
    }
    // _onSearchFilter() - When user tries to search 
    _onSearchFilter(event, query, html) {
        // Initialise
        const isSearch = !!query;
        let entityIds = new Set();
        let folderIds = new Set();
        // Match entities and folders
        if (isSearch) {
            const regex = new RegExp(RegExp.escape(query), "i");
            // Match entity names
            for(let e of this.entities) {
                if (regex.test(e.data.panel.name)) {
                    // Add entity to entity-match set
                    entityIds.add(e.id);
                    entityIds.add(e.id.toString()); //dataset API uses strings
                    // Add parent folder to folder-match set
                    if (e.data.folder) {
                        folderIds.add(e.data.folder);
                        folderIds.add(e.data.folder.toString()); //dataset API uses strings
                    }
                }
            }
        }
        // Toggle each directory item
        for(let el of html.querySelectorAll(".directory-item")) {
            // If an entity
            if (el.classList.contains("entity")) {
                el.style.display = (!isSearch || entityIds.has(el.dataset.entityId)) ? "" : "none";
            }
            // If a folder
            if (el.classList.contains("folder")) {
                let match = isSearch && folderIds.has(el.dataset.folderId);
                el.style.display = (!isSearch || match) ? "" : "none";
                if (isSearch && match) el.classList.remove("collapsed");
                else el.classList.toggle("collapsed", !game.folders._expanded[el.dataset.folderId]);
            }
        }
    }
    // ┌─────────────────────────────────┐
    // │  #Events - Drag Event Handlers  │
    // ╘═════════════════════════════════╛
    // @override - When you start dragging an entity
    _onDragStart(event) {
        let li = event.currentTarget.closest(".directory-item");
        const dragData = li.classList.contains("folder") ?
            { type: "Folder", id: li.dataset.folderId, entity: this.constructor.entity } :
            { type: this.constructor.entity, id: li.dataset.entityId };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        this._dragType = dragData.type;
    }
    // @override - Highlight folders as drop targets when dragging over
    _onDragHighlight(event) {
        const li = event.currentTarget;
        if ( !li.classList.contains("folder") ) return;
        event.stopPropagation();  // Don't bubble to parent folders
        // Remove existing drop targets
        if ( event.type === "dragenter" ) {
            for ( let t of li.closest(".directory-list").querySelectorAll(".droptarget") ) {
                t.classList.remove("droptarget");
            }
        }
        // Remove current drop target
        if ( event.type === "dragleave" ) {
            const el = document.elementFromPoint(event.clientX, event.clientY);
            const parent = el.closest(".folder");
            if ( parent === li ) { return; }
        }
        // Add new drop target
        li.classList.toggle("droptarget", event.type === "dragenter");
    }
    // @override - Do checks and send data to be processed
    _onDrop(event) {
        // Initialise
        const cls = this.constructor.entity;
        // Try to extract the data
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }
        // Check data
        let correctType = (data.type === cls);
        if (!correctType) { return false; }
        // Call the drop handler
        this._handleDropData(event, data);
    }
    // @override - Handle data that's been dropped on panel
    _handleDropData(event, data) {
        // Determine the drop target
        const collection = this.constructor.collection;
        const sel = this._dragDrop[0].dragSelector;
        const dt = event.target.closest(sel) || null;
        const isFolder = dt && dt.classList.contains("folder");
        const targetId = dt ? (isFolder ? dt.dataset.folderId : dt.dataset.entityId) : 0;
        // Determine the closest folder ID
        const closestFolder = dt ? dt.closest(".folder") : 0;
        if (closestFolder) { closestFolder.classList.remove("droptarget"); }
        const closestFolderId = closestFolder ? closestFolder.dataset.folderId : 0;
        // Move the entity
        const entity = collection.get(data.id);
        const isEntity = dt && dt.classList.contains("entity");
        // Handle different targets
        const targetData = {};
        // Drop on an Entity
        if (isEntity) {
            targetData.target = collection.get(targetId);
            targetData.folderId = targetData.target.data.z;
        }
        // Drop on a Folder or null
        else {
            targetData.target = null;
            targetData.folderId = closestFolderId;
        }
        // Convert data for zIndex folders
        targetData.folderId = isNaN(Number(targetData.folderId)) ? 
                                targetData.folderId : Number(targetData.folderId);
        // Determine Entity update data
        const updateData = {
            z: targetData.folderId,
        }
        // Update the Entity
        entity.update(updateData);
    }
    // ┌─────────────────────────────────┐
    // │  #Events - Tool Event Handlers  │
    // ╘═════════════════════════════════╛
    // _onClickTool() - Called when clicking on a tool in the layers-panel
    _onClickTool(event) {
        // Initialise
        const html = this.element;
        const element = event.currentTarget;
        const tool = element.dataset.tool;
        const tools = element.closest(".layer-tools");
        // If tool is currently active, disable it
        if (element.classList.contains("active")) {
            // Remove active class
            element.classList.remove("active");
            // Disable active tool
            this.tool = false;
        }
        // Otherwise, activating new tool
        else {
            // Clear existing active tool
            tools.querySelectorAll(".active").forEach((el) => {
                el.classList.remove("active");
            });
            // Add active class
            element.classList.add("active");
            // Activate tool
            this.tool = tool;
        }
        // Return
        return
    }
    // _onKeyDown() - Called when a keyboard key is pressed
    _onKeyDown(event) {
        // Initialise
        const key = game.keyboard.getKey(event);
        // Do stuff

        // Return
        return
    }
    // ┌──────────────────────────────────────┐
    // │  #Events - QuickEdit Event Handlers  │
    // ╘══════════════════════════════════════╛
    // _onQuickEditKeyPress() - Called when keys are pressed in quick-edit input box
    _onQuickEditKeyPress(event) {
        // Initialise
        const html = this.element;
        const element = event.currentTarget;
        const inputGroup = element.closest(".input-group");
        const entityId = element.closest(".quick-edit-entity").dataset.entityId;
        const entity = canvas.drawings.placeables.find(e => e.data._id == entityId);
        // Keys to handle
        const keyList = {
               "ArrowUp": {name:   "ArrowUp", value: -1, axis: "y"},
             "ArrowDown": {name: "ArrowDown", value:  1, axis: "y"},
             "ArrowLeft": {name: "ArrowLeft", value: -1, axis: "x"},
            "ArrowRight": {name:"ArrowRight", value:  1, axis: "x"},
        }
        const targetKey = keyList[event.key]; //Match event-key to list above
        // If keypress isn't on white-list, do nothing
        if (!targetKey) return;
        // Otherwise, handle inputs
        event.preventDefault(); //Block default input
        // Find element to apply value change to
        let targetElement = element; //Default
        // If element has an axis, find its the correct input of the pair
        if (targetElement.dataset.inputAxis) {
            targetElement = inputGroup.querySelector(`[data-input-axis=${targetKey.axis}]`);
        }
        // Calculate how much to change the value by
        let valueModifier = keyList[event.key].value;
        let gridSize = canvas.dimensions.size;
        // Apply modifiers
        if (event.ctrlKey)       { valueModifier *= gridSize * 0.25 }
        else if (event.shiftKey) { valueModifier *= gridSize * 1.00 }
        else if (event.altKey)   { valueModifier *= 1 }
        else                    { valueModifier *= gridSize * 0.10 }
        // Apply value change to HTML element
        let targetValue = entity.data[targetElement.name];
        targetValue = Number(targetValue) + Number(valueModifier);
        targetElement.value = targetValue;
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // _onQuickEditChange() - Called when quick-edit box changes
    _onQuickEditChange(event) {
        // Initialise
        const html = this.element;
        const element = event.currentTarget;
        const inputGroup = element.closest(".input-group");
        const entityId = element.closest(".quick-edit-entity").dataset.entityId;
        const entity = canvas.drawings.placeables.find(e => e.data._id == entityId);
        // Update entity based on value from element value change
        const data = {};
        data[element.name] = Number(element.value) || element.value;
        entity.update(data);
    }
};
