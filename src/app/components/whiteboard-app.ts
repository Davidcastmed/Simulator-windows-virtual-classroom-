import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import type { WhiteboardPoint } from '../models/classroom.types';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

const BOARD_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f8fafc', // white
  '#94a3b8', // slate
];

const STAMPS = ['⭐', '💡', '🚀', '🎓', '❤️', '✅', '🏆', '👏', '🎨', '🔥'];

@Component({
  selector: 'app-whiteboard-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, FormsModule],
  template: `
    <div id="whiteboard-container" class="flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      <!-- Toolbar -->
      <div class="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <!-- Tools & Colors -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Tool selection -->
          <div class="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
            <button
              type="button"
              class="px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
              [class.bg-blue-600]="activeTool() === 'pencil'"
              [class.text-white]="activeTool() === 'pencil'"
              [class.text-slate-300]="activeTool() !== 'pencil'"
              (click)="selectTool('pencil')"
              title="Lápiz / Stift"
            >
              <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">edit</mat-icon>
              <span>{{ t().whiteboard.pencil }}</span>
            </button>

            <button
              type="button"
              class="px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
              [class.bg-blue-600]="activeTool() === 'brush'"
              [class.text-white]="activeTool() === 'brush'"
              [class.text-slate-300]="activeTool() !== 'brush'"
              (click)="selectTool('brush')"
              title="Pincel ancho / Pinsel"
            >
              <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">brush</mat-icon>
              <span>{{ t().whiteboard.brush }}</span>
            </button>

            <button
              type="button"
              class="px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors"
              [class.bg-rose-600]="activeTool() === 'eraser'"
              [class.text-white]="activeTool() === 'eraser'"
              [class.text-slate-300]="activeTool() !== 'eraser'"
              (click)="selectTool('eraser')"
              title="Borrador / Radierer"
            >
              <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">auto_fix_normal</mat-icon>
              <span>{{ t().whiteboard.eraser }}</span>
            </button>
          </div>

          <!-- Color Palette -->
          <div class="flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 rounded-xl border border-slate-700">
            @for (c of colors; track c) {
              <button
                type="button"
                class="w-5 h-5 rounded-full transition-transform hover:scale-110 active:scale-95"
                [style.background-color]="c"
                [class.ring-2]="selectedColor() === c && activeTool() !== 'eraser'"
                [class.ring-white]="selectedColor() === c"
                (click)="setColor(c)"
                [attr.aria-label]="'Color ' + c"
              >
                <span class="sr-only">{{ c }}</span>
              </button>
            }
          </div>

          <!-- Stroke Size -->
          <div class="flex items-center gap-1 bg-slate-800/80 rounded-xl px-2 py-1 border border-slate-700">
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700"
              [class.bg-slate-700]="strokeSize() === 3"
              (click)="setStrokeSize(3)"
              title="Fino (3px)"
            >
              <div class="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700"
              [class.bg-slate-700]="strokeSize() === 7"
              (click)="setStrokeSize(7)"
              title="Medio (7px)"
            >
              <div class="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-700"
              [class.bg-slate-700]="strokeSize() === 14"
              (click)="setStrokeSize(14)"
              title="Grueso (14px)"
            >
              <div class="w-3.5 h-3.5 rounded-full bg-slate-200"></div>
            </button>
          </div>
        </div>

        <!-- Action Buttons (Clear & Save) -->
        <div class="flex items-center gap-2">
          <!-- Live drawing counter -->
          <span class="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium flex items-center gap-1 border border-emerald-500/30">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{{ strokesCount() }} {{ i18n.isDe() ? 'Tafel-Elemente' : 'trazos en vivo' }}</span>
          </span>

          <button
            type="button"
            id="btn-whiteboard-save"
            class="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 shadow-sm transition-colors"
            (click)="onSaveToFolder()"
            title="Guardar imagen en mi carpeta"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">save</mat-icon>
            <span>{{ t().whiteboard.download }}</span>
          </button>

          <button
            type="button"
            id="btn-whiteboard-clear"
            class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1"
            (click)="onClearWhiteboard()"
            title="Borrar pizarra para todos"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">delete</mat-icon>
            <span>{{ t().whiteboard.clear }}</span>
          </button>
        </div>
      </div>

      <!-- Stamps & Didactic Bar -->
      <div class="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap pl-1">
            {{ t().whiteboard.stamps }}:
          </span>
          @for (s of stamps; track s) {
            <button
              type="button"
              class="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-base transition-transform active:scale-90"
              (click)="onStampClick(s)"
              [title]="'Pegar ' + s"
            >
              {{ s }}
            </button>
          }
        </div>

        <span class="text-[11px] text-slate-400 hidden md:inline truncate ml-2">
          {{ t().whiteboard.cooperativeNotice }}
        </span>
      </div>

      <!-- Canvas Area -->
      <div
        #canvasContainer
        id="whiteboard-canvas-area"
        class="flex-1 relative bg-slate-950 overflow-hidden cursor-crosshair"
      >
        <canvas
          #canvas
          class="absolute inset-0 w-full h-full touch-none"
          (mousedown)="startDrawing($event)"
          (mousemove)="draw($event)"
          (mouseup)="stopDrawing()"
          (mouseleave)="stopDrawing()"
          (touchstart)="handleTouchStart($event)"
          (touchmove)="handleTouchMove($event)"
          (touchend)="stopDrawing()"
        ></canvas>

        <!-- Notification Toast -->
        @if (toastMessage()) {
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-emerald-600/90 text-white text-xs font-semibold shadow-lg backdrop-blur-sm border border-emerald-400/40 flex items-center gap-1.5 animate-in fade-in">
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">check_circle</mat-icon>
            <span>{{ toastMessage() }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class WhiteboardAppComponent implements AfterViewInit, OnDestroy {
  readonly classroomService = inject(ClassroomService);
  readonly i18n = inject(I18nService);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('canvasContainer');

  readonly colors = BOARD_COLORS;
  readonly stamps = STAMPS;

  readonly activeTool = signal<'pencil' | 'brush' | 'eraser'>('pencil');
  readonly selectedColor = signal<string>('#3b82f6');
  readonly strokeSize = signal<number>(4);
  readonly toastMessage = signal<string | null>(null);

  readonly t = computed(() => this.i18n.t());
  readonly strokes = computed(() => this.classroomService.whiteboardStrokes());
  readonly stampsList = computed(() => this.classroomService.whiteboardStamps());
  readonly strokesCount = computed(() => this.strokes().length + this.stampsList().length);

  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private currentPoints: WhiteboardPoint[] = [];
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Redraw whenever new strokes or stamps arrive from server
    effect(() => {
      // Trigger dependency tracking
      if (this.strokes() && this.stampsList() && this.ctx) {
        this.renderAll();
      }
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const container = this.containerRef()?.nativeElement;
    if (!canvas || !container) return;

    this.ctx = canvas.getContext('2d');
    this.setupCanvasSize();

    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvasSize();
      this.renderAll();
    });
    this.resizeObserver.observe(container);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  selectTool(tool: 'pencil' | 'brush' | 'eraser'): void {
    this.activeTool.set(tool);
    if (tool === 'brush') {
      this.strokeSize.set(9);
    } else if (tool === 'pencil') {
      this.strokeSize.set(4);
    } else if (tool === 'eraser') {
      this.strokeSize.set(20);
    }
  }

  setColor(color: string): void {
    this.selectedColor.set(color);
    if (this.activeTool() === 'eraser') {
      this.activeTool.set('pencil');
    }
  }

  setStrokeSize(size: number): void {
    this.strokeSize.set(size);
  }

  private setupCanvasSize(): void {
    const canvas = this.canvasRef()?.nativeElement;
    const container = this.containerRef()?.nativeElement;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  startDrawing(event: MouseEvent): void {
    this.isDrawing = true;
    const pt = this.getPoint(event);
    this.currentPoints = [pt];
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing || !this.ctx) return;
    const pt = this.getPoint(event);
    this.currentPoints.push(pt);

    // Draw immediate stroke segment locally
    const len = this.currentPoints.length;
    if (len >= 2) {
      const p1 = this.currentPoints[len - 2];
      const p2 = this.currentPoints[len - 1];

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (this.activeTool() === 'eraser') {
        this.ctx.strokeStyle = '#020617'; // background color
        this.ctx.lineWidth = this.strokeSize();
      } else {
        this.ctx.strokeStyle = this.selectedColor();
        this.ctx.lineWidth = this.strokeSize();
      }
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  async stopDrawing(): Promise<void> {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentPoints.length > 1) {
      const tool = this.activeTool();
      const color = tool === 'eraser' ? '#020617' : this.selectedColor();
      const size = this.strokeSize();
      const points = [...this.currentPoints];

      await this.classroomService.sendWhiteboardStroke({
        tool,
        color,
        size,
        points,
      });
    }
    this.currentPoints = [];
  }

  handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const pt = this.getTouchPoint(touch);
      this.isDrawing = true;
      this.currentPoints = [pt];
    }
  }

  handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.ctx || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const pt = this.getTouchPoint(touch);
    this.currentPoints.push(pt);

    const len = this.currentPoints.length;
    if (len >= 2) {
      const p1 = this.currentPoints[len - 2];
      const p2 = this.currentPoints[len - 1];

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (this.activeTool() === 'eraser') {
        this.ctx.strokeStyle = '#020617';
        this.ctx.lineWidth = this.strokeSize();
      } else {
        this.ctx.strokeStyle = this.selectedColor();
        this.ctx.lineWidth = this.strokeSize();
      }
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private getPoint(e: MouseEvent): WhiteboardPoint {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private getTouchPoint(t: Touch): WhiteboardPoint {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top,
    };
  }

  async onStampClick(emoji: string): Promise<void> {
    const container = this.containerRef()?.nativeElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // Place stamp near center with slight random offset
    const x = rect.width / 2 + (Math.random() * 120 - 60);
    const y = rect.height / 2 + (Math.random() * 120 - 60);

    await this.classroomService.sendWhiteboardStamp(emoji, x, y);
    this.showToast(`Pegatina ${emoji} añadida a la pizarra`);
  }

  async onClearWhiteboard(): Promise<void> {
    if (confirm(this.t().whiteboard.clearConfirm)) {
      await this.classroomService.clearWhiteboard();
    }
  }

  async onSaveToFolder(): Promise<void> {
    const canvas = this.canvasRef()?.nativeElement;
    const user = this.classroomService.currentUser();
    const room = this.classroomService.classroom();
    if (!canvas || !user || !room) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const targetFolder = user.role === 'teacher' ? '/Lehrermaterial' : `/Klasse/${user.name}`;
      const fileName = `Pizarra_Clase_${new Date().toISOString().slice(0, 10)}.png`;

      await fetch(`/api/classroom/${room.code}/fs/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPath: targetFolder,
          fileName,
          content: dataUrl,
          fileType: 'image',
          userId: user.id,
          userRole: user.role,
          userName: user.name,
          thumbnail: dataUrl,
        }),
      });

      this.showToast(this.t().whiteboard.saveSuccess);
    } catch {
      this.showToast('Error al guardar el dibujo.');
    }
  }

  private renderAll(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas || !this.ctx) return;

    const rect = canvas.getBoundingClientRect();
    // Clear canvas
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw subtle chalkboard grid pattern
    this.ctx.save();
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < rect.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, rect.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(rect.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // Render strokes
    const strokeList = this.strokes();
    for (const s of strokeList) {
      if (!s.points || s.points.length < 2) continue;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        this.ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = s.tool === 'eraser' ? '#020617' : s.color;
      this.ctx.lineWidth = s.size;
      this.ctx.stroke();

      // Show author tag on first stroke point
      if (s.tool !== 'eraser' && s.authorName) {
        this.ctx.font = '10px sans-serif';
        this.ctx.fillStyle = '#64748b';
        this.ctx.fillText(s.authorName, s.points[0].x + 4, s.points[0].y - 4);
      }

      this.ctx.restore();
    }

    // Render stamps
    const stampList = this.stampsList();
    for (const st of stampList) {
      this.ctx.save();
      this.ctx.font = '32px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(st.emoji, st.x, st.y);

      if (st.authorName) {
        this.ctx.font = '9px sans-serif';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText(st.authorName, st.x, st.y + 22);
      }
      this.ctx.restore();
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }
}
