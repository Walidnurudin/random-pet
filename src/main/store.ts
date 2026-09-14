import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { AppSettings } from '../types';

export class Store {
  private userDataPath: string;
  private configPath: string;
  private defaults: AppSettings;
  private data: AppSettings;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.configPath = path.join(this.userDataPath, 'config.json');
    this.defaults = {
      mascot: 'fox',
      idleThresholdSeconds: 30,
      sleepThresholdSeconds: 120,
      hydrationIntervalMinutes: 45,
      stretchIntervalMinutes: 75,
      eyeRestIntervalMinutes: 20,
      remindersEnabled: true,
      clickThroughEnabled: true,
      interactiveHotkey: 'CommandOrControl+Alt+M',
      simulateTypingHotkey: 'CommandOrControl+Shift+K',
      windowPosition: null,
      mascotScale: 1.0,
      speechBubblesEnabled: true
    };
    this.data = this.loadData();
  }

  private loadData(): AppSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        return { ...this.defaults, ...parsed };
      }
    } catch (err: any) {
      console.warn('Could not read config file, falling back to defaults:', err.message);
    }
    return { ...this.defaults };
  }

  public get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.data[key] !== undefined ? this.data[key] : this.defaults[key];
  }

  public getAll(): AppSettings {
    return { ...this.data };
  }

  public set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.data[key] = value;
    this.saveData();
  }

  public setMultiple(obj: Partial<AppSettings>): void {
    this.data = { ...this.data, ...obj };
    this.saveData();
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('Failed to save config file:', err.message);
    }
  }

  public reset(): AppSettings {
    this.data = { ...this.defaults };
    this.saveData();
    return this.data;
  }
}

let storeInstance: Store | null = null;
export function getStore(): Store {
  if (!storeInstance) {
    storeInstance = new Store();
  }
  return storeInstance;
}
