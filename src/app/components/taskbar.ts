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
import type { TeamsPresenceStatus, WindowState } from '../models/classroom.types';
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
      class="h-12 w-full bg-gradient-to-r from-[#0d0f14] via-[#141820] to-[#0d0f14] border-t border-zinc-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_-4px_25px_rgba(0,0,0,0.7)] backdrop-blur-md px-1.5 sm:px-2.5 flex items-center justify-between z-40 select-none text-zinc-200 shrink-0 safe-bottom touch-manipulation"
    >
      <!-- Left: Start Button & Quick Launches -->
      <div class="flex items-center gap-1.5 sm:gap-2 h-full py-1 min-w-0">
        <!-- Start Button (Brushed Dark Metal) -->
        <button
          id="taskbar-start-button"
          type="button"
          class="h-full px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 sm:gap-2 font-bold text-xs transition-all border shadow-sm shrink-0 touch-target-mobile"
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
        <div class="flex items-center gap-1 sm:gap-1.5 h-full py-0.5 shrink-0">
          <button
            id="taskbar-quick-peers"
            type="button"
            class="h-full px-2 sm:px-2.5 rounded-xl bg-zinc-850/80 hover:bg-zinc-800 border border-zinc-700/80 text-emerald-300 text-xs flex items-center gap-1 sm:gap-1.5 transition-colors shadow-sm"
            (click)="openApp('peers')"
            [title]="i18n.isDe() ? 'Mitschüler online ansehen' : 'Ver compañeros en línea'"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">groups</mat-icon>
            <span class="font-bold text-[11px]">{{ classroom.activePeersCount() }}</span>
          </button>

          <button
            id="taskbar-quick-chat"
            type="button"
            class="h-full px-2 sm:px-2.5 rounded-xl bg-zinc-850/80 hover:bg-zinc-800 border border-zinc-700/80 text-sky-300 text-xs flex items-center gap-1 transition-colors shadow-sm"
            (click)="openApp('chat')"
            [title]="i18n.isDe() ? 'Klassen-Chat' : 'Chat de clase'"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">forum</mat-icon>
          </button>

          <button
            id="taskbar-quick-whiteboard"
            type="button"
            class="h-full px-2 sm:px-2.5 rounded-xl bg-zinc-850/80 hover:bg-zinc-800 border border-zinc-700/80 text-purple-300 text-xs flex items-center gap-1 transition-colors shadow-sm"
            (click)="openApp('whiteboard')"
            [title]="i18n.isDe() ? 'Gemeinsame Tafel' : 'Pizarra digital colaborativa'"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">gesture</mat-icon>
          </button>
        </div>

        <div class="h-5 w-px bg-zinc-750 mx-0.5 sm:mx-1 shrink-0"></div>

        <!-- Open Windows Tabs (Brushed Metal) -->
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[120px] sm:max-w-lg h-full">
          @for (win of wm.windows(); track win.id) {
            <button
              [id]="'taskbar-window-' + win.id"
              type="button"
              class="h-full px-2 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs transition-all border shrink-0 max-w-[120px] sm:max-w-[160px]"
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
          class="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/90 border border-zinc-500/50 text-zinc-200 text-xs shadow-md animate-pulse shrink-0"
        >
          <mat-icon class="text-sm !w-4 !h-4 text-sky-400">visibility</mat-icon>
          <span>{{ t().demo.teacherObserving }}</span>
        </div>
      }

      <!-- Right: System Tray (Hand Raise, Room Code, Lang, Clock) -->
      <div class="flex items-center gap-1 sm:gap-2 text-xs shrink-0">
        <!-- Student Hand Raise -->
        @if (classroom.isStudent()) {
          <button
            id="taskbar-btn-hand-raise"
            type="button"
            class="px-2 sm:px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1 sm:gap-1.5 transition-all text-xs border shrink-0"
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

        <!-- Teacher Help Requests Indicator in Taskbar -->
        @if (classroom.isTeacher()) {
          @if (teacherHelpRequestsCount() > 0) {
            <button
              id="taskbar-btn-teacher-help"
              type="button"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)] animate-pulse active:scale-95"
              (click)="openPeersWidget()"
              [title]="'Hay ' + teacherHelpRequestsCount() + ' alumno(s) esperando respuesta. Clic para abrir.'"
            >
              <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">pan_tool</mat-icon>
              <span>{{ teacherHelpRequestsCount() }} {{ teacherHelpRequestsCount() === 1 ? (i18n.isDe() ? 'Hilferuf' : 'Mano levantada') : (i18n.isDe() ? 'Hilferufe' : 'Manos levantadas') }}</span>
            </button>
          }
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

        <!-- Wallpaper Selector (Desktop only) -->
        <button
          id="taskbar-wallpaper-btn"
          type="button"
          class="hidden sm:flex px-2 sm:px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 items-center gap-1 transition shadow-sm"
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
          class="px-1.5 sm:px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1 shadow-sm transition"
          (click)="toggleLanguage()"
          [title]="'Sprache wechseln: ' + (i18n.currentLang() === 'de' ? 'Español' : 'Deutsch')"
        >
          <span class="text-xs font-semibold">{{ i18n.currentLang() === 'de' ? '🇩🇪' : '🇪🇸' }}<span class="hidden sm:inline ml-0.5">{{ i18n.currentLang() === 'de' ? 'DE' : 'ES' }}</span></span>
        </button>

        <!-- Live Connection Pill -->
        <div
          id="taskbar-connection-indicator"
          class="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-750 text-[11px] shadow-sm"
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

        <!-- Teams User Avatar with Status Dot & Quick Popover Menu -->
        <div class="relative">
          <button
            id="taskbar-user-avatar-btn"
            type="button"
            class="h-8 sm:h-9 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 flex items-center gap-1.5 transition shadow-sm active:scale-95"
            (click)="toggleUserMenu()"
            [title]="(currentUser()?.name || 'Usuario') + ' - Teams Profile'"
          >
            <div class="relative w-6 h-6 rounded-full bg-[#5b5fc7] text-white flex items-center justify-center font-bold text-[11px] shadow-inner">
              {{ currentUser()?.name?.charAt(0)?.toUpperCase() || '?' }}
              <!-- Teams Presence Dot -->
              <span
                class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-zinc-950 shadow-sm"
                [class]="myPresenceDotClass()"
              ></span>
            </div>
            <span class="hidden md:inline text-xs font-semibold text-zinc-200 truncate max-w-[80px] lg:max-w-[110px]">
              {{ currentUser()?.name }}
            </span>
            <mat-icon class="text-zinc-400 text-xs !w-3 !h-3 flex items-center justify-center">expand_less</mat-icon>
          </button>

          <!-- Teams Profile & Action Popover -->
          @if (isUserMenuOpen()) {
            <div
              id="taskbar-user-popover"
              class="absolute bottom-11 right-0 w-72 bg-gradient-to-b from-[#1f212d] to-[#14151e] border border-slate-700/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 text-slate-100 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <!-- Popover Header -->
              <div class="flex items-center gap-2.5 pb-2.5 border-b border-slate-700/60">
                <div class="relative">
                  <div class="w-11 h-11 rounded-full bg-[#5b5fc7] text-white flex items-center justify-center font-bold text-base shadow">
                    {{ currentUser()?.name?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                  <span
                    class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1f212d]"
                    [class]="myPresenceDotClass()"
                  ></span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-white truncate">{{ currentUser()?.name }}</div>
                  <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#5b5fc7]/30 text-[#c2c6ff] border border-[#5b5fc7]/40">
                      {{ isCurrentTeacher() ? t().roles.teacher : t().roles.student }}
                    </span>
                    @if (classroom.classroom()?.code; as code) {
                      <span class="font-mono text-sky-400 text-[10px]">#{{ code }}</span>
                    }
                  </div>
                </div>
              </div>

              <!-- Teams Status Switcher -->
              <div class="py-2.5 border-b border-slate-700/60">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                  {{ i18n.isDe() ? 'Teams Status festlegen' : 'Estado de Microsoft Teams' }}
                </div>
                <div class="grid grid-cols-2 gap-1 text-[11px]">
                  <button
                    type="button"
                    class="px-2 py-1 rounded-lg text-left flex items-center gap-1.5 hover:bg-slate-800 transition"
                    [class.bg-slate-800]="classroom.myPresenceStatus() === 'available'"
                    (click)="setPresence('available')"
                  >
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{{ i18n.isDe() ? 'Verfügbar' : 'Disponible' }}</span>
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 rounded-lg text-left flex items-center gap-1.5 hover:bg-slate-800 transition"
                    [class.bg-slate-800]="classroom.myPresenceStatus() === 'busy'"
                    (click)="setPresence('busy')"
                  >
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{{ i18n.isDe() ? 'Beschäftigt' : 'Ocupado' }}</span>
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 rounded-lg text-left flex items-center gap-1.5 hover:bg-slate-800 transition"
                    [class.bg-slate-800]="classroom.myPresenceStatus() === 'away'"
                    (click)="setPresence('away')"
                  >
                    <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>{{ i18n.isDe() ? 'Abwesend' : 'Ausente' }}</span>
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 rounded-lg text-left flex items-center gap-1.5 hover:bg-slate-800 transition"
                    [class.bg-slate-800]="classroom.myPresenceStatus() === 'dnd'"
                    (click)="setPresence('dnd')"
                  >
                    <span class="w-2 h-2 rounded-full bg-red-600"></span>
                    <span>{{ i18n.isDe() ? 'Nicht stören' : 'No molestar' }}</span>
                  </button>
                </div>
              </div>

              <!-- Main Action: AGREGAR ESTUDIANTE (Requested by user) -->
              <div class="py-2.5 border-b border-slate-700/60">
                <button
                  id="taskbar-btn-add-student-popover"
                  type="button"
                  class="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-[#5b5fc7] to-[#4f53b8] hover:from-[#4f53b8] hover:to-[#43479e] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  (click)="openAddStudentFromAvatar()"
                >
                  <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">person_add</mat-icon>
                  <span>{{ i18n.isDe() ? '➕ Schüler hinzufügen' : '➕ Agregar Estudiante' }}</span>
                </button>
              </div>

              <!-- Navigation shortcuts -->
              <div class="pt-2 flex flex-col gap-1">
                <button
                  type="button"
                  class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition"
                  (click)="openPeersFromAvatar()"
                >
                  <mat-icon class="text-sm !w-4 !h-4 text-[#7f85f5]">groups</mat-icon>
                  <span>{{ i18n.isDe() ? 'Mitschüler ansehen (Teams)' : 'Ver Alumnos Conectados (Teams)' }}</span>
                </button>

                <button
                  type="button"
                  class="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
                  (click)="logoutFromAvatar()"
                >
                  <mat-icon class="text-sm !w-4 !h-4 text-rose-400">power_settings_new</mat-icon>
                  <span>{{ t().startMenu.logout }}</span>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Clock & Date -->
        <div id="taskbar-clock" class="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-zinc-900/90 border border-zinc-800/80 text-right leading-tight cursor-default shadow-sm">
          <div class="text-xs font-bold text-zinc-200 font-mono">{{ currentTime() }}</div>
          <div class="hidden sm:block text-[9px] text-zinc-400">{{ currentDate() }}</div>
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
    if (!user) return false;
    return this.classroom.activeHelpRequests().some((h) => h.studentId === user.id);
  });

  readonly teacherHelpRequestsCount = computed(() => {
    return this.classroom.activeHelpRequests().length;
  });

  openPeersWidget(): void {
    this.wm.openWindow(
      'peers',
      this.i18n.isDe() ? 'Multischüler Online' : 'Compañeros del Aula',
    );
  }

  readonly isUserMenuOpen = signal<boolean>(false);
  readonly currentUser = computed(() => this.classroom.currentUser());
  readonly isCurrentTeacher = computed(() => this.currentUser()?.role === 'teacher');

  readonly myPresenceDotClass = computed(() => {
    const status = this.classroom.myPresenceStatus();
    switch (status) {
      case 'available':
        return 'bg-emerald-500';
      case 'busy':
        return 'bg-rose-500';
      case 'away':
        return 'bg-amber-400';
      case 'dnd':
        return 'bg-red-600';
      case 'presenting':
        return 'bg-purple-500';
      case 'offline':
      default:
        return 'bg-slate-500';
    }
  });

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
  }

  setPresence(status: TeamsPresenceStatus): void {
    this.classroom.setMyPresence(status);
  }

  openAddStudentFromAvatar(): void {
    this.isUserMenuOpen.set(false);
    this.classroom.openAddStudentModal();
  }

  openPeersFromAvatar(): void {
    this.isUserMenuOpen.set(false);
    this.wm.openWindow('peers');
  }

  logoutFromAvatar(): void {
    this.isUserMenuOpen.set(false);
    this.classroom.leaveClassroom();
    this.wm.closeAll();
  }

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
