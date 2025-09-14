# RPG Maker MV Plugins Collection

A collection of helpful **RPG Maker MV** plugins.  

> Note: All plugins listed here are for **RPG Maker MV only**.

---

## Plugins

### `InBattleCheck` ["BattleCheck"]
Tracks battle state via a global switch, allowing you to check if the player is **in battle** using a conditional branch in events.  

- **Setup:** Minimal; assign a global switch and use the plugin command `BattleCheck`.  
- **Use case:** Sometimes you want a global event to trigger instead of creating multiple troop events.  

---

### `AnalogueStickMovement`
Enables use of **one analogue stick** (left or right) on a gamepad for:  

- Four-directional movement  
- UI controls  

> Note: Only handles analogue stick input. Other controls are unaffected.  

---

### `RunCommonEventOnce` ["RunCommonEventOnce", "ResetOneTimeEvents", "RunCommonEventOnBattleStart", "RunCommonEventOnBattleEnd"]
A versatile plugin for running a **global common event once**.  

- Supports **generic parallel or autorun events**.  
- Allows triggering events at the **start** and **end of battles**.  
- **Setup:** Please read the guide to configure correctly.  

---

### `DefaultOptions`
Exposes **built-in RPG Maker MV options** in the plugin manager:  

- Allows setting **default options** for first-time players.  
- Applies only when **`config.rpgsave` does not exist**.  
- Makes deployment easier and improves the **player’s first-time experience**.  

---

### `DefaultOptionsExtension`
An extension for `DefaultOptions`:  

- Adds an **API to set custom default plugin options**.  
- Works dynamically for any additional options you want to define.  

---

If you would like to **assist with the development** of these plugins, feel free to **submit a pull request by forking the repo**!

Or if you'd like to fuel my caffeine addiction and gimme a heart attack you can do so here https://ko-fi.com/hank_bloodshadow/tip
