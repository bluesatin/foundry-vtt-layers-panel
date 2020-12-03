// ┌───────────────────────────────────┐
// │  #Events - Global Event Handlers  │
// ╘═══════════════════════════════════╛
// When game initialises
Hooks.once("init", () => {
    // Create UI class to be rendered
    ui.layersPanel = new LayersPanel;
    console.log("layers-panel | Module Loaded.");
});
// When foundry requests a list of controls in top-left
Hooks.on("getSceneControlButtons", (controls) => {
    // If active control isn't the drawing menu
    if (ui.controls?.activeControl !== "drawings") {
        // If panel is open, close it
        if(ui.layersPanel.rendered) {
            ui.layersPanel.close();
        }
        // Do nothing else
        return;
    }
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
});
// When scene changes and canvas re-renders
Hooks.on("canvasReady", (canvas) => {
    // If panel is open
    if(ui.layersPanel.rendered) {
        ui.layersPanel.render(); //Refresh panel
        ui.layersPanel._collapseFolders(true); //Collapse folders
    }
});
// When entity within scene gets updated
Hooks.on("updateDrawing", (scene, entity, changes, diff) => {
    // If panel is open
    if(ui.layersPanel.rendered) {
        ui.layersPanel.render(); //Refresh panel
    }
});
// When entity selection within scene changes
Hooks.on("controlDrawing", (entity, changes) => {
    // If panel is open
    if(ui.layersPanel.rendered) {
        // ui.layersPanel.render(); //Refresh panel
        ui.layersPanel._onSelectionChange(entity);
    }
});
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
            width: 250,
            filters: [{inputSelector: 'input[name="search"]', contentSelector: ".directory-list"}],
        })
    }
    // ┌──────────────────────────┐
    // │  #Data - Data Retrieval  │
    // ╘══════════════════════════╛
    // @override - getData() - Get data for the application to use/render in template
    getData(options) {
        // Assign Entities
        this.entities = this.getEntities();
        // Assign Folders
        this.folders = this.getFolders();
        // Build Tree
        this.tree = this.getTree(this.folders, this.entities);
        // Return
        return {
            user: game.user,
            tree: this.tree,
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
        if(entity.isTiled) panel.type = "i";
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
            if(tracker.has(entity.data.z)) {
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
        // Initialise
        entities = entities.filter(a => a.visible); //Only use folders marked as visible
        entities.reverse(); //Reverse order to reflect rendering order
        // Place entities into the folders
        for(const entity of entities) {
            folders.find(folder => folder.data.z == entity.data.z).content.push(entity);
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
        const directory = html.find(".directory-list");
        const entries = directory.find(".directory-item");
        // Directory-level events
        html.find('.collapse-all').click(this._collapseFolders.bind(this));
        // Entry-level events
        directory.on("click", ".folder-header", this._toggleFolder.bind(this));
        directory.on("click", ".entity-name", this._onClickEntityName.bind(this));
        directory.on("dblclick", ".entity-name", this._onClickEntityName.bind(this));
        this._contextMenu(html);
    }
    // open() - Open the panel
    open(options) {
        // If panel is already open, bring it up
        if(this.rendered) {
            this.maximize();
            this.bringToTop();
        }
        // Otherwise, open the panel
        else {
            this.render(true);
        }
    }
    // _onSelectionChange() - Called when entity selection changes
    _onSelectionChange(entity) {
        // Initialise
        const html = this.element;
        const entityId = entity.id;
        const selected = entity._controlled;
        // If panel isn't being rendered, do nothing
        if(this.rendered == false) return;
        // Otherwise, adjust selected class
        const element = html.find(`li.entity[data-entity-id="${entity.id}"]`);
        // If entity is being selected
        if(selected) {
            element.addClass("selected");
        }
        // Otherwise, deselection
        else {
            element.removeClass("selected");
        }
    }
    // _toggleFolder() - Handle toggling the collapsed or expanded state of a folder
    _toggleFolder(event) {
        // Initialise
        let folder = $(event.currentTarget.parentElement);
        let collapsed = folder.hasClass("collapsed");
        game.folders._expanded[folder.attr("data-folder-id")] = collapsed;
        // Expand
        if(collapsed) {
            folder.removeClass("collapsed");
        }
        // Collapse
        else {
          folder.addClass("collapsed");
          const subs = folder.find('.folder').addClass("collapsed");
          subs.each((i, f) => game.folders._expanded[f.dataset.folderId] = false);
        }
        // Record container position
        if(this.popOut) this.setPosition();
    }
    // _onClickEntityName() - Handle clicking on an Entity name in the Sidebar directory
    _onClickEntityName(event) {
        // Initialise
        event.preventDefault();
        const element = event.currentTarget;
        const entityId = element.parentElement.dataset.entityId;
        const entity = this.entities.find(e => e.id == entityId);
        const sheet = entity.sheet;
        // If single-click
        if(event.type == "click") {
            // If ctrl pressed down, allow multiple selections
            if(event.ctrlKey == true || event.shiftKey == true) {
                // If entity is already selected, deselect it
                if(entity._controlled == true) {
                    entity.release();
                }
                // Otherwise, add to selection
                else {
                    entity.control({releaseOthers: false});
                }
            }
            // Otherwise, normal selection
            else {
                entity.control(); //Select the entity on canvas
            }
        }
        // If it was a double-click, open drawing configuration
        else if(event.type == "dblclick") {
            // If the sheet is already rendered
            if(sheet.rendered) {
                sheet.maximize();
                sheet.bringToTop();
            }
            // Otherwise, render the sheet
            else {
                sheet.render(true);
            }
        }
    }
    // collapseFolders() - Folder collapse toggle functionality
    _collapseFolders(collapse) {
        // Initialize
        let foldersOpen = true;
        // Check if all folders are collapsed
        if(this.element.find('li.folder').not(".collapsed").length === 0) {
            foldersOpen = false;
        }
        // If any folders are open, collapse everything
        if(foldersOpen || collapse == true) {
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
        if(this.popOut) this.setPosition();
    }
    // _contextMenu() - Context-menu handler when right-clicking something
    _contextMenu(html) {
        // Folder Context
        const folderOptions = this._getFolderContextOptions();
        Hooks.call(`get${this.constructor.name}FolderContext`, html, folderOptions);
        if(folderOptions) new ContextMenu(html, ".folder .folder-header", folderOptions);
        // Entity Context
        const entryOptions = this._getEntryContextOptions();
        Hooks.call(`get${this.constructor.name}EntryContext`, html, entryOptions);
        if(entryOptions) new ContextMenu(html, ".entity", entryOptions);
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
                    if(sheet.rendered) {
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
        if(isSearch) {
            const regex = new RegExp(RegExp.escape(query), "i");
            // Match entity names
            for(let e of this.entities) {
                if(regex.test(e.data.panel.name)) {
                    // Add entity to entity-match set
                    entityIds.add(e.id);
                    entityIds.add(e.id.toString()); //dataset API uses strings
                    // Add parent folder to folder-match set
                    if(e.data.folder) {
                        folderIds.add(e.data.folder);
                        folderIds.add(e.data.folder.toString()); //dataset API uses strings
                    }
                }
            }
        }
        // Toggle each directory item
        for(let el of html.querySelectorAll(".directory-item")) {
            // If an entity
            if(el.classList.contains("entity")) {
                el.style.display = (!isSearch || entityIds.has(el.dataset.entityId)) ? "flex" : "none";
            }
            // If a folder
            if(el.classList.contains("folder")) {
                let match = isSearch && folderIds.has(el.dataset.folderId);
                el.style.display = (!isSearch || match) ? "flex" : "none";
                if (isSearch && match) el.classList.remove("collapsed");
                else el.classList.toggle("collapsed", !game.folders._expanded[el.dataset.folderId]);
            }
        }
    }
};