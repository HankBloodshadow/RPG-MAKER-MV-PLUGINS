/*:
 * @plugindesc MV voice acting plugin using Web Audio buffers, with SE volume, fade, .m4a fallback, and skip handling. \voice[FileName,volume,pitch] 
 * @author Hank_Bloodshadow
 *
 * @param Voice Fade Frames
 * @type number
 * @min 0
 * @default 6
 *
 * @help
 * Usage:
 *   \voice[FileName]                  // default volume/pitch
 *   \voice[FileName,80,120]           // volume 80%, pitch 120
 *
 * Notes:
 * - Place .ogg and .m4a in /audio/se/
 * - Volume defaults to SE volume in options (0–100)
 * - Pitch defaults to 100
 * - Stops previous voice automatically when a new voice is played, skipped, or message ends
 * - Fade-out duration configurable
 */

(function() {

  const params = PluginManager.parameters("SimpleVoiceActing");
  const VOICE_FADE_FRAMES = Number(params['Voice Fade Frames'] || 6);

  let _audioCtx = null;
  let _currentSource = null;
  let _gainNode = null;
  let _fadeCounter = 0;
  let _fadeStartVolume = 1;

  function initAudioContext() {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function stopCurrentVoice(fade = false) {
    if (_currentSource) {
      if (fade && VOICE_FADE_FRAMES > 0 && _gainNode) {
        const fadeTime = VOICE_FADE_FRAMES / 60; // frames → seconds
        _gainNode.gain.cancelScheduledValues(_audioCtx.currentTime);
        _gainNode.gain.setValueAtTime(_gainNode.gain.value, _audioCtx.currentTime);
        _gainNode.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + fadeTime);

        // Stop after fade completes
        _currentSource.stop(_audioCtx.currentTime + fadeTime);
        _currentSource.disconnect();
        _gainNode.disconnect();
        _currentSource = null;
        _gainNode = null;
      } else {
        _currentSource.stop();
        _currentSource.disconnect();
        if (_gainNode) _gainNode.disconnect();
        _currentSource = null;
        _gainNode = null;
      }
    }
  }

  function playVoiceBuffer(fileName, volume = ConfigManager.seVolume, pitch = 100) {
    initAudioContext();
    stopCurrentVoice(false);

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
          gainNode.connect(_audioCtx.destination);
          source.start(0);

          _currentSource = source;
          _gainNode = gainNode;
        }, function(e){
          tried++;
          if (tried < tryFiles.length) tryLoad(tryFiles[tried]);
          else console.error("Failed to decode audio", url, e);
        });
      };

      request.onerror = function() {
        tried++;
        if (tried < tryFiles.length) tryLoad(tryFiles[tried]);
        else console.error("Failed to load audio file:", url);
      };

      request.send();
    }

    tryLoad(tryFiles[0]);
  }

  const _Window_Base_processEscapeCharacter = Window_Base.prototype.processEscapeCharacter;
  Window_Base.prototype.processEscapeCharacter = function(code, textState) {
    if (code === 'VOICE') {
      const start = textState.index + 1;
      const end = textState.text.indexOf(']', start);
      if (end >= 0) {
        const param = textState.text.substring(start, end).trim();
        const parts = param.split(',').map(s => s.trim());
        const fileName = parts[0];
        const volume   = parts[1] ? Number(parts[1]) : ConfigManager.seVolume;
        const pitch    = parts[2] ? Number(parts[2]) : 100;

        if (fileName) playVoiceBuffer(fileName, volume, pitch);

        textState.index = end + 1;
      }
      return;
    }
    _Window_Base_processEscapeCharacter.call(this, code, textState);
  };

  // Hook skip detector properly
  const _Window_Message_isTriggered = Window_Message.prototype.isTriggered;
  Window_Message.prototype.isTriggered = function() {
    const triggered = _Window_Message_isTriggered.call(this);
    if (triggered) {
      stopCurrentVoice(true);
    }
    return triggered;
  };

  const _Window_Message_terminateMessage = Window_Message.prototype.terminateMessage;
  Window_Message.prototype.terminateMessage = function() {
    stopCurrentVoice(true);
    _Window_Message_terminateMessage.call(this);
  };

})();
