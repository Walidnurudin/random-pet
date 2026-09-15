import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { AppSettings, DailyHealthStats } from '../types';

export class Store {
  private userDataPath: string;
  private configPath: string;
  private statsPath: string;
  private defaults: AppSettings;
  private data: AppSettings;
  private stats: DailyHealthStats;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.configPath = path.join(this.userDataPath, 'config.json');
    this.statsPath = path.join(this.userDataPath, 'health_stats.json');
    this.defaults = {
      mascot: 'fox',
      idleThresholdSeconds: 30,
      sleepThresholdSeconds: 120,
      hydrationIntervalMinutes: 45,
      stretchIntervalMinutes: 75,
      eyeRestIntervalMinutes: 20,
      remindersEnabled: true,
      reminderTone: 'slang',
      smartRemindersEnabled: true,
      flowProtectionEnabled: true,
      reminderSoundEnabled: true,
      clickThroughEnabled: true,
      interactiveHotkey: 'CommandOrControl+Alt+M',
      simulateTypingHotkey: 'CommandOrControl+Shift+K',
      windowPosition: null,
      mascotScale: 1.0,
      speechBubblesEnabled: true
    };
    this.data = this.loadData();
    this.stats = this.loadStats();
  }

  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  private loadStats(): DailyHealthStats {
    const today = this.getTodayString();
    const defaultStats: DailyHealthStats = {
      date: today,
      waterCount: 0,
      stretchCount: 0,
      eyeRestCount: 0
    };

    try {
      if (fs.existsSync(this.statsPath)) {
        const raw = fs.readFileSync(this.statsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === today) {
          return { ...defaultStats, ...parsed };
        }
      }
    } catch (err: any) {
      console.warn('Could not read health stats file:', err.message);
    }
    return defaultStats;
  }

  public getHealthStats(): DailyHealthStats {
    const today = this.getTodayString();
    if (this.stats.date !== today) {
      this.stats = {
        date: today,
        waterCount: 0,
        stretchCount: 0,
        eyeRestCount: 0
      };
      this.saveStats();
    }
    return { ...this.stats };
  }

  public incrementHealthStat(type: 'hydration' | 'stretch' | 'eyeRest'): DailyHealthStats {
    this.getHealthStats(); // ensure fresh day check
    if (type === 'hydration') {
      this.stats.waterCount += 1;
    } else if (type === 'stretch') {
      this.stats.stretchCount += 1;
    } else if (type === 'eyeRest') {
      this.stats.eyeRestCount += 1;
    }
    this.saveStats();
    return { ...this.stats };
  }

  private saveStats(): void {
    try {
      fs.writeFileSync(this.statsPath, JSON.stringify(this.stats, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('Failed to save health stats file:', err.message);
    }
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

