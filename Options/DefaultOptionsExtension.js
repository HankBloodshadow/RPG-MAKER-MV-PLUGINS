/*:
 * @plugindesc v1.6 Optimized DataManager Extension for "DefaultOptions" plugin — dynamic default registration (RPG Maker MV)
 * @author Hank_Bloodshadow
 *
 * @help
 * Expands "DefaultOptions.js" safely.
 *
 * ⚠️ Requires "DefaultOptions.js" to be installed in your project.
 *
 * Usage (script calls in an event or another plugin):
 *   DefaultOptions.registerDefault("myCustomOption", true);
 *   DefaultOptions.registerDefault("customVolume", 75);
 *   DefaultOptions.registerDefault("playerSkin", "blue");
 */

(function() {

    // Wait until DefaultOptions is defined
    var checkInterval = setInterval(function() {
        if (typeof DefaultOptions !== "undefined") {
            clearInterval(checkInterval);
            initDefaultOptionsExtension();
        }
    }, 50);

    function initDefaultOptionsExtension() {
        if (DefaultOptions._extensionLoaded) return;

        // Storage for dynamic defaults
        DefaultOptions._extraDefaults = DefaultOptions._extraDefaults || {};

        // API method for other plugins / events
        DefaultOptions.registerDefault = function(key, value) {
            this._extraDefaults[key] = value;
        };

        // Hook ConfigManager.load once
        var _ConfigManager_load = ConfigManager.load;
        ConfigManager.load = function() {
            _ConfigManager_load.call(this);

            if (!StorageManager.exists(-2)) {
                for (var key in DefaultOptions._extraDefaults) {
                    if (DefaultOptions._extraDefaults.hasOwnProperty(key)) {
                        // Only set if undefined
                        if (this[key] === undefined) {
                            this[key] = DefaultOptions._extraDefaults[key];
                        }
                    }
                }
            }
        };

        DefaultOptions._extensionLoaded = true;
        console.log("DefaultOptionsExtension loaded successfully!");
    }

})();