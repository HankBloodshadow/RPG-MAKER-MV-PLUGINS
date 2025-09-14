/*:
 * @plugindesc Hybrid Quest System 
 * (self-contained, sync JSON/Params, foldable tracker, dynamic height, multi-stage objectives, 
 * counter support, persistent progress) - MV only
 * 
 * @author Hank_Bloodshadow
 * @help 
 * Place quests.json inside the data folder
 * 
 * WARNING:
 * When calling DataManager.saveGame(slotId) from events or scripts,
 * always call:
 *
 *     $gameSystem.onBeforeSave();
 *     DataManager.saveGame(slotId);
 *
 * This is required in RPG Maker MV to ensure BGM and other system
 * state is saved correctly. Skipping this will cause errors like:
 * "TypeError: Cannot read property 'name' of null" This plugin delays saving/loading slightly
 * so it is imperative that you make sure that everything from RPG Maker is ready for saving.
 * this doesn't affect saving from the pause menu as this is how it already works.
 * You can no longer use DataManager.saveGame(slotId); by itself.
 * HTML builds will also have issues so be sure to use StorageManager for saving/loading 
 * RPG Maker instead.
 * Again, this plugin handles it's own save/load, it cannot be async otherwise Race conditions may
 * occur when interfacing with RPG Maker MV.
 * 
 * @param QuestDataSource
 * @text Quest Data Source
 * @type select
 * @option Params
 * @value params
 * @option File
 * @value file
 * @default params
 *
 * @param QuestList
 * @text Quest List (if Params source)
 * @type note
 * @default []
 *
 * @param QuestFileName
 * @text Quest JSON File
 * @default quests.json
 *
 * @param TrackerAnchor
 * @type select
 * @option Top Left
 * @value topleft
 * @option Top Right
 * @value topright
 * @option Bottom Left
 * @value bottomleft
 * @option Bottom Right
 * @value bottomright
 * @option Custom
 * @value custom
 * @default topright
 *
 * @param TrackerMarginX
 * @type number
 * @min 0
 * @default 12
 *
 * @param TrackerMarginY
 * @type number
 * @min 0
 * @default 12
 *
 * @param TrackerX
 * @type number
 * @min 0
 * @default 600
 *
 * @param TrackerY
 * @type number
 * @min 0
 * @default 0
 *
 * @param TrackerWidth
 * @type number
 * @min 100
 * @default 300
 *
 * @param TrackerMinHeight
 * @type number
 * @min 0
 * @default 100
 *
 * @param TrackerMaxHeight
 * @type number
 * @min 100
 * @default 600
 *
 * @param TrackerOpacity
 * @type number
 * @min 0
 * @max 255
 * @default 180
 *
 * @param TrackerLineSpacing
 * @type number
 * @min 0
 * @default 4
 *
 * @param TrackerTitleFontSize
 * @type number
 * @min 8
 * @default 20
 *
 * @param TrackerObjectiveFontSize
 * @type number
 * @min 8
 * @default 16
 *
 * @param WrapIndent
 * @type number
 * @min 0
 * @default 12
 */
(function() {

  // MV-compatible synchronous plugin
  const path = require('path');
  const fs = require('fs');

  //----------------------------------------------------------------------//
  // Parameters & Data
  //----------------------------------------------------------------------//
  const parameters = PluginManager.parameters('QuestSystem');
  const questSource = String(parameters['QuestDataSource'] || 'params');
  const questList = String(parameters['QuestList'] || '[]');
  const questFile = String(parameters['QuestFileName'] || 'quests.json');

  const trackerAnchor = String(parameters['TrackerAnchor'] || 'topright');
  const trackerMarginX = Number(parameters['TrackerMarginX'] || 12);
  const trackerMarginY = Number(parameters['TrackerMarginY'] || 12);
  const trackerX = Number(parameters['TrackerX'] || 600);
  const trackerY = Number(parameters['TrackerY'] || 0);
  const trackerWidth = Number(parameters['TrackerWidth'] || 300);
  const trackerMinHeight = Number(parameters['TrackerMinHeight'] || 100);
  const trackerMaxHeight = Number(parameters['TrackerMaxHeight'] || 600);
  const trackerOpacity = Number(parameters['TrackerOpacity'] || 180);
  const trackerLineSpacing = Number(parameters['TrackerLineSpacing'] || 4);
  const trackerTitleFontSize = Number(parameters['TrackerTitleFontSize'] || 20);
  const trackerObjectiveFontSize = Number(parameters['TrackerObjectiveFontSize'] || 16);
  const wrapIndent = Number(parameters['WrapIndent'] || 12);

  // Self-contained manager (no Game_System usage)
  window.QuestManager = {
    _quests: {},
    _trackedQuestId: null
  };

  const QUEST_DEBUG = true;
  function logDebug() {
    if (QUEST_DEBUG) {
      console.log.apply(console, arguments);
    }
  }

  //----------------------------------------------------------------------//
  // Load quest definitions synchronously (file or params)
  //----------------------------------------------------------------------//
  try {
    if (questSource === 'file') {
      const filePath = path.join('data', questFile);
      const raw = fs.readFileSync(filePath, 'utf8');
      window.$dataQuests = JSON.parse(raw);
      logDebug('--- Quest data loaded from file ---', $dataQuests);
    } else {
      window.$dataQuests = JSON.parse(questList);
      logDebug('--- Quest data loaded from Params ---', $dataQuests);
    }
  } catch (e) {
    console.error('QuestSystem: Failed to load/parse quest definitions', e);
    window.$dataQuests = [];
  }
  window.$questsLoaded = true;

  //----------------------------------------------------------------------//
  // Quest progress file helpers (synchronous) - slot-aware and MV-safe
  //----------------------------------------------------------------------//
  window.QuestManager.getQuestSaveFile = function(slot) {
    // Use explicit slot param if provided, otherwise use DataManager._lastAccessedId if set, otherwise default to 1
    var saveSlot = (typeof slot !== 'undefined' && slot !== null) ? slot : (typeof DataManager._lastAccessedId !== 'undefined' && DataManager._lastAccessedId !== null ? DataManager._lastAccessedId : 1);
    return path.join('save', 'questProgress_slot' + String(saveSlot) + '.json');
  };

  window.QuestManager.saveQuestProgress = function(slot) {
    if (!Utils.isNwjs()) return;
    var filePath = this.getQuestSaveFile(slot);
    try {
      fs.writeFileSync(filePath, JSON.stringify(this._quests, null, 2), 'utf8');
      logDebug('--- Quest progress saved ---', filePath);
    } catch (err) {
      console.error('QuestSystem: Failed to save quest progress', err);
    }
  };

  window.QuestManager.loadQuestProgress = function(slot) {
    if (!Utils.isNwjs()) {
      this._quests = {};
      return;
    }
    var filePath = this.getQuestSaveFile(slot);
    if (!fs.existsSync(filePath)) {
      this._quests = {};
      logDebug('QuestSystem: No existing quest progress file, starting fresh (slot ' + (slot || DataManager._lastAccessedId || 1) + ')');
      return;
    }
    try {
      var raw = fs.readFileSync(filePath, 'utf8');
      this._quests = JSON.parse(raw);
      logDebug('--- Quest progress loaded ---', filePath, this._quests);
    } catch (e) {
      console.error('QuestSystem: Failed to parse quest progress', e);
      this._quests = {};
    }
  };

  window.QuestManager.deleteQuestProgressFile = function(slot) {
    if (!Utils.isNwjs()) return false;
    var filePath = this.getQuestSaveFile(slot);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logDebug('QuestSystem: Deleted quest progress file for slot', slot);
        return true;
      } catch (e) {
        console.error('QuestSystem: Failed to delete quest progress file', e);
        return false;
      }
    }
    return false;
  };

  //----------------------------------------------------------------------//
  // QuestManager core methods (self-contained)
  //----------------------------------------------------------------------//
  var QuestManager = window.QuestManager;

  function cloneObjective(obj) {
    return {
      text: obj.text || '',
      type: obj.type || 'boolean',
      target: typeof obj.target !== 'undefined' ? obj.target : 1,
      questId: typeof obj.questId !== 'undefined' ? obj.questId : null,
      count: (obj.type === 'counter') ? 0 : undefined,
      done: false
    };
  }

  function cloneStage(stage) {
    return {
      name: stage.name || '',
      objectives: (stage.objectives || []).map(cloneObjective)
    };
  }

  QuestManager.findQuestData = function(id) {
    if (!$dataQuests) return null;
    for (var i = 0; i < $dataQuests.length; i++) {
      if ($dataQuests[i].id === id) return $dataQuests[i];
    }
    return null;
  };

  // Add quest (cloned stages/objectives) and save to current slot
  QuestManager.addQuest = function(id) {
    if (this._quests[id]) return;
    var questData = this.findQuestData(id);
    if (!questData) return;
    var initialStage = (questData.stages && questData.stages[0]) ? cloneStage(questData.stages[0]) : { objectives: [] };
    this._quests[id] = {
      id: id,
      stage: 0,
      stages: questData.stages ? questData.stages.map(cloneStage) : [initialStage],
      completed: false
    };
    logDebug('Quest added (ID: ' + id + '):', this._quests[id]);
    // synchronous save
    this.saveQuestProgress();
  };

  QuestManager.removeQuest = function(id) {
    if (this._quests[id]) {
      delete this._quests[id];
      if (this._trackedQuestId === id) this._trackedQuestId = null;
      this.saveQuestProgress();
    }
  };

  QuestManager.completeQuest = function(id) {
    if (this._quests[id]) {
      this._quests[id].completed = true;
      this.saveQuestProgress();
    }
  };

  QuestManager.trackQuest = function(id) {
    if (this.isQuestActive(id)) {
      this._trackedQuestId = id;
      this.saveQuestProgress();
    }
  };

  QuestManager.untrackQuest = function(id) {
    if (this._trackedQuestId === id) {
      this._trackedQuestId = null;
      this.saveQuestProgress();
    }
  };

  QuestManager.isQuestActive = function(id) {
    return !!this._quests[id] && !this._quests[id].completed;
  };

  QuestManager.getTrackedQuest = function() {
    var id = this._trackedQuestId;
    if (!id) return null;
    var quest = this._quests[id];
    var def = this.findQuestData(id);
    if (!quest || !def) {
      // If referenced quest definition missing, clear tracked id
      this._trackedQuestId = null;
      return null;
    }
    var objs = [];
    var stageIndex = typeof quest.stage === 'number' ? quest.stage : 0;
    var stage = quest.stages[stageIndex] || { objectives: [] };
    for (var i = 0; i < stage.objectives.length; i++) {
      var o = stage.objectives[i];
      objs.push({
        text: o.text || '',
        done: !!o.done,
        count: o.count,
        target: o.target,
        type: o.type
      });
    }
    return {
      name: def.name || ('Quest ' + id),
      objectives: objs
    };
  };

  // internal stage completion check (autoSave param to avoid double-save)
  QuestManager._checkStageCompletion = function(questId, stageIndex, autoSave) {
    if (typeof autoSave === 'undefined') autoSave = true;
    var quest = this._quests[questId];
    if (!quest) return;
    var stage = quest.stages[stageIndex];
    if (!stage || !Array.isArray(stage.objectives)) return;
    var allDone = true;
    for (var i = 0; i < stage.objectives.length; i++) {
      if (!stage.objectives[i].done) { allDone = false; break; }
    }
    if (allDone) {
      if (quest.stage < quest.stages.length - 1) {
        quest.stage++;
      } else {
        quest.completed = true;
      }
      if (autoSave) this.saveQuestProgress();
    }
  };

  // Objective updates (boolean/counter/questRef)
  QuestManager.setObjective = function(questId, stageIndex, objIndex, done) {
    var quest = this._quests[questId];
    if (!quest) return;
    var stage = quest.stages[stageIndex];
    if (!stage) return;
    var obj = stage.objectives[objIndex];
    if (!obj) return;
    if (obj.type === 'counter') {
      obj.count = obj.target || 1;
    }
    obj.done = !!done;
    this._checkStageCompletion(questId, stageIndex, false);
    this.saveQuestProgress();
  };

  QuestManager.incrementObjective = function(questId, stageIndex, objIndex, amount) {
    if (typeof amount !== 'number') amount = 1;
    var quest = this._quests[questId];
    if (!quest) return;
    var stage = quest.stages[stageIndex];
    if (!stage) return;
    var obj = stage.objectives[objIndex];
    if (!obj) return;
    if (obj.type !== 'counter') return;
    obj.count = (obj.count || 0) + amount;
    if (obj.count >= (obj.target || 1)) obj.done = true;
    this._checkStageCompletion(questId, stageIndex, false);
    this.saveQuestProgress();
  };

  QuestManager.nextStage = function(questId) {
    var quest = this._quests[questId];
    if (!quest) return;
    if (quest.stage < quest.stages.length - 1) quest.stage++;
    else quest.completed = true;
    this.saveQuestProgress();
  };

  //----------------------------------------------------------------------//
  // Plugin / Script Commands
  // - Exposes synchronous save/load/delete/reset via plugin commands
  //----------------------------------------------------------------------//
  var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    _Game_Interpreter_pluginCommand.call(this, command, args);
    if (!command) return;
    if (command.toLowerCase() !== 'quest') return;

    var action = (args[0] || '').toLowerCase();
    var id = Number(args[1]);
    var stageIndex = Number(args[2]);
    var objIndex = Number(args[3]);
    var value = args[4];

    switch (action) {
      case 'add':
        QuestManager.addQuest(id);
        break;
      case 'remove':
        QuestManager.removeQuest(id);
        break;
      case 'complete':
        QuestManager.completeQuest(id);
        break;
      case 'track':
        QuestManager.trackQuest(id);
        break;
      case 'untrack':
        QuestManager.untrackQuest(id);
        break;
      case 'save':
        QuestManager.saveQuestProgress();
        break;
      case 'load':
        QuestManager.loadQuestProgress();
        break;
      case 'reset':
      case 'deleteprogress':
        QuestManager.deleteQuestProgressFile();
        QuestManager._quests = {};
        break;
      case 'objectiveadd':
        // objectiveadd <id> <stage> <obj> <amount>
        QuestManager.incrementObjective(id, stageIndex, objIndex, Number(value) || 1);
        break;
      case 'objectiveset':
        // objectiveset <id> <stage> <obj> <0|1>
        QuestManager.setObjective(id, stageIndex, objIndex, !!Number(value));
        break;
      case 'nextstage':
        QuestManager.nextStage(id);
        break;
      default:
        console.warn("Quest plugin: Unknown command '" + action + "'");
        break;
    }
  };

  //----------------------------------------------------------------------//
  // Scene_Map integration: quest tracker window
  //----------------------------------------------------------------------//
  function Window_QuestTracker() {
    this.initialize.apply(this, arguments);
  }
  Window_QuestTracker.prototype = Object.create(Window_Base.prototype);
  Window_QuestTracker.prototype.constructor = Window_QuestTracker;

  Window_QuestTracker.prototype.initialize = function() {
    var x = trackerX, y = trackerY;
    switch (trackerAnchor) {
      case 'topleft':
        x = trackerMarginX; y = trackerMarginY; break;
      case 'topright':
        x = Graphics.width - trackerWidth - trackerMarginX; y = trackerMarginY; break;
      case 'bottomleft':
        x = trackerMarginX; y = Graphics.height - trackerMaxHeight - trackerMarginY; break;
      case 'bottomright':
        x = Graphics.width - trackerWidth - trackerMarginX; y = Graphics.height - trackerMaxHeight - trackerMarginY; break;
      default:
        // custom uses trackerX/trackerY provided
        x = trackerX; y = trackerY; break;
    }
    Window_Base.prototype.initialize.call(this, x, y, trackerWidth, trackerMinHeight);
    this._folded = false;
    this.opacity = trackerOpacity;
    this.refresh();
  };

  Window_QuestTracker.prototype.lineHeight = function() {
    return Window_Base.prototype.lineHeight.call(this) + trackerLineSpacing;
  };

  Window_QuestTracker.prototype.toggleFold = function() {
    this._folded = !this._folded;
    this.refresh();
  };

  // robust wrapped text drawing (no optional chaining)
  Window_QuestTracker.prototype.drawWrappedTextEx = function(text, x, y, maxWidth, wrap, indent) {
    if (typeof wrap === 'undefined') wrap = true;
    if (typeof indent === 'undefined') indent = 0;
    var originalX = x;
    var line = '';
    var currentY = y;
    var context = this.contents._context;
    context.save();
    this.resetFontSettings();
    // split with whitespace included
    var words = text.split(/(\s+)/);
    var firstLine = true;
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      var testLine = line + word;
      var metrics = context.measureText(this.convertEscapeCharacters(testLine));
      var testWidth = metrics.width;
      if (wrap && testWidth > maxWidth) {
        if (line.trim()) {
          this.drawTextEx(line, x, currentY);
          currentY += this.lineHeight();
        }
        line = word.replace(/^\s+/, '');
        x = originalX + (firstLine ? 0 : indent);
        firstLine = false;
      } else {
        line = testLine;
      }
    }
    if (line.trim()) {
      this.drawTextEx(line, x, currentY);
      currentY += this.lineHeight();
    }
    context.restore();
    return currentY - y;
  };

  Window_QuestTracker.prototype.refresh = function() {
    if (!window.$questsLoaded) return;
    this.contents.clear();

    var tracked = QuestManager.getTrackedQuest();
    if (!tracked || !tracked.objectives) return;

    var y = 0;
    this.contents.fontSize = trackerTitleFontSize;
    if (this._folded) {
      this.drawText(tracked.name + ' ▼', 0, 0, this.width, 'left');
      return;
    }

    y += this.drawWrappedTextEx(tracked.name, 0, y, this.width, true, 0);

    this.contents.fontSize = trackerObjectiveFontSize;
    for (var i = 0; i < tracked.objectives.length; i++) {
      var obj = tracked.objectives[i];
      var marker = obj.done ? '✔' : '•';
      var text = obj.text || '';
      if (obj.type === 'counter') text += ' (' + (obj.count || 0) + '/' + (obj.target || 1) + ')';
      y += this.drawWrappedTextEx(marker + ' ' + text, 12, y, this.width - 12, true, wrapIndent);
    }

    var calculatedHeight = Math.min(Math.max(y + trackerMarginY, trackerMinHeight), trackerMaxHeight);
    if (calculatedHeight !== this.height) {
      this.height = calculatedHeight;
      this.createContents();
      this.refresh();
    }
  };

  //----------------------------------------------------------------------//
  // Scene_Map integration
  //----------------------------------------------------------------------//
  var _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
  Scene_Map.prototype.createAllWindows = function() {
    _Scene_Map_createAllWindows.call(this);
    this._questTracker = new Window_QuestTracker();
    this.addChildAt(this._questTracker, 1);
  };

  var _Scene_Map_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    if (this._questTracker) {
      var trackedQuest = QuestManager.getTrackedQuest();
      this._questTracker.visible = !!trackedQuest;
      if (trackedQuest) this._questTracker.refresh();
    }
  };

  //----------------------------------------------------------------------//
  // Hook into DataManager save/load to keep quest progress in sync with slot
  // - Synchronous operations are used so these can be called from events safely
  //----------------------------------------------------------------------//

  // Save: set last accessed id then call original save; afterwards save quest progress to same slot
  var _DataManager_saveGame = DataManager.saveGame;
  DataManager.saveGame = function(savefileId) {
    // ensure QuestManager uses this slot
    DataManager._lastAccessedId = savefileId;
    var result = _DataManager_saveGame.call(this, savefileId);
    try {
      QuestManager.saveQuestProgress(savefileId);
    } catch (e) {
      console.error('QuestSystem: Failed to auto-save quest progress after DataManager.saveGame', e);
    }
    return result;
  };

  // Load: set last accessed id, load quest progress from that slot synchronously, then call original
  var _DataManager_loadGame = DataManager.loadGame;
  DataManager.loadGame = function(savefileId) {
    DataManager._lastAccessedId = savefileId;
    try {
      QuestManager.loadQuestProgress(savefileId);
    } catch (e) {
      console.error('QuestSystem: Failed to load quest progress before DataManager.loadGame', e);
    }
    return _DataManager_loadGame.call(this, savefileId);
  };

  // SetupNewGame: called when player starts a new game. Delete quest progress file for slot 1,
  // but only if it appears to be a real new game started from the Title scene (guard to avoid boot-time deletion).
  var _DataManager_setupNewGame = DataManager.setupNewGame;
  DataManager.setupNewGame = function() {
    _DataManager_setupNewGame.call(this);

    // Default to slot 1 for a brand-new session
    DataManager._lastAccessedId = 1;

    // Guard: only delete if we look like we're starting from Title (avoid deletion during boot)
    var currentSceneName = null;
    try {
      if (SceneManager._scene && SceneManager._scene.constructor && SceneManager._scene.constructor.name) {
        currentSceneName = SceneManager._scene.constructor.name;
      }
    } catch (err) {
      currentSceneName = null;
    }

    if (Utils.isNwjs() && currentSceneName === 'Scene_Title') {
      try {
        QuestManager.deleteQuestProgressFile(1);
        // ensure in-memory state cleared
        QuestManager._quests = {};
        logDebug('QuestSystem: Cleared quest progress for new game (slot 1).');
      } catch (e) {
        console.error('QuestSystem: Error while clearing quest progress for new game', e);
      }
    } else {
      // If not Scene_Title, don't touch files (safer)
      logDebug('QuestSystem: setupNewGame called but not on Scene_Title — skipping auto-delete of progress file.');
    }

    // Load (or reset) in-memory state for slot 1
    try {
      QuestManager.loadQuestProgress(1);
    } catch (e) {
      console.error('QuestSystem: Failed to load quest progress after setupNewGame', e);
      QuestManager._quests = {};
    }
  };

  //----------------------------------------------------------------------//
  // End plugin
  //----------------------------------------------------------------------//

})();
