import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { WindowManagerService } from '../services/window-manager.service';
import { I18nService } from '../services/i18n.service';
import { FirebaseService } from '../services/firebase.service';
import type { UserSession, VirtualItem } from '../models/classroom.types';

@Component({
  selector: 'app-student-screen-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="student-screen-viewer-root" class="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      <!-- Toast Notification -->
      @if (toast(); as t) {
        <div
          class="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-white shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all duration-300"
          [class.bg-emerald-600]="t.type === 'success'"
          [class.bg-sky-600]="t.type === 'info'"
        >
          <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">
            {{ t.type === 'success' ? 'check_circle' : 'info' }}
          </mat-icon>
          <span>{{ t.text }}</span>
        </div>
      }

      <!-- Top Toolbar & Navigation -->
      <header class="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <!-- Title & View Mode Switcher -->
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
            <mat-icon class="text-lg">desktop_windows</mat-icon>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>{{ isDe() ? 'Schüler-Bildschirme (Live-Monitor)' : 'Monitor de Pantallas de Estudiantes' }}</span>
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{{ isDe() ? 'Live' : 'En vivo' }}</span>
              </span>
            </div>
            <div class="text-[10px] text-slate-400">
              {{ isDe() ? 'Echtzeit-Überwachung der Schüler-Arbeitsplätze' : 'Supervisión en tiempo real de los espacios de trabajo' }}
            </div>
          </div>
        </div>

        <!-- Mode Toggle & Zoom -->
        <div class="flex items-center gap-1.5">
          <!-- Single vs Grid Mode -->
          <div class="flex items-center p-0.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition text-[11px]"
              [class.bg-sky-600]="viewMode() === 'single'"
              [class.text-white]="viewMode() === 'single'"
              [class.text-slate-400]="viewMode() !== 'single'"
              (click)="viewMode.set('single')"
              title="Pantalla individual en detalle"
            >
              <mat-icon class="text-sm !w-4 !h-4">tv</mat-icon>
              <span>{{ isDe() ? 'Einzelbild' : 'Individual' }}</span>
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition text-[11px]"
              [class.bg-sky-600]="viewMode() === 'grid'"
              [class.text-white]="viewMode() === 'grid'"
              [class.text-slate-400]="viewMode() !== 'grid'"
              (click)="viewMode.set('grid')"
              title="Ver todas las pantallas a la vez"
            >
              <mat-icon class="text-sm !w-4 !h-4">grid_view</mat-icon>
              <span>{{ isDe() ? 'Mosaik (Alle)' : 'Mosaico (Todos)' }}</span>
            </button>
          </div>

          <!-- Quick Cycle Student Buttons -->
          @if (viewMode() === 'single') {
            <div class="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
                (click)="prevStudent()"
                title="Alumno anterior"
                aria-label="Alumno anterior"
              >
                <mat-icon class="text-base">chevron_left</mat-icon>
              </button>
              <button
                type="button"
                class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
                (click)="nextStudent()"
                title="Alumno siguiente"
                aria-label="Alumno siguiente"
              >
                <mat-icon class="text-base">chevron_right</mat-icon>
              </button>
            </div>
          }
        </div>
      </header>

      <!-- Students Selector Ribbon (Always accessible) -->
      <nav aria-label="Selección de estudiantes" class="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
          {{ isDe() ? 'Schüler:' : 'Alumnos:' }}
        </span>

        @for (st of students(); track st.id) {
          <button
            type="button"
            class="px-2.5 py-1 rounded-xl text-xs flex items-center gap-2 border transition shrink-0"
            [class.bg-sky-950_60]="selectedStudentId() === st.id"
            [class.border-sky-500]="selectedStudentId() === st.id"
            [class.text-sky-200]="selectedStudentId() === st.id"
            [class.shadow-md]="selectedStudentId() === st.id"
            [class.bg-slate-900]="selectedStudentId() !== st.id"
            [class.border-slate-800]="selectedStudentId() !== st.id"
            [class.text-slate-400]="selectedStudentId() !== st.id"
            [class.hover:bg-slate-800]="selectedStudentId() !== st.id"
            (click)="selectStudent(st.id)"
          >
            <!-- Avatar Initial -->
            <span
              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              [class.bg-blue-600]="st.name === 'Lukas'"
              [class.bg-pink-600]="st.name === 'Emma'"
              [class.bg-amber-600]="st.name === 'Noah'"
              [class.bg-purple-600]="st.name === 'Mia'"
              [class.bg-emerald-600]="st.name === 'Leon'"
            >
              {{ st.name.charAt(0) }}
            </span>

            <span class="font-medium text-xs">{{ st.name }}</span>

            <!-- Hand raised alert badge -->
            @if (st.isHandRaised) {
              <mat-icon class="text-amber-400 text-xs !w-3.5 !h-3.5 animate-bounce shrink-0" title="Braucht Hilfe">pan_tool</mat-icon>
            }

            <!-- Current App Badge -->
            <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700/60 text-slate-300 font-mono">
              {{ getAppDisplay(st) }}
            </span>
          </button>
        }
      </nav>

      <!-- Main View Area: Either Single Student Screen or Grid View -->
      <div class="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-950 flex flex-col items-center">
        <!-- ============================================================== -->
        <!-- VIEW 1: SINGLE STUDENT SCREEN (DETAILED MONITOR) -->
        <!-- ============================================================== -->
        @if (viewMode() === 'single') {
          @if (currentStudent(); as student) {
            <div class="w-full max-w-5xl flex flex-col gap-3">
              <!-- Student Header & Intervention Controls Bar -->
              <div class="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <!-- Student Info -->
                <div class="flex items-center gap-3">
                  <div
                    class="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold text-white shadow-md shrink-0"
                    [class.bg-blue-600]="student.name === 'Lukas'"
                    [class.bg-pink-600]="student.name === 'Emma'"
                    [class.bg-amber-600]="student.name === 'Noah'"
                    [class.bg-purple-600]="student.name === 'Mia'"
                    [class.bg-emerald-600]="student.name === 'Leon'"
                  >
                    {{ student.name.charAt(0) }}
                  </div>
                  <div>
                    <div class="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{{ student.name }}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {{ isDe() ? 'Schüler' : 'Estudiante' }}
                      </span>
                      @if (student.isHandRaised) {
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                          <mat-icon class="text-xs !w-3 !h-3">pan_tool</mat-icon>
                          <span>{{ isDe() ? 'Hand gehoben' : 'Mano levantada' }}</span>
                        </span>
                      }
                    </div>
                    <div class="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>{{ isDe() ? 'Aktive App:' : 'App en uso:' }} <strong class="text-slate-200">{{ getAppDisplay(student) }}</strong></span>
                      <span>•</span>
                      <span>{{ isDe() ? 'Aufgabenfortschritt:' : 'Progreso:' }} <strong class="text-emerald-400">{{ student.taskProgress || 0 }}/7</strong></span>
                    </div>
                  </div>
                </div>

                <!-- Teacher Fast Action Buttons -->
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <!-- Send Quick Help -->
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium flex items-center gap-1.5 shadow transition"
                    (click)="openQuickTipModal(student)"
                  >
                    <mat-icon class="text-sm !w-4 !h-4">chat_bubble</mat-icon>
                    <span>{{ isDe() ? 'Tipp senden' : 'Enviar Consejo' }}</span>
                  </button>

                  <!-- Open Explorer folder -->
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 transition"
                    (click)="openStudentFolder(student.name)"
                  >
                    <mat-icon class="text-sm !w-4 !h-4 text-amber-400">folder_shared</mat-icon>
                    <span>{{ isDe() ? 'Ordner' : 'Carpeta' }}</span>
                  </button>

                  <!-- Present to class -->
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 transition"
                    (click)="presentStudentArtwork(student.name)"
                  >
                    <mat-icon class="text-sm !w-4 !h-4 text-purple-400">co_present</mat-icon>
                    <span>{{ isDe() ? 'Präsentieren' : 'Proyectar' }}</span>
                  </button>

                  <!-- Resolve help if hand raised -->
                  @if (student.isHandRaised) {
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-1.5 shadow transition"
                      (click)="resolveHelp(student.id)"
                    >
                      <mat-icon class="text-sm !w-4 !h-4">check</mat-icon>
                      <span>{{ isDe() ? 'Hilfe erledigt' : 'Resolver Ayuda' }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Virtual Computer Monitor Frame -->
              <div class="relative bg-slate-900 border-4 border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <!-- Monitor Top Bezel Bar with Webcam & Student Screen Title -->
                <div class="px-4 py-2 bg-slate-950 border-b border-slate-800/90 flex items-center justify-between text-xs text-slate-300">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span class="font-mono text-[11px] text-slate-400">
                      {{ isDe() ? 'Bildschirm von' : 'Pantalla de' }} <strong class="text-white">{{ student.name }}</strong> (INF-101)
                    </span>
                  </div>

                  <!-- Center webcam dot -->
                  <div class="w-2 h-2 rounded-full bg-slate-800 border border-slate-700 shadow-inner"></div>

                  <div class="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>1920×1080</span>
                    <span>•</span>
                    <span class="text-emerald-400">{{ isDe() ? 'Live verbunden' : 'Conexión activa' }}</span>
                  </div>
                </div>

                <!-- Simulated Desktop Screen Interior -->
                <div class="relative bg-slate-950 min-h-[460px] sm:min-h-[500px] flex flex-col overflow-hidden">
                  <!-- Simulated Window on Student's Screen based on their active app -->
                  @switch (normalizeApp(student.currentApp)) {
                    <!-- CASE 1: PAINT APP SCREEN -->
                    @case ('paint') {
                      <div class="flex-1 flex flex-col bg-slate-900 text-slate-100">
                        <!-- Paint Window Header -->
                        <div class="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
                          <div class="flex items-center gap-2">
                            <mat-icon class="text-rose-400 text-sm">palette</mat-icon>
                            <span class="font-bold text-[11px]">Paint - {{ getStudentDrawingName(student.name) }}</span>
                          </div>
                          <span class="text-[10px] text-slate-400 font-mono">800×520px • RGB</span>
                        </div>

                        <!-- Paint Toolbar Ribbon Preview -->
                        <div class="p-1.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs gap-2">
                          <div class="flex items-center gap-1.5">
                            <div class="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-medium flex items-center gap-1">
                              <mat-icon class="text-xs !w-3 !h-3">brush</mat-icon>
                              <span>Pinsel</span>
                            </div>
                            <div class="w-4 h-4 rounded-full bg-blue-500 border border-white"></div>
                            <div class="w-4 h-4 rounded-full bg-rose-500 border border-slate-700"></div>
                            <div class="w-4 h-4 rounded-full bg-amber-500 border border-slate-700"></div>
                            <div class="w-4 h-4 rounded-full bg-emerald-500 border border-slate-700"></div>
                          </div>
                          <span class="text-[10px] text-slate-400">{{ isDe() ? 'Zeichnet Haus & Sonne' : 'Dibujando casa con sol' }}</span>
                        </div>

                        <!-- Paint Canvas Interior -->
                        <div class="flex-1 p-3 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                          <div class="relative bg-white rounded-xl shadow-xl overflow-hidden border border-slate-700 w-full max-w-2xl aspect-16/10 flex items-center justify-center p-2">
                            @if (getStudentDrawing(student.name); as drawing) {
                              <img
                                [src]="drawing.thumbnail || drawing.content"
                                [alt]="drawing.name"
                                class="w-full h-full object-contain"
                              />
                            } @else {
                              <!-- Rendered live interactive student artwork simulation -->
                              <div class="w-full h-full relative bg-white flex flex-col justify-between p-4 select-none">
                                <!-- Sky with Sun -->
                                <div class="absolute top-4 right-6 w-12 h-12 rounded-full bg-amber-400 border-2 border-amber-500 shadow-md"></div>
                                <div class="text-[11px] font-bold text-slate-400 font-sans">
                                  {{ student.name }}'s {{ isDe() ? 'Zeichnung' : 'Dibujo' }}
                                </div>

                                <!-- House Drawing Graphic -->
                                <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                  <!-- Roof -->
                                  <div class="w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-b-[50px] border-b-rose-500"></div>
                                  <!-- Walls -->
                                  <div class="w-28 h-24 bg-amber-200 border-2 border-amber-600 relative flex items-center justify-center">
                                    <div class="w-8 h-12 bg-amber-800 rounded-t-sm absolute bottom-0"></div>
                                    <div class="w-6 h-6 bg-sky-200 border border-sky-400 absolute top-2 right-2"></div>
                                  </div>
                                </div>

                                <!-- Grass Floor -->
                                <div class="absolute bottom-0 inset-x-0 h-4 bg-emerald-500"></div>
                              </div>
                            }

                            <!-- Live Student Cursor Pointer on Canvas -->
                            <div class="absolute bottom-16 right-24 pointer-events-none flex items-center gap-1.5 transition-all duration-700 animate-pulse">
                              <mat-icon class="text-rose-500 text-base drop-shadow-md">near_me</mat-icon>
                              <span class="px-1.5 py-0.5 rounded bg-rose-600 text-[10px] font-bold text-white shadow-md">
                                {{ student.name }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- CASE 2: ROBOCODE (CODING APP) SCREEN -->
                    @case ('coding') {
                      <div class="flex-1 flex flex-col bg-slate-900 text-slate-100">
                        <div class="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
                          <div class="flex items-center gap-2">
                            <mat-icon class="text-indigo-400 text-sm">terminal</mat-icon>
                            <span class="font-bold text-[11px]">RoboCode 6b - {{ student.name }}_mission.py</span>
                          </div>
                          <span class="text-[10px] text-emerald-400 font-mono">Running (Robot OK)</span>
                        </div>

                        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 p-3 gap-3 bg-slate-950">
                          <!-- Code Editor -->
                          <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] leading-relaxed text-indigo-200 flex flex-col justify-between overflow-hidden shadow-inner">
                            <div>
                              <div class="text-slate-500 text-[10px] mb-2"># RoboCode Mission von {{ student.name }}</div>
                              <div><span class="text-purple-400">def</span> <span class="text-blue-300">start_robot</span>():</div>
                              <div class="pl-4 text-emerald-300">robot.set_speed(<span class="text-amber-300">4</span>)</div>
                              <div class="pl-4 text-emerald-300">robot.scan_radar(<span class="text-amber-300">120</span>)</div>
                              <div class="pl-4"><span class="text-purple-400">for</span> step <span class="text-purple-400">in</span> range(<span class="text-amber-300">4</span>):</div>
                              <div class="pl-8 text-emerald-300">robot.drive_forward(<span class="text-amber-300">80</span>)</div>
                              <div class="pl-8 text-emerald-300">robot.turn_right(<span class="text-amber-300">90</span>)</div>
                              <div class="pl-8 text-emerald-300">robot.collect_sample()</div>
                              <div class="pl-4 text-sky-300">robot.report_status(<span class="text-amber-200">"Mission komplett!"</span>)</div>
                            </div>
                            <div class="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                              <span>Zeilen: 9 • Python</span>
                              <span class="text-emerald-400">Syntax OK</span>
                            </div>
                          </div>

                          <!-- Robot Radar Simulator Canvas -->
                          <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
                            <div class="w-full h-full relative rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                              <!-- Grid lines -->
                              <div class="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

                              <!-- Robot Tank in Center -->
                              <div class="relative w-12 h-12 rounded-xl bg-indigo-600 border-2 border-indigo-400 shadow-lg flex items-center justify-center animate-pulse">
                                <mat-icon class="text-white text-base">smart_toy</mat-icon>
                                <!-- Radar Sweep Ring -->
                                <div class="absolute inset-0 rounded-full border border-sky-400/40 animate-ping"></div>
                              </div>

                              <!-- Target sample icon -->
                              <div class="absolute top-4 right-6 text-amber-400">
                                <mat-icon class="text-sm">flag</mat-icon>
                              </div>

                              <!-- Live Telemetry Tag -->
                              <div class="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[9px] font-mono text-slate-300">
                                Pos: (120, 85) • Speed: 4 • Status: Collecting
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- CASE 3: FILE EXPLORER SCREEN -->
                    @case ('explorer') {
                      <div class="flex-1 flex flex-col bg-slate-900 text-slate-100">
                        <div class="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
                          <div class="flex items-center gap-2">
                            <mat-icon class="text-amber-400 text-sm">folder_open</mat-icon>
                            <span class="font-bold text-[11px]">Explorer - /Klasse/{{ student.name }}</span>
                          </div>
                          <span class="text-[10px] text-slate-400 font-mono">Dateien: {{ getStudentFileCount(student.name) }}</span>
                        </div>

                        <!-- Address Bar -->
                        <div class="p-2 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-xs">
                          <mat-icon class="text-slate-500 text-sm">arrow_forward</mat-icon>
                          <span class="px-2 py-1 bg-slate-900 rounded-lg text-slate-300 font-mono text-[11px] flex-1">
                            C:/Klasse/{{ student.name }}/Meine Zeichnungen
                          </span>
                        </div>

                        <!-- Files Grid inside Student Folder -->
                        <div class="flex-1 p-4 bg-slate-950 grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-y-auto">
                          <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center gap-1 shadow">
                            <mat-icon class="text-amber-400 text-2xl">folder</mat-icon>
                            <span class="text-xs font-semibold text-slate-200">Meine Zeichnungen</span>
                            <span class="text-[10px] text-slate-500">Ordner</span>
                          </div>
                          <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center gap-1 shadow">
                            <mat-icon class="text-amber-400 text-2xl">folder</mat-icon>
                            <span class="text-xs font-semibold text-slate-200">Fertige Arbeiten</span>
                            <span class="text-[10px] text-slate-500">Ordner</span>
                          </div>

                          @for (f of getStudentFiles(student.name); track f.path) {
                            <div class="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center gap-1 shadow hover:border-slate-700">
                              @if (f.thumbnail || f.content) {
                                <img [src]="f.thumbnail || f.content" [alt]="f.name" class="w-12 h-10 object-contain rounded bg-white p-0.5" />
                              } @else {
                                <mat-icon class="text-blue-400 text-2xl">image</mat-icon>
                              }
                              <span class="text-xs font-medium text-slate-200 truncate w-full">{{ f.name }}</span>
                              <span class="text-[9px] text-slate-500">{{ Math.round((f.sizeBytes || 1024) / 1024) }} KB</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- CASE 4: LOGIC GAMES SCREEN -->
                    @case ('logic-games') {
                      <div class="flex-1 flex flex-col bg-slate-900 text-slate-100">
                        <div class="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
                          <div class="flex items-center gap-2">
                            <mat-icon class="text-cyan-400 text-sm">videogame_asset</mat-icon>
                            <span class="font-bold text-[11px]">Logik-Labor - Zeek the Geek</span>
                          </div>
                          <span class="text-[10px] text-cyan-300 font-mono">Punkte: 450 • Level 2</span>
                        </div>

                        <div class="flex-1 p-4 bg-slate-950 flex items-center justify-center">
                          <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col items-center gap-3">
                            <div class="grid grid-cols-4 gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                              <div class="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center font-bold text-white">🍄</div>
                              <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">·</div>
                              <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">·</div>
                              <div class="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-white">🌸</div>
                              <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">·</div>
                              <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">👾</div>
                              <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">·</div>
                              <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">·</div>
                            </div>
                            <span class="text-xs text-slate-400 font-medium">{{ student.name }} {{ isDe() ? 'löst Level 2' : 'resolviendo nivel 2' }}</span>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- CASE 5: DEFAULT DESKTOP SCREEN -->
                    @default {
                      <div class="flex-1 flex flex-col bg-slate-900 text-slate-100">
                        <div class="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
                          <div class="flex items-center gap-2">
                            <mat-icon class="text-sky-400 text-sm">desktop_windows</mat-icon>
                            <span class="font-bold text-[11px]">{{ student.name }}'s Desktop (Informatik 6b)</span>
                          </div>
                          <span class="text-[10px] text-slate-400 font-mono">{{ student.activityDetail || 'Arbeitsbereich bereit' }}</span>
                        </div>

                        <div class="flex-1 p-6 bg-slate-950 flex flex-col justify-between relative overflow-hidden">
                          <!-- Desktop App Icons -->
                          <div class="grid grid-cols-3 sm:grid-cols-4 gap-4 max-w-sm">
                            <div class="flex flex-col items-center gap-1 text-center">
                              <mat-icon class="text-amber-400 text-3xl">folder</mat-icon>
                              <span class="text-[10px] text-slate-300 font-medium">Meine Dateien</span>
                            </div>
                            <div class="flex flex-col items-center gap-1 text-center">
                              <mat-icon class="text-rose-400 text-3xl">palette</mat-icon>
                              <span class="text-[10px] text-slate-300 font-medium">Paint</span>
                            </div>
                            <div class="flex flex-col items-center gap-1 text-center">
                              <mat-icon class="text-indigo-400 text-3xl">terminal</mat-icon>
                              <span class="text-[10px] text-slate-300 font-medium">RoboCode</span>
                            </div>
                            <div class="flex flex-col items-center gap-1 text-center">
                              <mat-icon class="text-emerald-400 text-3xl">assignment</mat-icon>
                              <span class="text-[10px] text-slate-300 font-medium">Aufgaben</span>
                            </div>
                          </div>

                          <!-- Taskbar at bottom of student screen -->
                          <div class="w-full px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <div class="flex items-center gap-2">
                              <span class="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">Start</span>
                              <span>{{ student.currentApp || 'Desktop' }}</span>
                            </div>
                            <span>10:30</span>
                          </div>
                        </div>
                      </div>
                    }
                  }
                </div>
              </div>
            </div>
          }
        }

        <!-- ============================================================== -->
        <!-- VIEW 2: MULTI-SCREEN GRID (TODAS LAS PANTALLAS A LA VEZ) -->
        <!-- ============================================================== -->
        @if (viewMode() === 'grid') {
          <div class="w-full max-w-6xl space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <mat-icon class="text-sky-400">grid_view</mat-icon>
                  <span>{{ isDe() ? 'Mosaik-Ansicht aller Schüler-Bildschirme' : 'Mosaico de Todas las Pantallas de Alumnos' }}</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">
                  {{ isDe()
                    ? 'Sieh auf einen Blick, woran alle 5 Schüler gerade arbeiten. Klicke auf einen Bildschirm, um ihn zu vergrößern.'
                    : 'Supervisa de un vistazo en qué trabaja cada alumno en tiempo real. Haz clic en cualquier pantalla para ampliarla.' }}
                </p>
              </div>

              <span class="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{{ students().length }} {{ isDe() ? 'Bildschirme aktiv' : 'pantallas activas' }}</span>
              </span>
            </div>

            <!-- Grid of Student Mini Monitors -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              @for (st of students(); track st.id) {
                <button
                  type="button"
                  class="w-full text-left bg-slate-900 border border-slate-800 hover:border-sky-500/80 rounded-2xl p-3 flex flex-col gap-2.5 shadow-lg transition-all cursor-pointer group"
                  (click)="selectStudent(st.id); viewMode.set('single')"
                >
                  <!-- Card Header -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div
                        class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm"
                        [class.bg-blue-600]="st.name === 'Lukas'"
                        [class.bg-pink-600]="st.name === 'Emma'"
                        [class.bg-amber-600]="st.name === 'Noah'"
                        [class.bg-purple-600]="st.name === 'Mia'"
                        [class.bg-emerald-600]="st.name === 'Leon'"
                      >
                        {{ st.name.charAt(0) }}
                      </div>
                      <div>
                        <div class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{{ st.name }}</span>
                          @if (st.isHandRaised) {
                            <mat-icon class="text-amber-400 text-xs !w-3.5 !h-3.5 animate-bounce">pan_tool</mat-icon>
                          }
                        </div>
                        <div class="text-[10px] text-slate-400">
                          {{ getAppDisplay(st) }}
                        </div>
                      </div>
                    </div>

                    <span class="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30"></span>
                  </div>

                  <!-- Mini Screen Preview Window -->
                  <div class="w-full aspect-16/10 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative flex items-center justify-center group-hover:ring-2 group-hover:ring-sky-500/40 transition">
                    @if (getStudentDrawing(st.name); as drawing) {
                      <img [src]="drawing.thumbnail || drawing.content" [alt]="drawing.name" class="w-full h-full object-contain p-1" />
                    } @else if (normalizeApp(st.currentApp) === 'coding') {
                      <div class="p-2 w-full h-full font-mono text-[8px] text-indigo-300 leading-tight bg-slate-950">
                        <div class="text-slate-500"># RoboCode {{ st.name }}</div>
                        <div>def robot_move():</div>
                        <div class="pl-2 text-emerald-400">radar.scan()</div>
                        <div class="pl-2 text-sky-400">drive(80)</div>
                      </div>
                    } @else {
                      <div class="flex flex-col items-center justify-center gap-1 text-slate-500">
                        <mat-icon class="text-xl text-slate-600">desktop_windows</mat-icon>
                        <span class="text-[9px]">{{ st.currentApp || 'Desktop' }}</span>
                      </div>
                    }

                    <!-- Expand hover badge -->
                    <div class="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition backdrop-blur-xs">
                      <span class="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-[11px] font-semibold flex items-center gap-1 shadow">
                        <mat-icon class="text-xs">visibility</mat-icon>
                        <span>{{ isDe() ? 'Vergrößern' : 'Ampliar Pantalla' }}</span>
                      </span>
                    </div>
                  </div>

                  <!-- Progress Bar & Actions -->
                  <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>{{ isDe() ? 'Aufgaben' : 'Tareas' }}: {{ st.taskProgress || 0 }}/7</span>
                    <span class="text-sky-400 font-medium">{{ Math.round(((st.taskProgress || 0) / 7) * 100) }}%</span>
                  </div>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- Quick Assistance Modal Dialog -->
      @if (showQuickTipModal()) {
        <div class="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <mat-icon class="text-indigo-400">chat_bubble</mat-icon>
                <span>{{ isDe() ? 'Tipp an' : 'Enviar Consejo a' }} {{ quickTipStudent()?.name }}</span>
              </div>
              <button
                type="button"
                class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                (click)="showQuickTipModal.set(false)"
                aria-label="Cerrar modal"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <div class="p-4 flex flex-col gap-3 text-xs">
              <p class="text-slate-300">
                {{ isDe()
                  ? 'Wähle einen fertigen Tipp oder schreibe eine Nachricht, die direkt auf dem Bildschirm des Schülers erscheint:'
                  : 'Elige un consejo rápido o escribe un mensaje que aparecerá en la pantalla del estudiante:' }}
              </p>

              <!-- Ready-made tips -->
              <div class="flex flex-col gap-1.5">
                @for (tip of quickTips; track tip) {
                  <button
                    type="button"
                    class="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/80 text-left text-slate-200 hover:text-white transition"
                    (click)="sendAssistantTip(tip)"
                  >
                    {{ tip }}
                  </button>
                }
              </div>
            </div>

            <div class="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
              <button
                type="button"
                class="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
                (click)="showQuickTipModal.set(false)"
              >
                {{ isDe() ? 'Schließen' : 'Cerrar' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class StudentScreenViewer implements OnInit {
  readonly initialStudentId = input<string | null>(null);

  readonly classroom = inject(ClassroomService);
  readonly wm = inject(WindowManagerService);
  readonly i18n = inject(I18nService);
  readonly firebase = inject(FirebaseService);

  readonly isDe = this.i18n.isDe;
  readonly Math = Math;

  readonly selectedStudentId = signal<string>('user_student_lukas');
  readonly viewMode = signal<'single' | 'grid'>('single');
  readonly toast = signal<{ text: string; type: 'success' | 'info' } | null>(null);
  readonly showQuickTipModal = signal<boolean>(false);
  readonly quickTipStudent = signal<UserSession | null>(null);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly students = computed(() => {
    return this.classroom.students();
  });

  readonly currentStudent = computed(() => {
    const list = this.students();
    const id = this.selectedStudentId();
    return list.find((s) => s.id === id) || list[0] || null;
  });

  readonly quickTips = [
    '¡Excelente avance! Sigue con el siguiente paso 🌟',
    'Recuerda guardar tu archivo en la carpeta "Meine Zeichnungen" 💾',
    '¿Necesitas ayuda con las herramientas o figuras geométricas? 🎨',
    'Revisa la lista de tareas en la barra de actividades 📋',
    '¡Muy bien programado el sensor del robot! 🤖',
  ];

  ngOnInit(): void {
    const initId = this.initialStudentId();
    if (initId) {
      this.selectedStudentId.set(initId);
    } else {
      const first = this.students()[0];
      if (first) {
        this.selectedStudentId.set(first.id);
      }
    }
  }

  selectStudent(studentId: string): void {
    this.selectedStudentId.set(studentId);
    this.classroom.setObserving(studentId);
  }

  prevStudent(): void {
    const list = this.students();
    if (list.length === 0) return;
    const idx = list.findIndex((s) => s.id === this.selectedStudentId());
    const nextIdx = (idx - 1 + list.length) % list.length;
    this.selectStudent(list[nextIdx].id);
  }

  nextStudent(): void {
    const list = this.students();
    if (list.length === 0) return;
    const idx = list.findIndex((s) => s.id === this.selectedStudentId());
    const nextIdx = (idx + 1) % list.length;
    this.selectStudent(list[nextIdx].id);
  }

  getAppDisplay(student: UserSession): string {
    const app = student.currentApp?.toLowerCase() || '';
    if (app.includes('paint') || app.includes('zeichn')) return 'Paint 🎨';
    if (app.includes('cod') || app.includes('robo') || app.includes('program')) return 'RoboCode 💻';
    if (app.includes('explor') || app.includes('datei')) return 'Explorer 📁';
    if (app.includes('logi') || app.includes('zeek') || app.includes('spiel')) return 'Lógica 🧩';
    if (app.includes('activ') || app.includes('aufgab')) return 'Tareas 📋';
    return student.currentApp || 'Desktop 🖥️';
  }

  normalizeApp(app?: string): 'paint' | 'coding' | 'explorer' | 'logic-games' | 'desktop' {
    if (!app) return 'paint'; // default student app in classroom
    const a = app.toLowerCase();
    if (a.includes('paint') || a.includes('zeichn')) return 'paint';
    if (a.includes('cod') || a.includes('robo') || a.includes('terminal')) return 'coding';
    if (a.includes('explor') || a.includes('datei')) return 'explorer';
    if (a.includes('logi') || a.includes('zeek') || a.includes('game') || a.includes('spiel')) return 'logic-games';
    return 'desktop';
  }

  getStudentDrawing(studentName: string): VirtualItem | null {
    const room = this.classroom.classroom();
    if (!room) return null;
    const prefix = `/Klasse/${studentName}`;
    for (const [path, file] of Object.entries(room.files)) {
      if (path.startsWith(prefix) && file.type === 'file' && (file.thumbnail || file.content)) {
        return file;
      }
    }
    return null;
  }

  getStudentDrawingName(studentName: string): string {
    const d = this.getStudentDrawing(studentName);
    return d ? d.name : 'Mein Haus.png';
  }

  getStudentFiles(studentName: string): VirtualItem[] {
    const room = this.classroom.classroom();
    if (!room) return [];
    const prefix = `/Klasse/${studentName}`;
    const result: VirtualItem[] = [];
    for (const [path, file] of Object.entries(room.files)) {
      if (path.startsWith(prefix) && file.type === 'file') {
        result.push(file);
      }
    }
    return result;
  }

  getStudentFileCount(studentName: string): number {
    return this.getStudentFiles(studentName).length;
  }

  openStudentFolder(studentName: string): void {
    const path = `/Klasse/${studentName}`;
    this.wm.openWindow('explorer', `Explorer: ${studentName}`, { initialPath: path });
  }

  presentStudentArtwork(studentName: string): void {
    const drawing = this.getStudentDrawing(studentName);
    if (drawing) {
      this.classroom.presentWork(drawing.path);
      this.showToastNotification(
        this.isDe()
          ? `Zeichnung von ${studentName} wird der gesamten Klasse präsentiert!`
          : `¡El trabajo de ${studentName} se está proyectando a toda la clase!`,
        'success'
      );
    } else {
      this.showToastNotification(
        this.isDe()
          ? `${studentName} hat noch keine fertige Datei gespeichert.`
          : `${studentName} aún no ha guardado un archivo final.`,
        'info'
      );
    }
  }

  resolveHelp(studentId: string): void {
    this.classroom.resolveHelp(studentId);
    this.showToastNotification(
      this.isDe() ? 'Hilfeanfrage als gelöst markiert.' : 'Solicitud de ayuda resuelta.',
      'success'
    );
  }

  openQuickTipModal(student: UserSession): void {
    this.quickTipStudent.set(student);
    this.showQuickTipModal.set(true);
  }

  async sendAssistantTip(tip: string): Promise<void> {
    const st = this.quickTipStudent();
    if (!st) return;

    this.showQuickTipModal.set(false);
    const teacher = this.classroom.currentUser();
    const teacherName = teacher?.name || 'Frau Weber';

    // Send instant message to the class/group chat
    try {
      await this.classroom.sendChatMessage(`[Asistencia a ${st.name}]: ${tip}`, 'text');
    } catch {
      // Ignore fallback
    }

    this.showToastNotification(
      this.isDe()
        ? `Tipp an ${st.name} erfolgreich gesendet!`
        : `¡Consejo enviado a la pantalla de ${st.name}!`,
      'success'
    );
  }

  private showToastNotification(text: string, type: 'success' | 'info'): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toast.set({ text, type });
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 3200);
  }
}
