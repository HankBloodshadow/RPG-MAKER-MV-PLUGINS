/*:
 * @plugindesc v1.0 Extension for "DefaultOptions" plugin — allows dynamic registration of default config values via script API. (RPG Maker MV)
 * @author Hank_Bloodshadow
 *
 * @help
 * This extension plugin expands "DefaultOptions.js".
 *
 * ⚠️ Requires "DefaultOptions.js" to be installed and placed ABOVE this plugin.
 *
 * Usage (script calls in an event or another plugin):
 *   DefaultOptions.registerDefault("myCustomOption", true);
 *   DefaultOptions.registerDefault("customVolume", 75);
 *   DefaultOptions.registerDefault("playerSkin", "blue");
 *
 * On the first run (when no config.rpgsave exists), the values registered
 * here will be applied automatically. Once a config file exists, it will not
 * overwrite the player's saved settings.
 */

(function() {
    if (typeof DefaultOptions === "undefined") {
        console.error("DefaultOptionsExtension loaded, but DefaultOptions.js not found!");
        return;
    }

    // Storage for dynamic defaults
    DefaultOptions._extraDefaults = DefaultOptions._extraDefaults || {};

    // API method for other plugins / events
    DefaultOptions.registerDefault = function(key, value) {
        this._extraDefaults[key] = value;
    };

    // Hook into ConfigManager.load
    var _DefaultOptions_ConfigManager_load = ConfigManager.load;
    ConfigManager.load = function() {
        _DefaultOptions_ConfigManager_load.call(this);

        if (!StorageManager.exists(-2)) {
            for (var key in DefaultOptions._extraDefaults) {
                if (DefaultOptions._extraDefaults.hasOwnProperty(key)) {
                    this[key] = DefaultOptions._extraDefaults[key];
                }
            }
        }
    };
})();