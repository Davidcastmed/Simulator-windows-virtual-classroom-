import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppearanceService } from '../services/appearance.service';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { WallpaperService } from '../services/wallpaper.service';

type SettingsTab = 'appearance' | 'wallpaper' | 'language' | 'server';

@Component({
  selector: 'app-settings-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div id="settings-app-container" class="flex flex-col md:flex-row h-full w-full select-none overflow-hidden text-xs">
      <!-- Left Navigation Sidebar -->
      <div class="w-full md:w-56 shrink-0 border-r border-slate-300 dark:border-zinc-750 bg-slate-100/90 dark:bg-zinc-900/90 flex flex-col p-3 gap-1">
        <div class="px-3 py-2 mb-2 flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">tune</mat-icon>
          </div>
          <div>
            <h2 class="font-bold text-sm text-slate-800 dark:text-zinc-100 tracking-tight">
              {{ isDe() ? 'Einstellungen' : 'Ajustes del Sistema' }}
            </h2>
            <p class="text-[10px] text-slate-500 dark:text-zinc-400">
              {{ isDe() ? 'Desktop & Fenster anpassen' : 'Personalizar escritorio y ventanas' }}
            </p>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <button
          type="button"
          (click)="activeTab.set('appearance')"
          class="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-left font-medium transition-all"
          [class.bg-white]="activeTab() === 'appearance' && appearance.isLight()"
          [class.shadow-sm]="activeTab() === 'appearance'"
          [class.border]="activeTab() === 'appearance'"
          [class.border-slate-300]="activeTab() === 'appearance' && appearance.isLight()"
          [class.text-blue-600]="activeTab() === 'appearance' && appearance.isLight()"
          [class.bg-zinc-800]="activeTab() === 'appearance' && !appearance.isLight()"
          [class.border-zinc-650]="activeTab() === 'appearance' && !appearance.isLight()"
          [class.text-sky-300]="activeTab() === 'appearance' && !appearance.isLight()"
          [class.text-slate-600]="activeTab() !== 'appearance' && appearance.isLight()"
          [class.hover:bg-slate-200/60]="activeTab() !== 'appearance' && appearance.isLight()"
          [class.text-zinc-400]="activeTab() !== 'appearance' && !appearance.isLight()"
          [class.hover:bg-zinc-850]="activeTab() !== 'appearance' && !appearance.isLight()"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">palette</mat-icon>
          <span>{{ isDe() ? 'Fenster & Farben' : 'Ventanas y Colores' }}</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('wallpaper')"
          class="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-left font-medium transition-all"
          [class.bg-white]="activeTab() === 'wallpaper' && appearance.isLight()"
          [class.shadow-sm]="activeTab() === 'wallpaper'"
          [class.border]="activeTab() === 'wallpaper'"
          [class.border-slate-300]="activeTab() === 'wallpaper' && appearance.isLight()"
          [class.text-blue-600]="activeTab() === 'wallpaper' && appearance.isLight()"
          [class.bg-zinc-800]="activeTab() === 'wallpaper' && !appearance.isLight()"
          [class.border-zinc-650]="activeTab() === 'wallpaper' && !appearance.isLight()"
          [class.text-sky-300]="activeTab() === 'wallpaper' && !appearance.isLight()"
          [class.text-slate-600]="activeTab() !== 'wallpaper' && appearance.isLight()"
          [class.hover:bg-slate-200/60]="activeTab() !== 'wallpaper' && appearance.isLight()"
          [class.text-zinc-400]="activeTab() !== 'wallpaper' && !appearance.isLight()"
          [class.hover:bg-zinc-850]="activeTab() !== 'wallpaper' && !appearance.isLight()"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">wallpaper</mat-icon>
          <span>{{ isDe() ? 'Hintergrundbild' : 'Fondo de Pantalla' }}</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('language')"
          class="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-left font-medium transition-all"
          [class.bg-white]="activeTab() === 'language' && appearance.isLight()"
          [class.shadow-sm]="activeTab() === 'language'"
          [class.border]="activeTab() === 'language'"
          [class.border-slate-300]="activeTab() === 'language' && appearance.isLight()"
          [class.text-blue-600]="activeTab() === 'language' && appearance.isLight()"
          [class.bg-zinc-800]="activeTab() === 'language' && !appearance.isLight()"
          [class.border-zinc-650]="activeTab() === 'language' && !appearance.isLight()"
          [class.text-sky-300]="activeTab() === 'language' && !appearance.isLight()"
          [class.text-slate-600]="activeTab() !== 'language' && appearance.isLight()"
          [class.hover:bg-slate-200/60]="activeTab() !== 'language' && appearance.isLight()"
          [class.text-zinc-400]="activeTab() !== 'language' && !appearance.isLight()"
          [class.hover:bg-zinc-850]="activeTab() !== 'language' && !appearance.isLight()"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">language</mat-icon>
          <span>{{ isDe() ? 'Sprache / Idioma' : 'Idioma / Sprache' }}</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('server')"
          class="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-left font-medium transition-all"
          [class.bg-white]="activeTab() === 'server' && appearance.isLight()"
          [class.shadow-sm]="activeTab() === 'server'"
          [class.border]="activeTab() === 'server'"
          [class.border-slate-300]="activeTab() === 'server' && appearance.isLight()"
          [class.text-blue-600]="activeTab() === 'server' && appearance.isLight()"
          [class.bg-zinc-800]="activeTab() === 'server' && !appearance.isLight()"
          [class.border-zinc-650]="activeTab() === 'server' && !appearance.isLight()"
          [class.text-sky-300]="activeTab() === 'server' && !appearance.isLight()"
          [class.text-slate-600]="activeTab() !== 'server' && appearance.isLight()"
          [class.hover:bg-slate-200/60]="activeTab() !== 'server' && appearance.isLight()"
          [class.text-zinc-400]="activeTab() !== 'server' && !appearance.isLight()"
          [class.hover:bg-zinc-850]="activeTab() !== 'server' && !appearance.isLight()"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">cloud_sync</mat-icon>
          <span>{{ isDe() ? 'Server & Vercel Info' : 'Servidor y Vercel' }}</span>
        </button>

        <div class="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            (click)="appearance.resetToDefaults()"
            class="w-full py-2 px-2.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800 flex items-center justify-center gap-1.5 transition text-[11px]"
          >
            <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">restart_alt</mat-icon>
            <span>{{ isDe() ? 'Standardwerte wiederherstellen' : 'Restablecer valores' }}</span>
          </button>
        </div>
      </div>

      <!-- Right Tab Content -->
      <div class="flex-1 overflow-y-auto p-5 space-y-6">
        <!-- TAB 1: APPEARANCE & WINDOWS -->
        @if (activeTab() === 'appearance') {
          <div>
            <div class="mb-4">
              <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <mat-icon class="text-blue-500">brush</mat-icon>
                <span>{{ isDe() ? 'Fenster-Farbschema' : 'Estilo y Color de las Ventanas' }}</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {{ isDe() ? 'Wähle zwischen hellen, klaren Tönen oder dunklem Metall.' : 'Elige entre tonos claros luminosos o acabado de metal oscuro.' }}
              </p>
            </div>

            <!-- Theme Cards Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <!-- 1. Plata Claro (Default Light) -->
              <button
                type="button"
                (click)="appearance.setTheme('light-silver')"
                class="p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group flex flex-col justify-between"
                [class.border-blue-500]="appearance.windowTheme() === 'light-silver'"
                [class.ring-2]="appearance.windowTheme() === 'light-silver'"
                [class.ring-blue-500/20]="appearance.windowTheme() === 'light-silver'"
                [class.border-slate-300]="appearance.windowTheme() !== 'light-silver'"
                [class.bg-gradient-to-b]="true"
                [class.from-slate-100]="true"
                [class.to-white]="true"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-full bg-slate-300 border border-slate-400"></span>
                      {{ isDe() ? 'Helles Silber (Empfohlen)' : 'Plata Claro (Recomendado)' }}
                    </span>
                    @if (appearance.windowTheme() === 'light-silver') {
                      <mat-icon class="text-blue-600 text-base">check_circle</mat-icon>
                    }
                  </div>
                  <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {{ isDe() ? 'Moderne, helle Fenster mit edlem Silber-Finish und hohem Lesekomfort.' : 'Ventanas modernas y claras con acabado plata brillante y óptima lectura.' }}
                  </p>
                </div>
                <!-- Mini visual preview -->
                <div class="mt-3 p-1.5 rounded-lg bg-slate-200/80 border border-slate-300 flex items-center justify-between text-[10px] text-slate-700">
                  <span class="font-medium">Mein Dokument.txt</span>
                  <div class="flex gap-1">
                    <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                  </div>
                </div>
              </button>

              <!-- 2. Blanco Satinado -->
              <button
                type="button"
                (click)="appearance.setTheme('soft-white')"
                class="p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group flex flex-col justify-between"
                [class.border-blue-500]="appearance.windowTheme() === 'soft-white'"
                [class.ring-2]="appearance.windowTheme() === 'soft-white'"
                [class.ring-blue-500/20]="appearance.windowTheme() === 'soft-white'"
                [class.border-slate-300]="appearance.windowTheme() !== 'soft-white'"
                [class.bg-white]="true"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-full bg-white border border-slate-300 shadow-sm"></span>
                      {{ isDe() ? 'Reines Weiß / Kristall' : 'Blanco Satinado / Cristal' }}
                    </span>
                    @if (appearance.windowTheme() === 'soft-white') {
                      <mat-icon class="text-blue-600 text-base">check_circle</mat-icon>
                    }
                  </div>
                  <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {{ isDe() ? 'Glasklares, neutrales Design mit maximaler Leuchtkraft.' : 'Diseño luminoso y pulido con máxima claridad visual y elegancia.' }}
                  </p>
                </div>
                <!-- Mini visual preview -->
                <div class="mt-3 p-1.5 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between text-[10px] text-slate-800">
                  <span class="font-medium">Explorer - Weiß</span>
                  <div class="flex gap-1">
                    <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                    <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                  </div>
                </div>
              </button>

              <!-- 3. Titanio Claro -->
              <button
                type="button"
                (click)="appearance.setTheme('light-titanium')"
                class="p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group flex flex-col justify-between"
                [class.border-blue-500]="appearance.windowTheme() === 'light-titanium'"
                [class.ring-2]="appearance.windowTheme() === 'light-titanium'"
                [class.ring-blue-500/20]="appearance.windowTheme() === 'light-titanium'"
                [class.border-slate-300]="appearance.windowTheme() !== 'light-titanium'"
                [class.bg-gradient-to-b]="true"
                [class.from-stone-100]="true"
                [class.to-stone-50]="true"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-stone-800 text-sm flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-full bg-stone-300 border border-stone-400"></span>
                      {{ isDe() ? 'Helles Titan' : 'Titanio Claro' }}
                    </span>
                    @if (appearance.windowTheme() === 'light-titanium') {
                      <mat-icon class="text-blue-600 text-base">check_circle</mat-icon>
                    }
                  </div>
                  <p class="text-[11px] text-stone-500 mt-1 leading-relaxed">
                    {{ isDe() ? 'Warmer metallischer Farbton für ein angenehmes Arbeitsgefühl.' : 'Tono metálico cálido y suave con contraste visual balanceado.' }}
                  </p>
                </div>
                <!-- Mini visual preview -->
                <div class="mt-3 p-1.5 rounded-lg bg-stone-200/80 border border-stone-300 flex items-center justify-between text-[10px] text-stone-700">
                  <span class="font-medium">Werkzeuge - Titan</span>
                  <div class="flex gap-1">
                    <span class="w-2 h-2 rounded-full bg-stone-400"></span>
                  </div>
                </div>
              </button>

              <!-- 4. Metal Oscuro -->
              <button
                type="button"
                (click)="appearance.setTheme('dark-metal')"
                class="p-3.5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group flex flex-col justify-between"
                [class.border-blue-500]="appearance.windowTheme() === 'dark-metal'"
                [class.ring-2]="appearance.windowTheme() === 'dark-metal'"
                [class.ring-blue-500/20]="appearance.windowTheme() === 'dark-metal'"
                [class.border-zinc-700]="appearance.windowTheme() !== 'dark-metal'"
                [class.bg-gradient-to-b]="true"
                [class.from-zinc-800]="true"
                [class.to-zinc-900]="true"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-zinc-100 text-sm flex items-center gap-1.5">
                      <span class="w-3 h-3 rounded-full bg-zinc-600 border border-zinc-400"></span>
                      {{ isDe() ? 'Dunkles Metall (Klassisch)' : 'Metal Oscuro (Grafito)' }}
                    </span>
                    @if (appearance.windowTheme() === 'dark-metal') {
                      <mat-icon class="text-sky-400 text-base">check_circle</mat-icon>
                    }
                  </div>
                  <p class="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    {{ isDe() ? 'Der klassische dunkle Graphit-Look für Nachtmodus.' : 'El estilo clásico en grafito industrial cepillado para modo oscuro.' }}
                  </p>
                </div>
                <!-- Mini visual preview -->
                <div class="mt-3 p-1.5 rounded-lg bg-zinc-750 border border-zinc-650 flex items-center justify-between text-[10px] text-zinc-200">
                  <span class="font-medium">Konsole - Dunkel</span>
                  <div class="flex gap-1">
                    <span class="w-2 h-2 rounded-full bg-zinc-500"></span>
                  </div>
                </div>
              </button>
            </div>

            <!-- BLUR INTENSITY SECTION -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-850/60 border border-slate-200 dark:border-zinc-750 mb-6">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h4 class="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                    <mat-icon class="text-base text-indigo-500">blur_on</mat-icon>
                    <span>{{ isDe() ? 'Unschärfe-Stärke (Blur)' : 'Intensidad de Desenfoque (Blur)' }}</span>
                  </h4>
                  <p class="text-[11px] text-slate-500 dark:text-zinc-400">
                    {{ isDe() ? 'Verhindert Durchsichtigkeit und macht Fenster griffiger.' : 'Controla el nivel de desenfoque del fondo detrás de las ventanas.' }}
                  </p>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                  {{ appearance.blurLevel() }}
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  (click)="appearance.setBlur('low')"
                  class="py-2 px-3 rounded-xl border text-center font-medium transition-all"
                  [class.bg-blue-600]="appearance.blurLevel() === 'low'"
                  [class.text-white]="appearance.blurLevel() === 'low'"
                  [class.border-blue-600]="appearance.blurLevel() === 'low'"
                  [class.bg-white]="appearance.blurLevel() !== 'low' && appearance.isLight()"
                  [class.border-slate-300]="appearance.blurLevel() !== 'low' && appearance.isLight()"
                  [class.text-slate-700]="appearance.blurLevel() !== 'low' && appearance.isLight()"
                  [class.bg-zinc-800]="appearance.blurLevel() !== 'low' && !appearance.isLight()"
                  [class.border-zinc-700]="appearance.blurLevel() !== 'low' && !appearance.isLight()"
                  [class.text-zinc-300]="appearance.blurLevel() !== 'low' && !appearance.isLight()"
                >
                  <div class="font-bold text-xs">{{ isDe() ? 'Leicht' : 'Suave' }}</div>
                  <div class="text-[10px] opacity-75">8px blur</div>
                </button>

                <button
                  type="button"
                  (click)="appearance.setBlur('medium')"
                  class="py-2 px-3 rounded-xl border text-center font-medium transition-all"
                  [class.bg-blue-600]="appearance.blurLevel() === 'medium'"
                  [class.text-white]="appearance.blurLevel() === 'medium'"
                  [class.border-blue-600]="appearance.blurLevel() === 'medium'"
                  [class.bg-white]="appearance.blurLevel() !== 'medium' && appearance.isLight()"
                  [class.border-slate-300]="appearance.blurLevel() !== 'medium' && appearance.isLight()"
                  [class.text-slate-700]="appearance.blurLevel() !== 'medium' && appearance.isLight()"
                  [class.bg-zinc-800]="appearance.blurLevel() !== 'medium' && !appearance.isLight()"
                  [class.border-zinc-700]="appearance.blurLevel() !== 'medium' && !appearance.isLight()"
                  [class.text-zinc-300]="appearance.blurLevel() !== 'medium' && !appearance.isLight()"
                >
                  <div class="font-bold text-xs">{{ isDe() ? 'Mittel' : 'Medio' }}</div>
                  <div class="text-[10px] opacity-75">16px blur</div>
                </button>

                <button
                  type="button"
                  (click)="appearance.setBlur('high')"
                  class="py-2 px-3 rounded-xl border text-center font-medium transition-all"
                  [class.bg-blue-600]="appearance.blurLevel() === 'high'"
                  [class.text-white]="appearance.blurLevel() === 'high'"
                  [class.border-blue-600]="appearance.blurLevel() === 'high'"
                  [class.bg-white]="appearance.blurLevel() !== 'high' && appearance.isLight()"
                  [class.border-slate-300]="appearance.blurLevel() !== 'high' && appearance.isLight()"
                  [class.text-slate-700]="appearance.blurLevel() !== 'high' && appearance.isLight()"
                  [class.bg-zinc-800]="appearance.blurLevel() !== 'high' && !appearance.isLight()"
                  [class.border-zinc-700]="appearance.blurLevel() !== 'high' && !appearance.isLight()"
                  [class.text-zinc-300]="appearance.blurLevel() !== 'high' && !appearance.isLight()"
                >
                  <div class="font-bold text-xs">{{ isDe() ? 'Hoch' : 'Alto' }}</div>
                  <div class="text-[10px] opacity-75">28px blur</div>
                </button>

                <button
                  type="button"
                  (click)="appearance.setBlur('ultra')"
                  class="py-2 px-3 rounded-xl border text-center font-medium transition-all shadow-sm"
                  [class.bg-blue-600]="appearance.blurLevel() === 'ultra'"
                  [class.text-white]="appearance.blurLevel() === 'ultra'"
                  [class.border-blue-600]="appearance.blurLevel() === 'ultra'"
                  [class.bg-white]="appearance.blurLevel() !== 'ultra' && appearance.isLight()"
                  [class.border-slate-300]="appearance.blurLevel() !== 'ultra' && appearance.isLight()"
                  [class.text-slate-700]="appearance.blurLevel() !== 'ultra' && appearance.isLight()"
                  [class.bg-zinc-800]="appearance.blurLevel() !== 'ultra' && !appearance.isLight()"
                  [class.border-zinc-700]="appearance.blurLevel() !== 'ultra' && !appearance.isLight()"
                  [class.text-zinc-300]="appearance.blurLevel() !== 'ultra' && !appearance.isLight()"
                >
                  <div class="font-bold text-xs">{{ isDe() ? 'Ultra Tief' : 'Ultra Profundo' }}</div>
                  <div class="text-[10px] opacity-75">48px blur (Top)</div>
                </button>
              </div>
            </div>

            <!-- OPACITY / TRANSPARENCY SECTION -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-850/60 border border-slate-200 dark:border-zinc-750">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h4 class="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                    <mat-icon class="text-base text-amber-500">opacity</mat-icon>
                    <span>{{ isDe() ? 'Fenster-Deckkraft (Opazität)' : 'Opacidad de Ventanas (No transparente)' }}</span>
                  </h4>
                  <p class="text-[11px] text-slate-500 dark:text-zinc-400">
                    {{ isDe() ? 'Höhere Deckkraft garantiert maximale Textlesbarkeit.' : 'Evita que la ventana sea demasiado transparente.' }}
                  </p>
                </div>
                <div class="flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-sky-400">
                  <span>{{ appearance.windowOpacity() }}%</span>
                </div>
              </div>

              <!-- Quick Presets -->
              <div class="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  (click)="appearance.setOpacity(100)"
                  class="py-2 px-2.5 rounded-xl border text-center transition"
                  [class.bg-blue-600]="appearance.windowOpacity() === 100"
                  [class.text-white]="appearance.windowOpacity() === 100"
                  [class.border-blue-600]="appearance.windowOpacity() === 100"
                  [class.bg-white]="appearance.windowOpacity() !== 100 && appearance.isLight()"
                  [class.border-slate-300]="appearance.windowOpacity() !== 100 && appearance.isLight()"
                  [class.text-slate-700]="appearance.windowOpacity() !== 100 && appearance.isLight()"
                  [class.bg-zinc-800]="appearance.windowOpacity() !== 100 && !appearance.isLight()"
                  [class.border-zinc-700]="appearance.windowOpacity() !== 100 && !appearance.isLight()"
                >
                  <span class="font-bold block text-xs">{{ isDe() ? '100% Solide' : '100% Sólido' }}</span>
                  <span class="text-[10px] opacity-75">{{ isDe() ? 'Keine Transparenz' : 'Cero transparencia' }}</span>
                </button>

                <button
                  type="button"
                  (click)="appearance.setOpacity(94)"
                  class="py-2 px-2.5 rounded-xl border text-center transition shadow-sm"
                  [class.bg-blue-600]="appearance.windowOpacity() === 94"
                  [class.text-white]="appearance.windowOpacity() === 94"
                  [class.border-blue-600]="appearance.windowOpacity() === 94"
                  [class.bg-white]="appearance.windowOpacity() !== 94 && appearance.isLight()"
                  [class.border-slate-300]="appearance.windowOpacity() !== 94 && appearance.isLight()"
                  [class.text-slate-700]="appearance.windowOpacity() !== 94 && appearance.isLight()"
                  [class.bg-zinc-800]="appearance.windowOpacity() !== 94 && !appearance.isLight()"
                  [class.border-zinc-700]="appearance.windowOpacity() !== 94 && !appearance.isLight()"
                >
                  <span class="font-bold block text-xs">{{ isDe() ? '94% Satiniert' : '94% Satinado' }}</span>
                  <span class="text-[10px] opacity-75">{{ isDe() ? 'Perfekte Balance' : 'Recomendado' }}</span>
                </button>

                <button
                  type="button"
                  (click)="appearance.setOpacity(85)"
                  class="py-2 px-2.5 rounded-xl border text-center transition"
                  [class.bg-blue-600]="appearance.windowOpacity() === 85"
                  [class.text-white]="appearance.windowOpacity() === 85"
                  [class.border-blue-600]="appearance.windowOpacity() === 85"
                  [class.bg-white]="appearance.windowOpacity() !== 85 && appearance.isLight()"
                  [class.border-slate-300]="appearance.windowOpacity() !== 85 && appearance.isLight()"
                  [class.text-slate-700]="appearance.windowOpacity() !== 85 && appearance.isLight()"
                  [class.bg-zinc-800]="appearance.windowOpacity() !== 85 && !appearance.isLight()"
                  [class.border-zinc-700]="appearance.windowOpacity() !== 85 && !appearance.isLight()"
                >
                  <span class="font-bold block text-xs">{{ isDe() ? '85% Milchglas' : '85% Translúcido' }}</span>
                  <span class="text-[10px] opacity-75">{{ isDe() ? 'Glasoptik' : 'Con blur profundo' }}</span>
                </button>
              </div>

              <!-- Slider for precision -->
              <div class="flex items-center gap-3">
                <span class="text-[11px] text-slate-500 font-medium">75%</span>
                <input
                  type="range"
                  min="75"
                  max="100"
                  step="1"
                  [value]="appearance.windowOpacity()"
                  (input)="onOpacitySlider($event)"
                  class="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-300 dark:bg-zinc-700 rounded-lg appearance-none"
                />
                <span class="text-[11px] text-slate-500 font-medium">100%</span>
              </div>
            </div>
          </div>
        }

        <!-- TAB 2: WALLPAPER -->
        @if (activeTab() === 'wallpaper') {
          <div>
            <div class="mb-4">
              <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <mat-icon class="text-emerald-500">wallpaper</mat-icon>
                <span>{{ isDe() ? 'Hintergrundbilder' : 'Fondos de Pantalla' }}</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {{ isDe() ? 'Wähle ein Motiv für deinen Desktop.' : 'Elige una imagen para el fondo de tu escritorio escolar.' }}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              @for (wp of wallpaperService.wallpapers; track wp.id) {
                <button
                  type="button"
                  (click)="wallpaperService.setWallpaper(wp.id)"
                  class="rounded-2xl border-2 overflow-hidden text-left transition-all p-0 flex flex-col group relative"
                  [class.border-blue-500]="wallpaperService.currentWallpaper().id === wp.id"
                  [class.ring-2]="wallpaperService.currentWallpaper().id === wp.id"
                  [class.ring-blue-500/20]="wallpaperService.currentWallpaper().id === wp.id"
                  [class.border-slate-300]="wallpaperService.currentWallpaper().id !== wp.id && appearance.isLight()"
                  [class.border-zinc-700]="wallpaperService.currentWallpaper().id !== wp.id && !appearance.isLight()"
                >
                  <div class="h-28 w-full relative overflow-hidden bg-black">
                    <img
                      [src]="wp.url"
                      [alt]="isDe() ? wp.nameDe : wp.nameEs"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerpolicy="no-referrer"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    @if (wallpaperService.currentWallpaper().id === wp.id) {
                      <div class="absolute top-2 right-2 px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow">
                        <mat-icon class="text-xs !w-3 !h-3">check</mat-icon>
                        <span>{{ isDe() ? 'Aktiv' : 'Activo' }}</span>
                      </div>
                    }
                    <div class="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 bg-black/60 rounded backdrop-blur-sm text-white font-medium">
                      {{ isDe() ? wp.badgeDe : wp.badgeEs }}
                    </div>
                  </div>
                  <div class="p-3 bg-white dark:bg-zinc-800 flex-1">
                    <h4 class="font-bold text-slate-800 dark:text-zinc-100 text-xs">
                      {{ isDe() ? wp.nameDe : wp.nameEs }}
                    </h4>
                    <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                      {{ isDe() ? wp.taglineDe : wp.taglineEs }}
                    </p>
                  </div>
                </button>
              }
            </div>
          </div>
        }

        <!-- TAB 3: LANGUAGE -->
        @if (activeTab() === 'language') {
          <div>
            <div class="mb-4">
              <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <mat-icon class="text-blue-500">language</mat-icon>
                <span>{{ isDe() ? 'Systemsprache' : 'Idioma del Sistema' }}</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {{ isDe() ? 'Wähle die Sprache der gesamten Desktop-Umgebung.' : 'Selecciona el idioma para todas las aplicaciones y menús.' }}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                (click)="i18n.setLanguage('es')"
                class="p-4 rounded-2xl border-2 text-left transition flex items-start gap-3"
                [class.border-blue-500]="i18n.currentLang() === 'es'"
                [class.ring-2]="i18n.currentLang() === 'es'"
                [class.ring-blue-500/20]="i18n.currentLang() === 'es'"
                [class.bg-white]="i18n.currentLang() === 'es' && appearance.isLight()"
                [class.border-slate-300]="i18n.currentLang() !== 'es'"
              >
                <div class="text-2xl">🇪🇸</div>
                <div>
                  <div class="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Español</span>
                    @if (i18n.currentLang() === 'es') {
                      <mat-icon class="text-blue-600 text-base">check_circle</mat-icon>
                    }
                  </div>
                  <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Entorno de clase en español para profesores y estudiantes.
                  </p>
                </div>
              </button>

              <button
                type="button"
                (click)="i18n.setLanguage('de')"
                class="p-4 rounded-2xl border-2 text-left transition flex items-start gap-3"
                [class.border-blue-500]="i18n.currentLang() === 'de'"
                [class.ring-2]="i18n.currentLang() === 'de'"
                [class.ring-blue-500/20]="i18n.currentLang() === 'de'"
                [class.bg-white]="i18n.currentLang() === 'de' && appearance.isLight()"
                [class.border-slate-300]="i18n.currentLang() !== 'de'"
              >
                <div class="text-2xl">🇩🇪</div>
                <div>
                  <div class="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Deutsch</span>
                    @if (i18n.currentLang() === 'de') {
                      <mat-icon class="text-blue-600 text-base">check_circle</mat-icon>
                    }
                  </div>
                  <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Klassen-Desktop auf Deutsch für Unterricht und Gruppenarbeit.
                  </p>
                </div>
              </button>
            </div>
          </div>
        }

        <!-- TAB 4: SERVER & VERCEL INFO -->
        @if (activeTab() === 'server') {
          <div class="space-y-4">
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <mat-icon class="text-purple-500">dns</mat-icon>
                <span>{{ isDe() ? 'Server & Vercel Diagnose' : 'Diagnóstico de Servidor y Despliegue en Vercel' }}</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {{ isDe() ? 'Wichtige Informationen zum Hosten und Verbindungsfehlern.' : 'Información técnica y solución al error de conexión al subir la app a Vercel.' }}
              </p>
            </div>

            <!-- Clarification Card about Vercel Error -->
            <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200">
              <div class="flex items-start gap-2.5">
                <mat-icon class="text-amber-600 dark:text-amber-400 text-lg mt-0.5 shrink-0">info</mat-icon>
                <div class="space-y-1.5">
                  <h4 class="font-bold text-sm">
                    {{ isDe() ? 'Warum meldet Vercel einen Verbindungsfehler?' : '¿Por qué Vercel manda un error de conexión al loguearse?' }}
                  </h4>
                  <p class="text-xs leading-relaxed opacity-90">
                    {{ isDe()
                      ? 'Vercel ist eine Serverless-Plattform mit schreibgeschütztem Dateisystem und ohne dauerhaft laufenden Node-Express-Server. Die Klassenräume und SSE-Streams erfordern Schreibzugriff oder einen persistenten Container.'
                      : 'Vercel funciona mediante arquitectura Serverless estática con sistema de archivos de solo lectura (read-only). Esta aplicación utiliza un servidor Express en server.ts que escribe datos en disco y mantiene conexiones en tiempo real (SSE / Server-Sent Events). En Vercel estándar, la ruta /api/classroom no tiene un servidor persistente escuchando ni permisos de escritura en disco.'
                    }}
                  </p>
                  <p class="text-xs leading-relaxed font-semibold">
                    {{ isDe()
                      ? 'Lösung: Nutze den integrierten lokalen Offline-Modus oder hoste die App auf Plattformen mit persistenten Containern (Cloud Run, Render, Railway).'
                      : 'Solución automática: Hemos integrado un modo local automático. Si el servidor de Vercel no responde, la app te permite entrar instantáneamente en modo local sin bloquearte con ningún error.'
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Connection Status -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-850/60 border border-slate-200 dark:border-zinc-750 flex items-center justify-between">
              <div>
                <div class="font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                  <span
                    class="w-2.5 h-2.5 rounded-full"
                    [class.bg-emerald-500]="classroomService.connectionStatus() === 'connected'"
                    [class.bg-amber-500]="classroomService.connectionStatus() === 'connecting'"
                    [class.bg-rose-500]="classroomService.connectionStatus() === 'disconnected'"
                  ></span>
                  <span>
                    {{ isDe() ? 'Verbindungsstatus:' : 'Estado de conexión actual:' }}
                  </span>
                  <span class="font-semibold text-blue-600 dark:text-sky-400">
                    {{ classroomService.connectionStatus() }}
                  </span>
                </div>
                <div class="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  {{ isDe() ? 'Klassen-Code:' : 'Código de aula:' }}
                  <span class="font-mono font-bold">{{ classroomService.currentUser()?.roomCode || 'Ninguno' }}</span>
                </div>
              </div>

              <button
                type="button"
                (click)="testServerConnection()"
                class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                [disabled]="testingConnection()"
              >
                @if (testingConnection()) {
                  <mat-icon class="animate-spin text-sm">refresh</mat-icon>
                  <span>{{ isDe() ? 'Prüfe...' : 'Probando...' }}</span>
                } @else {
                  <mat-icon class="text-sm">sync</mat-icon>
                  <span>{{ isDe() ? 'Verbindung prüfen' : 'Probar servidor' }}</span>
                }
              </button>
            </div>

            @if (connectionTestResult()) {
              <div class="p-3 rounded-xl border text-xs font-mono"
                   [class.bg-emerald-50]="connectionTestSuccess()"
                   [class.border-emerald-300]="connectionTestSuccess()"
                   [class.text-emerald-800]="connectionTestSuccess()"
                   [class.bg-rose-50]="!connectionTestSuccess()"
                   [class.border-rose-300]="!connectionTestSuccess()"
                   [class.text-rose-800]="!connectionTestSuccess()"
              >
                {{ connectionTestResult() }}
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class SettingsApp {
  readonly appearance = inject(AppearanceService);
  readonly wallpaperService = inject(WallpaperService);
  readonly classroomService = inject(ClassroomService);
  readonly i18n = inject(I18nService);

  readonly activeTab = signal<SettingsTab>('appearance');
  readonly isDe = computed(() => this.i18n.isDe());

  readonly testingConnection = signal(false);
  readonly connectionTestResult = signal<string | null>(null);
  readonly connectionTestSuccess = signal(false);

  onOpacitySlider(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      this.appearance.setOpacity(num);
    }
  }

  async testServerConnection(): Promise<void> {
    this.testingConnection.set(true);
    this.connectionTestResult.set(null);
    try {
      const res = await fetch('/api/classroom/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'PingTest', teacherName: 'System' }),
      });
      if (res.ok) {
        this.connectionTestSuccess.set(true);
        this.connectionTestResult.set(
          this.isDe()
            ? 'Erfolg! Express-Backend ist online und voll funktionsfähig.'
            : '¡Éxito! El backend Express está respondiendo correctamente a peticiones JSON.'
        );
      } else {
        this.connectionTestSuccess.set(false);
        this.connectionTestResult.set(
          this.isDe()
            ? `Fehler ${res.status}: Server antwortet nicht wie erwartet (z.B. Vercel Serverless / statisch).`
            : `Error HTTP ${res.status}: El servidor no tiene el backend Express activo (típico de despliegues estáticos en Vercel). El modo local de la app entra en funcionamiento.`
        );
      }
    } catch {
      this.connectionTestSuccess.set(false);
      this.connectionTestResult.set(
        this.isDe()
          ? 'Verbindungsfehler: Backend ist nicht erreichbar. App läuft im lokalen Browser-Modus.'
          : 'Fallo de red: No se pudo contactar con /api/classroom. La app utiliza el almacenamiento local de tu navegador.'
      );
    } finally {
      this.testingConnection.set(false);
    }
  }
}
