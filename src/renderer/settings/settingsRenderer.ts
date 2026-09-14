import { AppSettings, MascotType } from '../../types';

export class SettingsController {
  private saveTimeout: NodeJS.Timeout | null = null;
  private statusEl: HTMLElement | null;

  constructor() {
    this.statusEl = document.getElementById('save-status');
    this.initTabs();
    this.initFormControls();
    this.initSimulator();
    this.loadSettings();
  }

  private initTabs(): void {
    const tabs = document.querySelectorAll('.nav-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        if (targetId) {
          const targetPane = document.getElementById(targetId);
          if (targetPane) targetPane.classList.add('active');
        }
      });
    });
  }

  private async loadSettings(): Promise<void> {
    if (!window.settingsApi) {
      console.warn('window.settingsApi not available');
      return;
    }

    try {
      const config: AppSettings = await window.settingsApi.getSettings();
      if (!config) return;

      const mascotRadios = document.querySelectorAll<HTMLInputElement>('input[name="mascot-choice"]');
      mascotRadios.forEach(radio => {
        if (radio.value === config.mascot) {
          radio.checked = true;
        }
      });

      const speechEl = document.getElementById('setting-speech-bubbles') as HTMLInputElement | null;
      if (speechEl) speechEl.checked = !!config.speechBubblesEnabled;

      const idleEl = document.getElementById('setting-idle-threshold') as HTMLInputElement | null;
      const idleLabel = document.getElementById('label-idle-threshold');
      if (idleEl && idleLabel) {
        idleEl.value = String(config.idleThresholdSeconds || 30);
        idleLabel.textContent = `${idleEl.value}s`;
      }

      const sleepEl = document.getElementById('setting-sleep-threshold') as HTMLInputElement | null;
      const sleepLabel = document.getElementById('label-sleep-threshold');
      if (sleepEl && sleepLabel) {
        sleepEl.value = String(config.sleepThresholdSeconds || 120);
        sleepLabel.textContent = `${sleepEl.value}s`;
      }

      const remEnabledEl = document.getElementById('setting-reminders-enabled') as HTMLInputElement | null;
      if (remEnabledEl) remEnabledEl.checked = !!config.remindersEnabled;

      const hydEl = document.getElementById('setting-hydration-interval') as HTMLInputElement | null;
      const hydLabel = document.getElementById('label-hydration-interval');
      if (hydEl && hydLabel) {
        hydEl.value = String(config.hydrationIntervalMinutes || 45);
        hydLabel.textContent = `${hydEl.value} min`;
      }

      const stretchEl = document.getElementById('setting-stretch-interval') as HTMLInputElement | null;
      const stretchLabel = document.getElementById('label-stretch-interval');
      if (stretchEl && stretchLabel) {
        stretchEl.value = String(config.stretchIntervalMinutes || 75);
        stretchLabel.textContent = `${stretchEl.value} min`;
      }

      const eyeEl = document.getElementById('setting-eye-interval') as HTMLInputElement | null;
      const eyeLabel = document.getElementById('label-eye-interval');
      if (eyeEl && eyeLabel) {
        eyeEl.value = String(config.eyeRestIntervalMinutes || 20);
        eyeLabel.textContent = `${eyeEl.value} min`;
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  private initFormControls(): void {
    const sliders = [
      { id: 'setting-idle-threshold', labelId: 'label-idle-threshold', unit: 's' },
      { id: 'setting-sleep-threshold', labelId: 'label-sleep-threshold', unit: 's' },
      { id: 'setting-hydration-interval', labelId: 'label-hydration-interval', unit: ' min' },
      { id: 'setting-stretch-interval', labelId: 'label-stretch-interval', unit: ' min' },
      { id: 'setting-eye-interval', labelId: 'label-eye-interval', unit: ' min' }
    ];

    sliders.forEach(({ id, labelId, unit }) => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      const label = document.getElementById(labelId);
      if (input && label) {
        input.addEventListener('input', () => {
          label.textContent = `${input.value}${unit}`;
          this.queueSave();
        });
      }
    });

    document.querySelectorAll('input[name="mascot-choice"]').forEach(radio => {
      radio.addEventListener('change', () => this.queueSave());
    });

    const checkboxes = ['setting-speech-bubbles', 'setting-reminders-enabled'];
    checkboxes.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this.queueSave());
    });

    const btnClose = document.getElementById('btn-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (window.settingsApi) {
          window.settingsApi.closeWindow();
        }
      });
    }
  }

  private initSimulator(): void {
    const simBtns = document.querySelectorAll<HTMLButtonElement>('.sim-btn');
    simBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (window.settingsApi && action) {
          window.settingsApi.triggerTestAction(action);
          this.flashStatus(`Triggered action: ${action.toUpperCase()}`);
        }
      });
    });
  }

  private queueSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    if (this.statusEl) {
      this.statusEl.textContent = 'Saving changes...';
      this.statusEl.style.color = '#ffb300';
    }

    this.saveTimeout = setTimeout(() => {
      this.persist();
    }, 400);
  }

  private async persist(): Promise<void> {
    if (!window.settingsApi) return;

    const selectedMascot = (document.querySelector('input[name="mascot-choice"]:checked') as HTMLInputElement)?.value as MascotType || 'fox';
    const speechBubbles = (document.getElementById('setting-speech-bubbles') as HTMLInputElement)?.checked ?? true;
    const idleThreshold = parseInt((document.getElementById('setting-idle-threshold') as HTMLInputElement)?.value || '30', 10);
    const sleepThreshold = parseInt((document.getElementById('setting-sleep-threshold') as HTMLInputElement)?.value || '120', 10);
    const remindersEnabled = (document.getElementById('setting-reminders-enabled') as HTMLInputElement)?.checked ?? true;
    const hydrationInterval = parseInt((document.getElementById('setting-hydration-interval') as HTMLInputElement)?.value || '45', 10);
    const stretchInterval = parseInt((document.getElementById('setting-stretch-interval') as HTMLInputElement)?.value || '75', 10);
    const eyeRestInterval = parseInt((document.getElementById('setting-eye-interval') as HTMLInputElement)?.value || '20', 10);

    const payload: Partial<AppSettings> = {
      mascot: selectedMascot,
      speechBubblesEnabled: speechBubbles,
      idleThresholdSeconds: idleThreshold,
      sleepThresholdSeconds: sleepThreshold,
      remindersEnabled,
      hydrationIntervalMinutes: hydrationInterval,
      stretchIntervalMinutes: stretchInterval,
      eyeRestIntervalMinutes: eyeRestInterval
    };

    try {
      await window.settingsApi.saveSettings(payload);
      this.flashStatus('Settings saved successfully ✓');
    } catch (err) {
      console.error('Failed to save settings:', err);
      this.flashStatus('Error saving settings');
      if (this.statusEl) this.statusEl.style.color = '#f85149';
    }
  }

  private flashStatus(text: string): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = text;
    this.statusEl.style.color = '#3fb950';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SettingsController();
});
