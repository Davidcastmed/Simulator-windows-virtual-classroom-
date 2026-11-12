import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { TeamsPresenceStatus, UserSession } from '../models/classroom.types';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { WindowManagerService } from '../services/window-manager.service';

type PeerFilter = 'all' | 'online' | 'hands' | 'files';
type ViewMode = 'list' | 'together';

interface KidReaction {
  emoji: string;
  label: string;
  type: 'bravo' | 'star' | 'idea' | 'rocket';
}

const KID_REACTIONS: KidReaction[] = [
  { emoji: '👋', label: '¡Hola a todos!', type: 'bravo' },
  { emoji: '⭐', label: '¡Gran trabajo!', type: 'star' },
  { emoji: '🚀', label: '¡Despegando!', type: 'rocket' },
  { emoji: '👏', label: '¡Bravo!', type: 'bravo' },
  { emoji: '💡', label: '¡Tengo una idea!', type: 'idea' },
  { emoji: '🎉', label: '¡Modo fiesta!', type: 'star' },
];

@Component({
  selector: 'app-peers-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div id="peers-widget-container" class="flex flex-col h-full w-full bg-[#1b1c24] text-slate-100 select-none overflow-hidden">
      <!-- Teams Header Bar -->
      <div class="p-3.5 bg-[#20212b] border-b border-slate-700/60 shadow-sm shrink-0">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#5b5fc7]/20 border border-[#5b5fc7]/40 flex items-center justify-center text-[#7f85f5]">
              <mat-icon class="text-xl !w-5 !h-5 flex items-center justify-center">groups</mat-icon>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold text-white tracking-wide">
                  {{ i18n.isDe() ? 'Personen & Teilnehmer' : 'Participantes de la Clase' }}
                </h2>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#5b5fc7]/30 text-[#a6abff] border border-[#5b5fc7]/40">
                  Teams Kids
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                {{ activeCount() }} {{ i18n.isDe() ? 'von' : 'de' }} {{ totalCount() }} {{ i18n.isDe() ? 'online' : 'conectados' }}
              </p>
            </div>
          </div>

          <!-- Header Actions: View Mode Switcher, Add Student & Room Code -->
          <div class="flex items-center gap-1.5">
            <!-- View Mode Switcher (List vs Together Mode) -->
            <div class="flex items-center bg-slate-900 border border-slate-750 p-0.5 rounded-xl">
              <button
                type="button"
                class="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                [class.bg-[#5b5fc7]]="viewMode() === 'list'"
                [class.text-white]="viewMode() === 'list'"
                [class.text-slate-400]="viewMode() !== 'list'"
                [class.hover:text-slate-200]="viewMode() !== 'list'"
                (click)="viewMode.set('list')"
                [title]="i18n.isDe() ? 'Listenansicht' : 'Vista de lista'"
              >
                <mat-icon class="text-xs !w-3.5 !h-3.5">format_list_bulleted</mat-icon>
                <span class="hidden md:inline">{{ i18n.isDe() ? 'Liste' : 'Lista' }}</span>
              </button>

              <button
                type="button"
                class="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                [class.bg-[#5b5fc7]]="viewMode() === 'together'"
                [class.text-white]="viewMode() === 'together'"
                [class.text-slate-400]="viewMode() !== 'together'"
                [class.hover:text-slate-200]="viewMode() !== 'together'"
                (click)="viewMode.set('together')"
                [title]="i18n.isDe() ? 'Together Mode (Klassenraum)' : 'Modo Conjunto (Aula Virtual)'"
              >
                <mat-icon class="text-xs !w-3.5 !h-3.5">co_present</mat-icon>
                <span class="hidden md:inline">{{ i18n.isDe() ? 'Aula' : 'Aula' }}</span>
              </button>
            </div>

            <button
              id="btn-teams-add-student-header"
              type="button"
              class="px-2.5 py-1.5 rounded-xl bg-[#5b5fc7] hover:bg-[#4f53b8] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              (click)="classroomService.openAddStudentModal()"
              [title]="i18n.isDe() ? 'Neuen Schüler hinzufügen' : 'Agregar nuevo estudiante'"
            >
              <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">person_add</mat-icon>
              <span class="hidden sm:inline font-bold">{{ i18n.isDe() ? '+ Schüler' : '+ Agregar Alumno' }}</span>
            </button>

            @if (room()) {
              <button
                type="button"
                class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 flex items-center gap-1 transition-colors shadow-sm"
                (click)="copyRoomCode()"
                [title]="i18n.isDe() ? 'Code kopieren' : 'Copiar código'"
              >
                <mat-icon class="text-sm !w-3.5 !h-3.5 flex items-center justify-center text-sky-400">vpn_key</mat-icon>
                <span class="font-mono font-bold tracking-wider text-sky-300">{{ room()?.code }}</span>
                <span class="text-[10px] text-slate-400 hidden xl:inline">({{ copiedCode() ? '✓' : 'Copy' }})</span>
              </button>
            }
          </div>
        </div>

        <!-- Filter Tabs (Teams style: Todos, En línea, Manos levantadas, Con archivos) -->
        <div class="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
            [class.bg-[#5b5fc7]]="selectedFilter() === 'all'"
            [class.text-white]="selectedFilter() === 'all'"
            [class.bg-slate-800/70]="selectedFilter() !== 'all'"
            [class.text-slate-300]="selectedFilter() !== 'all'"
            [class.hover:bg-slate-800]="selectedFilter() !== 'all'"
            (click)="selectedFilter.set('all')"
          >
            <span>{{ i18n.isDe() ? 'Alle' : 'Todos' }}</span>
            <span class="px-1 py-0.2 rounded text-[10px] font-bold" [class.bg-black/30]="selectedFilter() === 'all'" [class.bg-slate-700]="selectedFilter() !== 'all'">
              {{ totalCount() }}
            </span>
          </button>

          <button
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
            [class.bg-emerald-600]="selectedFilter() === 'online'"
            [class.text-white]="selectedFilter() === 'online'"
            [class.bg-slate-800/70]="selectedFilter() !== 'online'"
            [class.text-slate-300]="selectedFilter() !== 'online'"
            [class.hover:bg-slate-800]="selectedFilter() !== 'online'"
            (click)="selectedFilter.set('online')"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{{ i18n.isDe() ? 'Online' : 'En línea' }}</span>
            <span class="px-1 py-0.2 rounded text-[10px] font-bold" [class.bg-black/30]="selectedFilter() === 'online'" [class.bg-slate-700]="selectedFilter() !== 'online'">
              {{ activeCount() }}
            </span>
          </button>

          <button
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
            [class.bg-amber-600]="selectedFilter() === 'hands'"
            [class.text-white]="selectedFilter() === 'hands'"
            [class.bg-slate-800/70]="selectedFilter() !== 'hands'"
            [class.text-slate-300]="selectedFilter() !== 'hands'"
            [class.hover:bg-slate-800]="selectedFilter() !== 'hands'"
            (click)="selectedFilter.set('hands')"
          >
            <span>✋</span>
            <span>{{ i18n.isDe() ? 'Meldungen' : 'Manos levantadas' }}</span>
            <span class="px-1 py-0.2 rounded text-[10px] font-bold" [class.bg-black/30]="selectedFilter() === 'hands'" [class.bg-slate-700]="selectedFilter() !== 'hands'">
              {{ handsCount() }}
            </span>
          </button>

          <button
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
            [class.bg-sky-600]="selectedFilter() === 'files'"
            [class.text-white]="selectedFilter() === 'files'"
            [class.bg-slate-800/70]="selectedFilter() !== 'files'"
            [class.text-slate-300]="selectedFilter() !== 'files'"
            [class.hover:bg-slate-800]="selectedFilter() !== 'files'"
            (click)="selectedFilter.set('files')"
          >
            <mat-icon class="text-xs !w-3.5 !h-3.5">folder</mat-icon>
            <span>{{ i18n.isDe() ? 'Dateien' : 'Con archivos' }}</span>
            <span class="px-1 py-0.2 rounded text-[10px] font-bold" [class.bg-black/30]="selectedFilter() === 'files'" [class.bg-slate-700]="selectedFilter() !== 'files'">
              {{ filesCount() }}
            </span>
          </button>
        </div>
      </div>

      <!-- Kid-Friendly Teams Celebrations Strip -->
      <div class="px-3.5 py-2 bg-[#171821] border-b border-slate-800/70 flex items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar">
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
            {{ i18n.isDe() ? 'Reaktionen:' : 'Reacciones:' }}
          </span>
          @for (r of kidReactions; track r.emoji) {
            <button
              type="button"
              class="px-2 py-1 rounded-xl bg-slate-800/70 hover:bg-[#5b5fc7]/30 border border-slate-700/60 hover:border-[#5b5fc7]/50 text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
              (click)="sendKidReaction(r)"
              [title]="r.label"
            >
              <span>{{ r.emoji }}</span>
              <span class="text-[10px] text-slate-300 hidden lg:inline">{{ r.label }}</span>
            </button>
          }
        </div>

        <!-- Quick Multi-user Actions -->
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-sky-400 border border-slate-700/60 transition"
            (click)="openChat()"
            [title]="t().peersWidget.openChatBtn"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">forum</mat-icon>
          </button>
          <button
            type="button"
            class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-purple-400 border border-slate-700/60 transition"
            (click)="openWhiteboard()"
            [title]="t().peersWidget.openWhiteboardBtn"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">gesture</mat-icon>
          </button>
          <button
            type="button"
            class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700/60 transition"
            (click)="openScreenMonitor()"
            [title]="i18n.isDe() ? 'Monitore ansehen' : 'Pantallas de alumnos'"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">desktop_windows</mat-icon>
          </button>
        </div>
      </div>

      <!-- MODE A: TOGETHER MODE (Visual Virtual Classroom) -->
      @if (viewMode() === 'together') {
        <div class="flex-1 p-3.5 overflow-y-auto space-y-4">
          <!-- Classroom Board / Stage at front -->
          <div class="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-emerald-950/40 border border-emerald-500/30 text-center shadow-md relative overflow-hidden">
            <div class="text-[11px] font-mono text-emerald-300 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <span>🏫 {{ i18n.isDe() ? 'Virtueller Klassenraum' : 'Aula Virtual en Vivo' }}</span>
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div class="text-xs text-slate-300 mt-1">
              {{ i18n.isDe() ? 'Teams Together Mode für Kinder — Alle Schüler sitzen an ihren Schreibtischen' : 'Modo Conjunto Teams para niños — Todos sentados en sus pupitres interactivos' }}
            </div>

            <!-- Teacher Desk on stage -->
            @if (room()?.teacherName) {
              <div class="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 shadow">
                <span class="text-base">👨‍🏫</span>
                <span class="text-xs font-bold text-amber-200">{{ room()?.teacherName }}</span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">
                  {{ t().peersWidget.teacherBadge }}
                </span>
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
            }
          </div>

          <!-- Classroom Desks Grid (2 or 3 columns) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            @for (s of filteredStudents(); track s.id) {
              <div
                class="relative rounded-2xl border transition-all p-3 flex flex-col items-center justify-between text-center shadow-md group"
                [class.bg-[#232432]]="!isMe(s)"
                [class.border-slate-750]="!isMe(s)"
                [class.bg-[#1f2442]]="isMe(s)"
                [class.border-[#5b5fc7]]="isMe(s)"
                [class.ring-2]="s.isHandRaised"
                [class.ring-amber-400]="s.isHandRaised"
              >
                <!-- Desk Surface Header: Screen monitor graphic & hand indicator -->
                <div class="w-full flex items-center justify-between text-[11px] mb-1.5">
                  <span class="text-xs font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                    <span>{{ getAppEmoji(s.currentApp) }}</span>
                    <span class="truncate max-w-[65px]">{{ formatAppName(s.currentApp) }}</span>
                  </span>

                  <!-- Hand raised queue badge -->
                  @if (s.isHandRaised) {
                    <span class="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center gap-0.5 animate-bounce shadow">
                      <span>✋</span>
                      <span>#{{ s.handRaisedOrder || 1 }}</span>
                    </span>
                  }
                </div>

                <!-- Desk Avatar (Seated behind desk) -->
                <div class="relative my-1">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-lg text-white border-2 border-slate-900 group-hover:scale-105 transition-transform"
                    [style.background-color]="s.avatarColor || getAvatarColor(s.name)"
                  >
                    {{ getInitials(s.name) }}
                  </div>

                  <!-- Teams Presence Dot -->
                  <span
                    class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#1b1c24] flex items-center justify-center shadow-md"
                    [class]="getPresenceDotClass(s.presenceStatus)"
                    [title]="getPresenceLabel(s.presenceStatus)"
                  >
                    @if (s.presenceStatus === 'busy') {
                      <span class="w-2 h-0.5 bg-white rounded-full"></span>
                    }
                  </span>
                </div>

                <!-- Student Nameplate -->
                <div class="w-full mt-1">
                  <div class="text-xs font-bold text-slate-100 truncate flex items-center justify-center gap-1">
                    <span class="truncate">{{ s.name }}</span>
                    @if (isMe(s)) {
                      <span class="px-1 py-0.2 rounded text-[8px] font-bold bg-[#5b5fc7]/40 text-[#c2c6ff]">TÚ</span>
                    }
                  </div>
                  <div class="text-[10px] text-slate-400 truncate">
                    {{ getPresenceLabel(s.presenceStatus) }}
                  </div>
                </div>

                <!-- Desk Surface / Keyboard graphic -->
                <div class="w-full mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-center gap-1">
                  @if (!isMe(s)) {
                    <button
                      type="button"
                      class="p-1 rounded-lg bg-slate-800 hover:bg-[#5b5fc7]/30 text-xs transition"
                      (click)="greetUser(s.name)"
                      [title]="'Saludar a ' + s.name"
                    >
                      👋
                    </button>
                    <button
                      type="button"
                      class="p-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-xs transition"
                      (click)="sendStarToPeer(s.id, s.name)"
                      [title]="'Estrella para ' + s.name"
                    >
                      ⭐
                    </button>
                    @if (isCurrentTeacher()) {
                      <button
                        type="button"
                        class="px-1.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-[10px] font-semibold flex items-center gap-0.5 transition"
                        (click)="openStudentScreen(s.id)"
                        title="Ver pantalla"
                      >
                        <mat-icon class="text-xs !w-3 !h-3">desktop_windows</mat-icon>
                      </button>
                    }
                  } @else {
                    <span class="text-[10px] text-emerald-400 font-medium">Mi Pupitre</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- MODE B: LIST MODE (Classic Microsoft Teams List) -->
      @if (viewMode() === 'list') {
        <!-- Participants List (Scrollable) -->
        <div class="flex-1 p-3.5 space-y-2.5 overflow-y-auto">
          <!-- Teacher Section -->
          @if (room()?.teacherName && (selectedFilter() === 'all' || selectedFilter() === 'online')) {
            <div class="p-3 rounded-2xl bg-[#252336] border border-[#7f85f5]/30 flex items-center justify-between shadow-sm">
              <div class="flex items-center gap-3 min-w-0">
                <div class="relative shrink-0">
                  <div class="w-10 h-10 rounded-full bg-[#5b5fc7] border-2 border-[#7f85f5]/60 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    👨‍🏫
                  </div>
                  <span
                    class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#1b1c24] flex items-center justify-center"
                    title="Disponible (En línea)"
                  ></span>
                </div>

                <div class="min-w-0">
                  <div class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                    <span>{{ room()?.teacherName }}</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#5b5fc7]/30 text-[#c2c6ff] border border-[#5b5fc7]/40">
                      {{ t().peersWidget.teacherBadge }}
                    </span>
                    @if (isCurrentTeacher()) {
                      <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                        {{ t().peersWidget.youBadge }}
                      </span>
                    }
                  </div>
                  <div class="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{{ i18n.isDe() ? 'Lehrkraft · Verfügbar' : 'Profesor Titular · En línea' }}</span>
                  </div>
                </div>
              </div>

              @if (!isCurrentTeacher()) {
                <button
                  type="button"
                  class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1 transition shrink-0"
                  (click)="greetUser(room()?.teacherName || 'Profesor')"
                  title="Saludar"
                >
                  <span>👋</span>
                  <span class="text-[10px] hidden sm:inline">{{ t().peersWidget.greetBtn }}</span>
                </button>
              }
            </div>
          }

          <!-- Section Title: Students -->
          <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">
            <span>{{ i18n.isDe() ? 'Schüler' : 'Estudiantes' }} ({{ filteredStudents().length }})</span>
            <button
              type="button"
              class="text-[11px] text-[#7f85f5] hover:text-[#a6abff] font-semibold flex items-center gap-0.5 lowercase tracking-normal"
              (click)="classroomService.openAddStudentModal()"
            >
              <span>+ {{ i18n.isDe() ? 'hinzufügen' : 'agregar' }}</span>
            </button>
          </div>

          @if (filteredStudents().length === 0) {
            <div class="p-6 text-center text-slate-400 text-xs bg-slate-850/40 rounded-2xl border border-slate-800/80">
              <mat-icon class="text-2xl !w-6 !h-6 flex items-center justify-center mx-auto mb-2 text-slate-500">person_search</mat-icon>
              <p>{{ i18n.isDe() ? 'Keine Schüler mit diesem Filter gefunden.' : 'No se encontraron alumnos con este filtro.' }}</p>
              <button
                type="button"
                class="mt-3 px-3 py-1.5 rounded-xl bg-[#5b5fc7] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                (click)="classroomService.openAddStudentModal()"
              >
                <mat-icon class="text-xs !w-3.5 !h-3.5">person_add</mat-icon>
                <span>{{ i18n.isDe() ? 'Schüler jetzt hinzufügen' : 'Agregar estudiante ahora' }}</span>
              </button>
            </div>
          }

          <!-- Student Cards with Microsoft Teams Presence & Badges -->
          @for (s of filteredStudents(); track s.id) {
            <div
              class="p-3 rounded-2xl border transition-all shadow-sm"
              [class.bg-[#20212b]]="!isMe(s)"
              [class.border-slate-800]="!isMe(s)"
              [class.bg-[#1e233d]]="isMe(s)"
              [class.border-[#5b5fc7]/50]="isMe(s)"
            >
              <div class="flex items-center justify-between gap-2">
                <!-- Left: Avatar with Teams Presence Dot + User Info -->
                <div class="flex items-center gap-3 min-w-0">
                  <div class="relative shrink-0">
                    <!-- Teams Avatar with customizable / hashed color -->
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow text-white border-2 border-slate-800"
                      [style.background-color]="s.avatarColor || getAvatarColor(s.name)"
                    >
                      {{ getInitials(s.name) }}
                    </div>

                    <!-- Teams Presence Dot with white border ring -->
                    <span
                      class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1b1c24] flex items-center justify-center shadow-sm"
                      [class]="getPresenceDotClass(s.presenceStatus)"
                      [title]="getPresenceLabel(s.presenceStatus)"
                    >
                      @if (s.presenceStatus === 'busy') {
                        <span class="w-1.5 h-0.5 bg-white rounded-full"></span>
                      }
                    </span>
                  </div>

                  <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-100 flex items-center gap-1.5 truncate">
                      <span class="truncate">{{ s.name }}</span>
                      @if (isMe(s)) {
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#5b5fc7]/30 text-[#c2c6ff] border border-[#5b5fc7]/40 shrink-0">
                          {{ t().peersWidget.youBadge }}
                        </span>
                      }
                      @if (s.isHandRaised && s.handRaisedOrder) {
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-0.5">
                          <span>✋</span>
                          <span>#{{ s.handRaisedOrder }}</span>
                        </span>
                      }
                    </div>

                    <!-- Teams-style activity subtitle -->
                    <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                      <span class="font-medium text-slate-300">{{ getPresenceLabel(s.presenceStatus) }}</span>
                      @if (s.currentApp) {
                        <span class="text-slate-500">·</span>
                        <span class="text-[#8e94ff] truncate">{{ formatAppName(s.currentApp) }}</span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Right: Interaction buttons -->
                <div class="flex items-center gap-1 shrink-0">
                  <!-- If hand is raised, Teacher can lower it directly -->
                  @if (s.isHandRaised && isCurrentTeacher()) {
                    <button
                      type="button"
                      class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1 transition"
                      (click)="classroomService.lowerStudentHand(s.id)"
                      title="Bajar mano del alumno"
                    >
                      <span>✋</span>
                      <span class="hidden md:inline">{{ i18n.isDe() ? 'Hand senken' : 'Bajar mano' }}</span>
                    </button>
                  }

                  @if (!isMe(s)) {
                    @if (isCurrentTeacher()) {
                      <button
                        type="button"
                        class="px-2 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[10px] font-semibold flex items-center gap-1 transition"
                        (click)="openStudentScreen(s.id)"
                        [title]="'Ver pantalla de ' + s.name"
                      >
                        <mat-icon class="text-xs !w-3.5 !h-3.5">desktop_windows</mat-icon>
                        <span class="hidden sm:inline">{{ i18n.isDe() ? 'Bildschirm' : 'Pantalla' }}</span>
                      </button>
                    }

                    <button
                      type="button"
                      class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95"
                      (click)="greetUser(s.name)"
                      [title]="'Saludar a ' + s.name"
                    >
                      👋
                    </button>

                    <button
                      type="button"
                      class="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition active:scale-95"
                      (click)="sendStarToPeer(s.id, s.name)"
                      [title]="'Enviar estrella a ' + s.name"
                    >
                      ⭐
                    </button>
                  }
                </div>
              </div>

              <!-- Hand raised detailed banner if active -->
              @if (s.isHandRaised) {
                <div class="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-xl">
                  <div class="flex items-center gap-1.5">
                    <span class="text-base leading-none">✋</span>
                    <span class="font-semibold">{{ i18n.isDe() ? 'Hand gehoben' : 'Mano levantada para preguntar' }}</span>
                    @if (s.handRaisedOrder) {
                      <span class="text-[10px] text-amber-400 font-mono">({{ i18n.isDe() ? 'Position' : 'Turno' }} #{{ s.handRaisedOrder }})</span>
                    }
                  </div>
                  @if (isCurrentTeacher()) {
                    <button
                      type="button"
                      class="text-[10px] text-amber-400 underline hover:text-amber-200"
                      (click)="classroomService.lowerStudentHand(s.id)"
                    >
                      {{ i18n.isDe() ? 'Erledigt' : 'Atendido' }}
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PeersWidgetComponent {
  readonly classroomService = inject(ClassroomService);
  readonly windowManager = inject(WindowManagerService);
  readonly i18n = inject(I18nService);

  readonly copiedCode = signal(false);
  readonly selectedFilter = signal<PeerFilter>('all');
  readonly viewMode = signal<ViewMode>('list');
  readonly kidReactions = KID_REACTIONS;

  readonly t = computed(() => this.i18n.t());
  readonly room = computed(() => this.classroomService.classroom());
  readonly students = computed(() => this.classroomService.onlineStudents());
  readonly currentUser = computed(() => this.classroomService.currentUser());
  readonly isCurrentTeacher = computed(() => this.currentUser()?.role === 'teacher');

  readonly totalCount = computed(() => this.students().length + (this.room()?.teacherId ? 1 : 0));
  readonly activeCount = computed(() => this.students().filter((s) => s.isOnline).length + (this.room()?.teacherId ? 1 : 0));
  readonly handsCount = computed(() => this.students().filter((s) => s.isHandRaised).length);
  readonly filesCount = computed(() => this.students().filter((s) => (s.filesCount ?? 0) > 0).length);

  readonly filteredStudents = computed(() => {
    const filter = this.selectedFilter();
    const list = this.students();
    if (filter === 'online') {
      return list.filter((s) => s.isOnline);
    }
    if (filter === 'hands') {
      return list.filter((s) => s.isHandRaised);
    }
    if (filter === 'files') {
      return list.filter((s) => (s.filesCount ?? 0) > 0);
    }
    return list;
  });

  isMe(student: UserSession): boolean {
    const me = this.currentUser();
    return !!me && student.id === me.id;
  }

  getPresenceDotClass(status?: TeamsPresenceStatus): string {
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
  }

  getPresenceLabel(status?: TeamsPresenceStatus): string {
    const isDe = this.i18n.isDe();
    switch (status) {
      case 'available':
        return isDe ? 'Verfügbar' : 'Disponible';
      case 'busy':
        return isDe ? 'Beschäftigt' : 'Ocupado';
      case 'away':
        return isDe ? 'Abwesend' : 'Ausente';
      case 'dnd':
        return isDe ? 'Bitte nicht stören' : 'No molestar';
      case 'presenting':
        return isDe ? 'Präsentiert' : 'Presentando';
      case 'offline':
      default:
        return isDe ? 'Offline' : 'Desconectado';
    }
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#4f52b2', '#0078d4', '#107c41', '#d83b01', '#881798', '#008272', '#b4009e', '#e3008c'
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

  formatAppName(app?: string): string {
    if (!app) {
      return this.i18n.isDe() ? 'Desktop' : 'Escritorio';
    }
    const isDe = this.i18n.isDe();
    switch (app) {
      case 'explorer':
        return isDe ? 'Dateien' : 'Explorador';
      case 'paint':
        return isDe ? 'Zeichnen' : 'Pintura';
      case 'coding':
        return isDe ? 'RoboCode' : 'RoboCode';
      case 'logic-games':
        return isDe ? 'Logik-Spiele' : 'Juegos de lógica';
      case 'groups-wall':
        return isDe ? 'Gruppenwand' : 'Muro de clase';
      case 'activities':
        return isDe ? 'Aufgaben' : 'Actividades';
      case 'chat':
        return isDe ? 'Chat' : 'Chat';
      case 'whiteboard':
        return isDe ? 'Tafel' : 'Pizarra';
      case 'screen-monitor':
        return isDe ? 'Monitore' : 'Monitoreo';
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

  openScreenMonitor(): void {
    this.windowManager.openWindow('screen-monitor');
  }

  openStudentScreen(studentId: string): void {
    this.windowManager.openWindow('screen-monitor', undefined, { initialStudentId: studentId });
  }

  async greetUser(name: string): Promise<void> {
    await this.classroomService.sendChatMessage(`👋 ¡Hola ${name}!`, 'text');
  }

  async sendStarToPeer(studentId: string, name: string): Promise<void> {
    await this.classroomService.sendPeerReaction(studentId, 'star');
    await this.classroomService.sendChatMessage(`⭐ ¡Felicitaciones a ${name} por su trabajo!`, 'reaction', '⭐');
  }

  getAppEmoji(app?: string): string {
    switch (app) {
      case 'paint':
        return '🎨';
      case 'coding':
        return '🤖';
      case 'logic-games':
        return '🍄';
      case 'explorer':
        return '📁';
      case 'whiteboard':
        return '✏️';
      case 'chat':
        return '💬';
      default:
        return '💻';
    }
  }

  async sendKidReaction(reaction: KidReaction): Promise<void> {
    const me = this.currentUser();
    const sender = me?.name || 'Estudiante';
    await this.classroomService.sendChatMessage(`${reaction.emoji} [${sender}]: ${reaction.label}`, 'reaction', reaction.emoji);
  }
}

