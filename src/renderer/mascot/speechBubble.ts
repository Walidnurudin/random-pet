import { MascotState } from '../../types';

export class SpeechBubbleController {
  private bubbleEl: HTMLElement | null;
  private textEl: HTMLElement | null;
  private hideTimeout: NodeJS.Timeout | null = null;
  private lastThoughtTime: number = 0;

  constructor() {
    this.bubbleEl = document.getElementById('speech-bubble');
    this.textEl = document.getElementById('speech-text');
  }

  public show(text: string, durationMs: number = 4500): void {
    if (!this.bubbleEl || !this.textEl) return;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    this.textEl.textContent = text;
    this.bubbleEl.classList.remove('hidden');

    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, durationMs);
  }

  public hide(): void {
    if (this.bubbleEl) {
      this.bubbleEl.classList.add('hidden');
    }
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
