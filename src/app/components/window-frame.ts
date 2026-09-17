import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { WindowState } from '../models/classroom.types';
import { AppearanceService } from '../services/appearance.service';
import { WindowManagerService } from '../services/window-manager.service';

@Component({
  selector: 'app-window-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      [id]="'window-' + win().id"
      class="absolute flex flex-col shadow-2xl border transition-all overflow-hidden"
      [class]="appearance.blurClass()"
      [class.rounded-none]="isFullViewport()"
      [class.rounded-xl]="!isFullViewport()"
      [class.hidden]="win().isMinimized"
      [class.border-slate-400]="isActive() && appearance.isLight()"
      [class.window-active-shadow-light]="isActive() && appearance.isLight()"
      [class.border-slate-300]="!isActive() && appearance.isLight()"
      [class.window-inactive-shadow-light]="!isActive() && appearance.isLight()"
      [class.border-zinc-500]="isActive() && !appearance.isLight()"
      [class.window-active-shadow]="isActive() && !appearance.isLight()"
      [class.border-zinc-700]="!isActive() && !appearance.isLight()"
      [class.window-inactive-shadow]="!isActive() && !appearance.isLight()"
      [style.left.px]="isFullViewport() ? 0 : win().x"
      [style.top.px]="isFullViewport() ? 0 : win().y"
      [style.width.px]="isFullViewport() ? maxWidth() : win().width"
      [style.height.px]="isFullViewport() ? maxHeight() : win().height"
      [style.z-index]="win().zIndex"
      (mousedown)="bringToFront()"
      (touchstart)="bringToFront()"
    >
      <!-- Title Bar (Light Silver / Titanium or Dark Metal based on settings) -->
      <div
        [id]="'window-titlebar-' + win().id"
        class="h-11 sm:h-10 px-2.5 sm:px-3 flex items-center justify-between select-none cursor-move shrink-0 border-b transition-colors touch-manipulation"
        [class.bg-gradient-to-r]="true"
        [class.from-slate-200]="isActive() && appearance.isLight()"
        [class.via-slate-100]="isActive() && appearance.isLight()"
        [class.to-slate-200]="isActive() && appearance.isLight()"
        [class.border-slate-300]="isActive() && appearance.isLight()"
        [class.text-slate-800]="isActive() && appearance.isLight()"
        [class.light-sheen-inset]="isActive() && appearance.isLight()"
        [class.from-slate-100]="!isActive() && appearance.isLight()"
        [class.via-slate-50]="!isActive() && appearance.isLight()"
        [class.to-slate-100]="!isActive() && appearance.isLight()"
        [class.border-slate-250]="!isActive() && appearance.isLight()"
        [class.text-slate-500]="!isActive() && appearance.isLight()"
        [class.from-zinc-800]="isActive() && !appearance.isLight()"
        [class.via-zinc-750]="isActive() && !appearance.isLight()"
        [class.to-zinc-800]="isActive() && !appearance.isLight()"
        [class.border-zinc-650]="isActive() && !appearance.isLight()"
        [class.text-zinc-100]="isActive() && !appearance.isLight()"
        [class.metal-sheen-inset]="isActive() && !appearance.isLight()"
        [class.from-zinc-900]="!isActive() && !appearance.isLight()"
        [class.via-zinc-850]="!isActive() && !appearance.isLight()"
        [class.to-zinc-900]="!isActive() && !appearance.isLight()"
        [class.border-zinc-800]="!isActive() && !appearance.isLight()"
        [class.text-zinc-400]="!isActive() && !appearance.isLight()"
        (mousedown)="startDrag($event)"
        (touchstart)="startDragTouch($event)"
      >
        <div class="flex items-center gap-2 text-sm font-semibold tracking-tight truncate min-w-0 pr-2">
          <mat-icon
            class="text-lg !w-5 !h-5 flex items-center justify-center filter drop-shadow-sm shrink-0"
            [class.text-sky-600]="appearance.isLight()"
            [class.text-sky-300]="!appearance.isLight()"
          >
            {{ win().icon }}
          </mat-icon>
          <span class="truncate">{{ win().title }}</span>
        </div>

        <!-- Window Actions (Thumb-friendly touch targets on mobile) -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- Minimize -->
          <button
            [id]="'btn-minimize-' + win().id"
            type="button"
            class="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md transition-colors touch-target-mobile"
            [class.text-slate-600]="appearance.isLight()"
            [class.hover:text-slate-950]="appearance.isLight()"
            [class.hover:bg-slate-300/60]="appearance.isLight()"
            [class.text-zinc-400]="!appearance.isLight()"
            [class.hover:text-zinc-100]="!appearance.isLight()"
            [class.hover:bg-zinc-700/60]="!appearance.isLight()"
            title="Minimieren"
            (click)="onMinimize($event)"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">remove</mat-icon>
          </button>

          <!-- Maximize / Restore (hidden on small smartphones since they are always maximized) -->
          @if (!wm.isMobile()) {
            <button
              [id]="'btn-maximize-' + win().id"
              type="button"
              class="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md transition-colors touch-target-mobile"
              [class.text-slate-600]="appearance.isLight()"
              [class.hover:text-slate-950]="appearance.isLight()"
              [class.hover:bg-slate-300/60]="appearance.isLight()"
              [class.text-zinc-400]="!appearance.isLight()"
              [class.hover:text-zinc-100]="!appearance.isLight()"
              [class.hover:bg-zinc-700/60]="!appearance.isLight()"
              [title]="win().isMaximized ? 'Wiederherstellen' : 'Maximieren'"
              (click)="onMaximize($event)"
            >
              <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">
                {{ win().isMaximized ? 'filter_none' : 'crop_square' }}
              </mat-icon>
            </button>
          }

          <!-- Close -->
          <button
            [id]="'btn-close-' + win().id"
            type="button"
            class="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md transition-colors touch-target-mobile"
            [class.text-slate-600]="appearance.isLight()"
            [class.hover:text-white]="true"
            [class.hover:bg-rose-600]="true"
            [class.text-zinc-400]="!appearance.isLight()"
            title="Schließen"
            (click)="onClose($event)"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Window Body (Adaptive Light / Dark with Heavy Blur & Configurable Opacity) -->
      <div
        class="flex-1 overflow-hidden flex flex-col relative window-content-themed transition-colors"
        [style.backgroundColor]="bodyBgColor()"
      >
        <ng-content></ng-content>
      </div>

      <!-- Resize Handle (bottom-right - only on desktop when not maximized) -->
      @if (!isFullViewport()) {
        <div
          [id]="'resize-handle-' + win().id"
          class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-center justify-center text-slate-500 hover:text-slate-300"
          (mousedown)="startResize($event)"
        >
          <div class="w-1.5 h-1.5 border-r-2 border-b-2 border-slate-500"></div>
        </div>
      }
    </div>
  `,
})
export class WindowFrame {
  readonly win = input.required<WindowState>();
  readonly wm = inject(WindowManagerService);
  readonly appearance = inject(AppearanceService);

  readonly isFullViewport = computed(() => this.wm.isMobile() || this.win().isMaximized);

  readonly bodyBgColor = computed(() => {
    const opacity = this.appearance.windowOpacity() / 100;
    switch (this.appearance.windowTheme()) {
      case 'light-titanium':
        return `rgba(245, 245, 244, ${opacity})`;
      case 'soft-white':
        return `rgba(255, 255, 255, ${opacity})`;
      case 'dark-metal':
        return `rgba(17, 20, 25, ${opacity})`;
      case 'light-silver':
      default:
        return `rgba(248, 250, 252, ${opacity})`;
    }
  });

  readonly maxWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1200);
  readonly maxHeight = signal(typeof window !== 'undefined' ? window.innerHeight - 48 : 800);

  private isDragging = false;
  private isResizing = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private winStartX = 0;
  private winStartY = 0;
  private winStartWidth = 0;
  private winStartHeight = 0;

  isActive(): boolean {
    return this.wm.activeWindowId() === this.win().id;
  }

  bringToFront(): void {
    this.wm.bringToFront(this.win().id);
  }

  onMinimize(e: MouseEvent | TouchEvent): void {
    e.stopPropagation();
    this.wm.minimizeWindow(this.win().id);
  }

  onMaximize(e: MouseEvent | TouchEvent): void {
    e.stopPropagation();
    this.wm.maximizeWindow(this.win().id);
  }

  onClose(e: MouseEvent | TouchEvent): void {
    e.stopPropagation();
    this.wm.closeWindow(this.win().id);
  }

  startDrag(e: MouseEvent): void {
    if (this.isFullViewport()) return;
    if ((e.target as HTMLElement).closest('button')) return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.winStartX = this.win().x;
    this.winStartY = this.win().y;
    this.bringToFront();
    e.preventDefault();
  }

  startDragTouch(e: TouchEvent): void {
    if (this.isFullViewport()) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length === 0) return;

    const touch = e.touches[0];
    this.isDragging = true;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.winStartX = this.win().x;
    this.winStartY = this.win().y;
    this.bringToFront();
  }

  startResize(e: MouseEvent): void {
    this.isResizing = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.winStartWidth = this.win().width;
    this.winStartHeight = this.win().height;
    this.bringToFront();
    e.preventDefault();
    e.stopPropagation();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      const newX = Math.max(0, Math.min(window.innerWidth - 100, this.winStartX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, this.winStartY + dy));
      this.wm.updatePosition(this.win().id, newX, newY);
    } else if (this.isResizing) {
      const dw = e.clientX - this.dragStartX;
      const dh = e.clientY - this.dragStartY;
      const newW = Math.max(380, this.winStartWidth + dw);
      const newH = Math.max(260, this.winStartHeight + dh);
      this.wm.updateSize(this.win().id, newW, newH);
    }
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (this.isDragging && e.touches.length > 0) {
      const touch = e.touches[0];
      const dx = touch.clientX - this.dragStartX;
      const dy = touch.clientY - this.dragStartY;
      const newX = Math.max(0, Math.min(window.innerWidth - 100, this.winStartX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, this.winStartY + dy));
      this.wm.updatePosition(this.win().id, newX, newY);
    }
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onPointerUp(): void {
    this.isDragging = false;
    this.isResizing = false;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.maxWidth.set(window.innerWidth);
    this.maxHeight.set(window.innerHeight - 48);
  }
}
