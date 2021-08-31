// ┌─────────────────────────┐
// │  #Init - Initial Setup  │
// ╘═════════════════════════╛
const module = "layers-panel";
// ┌───────────────────────────────────┐
// │  #Events - Global Event Handlers  │
// ╘═══════════════════════════════════╛
// When game is initialised
Hooks.once("init", () => {
    // Register module settings
    registerSettings();
    // Call hook for other things to happen
    Hooks.callAll(`${module}-settings`);
    console.log(`${module} | Settings Registered.`);
});
// ┌────────────────────────────────────────┐
// │  #Settings - Register Module Settings  │
// ╘════════════════════════════════════════╛
// For registering module settings
function registerSettings() {
    // Setting - Show 'Layers-Panel' Button
    game.settings.register(module, "showLayersPanelButton", {
        // Display
        name: "Enable the 'Layers Panel' tool",
        hint: "Enables the layers-panel tool in the drawing tools.",
        // General
        scope: "world", //World (Global GM setting) or Client (Player setting)?
        config: true, //Show in the module config menu?
        // Data
        type: Boolean,
        default: true,
    });
    // Setting - Show 'file-browser' Button
    game.settings.register(module, "showFileBrowserButton", {
        // Display
        name: "Enable the 'File Browser' tool",
        hint: "Enables the drag-and-drop file-browser tool in the drawing tools.",
        // General
        scope: "world", //World (Global GM setting) or Client (Player setting)?
        config: true, //Show in the module config menu?
        // Data
        type: Boolean,
        default: true,
    });
    // Setting - Hide 'Clear All Drawings' Button
    game.settings.register(module, "hideClearAllButton", {
        // Display
        name: "Disable the default 'Clear All Drawings' button",
        hint: "Hides the default 'Clear All Drawings' button in the drawing tools.",
        // General
        scope: "world", //World (Global GM setting) or Client (Player setting)?
        config: true, //Show in the module config menu?
        // Data
        type: Boolean,
        default: true,
    });
    // Setting - Make locked objects non-interactable
    game.settings.register(module, "makeLockedNonInteractable", {
        // Display
        name: "Enable clicking through locked objects",
        hint: "Makes locked objects non-interactable so that you can click through them.",
        // General
        scope: "world", //World (Global GM setting) or Client (Player setting)?
        config: true, //Show in the module config menu?
        // Data
        type: Boolean,
        default: true,
    });
    // Setting - Switch rendering order of Drawings and Background Tiles
    game.settings.register(module, "switchDrawingsTilesOrder", {
        // Display
        name: "Switch rendering order of Drawings and Background Tiles",
        hint: "Switches order of drawings and background tiles, so tiles are above drawings (Requires Refresh).",
        // General
        scope: "world", //World (Global GM setting) or Client (Player setting)?
        config: true, //Show in the module config menu?
        // Data
        type: Boolean,
        default: false,
    });
    // Setting - Tools, and their related properties/hotkeys
    game.settings.register(module, "tools", {
        // Display
        name: "Layer-Panel tools",
        hint: "Tools available in the Layer-Panel and their related properties/hotkeys.",
        // General
        scope: "world", //World (Global GM setting) or Client (Player setting)?
        config: false, //Show in the module config menu?
        // Data
        type: Object,
        default: [
            {
                name: "move",
                label: "Move with Arrowkeys",
                property: "position",
                fields: ["x","y"],
                changeValues: [10, 100, 500, 1],
                icon: "fas fa-arrows-alt",
                hotkey: "v",
            },
            {
                name: "rotate",
                label: "Rotate with Arrowkeys",
                property: "rotation",
                fields: ["rotation"],
                changeValues: [5, 15, 90, 1],
                icon: "fas fa-sync-alt",
                hotkey: "r",
            },
            {
                name: "resize",
                label: "Resize with Arrowkeys",
                property: "size",
                fields: ["width", "height"],
                changeValues: [10, 100, 500, 1],
                icon: "fas fa-vector-square",
                hotkey: "e",
            },
            {
                name: "zIndex",
                label: "Z-Index with Arrowkeys",
                property: "zIndex",
                fields: ["z"],
                changeValues: [1, 5, 50, 1],
                icon: "fas fa-layer-group",
                hotkey: "z",
            },
            {
                name: "opacity",
                label: "Opacity with Arrowkeys",
                property: "opacity",
                fields: {
                    "Drawing": "fillAlpha",
                    "Tile": "alpha",
                },
                changeValues: [0.05, 0.10, 0.25, 0.01],
                icon: "fas fa-adjust",
                hotkey: "t",
            },
        ],
    });
}
