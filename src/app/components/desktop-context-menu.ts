import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { WallpaperService } from '../services/wallpaper.service';

@Component({
  selector: 'app-desktop-context-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      role="menu"
      tabindex="-1"
      class="fixed z-50 w-64 bg-gradient-to-b from-[#1e232d] to-[#12151b] border border-zinc-650/90 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md py-1.5 text-xs text-zinc-200 select-none overflow-hidden animate-in fade-in zoom-in-95 duration-100 outline-none"
      [style.left.px]="x()"
      [style.top.px]="y()"
      (keydown.escape)="closeMenu.emit()"
    >
      <!-- Refresh Action -->
      <button
        type="button"
        (click)="onRefresh()"
        class="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800/80 hover:text-white transition text-left"
      >
        <mat-icon class="text-base text-zinc-400">refresh</mat-icon>
        <span>{{ t().system.refreshDesktop }}</span>
      </button>

      <div class="h-px bg-zinc-750 my-1 mx-2"></div>

      <!-- Change Wallpaper Option -->
      <button
        type="button"
        (click)="onOpenWallpaperGallery()"
        class="w-full px-3 py-2 flex items-center justify-between hover:bg-zinc-800/80 hover:text-white transition text-left group"
      >
        <div class="flex items-center gap-2.5">
          <mat-icon class="text-base text-zinc-300">wallpaper</mat-icon>
          <span class="font-medium text-zinc-200">{{ t().system.changeWallpaper }}</span>
        </div>
        <mat-icon class="text-xs text-zinc-500">arrow_right</mat-icon>
      </button>

      <!-- Quick Wallpapers List -->
      <div class="px-2 py-1 bg-zinc-950/60 rounded-lg mx-1.5 my-1 border border-zinc-750/70">
        <div class="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-1.5 py-1">
          {{ isDe() ? 'Schnellwahl:' : 'Acceso rápido:' }}
        </div>
        @for (wp of wallpaperService.wallpapers; track wp.id) {
          <button
            type="button"
            (click)="selectWallpaper(wp.id)"
            class="w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition hover:bg-zinc-800/70"
            [class.text-white]="wallpaperService.currentWallpaper().id === wp.id"
            [class.bg-zinc-800/60]="wallpaperService.currentWallpaper().id === wp.id"
            [class.font-semibold]="wallpaperService.currentWallpaper().id === wp.id"
          >
            <div class="flex items-center gap-2 truncate">
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                [style.backgroundColor]="wp.accentColor"
              ></span>
              <span class="truncate text-[11px]">{{ isDe() ? wp.nameDe : wp.nameEs }}</span>
            </div>
            @if (wallpaperService.currentWallpaper().id === wp.id) {
              <mat-icon class="text-xs text-emerald-400 !w-3 !h-3">check</mat-icon>
            }
          </button>
        }
      </div>

      <div class="h-px bg-zinc-750 my-1 mx-2"></div>

      <!-- Quick paint launcher -->
      <button
        type="button"
        (click)="onOpenPaint()"
        class="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800/80 hover:text-white transition text-left"
      >
        <mat-icon class="text-base text-rose-300">palette</mat-icon>
        <span>{{ isDe() ? 'Neue Zeichnung erstellen' : 'Crear nuevo dibujo' }}</span>
      </button>
    </div>
  `,
})
export class DesktopContextMenu {
  readonly x = input.required<number>();
  readonly y = input.required<number>();

  readonly refresh = output<void>();
  readonly openPaint = output<void>();
  readonly closeMenu = output<void>();

  readonly wallpaperService = inject(WallpaperService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;

  selectWallpaper(id: string): void {
    this.wallpaperService.setWallpaper(id);
    this.closeMenu.emit();
  }

  onOpenWallpaperGallery(): void {
    this.wallpaperService.openPicker();
    this.closeMenu.emit();
  }

  onRefresh(): void {
    this.refresh.emit();
    this.closeMenu.emit();
  }

  onOpenPaint(): void {
    this.openPaint.emit();
    this.closeMenu.emit();
  }
}
