import { MascotState, ReminderNotification } from '../../types';

export class SpeechBubbleController {
  private bubbleEl: HTMLElement | null;
  private textEl: HTMLElement | null;
  private actionsEl: HTMLElement | null;
  private actionBtn: HTMLElement | null;
  private snoozeBtn: HTMLElement | null;
  private hideTimeout: NodeJS.Timeout | null = null;
  private lastThoughtTime: number = 0;
  private currentReminderType: 'hydration' | 'stretch' | 'eyeRest' | null = null;

  constructor() {
    this.bubbleEl = document.getElementById('speech-bubble');
    this.textEl = document.getElementById('speech-text');
    this.actionsEl = document.getElementById('speech-actions');
    this.actionBtn = document.getElementById('bubble-action-btn');
    this.snoozeBtn = document.getElementById('bubble-snooze-btn');

    this.setupListeners();
  }

  private setupListeners(): void {
    if (this.actionBtn) {
      this.actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentReminderType && window.hewanNjir) {
          window.hewanNjir.acknowledgeReminder(this.currentReminderType);
          this.show('Mantap jiwa! Kebiasaan sehat berlanjut 🌟', 3000);
        }
      });
    }

    if (this.snoozeBtn) {
      this.snoozeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentReminderType && window.hewanNjir) {
          window.hewanNjir.snoozeReminder(this.currentReminderType, 5);
          this.show('Siap! Diingetin lagi 5 menit ⏰', 2500);
        }
      });
    }

    if (this.bubbleEl) {
      this.bubbleEl.addEventListener('mouseenter', () => {
        if (this.bubbleEl?.classList.contains('has-actions') && window.hewanNjir) {
          window.hewanNjir.setClickThrough(false);
        }
      });

      this.bubbleEl.addEventListener('mouseleave', () => {
        if (this.bubbleEl?.classList.contains('has-actions') && window.hewanNjir) {
          window.hewanNjir.setClickThrough(true);
        }
      });
    }
  }

  public show(text: string, durationMs: number = 4500): void {
    if (!this.bubbleEl || !this.textEl) return;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    this.currentReminderType = null;
    this.bubbleEl.classList.remove('has-actions');
    if (this.actionsEl) {
      this.actionsEl.classList.add('hidden');
    }

    this.textEl.textContent = text;
    this.bubbleEl.classList.remove('hidden');

    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, durationMs);
  }

  public showReminder(reminder: ReminderNotification, durationMs: number = 8000): void {
    if (!this.bubbleEl || !this.textEl) return;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    this.currentReminderType = reminder.type;
    this.textEl.textContent = reminder.message;

    if (this.actionBtn) {
      this.actionBtn.textContent = reminder.actionLabel || (reminder.type === 'hydration' ? '💧 Sudah Minum' : '🧘 Sudah Stretch');
    }

    if (this.actionsEl) {
      this.actionsEl.classList.remove('hidden');
    }
    this.bubbleEl.classList.add('has-actions');
    this.bubbleEl.classList.remove('hidden');

    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, durationMs);
  }

  public hide(): void {
    if (this.bubbleEl) {
      this.bubbleEl.classList.add('hidden');
      this.bubbleEl.classList.remove('has-actions');
    }
    if (this.actionsEl) {
      this.actionsEl.classList.add('hidden');
    }
    this.currentReminderType = null;
  }

  public onStateChange(state: MascotState): void {
    const quotes: Record<MascotState, string[]> = {
      work: [
        'Gass ngoding njir! 🔥',
        'Sat set sat set beres! ⚡',
        'Mode dewa diaktifkan! 🧙‍♂️',
        'Hacking the mainframe... 💻',
        'Keyboardnya ampe berasap njir! 💨'
      ],
      idle: [
        'Ngelamun njir? Mikirin bug ya? 🐛',
        'Mikirin algoritma apa overthinking? 🤔',
        'Bentar, lagi compile di otak... 🧠',
        'Coffee break dulu ga sih? ☕'
      ],
      sleep: [
        'Zzz... Jangan berisik njir 💤',
        'Snooze mode activated 😴',
        'Mimpiin kode tanpa bug... 🌙'
      ],
      celebrate: [
        'GGWP! Kode jalan tanpa error! 🎉',
        'Anjayyy deploy sukses! 🚀',
        'Level up developer! ⭐'
      ]
    };

    const list = quotes[state];
    if (list && list.length > 0) {
      const now = Date.now();
      if (now - this.lastThoughtTime > 12000) {
        this.lastThoughtTime = now;
        const randomQuote = list[Math.floor(Math.random() * list.length)];
        this.show(randomQuote, 4000);
      }
    }
  }
}

// Attach to window
const controller = new SpeechBubbleController();
(window as any).speechBubble = controller;

