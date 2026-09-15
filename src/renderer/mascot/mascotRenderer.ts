import { ActivitySnapshot, MascotState, MascotType, ReminderNotification } from '../../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  char?: string | null;
  alpha: number;
  life: number;
}

interface ZzzParticle {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
  text: string;
}

class SoundSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playWaterDrop(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(1250, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  public playChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [587.33, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.12, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.42);
      });
    } catch (e) {}
  }

  public playCelebration(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.15, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.32);
      });
    } catch (e) {}
  }
}

export class MascotRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private appEl: HTMLElement;
  private interactiveBadge: HTMLElement;
  private quickActions: HTMLElement;
  private statusIndicator: HTMLElement;

  private currentMascot: MascotType = 'fox';
  private state: MascotState = 'idle';
  private typingIntensity: number = 0;
  private isInteractive: boolean = false;

  private time: number = 0;
  private blinkTimer: number = 0;
  private isBlinking: boolean = false;
  private particles: Particle[] = [];
  private zzzParticles: ZzzParticle[] = [];

  private isDragging: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private width: number = 240;
  private height: number = 190;
  private soundSynth: SoundSynth = new SoundSynth();

  constructor() {
    this.canvas = document.getElementById('mascot-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.appEl = document.getElementById('mascot-app') as HTMLElement;
    this.interactiveBadge = document.getElementById('interactive-badge') as HTMLElement;
    this.quickActions = document.getElementById('quick-actions') as HTMLElement;
    this.statusIndicator = document.getElementById('status-indicator') as HTMLElement;

    this.setupCanvasDpi();
    this.setupEventListeners();
    this.initIpc();

    requestAnimationFrame((t) => this.loop(t));
  }

  private setupCanvasDpi(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  private async initIpc(): Promise<void> {
    if (!window.hewanNjir) {
      console.warn('[Renderer] window.hewanNjir IPC not found');
      return;
    }

    try {
      const init = await window.hewanNjir.getInitialState();
      if (init) {
        this.currentMascot = init.mascot || 'fox';
        this.soundSynth.enabled = init.reminderSoundEnabled ?? true;
        this.setInteractiveMode(!init.isClickThrough);
        if (init.snapshot) {
          this.updateState(init.snapshot.state, init.snapshot.typingIntensity);
        }
      }
    } catch (e) {
      console.error('Failed to get initial mascot state:', e);
    }

    window.hewanNjir.onActivityUpdate((data: ActivitySnapshot) => {
      this.updateState(data.state, data.typingIntensity);
    });

    window.hewanNjir.onMascotChange((data: { mascot: MascotType }) => {
      if (data.mascot) {
        this.currentMascot = data.mascot;
        const greetings: Record<MascotType, { text: string; color: string }> = {
          fox: { text: 'Kitsune Fox siap temenin ngoding! 🦊🔥', color: '#ff7a00' },
          cat: { text: 'Meow! Pixel Cat siap santuy nemenin debug! 🐱💤', color: '#929cb8' },
          bot: { text: 'BEEP BOOP! Cyber-Bot online and ready to compute! 🤖⚡', color: '#00e5ff' },
          panda: { text: 'Halo! Begadang Panda siap ngoding semaleman! 🐼🎋', color: '#10b981' },
          penguin: { text: 'Kwak kwak! Tux Penguin siap deploy ke Linux! 🐧❄️', color: '#38bdf8' },
          doge: { text: 'Much code! Very developer! Shiba Doge is here! 🐕✨', color: '#f59e0b' }
        };
        const info = greetings[data.mascot] || { text: `Halo! Sekarang ganti ke ${this.currentMascot.toUpperCase()}! 🐾`, color: '#ff9e40' };
        this.spawnBurstParticles(20, info.color);
        if (window.speechBubble) {
          window.speechBubble.show(info.text, 3500);
        }
      }
    });

    window.hewanNjir.onReminder((reminder: ReminderNotification) => {
      if (window.speechBubble) {
        window.speechBubble.showReminder(reminder);
      }
      if (reminder.type === 'hydration') {
        this.spawnBurstParticles(25, '#00e5ff');
        this.soundSynth.playWaterDrop();
      } else if (reminder.type === 'stretch') {
        this.spawnBurstParticles(20, '#ffb300');
        this.soundSynth.playChime();
      } else {
        this.spawnBurstParticles(20, '#a78bfa');
        this.soundSynth.playChime();
      }
    });

    window.hewanNjir.onCelebrationFeedback((data) => {
      this.soundSynth.playCelebration();
      this.spawnBurstParticles(30, '#ffd700');
      if (window.speechBubble) {
        window.speechBubble.show(data.praise, 4000);
      }
    });

    window.hewanNjir.onInteractiveModeChange((data: { interactive: boolean }) => {
      this.setInteractiveMode(data.interactive);
    });
  }

  public setInteractiveMode(interactive: boolean): void {
    this.isInteractive = interactive;
    if (interactive) {
      this.appEl.classList.add('is-interactive');
      this.interactiveBadge.classList.remove('hidden');
      this.quickActions.classList.remove('hidden');
    } else {
      this.appEl.classList.remove('is-interactive');
      this.interactiveBadge.classList.add('hidden');
      this.quickActions.classList.add('hidden');
    }
  }

  public updateState(newState: MascotState, typingIntensity: number = 0): void {
    const prev = this.state;
    this.state = newState;
    this.typingIntensity = typingIntensity;

    if (this.statusIndicator) {
      this.statusIndicator.className = `status-indicator status-${newState}`;
    }

    if (prev !== newState && window.speechBubble) {
      window.speechBubble.onStateChange(newState);
    }
  }

  private setupEventListeners(): void {
    const container = document.getElementById('mascot-container');
    if (!container) return;

    container.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.isInteractive) return;
      this.isDragging = true;
      this.lastMousePos = { x: e.screenX, y: e.screenY };
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging || !this.isInteractive) return;
      const deltaX = e.screenX - this.lastMousePos.x;
      const deltaY = e.screenY - this.lastMousePos.y;
      this.lastMousePos = { x: e.screenX, y: e.screenY };

      if (window.hewanNjir) {
        window.hewanNjir.dragMove(deltaX, deltaY);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    container.addEventListener('dblclick', () => {
      this.pet();
    });

    const btnPet = document.getElementById('btn-pet');
    if (btnPet) {
      btnPet.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        this.pet();
      });
    }

    const btnSnack = document.getElementById('btn-snack');
    if (btnSnack) {
      btnSnack.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        this.feed();
      });
    }
  }

  public pet(): void {
    if (window.hewanNjir) {
      window.hewanNjir.petMascot();
    }
    this.spawnBurstParticles(25, '#ff4081', '❤️');
    if (window.speechBubble) {
      const petQuotes = [
        'Hehe, makasih elusannya njir! 🥰',
        'Purrr... Tambah semangat ngoding! ✨',
        'Aww, makin sayang sama developer ini! ❤️'
      ];
      window.speechBubble.show(petQuotes[Math.floor(Math.random() * petQuotes.length)], 3500);
    }
  }

  public feed(): void {
    if (window.hewanNjir) {
      window.hewanNjir.feedMascot();
    }
    this.spawnBurstParticles(20, '#ffab00', '☕');
    if (window.speechBubble) {
      const feedQuotes = [
        'Nyam nyam nyam! Kopi & snack recharged! ☕⚡',
        'Kafein masuk, bug auto mental! 🔥',
        'Enak bener snack-nya njir! Mantap! 🍪'
      ];
      window.speechBubble.show(feedQuotes[Math.floor(Math.random() * feedQuotes.length)], 3500);
    }
  }

  public spawnBurstParticles(count: number, color: string, char: string | null = null): void {
    const cx = this.width / 2;
    const cy = this.height / 2 + 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.5;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 20,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size: Math.random() * 4 + 2,
        color: color,
        char: char,
        alpha: 1,
        life: Math.random() * 0.4 + 0.6
      });
    }
  }

  private loop(timestamp: number): void {
    this.time = timestamp * 0.001;

    this.blinkTimer++;
    if (this.blinkTimer > 180 + Math.random() * 100) {
      this.isBlinking = true;
      if (this.blinkTimer > 195) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    if (this.currentMascot === 'fox') {
      this.renderFox();
    } else if (this.currentMascot === 'cat') {
      this.renderCat();
    } else if (this.currentMascot === 'bot') {
      this.renderCyberBot();
    } else if (this.currentMascot === 'panda') {
      this.renderPanda();
    } else if (this.currentMascot === 'penguin') {
      this.renderPenguin();
    } else if (this.currentMascot === 'doge') {
      this.renderDoge();
    }
    this.ctx.restore();

    this.renderStateEffects();
    this.renderParticles();

    requestAnimationFrame((t) => this.loop(t));
  }

  private renderFox(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2 + 20;

    let breath = Math.sin(this.time * 2) * 2.5;
    let bounce = 0;
    if (this.state === 'work') {
      bounce = Math.abs(Math.sin(this.time * 12)) * 3;
    } else if (this.state === 'celebrate') {
      bounce = Math.abs(Math.sin(this.time * 8)) * 12;
    }

    const yPos = cy - bounce + breath;

    // Tail
    ctx.save();
    let tailAngle = Math.sin(this.time * (this.state === 'work' ? 8 : 3)) * 0.35;
    if (this.state === 'sleep') tailAngle = 0.8;
    ctx.translate(cx - 30, yPos + 15);
    ctx.rotate(tailAngle);
    ctx.beginPath();
    ctx.ellipse(-25, -15, 32, 16, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff7a00';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-45, -25, 14, 10, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Body
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 20, 36, 30, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff7a00';
    ctx.fill();

    // Chest fluff
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 24, 18, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, yPos - 12, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#ff7a00';
    ctx.fill();

    // Cheeks
    ctx.beginPath();
    ctx.arc(cx - 24, yPos - 4, 14, 0, Math.PI * 2);
    ctx.arc(cx + 24, yPos - 4, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Ears
    const earWiggle = this.state === 'work' ? Math.sin(this.time * 10) * 0.1 : 0;
    this.drawEar(cx - 22, yPos - 36, -0.3 + earWiggle, '#ff7a00', '#ffd0a8');
    this.drawEar(cx + 22, yPos - 36, 0.3 - earWiggle, '#ff7a00', '#ffd0a8');

    // Nose
    ctx.beginPath();
    ctx.arc(cx, yPos - 6, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#222222';
    ctx.fill();

    // Eyes
    this.drawEyes(cx, yPos - 14, 14);

    // Paws
    if (this.state === 'work') {
      this.drawMiniKeyboard(cx, yPos + 38);
      const leftPawY = yPos + 26 + Math.sin(this.time * 16) * 4;
      const rightPawY = yPos + 26 + Math.cos(this.time * 16) * 4;
      this.drawPaw(cx - 16, leftPawY);
      this.drawPaw(cx + 16, rightPawY);
    } else if (this.state === 'celebrate') {
      this.drawPaw(cx - 24, yPos - 2);
      this.drawPaw(cx + 24, yPos - 2);
    } else {
      this.drawPaw(cx - 14, yPos + 36);
      this.drawPaw(cx + 14, yPos + 36);
    }
  }

  private renderCat(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2 + 20;

    let breath = Math.sin(this.time * 2.2) * 2;
    let bounce = this.state === 'work' ? Math.abs(Math.sin(this.time * 10)) * 2.5 : 0;
    if (this.state === 'celebrate') bounce = Math.abs(Math.sin(this.time * 8)) * 10;
    const yPos = cy - bounce + breath;

    // Tail
    ctx.save();
    let tailAngle = Math.sin(this.time * 3) * 0.4;
    ctx.translate(cx + 28, yPos + 18);
    ctx.rotate(tailAngle);
    ctx.beginPath();
    ctx.arc(15, -10, 16, 0.5 * Math.PI, 1.8 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#7c86a2';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Body
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 20, 34, 28, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#929cb8';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, yPos - 10, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#929cb8';
    ctx.fill();

    // Ears
    this.drawEar(cx - 18, yPos - 32, -0.2, '#929cb8', '#f8bbd0');
    this.drawEar(cx + 18, yPos - 32, 0.2, '#929cb8', '#f8bbd0');

    // Whiskers
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 18, yPos - 4); ctx.lineTo(cx - 36, yPos - 8);
    ctx.moveTo(cx - 18, yPos);     ctx.lineTo(cx - 38, yPos + 2);
    ctx.moveTo(cx + 18, yPos - 4); ctx.lineTo(cx + 36, yPos - 8);
    ctx.moveTo(cx + 18, yPos);     ctx.lineTo(cx + 38, yPos + 2);
    ctx.stroke();

    // Nose
    ctx.beginPath();
    ctx.arc(cx, yPos - 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f48fb1';
    ctx.fill();

    // Eyes
    this.drawEyes(cx, yPos - 12, 13);

    // Paws
    if (this.state === 'work') {
      this.drawMiniKeyboard(cx, yPos + 38);
      const lPaw = yPos + 26 + Math.sin(this.time * 14) * 4;
      const rPaw = yPos + 26 + Math.cos(this.time * 14) * 4;
      this.drawPaw(cx - 14, lPaw, '#ffffff');
      this.drawPaw(cx + 14, rPaw, '#ffffff');
    } else {
      this.drawPaw(cx - 12, yPos + 36, '#ffffff');
      this.drawPaw(cx + 12, yPos + 36, '#ffffff');
    }
  }

  private renderCyberBot(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2 + 20;

    let hoverY = Math.sin(this.time * 3) * 5;
    const yPos = cy + hoverY;

    // Antenna
    ctx.beginPath();
    ctx.moveTo(cx, yPos - 36);
    ctx.lineTo(cx, yPos - 48);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#546e7a';
    ctx.stroke();

    const antennaGlow = Math.sin(this.time * 6) * 0.5 + 0.5;
    ctx.beginPath();
    ctx.arc(cx, yPos - 50, 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 229, 255, ${0.4 + antennaGlow * 0.6})`;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Head
    this.roundRect(cx - 36, yPos - 36, 72, 60, 16, '#263238', '#37474f');

    // Visor Screen
    this.roundRect(cx - 28, yPos - 24, 56, 32, 10, '#0d1117', '#1f2937');

    if (this.state === 'sleep') {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx - 12, yPos - 8, 6, 0.8 * Math.PI, 0.2 * Math.PI, true);
      ctx.arc(cx + 12, yPos - 8, 6, 0.8 * Math.PI, 0.2 * Math.PI, true);
      ctx.stroke();
    } else if (this.state === 'celebrate') {
      this.drawStar(cx - 12, yPos - 8, 5, 8, 4, '#ffeb3b');
      this.drawStar(cx + 12, yPos - 8, 5, 8, 4, '#ffeb3b');
    } else if (this.state === 'work') {
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 9px monospace';
      const codeChars = ['0', '1', '>', '<', '{', '}'];
      for (let i = 0; i < 4; i++) {
        const char = codeChars[(Math.floor(this.time * 8) + i) % codeChars.length];
        ctx.fillText(char, cx - 20 + i * 11, yPos - 4);
      }
    } else {
      if (!this.isBlinking) {
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 6;
        ctx.fillRect(cx - 18, yPos - 13, 10, 8);
        ctx.fillRect(cx + 8, yPos - 13, 10, 8);
        ctx.shadowBlur = 0;
      }
    }

    // Hover Thruster
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 30, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private renderPanda(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2 + 20;

    let breath = Math.sin(this.time * 2.0) * 2;
    let bounce = this.state === 'work' ? Math.abs(Math.sin(this.time * 10)) * 2.5 : 0;
    if (this.state === 'celebrate') bounce = Math.abs(Math.sin(this.time * 8)) * 11;
    const yPos = cy - bounce + breath;

    // Small black tail nub
    ctx.beginPath();
    ctx.arc(cx - 30, yPos + 22, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2026';
    ctx.fill();

    // Body (White chubby belly)
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 22, 36, 29, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    // Black shoulder band & arms
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 14, 35, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2026';
    ctx.fill();

    // Black ears
    const earWiggle = this.state === 'work' ? Math.sin(this.time * 10) * 0.08 : 0;
    ctx.save();
    ctx.translate(cx - 24, yPos - 30);
    ctx.rotate(-0.2 + earWiggle);
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2026';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx + 24, yPos - 30);
    ctx.rotate(0.2 - earWiggle);
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2026';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.restore();

    // Head (Chubby white face)
    ctx.beginPath();
    ctx.arc(cx, yPos - 8, 33, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cheeks
    ctx.beginPath();
    ctx.arc(cx - 24, yPos - 3, 11, 0, Math.PI * 2);
    ctx.arc(cx + 24, yPos - 3, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Eye Patches (Tilted black ovals)
    ctx.beginPath();
    ctx.ellipse(cx - 15, yPos - 11, 10, 8, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2026';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx + 15, yPos - 11, 10, 8, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2026';
    ctx.fill();

    // Eyes inside patches
    if (this.state === 'sleep') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx - 15, yPos - 10, 5, 0.8 * Math.PI, 0.2 * Math.PI, true);
      ctx.arc(cx + 15, yPos - 10, 5, 0.8 * Math.PI, 0.2 * Math.PI, true);
      ctx.stroke();
    } else if (this.state === 'celebrate') {
      this.drawStar(cx - 15, yPos - 11, 4, 7, 3, '#fef08a');
      this.drawStar(cx + 15, yPos - 11, 4, 7, 3, '#fef08a');
    } else if (this.isBlinking) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 19, yPos - 11); ctx.lineTo(cx - 11, yPos - 11);
      ctx.moveTo(cx + 11, yPos - 11); ctx.lineTo(cx + 19, yPos - 11);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 15, yPos - 11, 3.5, 0, Math.PI * 2);
      ctx.arc(cx + 15, yPos - 11, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx - 14.5, yPos - 11, 2.2, 0, Math.PI * 2);
      ctx.arc(cx + 14.5, yPos - 11, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 15.5, yPos - 12, 1, 0, Math.PI * 2);
      ctx.arc(cx + 13.5, yPos - 12, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rosy Blush
    ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
    ctx.beginPath();
    ctx.arc(cx - 23, yPos - 2, 5.5, 0, Math.PI * 2);
    ctx.arc(cx + 23, yPos - 2, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose & smiling mouth
    ctx.beginPath();
    ctx.arc(cx, yPos - 2, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1e2026';
    ctx.fill();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(cx - 3, yPos + 2, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.arc(cx + 3, yPos + 2, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Paws & Props
    if (this.state === 'work') {
      this.drawMiniKeyboard(cx, yPos + 38);
      const lPaw = yPos + 26 + Math.sin(this.time * 15) * 4;
      const rPaw = yPos + 26 + Math.cos(this.time * 15) * 4;
      this.drawPaw(cx - 16, lPaw, '#1e2026');
      this.drawPaw(cx + 16, rPaw, '#1e2026');
    } else if (this.state === 'celebrate') {
      // Holding bamboo shoot
      ctx.save();
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 28, yPos + 18);
      ctx.lineTo(cx - 24, yPos - 14);
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(cx - 22, yPos - 16, 6, 3, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      this.drawPaw(cx - 22, yPos - 2, '#1e2026');
      this.drawPaw(cx + 22, yPos - 2, '#1e2026');
    } else {
      this.drawPaw(cx - 15, yPos + 36, '#1e2026');
      this.drawPaw(cx + 15, yPos + 36, '#1e2026');
    }
  }

  private renderPenguin(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2 + 20;

    let breath = Math.sin(this.time * 2.2) * 2;
    let waddle = this.state === 'work' || this.state === 'celebrate' ? Math.sin(this.time * 10) * 0.07 : Math.sin(this.time * 3) * 0.03;
    let bounce = this.state === 'work' ? Math.abs(Math.sin(this.time * 10)) * 2.5 : 0;
    if (this.state === 'celebrate') bounce = Math.abs(Math.sin(this.time * 8)) * 12;
    const yPos = cy - bounce + breath;

    ctx.save();
    ctx.translate(cx, yPos);
    ctx.rotate(waddle);
    ctx.translate(-cx, -yPos);

    // Orange flipper feet at bottom
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(cx - 15, yPos + 40, 11, 6, -0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + 15, yPos + 40, 11, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Body (Dark slate navy/black)
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 18, 35, 29, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, yPos - 10, 29, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // White Belly
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 20, 23, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // White face mask patches around eyes
    ctx.beginPath();
    ctx.ellipse(cx - 11, yPos - 12, 10, 13, -0.1, 0, Math.PI * 2);
    ctx.ellipse(cx + 11, yPos - 12, 10, 13, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Cyan Developer Scarf
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.rect(cx - 24, yPos + 2, 48, 11);
    ctx.fill();
    // Scarf tail hanging down
    ctx.fillStyle = '#0891b2';
    ctx.beginPath();
    ctx.rect(cx + 10, yPos + 10, 9, 14);
    ctx.fill();

    // Eyes
    this.drawEyes(cx, yPos - 13, 11);

    // Blush
    ctx.fillStyle = 'rgba(251, 113, 133, 0.4)';
    ctx.beginPath();
    ctx.arc(cx - 19, yPos - 4, 4.5, 0, Math.PI * 2);
    ctx.arc(cx + 19, yPos - 4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Bright triangular orange beak
    ctx.beginPath();
    ctx.moveTo(cx - 7, yPos - 6);
    ctx.lineTo(cx + 7, yPos - 6);
    ctx.lineTo(cx, yPos + 1);
    ctx.closePath();
    ctx.fillStyle = '#ea580c';
    ctx.fill();

    // Wings (Flippers)
    if (this.state === 'work') {
      this.drawMiniKeyboard(cx, yPos + 38);
      const lWingY = yPos + 20 + Math.sin(this.time * 16) * 4;
      const rWingY = yPos + 20 + Math.cos(this.time * 16) * 4;
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(cx - 24, lWingY, 8, 14, 0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + 24, rWingY, 8, 14, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.state === 'celebrate') {
      ctx.save();
      const flap = Math.sin(this.time * 18) * 0.4;
      ctx.translate(cx - 28, yPos + 6);
      ctx.rotate(-0.8 + flap);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(cx + 28, yPos + 6);
      ctx.rotate(0.8 - flap);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(cx - 28, yPos + 18, 7, 16, 0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + 28, yPos + 18, 7, 16, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private renderDoge(): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2 + 20;

    let breath = Math.sin(this.time * 2.5) * 2;
    let bounce = this.state === 'work' ? Math.abs(Math.sin(this.time * 12)) * 3 : 0;
    if (this.state === 'celebrate') bounce = Math.abs(Math.sin(this.time * 9)) * 12;
    const yPos = cy - bounce + breath;

    // Cinnamon roll tail wagging
    ctx.save();
    const tailWag = Math.sin(this.time * (this.state === 'work' ? 14 : this.state === 'celebrate' ? 22 : 6)) * 0.4;
    ctx.translate(cx + 26, yPos + 14);
    ctx.rotate(tailWag);
    ctx.beginPath();
    ctx.arc(12, -10, 14, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#d97706';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(10, -12, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbeb';
    ctx.fill();
    ctx.restore();

    // Body (Golden-wheat doge body)
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 20, 36, 28, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();

    // White Chest Fluff
    ctx.beginPath();
    ctx.ellipse(cx, yPos + 24, 20, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbeb';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, yPos - 10, 31, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();

    // White Cheeks & Muzzle
    ctx.beginPath();
    ctx.arc(cx - 18, yPos - 4, 13, 0, Math.PI * 2);
    ctx.arc(cx + 18, yPos - 4, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbeb';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx, yPos - 3, 14, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbeb';
    ctx.fill();

    // Shiba Ears
    const earWiggle = this.state === 'work' ? Math.sin(this.time * 12) * 0.08 : 0;
    this.drawEar(cx - 20, yPos - 34, -0.25 + earWiggle, '#d97706', '#fbcfe8');
    this.drawEar(cx + 20, yPos - 34, 0.25 - earWiggle, '#d97706', '#fbcfe8');

    // Distinctive White Eyebrow Dots (Classic Shiba feature!)
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(cx - 13, yPos - 22, 3.5, 0, Math.PI * 2);
    ctx.arc(cx + 13, yPos - 22, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    this.drawEyes(cx, yPos - 13, 13);

    // Black Button Nose
    ctx.beginPath();
    ctx.arc(cx, yPos - 6, 3.8, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // Mouth & Pink Tongue
    if (this.state === 'celebrate' || this.state === 'idle') {
      ctx.beginPath();
      ctx.arc(cx, yPos + 1, 7, 0, Math.PI);
      ctx.fillStyle = '#be123c';
      ctx.fill();

      // Tongue
      const tongueWiggle = Math.sin(this.time * 6) * 1;
      ctx.beginPath();
      ctx.ellipse(cx + tongueWiggle, yPos + 5, 4.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fb7185';
      ctx.fill();
    } else {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx - 3, yPos - 1, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.arc(cx + 3, yPos - 1, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }

    // Paws
    if (this.state === 'work') {
      this.drawMiniKeyboard(cx, yPos + 38);
      const lPaw = yPos + 26 + Math.sin(this.time * 16) * 4;
      const rPaw = yPos + 26 + Math.cos(this.time * 16) * 4;
      this.drawPaw(cx - 15, lPaw, '#fffbeb');
      this.drawPaw(cx + 15, rPaw, '#fffbeb');
    } else if (this.state === 'celebrate') {
      this.drawPaw(cx - 24, yPos - 2, '#fffbeb');
      this.drawPaw(cx + 24, yPos - 2, '#fffbeb');
    } else {
      this.drawPaw(cx - 14, yPos + 36, '#fffbeb');
      this.drawPaw(cx + 14, yPos + 36, '#fffbeb');
    }
  }

  private drawEar(x: number, y: number, angle: number, outerColor: string, innerColor: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-14, 10);
    ctx.lineTo(14, 10);
    ctx.closePath();
    ctx.fillStyle = outerColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-8, 6);
    ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fillStyle = innerColor;
    ctx.fill();
    ctx.restore();
  }

  private drawEyes(cx: number, y: number, spacing: number): void {
    const ctx = this.ctx;
    if (this.state === 'sleep') {
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx - spacing, y, 6, 0.8 * Math.PI, 0.2 * Math.PI, true);
      ctx.arc(cx + spacing, y, 6, 0.8 * Math.PI, 0.2 * Math.PI, true);
      ctx.stroke();
      return;
    }

    if (this.state === 'celebrate') {
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - spacing - 6, y + 2);
      ctx.lineTo(cx - spacing, y - 4);
      ctx.lineTo(cx - spacing + 6, y + 2);

      ctx.moveTo(cx + spacing - 6, y + 2);
      ctx.lineTo(cx + spacing, y - 4);
      ctx.lineTo(cx + spacing + 6, y + 2);
      ctx.stroke();
      return;
    }

    if (this.isBlinking) {
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - spacing - 5, y);
      ctx.lineTo(cx - spacing + 5, y);
      ctx.moveTo(cx + spacing - 5, y);
      ctx.lineTo(cx + spacing + 5, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx - spacing, y, 5, 0, Math.PI * 2);
      ctx.arc(cx + spacing, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#222222';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx - spacing - 1.5, y - 1.5, 1.8, 0, Math.PI * 2);
      ctx.arc(cx + spacing - 1.5, y - 1.5, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  private drawPaw(x: number, y: number, color: string = '#ffffff'): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawMiniKeyboard(cx: number, y: number): void {
    const ctx = this.ctx;
    this.roundRect(cx - 32, y - 6, 64, 18, 5, '#1e2530', '#3b4354');

    for (let i = 0; i < 5; i++) {
      const kx = cx - 24 + i * 10;
      const rgbColor = `hsl(${(this.time * 200 + i * 40) % 360}, 85%, 65%)`;
      ctx.fillStyle = rgbColor;
      ctx.fillRect(kx, y - 3, 7, 6);
    }

    if (Math.random() < 0.3) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 45,
        y: y - 8,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2 - 1,
        size: Math.random() * 3 + 1.5,
        color: '#00e5ff',
        alpha: 1,
        life: 0.6
      });
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, radius: number, fillColor: string, strokeColor: string | null = null): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private renderStateEffects(): void {
    if (this.state === 'sleep' && Math.random() < 0.04) {
      this.zzzParticles.push({
        x: this.width / 2 + 25 + (Math.random() - 0.5) * 10,
        y: this.height / 2 - 10,
        vy: -0.7,
        size: 11 + Math.random() * 4,
        alpha: 1,
        text: 'Z'
      });
    }

    const ctx = this.ctx;
    for (let i = this.zzzParticles.length - 1; i >= 0; i--) {
      const z = this.zzzParticles[i];
      z.y += z.vy;
      z.x += Math.sin(z.y * 0.1) * 0.4;
      z.alpha -= 0.008;

      ctx.save();
      ctx.font = `bold ${Math.round(z.size)}px sans-serif`;
      ctx.fillStyle = `rgba(100, 181, 246, ${Math.max(0, z.alpha)})`;
      ctx.fillText(z.text, z.x, z.y);
      ctx.restore();

      if (z.alpha <= 0) {
        this.zzzParticles.splice(i, 1);
      }
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.char) {
        ctx.font = '16px sans-serif';
        ctx.fillText(p.char, p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.restore();

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as any).mascotRenderer = new MascotRenderer();
});
