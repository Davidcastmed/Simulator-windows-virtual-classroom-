import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { VirtualItem } from '../models/classroom.types';
import { ActivityTrackerService } from '../services/activity-tracker.service';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

type PaintTool = 'pencil' | 'brush' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7',
  '#ec4899', '#78716c', '#64748b', '#b45309',
];

const LOCAL_DRAFT_KEY = 'klassendesktop_paint_draft';

@Component({
  selector: 'app-paint-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, FormsModule],
  template: `
    <div id="paint-app-container" class="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none">
      <!-- Top Actions Bar -->
      <div id="paint-top-bar" class="p-2 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
        <!-- New Canvas -->
        <button
          id="btn-paint-new"
          type="button"
          class="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          (click)="onNewCanvas()"
          title="Neues leeres Blatt"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">note_add</mat-icon>
          <span>{{ t().paint.newCanvas }}</span>
        </button>

        <!-- Save -->
        <button
          id="btn-paint-save"
          type="button"
          class="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm"
          (click)="onSaveQuick()"
          title="Speichern"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">save</mat-icon>
          <span>{{ t().paint.save }}</span>
        </button>

        <!-- Save As... -->
        <button
          id="btn-paint-save-as"
          type="button"
          class="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          (click)="openSaveDialog()"
          title="Speichern unter..."
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">save_as</mat-icon>
          <span>{{ t().paint.saveAs }}</span>
        </button>

        <div class="h-4 w-px bg-slate-700 mx-1"></div>

        <!-- Undo -->
        <button
          id="btn-paint-undo"
          type="button"
          class="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          [disabled]="undoStack.length <= 1"
          (click)="undo()"
          title="Rückgängig (Strg+Z)"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">undo</mat-icon>
        </button>

        <!-- Redo -->
        <button
          id="btn-paint-redo"
          type="button"
          class="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          [disabled]="redoStack.length === 0"
          (click)="redo()"
          title="Wiederholen (Strg+Y)"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">redo</mat-icon>
        </button>

        <!-- Current File Title -->
        <div class="ml-auto text-xs text-slate-400 flex items-center gap-2">
          @if (currentSavedFile()) {
            <span class="text-emerald-400 font-medium truncate max-w-xs flex items-center gap-1">
              <mat-icon class="text-xs !w-3 !h-3">check_circle</mat-icon>
              {{ currentSavedFile()?.name }}
            </span>
          } @else {
            <span class="text-amber-400/80 italic">Unbenanntes Bild (noch nicht gespeichert)</span>
          }
        </div>
      </div>

      <!-- Auto-Draft Banner (Recovery) -->
      @if (hasDraftToRestore()) {
        <div id="paint-draft-banner" class="px-3 py-1.5 bg-blue-950/70 border-b border-blue-800 flex items-center justify-between text-xs text-blue-200">
          <div class="flex items-center gap-2">
            <mat-icon class="text-blue-400 text-base">restore_page</mat-icon>
            <span>{{ t().paint.autoDraftFound }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
              (click)="restoreAutoDraft()"
            >
              {{ t().paint.restoreDraft }}
            </button>
            <button
              type="button"
              class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              (click)="discardAutoDraft()"
            >
              {{ t().paint.discardDraft }}
            </button>
          </div>
        </div>
      }

      <!-- Tools & Palette Bar -->
      <div id="paint-tools-bar" class="p-2 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center gap-3 shrink-0 text-xs">
        <!-- Tools Group -->
        <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <!-- Pencil -->
          <button
            id="tool-pencil"
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            [class.bg-blue-600]="activeTool() === 'pencil'"
            [class.text-white]="activeTool() === 'pencil'"
            [class.text-slate-400]="activeTool() !== 'pencil'"
            [class.hover:bg-slate-800]="activeTool() !== 'pencil'"
            (click)="setTool('pencil')"
            [title]="t().paint.pencil"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">edit</mat-icon>
          </button>

          <!-- Brush -->
          <button
            id="tool-brush"
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            [class.bg-blue-600]="activeTool() === 'brush'"
            [class.text-white]="activeTool() === 'brush'"
            [class.text-slate-400]="activeTool() !== 'brush'"
            [class.hover:bg-slate-800]="activeTool() !== 'brush'"
            (click)="setTool('brush')"
            [title]="t().paint.brush"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">brush</mat-icon>
          </button>

          <!-- Eraser -->
          <button
            id="tool-eraser"
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            [class.bg-blue-600]="activeTool() === 'eraser'"
            [class.text-white]="activeTool() === 'eraser'"
            [class.text-slate-400]="activeTool() !== 'eraser'"
            [class.hover:bg-slate-800]="activeTool() !== 'eraser'"
            (click)="setTool('eraser')"
            [title]="t().paint.eraser"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">auto_fix_normal</mat-icon>
          </button>

          <!-- Line -->
          <button
            id="tool-line"
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            [class.bg-blue-600]="activeTool() === 'line'"
            [class.text-white]="activeTool() === 'line'"
            [class.text-slate-400]="activeTool() !== 'line'"
            [class.hover:bg-slate-800]="activeTool() !== 'line'"
            (click)="setTool('line')"
            [title]="t().paint.line"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">horizontal_rule</mat-icon>
          </button>

          <!-- Rectangle -->
          <button
            id="tool-rectangle"
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            [class.bg-blue-600]="activeTool() === 'rectangle'"
            [class.text-white]="activeTool() === 'rectangle'"
            [class.text-slate-400]="activeTool() !== 'rectangle'"
            [class.hover:bg-slate-800]="activeTool() !== 'rectangle'"
            (click)="setTool('rectangle')"
            [title]="t().paint.rectangle"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">crop_square</mat-icon>
          </button>

          <!-- Circle -->
          <button
            id="tool-circle"
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            [class.bg-blue-600]="activeTool() === 'circle'"
            [class.text-white]="activeTool() === 'circle'"
            [class.text-slate-400]="activeTool() !== 'circle'"
            [class.hover:bg-slate-800]="activeTool() !== 'circle'"
            (click)="setTool('circle')"
            [title]="t().paint.circle"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">radio_button_unchecked</mat-icon>
          </button>

          <!-- Text Tool -->
          <button
            id="tool-text"
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            [class.bg-blue-600]="activeTool() === 'text'"
            [class.text-white]="activeTool() === 'text'"
            [class.text-slate-400]="activeTool() !== 'text'"
            [class.hover:bg-slate-800]="activeTool() !== 'text'"
            (click)="setTool('text')"
            [title]="t().paint.textTool"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">text_fields</mat-icon>
          </button>
        </div>

        <!-- Stroke / Fill Mode -->
        @if (['rectangle', 'circle'].includes(activeTool())) {
          <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              class="px-2 py-1 rounded-md text-[11px]"
              [class.bg-blue-600]="!fillShape()"
              [class.text-white]="!fillShape()"
              [class.text-slate-400]="fillShape()"
              (click)="fillShape.set(false)"
            >
              {{ t().paint.strokeMode }}
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded-md text-[11px]"
              [class.bg-blue-600]="fillShape()"
              [class.text-white]="fillShape()"
              [class.text-slate-400]="!fillShape()"
              (click)="fillShape.set(true)"
            >
              {{ t().paint.fillMode }}
            </button>
          </div>
        }

        <!-- Stroke Width Options -->
        <div class="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
          <span class="text-slate-400 text-[11px] mr-1">{{ t().paint.strokeWidth }}:</span>
          @for (size of strokeSizes; track size) {
            <button
              [id]="'stroke-size-' + size"
              type="button"
              class="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
              [class.bg-blue-600]="strokeWidth() === size"
              [class.bg-slate-800]="strokeWidth() !== size"
              (click)="strokeWidth.set(size)"
              [title]="size + 'px'"
            >
              <div
                class="rounded-full bg-white"
                [style.width.px]="Math.min(14, Math.max(3, size))"
                [style.height.px]="Math.min(14, Math.max(3, size))"
              ></div>
            </button>
          }
        </div>

        <!-- Palette Color Swatches -->
        <div class="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
          <div class="flex items-center gap-1 overflow-x-auto max-w-xs py-0.5">
            @for (c of presetColors; track c) {
              <button
                [id]="'color-chip-' + c.replace('#', '')"
                type="button"
                class="w-5 h-5 rounded-full border border-slate-700 transition-transform cursor-pointer shrink-0"
                [style.backgroundColor]="c"
                [class.scale-125]="currentColor() === c"
                [class.ring-2]="currentColor() === c"
                [class.ring-blue-400]="currentColor() === c"
                (click)="setColor(c)"
              >
                <span class="sr-only">{{ c }}</span>
              </button>
            }
          </div>

          <!-- Color Picker input -->
          <input
            id="paint-color-picker"
            type="color"
            [value]="currentColor()"
            (input)="onColorPickerChange($event)"
            class="w-6 h-6 rounded-full border border-slate-700 bg-transparent cursor-pointer ml-1 p-0"
            title="Eigene Farbe wählen"
          />
        </div>
      </div>

      <!-- Canvas Container -->
      <div id="paint-canvas-wrapper" class="flex-1 bg-slate-950 p-4 overflow-auto flex items-center justify-center relative">
        <div class="relative shadow-2xl bg-white rounded-lg overflow-hidden border border-slate-800">
          <canvas
            #paintCanvas
            id="paint-main-canvas"
            width="800"
            height="520"
            class="block bg-white cursor-crosshair"
            (mousedown)="onMouseDown($event)"
            (mousemove)="onMouseMove($event)"
            (mouseup)="onMouseUp()"
            (mouseleave)="onMouseUp()"
          ></canvas>
        </div>
      </div>

      <!-- Save As Modal Dialog -->
      @if (showSaveModal()) {
        <div class="absolute inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4">
          <div class="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div class="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <mat-icon class="text-blue-400">save_as</mat-icon>
                <span>{{ t().paint.saveDialogTitle }}</span>
              </div>
              <button
                type="button"
                class="text-slate-400 hover:text-white"
                (click)="showSaveModal.set(false)"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <div class="p-5 flex flex-col gap-4 text-xs">
              <!-- File Name -->
              <div>
                <label for="save-filename-input" class="block font-medium text-slate-300 mb-1.5">
                  {{ t().paint.fileNamePrompt }}
                </label>
                <div class="relative flex items-center">
                  <input
                    id="save-filename-input"
                    type="text"
                    [(ngModel)]="saveFileName"
                    class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="z.B. Mein Haus"
                  />
                  <span class="absolute right-3 text-slate-500 font-mono">.png</span>
                </div>
              </div>

              <!-- Folder selection -->
              <div>
                <label for="save-folder-select" class="block font-medium text-slate-300 mb-1.5">
                  {{ t().paint.selectFolderPrompt }}
                </label>
                <select
                  id="save-folder-select"
                  [(ngModel)]="saveFolderPath"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  @for (folder of availableFolders(); track folder.path) {
                    <option [value]="folder.path">{{ folder.display }}</option>
                  }
                </select>
                <p class="text-[11px] text-slate-500 mt-1">
                  Tipp für die Aufgabe: Speichere im Ordner "Meine Zeichnungen".
                </p>
              </div>
            </div>

            <div class="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                id="btn-save-cancel"
                type="button"
                class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                (click)="showSaveModal.set(false)"
              >
                {{ t().paint.btnCancel }}
              </button>
              <button
                id="btn-save-confirm"
                type="button"
                class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md flex items-center gap-1.5"
                (click)="confirmSaveFile()"
              >
                <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">save</mat-icon>
                <span>{{ t().paint.btnConfirmSave }}</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PaintApp implements AfterViewInit, OnDestroy {
  readonly initialFile = input<VirtualItem | null>(null);

  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('paintCanvas');
  readonly classroom = inject(ClassroomService);
  readonly activity = inject(ActivityTrackerService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly Math = Math;

  readonly presetColors = PRESET_COLORS;
  readonly strokeSizes = [2, 5, 10, 20];

  readonly activeTool = signal<PaintTool>('pencil');
  readonly currentColor = signal<string>('#3b82f6');
  readonly strokeWidth = signal<number>(5);
  readonly fillShape = signal<boolean>(false);

  readonly currentSavedFile = signal<VirtualItem | null>(null);
  readonly showSaveModal = signal<boolean>(false);
  saveFileName = 'Mein Haus';
  saveFolderPath = '';

  readonly hasDraftToRestore = signal<boolean>(false);

  // Metrics tracking for activity
  private usedColors = new Set<string>();
  private shapeCounter = 0;
  private hasDrawnSomething = false;

  // Canvas context
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private snapshotBeforeShape!: ImageData;

  // History stack
  readonly undoStack: ImageData[] = [];
  readonly redoStack: ImageData[] = [];

  private autoDraftTimer: ReturnType<typeof setInterval> | null = null;

  readonly availableFolders = computed(() => {
    const user = this.classroom.currentUser();
    const room = this.classroom.classroom();
    if (!user || !room) return [];

    const userFolder = `/Klasse/${user.name}`;
    const folders = [{ path: userFolder, display: `📁 ${user.name} (Hauptordner)` }];

    for (const [path, item] of Object.entries(room.files)) {
      if (item.type === 'folder' && path.startsWith(userFolder + '/') && !item.inTrash) {
        folders.push({
          path: item.path,
          display: `📁 ${item.name} (${path.replace(userFolder, '')})`,
        });
      }
    }

    return folders;
  });

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // Fill canvas with white background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Initial undo frame
    this.saveState();

    // Check if initial file was provided to open
    const file = this.initialFile();
    if (file && file.content) {
      this.loadImageOntoCanvas(file.content);
      this.currentSavedFile.set(file);
      this.saveFileName = file.name.replace(/\.png$/i, '');
      const parent = file.path.substring(0, file.path.lastIndexOf('/'));
      this.saveFolderPath = parent;
    } else {
      // Check for local auto-draft
      this.checkLocalDraft();
    }

    // Default save folder path to student's "Meine Zeichnungen" if exists, or main folder
    this.initDefaultFolder();

    // Start auto draft save interval
    this.autoDraftTimer = setInterval(() => {
      this.saveLocalDraft();
    }, 4000);

    // Record that paint is open
    this.updateActivity();
  }

  ngOnDestroy(): void {
    if (this.autoDraftTimer) {
      clearInterval(this.autoDraftTimer);
    }
  }

  private initDefaultFolder(): void {
    const user = this.classroom.currentUser();
    const room = this.classroom.classroom();
    if (!user || !room) return;

    const drawingsFolder = `/Klasse/${user.name}/Meine Zeichnungen`;
    const dibujosFolder = `/Klasse/${user.name}/Mis dibujos`;

    if (room.files[drawingsFolder]) {
      this.saveFolderPath = drawingsFolder;
    } else if (room.files[dibujosFolder]) {
      this.saveFolderPath = dibujosFolder;
    } else {
      this.saveFolderPath = `/Klasse/${user.name}`;
    }
  }

  setTool(tool: PaintTool): void {
    this.activeTool.set(tool);
  }

  setColor(color: string): void {
    this.currentColor.set(color);
    this.usedColors.add(color);
    this.updateActivity();
  }

  onColorPickerChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.setColor(val);
  }

  onMouseDown(e: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
    this.isDrawing = true;

    this.usedColors.add(this.currentColor());
    this.hasDrawnSomething = true;

    // Snapshot before starting line / shape
    this.snapshotBeforeShape = this.ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.activeTool() === 'text') {
      const text = prompt('Text eingeben:');
      if (text) {
        this.ctx.fillStyle = this.currentColor();
        this.ctx.font = `${Math.max(14, this.strokeWidth() * 4)}px sans-serif`;
        this.ctx.fillText(text, this.startX, this.startY);
        this.saveState();
        this.updateActivity();
      }
      this.isDrawing = false;
      return;
    }

    if (this.activeTool() === 'pencil' || this.activeTool() === 'brush' || this.activeTool() === 'eraser') {
      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.lineWidth = this.activeTool() === 'pencil' ? 2 : this.strokeWidth();
      this.ctx.strokeStyle = this.activeTool() === 'eraser' ? '#ffffff' : this.currentColor();
      this.ctx.lineTo(this.startX, this.startY);
      this.ctx.stroke();
    }
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;

    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const tool = this.activeTool();

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      this.ctx.lineTo(currentX, currentY);
      this.ctx.stroke();
    } else if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      // Restore before previewing
      this.ctx.putImageData(this.snapshotBeforeShape, 0, 0);

      this.ctx.lineWidth = this.strokeWidth();
      this.ctx.strokeStyle = this.currentColor();
      this.ctx.fillStyle = this.currentColor();

      if (tool === 'line') {
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
      } else if (tool === 'rectangle') {
        const w = currentX - this.startX;
        const h = currentY - this.startY;
        if (this.fillShape()) {
          this.ctx.fillRect(this.startX, this.startY, w, h);
        } else {
          this.ctx.strokeRect(this.startX, this.startY, w, h);
        }
      } else if (tool === 'circle') {
        const radiusX = Math.abs(currentX - this.startX) / 2;
        const radiusY = Math.abs(currentY - this.startY) / 2;
        const centerX = this.startX + (currentX - this.startX) / 2;
        const centerY = this.startY + (currentY - this.startY) / 2;

        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        if (this.fillShape()) {
          this.ctx.fill();
        } else {
          this.ctx.stroke();
        }
      }
    }
  }

  onMouseUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (['rectangle', 'circle', 'line'].includes(this.activeTool())) {
      this.shapeCounter++;
    }

    this.saveState();
    this.updateActivity();

    // Broadcast in demo mode if controlling
    if (this.classroom.isController()) {
      const canvas = this.canvasRef().nativeElement;
      this.classroom.syncDemoState({
        demoCanvasData: canvas.toDataURL('image/png'),
      });
    }
  }

  private saveState(): void {
    const canvas = this.canvasRef().nativeElement;
    const img = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.undoStack.push(img);
    if (this.undoStack.length > 25) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0; // clear redo
  }

  undo(): void {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.ctx.putImageData(prev, 0, 0);
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.ctx.putImageData(next, 0, 0);
  }

  onNewCanvas(): void {
    if (confirm('Möchtest du wirklich ein neues, leeres Blatt beginnen?')) {
      const canvas = this.canvasRef().nativeElement;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.saveState();
      this.currentSavedFile.set(null);
      this.usedColors.clear();
      this.shapeCounter = 0;
      this.hasDrawnSomething = false;
      this.updateActivity();
    }
  }

  openSaveDialog(): void {
    this.initDefaultFolder();
    this.showSaveModal.set(true);
  }

  async onSaveQuick(): Promise<void> {
    const saved = this.currentSavedFile();
    if (saved) {
      // Overwrite existing file
      const parent = saved.path.substring(0, saved.path.lastIndexOf('/'));
      await this.doSave(parent, saved.name);
    } else {
      this.openSaveDialog();
    }
  }

  async confirmSaveFile(): Promise<void> {
    const fileName = this.saveFileName.trim();
    if (!fileName) {
      alert(this.t().explorer.nameEmpty);
      return;
    }

    const folder = this.saveFolderPath;
    if (!folder) {
      alert('Bitte wähle einen Ordner aus.');
      return;
    }

    this.showSaveModal.set(false);
    await this.doSave(folder, fileName);
  }

  private async doSave(folderPath: string, fileName: string): Promise<void> {
    const canvas = this.canvasRef().nativeElement;
    const dataUrl = canvas.toDataURL('image/png');

    // Create thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 120;
    thumbCanvas.height = 80;
    const tCtx = thumbCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(canvas, 0, 0, 120, 80);
    }
    const thumbData = thumbCanvas.toDataURL('image/png');

    const res = await this.classroom.saveFile(folderPath, fileName, dataUrl, 'image', thumbData);
    if (res.success && res.item) {
      this.currentSavedFile.set(res.item);
      alert(`${this.t().paint.savedSuccess}\n${res.item.path}`);
      // Discard local auto draft once explicitly saved
      this.discardAutoDraft();
      this.updateActivity();
    } else {
      alert(res.error || 'Fehler beim Speichern.');
    }
  }

  private saveLocalDraft(): void {
    if (typeof window === 'undefined' || !this.hasDrawnSomething) return;
    try {
      const canvas = this.canvasRef().nativeElement;
      const dataUrl = canvas.toDataURL('image/png');
      localStorage.setItem(LOCAL_DRAFT_KEY, dataUrl);
    } catch {
      // Draft storage unavailable or exceeded quota
    }
  }

  private checkLocalDraft(): void {
    if (typeof window === 'undefined') return;
    try {
      const draft = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (draft && draft.length > 500) {
        this.hasDraftToRestore.set(true);
      }
    } catch {
      // Storage unavailable
    }
  }

  restoreAutoDraft(): void {
    const draft = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (draft) {
      this.loadImageOntoCanvas(draft);
      this.hasDraftToRestore.set(false);
      this.hasDrawnSomething = true;
      this.updateActivity();
    }
  }

  discardAutoDraft(): void {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    this.hasDraftToRestore.set(false);
  }

  private loadImageOntoCanvas(src: string): void {
    const img = new Image();
    img.onload = () => {
      const canvas = this.canvasRef().nativeElement;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      this.saveState();
    };
    img.src = src;
  }

  private updateActivity(): void {
    this.activity.recordPaintActivity({
      colorCount: this.usedColors.size,
      shapeCount: this.shapeCounter,
      hasDrawn: this.hasDrawnSomething,
    });
  }
}
