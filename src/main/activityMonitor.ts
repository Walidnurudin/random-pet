import { powerMonitor } from 'electron';
import { EventEmitter } from 'events';
import { Store } from './store';
import { ActivitySnapshot, MascotState, StateChangeEvent } from '../types';

export class ActivityMonitor extends EventEmitter {
  private store: Store;
  private currentState: MascotState = 'idle';
  private typingIntensity: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private isLockedOrSuspended: boolean = false;
  private readonly pollIntervalMs: number = 1000;
  private forcedState: MascotState | null = null;
  private forcedStateTimeout: NodeJS.Timeout | null = null;

  constructor(store: Store) {
    super();
    this.store = store;
    this.initPowerMonitorEvents();
  }

  private initPowerMonitorEvents(): void {
    powerMonitor.on('suspend', () => {
      this.isLockedOrSuspended = true;
      this.setState('sleep', 'System suspended');
    });

    powerMonitor.on('resume', () => {
      this.isLockedOrSuspended = false;
      this.setState('idle', 'System resumed');
    });

    powerMonitor.on('lock-screen', () => {
      this.isLockedOrSuspended = true;
      this.setState('sleep', 'Screen locked');
    });

    powerMonitor.on('unlock-screen', () => {
      this.isLockedOrSuspended = false;
      this.setState('idle', 'Screen unlocked');
    });
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.pollIntervalMs);
    console.log('[ActivityMonitor] Started polling at', this.pollIntervalMs, 'ms interval');
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public triggerTypingBurst(amount: number = 40): void {
    this.typingIntensity = Math.min(100, this.typingIntensity + amount);
    if (!this.forcedState && !this.isLockedOrSuspended) {
      this.setState('work', 'Typing burst triggered');
    }
    this.emitUpdate();
  }

  public forceState(state: MascotState, durationMs: number = 5000): void {
    if (this.forcedStateTimeout) {
      clearTimeout(this.forcedStateTimeout);
    }
    this.forcedState = state;
    this.setState(state, 'Forced state');

    this.forcedStateTimeout = setTimeout(() => {
      this.forcedState = null;
      this.tick();
    }, durationMs);
  }

  private tick(): void {
    if (this.typingIntensity > 0) {
      this.typingIntensity = Math.max(0, this.typingIntensity - 15);
    }

    if (this.isLockedOrSuspended) {
      this.emitUpdate();
      return;
    }

    if (this.forcedState) {
      this.emitUpdate();
      return;
    }

    let idleTimeSeconds = 0;
    try {
      idleTimeSeconds = powerMonitor.getSystemIdleTime();
    } catch (e: any) {
      console.warn('[ActivityMonitor] Could not get idle time:', e.message);
    }

    const idleThreshold = this.store.get('idleThresholdSeconds') || 30;
    const sleepThreshold = this.store.get('sleepThresholdSeconds') || 120;

    let targetState: MascotState = 'idle';

    if (idleTimeSeconds >= sleepThreshold) {
      targetState = 'sleep';
    } else if (idleTimeSeconds >= idleThreshold) {
      targetState = 'idle';
    } else {
      if (this.typingIntensity > 20 || idleTimeSeconds <= 4) {
        targetState = 'work';
      } else {
        targetState = 'idle';
      }
    }

    if (targetState !== this.currentState) {
      this.setState(targetState, `Idle: ${idleTimeSeconds}s, Intensity: ${this.typingIntensity}`);
    } else {
      this.emitUpdate(idleTimeSeconds);
    }
  }

  public setState(newState: MascotState, reason: string = ''): void {
    const previousState = this.currentState;
    this.currentState = newState;
    console.log(`[ActivityMonitor] State change: ${previousState} -> ${newState} (${reason})`);

    const changeEvent: StateChangeEvent = {
      state: this.currentState,
      previousState,
      reason,
      timestamp: Date.now()
    };
    this.emit('state-change', changeEvent);
    this.emitUpdate();
  }

  private emitUpdate(idleTimeSeconds: number | null = null): void {
    let idleSec = idleTimeSeconds;
    if (idleSec === null) {
      try {
        idleSec = powerMonitor.getSystemIdleTime();
      } catch (e) {
        idleSec = 0;
      }
    }

    const payload: ActivitySnapshot = {
      state: this.currentState,
      idleSeconds: idleSec ?? 0,
      typingIntensity: Math.round(this.typingIntensity),
      mascot: this.store.get('mascot'),
      timestamp: Date.now()
    };

    this.emit('activity-stream', payload);
  }

  public getCurrentSnapshot(): ActivitySnapshot {
    let idleSec = 0;
    try {
      idleSec = powerMonitor.getSystemIdleTime();
    } catch (e) {}

    return {
      state: this.currentState,
      idleSeconds: idleSec,
      typingIntensity: Math.round(this.typingIntensity),
      mascot: this.store.get('mascot'),
      timestamp: Date.now()
    };
  }
}
