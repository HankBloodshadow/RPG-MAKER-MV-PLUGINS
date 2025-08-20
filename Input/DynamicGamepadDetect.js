/*:
 * @plugindesc Dynamically detects gamepad input after the game has launched, with optional dev console logs. 
 * @author Hank_Bloodshadow
 *
 * @param DevMode
 * @type boolean
 * @default true
 * @desc If true, logs gamepad connections and button presses/releases to console. Disable for production builds.
 *
 * @help
 * This plugin ensures that if a gamepad is plugged in after the game starts,
 * RPG Maker MV will detect it without needing a restart.
 *
 * Logs show both button ID and a human-readable name for common layouts.
 *
 * No plugin commands are needed.
 */

(function() {
    const parameters = PluginManager.parameters('DynamicGamepadDetect');
    const devMode = String(parameters['DevMode']).toLowerCase() === 'true';

    let knownGamepads = [];
    let buttonStates = {}; // store last button states for logging

    // Common mapping (Xbox / generic XInput style)
    const buttonNames = {
        0: "A / Cross",
        1: "B / Circle",
        2: "X / Square",
        3: "Y / Triangle",
        4: "LB / L1",
        5: "RB / R1",
        6: "LT / L2",
        7: "RT / R2",
        8: "Back / Select",
        9: "Start",
        10: "L3",
        11: "R3",
        12: "D-Pad Up",
        13: "D-Pad Down",
        14: "D-Pad Left",
        15: "D-Pad Right",
        16: "Home / Guide"
    };

    const alias_updateGamepadState = Input._updateGamepadState;
    //gets the input state of gamepad buttons, displays in the console.
    Input._updateGamepadState = function(gamepad) {
        if (gamepad) {
            alias_updateGamepadState.call(this, gamepad);

            if (devMode) {
                if (!buttonStates[gamepad.index]) {
                    buttonStates[gamepad.index] = gamepad.buttons.map(b => b.pressed);
                }

                gamepad.buttons.forEach((btn, i) => {
                    const wasPressed = buttonStates[gamepad.index][i];
                    if (btn.pressed && !wasPressed) {
                        console.log(
                            `[Gamepad ${gamepad.index}] Button ${i} (${buttonNames[i] || "Unknown"}) DOWN`
                        );
                    }
                    if (!btn.pressed && wasPressed) {
                        console.log(
                            `[Gamepad ${gamepad.index}] Button ${i} (${buttonNames[i] || "Unknown"}) UP`
                        );
                    }
                    buttonStates[gamepad.index][i] = btn.pressed;
                });
            }
        }
    };

    //Checking for Gamepad connection/disconnection
    const alias_Input_update = Input.update;
    Input.update = function() {
        alias_Input_update.call(this);

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i];
            if (gp) {
                if (!knownGamepads.includes(gp.index)) {
                    knownGamepads.push(gp.index);
                    if (devMode) console.log(`[Gamepad Connected] ${gp.id} (Index: ${gp.index})`);
                }
                this._updateGamepadState(gp);
            }
        }

        knownGamepads = knownGamepads.filter(idx => {
            if (!gamepads[idx]) {
                if (devMode) console.log(`[Gamepad Disconnected] Index: ${idx}`);
                delete buttonStates[idx];
                return false;
            }
            return true;
        });
    };
})();