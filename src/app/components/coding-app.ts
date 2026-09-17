import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

export interface CodeBlock {
  id: string;
  type: 'forward' | 'turnLeft' | 'turnRight' | 'collect' | 'repeat2' | 'repeat3';
  label: string;
  icon: string;
  color: string;
  children?: CodeBlock[]; // for repeat blocks
}

export interface GridCell {
  x: number;
  y: number;
  type: 'empty' | 'wall' | 'goal' | 'star';
  collected?: boolean;
}

export interface LevelConfig {
  id: number;
  titleDe: string;
  titleEs: string;
  subtitleDe: string;
  subtitleEs: string;
  conceptTitleDe: string;
  conceptTitleEs: string;
  conceptDescriptionDe: string;
  conceptDescriptionEs: string;
  gridWidth: number;
  gridHeight: number;
  robotStart: { x: number; y: number; dir: 'N' | 'E' | 'S' | 'W' };
  targetGoal: { x: number; y: number };
  stars: { x: number; y: number }[];
  walls: { x: number; y: number }[];
  maxBlocks?: number;
  allowRepeat?: boolean;
}

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    titleDe: 'Level 1: Erste Schritte',
    titleEs: 'Nivel 1: Primeros Pasos',
    subtitleDe: 'Lerne, was ein Algorithmus ist: eine geordnete Folge von Schritten.',
    subtitleEs: 'Aprende qué es un Algoritmo: una serie de pasos ordenados.',
    conceptTitleDe: 'Was ist ein Algorithmus?',
    conceptTitleEs: '¿Qué es un Algoritmo?',
    conceptDescriptionDe:
      'Ein Computer denkt nicht selbst. Er benötigt eine genaue, geordnete Folge von Befehlen, um ein Ziel zu erreichen.',
    conceptDescriptionEs:
      'Un ordenador no piensa solo. Necesita una secuencia clara y ordenada de pasos exactos para lograr un objetivo.',
    gridWidth: 5,
    gridHeight: 5,
    robotStart: { x: 1, y: 3, dir: 'E' },
    targetGoal: { x: 4, y: 3 },
    stars: [{ x: 2, y: 3 }, { x: 3, y: 3 }],
    walls: [],
  },
  {
    id: 2,
    titleDe: 'Level 2: Um die Ecke biegen',
    titleEs: 'Nivel 2: Doblando Esquinas',
    subtitleDe: 'Lerne Richtungswechsel mit Drehungen.',
    subtitleEs: 'Aprende a cambiar de dirección con giros.',
    conceptTitleDe: 'Orientierung & Drehungen',
    conceptTitleEs: 'Orientación y Giros',
    conceptDescriptionDe:
      'Nach links oder rechts drehen ändert nur die Blickrichtung des Roboters; er bleibt auf demselben Feld stehen.',
    conceptDescriptionEs:
      'Girar a la izquierda o a la derecha solo cambia la dirección hacia donde mira el robot; no lo mueve de casilla.',
    gridWidth: 5,
    gridHeight: 5,
    robotStart: { x: 1, y: 4, dir: 'N' },
    targetGoal: { x: 3, y: 1 },
    stars: [{ x: 1, y: 2 }, { x: 2, y: 1 }],
    walls: [
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ],
  },
  {
    id: 3,
    titleDe: 'Level 3: Die Kraft der Schleifen (Loops)',
    titleEs: 'Nivel 3: El Poder de los Bucles',
    subtitleDe: 'Nutze "Wiederhole 3x", um nicht denselben Befehl mehrfach schreiben zu müssen.',
    subtitleEs: 'Usa "Repetir 3x" para no escribir la misma orden muchas veces.',
    conceptTitleDe: 'Was ist eine Schleife (Loop)?',
    conceptTitleEs: '¿Qué es un Bucle (Loop)?',
    conceptDescriptionDe:
      'Programmierer sind schlau: Statt fünfmal "Vorwärts" zu schreiben, nutzen wir Schleifen zur automatischen Wiederholung.',
    conceptDescriptionEs:
      'Los programadores somos listos y perezosos: en vez de escribir "Avanzar" 5 veces, usamos un bucle para repetir acciones automáticamente.',
    gridWidth: 6,
    gridHeight: 4,
    robotStart: { x: 0, y: 1, dir: 'E' },
    targetGoal: { x: 5, y: 1 },
    stars: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }],
    walls: [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ],
    allowRepeat: true,
  },
  {
    id: 4,
    titleDe: 'Level 4: Firewalls umgehen',
    titleEs: 'Nivel 4: Esquivando Cortafuegos',
    subtitleDe: 'Finde den sicheren Pfad zum Hauptserver.',
    subtitleEs: 'Elige el camino seguro hasta el servidor principal.',
    conceptTitleDe: 'Fehlersuche (Debugging)',
    conceptTitleEs: 'Depuración (Debugging)',
    conceptDescriptionDe:
      'Stößt dein Roboter gegen eine Wand? Kein Problem! Das nennt man "Bug". Schau genau hin und korrigiere den fehlerhaften Schritt.',
    conceptDescriptionEs:
      'Si tu robot choca contra una pared, ¡no pasa nada! Se llama "bug" o fallo. Observa en qué paso falló y corrígelo.',
    gridWidth: 6,
    gridHeight: 5,
    robotStart: { x: 0, y: 0, dir: 'S' },
    targetGoal: { x: 5, y: 4 },
    stars: [{ x: 2, y: 2 }, { x: 4, y: 1 }],
    walls: [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ],
    allowRepeat: true,
  },
  {
    id: 5,
    titleDe: 'Level 5: Die Datentreppe',
    titleEs: 'Nivel 5: La Escalera de Datos',
    subtitleDe: 'Kombiniere Vorwärts- und Dreh-Schritte, um aufzusteigen.',
    subtitleEs: 'Combina bucles de avance y giro para subir.',
    conceptTitleDe: 'Muster im Code',
    conceptTitleEs: 'Patrones en Código',
    conceptDescriptionDe:
      'Viele Probleme lassen sich lösen, indem man das sich wiederholende Muster erkennt. Erklimme die Treppe Stufe für Stufe!',
    conceptDescriptionEs:
      'Muchos problemas se resuelven descubriendo el patrón repetitivo. ¡Sube la escalera peldaño a peldaño!',
    gridWidth: 6,
    gridHeight: 6,
    robotStart: { x: 0, y: 5, dir: 'N' },
    targetGoal: { x: 5, y: 0 },
    stars: [{ x: 1, y: 4 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 4, y: 1 }],
    walls: [
      { x: 0, y: 3 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 5 },
      { x: 3, y: 4 },
      { x: 4, y: 3 },
    ],
    allowRepeat: true,
  },
  {
    id: 6,
    titleDe: 'Level 6: Meister-Programmierer',
    titleEs: 'Nivel 6: Desafío Master Hacker',
    subtitleDe: 'Sammle alle Datensterne des Zentralservers ein.',
    subtitleEs: 'Recolecta todas las estrellas del servidor central.',
    conceptTitleDe: 'Informatisches Denken',
    conceptTitleEs: 'Pensamiento Computacional',
    conceptDescriptionDe:
      'Herzlichen Glückwunsch! Du hast die echten Prinzipien der Informatik gelernt, die Software-Ingenieure täglich anwenden.',
    conceptDescriptionEs:
      '¡Felicidades! Has aprendido los principios reales de la informática que usan los ingenieros de software todos los días.',
    gridWidth: 6,
    gridHeight: 6,
    robotStart: { x: 0, y: 0, dir: 'E' },
    targetGoal: { x: 5, y: 5 },
    stars: [{ x: 5, y: 0 }, { x: 0, y: 5 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
    walls: [
      { x: 1, y: 1 },
      { x: 4, y: 1 },
      { x: 1, y: 4 },
      { x: 4, y: 4 },
    ],
    allowRepeat: true,
  },
];

@Component({
  selector: 'app-coding-app',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="coding-app-root" class="flex flex-col h-full bg-slate-900 text-slate-100 font-sans select-none overflow-hidden">
      <!-- Top Bar: Level Selector, Stats & Controls -->
      <header class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-slate-800/90 border-b border-slate-700/80 shrink-0">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs sm:text-sm font-semibold">
            <mat-icon class="text-base leading-none">terminal</mat-icon>
            <span>{{ t().coding.title }}</span>
          </div>

          <!-- Level Buttons -->
          <div class="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-700/60">
            @for (lvl of levels; track lvl.id) {
              <button
                type="button"
                [id]="'btn-level-' + lvl.id"
                (click)="selectLevel(lvl.id)"
                class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md text-xs font-bold transition-colors"
                [class.bg-indigo-600]="currentLevelId() === lvl.id"
                [class.text-white]="currentLevelId() === lvl.id"
                [class.bg-slate-800]="currentLevelId() !== lvl.id"
                [class.text-slate-400]="currentLevelId() !== lvl.id"
                [class.hover:bg-slate-700]="currentLevelId() !== lvl.id"
              >
                {{ lvl.id }}
              </button>
            }
          </div>
        </div>

        <!-- Middle: Star Count and Status -->
        <div class="flex items-center gap-2 sm:gap-4 text-xs">
          <div class="flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full font-medium">
            <mat-icon class="text-sm sm:text-base text-amber-400">star</mat-icon>
            <span>{{ starsCollected() }} / {{ currentLevel().stars.length }}</span>
          </div>

          <div class="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-300">
            <mat-icon class="text-base text-cyan-400">memory</mat-icon>
            <span>{{ program().length }} {{ t().coding.blocksPalette }}</span>
          </div>
        </div>

        <!-- Actions: Run, Step, Reset -->
        <div class="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            id="btn-run-code"
            (click)="runProgram()"
            [disabled]="isRunning() || program().length === 0"
            class="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold rounded-lg shadow transition"
          >
            <mat-icon class="text-base">play_arrow</mat-icon>
            <span>{{ isRunning() ? '...' : t().coding.run }}</span>
          </button>

          <button
            type="button"
            id="btn-step-code"
            (click)="stepProgram()"
            [disabled]="isRunning() || program().length === 0"
            class="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            <mat-icon class="text-base">skip_next</mat-icon>
            <span class="hidden sm:inline">{{ t().coding.stepByStep }}</span>
          </button>

          <button
            type="button"
            id="btn-reset-code"
            (click)="resetSimulation()"
            class="flex items-center gap-1 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
            title="Reset"
          >
            <mat-icon class="text-base">refresh</mat-icon>
          </button>
        </div>
      </header>

      <!-- Mobile Tab Switcher (Spielfeld vs Code) -->
      <div class="flex md:hidden items-center justify-center p-1 bg-slate-950 border-b border-slate-800 gap-1.5 shrink-0">
        <button
          type="button"
          class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          [class.bg-indigo-600]="mobileTab() === 'grid'"
          [class.text-white]="mobileTab() === 'grid'"
          [class.bg-slate-900]="mobileTab() !== 'grid'"
          [class.text-slate-400]="mobileTab() !== 'grid'"
          (click)="mobileTab.set('grid')"
        >
          <mat-icon class="text-sm !w-4 !h-4">grid_view</mat-icon>
          <span>{{ isDe() ? 'Spielfeld' : 'Tablero' }}</span>
        </button>
        <button
          type="button"
          class="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          [class.bg-indigo-600]="mobileTab() === 'code'"
          [class.text-white]="mobileTab() === 'code'"
          [class.bg-slate-900]="mobileTab() !== 'code'"
          [class.text-slate-400]="mobileTab() !== 'code'"
          (click)="mobileTab.set('code')"
        >
          <mat-icon class="text-sm !w-4 !h-4">code</mat-icon>
          <span>{{ isDe() ? 'Programm' : 'Código' }} ({{ program().length }})</span>
        </button>
      </div>

      <!-- Teacher's Pedagogical Advice Bar -->
      <div class="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-950/40 border-b border-indigo-900/40 text-xs text-indigo-200 shrink-0">
        <div class="flex items-center gap-1 font-bold text-indigo-300 shrink-0">
          <mat-icon class="text-base text-amber-400">school</mat-icon>
          <span>{{ isDe() ? currentLevel().conceptTitleDe : currentLevel().conceptTitleEs }}:</span>
        </div>
        <p class="truncate text-slate-300">{{ isDe() ? currentLevel().conceptDescriptionDe : currentLevel().conceptDescriptionEs }}</p>
      </div>

      <!-- Main Layout: Grid Canvas (Left) + Code Editor / Blocks (Right) -->
      <div class="flex-1 flex flex-col md:grid md:grid-cols-12 gap-0 overflow-hidden">
        <!-- LEFT: Robot Grid World (Cols 1-7) -->
        <div
          class="flex-1 md:col-span-7 flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-950/60 relative overflow-y-auto"
          [class.hidden]="mobileTab() !== 'grid'"
          [class.md:flex]="true"
        >
          <!-- Grid Container -->
          <div
            class="grid gap-1 sm:gap-1.5 p-2 sm:p-3 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl relative max-w-full overflow-auto"
            [style.grid-template-columns]="'repeat(' + currentLevel().gridWidth + ', minmax(0, 1fr))'"
          >
            @for (row of gridRows(); track $index) {
              @for (cell of row; track cell.x + '-' + cell.y) {
                <div
                  [id]="'cell-' + cell.x + '-' + cell.y"
                  class="w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center relative transition-all duration-300"
                  [class.bg-slate-800]="cell.type === 'empty'"
                  [class.border]="true"
                  [class.border-slate-700/60]="cell.type === 'empty'"
                  [class.bg-slate-700]="cell.type === 'wall'"
                  [class.border-slate-600]="cell.type === 'wall'"
                  [class.bg-emerald-950/60]="cell.type === 'goal'"
                  [class.border-emerald-500/60]="cell.type === 'goal'"
                >
                  <!-- Goal Flag / Server Icon -->
                  @if (cell.type === 'goal') {
                    <div class="flex flex-col items-center text-emerald-400 animate-pulse">
                      <mat-icon class="text-2xl">dns</mat-icon>
                      <span class="text-[9px] font-bold uppercase tracking-wider">{{ isDe() ? 'Ziel' : 'Meta' }}</span>
                    </div>
                  }

                  <!-- Wall Obstacle -->
                  @if (cell.type === 'wall') {
                    <div class="flex flex-col items-center text-slate-400 opacity-60">
                      <mat-icon class="text-xl">security</mat-icon>
                    </div>
                  }

                  <!-- Star to collect -->
                  @if (cell.type === 'star' && !cell.collected) {
                    <div class="flex items-center justify-center text-amber-400 animate-bounce">
                      <mat-icon class="text-2xl">star</mat-icon>
                    </div>
                  }

                  <!-- Robot Avatar -->
                  @if (robotPos().x === cell.x && robotPos().y === cell.y) {
                    <div
                      id="robot-avatar"
                      class="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300"
                      [style.transform]="getRobotRotationTransform()"
                    >
                      <div class="w-11 h-11 bg-indigo-600 text-white rounded-xl shadow-lg border-2 border-indigo-300 flex flex-col items-center justify-center relative">
                        <!-- Robot Eyes -->
                        <div class="flex items-center gap-1.5 mb-0.5">
                          <span class="w-1.5 h-1.5 bg-cyan-300 rounded-full animate-ping"></span>
                          <span class="w-1.5 h-1.5 bg-cyan-300 rounded-full"></span>
                        </div>
                        <!-- Direction Needle Pointer -->
                        <div class="absolute -top-1.5 text-amber-300">
                          <mat-icon class="text-sm">navigation</mat-icon>
                        </div>
                        <mat-icon class="text-lg leading-none">smart_toy</mat-icon>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- Compass / Direction Indicator -->
          <div class="mt-4 flex items-center gap-4 text-xs text-slate-400">
            <span class="flex items-center gap-1">
              <span class="font-bold text-slate-300">{{ isDe() ? 'Blickrichtung:' : 'Orientación:' }}</span>
              <span class="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300 font-mono">
                {{ getDirectionLabel() }}
              </span>
            </span>
            <span>{{ isDe() ? 'Aktuelles Feld:' : 'Casilla actual:' }} <strong class="text-slate-200">({{ robotPos().x }}, {{ robotPos().y }})</strong></span>
          </div>

          <!-- Level Completed Overlay Modal -->
          @if (levelCompleted()) {
            <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20 animate-in fade-in zoom-in duration-300">
              <div class="bg-slate-900 border border-emerald-500/50 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
                <div class="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                  <mat-icon class="text-3xl">military_tech</mat-icon>
                </div>
                <h3 class="text-lg font-bold text-white mb-1">{{ t().coding.congratsTitle }}</h3>
                <p class="text-xs text-slate-300 mb-4">{{ t().coding.congratsMsg }}</p>

                <div class="flex items-center justify-center gap-2 mb-5 py-2 px-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                  <span class="text-xs text-slate-300">{{ isDe() ? 'Sterne:' : 'Estrellas:' }}</span>
                  <div class="flex text-amber-400">
                    <mat-icon class="text-lg">star</mat-icon>
                    <mat-icon class="text-lg">star</mat-icon>
                    <mat-icon class="text-lg">star</mat-icon>
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  @if (currentLevelId() < levels.length) {
                    <button
                      type="button"
                      id="btn-next-level"
                      (click)="selectLevel(currentLevelId() + 1)"
                      class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition"
                    >
                      {{ t().coding.nextLevel }} →
                    </button>
                  }
                  <button
                    type="button"
                    id="btn-share-wall"
                    (click)="shareSuccessToWall()"
                    class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1"
                  >
                    <mat-icon class="text-base">campaign</mat-icon>
                    <span>{{ sharedNotice() ? t().coding.sharedSuccess : t().coding.shareToWall }}</span>
                  </button>
                  <button
                    type="button"
                    (click)="resetSimulation()"
                    class="text-xs text-slate-400 hover:text-slate-200 mt-1"
                  >
                    {{ t().coding.tryAgain }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- RIGHT: Blocks Palette & Algorithm Timeline (Cols 8-12) -->
        <div
          class="flex-1 md:col-span-5 flex flex-col bg-slate-900 md:border-l border-slate-800 overflow-y-auto"
          [class.hidden]="mobileTab() !== 'code'"
          [class.md:flex]="true"
        >
          <!-- Block Palette Header -->
          <div class="p-3 bg-slate-850 border-b border-slate-800">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{{ t().coding.blocksPalette }} ({{ isDe() ? 'Klicken zum Hinzufügen' : 'Haz clic para añadir' }})</span>
              <span class="text-[10px] text-slate-500">{{ isDe() ? 'Visuelle Bausteine' : 'Bloques visuales' }}</span>
            </h4>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                id="palette-forward"
                (click)="addBlock('forward')"
                class="flex items-center gap-2 p-2 bg-blue-600/20 hover:bg-blue-600/30 active:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium transition text-left"
              >
                <mat-icon class="text-base text-blue-400">arrow_upward</mat-icon>
                <span>{{ isDe() ? 'Vorwärts 1' : 'Avanzar 1' }}</span>
              </button>

              <button
                type="button"
                id="palette-turn-left"
                (click)="addBlock('turnLeft')"
                class="flex items-center gap-2 p-2 bg-amber-600/20 hover:bg-amber-600/30 active:bg-amber-600/40 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition text-left"
              >
                <mat-icon class="text-base text-amber-400">rotate_left</mat-icon>
                <span>{{ isDe() ? 'Links drehen ↺' : 'Girar Izq ↺' }}</span>
              </button>

              <button
                type="button"
                id="palette-turn-right"
                (click)="addBlock('turnRight')"
                class="flex items-center gap-2 p-2 bg-amber-600/20 hover:bg-amber-600/30 active:bg-amber-600/40 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition text-left"
              >
                <mat-icon class="text-base text-amber-400">rotate_right</mat-icon>
                <span>{{ isDe() ? 'Rechts drehen ↻' : 'Girar Der ↻' }}</span>
              </button>

              <button
                type="button"
                id="palette-collect"
                (click)="addBlock('collect')"
                class="flex items-center gap-2 p-2 bg-emerald-600/20 hover:bg-emerald-600/30 active:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition text-left"
              >
                <mat-icon class="text-base text-emerald-400">star</mat-icon>
                <span>{{ isDe() ? 'Sammeln ★' : 'Recoger ★' }}</span>
              </button>

              @if (currentLevel().allowRepeat) {
                <button
                  type="button"
                  id="palette-repeat-2"
                  (click)="addBlock('repeat2')"
                  class="flex items-center gap-2 p-2 bg-purple-600/20 hover:bg-purple-600/30 active:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition text-left"
                >
                  <mat-icon class="text-base text-purple-400">repeat</mat-icon>
                  <span>{{ isDe() ? 'Wiederhole 2x' : 'Repetir 2x' }}</span>
                </button>

                <button
                  type="button"
                  id="palette-repeat-3"
                  (click)="addBlock('repeat3')"
                  class="flex items-center gap-2 p-2 bg-purple-600/20 hover:bg-purple-600/30 active:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition text-left"
                >
                  <mat-icon class="text-base text-purple-400">repeat_one</mat-icon>
                  <span>{{ isDe() ? 'Wiederhole 3x' : 'Repetir 3x' }}</span>
                </button>
              }
            </div>
          </div>

          <!-- My Program Workspace Header -->
          <div class="px-3 py-2 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <mat-icon class="text-base text-indigo-400">code</mat-icon>
              <span>{{ t().coding.myProgram }} ({{ program().length }} {{ isDe() ? 'Befehle' : 'instrucciones' }})</span>
            </div>
            <button
              type="button"
              id="btn-clear-program"
              (click)="clearProgram()"
              class="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <mat-icon class="text-xs">delete_sweep</mat-icon>
              <span>{{ t().coding.clearProgram }}</span>
            </button>
          </div>

          <!-- Program Blocks Sequence List -->
          <div class="flex-1 p-3 overflow-y-auto space-y-1.5">
            @if (program().length === 0) {
              <div class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <mat-icon class="text-4xl mb-2 text-slate-600">playlist_add</mat-icon>
                <p class="text-xs font-medium text-slate-400 mb-1">{{ isDe() ? 'Dein Programm ist noch leer' : 'Tu programa está vacío' }}</p>
                <p class="text-[11px]">{{ isDe() ? 'Klicke auf die Bausteine oben, um deinen Algorithmus Schritt für Schritt zu bauen.' : 'Haz clic en los bloques de arriba para construir tu algoritmo paso a paso.' }}</p>
              </div>
            }

            @for (block of program(); track block.id; let idx = $index) {
              <div
                class="flex items-center justify-between p-2 rounded-xl border transition-all"
                [class.bg-slate-800]="currentStepIndex() !== idx"
                [class.border-slate-700]="currentStepIndex() !== idx"
                [class.bg-indigo-900/60]="currentStepIndex() === idx"
                [class.border-indigo-400]="currentStepIndex() === idx"
                [class.scale-[1.02]]="currentStepIndex() === idx"
                [class.shadow-md]="currentStepIndex() === idx"
              >
                <div class="flex items-center gap-2">
                  <!-- Step Index Badge -->
                  <span class="w-5 h-5 flex items-center justify-center rounded bg-slate-900/80 text-[10px] font-mono text-slate-400">
                    {{ idx + 1 }}
                  </span>

                  <!-- Block Icon & Label -->
                  <div class="flex items-center gap-1.5" [class]="block.color">
                    <mat-icon class="text-base">{{ block.icon }}</mat-icon>
                    <span class="text-xs font-semibold text-slate-200">{{ getBlockLabel(block.type) }}</span>
                  </div>

                  <!-- Currently executing pointer -->
                  @if (currentStepIndex() === idx) {
                    <span class="px-1.5 py-0.5 bg-indigo-500 text-white rounded text-[9px] font-bold animate-pulse">
                      {{ isDe() ? 'LÄUFT' : 'EJECUTANDO' }}
                    </span>
                  }
                </div>

                <!-- Block Controls: Move Up / Down / Delete -->
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    (click)="moveBlock(idx, -1)"
                    [disabled]="idx === 0"
                    class="text-slate-400 hover:text-slate-200 disabled:opacity-20 p-0.5"
                    [title]="isDe() ? 'Nach oben' : 'Subir'"
                  >
                    <mat-icon class="text-sm">arrow_drop_up</mat-icon>
                  </button>
                  <button
                    type="button"
                    (click)="moveBlock(idx, 1)"
                    [disabled]="idx === program().length - 1"
                    class="text-slate-400 hover:text-slate-200 disabled:opacity-20 p-0.5"
                    [title]="isDe() ? 'Nach unten' : 'Bajar'"
                  >
                    <mat-icon class="text-sm">arrow_drop_down</mat-icon>
                  </button>
                  <button
                    type="button"
                    (click)="removeBlock(idx)"
                    class="text-slate-500 hover:text-rose-400 p-0.5 ml-1"
                    [title]="isDe() ? 'Löschen' : 'Eliminar'"
                  >
                    <mat-icon class="text-sm">close</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CodingApp implements OnInit, OnDestroy {
  private readonly classroomService = inject(ClassroomService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;
  readonly levels = LEVELS;
  readonly currentLevelId = signal<number>(1);

  readonly currentLevel = computed(() => {
    return this.levels.find((l) => l.id === this.currentLevelId()) || this.levels[0];
  });

  // State of the Robot
  readonly robotPos = signal<{ x: number; y: number; dir: 'N' | 'E' | 'S' | 'W' }>({
    x: 1,
    y: 3,
    dir: 'E',
  });

  // Grid state with collected stars
  readonly collectedStarPositions = signal<Set<string>>(new Set());

  // Program blocks
  readonly program = signal<CodeBlock[]>([]);

  // Execution state
  readonly isRunning = signal<boolean>(false);
  readonly currentStepIndex = signal<number>(-1);
  readonly levelCompleted = signal<boolean>(false);
  readonly sharedNotice = signal<boolean>(false);
  readonly mobileTab = signal<'grid' | 'code'>('grid');

  private audioCtx: AudioContext | null = null;
  private runTimer: ReturnType<typeof setTimeout> | null = null;

  readonly starsCollected = computed(() => this.collectedStarPositions().size);

  readonly gridRows = computed(() => {
    const lvl = this.currentLevel();
    const rows: GridCell[][] = [];
    const collected = this.collectedStarPositions();

    for (let y = 0; y < lvl.gridHeight; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < lvl.gridWidth; x++) {
        let type: 'empty' | 'wall' | 'goal' | 'star' = 'empty';
        if (x === lvl.targetGoal.x && y === lvl.targetGoal.y) {
          type = 'goal';
        } else if (lvl.walls.some((w) => w.x === x && w.y === y)) {
          type = 'wall';
        } else if (lvl.stars.some((s) => s.x === x && s.y === y)) {
          type = 'star';
        }

        row.push({
          x,
          y,
          type,
          collected: collected.has(`${x}-${y}`),
        });
      }
      rows.push(row);
    }
    return rows;
  });

  ngOnInit(): void {
    this.selectLevel(1);
    this.classroomService.reportActivity(
      'RoboCode',
      'Aprendiendo a Programar (Nivel 1)',
    );
  }

  ngOnDestroy(): void {
    if (this.runTimer) clearTimeout(this.runTimer);
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // AudioContext close
      }
    }
  }

  selectLevel(id: number): void {
    if (this.runTimer) clearTimeout(this.runTimer);
    this.isRunning.set(false);
    this.currentStepIndex.set(-1);
    this.levelCompleted.set(false);
    this.sharedNotice.set(false);
    this.currentLevelId.set(id);

    const lvl = this.currentLevel();
    this.robotPos.set({ ...lvl.robotStart });
    this.collectedStarPositions.set(new Set());
    this.program.set([]);

    const lvlTitle = this.isDe() ? lvl.titleDe : lvl.titleEs;
    this.classroomService.reportActivity(
      'RoboCode',
      this.isDe() ? `In RoboCode – ${lvlTitle}` : `En RoboCode - ${lvlTitle}`,
    );
  }

  addBlock(type: CodeBlock['type']): void {
    if (this.isRunning()) return;
    this.playBlip(440, 0.05);

    let label = '';
    let icon = '';
    let color = '';

    switch (type) {
      case 'forward':
        label = 'Avanzar 1 casilla';
        icon = 'arrow_upward';
        color = 'text-blue-400';
        break;
      case 'turnLeft':
        label = 'Girar Izquierda ↺';
        icon = 'rotate_left';
        color = 'text-amber-400';
        break;
      case 'turnRight':
        label = 'Girar Derecha ↻';
        icon = 'rotate_right';
        color = 'text-amber-400';
        break;
      case 'collect':
        label = 'Recoger estrella ★';
        icon = 'star';
        color = 'text-emerald-400';
        break;
      case 'repeat2':
        label = 'Repetir 2x [Avanzar]';
        icon = 'repeat';
        color = 'text-purple-400';
        break;
      case 'repeat3':
        label = 'Repetir 3x [Avanzar]';
        icon = 'repeat_one';
        color = 'text-purple-400';
        break;
    }

    const newBlock: CodeBlock = {
      id: 'blk_' + Math.random().toString(36).substring(2, 8),
      type,
      label,
      icon,
      color,
    };

    this.program.update((p) => [...p, newBlock]);
  }

  removeBlock(index: number): void {
    if (this.isRunning()) return;
    this.program.update((p) => p.filter((_, i) => i !== index));
  }

  moveBlock(index: number, delta: number): void {
    if (this.isRunning()) return;
    const target = index + delta;
    if (target < 0 || target >= this.program().length) return;

    this.program.update((p) => {
      const copy = [...p];
      const item = copy.splice(index, 1)[0];
      copy.splice(target, 0, item);
      return copy;
    });
  }

  clearProgram(): void {
    if (this.isRunning()) return;
    this.program.set([]);
    this.resetSimulation();
  }

  resetSimulation(): void {
    if (this.runTimer) clearTimeout(this.runTimer);
    this.isRunning.set(false);
    this.currentStepIndex.set(-1);
    this.levelCompleted.set(false);

    const lvl = this.currentLevel();
    this.robotPos.set({ ...lvl.robotStart });
    this.collectedStarPositions.set(new Set());
  }

  async runProgram(): Promise<void> {
    if (this.isRunning() || this.program().length === 0) return;
    this.mobileTab.set('grid');
    this.resetSimulation();
    this.isRunning.set(true);

    // Expand commands (handling simple repeat blocks)
    const commands: CodeBlock['type'][] = [];
    for (const b of this.program()) {
      if (b.type === 'repeat2') {
        commands.push('forward', 'forward');
      } else if (b.type === 'repeat3') {
        commands.push('forward', 'forward', 'forward');
      } else {
        commands.push(b.type);
      }
    }

    let programBlockIndex = 0;
    for (let i = 0; i < commands.length; i++) {
      if (!this.isRunning()) break;

      // Approximate mapping to UI block for visual highlight
      const uiIndex = Math.min(programBlockIndex, this.program().length - 1);
      this.currentStepIndex.set(uiIndex);

      const cmd = commands[i];
      const success = this.executeCommand(cmd);

      if (!success) {
        // Hit wall or out of bounds!
        this.playBlip(180, 0.3, 'sawtooth');
        this.isRunning.set(false);
        this.currentStepIndex.set(-1);
        return;
      }

      // Progress block index tracker
      if (
        this.program()[programBlockIndex]?.type === 'repeat2' &&
        i % 2 === 1
      ) {
        programBlockIndex++;
      } else if (
        this.program()[programBlockIndex]?.type === 'repeat3' &&
        i % 3 === 2
      ) {
        programBlockIndex++;
      } else if (
        this.program()[programBlockIndex]?.type !== 'repeat2' &&
        this.program()[programBlockIndex]?.type !== 'repeat3'
      ) {
        programBlockIndex++;
      }

      await new Promise((r) => {
        this.runTimer = setTimeout(r, 450);
      });
    }

    this.isRunning.set(false);
    this.currentStepIndex.set(-1);
    this.checkWinCondition();
  }

  stepProgram(): void {
    if (this.isRunning() || this.program().length === 0) return;

    let nextIdx = this.currentStepIndex() + 1;
    if (nextIdx >= this.program().length) {
      nextIdx = 0;
      this.resetSimulation();
    }

    this.currentStepIndex.set(nextIdx);
    const block = this.program()[nextIdx];
    if (block) {
      if (block.type === 'repeat2') {
        this.executeCommand('forward');
        this.executeCommand('forward');
      } else if (block.type === 'repeat3') {
        this.executeCommand('forward');
        this.executeCommand('forward');
        this.executeCommand('forward');
      } else {
        this.executeCommand(block.type);
      }
    }

    this.checkWinCondition();
  }

  private executeCommand(cmd: CodeBlock['type']): boolean {
    const cur = this.robotPos();
    const lvl = this.currentLevel();

    if (cmd === 'turnLeft') {
      const dirs: ('N' | 'W' | 'S' | 'E')[] = ['N', 'W', 'S', 'E'];
      const nextDir = dirs[(dirs.indexOf(cur.dir) + 1) % 4];
      this.robotPos.set({ ...cur, dir: nextDir });
      this.playBlip(520, 0.08);
      return true;
    }

    if (cmd === 'turnRight') {
      const dirs: ('N' | 'E' | 'S' | 'W')[] = ['N', 'E', 'S', 'W'];
      const nextDir = dirs[(dirs.indexOf(cur.dir) + 1) % 4];
      this.robotPos.set({ ...cur, dir: nextDir });
      this.playBlip(520, 0.08);
      return true;
    }

    if (cmd === 'collect') {
      const key = `${cur.x}-${cur.y}`;
      if (lvl.stars.some((s) => s.x === cur.x && s.y === cur.y)) {
        this.collectedStarPositions.update((s) => {
          const n = new Set(s);
          n.add(key);
          return n;
        });
        this.playBlip(880, 0.15, 'triangle');
      }
      return true;
    }

    if (cmd === 'forward') {
      let nx = cur.x;
      let ny = cur.y;
      if (cur.dir === 'N') ny--;
      if (cur.dir === 'S') ny++;
      if (cur.dir === 'E') nx++;
      if (cur.dir === 'W') nx--;

      // Boundary check
      if (nx < 0 || nx >= lvl.gridWidth || ny < 0 || ny >= lvl.gridHeight) {
        return false;
      }

      // Wall check
      if (lvl.walls.some((w) => w.x === nx && w.y === ny)) {
        return false;
      }

      this.robotPos.set({ ...cur, x: nx, y: ny });
      this.playBlip(320, 0.06);

      // Auto-collect star if stepped on it
      const starKey = `${nx}-${ny}`;
      if (lvl.stars.some((s) => s.x === nx && s.y === ny)) {
        this.collectedStarPositions.update((s) => {
          const n = new Set(s);
          n.add(starKey);
          return n;
        });
      }

      return true;
    }

    return true;
  }

  private checkWinCondition(): void {
    const pos = this.robotPos();
    const lvl = this.currentLevel();

    if (pos.x === lvl.targetGoal.x && pos.y === lvl.targetGoal.y) {
      this.levelCompleted.set(true);
      this.playFanfare();
    }
  }

  shareSuccessToWall(): void {
    const lvl = this.currentLevel();
    this.sharedNotice.set(true);
    const lvlTitle = this.isDe() ? lvl.titleDe : lvl.titleEs;
    this.classroomService.reportActivity(
      'RoboCode',
      this.isDe() ? `Hat ${lvlTitle} erfolgreich abgeschlossen! ★★★` : `¡Completó con éxito ${lvlTitle}! ★★★`,
    );
  }

  getRobotRotationTransform(): string {
    const d = this.robotPos().dir;
    let deg = 0;
    if (d === 'E') deg = 90;
    if (d === 'S') deg = 180;
    if (d === 'W') deg = 270;
    return `rotate(${deg}deg)`;
  }

  getBlockLabel(type: CodeBlock['type']): string {
    const isDe = this.isDe();
    switch (type) {
      case 'forward':
        return isDe ? '1 Feld vorwärts' : 'Avanzar 1 casilla';
      case 'turnLeft':
        return isDe ? 'Nach links drehen ↺' : 'Girar Izquierda ↺';
      case 'turnRight':
        return isDe ? 'Nach rechts drehen ↻' : 'Girar Derecha ↻';
      case 'collect':
        return isDe ? 'Stern einsammeln ★' : 'Recoger estrella ★';
      case 'repeat2':
        return isDe ? '2x Wiederholen [Vorwärts]' : 'Repetir 2x [Avanzar]';
      case 'repeat3':
        return isDe ? '3x Wiederholen [Vorwärts]' : 'Repetir 3x [Avanzar]';
    }
  }

  getDirectionLabel(): string {
    const d = this.robotPos().dir;
    const isDe = this.isDe();
    if (d === 'N') return isDe ? 'Norden ↑' : 'Norte ↑';
    if (d === 'E') return isDe ? 'Osten →' : 'Este →';
    if (d === 'S') return isDe ? 'Süden ↓' : 'Sur ↓';
    return isDe ? 'Westen ←' : 'Oeste ←';
  }

  private playBlip(freq: number, duration: number, type: OscillatorType = 'sine'): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // AudioContext policy
    }
  }

  private playFanfare(): void {
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playBlip(freq, 0.2, 'triangle'), idx * 120);
    });
  }
}
