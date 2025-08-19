/*:
 * @target MV
 * @plugindesc Adds analog stick support for player movement (with toggle, plugin commands, and dev logging). 
 * @author Hank_Bloodshadow
 *
 * @param Enable Analog
 * @type boolean
 * @on Enabled
 * @off Disabled
 * @default true
 * @desc Master switch to enable or disable analog stick movement at game start.
 *
 * @param Deadzone
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.3
 * @desc Stick sensitivity. Values below this are ignored (prevents drift).
 *
 * @param Stick
 * @type select
 * @option Left Stick
 * @value left
 * @option Right Stick
 * @value right
 * @default left
 * @desc Which stick to use for movement.
 *
 * @help
 * Plugin adds analog stick movement support.
 * - Left/Right stick selectable
 * - Adjustable deadzone
 * - Works alongside D-Pad & keyboard
 * - Failsafe if no gamepad
 * - Plugin Manager toggle
 * - Plugin commands to enable/disable analog in-game
 * - Development console logs during playtest
 *
 * Plugin Commands:
 *   AnalogEnable      # Enables analog stick movement
 *   AnalogDisable     # Disables analog stick movement
 */

(() => {
    const parameters = PluginManager.parameters('AnalogStickMovement');
    let enableAnalog = parameters['Enable Analog'] === 'true';
    const deadzone = Number(parameters['Deadzone'] || 0.3);
    const stick = String(parameters['Stick'] || 'left');

    const isDev = Utils.isOptionValid('test'); // true if running in editor/playtest

    // Plugin commands
    const alias_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        alias_pluginCommand.call(this, command, args);
        if (command === 'AnalogEnable') {
            enableAnalog = true;
            if (isDev) console.log('[AnalogStick] Enabled via plugin command');
        } else if (command === 'AnalogDisable') {
            enableAnalog = false;
            if (isDev) console.log('[AnalogStick] Disabled via plugin command');
        }
    };

    const alias_updateGamepadState = Input._updateGamepadState;
    Input._updateGamepadState = function(gamepad) {
        alias_updateGamepadState.call(this, gamepad);

        if (!enableAnalog) return;
        if (!gamepad || !gamepad.connected) return;

        // Read stick axes
        let x, y;
        if (stick === 'left') {
            x = gamepad.axes[0];
            y = gamepad.axes[1];
        } else {
            x = gamepad.axes[2];
            y = gamepad.axes[3];
        }

        // Deadzone & mapping
        let moved = false;

        if (x < -deadzone) {
            this._currentState['left'] = true; moved = true;
        } else if (x > deadzone) {
            this._currentState['right'] = true; moved = true;
        }

        if (y < -deadzone) {
            this._currentState['up'] = true; moved = true;
        } else if (y > deadzone) {
            this._currentState['down'] = true; moved = true;
        }

        // Dev log
        if (isDev && moved) {
            console.log(`[AnalogStick] ${stick} stick active | X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}`);
        }
    };
})();