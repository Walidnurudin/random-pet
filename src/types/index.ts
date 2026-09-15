export type MascotType = 'fox' | 'cat' | 'bot' | 'panda' | 'penguin' | 'doge';

export type MascotState = 'work' | 'idle' | 'sleep' | 'celebrate';

export type ReminderTone = 'slang' | 'gentle' | 'discipline' | 'tech';

export interface ActivitySnapshot {
  state: MascotState;
  idleSeconds: number;
  typingIntensity: number;
  mascot: MascotType;
  timestamp: number;
}

export interface StateChangeEvent {
  state: MascotState;
  previousState: MascotState;
  reason: string;
  timestamp: number;
}

export interface ReminderNotification {
  id: string;
  type: 'hydration' | 'stretch' | 'eyeRest';
  message: string;
  timestamp: number;
  countToday?: number;
  actionLabel?: string;
}

export interface DailyHealthStats {
  date: string; // YYYY-MM-DD
  waterCount: number;
  stretchCount: number;
  eyeRestCount: number;
}

export interface AppSettings {
  mascot: MascotType;
  idleThresholdSeconds: number;
  sleepThresholdSeconds: number;
  hydrationIntervalMinutes: number;
  stretchIntervalMinutes: number;
  eyeRestIntervalMinutes: number;
  remindersEnabled: boolean;
  reminderTone: ReminderTone;
  smartRemindersEnabled: boolean;
  flowProtectionEnabled: boolean;
  reminderSoundEnabled: boolean;
  clickThroughEnabled: boolean;
  interactiveHotkey: string;
  simulateTypingHotkey: string;
  windowPosition: { x: number; y: number } | null;
  mascotScale: number;
  speechBubblesEnabled: boolean;
}

export interface HewanNjirAPI {
  onActivityUpdate: (callback: (data: ActivitySnapshot) => void) => () => void;
  onReminder: (callback: (data: ReminderNotification) => void) => () => void;
  onMascotChange: (callback: (data: { mascot: MascotType }) => void) => () => void;
  onInteractiveModeChange: (callback: (data: { interactive: boolean }) => void) => () => void;
  onHealthStatsUpdate: (callback: (data: DailyHealthStats) => void) => () => void;
  onCelebrationFeedback: (callback: (data: { type: string; praise: string; stats: DailyHealthStats }) => void) => () => void;
  getInitialState: () => Promise<{
    snapshot: ActivitySnapshot;
    isClickThrough: boolean;
    mascot: MascotType;
    speechBubblesEnabled: boolean;
    healthStats: DailyHealthStats;
    reminderSoundEnabled: boolean;
  }>;
  setClickThrough: (enable: boolean) => void;
  dragMove: (deltaX: number, deltaY: number) => void;
  petMascot: () => void;
  feedMascot: () => void;
  acknowledgeReminder: (type: 'hydration' | 'stretch' | 'eyeRest') => void;
  snoozeReminder: (type: 'hydration' | 'stretch' | 'eyeRest', minutes?: number) => void;
  getHealthStats: () => Promise<DailyHealthStats>;
}

export interface SettingsAPI {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (newSettings: Partial<AppSettings>) => Promise<{ success: boolean }>;
  triggerTestAction: (actionType: string, payload?: Record<string, unknown>) => void;
  closeWindow: () => void;
  getHealthStats: () => Promise<DailyHealthStats>;
}

declare global {
  interface Window {
    hewanNjir?: HewanNjirAPI;
    settingsApi?: SettingsAPI;
    speechBubble?: any;
    mascotRenderer?: any;
  }
}

