import { EventEmitter } from 'events';
import { Notification } from 'electron';
import { Store } from './store';
import { ActivityMonitor } from './activityMonitor';
import { DailyHealthStats, ReminderNotification, ReminderTone } from '../types';

interface ReminderState {
  targetSeconds: number;
  elapsedActiveSeconds: number;
}

export class ReminderService extends EventEmitter {
  private store: Store;
  private activityMonitor?: ActivityMonitor;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private states: Record<'hydration' | 'stretch' | 'eyeRest', ReminderState>;
  private wasLongInactive: boolean = false;
  private lastReminderPayloads: Map<string, ReminderNotification> = new Map();

  constructor(store: Store, activityMonitor?: ActivityMonitor) {
    super();
    this.store = store;
    this.activityMonitor = activityMonitor;

    this.states = {
      hydration: { targetSeconds: 45 * 60, elapsedActiveSeconds: 0 },
      stretch: { targetSeconds: 75 * 60, elapsedActiveSeconds: 0 },
      eyeRest: { targetSeconds: 20 * 60, elapsedActiveSeconds: 0 }
    };
  }

  public setActivityMonitor(monitor: ActivityMonitor): void {
    this.activityMonitor = monitor;
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

    this.states.hydration.targetSeconds = Math.max(60, hydrationMins * 60);
    this.states.stretch.targetSeconds = Math.max(60, stretchMins * 60);
    this.states.eyeRest.targetSeconds = Math.max(60, eyeRestMins * 60);

    // Start 1-second heartbeat loop
    this.heartbeatTimer = setInterval(() => this.tick(), 1000);

    console.log(
      `[ReminderService] Smart Reminders active (Hydration: ${hydrationMins}m, Stretch: ${stretchMins}m, Eye: ${eyeRestMins}m)`
    );
  }

  private tick(): void {
    const isSmart = this.store.get('smartRemindersEnabled') ?? true;
    let isUserActive = true;
    let idleSeconds = 0;
    let typingIntensity = 0;

    if (this.activityMonitor) {
      const snap = this.activityMonitor.getCurrentSnapshot();
      idleSeconds = snap.idleSeconds;
      typingIntensity = snap.typingIntensity;
      const idleThreshold = this.store.get('idleThresholdSeconds') || 30;

      if (isSmart) {
        if (snap.state === 'sleep' || idleSeconds >= idleThreshold) {
          isUserActive = false;
        }
      }

      // Check long break return (>15 min idle)
      if (idleSeconds >= 900) {
        this.wasLongInactive = true;
      } else if (this.wasLongInactive && idleSeconds < 5) {
        this.wasLongInactive = false;
        this.handleReturnFromBreak();
      }
    }

    if (!isUserActive) {
      // Paused while AFK/sleeping
      return;
    }

    const flowProtection = this.store.get('flowProtectionEnabled') ?? true;

    // Tick each timer
    const types: Array<'hydration' | 'stretch' | 'eyeRest'> = ['hydration', 'stretch', 'eyeRest'];
    for (const type of types) {
      const state = this.states[type];
      state.elapsedActiveSeconds += 1;

      if (state.elapsedActiveSeconds >= state.targetSeconds) {
        // Flow-state protection check: if user is typing furiously, delay by 2 minutes
        if (flowProtection && typingIntensity > 60) {
          console.log(`[ReminderService] Flow-state detected (${typingIntensity}% typing), postponing ${type} reminder for 2 min`);
          state.elapsedActiveSeconds = state.targetSeconds - 120;
          continue;
        }

        // Reset and trigger
        state.elapsedActiveSeconds = 0;
        this.dispatchReminder(type);
      }
    }
  }

  private handleReturnFromBreak(): void {
    console.log('[ReminderService] User returned from a long break (>15m). Resetting stretch & eye rest counters.');
    this.states.stretch.elapsedActiveSeconds = 0;
    this.states.eyeRest.elapsedActiveSeconds = 0;

    const welcomePayload: ReminderNotification = {
      id: `welcome-${Date.now()}`,
      type: 'stretch',
      message: 'Selamat datang kembali! Badan udah seger, yuk lanjut ngoding! 🚀',
      timestamp: Date.now()
    };
    this.emit('reminder', welcomePayload);
  }

  public dispatchReminder(type: 'hydration' | 'stretch' | 'eyeRest', customMsg?: string): void {
    const tone: ReminderTone = (this.store.get('reminderTone') as ReminderTone) || 'slang';
    const message = customMsg || this.getRandomMessage(type, tone);
    const stats = this.store.getHealthStats();

    const payload: ReminderNotification = {
      id: `${type}-${Date.now()}`,
      type,
      message,
      timestamp: Date.now(),
      countToday: type === 'hydration' ? stats.waterCount : type === 'stretch' ? stats.stretchCount : stats.eyeRestCount,
      actionLabel: type === 'hydration' ? '💧 Sudah Minum' : type === 'stretch' ? '🧘 Sudah Stretch' : '👀 Sudah Istirahat'
    };

    this.lastReminderPayloads.set(type, payload);
    console.log(`[ReminderService] Reminder triggered (${type}, ${tone}): ${message}`);
    this.emit('reminder', payload);

    if (Notification.isSupported()) {
      try {
        const notif = new Notification({
          title: type === 'hydration' ? '💧 Waktunya Minum Air' : type === 'stretch' ? '🧘 Waktunya Peregangan' : '👀 Aturan 20-20-20 Mata',
          body: message,
          silent: !this.store.get('reminderSoundEnabled'),
          actions: [
            { type: 'button', text: payload.actionLabel || 'OK' }
          ]
        });

        notif.on('action', () => {
          this.acknowledgeReminder(type);
        });

        notif.on('click', () => {
          this.acknowledgeReminder(type);
        });

        notif.show();
      } catch (err) {
        // Non-fatal
      }
    }
  }

  public acknowledgeReminder(type: 'hydration' | 'stretch' | 'eyeRest'): DailyHealthStats {
    const updatedStats = this.store.incrementHealthStat(type);
    this.states[type].elapsedActiveSeconds = 0;

    console.log(`[ReminderService] Acknowledged ${type}. Today's stats:`, updatedStats);
    this.emit('health-stats-updated', updatedStats);

    // Emit celebration feedback
    const praises: Record<'hydration' | 'stretch' | 'eyeRest', string[]> = {
      hydration: [
        `Segerrr! Gelas ke-${updatedStats.waterCount} hari ini mantap! 💧`,
        `Nice! Tubuh terhidrasi, bug auto teratasi! 🥤`,
        `Gelas ke-${updatedStats.waterCount}! Jaga ginjal tetep sehat bro! 🚰`
      ],
      stretch: [
        `Mantap! Punggung udah lurus kembali, siap gass lagi! 🧘`,
        `Peregangan selesai! Tubuh lebih rileks dan berenergi! ⚡`,
        `Good posture, good code! 🦐 -> 🧍`
      ],
      eyeRest: [
        `Mata udah seger kembali! Siap memburu bug lagi! 👀`,
        `Mata relaks, fokus kembali maksimal! ✨`,
        `20 detik berharga untuk kesehatan mata! 🌿`
      ]
    };

    const list = praises[type];
    const praise = list[Math.floor(Math.random() * list.length)];
    this.emit('celebration-feedback', { type, praise, stats: updatedStats });

    return updatedStats;
  }

  public snoozeReminder(type: 'hydration' | 'stretch' | 'eyeRest', minutes: number = 5): void {
    const state = this.states[type];
    const snoozeSec = Math.max(60, minutes * 60);
    state.elapsedActiveSeconds = Math.max(0, state.targetSeconds - snoozeSec);
    console.log(`[ReminderService] Snoozed ${type} for ${minutes} minutes.`);
  }

  public getCountdowns(): Record<'hydration' | 'stretch' | 'eyeRest', { remainingMinutes: number; remainingSeconds: number }> {
    const result: any = {};
    const types: Array<'hydration' | 'stretch' | 'eyeRest'> = ['hydration', 'stretch', 'eyeRest'];
    for (const t of types) {
      const state = this.states[t];
      const remainingSec = Math.max(0, state.targetSeconds - state.elapsedActiveSeconds);
      result[t] = {
        remainingMinutes: Math.floor(remainingSec / 60),
        remainingSeconds: remainingSec % 60
      };
    }
    return result;
  }

  public triggerTestReminder(type: 'hydration' | 'stretch' | 'eyeRest' = 'hydration'): void {
    this.dispatchReminder(type);
  }

  public getRandomMessage(type: 'hydration' | 'stretch' | 'eyeRest', tone: ReminderTone = 'slang'): string {
    const pools: Record<ReminderTone, Record<'hydration' | 'stretch' | 'eyeRest', string[]>> = {
      slang: {
        hydration: [
          'Minum air dulu bro! Tubuhmu butuh hidrasi 💧',
          'Hydration check! Take a sip of fresh water 💧',
          'Jangan lupa minum, jangan cuma telen error melulu 🥤',
          'Air putih dulu njir, ginjalmu nangis tuh! 🚰'
        ],
        stretch: [
          'Peregangan dulu njir! Punggung udah kayak udang 🦐',
          'Stretch break! Roll those shoulders and relax your neck 🧘',
          'Berdiri bentar bro, jangan duduk terus kayak patung 🚶',
          'Lurusin badan dulu, jangan ampe encok di usia muda! 🦴'
        ],
        eyeRest: [
          'Aturan 20-20-20: Lihat objek 20 kaki jauhnya selama 20 detik 👀',
          'Rest your eyes! Look outside a window for 20 seconds 🌿',
          'Mata udah pedes belum? Istirahat sejenak njir 👓',
          'Tutup mata 20 detik, jangan tatap layar monitor mulu! 🙈'
        ]
      },
      gentle: {
        hydration: [
          'Waktunya minum air putih segar. Tubuhmu butuh hidrasi yang cukup 💧',
          'Jangan lupa minum air yaa, tetap jaga kesehatan dan fokusmu 🌿',
          'Yuk minum seteguk air, segarkan pikiranmu sejenak 🚰'
        ],
        stretch: [
          'Regangkan tangan dan pundak sejenak yaa. Istirahat sejenak itu penting 🧘',
          'Cobalah berdiri dan tarik napas dalam-dalam. Tubuhmu akan berterima kasih 🌸',
          'Luruskan punggung perlahan dan rilekskan leher sejenak 🌿'
        ],
        eyeRest: [
          'Istirahatkan matamu sejenak dengan memandang kejauhan selama 20 detik 👀',
          'Alihkan pandangan dari layar sebentar ya, biarkan matamu relaks 🍃',
          'Tatap jendela atau tanaman hijau selama 20 detik untuk menyegarkan mata 🌿'
        ]
      },
      discipline: {
        hydration: [
          'MINUM AIR SEKARANG! Dehidrasi menurunkan performa otak hingga 20%! 💧',
          'Ambil botol minummu dan habiskan satu gelas sekarang juga! 🛑',
          'Disiplin hidrasi! Jangan menunggu haus baru minum! 🥤'
        ],
        stretch: [
          'BERDIRI SEKARANG! Jangan biarkan tulang belakangmu rusak karena duduk terus! 🛑',
          'Peregangan 60 detik! Putar bahu, luruskan tulang punggung! 🥋',
          'Berhenti sejenak! Tinggalkan kursi dan jalan beberapa langkah! 🚶'
        ],
        eyeRest: [
          'LEPAS PANDANGAN DARI LAYAR! Aturan 20-20-20: Tatap kejauhan sekarang! 🛑',
          'Istirahat mata 20 detik! Fokus kembali setelah mata relaks! 👀',
          'Disiplin visual! Layar bukan segalanya, jaga penglihatanmu! 👓'
        ]
      },
      tech: {
        hydration: [
          'Memory leak detected in human RAM. Please refill with H2O 💧',
          'Garbage collection time! Flush your system with a glass of water 🥤',
          'System cooling alert: CPU temp high, drink water to cool down 💧'
        ],
        stretch: [
          'Spine refactoring needed! Posture syntax error: spine curved like shrimp 🦐',
          'Deadlock detected in shoulder joints! Execute stretch routine 🧘',
          'Hardware maintenance: Stand up and calibrate physical framework 🚶'
        ],
        eyeRest: [
          'Screen refresh rate 120Hz, but your eyes need 0Hz for 20 seconds 👀',
          'Visual buffer overflow: Look 20 feet away for 20 seconds 🌿',
          'Switching display output to reality for 20 seconds... 🕶️'
        ]
      }
    };

    const tonePool = pools[tone] || pools.slang;
    const list = tonePool[type] || pools.slang[type];
    return list[Math.floor(Math.random() * list.length)];
  }

  public stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
