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
import { MatIconModule } from '@angular/material/icon';
import type { VirtualItem } from '../models/classroom.types';
import { ActivityTrackerService } from '../services/activity-tracker.service';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { downloadCanvasAsPdf } from '../utils/canvas-pdf';

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
  imports: [MatIconModule],
  template: `
    <div id="paint-app-container" class="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none relative overflow-hidden">
      <!-- Toast Feedback Notification -->
      @if (toastMessage(); as toast) {
        <div
          class="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-xl text-white shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md transition-all duration-300"
          [class.bg-emerald-600]="toast.type === 'success'"
          [class.bg-rose-600]="toast.type === 'error'"
          [class.bg-blue-600]="toast.type === 'info'"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">
            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
          </mat-icon>
          <span>{{ toast.text }}</span>
        </div>
      }

      <!-- Top Actions Bar -->
      <header id="paint-top-bar" class="px-2 sm:px-3 py-1.5 sm:py-2 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-1.5 shrink-0 text-xs overflow-x-auto no-scrollbar">
        <!-- Action Buttons: New, Save, Save As, Undo, Redo -->
        <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <!-- New Canvas -->
          <button
            id="btn-paint-new"
            type="button"
            class="h-8 sm:h-7 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 transition"
            (click)="onNewCanvasClick()"
            [title]="t().paint.newCanvas"
            aria-label="Neues leeres Blatt"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">note_add</mat-icon>
            <span class="hidden sm:inline">{{ t().paint.newCanvas }}</span>
          </button>

          <!-- Save Quick -->
          <button
            id="btn-paint-save"
            type="button"
            class="h-8 sm:h-7 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium shadow-sm transition"
            (click)="onSaveQuick()"
            [title]="t().paint.save"
            aria-label="Speichern"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">save</mat-icon>
            <span>{{ t().paint.save }}</span>
          </button>

          <!-- Save As... -->
          <button
            id="btn-paint-save-as"
            type="button"
            class="h-8 sm:h-7 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 transition"
            (click)="openSaveDialog()"
            [title]="t().paint.saveAs"
            aria-label="Speichern unter"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">save_as</mat-icon>
            <span class="hidden md:inline">{{ t().paint.saveAs }}</span>
          </button>

          <!-- Export PDF -->
          <button
            id="btn-paint-export-pdf"
            type="button"
            class="h-8 sm:h-7 px-2 sm:px-2.5 rounded-lg flex items-center gap-1.5 bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white font-medium shadow-sm transition border border-rose-600/50"
            (click)="exportCanvasAsPdf()"
            [title]="isDe() ? 'Als PDF exportieren / drucken' : 'Exportar como PDF / imprimir'"
            aria-label="Als PDF exportieren"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">picture_as_pdf</mat-icon>
            <span class="hidden sm:inline">PDF</span>
          </button>

          <div class="h-4 w-px bg-slate-800 mx-0.5 sm:mx-1"></div>

          <!-- Undo -->
          <button
            id="btn-paint-undo"
            type="button"
            class="w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            [disabled]="undoStack.length <= 1"
            (click)="undo()"
            [title]="t().paint.undo"
            aria-label="Undo"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">undo</mat-icon>
          </button>

          <!-- Redo -->
          <button
            id="btn-paint-redo"
            type="button"
            class="w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            [disabled]="redoStack.length === 0"
            (click)="redo()"
            [title]="t().paint.redo"
            aria-label="Redo"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">redo</mat-icon>
          </button>
        </div>

        <!-- Current File Title / Canvas Size Badge -->
        <div class="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 shrink-0 ml-auto">
          <span class="hidden lg:inline px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 font-mono text-[10px] text-slate-400">
            {{ canvasWidth() }}×{{ canvasHeight() }}
          </span>
          @if (currentSavedFile(); as file) {
            <span class="text-emerald-400 font-medium truncate max-w-[120px] sm:max-w-xs flex items-center gap-1">
              <mat-icon class="text-xs !w-3 !h-3">check_circle</mat-icon>
              {{ file.name }}
            </span>
          } @else {
            <span class="text-amber-400/90 truncate max-w-[140px] sm:max-w-none text-[11px]">
              {{ isDe() ? 'Unbenannt' : 'Sin título' }}
            </span>
          }
        </div>
      </header>

      <!-- Auto-Draft Banner (Recovery) -->
      @if (hasDraftToRestore()) {
        <div id="paint-draft-banner" class="px-3 py-1.5 bg-blue-950/80 border-b border-blue-800 flex items-center justify-between text-xs text-blue-200 shrink-0">
          <div class="flex items-center gap-2 truncate">
            <mat-icon class="text-blue-400 text-base shrink-0">restore_page</mat-icon>
            <span class="truncate">{{ t().paint.autoDraftFound }}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium transition"
              (click)="restoreAutoDraft()"
            >
              {{ t().paint.restoreDraft }}
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 transition"
              (click)="discardAutoDraft()"
            >
              {{ t().paint.discardDraft }}
            </button>
          </div>
        </div>
      }

      <!-- Tools & Palette Bar: Mobile-optimized 2-tier / flex-wrap layout -->
      <div id="paint-tools-bar" class="p-1.5 sm:p-2 border-b border-slate-800 bg-slate-950/80 flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-3 shrink-0 text-xs overflow-x-auto no-scrollbar">
        <!-- Group 1: Drawing Tools (Pencil, Brush, Eraser, Line, Rect, Circle, Text) -->
        <div class="flex items-center gap-0.5 sm:gap-1 bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0">
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
            aria-label="Bleistift"
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
            aria-label="Pinsel"
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
            aria-label="Radiergummi"
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
            aria-label="Linie"
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
            aria-label="Rechteck"
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
            aria-label="Kreis"
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
            aria-label="Text"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">text_fields</mat-icon>
          </button>
        </div>

        <!-- Group 2: Fill / Stroke Shape Mode Toggle -->
        @if (['rectangle', 'circle'].includes(activeTool())) {
          <div class="flex items-center gap-1 bg-slate-900 p-0.5 sm:p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              class="px-2 py-1 rounded-md text-[11px] transition-colors"
              [class.bg-blue-600]="!fillShape()"
              [class.text-white]="!fillShape()"
              [class.text-slate-400]="fillShape()"
              (click)="fillShape.set(false)"
            >
              {{ t().paint.strokeMode }}
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded-md text-[11px] transition-colors"
              [class.bg-blue-600]="fillShape()"
              [class.text-white]="fillShape()"
              [class.text-slate-400]="!fillShape()"
              (click)="fillShape.set(true)"
            >
              {{ t().paint.fillMode }}
            </button>
          </div>
        }

        <!-- Group 3: Stroke Width Dots -->
        <div class="flex items-center gap-1 bg-slate-900 px-1.5 sm:px-2 py-1 rounded-xl border border-slate-800 shrink-0">
          <span class="text-slate-400 text-[10px] sm:text-[11px] hidden xs:inline">{{ t().paint.strokeWidth }}:</span>
          @for (size of strokeSizes; track size) {
            <button
              [id]="'stroke-size-' + size"
              type="button"
              class="w-7 h-7 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-colors"
              [class.bg-blue-600]="strokeWidth() === size"
              [class.bg-slate-800]="strokeWidth() !== size"
              (click)="strokeWidth.set(size)"
              [title]="size + 'px'"
              [attr.aria-label]="size + 'px'"
            >
              <div
                class="rounded-full bg-white"
                [style.width.px]="Math.min(14, Math.max(3, size))"
                [style.height.px]="Math.min(14, Math.max(3, size))"
              ></div>
            </button>
          }
        </div>

        <!-- Group 4: Color Swatches & Native Color Picker -->
        <div class="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 shrink-0 max-w-full overflow-hidden">
          <!-- Active Color Preview Chip -->
          <div
            class="w-6 h-6 rounded-lg border-2 border-white shadow-sm shrink-0"
            [style.backgroundColor]="currentColor()"
            title="Aktive Farbe"
          ></div>

          <!-- Color Swatches Grid / Scrollable -->
          <div class="flex items-center gap-1 overflow-x-auto max-w-[140px] xs:max-w-[200px] sm:max-w-xs py-0.5 no-scrollbar">
            @for (c of presetColors; track c) {
              <button
                [id]="'color-chip-' + c.replace('#', '')"
                type="button"
                class="w-6 h-6 sm:w-5 sm:h-5 rounded-full border border-slate-700 transition-transform cursor-pointer shrink-0"
                [style.backgroundColor]="c"
                [class.scale-125]="currentColor() === c"
                [class.ring-2]="currentColor() === c"
                [class.ring-blue-400]="currentColor() === c"
                (click)="setColor(c)"
                [attr.aria-label]="c"
              >
                <span class="sr-only">{{ c }}</span>
              </button>
            }
          </div>

          <!-- Color Picker input -->
          <label
            for="paint-color-picker"
            class="w-7 h-7 rounded-full border border-slate-700 flex items-center justify-center cursor-pointer bg-slate-800 hover:bg-slate-700 shrink-0 relative overflow-hidden"
            title="Eigene Farbe wählen"
          >
            <mat-icon class="text-sm !w-4 !h-4 text-slate-300">colorize</mat-icon>
            <input
              id="paint-color-picker"
              type="color"
              [value]="currentColor()"
              (input)="onColorPickerChange($event)"
              class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      <!-- Canvas Dynamic Container (Viewport & Resize Responsive) -->
      <div
        #canvasWrapper
        id="paint-canvas-wrapper"
        class="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative w-full h-full"
      >
        <div class="relative shadow-2xl bg-white rounded-xl overflow-hidden border border-slate-800 touch-none flex items-center justify-center">
          <canvas
            #paintCanvas
            id="paint-main-canvas"
            [width]="canvasWidth()"
            [height]="canvasHeight()"
            class="block bg-white cursor-crosshair touch-none select-none"
            (mousedown)="onMouseDown($event)"
            (mousemove)="onMouseMove($event)"
            (mouseup)="onMouseUp()"
            (mouseleave)="onMouseUp()"
            (touchstart)="onTouchStart($event)"
            (touchmove)="onTouchMove($event)"
            (touchend)="onTouchEnd()"
            (touchcancel)="onTouchEnd()"
          ></canvas>
        </div>
      </div>

      <!-- Save As Modal Dialog (Mobile Bottom Sheet / Desktop Modal) -->
      @if (showSaveModal()) {
        <div class="fixed inset-0 sm:absolute z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div class="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div class="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <mat-icon class="text-blue-400">save_as</mat-icon>
                <span>{{ t().paint.saveDialogTitle }}</span>
              </div>
              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition"
                (click)="showSaveModal.set(false)"
                aria-label="Schließen"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <div class="p-4 sm:p-5 flex flex-col gap-4 text-xs overflow-y-auto">
              <!-- File Name -->
              <div>
                <label for="save-filename-input" class="block font-medium text-slate-300 mb-1.5">
                  {{ t().paint.fileNamePrompt }}
                </label>
                <div class="relative flex items-center">
                  <input
                    id="save-filename-input"
                    type="text"
                    [value]="saveFileName()"
                    (input)="saveFileName.set($any($event.target).value)"
                    class="w-full h-11 sm:h-10 px-3 pr-12 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 font-medium text-sm sm:text-xs"
                    placeholder="z.B. Mein Haus"
                  />
                  <span class="absolute right-3 text-slate-500 font-mono text-xs pointer-events-none">.png</span>
                </div>
              </div>

              <!-- Folder selection -->
              <div>
                <label for="save-folder-select" class="block font-medium text-slate-300 mb-1.5">
                  {{ t().paint.selectFolderPrompt }}
                </label>
                <select
                  id="save-folder-select"
                  [value]="saveFolderPath()"
                  (change)="saveFolderPath.set($any($event.target).value)"
                  class="w-full h-11 sm:h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 text-sm sm:text-xs"
                >
                  @for (folder of availableFolders(); track folder.path) {
                    <option [value]="folder.path">{{ folder.display }}</option>
                  }
                </select>
                <p class="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <mat-icon class="text-amber-400 text-sm !w-4 !h-4">info</mat-icon>
                  <span>{{ isDe() ? 'Tipp: Speichere im Ordner "Meine Zeichnungen".' : 'Consejo: Guarda en la carpeta "Mis dibujos".' }}</span>
                </p>
              </div>
            </div>

            <div class="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                id="btn-save-cancel"
                type="button"
                class="flex-1 sm:flex-initial h-11 sm:h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-medium transition text-xs flex items-center justify-center"
                (click)="showSaveModal.set(false)"
              >
                {{ t().paint.btnCancel }}
              </button>
              <button
                id="btn-save-confirm"
                type="button"
                class="flex-1 sm:flex-initial h-11 sm:h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium shadow-md flex items-center justify-center gap-1.5 transition text-xs"
                (click)="confirmSaveFile()"
              >
                <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">save</mat-icon>
                <span>{{ t().paint.btnConfirmSave }}</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- In-App Text Tool Modal (No prompt() blockers in iframe/mobile) -->
      @if (showTextModal()) {
        <div class="fixed inset-0 sm:absolute z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div class="w-full max-w-sm bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <mat-icon class="text-blue-400">text_fields</mat-icon>
                <span>{{ isDe() ? 'Text auf Leinwand einfügen' : 'Insertar texto en lienzo' }}</span>
              </div>
              <button
                type="button"
                class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                (click)="cancelTextModal()"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <div class="p-4 flex flex-col gap-3">
              <label for="text-tool-input" class="text-xs text-slate-300 font-medium">
                {{ isDe() ? 'Schreibe deinen Text:' : 'Escribe tu texto:' }}
              </label>
              <input
                id="text-tool-input"
                type="text"
                [value]="textToInsert()"
                (input)="textToInsert.set($any($event.target).value)"
                (keyup.enter)="confirmInsertText()"
                class="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500 font-medium text-sm"
                [placeholder]="isDe() ? 'z.B. Mein Kunstwerk' : 'p. ej. Mi obra de arte'"
              />
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>{{ isDe() ? 'Farbe' : 'Color' }}:</span>
                <div class="flex items-center gap-1.5 font-mono text-slate-300">
                  <div class="w-3.5 h-3.5 rounded-full border border-slate-600" [style.backgroundColor]="currentColor()"></div>
                  <span>{{ currentColor() }}</span>
                </div>
              </div>
            </div>

            <div class="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                type="button"
                class="flex-1 sm:flex-initial h-10 sm:h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
                (click)="cancelTextModal()"
              >
                {{ t().paint.btnCancel }}
              </button>
              <button
                type="button"
                class="flex-1 sm:flex-initial h-10 sm:h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md flex items-center justify-center gap-1.5 transition"
                (click)="confirmInsertText()"
              >
                <mat-icon class="text-sm !w-4 !h-4">check</mat-icon>
                <span>{{ isDe() ? 'Einfügen' : 'Insertar' }}</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- In-App Confirm New Canvas Modal (No confirm() blockers in iframe/mobile) -->
      @if (showConfirmNewModal()) {
        <div class="fixed inset-0 sm:absolute z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div class="w-full max-w-sm bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div class="p-5 flex flex-col gap-3">
              <div class="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <mat-icon class="text-xl">warning</mat-icon>
              </div>
              <h3 class="text-sm font-bold text-slate-100">
                {{ isDe() ? 'Neues leeres Blatt anlegen?' : '¿Comenzar un lienzo nuevo?' }}
              </h3>
              <p class="text-xs text-slate-400">
                {{ isDe() ? 'Nicht gespeicherte Änderungen auf der aktuellen Leinwand werden gelöscht.' : 'Los cambios no guardados en el lienzo actual se borrarán.' }}
              </p>
            </div>

            <div class="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                type="button"
                class="flex-1 sm:flex-initial h-10 sm:h-9 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
                (click)="showConfirmNewModal.set(false)"
              >
                {{ t().paint.btnCancel }}
              </button>
              <button
                type="button"
                class="flex-1 sm:flex-initial h-10 sm:h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md flex items-center justify-center gap-1.5 transition"
                (click)="executeNewCanvas()"
              >
                <mat-icon class="text-sm !w-4 !h-4">delete</mat-icon>
                <span>{{ isDe() ? 'Ja, Blatt leeren' : 'Sí, vaciar lienzo' }}</span>
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
  readonly canvasWrapperRef = viewChild.required<ElementRef<HTMLDivElement>>('canvasWrapper');

  readonly classroom = inject(ClassroomService);
  readonly activity = inject(ActivityTrackerService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;
  readonly Math = Math;

  readonly presetColors = PRESET_COLORS;
  readonly strokeSizes = [2, 5, 10, 20];

  readonly activeTool = signal<PaintTool>('pencil');
  readonly currentColor = signal<string>('#3b82f6');
  readonly strokeWidth = signal<number>(5);
  readonly fillShape = signal<boolean>(false);

  // Dynamic canvas dimensions
  readonly canvasWidth = signal<number>(800);
  readonly canvasHeight = signal<number>(520);

  readonly currentSavedFile = signal<VirtualItem | null>(null);
  readonly showSaveModal = signal<boolean>(false);
  readonly showConfirmNewModal = signal<boolean>(false);
  readonly showTextModal = signal<boolean>(false);
  readonly toastMessage = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  readonly saveFileName = signal<string>('Mein Haus');
  readonly saveFolderPath = signal<string>('');
  readonly textToInsert = signal<string>('');
  private textTargetX = 40;
  private textTargetY = 40;

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
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly availableFolders = computed(() => {
    const user = this.classroom.currentUser();
    const room = this.classroom.classroom();
    if (!user || !room) return [];

    const userFolder = `/Klasse/${user.name}`;
    const folders = [{ path: userFolder, display: `📁 ${user.name} (${this.isDe() ? 'Hauptordner' : 'Carpeta principal'})` }];

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

    // Initialize dimensions dynamically based on container size
    this.updateDimensionsFromContainer(false);

    // Initial undo frame
    this.saveState();

    // Check if initial file was provided to open
    const file = this.initialFile();
    if (file && file.content) {
      this.loadImageOntoCanvas(file.content);
      this.currentSavedFile.set(file);
      this.saveFileName.set(file.name.replace(/\.png$/i, ''));
      const parent = file.path.substring(0, file.path.lastIndexOf('/'));
      this.saveFolderPath.set(parent);
    } else {
      // Check for local auto-draft
      this.checkLocalDraft();
    }

    // Default save folder path to student's "Meine Zeichnungen" if exists, or main folder
    this.initDefaultFolder();

    // Setup ResizeObserver for responsive viewport & container resizing
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeDebounceTimer) {
          clearTimeout(this.resizeDebounceTimer);
        }
        this.resizeDebounceTimer = setTimeout(() => {
          this.updateDimensionsFromContainer(true);
        }, 80);
      });

      this.resizeObserver.observe(this.canvasWrapperRef().nativeElement);
    }

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
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Adjusts the canvas buffer dimensions dynamically based on the wrapper/viewport size,
   * while seamlessly preserving all existing artwork without distortion.
   */
  private updateDimensionsFromContainer(preserveContent: boolean): void {
    const wrapper = this.canvasWrapperRef()?.nativeElement;
    if (!wrapper) return;

    const canvas = this.canvasRef().nativeElement;

    // Leave comfortable margin around canvas inside the wrapper
    const paddingX = window.innerWidth < 640 ? 16 : 32;
    const paddingY = window.innerWidth < 640 ? 16 : 32;

    const availableW = Math.max(260, Math.floor(wrapper.clientWidth - paddingX));
    const availableH = Math.max(200, Math.floor(wrapper.clientHeight - paddingY));

    // Desired dimensions capped to max bounds
    const targetW = Math.min(1600, Math.max(280, availableW));
    const targetH = Math.min(1200, Math.max(200, availableH));

    // Avoid unnecessary re-rendering if dimensions are nearly identical
    if (Math.abs(canvas.width - targetW) < 4 && Math.abs(canvas.height - targetH) < 4) {
      return;
    }

    if (preserveContent && canvas.width > 0 && canvas.height > 0) {
      // Create temporary offscreen backup of existing artwork
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Update canvas buffer dimensions
      canvas.width = targetW;
      canvas.height = targetH;
      this.canvasWidth.set(targetW);
      this.canvasHeight.set(targetH);

      // Fill with white background
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, targetW, targetH);

      // Restore previously drawn artwork 1:1 without distortion
      if (tempCtx) {
        this.ctx.drawImage(tempCanvas, 0, 0);
      }

      // Update the latest undo frame with the new size
      if (this.undoStack.length > 0) {
        this.undoStack[this.undoStack.length - 1] = this.ctx.getImageData(0, 0, targetW, targetH);
      } else {
        this.saveState();
      }
    } else {
      canvas.width = targetW;
      canvas.height = targetH;
      this.canvasWidth.set(targetW);
      this.canvasHeight.set(targetH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, targetW, targetH);
    }
  }

  private initDefaultFolder(): void {
    const user = this.classroom.currentUser();
    const room = this.classroom.classroom();
    if (!user || !room) return;

    const drawingsFolder = `/Klasse/${user.name}/Meine Zeichnungen`;
    const dibujosFolder = `/Klasse/${user.name}/Mis dibujos`;

    if (room.files[drawingsFolder]) {
      this.saveFolderPath.set(drawingsFolder);
    } else if (room.files[dibujosFolder]) {
      this.saveFolderPath.set(dibujosFolder);
    } else {
      this.saveFolderPath.set(`/Klasse/${user.name}`);
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

  /**
   * Translates client pointer / touch position accurately to canvas buffer pixels,
   * accounting for responsive CSS scaling or high-DPI buffers.
   */
  private getCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  onMouseDown(e: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
    this.startX = coords.x;
    this.startY = coords.y;
    this.isDrawing = true;

    this.usedColors.add(this.currentColor());
    this.hasDrawnSomething = true;

    // Snapshot before starting line / shape
    this.snapshotBeforeShape = this.ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.activeTool() === 'text') {
      this.openTextModal(this.startX, this.startY);
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

    const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
    const currentX = coords.x;
    const currentY = coords.y;

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

  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = this.canvasRef().nativeElement;
    const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
    this.startX = coords.x;
    this.startY = coords.y;
    this.isDrawing = true;

    this.usedColors.add(this.currentColor());
    this.hasDrawnSomething = true;
    this.snapshotBeforeShape = this.ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (this.activeTool() === 'text') {
      this.openTextModal(this.startX, this.startY);
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

  onTouchMove(e: TouchEvent): void {
    if (!this.isDrawing || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
    const currentX = coords.x;
    const currentY = coords.y;

    const tool = this.activeTool();

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      this.ctx.lineTo(currentX, currentY);
      this.ctx.stroke();
    } else if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
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

  onTouchEnd(): void {
    this.onMouseUp();
  }

  // In-app Text Modal logic (avoids prompt() blockers)
  private openTextModal(x: number, y: number): void {
    this.textTargetX = x;
    this.textTargetY = y;
    this.textToInsert.set('');
    this.showTextModal.set(true);
  }

  cancelTextModal(): void {
    this.showTextModal.set(false);
  }

  confirmInsertText(): void {
    const text = this.textToInsert().trim();
    if (text) {
      this.ctx.fillStyle = this.currentColor();
      this.ctx.font = `${Math.max(16, this.strokeWidth() * 4)}px sans-serif`;
      this.ctx.fillText(text, this.textTargetX, this.textTargetY);
      this.saveState();
      this.updateActivity();
    }
    this.showTextModal.set(false);
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

  onNewCanvasClick(): void {
    this.showConfirmNewModal.set(true);
  }

  executeNewCanvas(): void {
    this.showConfirmNewModal.set(false);
    const canvas = this.canvasRef().nativeElement;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.saveState();
    this.currentSavedFile.set(null);
    this.usedColors.clear();
    this.shapeCounter = 0;
    this.hasDrawnSomething = false;
    this.updateActivity();
    this.showToast(this.isDe() ? 'Neues Blatt angelegt' : 'Nuevo lienzo listo', 'info');
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
    const fileName = this.saveFileName().trim();
    if (!fileName) {
      this.showToast(this.t().explorer.nameEmpty, 'error');
      return;
    }

    const folder = this.saveFolderPath();
    if (!folder) {
      this.showToast(this.isDe() ? 'Bitte wähle einen Ordner aus.' : 'Por favor elige una carpeta.', 'error');
      return;
    }

    this.showSaveModal.set(false);
    await this.doSave(folder, fileName);
  }

  exportCanvasAsPdf(): void {
    const canvas = this.canvasRef().nativeElement;
    const user = this.classroom.currentUser();
    const group = this.classroom.currentGroup();
    const baseName = this.saveFileName().trim() || (this.isDe() ? 'Mein_Kunstwerk' : 'Mi_Dibujo');

    try {
      downloadCanvasAsPdf(canvas, baseName, {
        title: baseName,
        author: user ? `${user.name} (${user.role === 'teacher' ? 'Lehrkraft' : 'Schüler'})` : 'Schüler',
        classroomGroup: group ? group.name : 'Informatik Klasse 6b',
        dateStr: new Date().toLocaleDateString(this.isDe() ? 'de-DE' : 'es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });

      this.showToast(
        this.isDe()
          ? `PDF "${baseName}.pdf" exportiert! Bereit zum Drucken oder Archivieren.`
          : `¡PDF "${baseName}.pdf" exportado! Listo para imprimir o archivar.`,
        'success'
      );
      this.updateActivity();
    } catch {
      this.showToast(
        this.isDe() ? 'Fehler beim PDF-Export.' : 'Error al exportar a PDF.',
        'error'
      );
    }
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
      this.showToast(`${this.t().paint.savedSuccess}: ${res.item.name}`, 'success');
      // Discard local auto draft once explicitly saved
      this.discardAutoDraft();
      this.updateActivity();
    } else {
      this.showToast(res.error || (this.isDe() ? 'Fehler beim Speichern.' : 'Error al guardar.'), 'error');
    }
  }

  private showToast(text: string, type: 'success' | 'error' | 'info'): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastMessage.set({ text, type });
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3200);
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
      this.showToast(this.isDe() ? 'Entwurf wiederhergestellt' : 'Borrador restaurado', 'info');
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

