/*:
 * @plugindesc Allows changing the display name of maps via plugin commands. 
 * @author Hank_Bloodshadow
 *
 * @help
 * ============================================================================
 * Plugin Commands:
 * ============================================================================
 *
 *   ChangeMapName <mapId> <newName>
 *     - Changes the display name of the map with ID <mapId> to <newName>.
 *
 *   ClearMapName <mapId>
 *     - Clears the display name of the map with ID <mapId>.
 *
 * ============================================================================
 * Usage Example:
 * ============================================================================
 *   ChangeMapName 3 "Eldoria Town"
 *   ChangeMapName 5 "Ancient Cave"
 *   ClearMapName 5
 *
 * ============================================================================
 * Notes:
 * ============================================================================
 * - If you want to hide the map name until the player is told, leave it blank 
 *   in the editor, then use ChangeMapName when revealed.
 * - You can also dynamically change the *current* map name:
 *       ChangeMapName $gameMap.mapId() "My Current Map"
 * ============================================================================
 */

(function() {

    // Store custom names
    var customMapNames = {};

    // Override displayName
    var _Game_Map_displayName = Game_Map.prototype.displayName;
    Game_Map.prototype.displayName = function() {
        if (customMapNames[this.mapId()]) {
            return customMapNames[this.mapId()];
        }
        return _Game_Map_displayName.call(this);
    };

    // Plugin Commands
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === "ChangeMapName") {
            var mapId = Number(args[0]);
            var name = args.slice(1).join(" ").replace(/\"/g, ""); // allow spaces
            if (mapId > 0) {
                customMapNames[mapId] = name;
            }
        }

        if (command === "ClearMapName") {
            var mapId = Number(args[0]);
            if (mapId > 0 && customMapNames[mapId]) {
                delete customMapNames[mapId];
            }
        }
    };

})();