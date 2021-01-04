// ┌───────────────────────────────────┐
// │  #Events - Global Event Handlers  │
// ╘═══════════════════════════════════╛
// When game is initialised
Hooks.once("init", () => {
	// Register module settings
	_registerSettings();
	console.log("layers-panel | Settings Registered.");
});
// ┌────────────────────────────────────────┐
// │  #Settings - Register Module Settings  │
// ╘════════════════════════════════════════╛
// For registering module settings
function _registerSettings() {
	// Setting - Show 'Layers-Panel' Button
	game.settings.register("layers-panel", "showLayersPanelButton", {
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
	game.settings.register("layers-panel", "showFileBrowserButton", {
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
	game.settings.register("layers-panel", "hideClearAllButton", {
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
}