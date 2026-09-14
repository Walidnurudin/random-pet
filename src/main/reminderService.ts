import { EventEmitter } from 'events';
import { Notification } from 'electron';
import { Store } from './store';
import { ReminderNotification } from '../types';

export class ReminderService extends EventEmitter {
  private store: Store;
  private intervals: NodeJS.Timeout[] = [];

  constructor(store: Store) {
    super();
    this.store = store;
  }

  public start(): void {
    this.stop();
    if (!this.store.get('remindersEnabled')) {
      console.log('[ReminderService] Reminders are disabled in settings.');
      return;
    }

    const hydrationMins = this.store.get('hydrationIntervalMinutes') || 45;
    const stretchMins = this.store.get('stretchIntervalMinutes') || 75;
    const eyeRestMins = this.store.get('eyeRestIntervalMinutes') || 20;

    this.setupTimer('hydration', hydrationMins, [
      'Minum air dulu bro! Tubuhmu butuh hidrasi 💧',
      'Hydration check! Take a sip of fresh water 💧',
      'Jangan lupa minum, jangan cuma telen error melulu 🥤'
    ]);

    this.setupTimer('stretch', stretchMins, [
      'Peregangan dulu njir! Punggung udah kayak udang 🦐',
      'Stretch break! Roll those shoulders and relax your neck 🧘',
      'Berdiri bentar bro, jangan duduk terus kayak patung 🚶'
    ]);

    this.setupTimer('eyeRest', eyeRestMins, [
      'Aturan 20-20-20: Lihat objek 20 kaki jauhnya selama 20 detik 👀',
      'Rest your eyes! Look outside a window for 20 seconds 🌿',
      'Mata udah pedes belum? Istirahat sejenak njir 👓'
    ]);

    console.log('[ReminderService] Scheduled reminders (Hydration:', hydrationMins, 'm, Stretch:', stretchMins, 'm, Eye:', eyeRestMins, 'm)');
  }

  private setupTimer(type: 'hydration' | 'stretch' | 'eyeRest', intervalMinutes: number, messagePool: string[]): void {
    if (intervalMinutes <= 0) return;
    const ms = intervalMinutes * 60 * 1000;

    const timer = setInterval(() => {
      const randomMsg = messagePool[Math.floor(Math.random() * messagePool.length)];
      this.dispatchReminder(type, randomMsg);
    }, ms);

    this.intervals.push(timer);
  }

  public dispatchReminder(type: 'hydration' | 'stretch' | 'eyeRest', message: string): void {
    console.log(`[ReminderService] Reminder triggered (${type}): ${message}`);

    const payload: ReminderNotification = {
      type,
      message,
      timestamp: Date.now()
    };

    this.emit('reminder', payload);

    if (Notification.isSupported()) {
      try {
        const notif = new Notification({
          title: 'Hewan Njir Reminder 🐾',
          body: message,
          silent: true
        });
        notif.show();
      } catch (err) {
        // Non-fatal
      }
    }
  }

  public triggerTestReminder(type: 'hydration' | 'stretch' | 'eyeRest' = 'hydration'): void {
    const samples: Record<string, string> = {
      hydration: 'Minum air dulu bro! Jangan sampai dehidrasi pas ngoding 💧',
      stretch: 'Peregangan dulu njir! Luruskan punggung 🧘',
      eyeRest: 'Istirahatkan mata sejenak, tatap kejauhan 👀'
    };
    this.dispatchReminder(type, samples[type] || samples.hydration);
  }

  public stop(): void {
    for (const timer of this.intervals) {
      clearInterval(timer);
    }
    this.intervals = [];
  }
}
