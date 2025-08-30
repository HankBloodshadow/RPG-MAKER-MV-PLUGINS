/*:
 * @plugindesc Plays a sound effect whenever the player fast-forwards dialogue, using SE volume from Options by default.
 * @author Hank_Bloodshadow
 *
 * @param FF_SE
 * @type file
 * @dir audio/se/
 * @desc Sound effect to play when fast-forwarding dialogue.
 * @default Cursor1
 *
 * @param FF_SE_Volume
 * @type number
 * @min 0
 * @max 100
 * @desc Volume of the fast-forward SE (optional, defaults to SE volume slider if left blank).
 * @default 
 *
 * @param FF_SE_Pitch
 * @type number
 * @min 50
 * @max 150
 * @desc Pitch of the fast-forward SE.
 * @default 100
 *
 * @param FF_SE_Pan
 * @type number
 * @min -100
 * @max 100
 * @desc Pan of the fast-forward SE.
 * @default 0
 * 
 * @help
 * -------------------------------
 * Dialogue Advance Sound Effect Plugin
 * -------------------------------
 *
 * This plugin plays a sound effect immediately when the player presses OK/Enter
 * to advance a line of dialogue.
 *
 * Features:
 * 1. Plays one sound per key press ('ok'), no spam if the key is held.
 * 2. Only triggers while a Show Text message window is visible.
 * 3. Ignores fast-forward and other keys — prevents triggering during intro movies, menus, or map movement.
 * 4. Volume defaults to the player's SE slider but can be overridden.
 * 5. Pitch and pan can be customized in the plugin parameters.
 *
 * Plugin Parameters:
 * - FF_SE: Choose the SE file to play (from /audio/se/ folder).
 * - FF_SE_Volume: Optional volume override (0-100). Leave blank to follow SE volume slider.
 * - FF_SE_Pitch: Pitch of the SE (default 100).
 * - FF_SE_Pan: Pan of the SE (-100 left to 100 right, default 0).
 *
 * Usage:
 * - Install the plugin.
 * - Configure your preferred sound effect and parameters in the Plugin Manager.
 * - During gameplay, whenever the player presses OK/Enter to advance dialogue, the SE will play once.
 *
 * Notes:
 * - Does not trigger outside of Show Text windows.
 * - Does not interfere with voice lines or other sound effects.
 */
(function() {
  const params = PluginManager.parameters(document.currentScript.src.match(/([^/]+)\.js$/)[1]);
  const ffSE = String(params['FF_SE'] || 'Cursor1');
  const ffVolParam = params['FF_SE_Volume'];
  const ffPitch = Number(params['FF_SE_Pitch'] || 100);
  const ffPan = Number(params['FF_SE_Pan'] || 0);

  // Helper to play the SE
  function playSkipSE() {
    const seVolume = ffVolParam ? Number(ffVolParam) : ConfigManager.seVolume;
    AudioManager.playSe({ name: ffSE, volume: seVolume, pitch: ffPitch, pan: ffPan });
  }

  // Hook advance input (normal line advance)
  const _Window_Message_onInputOk = Window_Message.prototype.onInputOk;
  Window_Message.prototype.onInputOk = function() {
    if (!this._skipSEPlayed) {
      playSkipSE();
      this._skipSEPlayed = true;
    }
    _Window_Message_onInputOk.call(this);
  };

  // Hook terminateMessage to catch mid-line skips
  const _Window_Message_terminateMessage = Window_Message.prototype.terminateMessage;
  Window_Message.prototype.terminateMessage = function() {
    if (!this._skipSEPlayed) {
      playSkipSE();
      this._skipSEPlayed = true;
    }
    _Window_Message_terminateMessage.call(this);
  };

  // Reset per line/page
  const _Window_Message_newPage = Window_Message.prototype.newPage;
  Window_Message.prototype.newPage = function(textState) {
    this._skipSEPlayed = false;
    _Window_Message_newPage.call(this, textState);
  };
})();