// ┌─────────────────────────┐
// │  #Init - Initial Setup  │
// ╘═════════════════════════╛
const module = "layers-panel";
// ┌──────────────────────────────────┐
// │  #Hooks - Global Event Handlers  │
// ╘══════════════════════════════════╛
// When game initialises
Hooks.once("ready", () => {
    // Create UI class to be rendered
    ui.layersPanel = new LayersPanel;
    console.log(`${module} | Layers-Panel Loaded.`);
});
// When foundry requests a list of controls in top-left
Hooks.on("getSceneControlButtons", (controls) => {
    // If canvas hasn't rendered yet, wait and then add button
    if (!canvas) {
        Hooks.once("canvasReady", () => {
            addLayersPanelButton(controls);
        });
    }
    // Otherwise, just add the button
    else {
        addLayersPanelButton(controls);
    }
});
// ┌─────────────────────────────┐
// │  #Events - Event Functions  │
// ╘═════════════════════════════╛
// For adding the layers-panel button to a list of controls
function addLayersPanelButton(controls) {
    // If active control isn't the drawing menu
    if (ui?.controls?.activeControl !== "drawings") {
        // If panel is open, close it
        if (ui?.layersPanel?.rendered) { ui.layersPanel.close(); }
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
            filters: [{inputSelector: "input[name='search']", contentSelector: ".directory-list"}],
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
    // @override - collection - The currently active layer the entities are on
    static get collection() {
        return canvas.activeLayer;
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
        // Tools
        this.tools = game.settings.get(module, "tools");
        // Return
        return {
            user: game.user,
            tree: this.tree,
            selected: this.selected,
            tools: this.tools,
            activeTool: this.activeTool,
        }
    }
    // getEntities() - Get placeable entities and extra display data
    getEntities() {
        // Get base data
        const entities = canvas.activeLayer.placeables.filter(e => e.visible);
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
        if (entity.isTiled) { panel.type = "i" };
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
        const folders = {};
        for (const entity of entities) {
            // If zIndex folder has been made already, skip it
            if (folders.hasOwnProperty(entity.data.z)) { continue; }
            // Debugging
            console.log("Entity:", this.folders?.[entity.data.z]);
            // Make zIndex folder
            folders[entity.data.z] = {
                id: entity.data.z, _id: entity.data.z,
                visible: true,
                children: [],
                content: [],
                expanded: this.folders?.[entity.data.z]?.expanded ?? false,
                data: {
                    _id: entity.data.z,
                    id: entity.data.z,
                    name: entity.data.z,
                    type: "Layer",
                    z: entity.data.z,
                    sort: entity.data.z,
                    color: "#333",
                },
            };
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
            const folder = folders[entity.data.z];
            // Place entity into folder
            folder.content.push(entity);
            // Mark folder as being expanded if an entity is selected
            if(entity._controlled == true) { folder.expanded = true; }
        }
        // Sort folders
        folders = Object.values(folders).sort((a, b) => b.data.sort - a.data.sort); //Numerical Desc
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
        // FoundryVTT hooks
        this._canvasReady = this._canvasReady ||
                            Hooks.on("canvasReady", (canvas) => {
            this.refresh(); //Refresh panel
            this._collapseFolders(true); //Collapse folders
        });
        this._updateDrawing = this._updateDrawing ||
                              Hooks.on("updateDrawing", this.refresh.bind(this));
        this._controlDrawing = this._controlDrawing ||
                               Hooks.on("controlDrawing", this.refresh.bind(this));
        // Header section events
        header.find(".collapse-all").click(this._collapseFolders.bind(this));
        header.find(".layer-tools").on("click", ".layer-tool", this._onClickTool.bind(this));
        // Directory section events
        directory.on("click", ".folder-header", this._toggleFolder.bind(this));
        directory.on("click", ".entity-name", this._onClickEntityName.bind(this));
        directory.on("dblclick", ".entity-name", this._onClickEntityName.bind(this));
        directory.on("mouseenter", ".entity", this._onMouseOverEntity.bind(this));
        directory.on("mouseleave", ".entity", this._onMouseLeaveEntity.bind(this));
        directory.on("click", ".entity-locked", this._onClickEntityLocked.bind(this));
        this._contextMenu(html);
        // Directory drag events
        const dh = this._onDragHighlight.bind(this);
        directory.find(".folder").on("dragenter", dh).on("dragleave", dh);
        // Footer section events
        footer.on("change", ":input", this._onQuickEditChange.bind(this));
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
        // Clear event-listeners
        document.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
        // Clear tool
        this.activeTool = false;
        // Call default close function
        return super.close(options);
    }
    // Refresh the panel
    refresh(options={}) {
        // Initialise
        const bufferPeriod = options.bufferPeriod ?? 50;
        // Reset existing timer
        clearTimeout(this._refreshTimer);
        // Start new timer to buffer against repeated refreshes
        this._refreshTimer = setTimeout(() => {
            // Refresh panel
            this.render(false, options); 
        }, bufferPeriod);
        // Return
        return this;
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
        const element = event.currentTarget;
        const folder = element.closest(".folder");
        const folderId = folder.dataset.folderId;
        const isCollapsed = folder.classList.contains("collapsed");
        // If currently collapsed, open it
        if (isCollapsed) { 
            folder.classList.remove("collapsed");
            this.folders[folderId].expanded = true;
        }
        // Otherwise, it's not collapsed, collapse it
        else {
            folder.classList.add("collapsed");
            this.folders[folderId].expanded = false;
            const subFolders = folder.querySelectorAll('.folder');
            subFolders.forEach(subFolder => {
                subFolder.classList.add("collapsed");
                this.folders[subFolder.dataset.folderId].expanded = false;
            });
        }
        // Record container position
        if (this.popOut) this.setPosition();
    }
    // _onClickEntityName() - Handle clicking on an Entity name in the Sidebar directory
    _onClickEntityName(event) {
        // Initialise
        event.preventDefault();
        const element = event.currentTarget;
        const entityId = element.closest(".entity").dataset.entityId;
        const entity = this.entities.find(e => e.id == entityId);
        const sheet = entity.sheet;
        // Switch to selection tool, to allow selection change
        const selectTool = document.querySelector(`#controls .scene-control.active 
                                                   .control-tool[data-tool=select]`);
        if (!selectTool.classList.contains("active")) { selectTool.click(); }
        // If single-click
        if (event.type == "click") {
            // If ctrl pressed down, allow multiple selections
            if (event.ctrlKey == true) {
                // If entity is already selected, remove from selection group
                if (entity._controlled == true) {
                    entity.release();
                }
                // Otherwise, add to selection group
                else {
                    entity.control({releaseOthers: false}); //Don't deselect other entities
                }
            }
            // If shift pressed down, group select
            else if (event.shiftKey == true) {
                // If nothing else is selected, normal selection
                if (canvas.activeLayer.controlled.length == 0) {
                    entity.control();
                }
                // If entity is already selected, remove from selection group
                else if (entity._controlled == true) {
                    entity.release();
                }
                // Otherwise, find all entities between, and add to selection group
                else {
                    // Initialise
                    const directory = element.closest(".directory-list");
                    const allEntries = directory.querySelectorAll(".entity");
                    const controlled = canvas.activeLayer._controlled;
                    const lastEntity = controlled[Object.keys(controlled)[Object.keys(controlled).length-1]];
                    // Find start/end
                    let startPoint = Array.prototype.findIndex.call(allEntries, el =>
                        el.dataset.entityId == entity.id);
                    let endPoint = Array.prototype.findIndex.call(allEntries, el =>
                        el.dataset.entityId == lastEntity.id);
                    // If start/end in wrong order, flip them
                    if (startPoint > endPoint) {
                        [startPoint, endPoint] = [endPoint, startPoint];
                    }
                    // Select all between points
                    for (const [index,el] of allEntries.entries()) {
                        // If before start, continue
                        if (index < startPoint) { continue; }
                        // If past end, break
                        if (index > endPoint) { break; }
                        // Otherwise, select it
                        let select = this.entities.find(e => e.id == el.dataset.entityId);
                        select.control({releaseOthers: false});
                    }
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
    // _onMouseOverEntity - Handle hovering of an entity and highlighting on canvas
    _onMouseOverEntity(event) {
        // Initialise
        const element = event.currentTarget;
        const entityId = element.closest(".entity").dataset.entityId;
        const entity = this.entities.find(e => e.id == entityId);
        // Debugging
        // console.log(`${module} | _onMouseOverEntity(): `, event, entity);
        // Prepare entity's filter array
        entity.children[0].filters = [];
        // Add filters to highlight element on canvas
        // Community filters: 
            // https://filters.pixijs.download/v4.1.0/demo/index.html
            // https://filters.pixijs.download/main/docs/index.html
        this.highlightFilters = this.highlightFilters || [
            // new PIXI.filters.ColorOverlayFilter(0xffffff, 0.25),
            new PIXI.filters.AdjustmentFilter({gamma: 2.0}),
            new PIXI.filters.GlowFilter({
                color: 0xffffff,
                quality: 0.2,
                distance: 2,
                outerStrength: 1.0,
                innerStrength: 1.0,
            }),
        ];
        entity.children[0].filters.push(...this.highlightFilters);
        // Return
    }
    // _onMouseLeaveEntity - Handle resetting highlight from mouseover
    _onMouseLeaveEntity(event) {
        // Initialise
        const element = event.currentTarget;
        const entityId = element.closest(".entity").dataset.entityId;
        const entity = this.entities.find(e => e.id == entityId);
        // Debugging
        // console.log(`${module} | _onMouseLeaveEntity: `, entity);
        // Remove highlight filter from element on canvas
        entity.children[0].filters = [];
        // Return
    }
    // _onClickEntityLocked() - Handle clicking on an Entity locked status
    _onClickEntityLocked(event) {
        // Initialise
        event.preventDefault();
        const element = event.currentTarget;
        const entityId = element.closest(".entity").dataset.entityId;
        const entity = this.entities.find(e => e.id == entityId);
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
        // Initialise
        const html = this.element;
        // If any folders are open, or force collapsing, collapse everything
        if (html.find(".folder").not(".collapsed").length !== 0
            || collapse == true) {
                html.find('.folder').addClass("collapsed");
        }
        // Otherwise, if everything is collapsed, open everything
        else {
            html.find(".folder").removeClass("collapsed");
        }
        // Return
        return
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
                    canvas.activeLayer.releaseAll();
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
    _onSearchFilter(event, query, regex, html) {
        // Initialise
        const isSearch = !!query;
        let entityIds = new Set();
        let folderIds = new Set();
        // Match entities and folders
        if (isSearch) {
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
                if (isSearch && match) { el.classList.remove("collapsed"); }
                else { el.classList.toggle("collapsed", !this.folders?.[el.dataset.folderId]?.expanded); }
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
            data = JSON.parse(event.dataTransfer.getData("text/plain"));
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
        const toolName = element.dataset.tool;
        const toolPanel = element.closest(".layer-tools");
        const tools = game.settings.get(module, "tools");
        // If tool is currently active, disable it
        if (element.classList.contains("active")) {
            // Remove active class
            element.classList.remove("active");
            // Disable active tool
            this.activeTool = false;
        }
        // Otherwise, activating new tool
        else {
            // Clear existing active tool
            toolPanel.querySelectorAll(".active").forEach((el) => {
                el.classList.remove("active");
            });
            // Add active class
            element.classList.add("active");
            // Record active tool
            this.activeTool = tools.find(tool => tool.name == toolName);
        }
        // Refresh panel
        this.render();
        // Return
        return
    }
    // ┌─────────────────────────────┐
    // │  #Events - Keyboard Events  │
    // ╘═════════════════════════════╛
    // _onKeyDown() - Called when a keyboard key is pressed
    _onKeyDown(event) {
        // Initialise
        const html = this.element;
        const key = game.keyboard.getKey(event);
        const toolPanel = html.find(".layer-tools");
        const tools = game.settings.get(module, "tools");
        // Ignore keypress checks
        if (game.keyboard.hasFocus) { return; } //If input-element has focus
        if (event.repeat) { return; } //If repeat-trigger (i.e. key held down)
        // If hotkey is a tool-hotkey, toggle that tool
        const toolHotkey = tools.find(tool => tool.hotkey == key);
        if (toolHotkey &&
            !event.ctrlKey && !event.metaKey &&
            !event.altKey && !event.shiftKey) { 
            event.preventDefault();
            const element = toolPanel.find(`.layer-tool[data-tool="${toolHotkey.name}"]`).click();
            return;
        }
        // If there's an active tool, and it's a direction press, adjust property
        if (this.activeTool && 
            key in game.keyboard.moveKeys) {
            event.preventDefault();
            this._onDirectionDown(event);
            return;
        }
        // Return
        return;
    }
    _onDirectionDown(event) {
        // Initialise
        const html = this.element;
        const key = game.keyboard.getKey(event);
        const activeTool = this.activeTool;
        const directions = game.keyboard.moveKeys[key];
        // Retrieve tool's adjustent amounts
        let baseChange = activeTool.changeValues[0] || 1;
        if (event.shiftKey) {
            baseChange = activeTool.changeValues[1] || 10;
        }
        // Note: Ctrl Key is used for canvas panning, avoid using?
        // else if (event.ctrlKey || event.metaKey) {
        //     baseChange = activeTool.changeValues[2] || 100;
        // }
        else if (event.altKey) {
            baseChange = activeTool.changeValues[3] || 0.1;
        }
        // For each direction pressed, calculate change values
        let changeValues = [0,0];
        for (const direction of directions) {
            if (direction == "up") {
                changeValues[1] = baseChange;
            }
            else if (direction == "down") {
                changeValues[1] = baseChange * -1;
            }
            else if (direction == "left") {
                changeValues[0] = baseChange * -1;
            }
            else if (direction == "right") {
                changeValues[0] = baseChange;
            }
        }
        // Correct the change values depending on specific conditions
        // If there's only 1 field, preferentially use up/down values, then left/right
        if (activeTool.fields.length == 1) {
            changeValues = [changeValues[1] || changeValues[0]];
        }
        // If there's 2 fields (e.g. position or size), invert the up/down values
        // (Since they're calculating from top-left downwards)
        if (activeTool.fields.length == 2) {
            changeValues[1] *= -1;
        }
        // For each selected entity, prepare update values
        const updates = canvas.activeLayer.controlled.map(entity => {
            // Prepare update entry
            const updateEntry = {_id: entity.id};
            // For each data field, get existing entity's value, and add to it
            for (const [index, field] of activeTool.fields.entries()) {
                updateEntry[field] = entity.data[field] + changeValues[index];
            }
            return updateEntry;
        });
        // Process all the updates to entities
        canvas.activeLayer.updateMany(updates);
        // Return
        return;
    }
    // ┌──────────────────────────────────────┐
    // │  #Events - QuickEdit Event Handlers  │
    // ╘══════════════════════════════════════╛
    // _onQuickEditChange() - Called when quick-edit box changes
    _onQuickEditChange(event) {
        // Initialise
        const html = this.element;
        const element = event.currentTarget;
        const inputGroup = element.closest(".input-group");
        const entityId = element.closest(".quick-edit-entity").dataset.entityId;
        const entity = canvas.activeLayer.placeables.find(e => e.data._id == entityId);
        // Update entity based on value from element value change
        const data = {};
        data[element.name] = Number(element.value) || element.value;
        entity.update(data);
    }
};
