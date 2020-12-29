// ┌───────────────────────────────────┐
// │  #Events - Global Event Handlers  │
// ╘═══════════════════════════════════╛
// When foundry requests a list of controls in top-left
Hooks.on("getSceneControlButtons", (controls) => {
    // If active control isn't the drawing menu, do nothing
    if (ui.controls?.activeControl !== "drawings") { return; }
    // If setting is enabled, remove the 'Clear Drawings' tool button
    if(game.settings.get("layers-panel","hideClearAllButton")) {
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