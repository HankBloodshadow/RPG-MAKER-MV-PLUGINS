/*:
 * @plugindesc Multipurpose utility for running Common Events once, at battle start, or at battle end, with optional per-battle or once-ever behavior. 
 * @author Hank_Bloodshadow
 *
 * @help
 * ============================================================================
 * Plugin Commands (case-insensitive):
 * ============================================================================
 * 
 * Run a common event once (tracked by a switch):
 *   runcommoneventonce <CommonEventId> <TrackingSwitchId>
 *
 * Reset all tracked switches:
 *   resetonetimeevents
 *
 * Run a common event on battle start:
 *   runcommoneventonbattlestart <CommonEventId> <TrackingSwitchId> [true/false]
 *
 * Run a common event on battle end:
 *   runcommoneventonbattleend <CommonEventId> <TrackingSwitchId> [true/false]
 *
 * ============================================================================
 * Notes:
 * - [true] = run once per battle (switch resets after each use).
 * - [false] or omitted = run only once ever (tracked by switch).
 * - Switches must be unique per use, or they will overwrite each other.
 * - Debug logs only appear in Playtest mode.
 * ============================================================================
 */

(function() {
    var pluginName = "RunCommonEventOnce";
    var isDev = Utils.isOptionValid('test'); // true in playtest

    var trackedSwitches = new Set();
    var battleStartHookInstalled = false;
    var battleEndHookInstalled = false;
    var battleStartWatchers = [];
    var battleEndWatchers = [];

    // -------------------------------
    // Helpers
    // -------------------------------
    function parseId(val, label) {
        if (val == null) return 0;
        var n = Number(String(val).trim());
        if (isNaN(n) || n <= 0) {
            if (isDev) console.warn(pluginName + ": Invalid " + label + " ->", val);
            return 0;
        }
        return n;
    }

    function parseBool(val) {
        if (!val) return false;
        return String(val).trim().toLowerCase() === "true";
    }

    function addTrackedSwitch(switchId) {
        trackedSwitches.add(switchId);
    }

    function upsertBattleWatcher(list, eventId, switchId, oncePerBattle) {
        for (var i = 0; i < list.length; i++) {
            if (list[i].switchId === switchId) {
                list[i].eventId = eventId;
                list[i].oncePerBattle = oncePerBattle;
                return;
            }
        }
        list.push({ eventId: eventId, switchId: switchId, oncePerBattle: oncePerBattle });
    }

    // -------------------------------
    // Command Handler
    // -------------------------------
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (!command) return;
        var cmd = command.toLowerCase();

        // --- Run Common Event Once ---
        if (cmd === "runcommoneventonce") {
            var ceId = parseId(args[0], "CommonEventId");
            var swId = parseId(args[1], "TrackingSwitchId");
            if (ceId > 0 && swId > 0) {
                addTrackedSwitch(swId);
                if (!$gameSwitches.value(swId)) {
                    $gameTemp.reserveCommonEvent(ceId);
                    $gameSwitches.setValue(swId, true);
                    if (isDev) console.log("RunOnce: CE " + ceId + " ran. Switch " + swId + " set ON.");
                } else if (isDev) {
                    console.log("RunOnce: CE " + ceId + " already ran (Switch " + swId + " is ON).");
                }
            }

        // --- Reset All ---
        } else if (cmd === "resetonetimeevents") {
            trackedSwitches.forEach(function(sid) {
                $gameSwitches.setValue(sid, false);
            });
            if (isDev) console.log("All tracked switches reset.");

        // --- Run on Battle Start ---
        } else if (cmd === "runcommoneventonbattlestart") {
            var beCeId = parseId(args[0], "CommonEventId");
            var beSwId = parseId(args[1], "TrackingSwitchId");
            var oncePerBattle = parseBool(args[2]);

            if (beCeId > 0 && beSwId > 0) {
                addTrackedSwitch(beSwId);
                upsertBattleWatcher(battleStartWatchers, beCeId, beSwId, oncePerBattle);
                installBattleStartHookOnce();
                if (isDev) {
                    console.log("BattleStart registered CE " + beCeId +
                                " with Switch " + beSwId +
                                " (oncePerBattle=" + oncePerBattle + ")");
                }
            }

        // --- Run on Battle End ---
        } else if (cmd === "runcommoneventonbattleend") {
            var endCeId = parseId(args[0], "CommonEventId");
            var endSwId = parseId(args[1], "TrackingSwitchId");
            var oncePerBattleEnd = parseBool(args[2]);

            if (endCeId > 0 && endSwId > 0) {
                addTrackedSwitch(endSwId);
                upsertBattleWatcher(battleEndWatchers, endCeId, endSwId, oncePerBattleEnd);
                installBattleEndHookOnce();
                if (isDev) {
                    console.log("BattleEnd registered CE " + endCeId +
                                " with Switch " + endSwId +
                                " (oncePerBattle=" + oncePerBattleEnd + ")");
                }
            }
        }
    };

    // -------------------------------
    // Battle Start Hook
    // -------------------------------
    function installBattleStartHookOnce() {
        if (battleStartHookInstalled) return;
        battleStartHookInstalled = true;

        var _BattleManager_startBattle = BattleManager.startBattle;
        BattleManager.startBattle = function() {
            _BattleManager_startBattle.call(this);
            for (var i = 0; i < battleStartWatchers.length; i++) {
                var w = battleStartWatchers[i];
                if (w.oncePerBattle) {
                    $gameTemp.reserveCommonEvent(w.eventId);
                    $gameSwitches.setValue(w.switchId, true);
                    if (isDev) console.log("BattleStart (per battle): CE " + w.eventId);
                    $gameSwitches.setValue(w.switchId, false);
                } else {
                    if (!$gameSwitches.value(w.switchId)) {
                        $gameTemp.reserveCommonEvent(w.eventId);
                        $gameSwitches.setValue(w.switchId, true);
                        if (isDev) console.log("BattleStart (once ever): CE " + w.eventId);
                    }
                }
            }
        };
    }

    // -------------------------------
    // Battle End Hook
    // -------------------------------
    function installBattleEndHookOnce() {
        if (battleEndHookInstalled) return;
        battleEndHookInstalled = true;

        var _BattleManager_endBattle = BattleManager.endBattle;
        BattleManager.endBattle = function(result) {
            _BattleManager_endBattle.call(this, result);
            for (var i = 0; i < battleEndWatchers.length; i++) {
                var w = battleEndWatchers[i];
                if (w.oncePerBattle) {
                    $gameTemp.reserveCommonEvent(w.eventId);
                    $gameSwitches.setValue(w.switchId, true);
                    if (isDev) console.log("BattleEnd (per battle): CE " + w.eventId);
                    $gameSwitches.setValue(w.switchId, false);
                } else {
                    if (!$gameSwitches.value(w.switchId)) {
                        $gameTemp.reserveCommonEvent(w.eventId);
                        $gameSwitches.setValue(w.switchId, true);
                        if (isDev) console.log("BattleEnd (once ever): CE " + w.eventId);
                    }
                }
            }
        };
    }

})();