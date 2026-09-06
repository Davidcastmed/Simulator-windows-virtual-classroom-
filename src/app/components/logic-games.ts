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

// --- GAME 1: CAMINOS DIGITALES (Path Cable Rotating) ---
export interface CableTile {
  x: number;
  y: number;
  shape: 'line' | 'corner' | 't' | 'cross' | 'start' | 'goal';
  rotation: number; // 0, 90, 180, 270
  isPowered?: boolean;
}

export interface CableLevel {
  id: number;
  name: string;
  gridSize: number;
  start: { x: number; y: number; dir: number };
  goal: { x: number; y: number; dir: number };
  initialTiles: Omit<CableTile, 'isPowered'>[];
}

// --- GAME 2: MOVER CAJAS (Data Warehouse / Sokoban) ---
export interface BoxLevel {
  id: number;
  name: string;
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  walls: { x: number; y: number }[];
  goals: { x: number; y: number }[];
  boxes: { x: number; y: number }[];
}

const CABLE_LEVELS: CableLevel[] = [
  {
    id: 1,
    name: 'Nivel 1: Conexión Básica',
    gridSize: 3,
    start: { x: 0, y: 1, dir: 1 }, // East
    goal: { x: 2, y: 1, dir: 3 }, // West
    initialTiles: [
      { x: 0, y: 0, shape: 'corner', rotation: 90 },
      { x: 1, y: 0, shape: 'line', rotation: 0 },
      { x: 2, y: 0, shape: 'corner', rotation: 180 },

      { x: 0, y: 1, shape: 'start', rotation: 0 },
      { x: 1, y: 1, shape: 'line', rotation: 90 }, // needs to be rotated to 0 or 180
      { x: 2, y: 1, shape: 'goal', rotation: 0 },

      { x: 0, y: 2, shape: 'corner', rotation: 0 },
      { x: 1, y: 2, shape: 'line', rotation: 0 },
      { x: 2, y: 2, shape: 'corner', rotation: 270 },
    ],
  },
  {
    id: 2,
    name: 'Nivel 2: Esquina en L',
    gridSize: 3,
    start: { x: 0, y: 0, dir: 1 }, // East
    goal: { x: 2, y: 2, dir: 0 }, // North
    initialTiles: [
      { x: 0, y: 0, shape: 'start', rotation: 0 },
      { x: 1, y: 0, shape: 'corner', rotation: 0 },
      { x: 2, y: 0, shape: 'corner', rotation: 90 },

      { x: 0, y: 1, shape: 'line', rotation: 0 },
      { x: 1, y: 1, shape: 'line', rotation: 0 },
      { x: 2, y: 1, shape: 'line', rotation: 0 },

      { x: 0, y: 2, shape: 'corner', rotation: 0 },
      { x: 1, y: 2, shape: 'line', rotation: 0 },
      { x: 2, y: 2, shape: 'goal', rotation: 0 },
    ],
  },
  {
    id: 3,
    name: 'Nivel 3: Cruce de Servidores',
    gridSize: 4,
    start: { x: 0, y: 1, dir: 1 },
    goal: { x: 3, y: 2, dir: 3 },
    initialTiles: [
      { x: 0, y: 0, shape: 'corner', rotation: 90 },
      { x: 1, y: 0, shape: 'line', rotation: 0 },
      { x: 2, y: 0, shape: 't', rotation: 90 },
      { x: 3, y: 0, shape: 'corner', rotation: 180 },

      { x: 0, y: 1, shape: 'start', rotation: 0 },
      { x: 1, y: 1, shape: 'corner', rotation: 180 },
      { x: 2, y: 1, shape: 'line', rotation: 90 },
      { x: 3, y: 1, shape: 'line', rotation: 0 },

      { x: 0, y: 2, shape: 'line', rotation: 0 },
      { x: 1, y: 2, shape: 'corner', rotation: 0 },
      { x: 2, y: 2, shape: 'corner', rotation: 270 },
      { x: 3, y: 2, shape: 'goal', rotation: 0 },

      { x: 0, y: 3, shape: 'corner', rotation: 0 },
      { x: 1, y: 3, shape: 'line', rotation: 0 },
      { x: 2, y: 3, shape: 'line', rotation: 0 },
      { x: 3, y: 3, shape: 'corner', rotation: 270 },
    ],
  },
  {
    id: 4,
    name: 'Nivel 4: Red Troncal Completa',
    gridSize: 4,
    start: { x: 0, y: 0, dir: 2 }, // South
    goal: { x: 3, y: 3, dir: 0 }, // North
    initialTiles: [
      { x: 0, y: 0, shape: 'start', rotation: 0 },
      { x: 1, y: 0, shape: 'corner', rotation: 90 },
      { x: 2, y: 0, shape: 'line', rotation: 0 },
      { x: 3, y: 0, shape: 'corner', rotation: 180 },

      { x: 0, y: 1, shape: 'line', rotation: 90 },
      { x: 1, y: 1, shape: 't', rotation: 0 },
      { x: 2, y: 1, shape: 'corner', rotation: 270 },
      { x: 3, y: 1, shape: 'line', rotation: 90 },

      { x: 0, y: 2, shape: 'corner', rotation: 0 },
      { x: 1, y: 2, shape: 'line', rotation: 0 },
      { x: 2, y: 2, shape: 't', rotation: 180 },
      { x: 3, y: 2, shape: 'line', rotation: 90 },

      { x: 0, y: 3, shape: 'line', rotation: 0 },
      { x: 1, y: 3, shape: 'corner', rotation: 0 },
      { x: 2, y: 3, shape: 'line', rotation: 0 },
      { x: 3, y: 3, shape: 'goal', rotation: 0 },
    ],
  },
];

const BOX_LEVELS: BoxLevel[] = [
  {
    id: 1,
    name: 'Nivel 1: Primer Paquete',
    width: 5,
    height: 5,
    playerStart: { x: 1, y: 2 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
    ],
    goals: [{ x: 3, y: 2 }],
    boxes: [{ x: 2, y: 2 }],
  },
  {
    id: 2,
    name: 'Nivel 2: Dos Registros',
    width: 6,
    height: 5,
    playerStart: { x: 1, y: 2 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 3, y: 1 },
    ],
    goals: [{ x: 4, y: 1 }, { x: 4, y: 3 }],
    boxes: [{ x: 2, y: 2 }, { x: 3, y: 3 }],
  },
  {
    id: 3,
    name: 'Nivel 3: El Pasillo de Memoria',
    width: 6,
    height: 6,
    playerStart: { x: 1, y: 1 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
      { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 },
      { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 },
    ],
    goals: [{ x: 1, y: 4 }, { x: 4, y: 1 }],
    boxes: [{ x: 2, y: 1 }, { x: 3, y: 3 }],
  },
  {
    id: 4,
    name: 'Nivel 4: Buffer Circular',
    width: 6,
    height: 6,
    playerStart: { x: 2, y: 2 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
      { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 },
      { x: 3, y: 2 },
    ],
    goals: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }],
    boxes: [{ x: 2, y: 1 }, { x: 3, y: 3 }, { x: 2, y: 4 }],
  },
];

@Component({
  selector: 'app-logic-games',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="logic-games-root" class="flex flex-col h-full bg-slate-900 text-slate-100 font-sans select-none overflow-hidden">
      <!-- Game Mode Tabs (Cables / Boxes) -->
      <header class="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700/80 shrink-0">
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-sm font-semibold">
            <mat-icon class="text-base leading-none">videogame_asset</mat-icon>
            <span>{{ t().logicGames.title }}</span>
          </div>

          <div class="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              id="tab-cables"
              (click)="switchGame('cables')"
              class="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition"
              [class.bg-cyan-600]="activeGame() === 'cables'"
              [class.text-white]="activeGame() === 'cables'"
              [class.text-slate-400]="activeGame() !== 'cables'"
              [class.hover:text-slate-200]="activeGame() !== 'cables'"
            >
              <mat-icon class="text-sm">alt_route</mat-icon>
              <span>{{ t().logicGames.tabCables }}</span>
            </button>

            <button
              type="button"
              id="tab-boxes"
              (click)="switchGame('boxes')"
              class="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition"
              [class.bg-emerald-600]="activeGame() === 'boxes'"
              [class.text-white]="activeGame() === 'boxes'"
              [class.text-slate-400]="activeGame() !== 'boxes'"
              [class.hover:text-slate-200]="activeGame() !== 'boxes'"
            >
              <mat-icon class="text-sm">inventory_2</mat-icon>
              <span>{{ t().logicGames.tabBoxes }}</span>
            </button>
          </div>
        </div>

        <!-- Level Controls & Restart -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">Nivel:</span>
          <div class="flex items-center gap-1">
            @for (lvl of currentLevelsList(); track lvl.id) {
              <button
                type="button"
                (click)="selectLevel(lvl.id)"
                class="w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition"
                [class.bg-cyan-600]="activeGame() === 'cables' && currentLevelId() === lvl.id"
                [class.bg-emerald-600]="activeGame() === 'boxes' && currentLevelId() === lvl.id"
                [class.text-white]="currentLevelId() === lvl.id"
                [class.bg-slate-800]="currentLevelId() !== lvl.id"
                [class.text-slate-400]="currentLevelId() !== lvl.id"
              >
                {{ lvl.id }}
              </button>
            }
          </div>

          <button
            type="button"
            (click)="restartLevel()"
            class="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
            title="Reiniciar"
          >
            <mat-icon class="text-sm">refresh</mat-icon>
            <span>{{ t().logicGames.restart }}</span>
          </button>
        </div>
      </header>

      <!-- Teacher's Learning Concept Banner -->
      <div class="flex items-center gap-2 px-4 py-1.5 bg-slate-950/60 border-b border-slate-800 text-xs text-slate-300 shrink-0">
        <mat-icon class="text-base text-amber-400">psychology</mat-icon>
        @if (activeGame() === 'cables') {
          <span><strong>{{ isDe() ? 'Tipp der Lehrkraft:' : 'Consejo del Profesor:' }}</strong> {{ t().logicGames.teacherTipCables }}</span>
        } @else {
          <span><strong>{{ isDe() ? 'Tipp der Lehrkraft:' : 'Consejo del Profesor:' }}</strong> {{ t().logicGames.teacherTipBoxes }}</span>
        }
      </div>

      <!-- Main Game Canvas Container -->
      <div class="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/90 relative overflow-hidden">
        <!-- ============================================== -->
        <!-- SUBGAME 1: CAMINOS DIGITALES (Cables) -->
        <!-- ============================================== -->
        @if (activeGame() === 'cables') {
          <div class="flex flex-col items-center">
            <!-- Instruction Text -->
            <p class="text-xs text-cyan-300/80 mb-3 text-center">
              {{ isDe() ? 'Klicke auf die Kabelstücke, um sie um 90° zu drehen. Verbinde den grünen Server mit dem blauen Client-PC.' : 'Haz clic en cualquier pieza de cable para rotarla 90°. Conecta el servidor verde con el cliente azul.' }}
            </p>

            <!-- Cable Grid -->
            <div
              class="grid gap-2 p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl"
              [style.grid-template-columns]="'repeat(' + currentCableLevel().gridSize + ', minmax(0, 1fr))'"
            >
              @for (tile of cableTiles(); track tile.x + '-' + tile.y) {
                <button
                  type="button"
                  [id]="'tile-' + tile.x + '-' + tile.y"
                  (click)="rotateTile(tile)"
                  [disabled]="tile.shape === 'start' || tile.shape === 'goal'"
                  class="w-16 h-16 rounded-xl bg-slate-800 border flex items-center justify-center relative transition-all duration-200"
                  [class.border-cyan-500]="tile.isPowered"
                  [class.shadow-lg]="tile.isPowered"
                  [class.shadow-cyan-500/20]="tile.isPowered"
                  [class.border-slate-700]="!tile.isPowered"
                  [class.hover:bg-slate-750]="tile.shape !== 'start' && tile.shape !== 'goal'"
                >
                  <!-- SVG representation of Cable tile -->
                  <svg
                    class="w-12 h-12 transition-transform duration-300"
                    [style.transform]="'rotate(' + tile.rotation + 'deg)'"
                    viewBox="0 0 100 100"
                  >
                    @switch (tile.shape) {
                      @case ('line') {
                        <line x1="10" y1="50" x2="90" y2="50" [attr.stroke]="tile.isPowered ? '#06b6d4' : '#64748b'" stroke-width="14" stroke-linecap="round" />
                        @if (tile.isPowered) {
                          <line x1="20" y1="50" x2="80" y2="50" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round" />
                        }
                      }
                      @case ('corner') {
                        <path d="M 50 10 L 50 50 L 90 50" fill="none" [attr.stroke]="tile.isPowered ? '#06b6d4' : '#64748b'" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
                        @if (tile.isPowered) {
                          <path d="M 50 20 L 50 50 L 80 50" fill="none" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                        }
                      }
                      @case ('t') {
                        <line x1="10" y1="50" x2="90" y2="50" [attr.stroke]="tile.isPowered ? '#06b6d4' : '#64748b'" stroke-width="14" stroke-linecap="round" />
                        <line x1="50" y1="50" x2="50" y2="90" [attr.stroke]="tile.isPowered ? '#06b6d4' : '#64748b'" stroke-width="14" stroke-linecap="round" />
                        @if (tile.isPowered) {
                          <line x1="10" y1="50" x2="90" y2="50" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round" />
                          <line x1="50" y1="50" x2="50" y2="90" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round" />
                        }
                      }
                      @case ('cross') {
                        <line x1="10" y1="50" x2="90" y2="50" [attr.stroke]="tile.isPowered ? '#06b6d4' : '#64748b'" stroke-width="14" stroke-linecap="round" />
                        <line x1="50" y1="10" x2="50" y2="90" [attr.stroke]="tile.isPowered ? '#06b6d4' : '#64748b'" stroke-width="14" stroke-linecap="round" />
                      }
                      @case ('start') {
                        <circle cx="50" cy="50" r="30" fill="#10b981" />
                        <line x1="50" y1="50" x2="90" y2="50" stroke="#10b981" stroke-width="14" stroke-linecap="round" />
                      }
                      @case ('goal') {
                        <circle cx="50" cy="50" r="30" [attr.fill]="cablesWon() ? '#06b6d4' : '#334155'" />
                        <line x1="10" y1="50" x2="50" y2="50" [attr.stroke]="cablesWon() ? '#06b6d4' : '#334155'" stroke-width="14" stroke-linecap="round" />
                      }
                    }
                  </svg>

                  @if (tile.shape === 'start') {
                    <span class="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
                      <mat-icon class="text-xl">dns</mat-icon>
                    </span>
                  }
                  @if (tile.shape === 'goal') {
                    <span class="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
                      <mat-icon class="text-xl">computer</mat-icon>
                    </span>
                  }
                </button>
              }
            </div>

            <!-- Cable Win Banner -->
            @if (cablesWon()) {
              <div class="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-center flex flex-col items-center gap-2 animate-in zoom-in duration-200">
                <div class="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <mat-icon class="text-emerald-400">check_circle</mat-icon>
                  <span>{{ t().logicGames.cablesWin }}</span>
                </div>
                @if (currentLevelId() < CABLE_LEVELS.length) {
                  <button
                    type="button"
                    (click)="selectLevel(currentLevelId() + 1)"
                    class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
                  >
                    {{ t().logicGames.nextLevel }} →
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- ============================================== -->
        <!-- SUBGAME 2: ALMACÉN DE DATOS (Mover Cajas) -->
        <!-- ============================================== -->
        @if (activeGame() === 'boxes') {
          <div class="flex flex-col items-center">
            <!-- Stats: Moves, Boxes on Target -->
            <div class="flex items-center gap-4 text-xs text-slate-300 mb-3">
              <span>{{ isDe() ? 'Züge' : 'Movimientos' }}: <strong class="text-emerald-400 font-mono">{{ boxMoves() }}</strong></span>
              <span>{{ isDe() ? 'Kisten im Ziel' : 'Cajas guardadas' }}: <strong class="text-amber-400 font-mono">{{ boxesOnGoalCount() }} / {{ currentBoxLevel().goals.length }}</strong></span>
              <button
                type="button"
                (click)="undoBoxMove()"
                [disabled]="boxHistory().length === 0"
                class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded border border-slate-700 text-[11px] flex items-center gap-1"
              >
                <mat-icon class="text-xs">undo</mat-icon>
                <span>{{ t().logicGames.undoMove }}</span>
              </button>
            </div>

            <!-- Sokoban Grid -->
            <div
              class="grid gap-1 p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl"
              [style.grid-template-columns]="'repeat(' + currentBoxLevel().width + ', minmax(0, 1fr))'"
            >
              @for (cell of boxGridCells(); track cell.x + '-' + cell.y) {
                <div
                  class="w-12 h-12 rounded-lg flex items-center justify-center relative transition-all"
                  [class.bg-slate-800]="cell.type === 'floor'"
                  [class.bg-slate-700]="cell.type === 'wall'"
                  [class.border]="true"
                  [class.border-slate-700/60]="cell.type === 'floor'"
                  [class.border-slate-600]="cell.type === 'wall'"
                >
                  <!-- Storage Goal Target -->
                  @if (cell.isGoal) {
                    <div class="w-5 h-5 rounded-full border-2 border-dashed border-emerald-400/80 bg-emerald-500/20 flex items-center justify-center">
                      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    </div>
                  }

                  <!-- Wall visual -->
                  @if (cell.type === 'wall') {
                    <mat-icon class="text-slate-500 text-lg opacity-40">grid_view</mat-icon>
                  }

                  <!-- Box / Memory Crate -->
                  @if (cell.hasBox) {
                    <div
                      class="absolute inset-1 rounded-md flex items-center justify-center shadow-md transition-all duration-150"
                      [class.bg-amber-600]="!cell.isGoal"
                      [class.border-amber-400]="!cell.isGoal"
                      [class.bg-emerald-600]="cell.isGoal"
                      [class.border-emerald-300]="cell.isGoal"
                      [class.border-2]="true"
                    >
                      <mat-icon class="text-white text-base">inventory_2</mat-icon>
                    </div>
                  }

                  <!-- Player Chip Avatar -->
                  @if (boxPlayer().x === cell.x && boxPlayer().y === cell.y) {
                    <div class="absolute inset-1 bg-cyan-600 text-white rounded-md border-2 border-cyan-300 shadow flex items-center justify-center z-10 animate-pulse">
                      <mat-icon class="text-base">smart_toy</mat-icon>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Direction Controls D-Pad (Touch & Mouse friendly) -->
            <div class="mt-4 flex flex-col items-center gap-1">
              <button
                type="button"
                (click)="moveBoxPlayer(0, -1)"
                class="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-lg flex items-center justify-center text-slate-200 transition"
              >
                <mat-icon>arrow_upward</mat-icon>
              </button>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="moveBoxPlayer(-1, 0)"
                  class="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-lg flex items-center justify-center text-slate-200 transition"
                >
                  <mat-icon>arrow_back</mat-icon>
                </button>
                <button
                  type="button"
                  (click)="moveBoxPlayer(0, 1)"
                  class="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-lg flex items-center justify-center text-slate-200 transition"
                >
                  <mat-icon>arrow_downward</mat-icon>
                </button>
                <button
                  type="button"
                  (click)="moveBoxPlayer(1, 0)"
                  class="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-lg flex items-center justify-center text-slate-200 transition"
                >
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </div>

            <!-- Box Win Banner -->
            @if (boxesWon()) {
              <div class="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-center flex flex-col items-center gap-2 animate-in zoom-in duration-200">
                <div class="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <mat-icon class="text-emerald-400">check_circle</mat-icon>
                  <span>{{ t().logicGames.boxesWin }}</span>
                </div>
                @if (currentLevelId() < BOX_LEVELS.length) {
                  <button
                    type="button"
                    (click)="selectLevel(currentLevelId() + 1)"
                    class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
                  >
                    {{ t().logicGames.nextLevel }} →
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class LogicGames implements OnInit, OnDestroy {
  private readonly classroomService = inject(ClassroomService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;
  readonly activeGame = signal<'cables' | 'boxes'>('cables');
  readonly currentLevelId = signal<number>(1);

  // Cables State
  readonly CABLE_LEVELS = CABLE_LEVELS;
  readonly cableTiles = signal<CableTile[]>([]);
  readonly cablesWon = signal<boolean>(false);

  // Boxes State
  readonly BOX_LEVELS = BOX_LEVELS;
  readonly boxPlayer = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly boxPositions = signal<{ x: number; y: number }[]>([]);
  readonly boxMoves = signal<number>(0);
  readonly boxHistory = signal<{ player: { x: number; y: number }; boxes: { x: number; y: number }[] }[]>([]);
  readonly boxesWon = signal<boolean>(false);

  private audioCtx: AudioContext | null = null;

  readonly currentCableLevel = computed(() => {
    return CABLE_LEVELS.find((l) => l.id === this.currentLevelId()) || CABLE_LEVELS[0];
  });

  readonly currentBoxLevel = computed(() => {
    return BOX_LEVELS.find((l) => l.id === this.currentLevelId()) || BOX_LEVELS[0];
  });

  readonly currentLevelsList = computed(() => {
    return this.activeGame() === 'cables' ? CABLE_LEVELS : BOX_LEVELS;
  });

  readonly boxesOnGoalCount = computed(() => {
    const goals = this.currentBoxLevel().goals;
    const boxes = this.boxPositions();
    return boxes.filter((b) => goals.some((g) => g.x === b.x && g.y === b.y)).length;
  });

  readonly boxGridCells = computed(() => {
    const lvl = this.currentBoxLevel();
    const cells: { x: number; y: number; type: 'floor' | 'wall'; isGoal: boolean; hasBox: boolean }[] = [];
    const boxes = this.boxPositions();

    for (let y = 0; y < lvl.height; y++) {
      for (let x = 0; x < lvl.width; x++) {
        const isWall = lvl.walls.some((w) => w.x === x && w.y === y);
        const isGoal = lvl.goals.some((g) => g.x === x && g.y === y);
        const hasBox = boxes.some((b) => b.x === x && b.y === y);

        cells.push({
          x,
          y,
          type: isWall ? 'wall' : 'floor',
          isGoal,
          hasBox,
        });
      }
    }
    return cells;
  });

  ngOnInit(): void {
    this.initCableLevel(1);
    this.classroomService.reportActivity(
      'Juegos de Lógica',
      'Resolviendo Caminos Digitales',
    );
  }

  ngOnDestroy(): void {
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // AudioContext close
      }
    }
  }

  switchGame(game: 'cables' | 'boxes'): void {
    this.activeGame.set(game);
    this.selectLevel(1);
    this.classroomService.reportActivity(
      'Juegos de Lógica',
      game === 'cables' ? 'En Caminos Digitales' : 'En Almacén de Datos',
    );
  }

  selectLevel(id: number): void {
    this.currentLevelId.set(id);
    if (this.activeGame() === 'cables') {
      this.initCableLevel(id);
    } else {
      this.initBoxLevel(id);
    }
  }

  restartLevel(): void {
    this.selectLevel(this.currentLevelId());
  }

  // --- CABLE LOGIC ---
  private initCableLevel(id: number): void {
    const lvl = CABLE_LEVELS.find((l) => l.id === id) || CABLE_LEVELS[0];
    this.cablesWon.set(false);

    const tiles: CableTile[] = lvl.initialTiles.map((t) => ({
      ...t,
      isPowered: t.shape === 'start',
    }));

    this.cableTiles.set(tiles);
    this.evaluateCablePower();
  }

  rotateTile(tile: CableTile): void {
    if (tile.shape === 'start' || tile.shape === 'goal' || this.cablesWon()) return;

    this.playTone(400, 0.05);
    this.cableTiles.update((tiles) =>
      tiles.map((t) => {
        if (t.x === tile.x && t.y === tile.y) {
          return { ...t, rotation: (t.rotation + 90) % 360 };
        }
        return t;
      }),
    );

    this.evaluateCablePower();
  }

  private evaluateCablePower(): void {
    const tiles = this.cableTiles();
    const lvl = this.currentCableLevel();

    // Map: 'x-y' => Tile
    const tileMap = new Map<string, CableTile>();
    for (const t of tiles) {
      tileMap.set(`${t.x}-${t.y}`, { ...t, isPowered: false });
    }

    const startKey = `${lvl.start.x}-${lvl.start.y}`;
    const startTile = tileMap.get(startKey);
    if (!startTile) return;

    startTile.isPowered = true;
    const queue: CableTile[] = [startTile];
    const visited = new Set<string>([startKey]);

    // Dirs: 0 = North (y-1), 1 = East (x+1), 2 = South (y+1), 3 = West (x-1)
    const getConnections = (t: CableTile): number[] => {
      const rot = t.rotation / 90; // 0, 1, 2, 3
      if (t.shape === 'line') {
        // base: West-East (3, 1)
        return [(3 + rot) % 4, (1 + rot) % 4];
      }
      if (t.shape === 'corner') {
        // base: North-East (0, 1)
        return [(0 + rot) % 4, (1 + rot) % 4];
      }
      if (t.shape === 't') {
        // base: West-East-South (3, 1, 2)
        return [(3 + rot) % 4, (1 + rot) % 4, (2 + rot) % 4];
      }
      if (t.shape === 'cross') {
        return [0, 1, 2, 3];
      }
      if (t.shape === 'start') {
        return [lvl.start.dir];
      }
      if (t.shape === 'goal') {
        return [lvl.goal.dir];
      }
      return [];
    };

    let reachedGoal = false;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curConns = getConnections(cur);

      for (const dir of curConns) {
        let nx = cur.x;
        let ny = cur.y;
        const oppositeDir = (dir + 2) % 4;

        if (dir === 0) ny--;
        if (dir === 1) nx++;
        if (dir === 2) ny++;
        if (dir === 3) nx--;

        const neighborKey = `${nx}-${ny}`;
        const neighbor = tileMap.get(neighborKey);

        if (neighbor && !visited.has(neighborKey)) {
          const neighborConns = getConnections(neighbor);
          if (neighborConns.includes(oppositeDir)) {
            neighbor.isPowered = true;
            visited.add(neighborKey);
            queue.push(neighbor);

            if (neighbor.shape === 'goal') {
              reachedGoal = true;
            }
          }
        }
      }
    }

    this.cableTiles.set(Array.from(tileMap.values()));

    if (reachedGoal && !this.cablesWon()) {
      this.cablesWon.set(true);
      this.playWinFanfare();
    }
  }

  // --- SOKOBAN / BOXES LOGIC ---
  private initBoxLevel(id: number): void {
    const lvl = BOX_LEVELS.find((l) => l.id === id) || BOX_LEVELS[0];
    this.boxesWon.set(false);
    this.boxMoves.set(0);
    this.boxHistory.set([]);
    this.boxPlayer.set({ ...lvl.playerStart });
    this.boxPositions.set(lvl.boxes.map((b) => ({ ...b })));
  }

  moveBoxPlayer(dx: number, dy: number): void {
    if (this.boxesWon()) return;

    const p = this.boxPlayer();
    const nx = p.x + dx;
    const ny = p.y + dy;
    const lvl = this.currentBoxLevel();

    // Check wall
    if (lvl.walls.some((w) => w.x === nx && w.y === ny)) {
      return;
    }

    const boxes = this.boxPositions();
    const boxIndex = boxes.findIndex((b) => b.x === nx && b.y === ny);

    if (boxIndex !== -1) {
      // Pushing a box
      const boxNx = nx + dx;
      const boxNy = ny + dy;

      // Check if space behind box is blocked by wall or another box
      if (
        lvl.walls.some((w) => w.x === boxNx && w.y === boxNy) ||
        boxes.some((b) => b.x === boxNx && b.y === boxNy)
      ) {
        return;
      }

      // Save history for Undo
      this.boxHistory.update((h) => [
        ...h,
        { player: { ...p }, boxes: boxes.map((b) => ({ ...b })) },
      ]);

      // Move box
      const nextBoxes = [...boxes];
      nextBoxes[boxIndex] = { x: boxNx, y: boxNy };
      this.boxPositions.set(nextBoxes);
      this.boxPlayer.set({ x: nx, y: ny });
      this.boxMoves.update((m) => m + 1);
      this.playTone(320, 0.08);

      // Check win
      const allOnGoals = nextBoxes.every((b) =>
        lvl.goals.some((g) => g.x === b.x && g.y === b.y),
      );
      if (allOnGoals) {
        this.boxesWon.set(true);
        this.playWinFanfare();
      }
    } else {
      // Empty space move
      this.boxHistory.update((h) => [
        ...h,
        { player: { ...p }, boxes: boxes.map((b) => ({ ...b })) },
      ]);
      this.boxPlayer.set({ x: nx, y: ny });
      this.boxMoves.update((m) => m + 1);
      this.playTone(480, 0.04);
    }
  }

  undoBoxMove(): void {
    const history = this.boxHistory();
    if (history.length === 0 || this.boxesWon()) return;

    const prev = history[history.length - 1];
    this.boxHistory.set(history.slice(0, -1));
    this.boxPlayer.set(prev.player);
    this.boxPositions.set(prev.boxes);
    this.boxMoves.update((m) => Math.max(0, m - 1));
  }

  private playTone(freq: number, duration: number): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // AudioContext policy
    }
  }

  private playWinFanfare(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.18), idx * 100);
    });
  }
}
