/*:
 * @plugindesc Dynamic gamepad-action mapping plugin. Users can assign button IDs to actions via Plugin Manager. 
 * @author Hank_Bloodshadow
 *
 * @param Gamepad Mappings
 * @text Gamepad Mappings
 * @desc Comma-separated list of action:buttonID. Example: ok:0,cancel:1,attack:2,jump:3
 * @default ok:0,cancel:1,shift:4,escape:6,menu:7,debug:8,pageup:10,pagedown:11,up:12,down:13,left:14,right:15
 *
 * @help
 * Format:
 *   action:buttonID,action:buttonID,...
 *
 * Usage:
 *   if (Input.isPressed('ok')) { ... }
 *   if (Input.isPressed('attack')) { ... }
 *
 * Notes:
 *   - buttonID is numeric (0–15) corresponding to standard gamepad buttons.
 *   - Invalid entries will be logged to the console.
 */

(function() {

    var parameters = PluginManager.parameters('GamepadInputRemapper');
    var mappingList = (parameters['Gamepad Mappings'] || '').split(',');

    // Overwrite gamepadMapper
    Input.gamepadMapper = {};

    mappingList.forEach(function(entry) {
        var parts = entry.split(':');
        if (parts.length === 2) {
            var action = parts[0].trim();
            var button = parseInt(parts[1].trim());
            if (!isNaN(button) && action) {
                Input.gamepadMapper[button] = action;
            } else {
                console.warn('[GamepadMapper] Invalid mapping entry (ignored):', entry);
            }
        } else {
            console.warn('[GamepadMapper] Invalid mapping entry (ignored):', entry);
        }
    });

    console.log('[GamepadMapper] Loaded mappings:', Input.gamepadMapper);

})();