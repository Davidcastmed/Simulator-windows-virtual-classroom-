import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../services/i18n.service';
import { WallpaperService } from '../services/wallpaper.service';

@Component({
  selector: 'app-wallpaper-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallpaper-dialog-title"
    >
      <!-- Backdrop dismiss button -->
      <button
        type="button"
        class="absolute inset-0 w-full h-full bg-transparent border-0 cursor-default"
        aria-label="Modal schließen"
        (click)="close()"
      ></button>

      <div
        class="relative z-10 w-full max-w-2xl bg-gradient-to-b from-[#1c222c] to-[#101319] border border-zinc-650/90 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Header (Dark metal) -->
        <div class="px-5 py-4 bg-gradient-to-r from-zinc-800 via-zinc-750 to-zinc-800 border-b border-zinc-700 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-zinc-700/80 text-zinc-200 flex items-center justify-center border border-zinc-600">
              <mat-icon class="text-xl">wallpaper</mat-icon>
            </div>
            <div>
              <h2 id="wallpaper-dialog-title" class="text-sm font-bold text-zinc-100 tracking-wide">
                {{ t().system.chooseWallpaper }}
              </h2>
              <p class="text-xs text-zinc-400">
                {{ t().system.opticalDepthDesc }}
              </p>
            </div>
          </div>

          <button
            type="button"
            (click)="close()"
            class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/80 transition"
            title="Schließen"
          >
            <mat-icon class="text-xl">close</mat-icon>
          </button>
        </div>

        <!-- Wallpapers Grid -->
        <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          @for (wp of wallpaperService.wallpapers; track wp.id) {
            <button
              type="button"
              (click)="selectWallpaper(wp.id)"
              class="group relative rounded-xl overflow-hidden border-2 text-left transition-all p-0 flex flex-col focus:outline-none"
              [class.border-zinc-300]="wallpaperService.currentWallpaper().id === wp.id"
              [class.ring-2]="wallpaperService.currentWallpaper().id === wp.id"
              [class.ring-zinc-400/40]="wallpaperService.currentWallpaper().id === wp.id"
              [class.border-zinc-700]="wallpaperService.currentWallpaper().id !== wp.id"
              [class.hover:border-zinc-500]="wallpaperService.currentWallpaper().id !== wp.id"
            >
              <!-- Thumbnail Aspect ratio container -->
              <div class="relative w-full h-36 overflow-hidden bg-black">
                <img
                  [src]="wp.url"
                  [alt]="isDe() ? wp.nameDe : wp.nameEs"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerpolicy="no-referrer"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>

                <!-- Active checkmark badge -->
                @if (wallpaperService.currentWallpaper().id === wp.id) {
                  <div class="absolute top-2.5 right-2.5 px-2.5 py-1 bg-zinc-800/90 border border-zinc-500 text-white rounded-md text-[11px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-md">
                    <mat-icon class="text-sm !w-4 !h-4 text-emerald-400">check</mat-icon>
                    <span>{{ isDe() ? 'Aktiv' : 'Activo' }}</span>
                  </div>
                }

                <!-- Category/Characteristic Pill -->
                <div class="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium bg-black/75 text-zinc-200 backdrop-blur-sm border border-white/10">
                  {{ isDe() ? wp.badgeDe : wp.badgeEs }}
                </div>
              </div>

              <!-- Details Footer -->
              <div class="p-3 bg-zinc-850 w-full flex-1 flex flex-col justify-between border-t border-zinc-750">
                <div>
                  <h3 class="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors">
                    {{ isDe() ? wp.nameDe : wp.nameEs }}
                  </h3>
                  <p class="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                    {{ isDe() ? wp.taglineDe : wp.taglineEs }}
                  </p>
                </div>
              </div>
            </button>
          }
        </div>

        <!-- Footer actions -->
        <div class="px-5 py-3 bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border-t border-zinc-750 flex items-center justify-between text-xs text-zinc-400">
          <div class="flex items-center gap-1.5">
            <mat-icon class="text-amber-400 text-base">auto_awesome</mat-icon>
            <span>{{ isDe() ? 'Wird automatisch im Browser gespeichert' : 'Se guarda automáticamente en tu navegador' }}</span>
          </div>
          <button
            type="button"
            (click)="close()"
            class="px-4 py-2 bg-gradient-to-b from-zinc-700 to-zinc-850 hover:from-zinc-650 hover:to-zinc-800 text-white font-medium rounded-lg transition border border-zinc-500 shadow-md"
          >
            {{ isDe() ? 'Fertig' : 'Listo' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class WallpaperDialog {
  readonly wallpaperService = inject(WallpaperService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;

  selectWallpaper(id: string): void {
    this.wallpaperService.setWallpaper(id);
  }

  close(): void {
    this.wallpaperService.closePicker();
  }
}
