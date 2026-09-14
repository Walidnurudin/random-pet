import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import { WindowManager } from './windowManager';
import { ActivityMonitor } from './activityMonitor';
import { ReminderService } from './reminderService';
import { Store } from './store';
import { MascotType } from '../types';

export class TrayManager {
  private windowManager: WindowManager;
  private activityMonitor: ActivityMonitor;
  private reminderService: ReminderService;
  private store: Store;
  private tray: Tray | null = null;

  constructor(
    windowManager: WindowManager,
    activityMonitor: ActivityMonitor,
    reminderService: ReminderService,
    store: Store
  ) {
    this.windowManager = windowManager;
    this.activityMonitor = activityMonitor;
    this.reminderService = reminderService;
    this.store = store;
  }

  public init(): void {
    const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'tray-icon.png');
    let trayIcon = nativeImage.createFromPath(iconPath);

    if (!trayIcon.isEmpty()) {
      trayIcon = trayIcon.resize({ width: 18, height: 18 });
      if (process.platform === 'darwin') {
        trayIcon.setTemplateImage(true);
      }
    }

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('Hewan Njir - Developer Desktop Mascot');

    this.updateMenu();

    this.activityMonitor.on('state-change', () => {
      this.updateMenu();
    });

    this.tray.on('double-click', () => {
      this.windowManager.createSettingsWindow();
    });
  }

  public updateMenu(): void {
    if (!this.tray) return;

    const currentSnapshot = this.activityMonitor.getCurrentSnapshot();
    const isClickThrough = this.windowManager.isClickThrough;
    const currentMascot = this.store.get('mascot');

    const stateLabels: Record<string, string> = {
      work: '🔥 Working / Coding',
      idle: '☕ Relaxing / Idle',
      sleep: '💤 Sleeping (Zzz)',
      celebrate: '🎉 Celebrating!'
    };

    const mascotLabels: Record<string, string> = {
      fox: '🦊 Kitsune Fox',
      cat: '🐱 Pixel Cat',
      bot: '🤖 Cyber-Bot'
    };

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Hewan Njir: ${mascotLabels[currentMascot] || 'Mascot'}`,
        enabled: false
      },
      {
        label: `Current Status: ${stateLabels[currentSnapshot.state] || currentSnapshot.state}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: isClickThrough ? '🔓 Enable Mouse Interaction' : '🔒 Enable Click-Through',
        accelerator: this.store.get('interactiveHotkey') || 'CommandOrControl+Alt+M',
        click: () => {
          this.windowManager.toggleClickThrough();
          this.updateMenu();
        }
      },
      {
        label: 'Choose Mascot',
        submenu: [
          {
            label: '🦊 Kitsune Fox',
            type: 'radio',
            checked: currentMascot === 'fox',
            click: () => this.switchMascot('fox')
          },
          {
            label: '🐱 Pixel Cat',
            type: 'radio',
            checked: currentMascot === 'cat',
            click: () => this.switchMascot('cat')
          },
          {
            label: '🤖 Cyber-Bot',
            type: 'radio',
            checked: currentMascot === 'bot',
            click: () => this.switchMascot('bot')
          }
        ]
      },
      {
        label: '⚡ Test Mascot Actions',
        submenu: [
          {
            label: 'Trigger Fast Typing (Work)',
            accelerator: this.store.get('simulateTypingHotkey') || 'CommandOrControl+Shift+K',
            click: () => this.activityMonitor.triggerTypingBurst(50)
          },
          {
            label: 'Force Idle Mode',
            click: () => this.activityMonitor.forceState('idle', 5000)
          },
          {
            label: 'Force Sleep Mode (Zzz)',
            click: () => this.activityMonitor.forceState('sleep', 6000)
          },
          {
            label: 'Celebrate! 🎉',
            click: () => this.activityMonitor.forceState('celebrate', 6000)
          },
          {
            label: 'Send Water Reminder 💧',
            click: () => this.reminderService.triggerTestReminder('hydration')
          },
          {
            label: 'Send Stretch Reminder 🧘',
            click: () => this.reminderService.triggerTestReminder('stretch')
          }
        ]
      },
      { type: 'separator' },
      {
        label: '⚙️ Settings...',
        click: () => {
          this.windowManager.createSettingsWindow();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Hewan Njir',
        click: () => {
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public switchMascot(mascotName: MascotType): void {
    this.store.set('mascot', mascotName);
    this.windowManager.sendToMascot('mascot-change', { mascot: mascotName });
    this.updateMenu();
  }
}
