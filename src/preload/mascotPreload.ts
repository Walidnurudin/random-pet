import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ActivitySnapshot, DailyHealthStats, MascotType, ReminderNotification } from '../types';

contextBridge.exposeInMainWorld('hewanNjir', {
  onActivityUpdate: (callback: (data: ActivitySnapshot) => void) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event: IpcRendererEvent, data: ActivitySnapshot) => callback(data);
    ipcRenderer.on('activity-update', subscription);
    return () => {
      ipcRenderer.removeListener('activity-update', subscription);
    };
  },

  onReminder: (callback: (data: ReminderNotification) => void) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event: IpcRendererEvent, data: ReminderNotification) => callback(data);
    ipcRenderer.on('reminder-notification', subscription);
    return () => {
      ipcRenderer.removeListener('reminder-notification', subscription);
    };
  },

  onHealthStatsUpdate: (callback: (data: DailyHealthStats) => void) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event: IpcRendererEvent, data: DailyHealthStats) => callback(data);
    ipcRenderer.on('health-stats-update', subscription);
    return () => {
      ipcRenderer.removeListener('health-stats-update', subscription);
    };
  },

  onCelebrationFeedback: (callback: (data: { type: string; praise: string; stats: DailyHealthStats }) => void) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event: IpcRendererEvent, data: { type: string; praise: string; stats: DailyHealthStats }) => callback(data);
    ipcRenderer.on('celebration-feedback', subscription);
    return () => {
      ipcRenderer.removeListener('celebration-feedback', subscription);
    };
  },

  onMascotChange: (callback: (data: { mascot: MascotType }) => void) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event: IpcRendererEvent, data: { mascot: MascotType }) => callback(data);
    ipcRenderer.on('mascot-change', subscription);
    return () => {
      ipcRenderer.removeListener('mascot-change', subscription);
    };
  },

  onInteractiveModeChange: (callback: (data: { interactive: boolean }) => void) => {
    if (typeof callback !== 'function') return () => {};
    const subscription = (_event: IpcRendererEvent, data: { interactive: boolean }) => callback(data);
    ipcRenderer.on('interactive-mode-change', subscription);
    return () => {
      ipcRenderer.removeListener('interactive-mode-change', subscription);
    };
  },

  getInitialState: () => ipcRenderer.invoke('mascot:get-initial-state'),

  setClickThrough: (enable: boolean) => {
    ipcRenderer.send('mascot:set-click-through', !!enable);
  },

  dragMove: (deltaX: number, deltaY: number) => {
    ipcRenderer.send('mascot:drag-move', { deltaX, deltaY });
  },

  petMascot: () => {
    ipcRenderer.send('mascot:pet');
  },

  feedMascot: () => {
    ipcRenderer.send('mascot:feed');
  },

  acknowledgeReminder: (type: 'hydration' | 'stretch' | 'eyeRest') => {
    ipcRenderer.send('reminder:acknowledge', { type });
  },

  snoozeReminder: (type: 'hydration' | 'stretch' | 'eyeRest', minutes: number = 5) => {
    ipcRenderer.send('reminder:snooze', { type, minutes });
  },

  getHealthStats: (): Promise<DailyHealthStats> => ipcRenderer.invoke('reminder:get-stats')
});

