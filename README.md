# 🐾 Hewan Njir — Developer Desktop Mascot & Tamagotchi (TypeScript)

**Hewan Njir** is an interactive, frameless, and transparent floating desktop mascot engineered in **TypeScript** specifically for developers. Sitting unobtrusively in the corner of your workspace, it monitors developer activity (idle time via Electron's native `powerMonitor` and typing bursts), reacts dynamically with fluid 60FPS vector animations, and gently reminds you to stay hydrated, stretch, and rest your eyes.

---

## ✨ Key Features

1. **100% TypeScript Architecture**:
   - Complete type safety across Main, Preload, and Renderer layers.
   - Shared models for states, mascots, settings, and strictly typed IPC contracts.

2. **Floating Frameless & Transparent Canvas**:
   - Zero window border, completely transparent canvas floating seamlessly over your code editor, browser, and terminal.
   - **Visual Click-Through Mode**: Clicks pass directly through the mascot to background windows (like VS Code, JetBrains IDEs, or Terminal) so it never interrupts your workflow.
   - **Interactive Mode**: Press <kbd>Cmd</kbd> + <kbd>Alt</kbd> + <kbd>M</kbd> (macOS) or <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>M</kbd> (Windows/Linux) to unlock the mascot. You can drag it anywhere on your screen, double-click to pet it, or feed it snacks.

3. **System Activity Monitoring**:
   - Utilizes Electron's native `powerMonitor.getSystemIdleTime()` to detect when you are actively coding, taking a short break, or away.
   - State engine:
     - **🔥 Work**: Furious typing animation on an RGB mechanical keyboard with typing sparks and matrix streams.
     - **☕ Idle**: Breathing, looking around, blinking, waiting for input.
     - **💤 Sleep**: Curled up asleep with floating, fading `Zzz` particles when system is idle or locked.
     - **🎉 Celebrate**: Jumping with confetti bursts and joy when petting, completing streaks, or testing.
   - **Typing Burst Trigger**: Press <kbd>Cmd/Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> to simulate or test rapid typing activity bursts.

4. **Multiple Animated Companions**:
   - **🦊 Kitsune Fox**: Playful, bushy-tailed fox with mechanical keycaps and animated ears.
   - **🐱 Pixel Cat**: Calm lo-fi cat with gentle purrs and whiskers.
   - **🤖 Cyber-Bot**: Futuristic companion with LED glowing antenna, cyan visor, and hovering thruster.

5. **Health & Ergonomics Reminders**:
   - Gentle thought bubbles notifying you for **Hydration** (water check 💧), **Posture / Stretching** (straighten spine 🧘), and the **20-20-20 Eye Rest Rule** (look 20 feet away for 20 seconds 👀).
   - Fully customizable intervals in the Settings UI.

6. **System Tray & Settings Dashboard**:
   - System tray menu with real-time mascot status, quick mascot switcher, test actions, and settings access.
   - Dark-mode glassmorphic Settings dashboard to configure idle thresholds, reminder frequencies, and test all states.

7. **Hardened Security Architecture**:
   - `nodeIntegration: false`
   - `contextIsolation: true`
   - `sandbox: true`
   - Strict `contextBridge` exposure in `preload.ts` preventing DOM access to internal Node.js or Electron APIs.

---

## 📁 Project Structure

```text
hewan-njir/
├── package.json                   # Project scripts, TypeScript, Electron & builder configs
├── tsconfig.json                  # TypeScript compiler options
├── .gitignore                     # Build, node_modules, and OS exclusions
├── README.md                      # Documentation and quickstart guide
├── scripts/
│   ├── copy-assets.js             # Copies HTML, CSS & assets from src to dist
│   └── generate-assets.js         # Script generating PNG & icon assets
├── src/
│   ├── types/
│   │   └── index.ts               # Shared TypeScript interfaces & window declarations
│   ├── main/
│   │   ├── index.ts               # Main process entry, lifecycle & global hotkeys
│   │   ├── windowManager.ts       # Frameless mascot & settings window coordinator
│   │   ├── activityMonitor.ts     # powerMonitor idle detection & state machine
│   │   ├── trayManager.ts         # System tray icon, context menus & mood status
│   │   ├── reminderService.ts     # Health, hydration & stretch reminder engine
│   │   └── store.ts               # Persistent JSON configuration store
│   ├── preload/
│   │   ├── mascotPreload.ts       # ContextBridge API for mascot floating window
│   │   └── settingsPreload.ts     # ContextBridge API for settings window
│   ├── renderer/
│   │   ├── mascot/
│   │   │   ├── index.html         # Mascot canvas DOM container
│   │   │   ├── styles.css         # Transparent styles, pointer-events & badges
│   │   │   ├── mascotRenderer.ts  # 60FPS procedural vector animation engine
│   │   │   └── speechBubble.ts    # Thought bubble notifications & developer humor
│   │   └── settings/
│   │       ├── index.html         # Dark-mode glassmorphic settings dashboard
│   │       ├── styles.css         # Modern design system, switches & sliders
│   │       └── settingsRenderer.ts# Settings persistence & simulator triggers
│   └── assets/
│       ├── icons/                 # Tray and app icons
│       └── mascots/               # Mascot sprite placeholder assets
└── dist/                          # Compiled JavaScript & static assets output
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.x, v20.x, or later)
- **npm** (v9.x or later)

### Installation
1. Clone or navigate to the project directory:
   ```bash
   cd /path/to/hewan-njir
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Generate or refresh asset files:
   ```bash
   node scripts/generate-assets.js
   ```

---

## 🎮 Building & Running

### Build TypeScript
Compile TypeScript files and copy static assets into `dist/`:
```bash
npm run build
```

### Type Checking
Run strict TypeScript verification without emitting output:
```bash
npm run typecheck
```

### Watch Mode
Recompile on every TypeScript change during development:
```bash
npm run watch
```

### Development Mode
Builds and launches Electron with DevTools enabled:
```bash
npm run dev
```

### Production / Normal Mode
Builds and runs the desktop app directly:
```bash
npm start
```

Once launched:
- The mascot will appear in the bottom-right corner of your primary screen.
- An icon will appear in your macOS menu bar or Windows/Linux system tray.

---

## ⌨️ Default Hotkeys

| Shortcut (macOS) | Shortcut (Windows/Linux) | Action |
| :--- | :--- | :--- |
| <kbd>Cmd</kbd> + <kbd>Alt</kbd> + <kbd>M</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>M</kbd> | **Toggle Click-Through / Interactive Mode** |
| <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> | **Simulate Rapid Typing Burst** (Switches to Work state) |
| *Double Click* | *Double Click* | **Pet Mascot** (When Interactive Mode is unlocked) |
| *Drag Mouse* | *Drag Mouse* | **Move Mascot Window** (When Interactive Mode is unlocked) |

---

## 📦 Packaging & Building Executables

`Hewan Njir` includes preconfigured packaging scripts powered by `electron-builder`:

### Unpacked Binary Test
To test the packaging without creating an installer:
```bash
npm run pack
```

### Distributable Installers
To build cross-platform distributables:
```bash
npm run dist
```
- **macOS**: Generates `.dmg` and `.zip` in `dist/`
- **Windows**: Generates `.exe` (NSIS installer and portable) in `dist/`
- **Linux**: Generates `.AppImage` and `.tar.gz` in `dist/`

---

## 📄 License
MIT License. Created with ❤️ for developers who need a little fun during long debugging sessions.
