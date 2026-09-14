import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { getStore, Store } from './store';
import { WindowManager } from './windowManager';
import { ActivityMonitor } from './activityMonitor';
import { ReminderService } from './reminderService';
import { TrayManager } from './trayManager';
import { ActivitySnapshot, AppSettings, ReminderNotification } from '../types';

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
  process.exit(0);
}

let store: Store;
let windowManager: WindowManager;
let activityMonitor: ActivityMonitor;
let reminderService: ReminderService;
let trayManager: TrayManager;

app.whenReady().then(() => {
  console.log('🚀 Starting Hewan Njir mascot application (TypeScript)...');

  store = getStore();
  windowManager = new WindowManager(store);
  activityMonitor = new ActivityMonitor(store);
  reminderService = new ReminderService(store);
  trayManager = new TrayManager(windowManager, activityMonitor, reminderService, store);

  windowManager.createMascotWindow();
  trayManager.init();

  activityMonitor.start();
  reminderService.start();

  activityMonitor.on('activity-stream', (data: ActivitySnapshot) => {
    windowManager.sendToMascot('activity-update', data);
  });

  reminderService.on('reminder', (reminderData: ReminderNotification) => {
    windowManager.sendToMascot('reminder-notification', reminderData);
  });

  registerGlobalShortcuts();
  setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMascotWindow();
    }
  });
});

function registerGlobalShortcuts(): void {
  globalShortcut.unregisterAll();

  const interactiveKey = store.get('interactiveHotkey') || 'CommandOrControl+Alt+M';
  try {
    const success = globalShortcut.register(interactiveKey, () => {
      const isNowInteractive = windowManager.toggleClickThrough();
      trayManager.updateMenu();
      console.log(`[Hotkey] Toggle interactive mode: ${isNowInteractive}`);
    });
    if (!success) {
      console.warn(`[Hotkey] Failed to register shortcut: ${interactiveKey}`);
    }
  } catch (err: any) {
    console.error(`[Hotkey] Error registering ${interactiveKey}:`, err.message);
  }

  const typingKey = store.get('simulateTypingHotkey') || 'CommandOrControl+Shift+K';
  try {
    const success = globalShortcut.register(typingKey, () => {
      console.log('[Hotkey] Triggered typing burst simulation');
      activityMonitor.triggerTypingBurst(50);
    });
    if (!success) {
      console.warn(`[Hotkey] Failed to register shortcut: ${typingKey}`);
    }
  } catch (err: any) {
    console.error(`[Hotkey] Error registering ${typingKey}:`, err.message);
  }
}

function setupIpcHandlers(): void {
  ipcMain.handle('mascot:get-initial-state', () => {
    return {
      snapshot: activityMonitor.getCurrentSnapshot(),
      isClickThrough: windowManager.isClickThrough,
      mascot: store.get('mascot'),
      speechBubblesEnabled: store.get('speechBubblesEnabled')
    };
  });

  ipcMain.on('mascot:set-click-through', (_event, enable: boolean) => {
    windowManager.setClickThrough(enable);
    trayManager.updateMenu();
  });

  ipcMain.on('mascot:drag-move', (_event, { deltaX, deltaY }: { deltaX: number; deltaY: number }) => {
    windowManager.moveMascotBy(deltaX, deltaY);
  });

  ipcMain.on('mascot:pet', () => {
    activityMonitor.forceState('celebrate', 4000);
    trayManager.updateMenu();
  });

  ipcMain.on('mascot:feed', () => {
    activityMonitor.forceState('celebrate', 4000);
    trayManager.updateMenu();
  });

  ipcMain.handle('settings:get-all', () => {
    return store.getAll();
  });

  ipcMain.handle('settings:save', (_event, newSettings: Partial<AppSettings>) => {
    store.setMultiple(newSettings);
    reminderService.start();
    windowManager.sendToMascot('mascot-change', { mascot: store.get('mascot') });
    registerGlobalShortcuts();
    trayManager.updateMenu();
    return { success: true };
  });

  ipcMain.on('settings:test-action', (_event, { actionType }: { actionType: string; payload?: Record<string, unknown> }) => {
    switch (actionType) {
      case 'work':
        activityMonitor.triggerTypingBurst(60);
        break;
      case 'idle':
        activityMonitor.forceState('idle', 5000);
        break;
      case 'sleep':
        activityMonitor.forceState('sleep', 6000);
        break;
      case 'celebrate':
        activityMonitor.forceState('celebrate', 5000);
        break;
      case 'water':
        reminderService.triggerTestReminder('hydration');
        break;
      case 'stretch':
        reminderService.triggerTestReminder('stretch');
        break;
      case 'eyeRest':
        reminderService.triggerTestReminder('eyeRest');
        break;
      default:
        console.warn('Unknown test action:', actionType);
    }
  });

  ipcMain.on('settings:close', () => {
    if (windowManager.settingsWindow) {
      windowManager.settingsWindow.close();
    }
  });
}

app.on('window-all-closed', () => {
  // Keep app active in tray
});

app.on('will-quit', () => {
  console.log('[Main] Cleaning up shortcuts and monitoring timers...');
  globalShortcut.unregisterAll();
  if (activityMonitor) activityMonitor.stop();
  if (reminderService) reminderService.stop();
});
