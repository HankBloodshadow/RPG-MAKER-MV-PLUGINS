/*:
 * @plugindesc Fully dynamic key-action mapping plugin using numeric keycodes. Users can add custom mappings via Plugin Manager. 
 * @author Hank_Bloodshadow
 *
 * @param Key Mappings
 * @text Key Mappings
 * @desc Comma-separated list of action:keyCode. Example: ok:90,cancel:88,attack:65,jump:32
 * @default ok:90,cancel:88,shift:16,escape:27,menu:13,tab:9,debug:120,control:17,pageup:33,pagedown:34,up:38,down:40,left:37,right:39
 *
 * @help
 * Format:
 *   action:keyCode,action:keyCode,...
 *
 * Examples:
 *   ok:90,cancel:88,attack:65,jump:32
 *   dash:16,slide:67
 *
 * Usage:
 *   if (Input.isPressed('ok')) { ... }
 *   if (Input.isPressed('attack')) { ... }
 *   if (Input.isPressed('jump')) { ... }
 *
 * Notes:
 *   - Key codes are numeric (see standard keycode charts for reference). - One is included at the github. along with another that details RPG Maker default Action names.
 *   - Invalid entries will be logged to the console with a warning.
 */

(function() {

    var parameters = PluginManager.parameters('KeyboardInputRemapper');
    var mappingList = (parameters['Key Mappings'] || '').split(',');

    // Overwrite Input.keyMapper
    Input.keyMapper = {};

    mappingList.forEach(function(entry) {
        var parts = entry.split(':');
        if (parts.length === 2) {
            var action = parts[0].trim();
            var code = parseInt(parts[1].trim());
            if (!isNaN(code) && action) {
                Input.keyMapper[code] = action;
            } else {
                console.warn('[KeyMapper] Invalid key mapping entry (ignored):', entry);
            }
        } else {
            console.warn('[KeyMapper] Invalid key mapping entry (ignored):', entry);
        }
    });

    console.log('[KeyMapper] Loaded mappings:', Input.keyMapper);

})();