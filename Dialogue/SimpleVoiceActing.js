/*:
 * @plugindesc Inline \voice[text] command in Show Text to play voice SE files (respects Options SE volume). 
 * @author Hank_Bloodshadow
 *
 * @help
 * Usage:
 *   \voice[filename]
 *
 * Example:
 *   \n[1]\voice[Hero_001] "Hello there!"
 *
 * Notes:
 * - Voice files go in /audio/se/
 * - Must exist as both .ogg and .m4a for cross-platform. or just .ogg for pc/web
 * - Volume is controlled by the player's "Sound Effect Volume" in Options.
 */

(function() {
  const _Window_Base_processEscapeCharacter = Window_Base.prototype.processEscapeCharacter;
  Window_Base.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'VOICE') {
      const fileName = this.obtainEscapeParam(textState);
      if (fileName) {
        AudioManager.playSe({
          name: fileName,
          volume: ConfigManager.seVolume, // use player's SE volume
          pitch: 100,
          pan: 0
        });
      }
    } else {
      _Window_Base_processEscapeCharacter.call(this, code, textState);
    }
  };
})();