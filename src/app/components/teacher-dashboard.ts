import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { UserSession, VirtualItem } from '../models/classroom.types';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { WindowManagerService } from '../services/window-manager.service';

@Component({
  selector: 'app-teacher-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div id="teacher-dashboard" class="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-y-auto">
      <!-- Header Banner -->
      <div id="teacher-banner" class="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-md bg-blue-600/30 border border-blue-500/40 text-blue-400 font-mono font-bold text-xs">
              {{ t().teacher.roomCode }}: {{ classroom.classroom()?.code }}
            </span>
            <button
              type="button"
              class="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              (click)="copyCode()"
            >
              <mat-icon class="text-xs !w-3.5 !h-3.5">content_copy</mat-icon>
              <span>Kopieren</span>
            </button>
          </div>
          <h2 class="text-lg font-bold text-slate-100 mt-1">
            {{ classroom.classroom()?.name }} - {{ t().teacher.title }}
          </h2>
          <p class="text-xs text-slate-400">
            Lehrkraft: {{ classroom.currentUser()?.name }}
          </p>
        </div>

        <!-- Quick Classroom Actions -->
        <div class="flex items-center gap-2">
          <!-- Toggle Demo Mode -->
          <button
            id="btn-toggle-demo"
            type="button"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
            [class.bg-emerald-600]="!classroom.isDemoActive()"
            [class.hover:bg-emerald-500]="!classroom.isDemoActive()"
            [class.text-white]="true"
            [class.bg-amber-600]="classroom.isDemoActive()"
            [class.hover:bg-amber-500]="classroom.isDemoActive()"
            (click)="toggleDemo()"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">
              {{ classroom.isDemoActive() ? 'stop_screen_share' : 'screen_share' }}
            </mat-icon>
            <span>
              {{ classroom.isDemoActive() ? t().teacher.stopDemo : t().teacher.startDemo }}
            </span>
          </button>

          <!-- Present Work Modal trigger -->
          <button
            id="btn-present-work"
            type="button"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md"
            (click)="showPresentModal.set(true)"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">co_present</mat-icon>
            <span>{{ t().teacher.presentWork }}</span>
          </button>

          <!-- Close Classroom -->
          <button
            id="btn-close-room"
            type="button"
            class="px-3 py-2 rounded-xl text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 flex items-center gap-1.5"
            (click)="closeRoom()"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">power_settings_new</mat-icon>
            <span>{{ t().teacher.closeRoom }}</span>
          </button>
        </div>
      </div>

      <!-- Live Help Requests Alert Bar -->
      @if (activeHelpRequests().length > 0) {
        <div id="help-requests-alert" class="m-4 p-3 bg-red-950/70 border border-red-800 rounded-xl flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs font-bold text-red-300">
              <mat-icon class="text-red-400 animate-bounce">pan_tool</mat-icon>
              <span>{{ activeHelpRequests().length }} {{ t().teacher.pendingHelp }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            @for (req of activeHelpRequests(); track req.studentId) {
              <div class="p-2 bg-slate-900/90 border border-red-900 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span class="font-semibold text-slate-100">{{ req.studentName }}</span>
                  <p class="text-[11px] text-red-300/80 truncate max-w-xs">{{ req.message }}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px]"
                    (click)="observeStudent(req.studentId)"
                    title="Dem Schüler zuschauen"
                  >
                    Zuschauen
                  </button>
                  <button
                    type="button"
                    class="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px]"
                    (click)="resolveHelp(req.studentId)"
                    title="Als erledigt markieren"
                  >
                    {{ t().teacher.resolveHelp }}
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Classroom Stats Row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 pt-2">
        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <mat-icon>groups</mat-icon>
          </div>
          <div>
            <div class="text-lg font-bold text-slate-100">{{ studentList().length }}</div>
            <div class="text-[11px] text-slate-400">{{ t().teacher.studentsOnline }}</div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <mat-icon>task_alt</mat-icon>
          </div>
          <div>
            <div class="text-lg font-bold text-slate-100">{{ averageProgress() }}%</div>
            <div class="text-[11px] text-slate-400">Durchschnittlicher Fortschritt</div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
            <mat-icon>pan_tool</mat-icon>
          </div>
          <div>
            <div class="text-lg font-bold text-slate-100">{{ activeHelpRequests().length }}</div>
            <div class="text-[11px] text-slate-400">Gemeldete Hilferufe</div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
            <mat-icon>palette</mat-icon>
          </div>
          <div>
            <div class="text-lg font-bold text-slate-100">{{ totalSavedDrawings() }}</div>
            <div class="text-[11px] text-slate-400">Gespeicherte Zeichnungen</div>
          </div>
        </div>
      </div>

      <!-- Students List / Grid -->
      <div class="p-4 flex-1">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Schüler-Arbeitsplätze (Live)
        </h3>

        @if (studentList().length === 0) {
          <div class="p-8 rounded-2xl bg-slate-800/30 border border-slate-800/60 text-center text-slate-500">
            <mat-icon class="text-4xl !w-10 !h-10 mx-auto mb-2 text-slate-600">person_add</mat-icon>
            <p class="text-sm font-medium">Noch keine Schüler beigetreten.</p>
            <p class="text-xs text-slate-400 mt-1">
              Gib deinen Schülern den Code <span class="font-mono text-blue-400 font-bold">{{ classroom.classroom()?.code }}</span>, um beizutreten.
            </p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (st of studentList(); track st.id) {
              <div
                [id]="'student-card-' + st.id"
                class="p-3.5 rounded-xl border bg-slate-800/50 border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden"
              >
                <!-- Top Row: Name, Status, Hand -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        {{ st.name.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <div class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{{ st.name }}</span>
                          @if (st.isHandRaised) {
                            <mat-icon class="text-red-400 text-sm !w-4 !h-4 animate-bounce" title="Braucht Hilfe">pan_tool</mat-icon>
                          }
                          @if (classroom.classroom()?.demoMode?.controlledBy === st.id) {
                            <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold border border-amber-500/40">
                              Steuerung aktiv
                            </span>
                          }
                        </div>
                        <div class="text-[10px] text-slate-400">
                          {{ st.currentApp || 'Desktop' }}
                        </div>
                      </div>
                    </div>

                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" title="Online"></span>
                  </div>

                  <!-- Task Progress -->
                  <div class="my-2">
                    <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>{{ t().teacher.progress }}: {{ st.taskProgress || 0 }}/7</span>
                      <span>{{ Math.round(((st.taskProgress || 0) / 7) * 100) }}%</span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        class="h-full bg-blue-500 transition-all duration-500"
                        [style.width.%]="((st.taskProgress || 0) / 7) * 100"
                      ></div>
                    </div>
                  </div>

                  <!-- Latest Student Drawing preview if available -->
                  @if (getStudentDrawing(st.name); as drawing) {
                    <div class="my-2 p-1 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2">
                      <img
                        [src]="drawing.thumbnail || drawing.content"
                        alt="drawing"
                        class="w-12 h-8 object-contain rounded bg-white"
                      />
                      <div class="truncate text-[10px]">
                        <span class="font-medium text-slate-200 block truncate">{{ drawing.name }}</span>
                        <span class="text-slate-500 block truncate">{{ drawing.path }}</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Action Buttons for this student -->
                <div class="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 mt-2 text-[11px]">
                  <!-- Observe -->
                  <button
                    type="button"
                    class="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1"
                    (click)="observeStudent(st.id)"
                    title="Studentensitzung beobachten"
                  >
                    <mat-icon class="text-xs !w-3.5 !h-3.5">visibility</mat-icon>
                    <span>{{ t().teacher.observeStudent }}</span>
                  </button>

                  <!-- Open Folder -->
                  <button
                    type="button"
                    class="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1"
                    (click)="openStudentFolder(st.name)"
                    title="Ordner des Schülers öffnen"
                  >
                    <mat-icon class="text-xs !w-3.5 !h-3.5">folder</mat-icon>
                  </button>

                  <!-- Delegate Demo Control -->
                  @if (classroom.isDemoActive()) {
                    @if (classroom.classroom()?.demoMode?.controlledBy === st.id) {
                      <button
                        type="button"
                        class="py-1 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-1 text-[10px]"
                        (click)="revokeControl()"
                        title="Steuerung zurückholen"
                      >
                        <span>Entziehen</span>
                      </button>
                    } @else {
                      <button
                        type="button"
                        class="py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1 text-[10px]"
                        (click)="delegateControl(st.id, st.name)"
                        title="Steuerung an Schüler übergeben"
                      >
                        <mat-icon class="text-xs !w-3.5 !h-3.5">front_hand</mat-icon>
                        <span>Steuerung</span>
                      </button>
                    }
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Present Work Selection Modal -->
      @if (showPresentModal()) {
        <div class="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4">
          <div class="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
            <div class="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <mat-icon class="text-indigo-400">co_present</mat-icon>
                <span>{{ t().teacher.selectArtworkToPresent }}</span>
              </div>
              <button
                type="button"
                class="text-slate-400 hover:text-white"
                (click)="showPresentModal.set(false)"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <div class="p-4 overflow-y-auto flex-1 flex flex-col gap-2">
              @if (allClassDrawings().length === 0) {
                <div class="p-8 text-center text-slate-500 text-xs">
                  Es wurden noch keine Schüler-Zeichnungen gespeichert.
                </div>
              } @else {
                @for (drawing of allClassDrawings(); track drawing.path) {
                  <div
                    class="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div class="flex items-center gap-3">
                      <img
                        [src]="drawing.thumbnail || drawing.content"
                        alt="drawing"
                        class="w-14 h-10 object-contain rounded bg-white p-0.5"
                      />
                      <div>
                        <div class="text-xs font-bold text-slate-100">{{ drawing.name }}</div>
                        <div class="text-[11px] text-slate-400">Erstellt von: {{ drawing.creatorName }}</div>
                        <div class="text-[10px] text-slate-500">{{ drawing.path }}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shrink-0 cursor-pointer"
                      (click)="presentDrawing(drawing.path)"
                    >
                      Präsentieren
                    </button>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TeacherDashboard {
  readonly classroom = inject(ClassroomService);
  readonly wm = inject(WindowManagerService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly Math = Math;

  readonly showPresentModal = signal<boolean>(false);

  readonly studentList = computed<UserSession[]>(() => {
    const room = this.classroom.classroom();
    if (!room) return [];
    return Object.values(room.students);
  });

  readonly activeHelpRequests = computed(() => {
    const room = this.classroom.classroom();
    if (!room) return [];
    return room.helpRequests;
  });

  readonly averageProgress = computed(() => {
    const list = this.studentList();
    if (list.length === 0) return 0;
    const total = list.reduce((sum, s) => sum + (s.taskProgress || 0), 0);
    return Math.round((total / (list.length * 7)) * 100);
  });

  readonly allClassDrawings = computed<VirtualItem[]>(() => {
    const room = this.classroom.classroom();
    if (!room) return [];
    return Object.values(room.files).filter(
      (f) => f.fileType === 'image' && !f.inTrash,
    );
  });

  readonly totalSavedDrawings = computed(() => {
    return this.allClassDrawings().length;
  });

  getStudentDrawing(studentName: string): VirtualItem | undefined {
    const room = this.classroom.classroom();
    if (!room) return undefined;
    const prefix = `/Klasse/${studentName}`;
    return Object.values(room.files).find(
      (f) => f.path.startsWith(prefix) && f.fileType === 'image' && !f.inTrash,
    );
  }

  copyCode(): void {
    const code = this.classroom.classroom()?.code;
    if (code && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(code);
      alert(`Klassencode kopiert: ${code}`);
    }
  }

  toggleDemo(): void {
    const current = this.classroom.isDemoActive();
    this.classroom.toggleDemoMode(!current);
  }

  observeStudent(studentId: string): void {
    this.classroom.setObserving(studentId);
    // Also open explorer to that student's folder
    const student = this.studentList().find((s) => s.id === studentId);
    if (student) {
      this.openStudentFolder(student.name);
    }
  }

  openStudentFolder(studentName: string): void {
    const path = `/Klasse/${studentName}`;
    this.wm.openWindow('explorer', `Explorer: ${studentName}`, { initialPath: path });
  }

  delegateControl(studentId: string, studentName: string): void {
    this.classroom.delegateControl(studentId, studentName);
  }

  revokeControl(): void {
    this.classroom.delegateControl(undefined, undefined);
  }

  resolveHelp(studentId: string): void {
    this.classroom.resolveHelp(studentId);
  }

  presentDrawing(filePath: string): void {
    this.showPresentModal.set(false);
    this.classroom.presentWork(filePath);
  }

  closeRoom(): void {
    if (confirm('Möchtest du die Klasse wirklich beenden? Alle Schüler werden abgemeldet.')) {
      this.classroom.closeClassroom();
    }
  }
}
