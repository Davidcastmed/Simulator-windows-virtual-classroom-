import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { FirebaseService, FirestoreTask } from '../services/firebase.service';
import { WindowManagerService } from '../services/window-manager.service';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-groups-wall',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="groups-wall-root" class="flex flex-col h-full bg-slate-900 text-slate-100 font-sans select-none overflow-hidden">
      <!-- Top Navigation Tabs -->
      <header class="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 bg-slate-800 border-b border-slate-700/80 shrink-0 gap-2">
        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-lg text-xs sm:text-sm font-semibold">
            <mat-icon class="text-base leading-none">diversity_3</mat-icon>
            <span class="truncate">{{ t().groupsWall.title }}</span>
          </div>

          <!-- Switcher Tabs -->
          <div class="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700 overflow-x-auto no-scrollbar">
            <!-- 1. Live Wall -->
            <button
              type="button"
              id="tab-live-wall"
              (click)="activeTab.set('wall')"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap"
              [class.bg-violet-600]="activeTab() === 'wall'"
              [class.text-white]="activeTab() === 'wall'"
              [class.text-slate-400]="activeTab() !== 'wall'"
              [class.hover:text-slate-200]="activeTab() !== 'wall'"
            >
              <mat-icon class="text-xs !w-3.5 !h-3.5">dashboard</mat-icon>
              <span>{{ isDe() ? 'Klasse' : 'Muro' }}</span>
            </button>

            <!-- 2. Groups -->
            <button
              type="button"
              id="tab-teams"
              (click)="activeTab.set('teams')"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap"
              [class.bg-violet-600]="activeTab() === 'teams'"
              [class.text-white]="activeTab() === 'teams'"
              [class.text-slate-400]="activeTab() !== 'teams'"
              [class.hover:text-slate-200]="activeTab() !== 'teams'"
            >
              <mat-icon class="text-xs !w-3.5 !h-3.5">groups</mat-icon>
              <span>{{ isDe() ? 'Gruppen' : 'Grupos' }}</span>
              @if (firebase.activeGroups().length > 0) {
                <span class="px-1.5 py-0.2 bg-violet-500/30 text-violet-300 text-[10px] rounded-full font-mono">
                  {{ firebase.activeGroups().length }}
                </span>
              }
            </button>

            <!-- 3. Notes -->
            <button
              type="button"
              id="tab-notes"
              (click)="activeTab.set('notes')"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap"
              [class.bg-violet-600]="activeTab() === 'notes'"
              [class.text-white]="activeTab() === 'notes'"
              [class.text-slate-400]="activeTab() !== 'notes'"
              [class.hover:text-slate-200]="activeTab() !== 'notes'"
            >
              <mat-icon class="text-xs !w-3.5 !h-3.5">sticky_note_2</mat-icon>
              <span>{{ isDe() ? 'Notizen' : 'Notas' }}</span>
              @if (firebase.activeNotes().length > 0) {
                <span class="px-1.5 py-0.2 bg-amber-500/30 text-amber-300 text-[10px] rounded-full font-mono">
                  {{ firebase.activeNotes().length }}
                </span>
              }
            </button>

            <!-- 4. Tasks -->
            <button
              type="button"
              id="tab-tasks"
              (click)="activeTab.set('tasks')"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap"
              [class.bg-violet-600]="activeTab() === 'tasks'"
              [class.text-white]="activeTab() === 'tasks'"
              [class.text-slate-400]="activeTab() !== 'tasks'"
              [class.hover:text-slate-200]="activeTab() !== 'tasks'"
            >
              <mat-icon class="text-xs !w-3.5 !h-3.5">assignment</mat-icon>
              <span>{{ isDe() ? 'Aufgaben' : 'Tareas' }}</span>
              @if (firebase.activeTasks().length > 0) {
                <span class="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 text-[10px] rounded-full font-mono">
                  {{ firebase.activeTasks().length }}
                </span>
              }
            </button>

            <!-- 5. Resources -->
            <button
              type="button"
              id="tab-resources"
              (click)="activeTab.set('resources')"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap"
              [class.bg-violet-600]="activeTab() === 'resources'"
              [class.text-white]="activeTab() === 'resources'"
              [class.text-slate-400]="activeTab() !== 'resources'"
              [class.hover:text-slate-200]="activeTab() !== 'resources'"
            >
              <mat-icon class="text-xs !w-3.5 !h-3.5">folder_shared</mat-icon>
              <span>{{ isDe() ? 'Materialien' : 'Recursos' }}</span>
            </button>
          </div>
        </div>

        <!-- Right Side: Online Status & Firestore Badge -->
        <div class="flex items-center gap-2 text-xs">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full font-mono text-[11px]">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Firestore: klassenroom</span>
          </div>
        </div>
      </header>

      <!-- Sub-banner: Didactic Explanation -->
      <div class="flex items-center justify-between px-4 py-1.5 bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 shrink-0">
        @if (activeTab() === 'wall') {
          <p class="truncate">{{ isDe() ? 'Gemeinsame Sitzung: Lehrkraft und Schüler vernetzt.' : 'Sesión unificada: Profesor y estudiantes conectados en tiempo real.' }}</p>
        } @else if (activeTab() === 'teams') {
          <p class="truncate">{{ isDe() ? 'Gruppenverwaltung: Die Lehrkraft erstellt Gruppen und ordnet Schüler zu.' : 'Gestión de Grupos: El profesor crea el grupo y asigna a los estudiantes.' }}</p>
        } @else if (activeTab() === 'notes') {
          <p class="truncate">{{ isDe() ? 'Kollaborative Notizwand für Ideen, Regeln und Fragen.' : 'Pared de notas colaborativas con autoría para ideas, reglas y dudas.' }}</p>
        } @else if (activeTab() === 'tasks') {
          <p class="truncate">{{ isDe() ? 'Aufgaben und Übungen mit direktem Fortschritt.' : 'Tareas asignadas por el profesor con seguimiento de entrega.' }}</p>
        } @else {
          <p class="truncate">{{ isDe() ? 'Gemeinsame Arbeitsmaterialien und Vorlagen.' : 'Recursos educativos y materiales de trabajo compartidos.' }}</p>
        }
      </div>

      <!-- Main Content Container -->
      <div class="flex-1 p-4 overflow-y-auto bg-slate-950/80">
        <!-- ============================================== -->
        <!-- VIEW 1: LIVE CLASS WALL (Profesor + Alumnos juntos) -->
        <!-- ============================================== -->
        @if (activeTab() === 'wall') {
          <div class="max-w-6xl mx-auto space-y-4">
            <!-- Active Session Header Banner -->
            <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex items-center justify-between flex-wrap gap-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                  <mat-icon class="text-2xl">school</mat-icon>
                </div>
                <div>
                  <h3 class="text-base font-bold text-white flex items-center gap-2">
                    <span>{{ currentGroupName() }}</span>
                    <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-normal">
                      {{ classroomService.classroom()?.code || 'INF-101' }}
                    </span>
                  </h3>
                  <p class="text-xs text-slate-300 mt-0.5">
                    {{ isDe() ? 'Lehrkraft:' : 'Profesor:' }} <strong class="text-amber-300">{{ currentTeacherName() }}</strong> • {{ classroomService.students().length }} {{ isDe() ? 'Schüler in dieser Sitzung' : 'estudiantes en esta sesión' }}
                  </p>
                </div>
              </div>

              <!-- Quick action to open chat -->
              <button
                type="button"
                (click)="openChatWindow()"
                class="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5 transition"
              >
                <mat-icon class="text-sm">forum</mat-icon>
                <span>{{ isDe() ? 'Klassen-Chat öffnen' : 'Abrir Chat Instantáneo' }}</span>
              </button>
            </div>

            <!-- Active Students & Teachers Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (student of classroomService.students(); track student.id) {
                <div
                  [id]="'student-card-' + student.id"
                  class="bg-slate-900 border rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-md hover:border-slate-600 transition"
                  [class.border-indigo-500]="student.id === classroomService.currentUser()?.id"
                  [class.border-slate-800]="student.id !== classroomService.currentUser()?.id"
                >
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm">
                          {{ student.name.charAt(0).toUpperCase() }}
                        </div>
                        <div>
                          <div class="flex items-center gap-1.5">
                            <h4 class="text-sm font-bold text-slate-200 leading-none">{{ student.name }}</h4>
                            @if (student.id === classroomService.currentUser()?.id) {
                              <span class="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[10px] rounded font-medium border border-indigo-500/30">{{ isDe() ? 'Du' : 'Tú' }}</span>
                            }
                          </div>
                          <span class="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>{{ isDe() ? 'Im Gruppenraum' : 'En el grupo' }}</span>
                          </span>
                        </div>
                      </div>

                      @if (student.isHandRaised) {
                        <span class="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-semibold flex items-center gap-1 animate-bounce">
                          <span>✋</span>
                          <span>{{ isDe() ? 'Frage' : 'Duda' }}</span>
                        </span>
                      }
                    </div>

                    <div class="p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                      <mat-icon class="text-base text-cyan-400 shrink-0">
                        {{ getAppIcon(student.currentApp) }}
                      </mat-icon>
                      <div class="truncate">
                        <span class="text-slate-400 text-[10px] block uppercase font-mono">{{ isDe() ? 'Aktivität:' : 'Actividad:' }}</span>
                        <span class="font-medium text-slate-200">
                          {{ student.activityDetail || (isDe() ? 'Auf dem KlassenDesktop' : 'En KlassenDesktop') }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Reactions -->
                  <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span class="text-[11px] text-slate-400">
                      {{ isDe() ? 'Aufgabenfortschritt:' : 'Tareas:' }} {{ student.taskProgress || 1 }}/3
                    </span>
                    @if (student.id !== classroomService.currentUser()?.id) {
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          (click)="sendReaction(student.id, 'bravo')"
                          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center transition border border-slate-700/60"
                          title="¡Bravo!"
                        >👏</button>
                        <button
                          type="button"
                          (click)="sendReaction(student.id, 'star')"
                          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center transition border border-slate-700/60"
                          title="¡Estrella!"
                        >⭐</button>
                        <button
                          type="button"
                          (click)="sendReaction(student.id, 'rocket')"
                          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs flex items-center justify-center transition border border-slate-700/60"
                          title="¡A tope!"
                        >🚀</button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ============================================== -->
        <!-- VIEW 2: GROUPS (Profesor crea grupo y agrega estudiantes) -->
        <!-- ============================================== -->
        @if (activeTab() === 'teams') {
          <div class="max-w-6xl mx-auto space-y-5">
            <!-- Group Creator Trigger (Solo profesor o vista general) -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md">
              <div class="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <mat-icon class="text-violet-400">group_add</mat-icon>
                    <span>{{ isDe() ? 'Gruppe & Klassenverwaltung' : 'Grupos y Asignación de Estudiantes' }}</span>
                  </h3>
                  <p class="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                    {{ isDe()
                      ? 'Jede Gruppe ist einzigartig in der Datenbank klassenroom gespeichert. Die Lehrkraft erstellt die Gruppe und teilt die Schüler ein.'
                      : 'Cada grupo es único y se almacena en Firestore. El profesor crea el grupo y asigna a los estudiantes para trabajar en una misma sesión.' }}
                  </p>
                </div>

                @if (classroomService.isTeacher()) {
                  <button
                    type="button"
                    (click)="toggleCreateGroupForm()"
                    class="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <mat-icon class="text-base">{{ showCreateGroupForm() ? 'close' : 'add' }}</mat-icon>
                    <span>{{ showCreateGroupForm() ? (isDe() ? 'Abbrechen' : 'Cancelar') : (isDe() ? 'Neue Gruppe erstellen' : 'Crear Nuevo Grupo') }}</span>
                  </button>
                }
              </div>

              <!-- Create Group Form -->
              @if (showCreateGroupForm() && classroomService.isTeacher()) {
                <form [formGroup]="groupForm" (ngSubmit)="onCreateGroupSubmit()" class="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-3">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label for="create-group-name" class="text-[11px] font-semibold text-slate-300 block mb-1">
                        {{ isDe() ? 'Gruppenname' : 'Nombre del Grupo' }}
                      </label>
                      <input
                        id="create-group-name"
                        type="text"
                        formControlName="name"
                        placeholder="ej. Informatik Klasse 6b"
                        class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-violet-500 shadow-inner"
                      />
                    </div>
                    <div>
                      <label for="create-group-code" class="text-[11px] font-semibold text-slate-300 block mb-1">
                        {{ isDe() ? 'Einzigartiger Gruppen-Code' : 'Código Único de Grupo' }}
                      </label>
                      <input
                        id="create-group-code"
                        type="text"
                        formControlName="code"
                        placeholder="ej. INF-102"
                        class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-100 focus:outline-none focus:border-violet-500 shadow-inner"
                      />
                    </div>
                  </div>

                  <!-- Select Students to add -->
                  <div>
                    <span class="text-[11px] font-semibold text-slate-300 block mb-1.5">
                      {{ isDe() ? 'Schüler zu dieser Gruppe hinzufügen:' : 'Estudiantes registrados a agregar en este grupo:' }}
                    </span>
                    <div class="flex flex-wrap gap-2">
                      @for (s of registeredStudents(); track s.id) {
                        <button
                          type="button"
                          class="px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition"
                          [class.bg-violet-950_50]="isStudentSelected(s.id)"
                          [class.border-violet-500]="isStudentSelected(s.id)"
                          [class.text-violet-200]="isStudentSelected(s.id)"
                          [class.bg-slate-800]="!isStudentSelected(s.id)"
                          [class.border-slate-700]="!isStudentSelected(s.id)"
                          [class.text-slate-400]="!isStudentSelected(s.id)"
                          (click)="toggleStudentSelection(s.id)"
                        >
                          <mat-icon class="text-xs !w-3.5 !h-3.5">
                            {{ isStudentSelected(s.id) ? 'check_box' : 'check_box_outline_blank' }}
                          </mat-icon>
                          <span>{{ s.displayName }}</span>
                        </button>
                      }
                    </div>
                  </div>

                  <div class="flex justify-end gap-2 mt-2">
                    <button
                      type="submit"
                      [disabled]="groupForm.invalid || isSubmitting()"
                      class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <mat-icon class="text-sm">save</mat-icon>
                      <span>{{ isDe() ? 'Gruppe in klassenRoom anlegen' : 'Guardar Grupo en klassenRoom' }}</span>
                    </button>
                  </div>
                </form>
              }
            </div>

            <!-- Existing Groups List from Firestore -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (grp of firebase.activeGroups(); track grp.id) {
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between gap-3">
                  <div>
                    <div class="flex items-start justify-between gap-3 mb-2">
                      <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 flex items-center justify-center">
                          <mat-icon class="text-xl">school</mat-icon>
                        </div>
                        <div>
                          <h4 class="text-sm font-bold text-white flex items-center gap-2">
                            <span>{{ grp.name }}</span>
                            <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                              {{ grp.code }}
                            </span>
                          </h4>
                          <p class="text-[11px] text-slate-400 mt-0.5">
                            {{ isDe() ? 'Lehrkraft:' : 'Docente:' }} <strong class="text-amber-300">{{ grp.teacherName }}</strong>
                          </p>
                        </div>
                      </div>

                      <span class="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold">
                        {{ grp.members.length }} {{ isDe() ? 'Mitglieder' : 'Miembros' }}
                      </span>
                    </div>

                    <!-- Members Badges -->
                    <div class="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-800">
                      @for (m of grp.members; track m.id) {
                        <span class="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200 flex items-center gap-1.5">
                          <span class="w-1.5 h-1.5 rounded-full" [class.bg-amber-400]="m.role === 'teacher'" [class.bg-sky-400]="m.role === 'student'"></span>
                          <span>{{ m.name }}</span>
                          @if (m.role === 'teacher') {
                            <span class="text-[9px] text-amber-300 uppercase font-mono">({{ isDe() ? 'Lehrkraft' : 'Prof' }})</span>
                          }
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Quick Action Button -->
                  <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                      (click)="openChatWindow()"
                    >
                      <mat-icon class="text-xs">chat</mat-icon>
                      <span>{{ isDe() ? 'Chat' : 'Mensajería' }}</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ============================================== -->
        <!-- VIEW 3: COLLABORATIVE NOTES (Notas) -->
        <!-- ============================================== -->
        @if (activeTab() === 'notes') {
          <div class="max-w-6xl mx-auto space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <mat-icon class="text-amber-400">sticky_note_2</mat-icon>
                  <span>{{ isDe() ? 'Kollaborative Notizwand' : 'Pared de Notas Colaborativas' }}</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">
                  {{ isDe() ? 'Erstelle Notizen für die Klasse. Jede Notiz wird mit deinem Namen gespeichert.' : 'Crea notas para el grupo. Cada nota se guarda con tu usuario y rol en Firestore.' }}
                </p>
              </div>

              <button
                type="button"
                (click)="toggleCreateNoteForm()"
                class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <mat-icon class="text-sm">{{ showCreateNoteForm() ? 'close' : 'add' }}</mat-icon>
                <span>{{ showCreateNoteForm() ? (isDe() ? 'Schließen' : 'Cerrar') : (isDe() ? 'Neue Notiz' : 'Nueva Nota') }}</span>
              </button>
            </div>

            <!-- New Note Form -->
            @if (showCreateNoteForm()) {
              <form [formGroup]="noteForm" (ngSubmit)="onCreateNoteSubmit()" class="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-md">
                <div>
                  <label for="create-note-title" class="text-[11px] font-semibold text-slate-300 block mb-1">
                    {{ isDe() ? 'Titel der Notiz' : 'Título de la Nota' }}
                  </label>
                  <input
                    id="create-note-title"
                    type="text"
                    formControlName="title"
                    placeholder="ej. Recordatorio de Paint"
                    class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label for="create-note-text" class="text-[11px] font-semibold text-slate-300 block mb-1">
                    {{ isDe() ? 'Inhalt' : 'Contenido' }}
                  </label>
                  <textarea
                    id="create-note-text"
                    rows="3"
                    formControlName="text"
                    placeholder="Escribe aquí tu nota..."
                    class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  ></textarea>
                </div>

                <div class="flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] text-slate-400 font-semibold">{{ isDe() ? 'Farbe:' : 'Color:' }}</span>
                    @for (col of ['amber', 'sky', 'emerald', 'purple', 'rose']; track col) {
                      <button
                        type="button"
                        (click)="selectedNoteColor.set(col)"
                        class="w-6 h-6 rounded-full border-2 transition"
                        [class.border-white]="selectedNoteColor() === col"
                        [class.border-transparent]="selectedNoteColor() !== col"
                        [class.bg-amber-500]="col === 'amber'"
                        [class.bg-sky-500]="col === 'sky'"
                        [class.bg-emerald-500]="col === 'emerald'"
                        [class.bg-purple-500]="col === 'purple'"
                        [class.bg-rose-500]="col === 'rose'"
                        [attr.aria-label]="col"
                      >
                        <span class="sr-only">{{ col }}</span>
                      </button>
                    }
                  </div>

                  <button
                    type="submit"
                    [disabled]="noteForm.invalid"
                    class="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition"
                  >
                    {{ isDe() ? 'Notiz veröffentlichen' : 'Publicar Nota' }}
                  </button>
                </div>
              </form>
            }

            <!-- Notes Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (note of firebase.activeNotes(); track note.id) {
                <div
                  class="p-4 rounded-2xl border shadow-md flex flex-col justify-between gap-3 text-slate-900"
                  [class.bg-amber-200]="note.color === 'amber' || !note.color"
                  [class.border-amber-300]="note.color === 'amber' || !note.color"
                  [class.bg-sky-200]="note.color === 'sky'"
                  [class.border-sky-300]="note.color === 'sky'"
                  [class.bg-emerald-200]="note.color === 'emerald'"
                  [class.border-emerald-300]="note.color === 'emerald'"
                  [class.bg-purple-200]="note.color === 'purple'"
                  [class.border-purple-300]="note.color === 'purple'"
                  [class.bg-rose-200]="note.color === 'rose'"
                  [class.border-rose-300]="note.color === 'rose'"
                >
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-1.5">
                      <h4 class="font-bold text-sm leading-tight text-slate-900">{{ note.title }}</h4>
                      <button
                        type="button"
                        (click)="onDeleteNote(note.id)"
                        class="text-slate-700/60 hover:text-rose-700 text-xs transition"
                        title="Eliminar nota"
                      >
                        <mat-icon class="text-sm !w-4 !h-4">close</mat-icon>
                      </button>
                    </div>
                    <p class="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{{ note.text }}</p>
                  </div>

                  <div class="pt-2 border-t border-black/10 flex items-center justify-between text-[10px] text-slate-700">
                    <span class="font-bold flex items-center gap-1">
                      <span>{{ note.authorName }}</span>
                      @if (note.authorRole === 'teacher') {
                        <span class="px-1 py-0.2 bg-amber-800 text-white rounded font-mono">DOCENTE</span>
                      }
                    </span>
                    <span>{{ formatNoteDate(note.createdAt) }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ============================================== -->
        <!-- VIEW 4: TASKS (Tareas asignadas por el profesor) -->
        <!-- ============================================== -->
        @if (activeTab() === 'tasks') {
          <div class="max-w-6xl mx-auto space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <mat-icon class="text-emerald-400">assignment</mat-icon>
                  <span>{{ isDe() ? 'Klassen-Aufgaben & Übungen' : 'Tareas y Asignaciones del Aula' }}</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">
                  {{ isDe() ? 'Aufgaben von der Lehrkraft. Klicke auf eine Aufgabe, um sie als erledigt zu markieren.' : 'Tareas creadas por el profesor. Cada estudiante puede marcar sus tareas completadas.' }}
                </p>
              </div>

              @if (classroomService.isTeacher()) {
                <button
                  type="button"
                  (click)="toggleCreateTaskForm()"
                  class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <mat-icon class="text-sm">{{ showCreateTaskForm() ? 'close' : 'add' }}</mat-icon>
                  <span>{{ showCreateTaskForm() ? (isDe() ? 'Schließen' : 'Cerrar') : (isDe() ? 'Neue Aufgabe anlegen' : 'Crear Tarea') }}</span>
                </button>
              }
            </div>

            <!-- New Task Form (Teacher only) -->
            @if (showCreateTaskForm() && classroomService.isTeacher()) {
              <form [formGroup]="taskForm" (ngSubmit)="onCreateTaskSubmit()" class="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-md">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="sm:col-span-2">
                    <label for="create-task-title" class="text-[11px] font-semibold text-slate-300 block mb-1">
                      {{ isDe() ? 'Titel der Aufgabe' : 'Título de la Tarea' }}
                    </label>
                    <input
                      id="create-task-title"
                      type="text"
                      formControlName="title"
                      placeholder="ej. Crear carpeta y dibujo en Paint"
                      class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label for="create-task-category" class="text-[11px] font-semibold text-slate-300 block mb-1">
                      {{ isDe() ? 'Kategorie' : 'Categoría' }}
                    </label>
                    <select
                      id="create-task-category"
                      formControlName="category"
                      class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="files">{{ isDe() ? 'Dateiverwaltung' : 'Archivos' }}</option>
                      <option value="drawing">{{ isDe() ? 'Zeichnen / Paint' : 'Dibujo / Paint' }}</option>
                      <option value="logic">{{ isDe() ? 'Logik-Spiele' : 'Juegos de Lógica' }}</option>
                      <option value="coding">{{ isDe() ? 'Programmieren' : 'Programación' }}</option>
                      <option value="general">{{ isDe() ? 'Allgemein' : 'General' }}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label for="create-task-desc" class="text-[11px] font-semibold text-slate-300 block mb-1">
                    {{ isDe() ? 'Anleitung / Beschreibung' : 'Descripción e Instrucciones' }}
                  </label>
                  <textarea
                    id="create-task-desc"
                    rows="3"
                    formControlName="description"
                    placeholder="Instrucciones paso a paso para los estudiantes..."
                    class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  ></textarea>
                </div>

                <div class="flex justify-end">
                  <button
                    type="submit"
                    [disabled]="taskForm.invalid"
                    class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition"
                  >
                    {{ isDe() ? 'Aufgabe zuweisen' : 'Asignar Tarea' }}
                  </button>
                </div>
              </form>
            }

            <!-- Tasks List -->
            <div class="space-y-3">
              @for (task of firebase.activeTasks(); track task.id) {
                <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start justify-between gap-3 shadow-md hover:border-slate-700 transition">
                  <div class="flex items-start gap-3">
                    <button
                      type="button"
                      (click)="onToggleTask(task.id)"
                      class="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition"
                      [class.bg-emerald-600]="isTaskCompletedByMe(task)"
                      [class.border-emerald-400]="isTaskCompletedByMe(task)"
                      [class.text-white]="isTaskCompletedByMe(task)"
                      [class.bg-slate-800]="!isTaskCompletedByMe(task)"
                      [class.border-slate-700]="!isTaskCompletedByMe(task)"
                      [class.text-transparent]="!isTaskCompletedByMe(task)"
                      title="Marcar como completada"
                    >
                      <mat-icon class="text-sm">check</mat-icon>
                    </button>

                    <div>
                      <div class="flex items-center gap-2">
                        <h4 class="text-sm font-bold text-white" [class.line-through]="isTaskCompletedByMe(task)" [class.text-slate-400]="isTaskCompletedByMe(task)">
                          {{ task.title }}
                        </h4>
                        <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                          {{ getCategoryLabel(task.category) }}
                        </span>
                      </div>
                      <p class="text-xs text-slate-300 mt-1 leading-relaxed">{{ task.description }}</p>
                      <div class="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                        <span>{{ isDe() ? 'Lehrkraft:' : 'Profesor:' }} <strong class="text-amber-300">{{ task.teacherName }}</strong></span>
                        <span>•</span>
                        <span class="text-emerald-400">
                          {{ (task.completedBy || []).length }} / {{ registeredStudents().length }} {{ isDe() ? 'Schüler haben abgegeben' : 'estudiantes completaron' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ============================================== -->
        <!-- VIEW 5: RESOURCES (Recursos educativos) -->
        <!-- ============================================== -->
        @if (activeTab() === 'resources') {
          <div class="max-w-6xl mx-auto space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <mat-icon class="text-sky-400">folder_shared</mat-icon>
                  <span>{{ isDe() ? 'Gemeinsame Ressourcen & Vorlagen' : 'Recursos Educativos Compartidos' }}</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">
                  {{ isDe() ? 'Dokumente, Anleitungen und Vorlagen für die gemeinsame Arbeit.' : 'Documentos, guías y plantillas compartidas en la base de datos klassenroom.' }}
                </p>
              </div>

              <button
                type="button"
                (click)="toggleCreateResForm()"
                class="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <mat-icon class="text-sm">{{ showCreateResForm() ? 'close' : 'add' }}</mat-icon>
                <span>{{ showCreateResForm() ? (isDe() ? 'Schließen' : 'Cerrar') : (isDe() ? 'Material teilen' : 'Compartir Recurso') }}</span>
              </button>
            </div>

            <!-- New Resource Form -->
            @if (showCreateResForm()) {
              <form [formGroup]="resourceForm" (ngSubmit)="onCreateResourceSubmit()" class="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-md">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="sm:col-span-2">
                    <label for="create-res-title" class="text-[11px] font-semibold text-slate-300 block mb-1">
                      {{ isDe() ? 'Titel' : 'Título del Recurso' }}
                    </label>
                    <input
                      id="create-res-title"
                      type="text"
                      formControlName="title"
                      placeholder="ej. Guía de Atajos de Teclado"
                      class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label for="create-res-type" class="text-[11px] font-semibold text-slate-300 block mb-1">
                      {{ isDe() ? 'Typ' : 'Tipo' }}
                    </label>
                    <select
                      id="create-res-type"
                      formControlName="type"
                      class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    >
                      <option value="document">{{ isDe() ? 'Dokument / Text' : 'Documento / Texto' }}</option>
                      <option value="image">{{ isDe() ? 'Bild / Grafik' : 'Imagen / Gráfico' }}</option>
                      <option value="link">{{ isDe() ? 'Übungslink' : 'Enlace' }}</option>
                      <option value="exercise">{{ isDe() ? 'Übung' : 'Ejercicio' }}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label for="create-res-content" class="text-[11px] font-semibold text-slate-300 block mb-1">
                    {{ isDe() ? 'Inhalt / Textinhalt' : 'Contenido o descripción' }}
                  </label>
                  <textarea
                    id="create-res-content"
                    rows="3"
                    formControlName="content"
                    placeholder="Contenido del recurso educativo..."
                    class="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  ></textarea>
                </div>

                <div class="flex justify-end">
                  <button
                    type="submit"
                    [disabled]="resourceForm.invalid"
                    class="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition"
                  >
                    {{ isDe() ? 'Material teilen' : 'Publicar Recurso' }}
                  </button>
                </div>
              </form>
            }

            <!-- Resources Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (res of firebase.activeResources(); track res.id) {
                <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-md hover:border-slate-700 transition">
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
                          <mat-icon class="text-lg">
                            {{ res.type === 'image' ? 'image' : (res.type === 'link' ? 'link' : 'description') }}
                          </mat-icon>
                        </div>
                        <div>
                          <h4 class="text-sm font-bold text-white">{{ res.title }}</h4>
                          <span class="text-[11px] text-slate-400">
                            {{ isDe() ? 'Geteilt von' : 'Compartido por' }} <strong>{{ res.authorName }}</strong>
                            <span class="px-1 py-0.2 rounded bg-slate-800 text-[9px] uppercase font-mono ml-1">{{ res.authorRole }}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                      {{ res.content }}
                    </div>
                  </div>

                  @if (res.urlOrPath) {
                    <div class="text-[11px] text-sky-400 flex items-center gap-1">
                      <mat-icon class="text-xs !w-3.5 !h-3.5">attachment</mat-icon>
                      <span class="truncate">{{ res.urlOrPath }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class GroupsWall implements OnInit {
  readonly classroomService = inject(ClassroomService);
  readonly firebase = inject(FirebaseService);
  private readonly windowManager = inject(WindowManagerService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;

  readonly activeTab = signal<'wall' | 'teams' | 'notes' | 'tasks' | 'resources'>('wall');

  readonly showCreateGroupForm = signal<boolean>(false);
  readonly showCreateNoteForm = signal<boolean>(false);
  readonly showCreateTaskForm = signal<boolean>(false);
  readonly showCreateResForm = signal<boolean>(false);

  readonly isSubmitting = signal<boolean>(false);
  readonly selectedStudentIds = signal<string[]>([]);
  readonly selectedNoteColor = signal<string>('amber');

  readonly groupForm = new FormGroup({
    name: new FormControl('Informatik Klasse 6b', [Validators.required, Validators.minLength(2)]),
    code: new FormControl('INF-101', [Validators.required, Validators.minLength(2)]),
  });

  readonly noteForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.minLength(2)]),
    text: new FormControl('', [Validators.required, Validators.minLength(3)]),
  });

  readonly taskForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.minLength(2)]),
    description: new FormControl('', [Validators.required, Validators.minLength(5)]),
    category: new FormControl<'files' | 'drawing' | 'logic' | 'coding' | 'general'>('general', [Validators.required]),
  });

  readonly resourceForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.minLength(2)]),
    type: new FormControl<'document' | 'image' | 'link' | 'exercise'>('document', [Validators.required]),
    content: new FormControl('', [Validators.required, Validators.minLength(3)]),
  });

  ngOnInit(): void {
    this.classroomService.reportActivity(
      'Muro de la Clase',
      'Viendo Muro, Grupos, Notas y Tareas',
    );
    // Initialize student selection with all registered students by default
    const studentIds = this.firebase.getRegisteredStudents().map(s => s.id);
    this.selectedStudentIds.set(studentIds);
  }

  currentGroupName(): string {
    const grp = this.firebase.currentGroup();
    return grp ? grp.name : (this.classroomService.classroom()?.name || 'Informatik Klasse 6b');
  }

  currentTeacherName(): string {
    const grp = this.firebase.currentGroup();
    return grp ? grp.teacherName : (this.classroomService.classroom()?.teacherName || 'Frau Weber');
  }

  registeredStudents() {
    return this.firebase.getRegisteredStudents();
  }

  isStudentSelected(id: string): boolean {
    return this.selectedStudentIds().includes(id);
  }

  toggleStudentSelection(id: string): void {
    this.selectedStudentIds.update(current => {
      if (current.includes(id)) {
        return current.filter(x => x !== id);
      } else {
        return [...current, id];
      }
    });
  }

  toggleCreateGroupForm(): void {
    this.showCreateGroupForm.update((v) => !v);
  }

  toggleCreateNoteForm(): void {
    this.showCreateNoteForm.update((v) => !v);
  }

  toggleCreateTaskForm(): void {
    this.showCreateTaskForm.update((v) => !v);
  }

  toggleCreateResForm(): void {
    this.showCreateResForm.update((v) => !v);
  }

  openChatWindow(): void {
    this.windowManager.openWindow('chat');
  }

  getAppIcon(app?: string): string {
    switch (app) {
      case 'RoboCode':
      case 'coding':
        return 'terminal';
      case 'Juegos de Lógica':
      case 'logic-games':
        return 'videogame_asset';
      case 'Paint':
      case 'paint':
        return 'brush';
      case 'Explorer':
      case 'explorer':
        return 'folder';
      case 'Lernaufgaben':
      case 'activities':
        return 'task_alt';
      default:
        return 'computer';
    }
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'files': return this.isDe() ? 'Dateien' : 'Archivos';
      case 'drawing': return this.isDe() ? 'Zeichnen' : 'Dibujo';
      case 'logic': return this.isDe() ? 'Logik' : 'Lógica';
      case 'coding': return this.isDe() ? 'Code' : 'Código';
      default: return this.isDe() ? 'Allgemein' : 'General';
    }
  }

  formatNoteDate(ts: number): string {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  isTaskCompletedByMe(task: FirestoreTask): boolean {
    const user = this.classroomService.currentUser();
    if (!user) return false;
    return (task.completedBy || []).includes(user.id);
  }

  async onToggleTask(taskId: string): Promise<void> {
    const user = this.classroomService.currentUser();
    if (!user) return;
    await this.firebase.toggleTaskCompletion(taskId, user.id);
  }

  async sendReaction(
    toStudentId: string,
    type: 'bravo' | 'star' | 'idea' | 'rocket',
  ): Promise<void> {
    await this.classroomService.sendPeerReaction(toStudentId, type);
  }

  async onCreateGroupSubmit(): Promise<void> {
    if (this.groupForm.invalid) return;
    this.isSubmitting.set(true);

    const user = this.classroomService.currentUser();
    const teacherId = user ? user.id : 'user_teacher_weber';
    const teacherName = user ? user.name : 'Frau Weber';

    const name = this.groupForm.value.name || 'Informatik Klasse 6b';
    const code = this.groupForm.value.code || 'INF-101';
    const studentIds = this.selectedStudentIds();

    await this.firebase.createGroup(name, code, teacherId, teacherName, studentIds);
    this.isSubmitting.set(false);
    this.showCreateGroupForm.set(false);
  }

  async onCreateNoteSubmit(): Promise<void> {
    if (this.noteForm.invalid) return;
    const user = this.classroomService.currentUser();
    const authorId = user ? user.id : 'user_teacher_weber';
    const authorName = user ? user.name : 'Frau Weber';
    const authorRole = (user ? user.role : 'teacher') as 'student' | 'teacher';
    const grp = this.firebase.currentGroup();
    const groupId = grp ? grp.id : 'grp_inf_101';

    const title = this.noteForm.value.title || '';
    const text = this.noteForm.value.text || '';
    const color = this.selectedNoteColor();

    await this.firebase.createNote(groupId, authorId, authorName, authorRole, title, text, color);
    this.noteForm.reset({ title: '', text: '' });
    this.showCreateNoteForm.set(false);
  }

  async onDeleteNote(noteId: string): Promise<void> {
    await this.firebase.deleteNote(noteId);
  }

  async onCreateTaskSubmit(): Promise<void> {
    if (this.taskForm.invalid) return;
    const user = this.classroomService.currentUser();
    const teacherId = user ? user.id : 'user_teacher_weber';
    const teacherName = user ? user.name : 'Frau Weber';
    const grp = this.firebase.currentGroup();
    const groupId = grp ? grp.id : 'grp_inf_101';

    const title = this.taskForm.value.title || '';
    const description = this.taskForm.value.description || '';
    const category = (this.taskForm.value.category || 'general') as 'files' | 'drawing' | 'logic' | 'coding' | 'general';

    await this.firebase.createTask(groupId, teacherId, teacherName, title, description, category);
    this.taskForm.reset({ title: '', description: '', category: 'general' });
    this.showCreateTaskForm.set(false);
  }

  async onCreateResourceSubmit(): Promise<void> {
    if (this.resourceForm.invalid) return;
    const user = this.classroomService.currentUser();
    const authorId = user ? user.id : 'user_teacher_weber';
    const authorName = user ? user.name : 'Frau Weber';
    const authorRole = (user ? user.role : 'teacher') as 'student' | 'teacher';
    const grp = this.firebase.currentGroup();
    const groupId = grp ? grp.id : 'grp_inf_101';

    const title = this.resourceForm.value.title || '';
    const type = (this.resourceForm.value.type || 'document') as 'document' | 'image' | 'link' | 'exercise';
    const content = this.resourceForm.value.content || '';

    await this.firebase.createResource(groupId, authorId, authorName, authorRole, title, type, content);
    this.resourceForm.reset({ title: '', type: 'document', content: '' });
    this.showCreateResForm.set(false);
  }
}
