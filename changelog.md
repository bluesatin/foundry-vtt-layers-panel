# Changelog

## Unreleased
Features being worked on.

### To-Do
+ Handle monkey-patching via Lib-Wrapper
+ ¿ Handle hotkeys via DF-Hotkeys ?
+ ¿ Create help window popup and add question-mark button in window title ?
+ Make data-handling more agnostic, so it can be used on every canvas-layer (e.g. tiles, lighting etc.)

-----

## [0.2.1] - 2021-08-25
Update/Fixes for 0.8.x

### Fixed
+ Fixed panel layout/styling issues
+ Fixed folder-collapsing on selection
+ Fixed drawing/tiles render order switching

## [0.2.0] - 2021-05-28
Big changes to workflow, and added a bunch of features/fixes.

### Added
+ Allow right-click canvas panning while over a selected object
+ Allow shift-click group selection in panel
+ Added ability to make locked objects uninteractive (i.e. you can click through them)
+ Added ability to quickly lock/unlock objects
+ Added highlighting effect to objects on the canvas, when hovering over an object in the panel
+ Added tool buttons + hotkeys, to change which property the arrow-keys adjust
+ Added option to switch rendering order of Drawings/Tiles, so tiles are above drawings

### Fixed
+ Fixed Layers-Panel possibly causing tool buttons in top-left to be disabled on first-load

## [0.1.6] - 2021-01-04
Layers-Panel drag-and-drop support, and some fixes.

### Added
+ Added ability to drag-and-drop objects in the layers-panel into different zIndex folders

### Fixed
+ Fixed drag-and-drop from file-browser due to removing the tileSize input
+ Fixed selection update delay in layers-panel due to using a local var

### Changed
+ Switched to using esmodules instead of scripts, to reduce incompatibility issues

## [0.1.5] - 2020-12-30
Some small adjustments and tweaks to clean things up a bit.

### Added
+ Basic module settings added to the module configuration area:
  - Enable/disable specific tools (layers-panel, file-browser)
  - Disable FoundryVTT's default 'Clear All Drawings' button
+ When selecting an object, it will now expand the parent folder in the layers-panel automatically (making it easier to find)

## [0.1.4] - 2020-12-17
Small fixes and adjustments to get module ready for official package submission to FoundryVTT.

### Added
+ Removed the default 'Clear Drawings' tool to stop accidental deletion of entire battle-maps

## [0.1.3] - 2020-12-14
Tiles-browser added.

### Added
+ Added a drag-and-drop tiles-browser to the drawing-tools

## [0.1.2] - 2020-12-14
Quick-edit box added.

### Added
+ Quick-edit box for selected objects
+ Quick-edit box arrow-key value changing (with ctrl+alt+shift modifiers)

### Fixed
+ Allow selection of objects when not using the selection tool, by switching to the selection tool

## [0.1.1] - 2020-12-03
Fixes for some small annoyances.

### Added
+ Layer highlight functionality

### Fixed
+ Stopped panel scrolling to top when object selection changes

## [0.1.0] - 2020-12-02
Initial release.

### Added
+ List of drawings, in z-level folders
+ Panel button, located in top-left drawing controls
+ Search drawings functionality
+ Click entry to select drawing on canvas
+ Double-click entry to edit drawing
+ Drawings context-menu
  - Locate and zoom-to drawing on canvas
  - Open drawing configuration sheet
+ Folders context-menu
  - Select all drawings in folder
