/*:
 * @plugindesc v1.2 Lets you set ALL default Options values on first run, without overwriting player's config.rpgsave file afterwards. (RPG Maker MV) 
 * @author Hank_Bloodshadow
 *
 * @param Default Always Dash
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 *
 * @param Default Command Remember
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 *
 * @param Default Touch UI
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 *
 * @param Default BGM Volume
 * @type number
 * @min 0
 * @max 100
 * @default 25
 *
 * @param Default BGS Volume
 * @type number
 * @min 0
 * @max 100
 * @default 25
 *
 * @param Default ME Volume
 * @type number
 * @min 0
 * @max 100
 * @default 25
 *
 * @param Default SE Volume
 * @type number
 * @min 0
 * @max 100
 * @default 25
 *
 * @param Default Fullscreen
 * @type boolean
 * @on ON
 * @off OFF
 * @default false
 *
 * @param Default Gamepad Vibration
 * @type boolean
 * @on ON
 * @off OFF
 * @default false
 *
 * @param Default Show FPS
 * @type boolean
 * @on ON
 * @off OFF
 * @default false
 *
 * @param Default Battle Animation
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 *
 * @param Default Battle BGM
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 *
 * @param Default Window Tone
 * @type string
 * @default 0,0,0,0
 * @desc Set default tone as R,G,B,Gray (e.g. 68,-34,-34,0). Only applied on first run.
 *
 * @help
 * This plugin lets you define default settings for RPG Maker MV’s Options menu.
 *
 * 🟢 Behavior:
 * - On the very first run (when no config.rpgsave exists), the values you set
 *   in Plugin Manager will be applied.
 * - After that, the player’s personal config is respected.
 *
 * 💡 Notes:
 * - "Gamepad Vibration", "Show FPS", "Battle Animation", "Battle BGM" are not
 *   visible in the default Options menu but are tracked internally.
 * - "Window Tone" is an advanced value. Use comma-separated R,G,B,Grey.
 *
 * Place this plugin above others that modify ConfigManager.
 */

(function() {
    var parameters = PluginManager.parameters('DefaultOptions');

    var parseTone = function(str) {
        if (!str) return [0,0,0,0];
        return str.split(',').map(Number);
    };

    var defaults = {
        alwaysDash: parameters['Default Always Dash'] === 'true',
        commandRemember: parameters['Default Command Remember'] === 'true',
        touchUI: parameters['Default Touch UI'] === 'true',
        bgmVolume: Number(parameters['Default BGM Volume'] || 25),
        bgsVolume: Number(parameters['Default BGS Volume'] || 25),
        meVolume: Number(parameters['Default ME Volume'] || 25),
        seVolume: Number(parameters['Default SE Volume'] || 25),
        fullscreen: parameters['Default Fullscreen'] === 'true',
        gamepadVibration: parameters['Default Gamepad Vibration'] === 'true',
        showFps: parameters['Default Show FPS'] === 'true',
        battleAnimation: parameters['Default Battle Animation'] === 'true',
        battleBgm: parameters['Default Battle BGM'] === 'true',
        windowTone: parseTone(parameters['Default Window Tone'])
    };

    // Alias ConfigManager.load
    var _ConfigManager_load = ConfigManager.load;
    ConfigManager.load = function() {
        _ConfigManager_load.call(this);

        if (!StorageManager.exists(-2)) {
            this.alwaysDash = defaults.alwaysDash;
            this.commandRemember = defaults.commandRemember;
            this.touchUI = defaults.touchUI;
            this.bgmVolume = defaults.bgmVolume;
            this.bgsVolume = defaults.bgsVolume;
            this.meVolume = defaults.meVolume;
            this.seVolume = defaults.seVolume;
            this.gamepadVibration = defaults.gamepadVibration;
            this.showFps = defaults.showFps;
            this.battleAnimation = defaults.battleAnimation;
            this.battleBgm = defaults.battleBgm;
            this.windowTone = defaults.windowTone;

            if (defaults.fullscreen) {
                Graphics._requestFullScreen();
            }
        }
    };

})();
