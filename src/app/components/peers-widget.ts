import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { UserSession } from '../models/classroom.types';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { WindowManagerService } from '../services/window-manager.service';

@Component({
  selector: 'app-peers-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div id="peers-widget-container" class="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-y-auto p-4">
      <!-- Header -->
      <div class="mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">groups</mat-icon>
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>{{ t().peersWidget.title }}</span>
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h2>
              <p class="text-[11px] text-slate-400">
                {{ activeStudents().length + (room()?.teacherId ? 1 : 0) }} {{ t().peersWidget.activeCount }}
              </p>
            </div>
          </div>

          <!-- Room Code with Copy Button -->
          @if (room()) {
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
              (click)="copyRoomCode()"
              title="Copiar código de aula"
            >
              <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center text-blue-400">vpn_key</mat-icon>
              <span class="font-mono font-bold tracking-wider text-blue-300">{{ room()?.code }}</span>
              <span class="text-[10px] text-slate-400">({{ copiedCode() ? t().peersWidget.copied : t().peersWidget.copyCode }})</span>
            </button>
          }
        </div>

        <!-- Quick Multi-user Actions (Open Chat & Open Whiteboard) -->
        <div class="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            class="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            (click)="openChat()"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center text-blue-400">forum</mat-icon>
            <span>{{ t().peersWidget.openChatBtn }}</span>
          </button>

          <button
            type="button"
            class="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            (click)="openWhiteboard()"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center text-purple-400">gesture</mat-icon>
            <span>{{ t().peersWidget.openWhiteboardBtn }}</span>
          </button>
        </div>

        <!-- Didactic Banner: How it works -->
        <div class="mt-3 p-2.5 rounded-xl bg-slate-850 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">school</mat-icon>
          <div class="leading-relaxed">
            <p>{{ t().peersWidget.howItWorks }}</p>
            <p class="text-[10px] text-slate-400 mt-1 italic">{{ t().peersWidget.didacticTip }}</p>
          </div>
        </div>
      </div>

      <!-- Online Peers Section -->
      <div class="flex-1 space-y-2.5">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          {{ t().peersWidget.onlineNow }}
        </div>

        <!-- Teacher Card (if present) -->
        @if (room()?.teacherName) {
          <div class="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-base">
                  👨‍🏫
                </div>
                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
              </div>
              <div>
                <div class="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                  <span>{{ room()?.teacherName }}</span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    {{ t().peersWidget.teacherBadge }}
                  </span>
                  @if (isCurrentTeacher()) {
                    <span class="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold">
                      {{ t().peersWidget.youBadge }}
                    </span>
                  }
                </div>
                <div class="text-[11px] text-slate-400">
                  {{ i18n.isDe() ? 'Lehrkraft des Raumes' : 'Profesor titular del aula' }}
                </div>
              </div>
            </div>

            <!-- Greet Teacher -->
            @if (!isCurrentTeacher()) {
              <button
                type="button"
                class="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs flex items-center gap-1 transition-colors"
                (click)="greetUser(room()?.teacherName || 'Profesor')"
                title="Saludar al profesor"
              >
                <span>👋</span>
                <span class="text-[10px]">{{ t().peersWidget.greetBtn }}</span>
              </button>
            }
          </div>
        }

        <!-- Students Cards -->
        @if (students().length === 0) {
          <div class="p-6 text-center text-slate-500 text-xs bg-slate-850/50 rounded-2xl border border-slate-800">
            <mat-icon class="text-2xl !w-6 !h-6 flex items-center justify-center mx-auto mb-2 text-slate-600">person_off</mat-icon>
            <p>{{ t().peersWidget.noPeersOnline }}</p>
          </div>
        }

        @for (s of students(); track s.id) {
          <div
            class="p-3 rounded-2xl border transition-all"
            [class.bg-slate-850]="!isMe(s)"
            [class.border-slate-800]="!isMe(s)"
            [class.bg-blue-950_30]="isMe(s)"
            [class.border-blue-500_40]="isMe(s)"
          >
            <div class="flex items-center justify-between">
              <!-- Left Info -->
              <div class="flex items-center gap-3">
                <div class="relative">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm text-white"
                    [style.background-color]="getAvatarColor(s.name)"
                  >
                    {{ getInitials(s.name) }}
                  </div>
                  <span
                    class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900"
                    [class.bg-emerald-500]="s.isOnline"
                    [class.bg-slate-500]="!s.isOnline"
                    [title]="s.isOnline ? 'Online' : 'Inactivo'"
                  ></span>
                </div>

                <div>
                  <div class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>{{ s.name }}</span>
                    @if (isMe(s)) {
                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                        {{ t().peersWidget.youBadge }}
                      </span>
                    }
                  </div>

                  <!-- Current App Activity -->
                  <div class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    @if (s.currentApp) {
                      <span class="text-blue-400 font-medium">{{ t().peersWidget.inApp }}:</span>
                      <span class="text-slate-300">{{ formatAppName(s.currentApp) }}</span>
                    } @else {
                      <span class="text-slate-500 italic">{{ i18n.isDe() ? 'Auf dem Desktop' : 'En el escritorio' }}</span>
                    }
                  </div>
                </div>
              </div>

              <!-- Interactions Buttons (Salute / Star) -->
              @if (!isMe(s)) {
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-transform active:scale-95"
                    (click)="greetUser(s.name)"
                    [title]="'Saludar a ' + s.name"
                  >
                    👋
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-transform active:scale-95"
                    (click)="sendStarToPeer(s.id, s.name)"
                    [title]="'Dar estrella a ' + s.name"
                  >
                    ⭐
                  </button>
                </div>
              }
            </div>

            <!-- Hand raised indicator -->
            @if (s.isHandRaised) {
              <div class="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                <span>✋</span>
                <span>{{ i18n.isDe() ? 'Hat sich gemeldet' : 'Ha levantado la mano para preguntar' }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class PeersWidgetComponent {
  readonly classroomService = inject(ClassroomService);
  readonly windowManager = inject(WindowManagerService);
  readonly i18n = inject(I18nService);

  readonly copiedCode = signal(false);

  readonly t = computed(() => this.i18n.t());
  readonly room = computed(() => this.classroomService.classroom());
  readonly students = computed(() => this.classroomService.onlineStudents());
  readonly activeStudents = computed(() => this.students().filter((s) => s.isOnline));
  readonly currentUser = computed(() => this.classroomService.currentUser());
  readonly isCurrentTeacher = computed(() => this.currentUser()?.role === 'teacher');

  isMe(student: UserSession): boolean {
    const me = this.currentUser();
    return !!me && student.id === me.id;
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  formatAppName(app: string): string {
    const isDe = this.i18n.isDe();
    switch (app) {
      case 'explorer':
        return isDe ? 'Dateien' : 'Explorador';
      case 'paint':
        return isDe ? 'Zeichnen' : 'Pintura';
      case 'coding':
        return isDe ? 'Block-Code' : 'Programación';
      case 'logic-games':
        return isDe ? 'Logik-Spiele' : 'Juegos de lógica';
      case 'groups-wall':
        return isDe ? 'Gruppenwand' : 'Muro de clase';
      case 'activities':
        return isDe ? 'Aufgaben' : 'Actividades';
      case 'chat':
        return isDe ? 'Klassen-Chat' : 'Chat';
      case 'whiteboard':
        return isDe ? 'Gemeinsame Tafel' : 'Pizarra';
      default:
        return app;
    }
  }

  copyRoomCode(): void {
    const code = this.room()?.code;
    if (code && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      this.copiedCode.set(true);
      setTimeout(() => this.copiedCode.set(false), 2500);
    }
  }

  openChat(): void {
    this.windowManager.openWindow('chat');
  }

  openWhiteboard(): void {
    this.windowManager.openWindow('whiteboard');
  }

  async greetUser(name: string): Promise<void> {
    await this.classroomService.sendChatMessage(`👋 ¡Hola ${name}!`, 'text');
  }

  async sendStarToPeer(studentId: string, name: string): Promise<void> {
    await this.classroomService.sendPeerReaction(studentId, 'star');
    await this.classroomService.sendChatMessage(`⭐ ¡Felicitaciones a ${name} por su trabajo!`, 'reaction', '⭐');
  }
}
