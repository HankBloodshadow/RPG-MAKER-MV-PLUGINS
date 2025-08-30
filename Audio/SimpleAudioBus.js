/*:
 * @plugindesc MV sound bus plugin for managing overlapping SFX with a voice-like bus system. Provides \sfx[], PlaySFX command, and script API. Replaces oldest sound when bus is full. 
 * @author Hank_Bloodshadow
 *
 * @param Max Voices
 * @type number
 * @min 1
 * @default 4
 *
 * @help
 * Usage in text:
 *   \sfx[FileName]              // default SE volume & pitch
 *   \sfx[FileName,80,120]       // volume 80%, pitch 120
 *
 * Plugin command:
 *   PlaySFX FileName volume pitch
 *   Example: PlaySFX SwordSlash 80 120
 *
 * Script call:
 *   SimpleSoundBus.play("SwordSlash", 80, 120);
 *   SimpleSoundBus.stopAll(); // optional, stops all currently playing SFX immediately
 *
 * Notes:
 * - Place .ogg and .m4a in /audio/se/
 * - Volume defaults to SE option in the config (0–100)
 * - Pitch defaults to 100
 * - Multiple SFX can overlap, up to the Max Voices limit
 * - If limit is exceeded, the oldest SFX is stopped and replaced
 */

(function() {

  const params = PluginManager.parameters("SimpleSoundBus");
  const MAX_VOICES = Number(params['Max Voices'] || 4);

  let _audioCtx = null;

  const sfxBus = {
    sources: [],
    gainNode: null,
  };

  function initAudioContext() {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!sfxBus.gainNode) {
      sfxBus.gainNode = _audioCtx.createGain();
      sfxBus.gainNode.connect(_audioCtx.destination);
    }
  }

  function playSfxBuffer(fileName, volume = ConfigManager.seVolume, pitch = 100) {
    initAudioContext();

    const tryFiles = [`audio/se/${fileName}.ogg`, `audio/se/${fileName}.m4a`];
    let tried = 0;

    function tryLoad(url) {
      const request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';

      request.onload = function() {
        _audioCtx.decodeAudioData(request.response, function(buffer) {
          const source = _audioCtx.createBufferSource();
          const gainNode = _audioCtx.createGain();

          source.buffer = buffer;
          source.playbackRate.value = pitch / 100;
          gainNode.gain.value = volume / 100; // normalize 0–100 → 0–1

          source.connect(gainNode);
          gainNode.connect(sfxBus.gainNode);

          // Start immediately
          source.start(0);

          // Manage bus list
          source._gainNode = gainNode; // track for cleanup
          sfxBus.sources.push(source);

          // Limit active voices
          if (sfxBus.sources.length > MAX_VOICES) {
            const oldest = sfxBus.sources.shift();
            try {
              oldest.stop();
              oldest.disconnect();
              oldest._gainNode.disconnect();
            } catch (e) { /* ignore */ }
          }

          // Auto-cleanup on end
          source.onended = function() {
            const i = sfxBus.sources.indexOf(source);
            if (i >= 0) sfxBus.sources.splice(i, 1);
            try {
              source.disconnect();
              gainNode.disconnect();
            } catch (e) { /* ignore */ }
          };

        }, function(e){
          tried++;
          if (tried < tryFiles.length) tryLoad(tryFiles[tried]);
          else console.error("Failed to decode SFX audio", url, e);
        });
      };

      request.onerror = function() {
        tried++;
        if (tried < tryFiles.length) tryLoad(tryFiles[tried]);
        else console.error("Failed to load SFX file:", url);
      };

      request.send();
    }

    tryLoad(tryFiles[0]);
  }

  // Expose API
  window.SimpleSoundBus = {
    play: function(fileName, volume, pitch) {
      playSfxBuffer(
        fileName,
        volume !== undefined ? volume : ConfigManager.seVolume,
        pitch !== undefined ? pitch : 100
      );
    },
    stopAll: function() {
      sfxBus.sources.forEach(src => {
        try {
          src.stop();
          src.disconnect();
          if (src._gainNode) src._gainNode.disconnect();
        } catch (e) { /* ignore */ }
      });
      sfxBus.sources = [];
    }
  };

  // Plugin Command
  const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (command.toLowerCase() === "playsfx") {
      const fileName = args[0];
      const volume = args[1] ? Number(args[1]) : ConfigManager.seVolume;
      const pitch  = args[2] ? Number(args[2]) : 100;
      if (fileName) SimpleSoundBus.play(fileName, volume, pitch);
    }
  };

  // Add inline escape code \sfx[]
  const _Window_Base_processEscapeCharacter = Window_Base.prototype.processEscapeCharacter;
  Window_Base.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'SFX') {
      const start = textState.index + 1;
      const end = textState.text.indexOf(']', start);
      if (end >= 0) {
        const param = textState.text.substring(start, end).trim();
        const parts = param.split(',').map(s => s.trim());
        const fileName = parts[0];
        const volume   = parts[1] ? Number(parts[1]) : ConfigManager.seVolume;
        const pitch    = parts[2] ? Number(parts[2]) : 100;

        if (fileName) SimpleSoundBus.play(fileName, volume, pitch);

        textState.index = end + 1;
      }
      return;
    }
    _Window_Base_processEscapeCharacter.call(this, code, textState);
  };

})();