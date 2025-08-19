/*:
 * @plugindesc Check if the game is in battle and set a switch for conditional branches (debug logs in console only). 
 *
 * @help
 * This plugin allows you to check whether you are in battle or not within conditional branches.
 *
 * Parameters:
 *   BattleSwitchId - The switch that will be set true if in battle, false if not.
 *
 * Plugin Command:
 *   CheckBattle
 *     - Sets the Battle Switch ON if in battle, OFF otherwise.
 */

(function() {
    var parameters = PluginManager.parameters('CheckBattleStatus');
    var battleSwitchId = Number(parameters['BattleSwitchId'] || 1);
    var isDev = Utils.isOptionValid('test'); // true in playtest

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === "CheckBattle") {
            var inBattle = $gameParty.inBattle();
            $gameSwitches.setValue(battleSwitchId, inBattle);

            if (isDev) {
                var msg = inBattle ? "We are currently in battle!" : "We are NOT in battle.";
                console.log(msg);  // debug only in console
            }
        }
    };
})();