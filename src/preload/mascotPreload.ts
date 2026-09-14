import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ActivitySnapshot, MascotType, ReminderNotification } from '../types';

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
  }
});
