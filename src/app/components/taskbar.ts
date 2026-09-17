import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { WindowState } from '../models/classroom.types';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { WallpaperService } from '../services/wallpaper.service';
import { WindowManagerService } from '../services/window-manager.service';

@Component({
  selector: 'app-taskbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      id="desktop-taskbar"
      class="h-12 w-full bg-gradient-to-r from-[#0d0f14] via-[#141820] to-[#0d0f14] border-t border-zinc-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_-4px_25px_rgba(0,0,0,0.7)] backdrop-blur-md px-2.5 flex items-center justify-between z-40 select-none text-zinc-200 shrink-0"
    >
      <!-- Left: Start Button & Quick Launches -->
      <div class="flex items-center gap-2 h-full py-1">
        <!-- Start Button (Brushed Dark Metal) -->
        <button
          id="taskbar-start-button"
          type="button"
          class="h-full px-3.5 rounded-xl flex items-center gap-2 font-bold text-xs transition-all border shadow-sm"
          [class.bg-gradient-to-b]="true"
          [class.from-zinc-700]="isStartOpen()"
          [class.to-zinc-850]="isStartOpen()"
          [class.border-zinc-400]="isStartOpen()"
          [class.text-white]="isStartOpen()"
          [class.shadow-md]="isStartOpen()"
          [class.from-zinc-800]="!isStartOpen()"
          [class.to-zinc-900]="!isStartOpen()"
          [class.border-zinc-650]="!isStartOpen()"
          [class.text-zinc-200]="!isStartOpen()"
          [class.hover:from-zinc-750]="!isStartOpen()"
          [class.hover:to-zinc-850]="!isStartOpen()"
          [class.hover:border-zinc-500]="!isStartOpen()"
          (click)="toggleStartMenu()"
        >
          <!-- Windows-inspired 4 colored tiles with metallic sheen -->
          <div class="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 shrink-0">
            <div class="bg-sky-400 rounded-[1px] shadow-sm"></div>
            <div class="bg-amber-400 rounded-[1px] shadow-sm"></div>
            <div class="bg-emerald-400 rounded-[1px] shadow-sm"></div>
            <div class="bg-rose-400 rounded-[1px] shadow-sm"></div>
          </div>
          <span class="hidden sm:inline tracking-wide font-bold">Start</span>
        </button>

        <!-- Quick Collaborative Classroom Docks (Dark Metal) -->
        <div class="flex items-center gap-1.5 h-full py-0.5">
          <button
            id="taskbar-quick-peers"
            type="button"
            class="h-full px-2.5 rounded-xl bg-zinc-850/80 hover:bg-zinc-800 border border-zinc-700/80 text-emerald-300 text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            (click)="openApp('peers')"
            [title]="i18n.isDe() ? 'Mitschüler online ansehen' : 'Ver compañeros en línea'"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">groups</mat-icon>
            <span class="font-bold text-[11px]">{{ classroom.activePeersCount() }}</span>
          </button>

          <button
            id="taskbar-quick-chat"
            type="button"
            class="h-full px-2.5 rounded-xl bg-zinc-850/80 hover:bg-zinc-800 border border-zinc-700/80 text-sky-300 text-xs flex items-center gap-1 transition-colors shadow-sm"
            (click)="openApp('chat')"
            [title]="i18n.isDe() ? 'Klassen-Chat' : 'Chat de clase'"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">forum</mat-icon>
          </button>

          <button
            id="taskbar-quick-whiteboard"
            type="button"
            class="h-full px-2.5 rounded-xl bg-zinc-850/80 hover:bg-zinc-800 border border-zinc-700/80 text-purple-300 text-xs flex items-center gap-1 transition-colors shadow-sm"
            (click)="openApp('whiteboard')"
            [title]="i18n.isDe() ? 'Gemeinsame Tafel' : 'Pizarra digital colaborativa'"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">gesture</mat-icon>
          </button>
        </div>

        <div class="h-5 w-px bg-zinc-750 mx-1"></div>

        <!-- Open Windows Tabs (Brushed Metal) -->
        <div class="flex items-center gap-1.5 overflow-x-auto max-w-lg h-full">
          @for (win of wm.windows(); track win.id) {
            <button
              [id]="'taskbar-window-' + win.id"
              type="button"
              class="h-full px-3 rounded-lg flex items-center gap-1.5 text-xs transition-all border shrink-0 max-w-[160px]"
              [class.bg-gradient-to-b]="wm.activeWindowId() === win.id && !win.isMinimized"
              [class.from-zinc-750]="wm.activeWindowId() === win.id && !win.isMinimized"
              [class.to-zinc-850]="wm.activeWindowId() === win.id && !win.isMinimized"
              [class.border-zinc-500]="wm.activeWindowId() === win.id && !win.isMinimized"
              [class.text-zinc-100]="wm.activeWindowId() === win.id && !win.isMinimized"
              [class.metal-sheen-inset]="wm.activeWindowId() === win.id && !win.isMinimized"
              [class.bg-zinc-900]="wm.activeWindowId() !== win.id || win.isMinimized"
              [class.border-zinc-800]="wm.activeWindowId() !== win.id || win.isMinimized"
              [class.text-zinc-400]="wm.activeWindowId() !== win.id || win.isMinimized"
              [class.hover:bg-zinc-850]="wm.activeWindowId() !== win.id"
              [class.hover:text-zinc-200]="wm.activeWindowId() !== win.id"
              (click)="onWindowTabClick(win)"
            >
              <mat-icon class="text-sky-300 text-sm !w-4 !h-4 flex items-center justify-center shrink-0">
                {{ win.icon }}
              </mat-icon>
              <span class="truncate text-[11px] font-medium">{{ win.title }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Center / Notice: Observed banner if student is watched -->
      @if (classroom.isBeingObserved()) {
        <div
          id="student-observed-indicator"
          class="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/90 border border-zinc-500/50 text-zinc-200 text-xs shadow-md animate-pulse"
        >
          <mat-icon class="text-sm !w-4 !h-4 text-sky-400">visibility</mat-icon>
          <span>{{ t().demo.teacherObserving }}</span>
        </div>
      }

      <!-- Right: System Tray (Hand Raise, Room Code, Lang, Clock) -->
      <div class="flex items-center gap-2 text-xs">
        <!-- Student Hand Raise -->
        @if (classroom.isStudent()) {
          <button
            id="taskbar-btn-hand-raise"
            type="button"
            class="px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all text-xs border"
            [class.bg-red-600]="isHandRaised()"
            [class.border-red-500]="isHandRaised()"
            [class.text-white]="isHandRaised()"
            [class.shadow-lg]="isHandRaised()"
            [class.animate-pulse]="isHandRaised()"
            [class.bg-zinc-900]="!isHandRaised()"
            [class.border-zinc-750]="!isHandRaised()"
            [class.text-zinc-300]="!isHandRaised()"
            [class.hover:bg-zinc-800]="!isHandRaised()"
            (click)="toggleHandRaise()"
            [title]="isHandRaised() ? 'Hilferuf zurücknehmen' : 'Hand heben (Hilfe anfordern)'"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">pan_tool</mat-icon>
            <span class="hidden sm:inline">{{ isHandRaised() ? t().demo.handRaised : t().demo.raiseHand }}</span>
          </button>
        }

        <!-- Room Code Pill -->
        @if (classroom.classroom(); as room) {
          <div
            id="taskbar-room-pill"
            class="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-750 text-[11px] font-mono text-zinc-300 shadow-sm"
            title="Klassen-Code"
          >
            <span class="text-zinc-500">Code:</span>
            <span class="text-zinc-200 font-bold tracking-wider">{{ room.code }}</span>
          </div>
        }

        <!-- Wallpaper Selector -->
        <button
          id="taskbar-wallpaper-btn"
          type="button"
          class="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 transition shadow-sm"
          (click)="wallpaperService.openPicker()"
          [title]="t().system.changeWallpaper"
        >
          <mat-icon class="text-xs text-zinc-400 !w-3.5 !h-3.5 flex items-center justify-center">wallpaper</mat-icon>
          <span class="hidden xl:inline">{{ t().system.wallpaper }}</span>
        </button>

        <!-- Language Selector -->
        <button
          id="taskbar-lang-selector"
          type="button"
          class="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 shadow-sm transition"
          (click)="toggleLanguage()"
          [title]="'Sprache wechseln: ' + (i18n.currentLang() === 'de' ? 'Español' : 'Deutsch')"
        >
          <span class="text-xs font-semibold">{{ i18n.currentLang() === 'de' ? '🇩🇪 DE' : '🇪🇸 ES' }}</span>
        </button>

        <!-- Live Connection Pill -->
        <div
          id="taskbar-connection-indicator"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-750 text-[11px] shadow-sm"
          [title]="classroom.connectionStatus() === 'connected' ? (i18n.isDe() ? 'Server verbunden (Live)' : 'Conectado al servidor (En vivo)') : classroom.connectionStatus() === 'local' ? (i18n.isDe() ? 'Autonomer lokaler Modus (Vercel/Offline aktiv)' : 'Modo autónomo local activo (Sin servidor)') : (i18n.isDe() ? 'Verbinde...' : 'Conectando...')"
        >
          <span
            class="w-2 h-2 rounded-full"
            [class.bg-emerald-400]="classroom.connectionStatus() === 'connected'"
            [class.bg-sky-400]="classroom.connectionStatus() === 'local'"
            [class.bg-amber-400]="classroom.connectionStatus() === 'connecting'"
            [class.bg-red-400]="classroom.connectionStatus() === 'disconnected'"
            [class.animate-pulse]="classroom.connectionStatus() === 'connecting'"
          ></span>
          <span class="hidden xl:inline text-zinc-400">
            {{
              classroom.connectionStatus() === 'connected'
                ? 'Live'
                : classroom.connectionStatus() === 'local'
                ? (i18n.isDe() ? 'Lokal' : 'Modo Local')
                : (i18n.isDe() ? 'Verbinde...' : 'Conectando...')
            }}
          </span>
        </div>

        <!-- Clock & Date -->
        <div id="taskbar-clock" class="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800/80 text-right leading-tight cursor-default shadow-sm">
          <div class="text-xs font-bold text-zinc-200 font-mono">{{ currentTime() }}</div>
          <div class="text-[9px] text-zinc-400">{{ currentDate() }}</div>
        </div>
      </div>
    </div>
  `,
})
export class Taskbar implements OnInit, OnDestroy {
  readonly isStartOpen = signal<boolean>(false);
  readonly startToggle = output<boolean>();

  readonly wm = inject(WindowManagerService);
  readonly classroom = inject(ClassroomService);
  readonly i18n = inject(I18nService);
  readonly wallpaperService = inject(WallpaperService);

  readonly t = this.i18n.t;

  readonly currentTime = signal<string>('');
  readonly currentDate = signal<string>('');

  private timeInterval: ReturnType<typeof setInterval> | null = null;

  readonly isHandRaised = computed(() => {
    const user = this.classroom.currentUser();
    const room = this.classroom.classroom();
    if (!user || !room) return false;
    return room.helpRequests.some((h) => h.studentId === user.id);
  });

  ngOnInit(): void {
    this.updateClock();
    this.timeInterval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateClock(): void {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    this.currentTime.set(`${hours}:${mins}`);

    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    this.currentDate.set(`${days[now.getDay()]}, ${now.getDate()}. ${months[now.getMonth()]}`);
  }

  toggleStartMenu(): void {
    const next = !this.isStartOpen();
    this.isStartOpen.set(next);
    this.startToggle.emit(next);
  }

  onWindowTabClick(win: WindowState): void {
    if (this.wm.activeWindowId() === win.id && !win.isMinimized) {
      this.wm.minimizeWindow(win.id);
    } else {
      this.wm.bringToFront(win.id);
    }
  }

  toggleHandRaise(): void {
    if (this.isHandRaised()) {
      const user = this.classroom.currentUser();
      if (user) {
        this.classroom.resolveHelp(user.id);
      }
    } else {
      this.classroom.requestHelp();
    }
  }

  toggleLanguage(): void {
    const next = this.i18n.currentLang() === 'de' ? 'es' : 'de';
    this.i18n.setLanguage(next);
  }

  openApp(appType: 'peers' | 'chat' | 'whiteboard'): void {
    this.wm.openWindow(appType);
  }
}
