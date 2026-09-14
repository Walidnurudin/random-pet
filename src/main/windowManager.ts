import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { Store } from './store';

export class WindowManager {
  private store: Store;
  public mascotWindow: BrowserWindow | null = null;
  public settingsWindow: BrowserWindow | null = null;
  public isClickThrough: boolean = true;

  constructor(store: Store) {
    this.store = store;
  }

  public createMascotWindow(): BrowserWindow {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    const windowWidth = 280;
    const windowHeight = 260;

    const savedPos = this.store.get('windowPosition');
    let x = screenWidth - windowWidth - 30;
    let y = screenHeight - windowHeight - 30;

    if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
      if (savedPos.x >= 0 && savedPos.x < screenWidth && savedPos.y >= 0 && savedPos.y < screenHeight) {
        x = savedPos.x;
        y = savedPos.y;
      }
    }

    this.mascotWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.round(x),
      y: Math.round(y),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      hasShadow: false,
      skipTaskbar: true,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'mascotPreload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        devTools: process.argv.includes('--dev')
      }
    });

    this.mascotWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.mascotWindow.setAlwaysOnTop(true, 'floating');

    this.setClickThrough(true);

    this.mascotWindow.loadFile(path.join(__dirname, '..', 'renderer', 'mascot', 'index.html'));

    if (process.argv.includes('--dev')) {
      console.log('[WindowManager] Dev mode enabled for Mascot Window');
    }

    this.mascotWindow.on('closed', () => {
      this.mascotWindow = null;
    });

    this.mascotWindow.on('moved', () => {
      if (!this.mascotWindow) return;
      const [curX, curY] = this.mascotWindow.getPosition();
      this.store.set('windowPosition', { x: curX, y: curY });
    });

    return this.mascotWindow;
  }

  public createSettingsWindow(): BrowserWindow {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.show();
      this.settingsWindow.focus();
      return this.settingsWindow;
    }

    this.settingsWindow = new BrowserWindow({
      width: 680,
      height: 600,
      title: 'Hewan Njir - Settings',
      resizable: false,
      minimizable: true,
      maximizable: false,
      show: false,
      backgroundColor: '#11141c',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'settingsPreload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    this.settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings', 'index.html'));

    this.settingsWindow.once('ready-to-show', () => {
      if (this.settingsWindow) {
        this.settingsWindow.show();
        this.settingsWindow.focus();
      }
    });

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    return this.settingsWindow;
  }

  public setClickThrough(enable: boolean): void {
    if (!this.mascotWindow || this.mascotWindow.isDestroyed()) return;
    this.isClickThrough = enable;

    try {
      if (enable) {
        this.mascotWindow.setIgnoreMouseEvents(true, { forward: true });
        this.mascotWindow.setFocusable(false);
      } else {
        this.mascotWindow.setIgnoreMouseEvents(false);
        this.mascotWindow.setFocusable(true);
      }

      this.mascotWindow.webContents.send('interactive-mode-change', {
        interactive: !enable
      });
      console.log(`[WindowManager] Click-through set to: ${enable} (Interactive: ${!enable})`);
    } catch (err: any) {
      console.error('[WindowManager] Error setting click-through:', err.message);
    }
  }

  public toggleClickThrough(): boolean {
    this.setClickThrough(!this.isClickThrough);
    return !this.isClickThrough;
  }

  public moveMascotBy(deltaX: number, deltaY: number): void {
    if (!this.mascotWindow || this.mascotWindow.isDestroyed()) return;
    const [curX, curY] = this.mascotWindow.getPosition();
    this.mascotWindow.setPosition(curX + deltaX, curY + deltaY);
  }

  public sendToMascot(channel: string, data: any): void {
    if (this.mascotWindow && !this.mascotWindow.isDestroyed()) {
      this.mascotWindow.webContents.send(channel, data);
    }
  }

  public sendToSettings(channel: string, data: any): void {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.webContents.send(channel, data);
    }
  }
}
