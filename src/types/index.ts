export type MascotType = 'fox' | 'cat' | 'bot';

export type MascotState = 'work' | 'idle' | 'sleep' | 'celebrate';

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
  type: 'hydration' | 'stretch' | 'eyeRest';
  message: string;
  timestamp: number;
}

export interface AppSettings {
  mascot: MascotType;
  idleThresholdSeconds: number;
  sleepThresholdSeconds: number;
  hydrationIntervalMinutes: number;
  stretchIntervalMinutes: number;
  eyeRestIntervalMinutes: number;
  remindersEnabled: boolean;
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
  getInitialState: () => Promise<{
    snapshot: ActivitySnapshot;
    isClickThrough: boolean;
    mascot: MascotType;
    speechBubblesEnabled: boolean;
  }>;
  setClickThrough: (enable: boolean) => void;
  dragMove: (deltaX: number, deltaY: number) => void;
  petMascot: () => void;
  feedMascot: () => void;
}

export interface SettingsAPI {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (newSettings: Partial<AppSettings>) => Promise<{ success: boolean }>;
  triggerTestAction: (actionType: string, payload?: Record<string, unknown>) => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    hewanNjir?: HewanNjirAPI;
    settingsApi?: SettingsAPI;
    speechBubble?: any;
    mascotRenderer?: any;
  }
}
