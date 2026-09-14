import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings } from '../types';

contextBridge.exposeInMainWorld('settingsApi', {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get-all'),
  saveSettings: (newSettings: Partial<AppSettings>): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('settings:save', newSettings);
  },
  triggerTestAction: (actionType: string, payload: Record<string, unknown> = {}) => {
    ipcRenderer.send('settings:test-action', { actionType, payload });
  },
  closeWindow: () => ipcRenderer.send('settings:close')
});
