import { Injectable, signal } from '@angular/core';

export interface WallpaperItem {
  id: string;
  nameDe: string;
  nameEs: string;
  taglineDe: string;
  taglineEs: string;
  url: string;
  accentColor: string;
  badgeDe: string;
  badgeEs: string;
}

export const WALLPAPERS: WallpaperItem[] = [
  {
    id: 'dark-metal',
    nameDe: 'Dunkles Metall & Gebürsteter Titan',
    nameEs: 'Metal Oscuro y Titanio',
    taglineDe: 'Elegante, dunkle Metalloberfläche mit edlem Titanglanzeffekt und maximalem Arbeitsfokus',
    taglineEs: 'Superficie de metal oscuro cepillado con reflejos de titanio y estética sobria',
    url: '/wallpapers/dark_metal.jpg',
    accentColor: '#64748b',
    badgeDe: 'Neu • Dunkles Metall',
    badgeEs: 'Metal Oscuro • Principal',
  },
  {
    id: 'scenic-valley',
    nameDe: 'Alpental & Türkisblauer Fluss',
    nameEs: 'Valle Alpino y Río Turquesa',
    taglineDe: 'Weite Tiefenperspektive mit Alpenwiese, Wildblumen und fernen Berggipfeln',
    taglineEs: 'Profundidad óptica con praderas alpinas, flores silvestres y picos nevados',
    url: '/wallpapers/scenic_landscape.jpg',
    accentColor: '#0284c7',
    badgeDe: 'Optische Tiefe',
    badgeEs: 'Profundidad óptica',
  },
  {
    id: 'balloons-valley',
    nameDe: 'Heißluftballons über Sommerhügeln',
    nameEs: 'Globos Aerostáticos sobre Colinas',
    taglineDe: 'Farbenfrohe Ballons über weiten grünen Tälern und sonnigem Horizont',
    taglineEs: 'Coloridos globos aerostáticos flotando sobre colinas verdes y cielo despejado',
    url: '/wallpapers/balloons_valley.jpg',
    accentColor: '#f59e0b',
    badgeDe: 'Bunt & Spielerisch',
    badgeEs: 'Colorido y Alegre',
  },
  {
    id: 'colorful-sunset',
    nameDe: 'Sonnenuntergang am Bergsee',
    nameEs: 'Atardecer Dorado en el Lago',
    taglineDe: 'Warme Abendsonne mit Spiegelung auf kristallklarem Bergwasser',
    taglineEs: 'Cálidos colores al atardecer con reflejos nítidos y gran perspectiva',
    url: '/wallpapers/colorful_sunset.jpg',
    accentColor: '#f97316',
    badgeDe: 'Warm & Beruhigend',
    badgeEs: 'Cálido y Relajante',
  },
  {
    id: 'aurora-fjord',
    nameDe: 'Nordlichter über dem Fjord',
    nameEs: 'Auroras Boreales en el Fiordo',
    taglineDe: 'Magisches Smaragd- und Violettlicht mit Tiefenspiegelung im Fjordwasser',
    taglineEs: 'Mágicas luces esmeralda y violeta reflejadas en las aguas del fiordo',
    url: '/wallpapers/aurora_fjord.jpg',
    accentColor: '#10b981',
    badgeDe: 'Magisch & Leuchtend',
    badgeEs: 'Mágico y Luminoso',
  },
];

const STORAGE_KEY = 'klassendesktop_selected_wallpaper';

@Injectable({
  providedIn: 'root',
})
export class WallpaperService {
  readonly wallpapers = WALLPAPERS;
  readonly currentWallpaper = signal<WallpaperItem>(this.loadInitialWallpaper());
  readonly isPickerOpen = signal<boolean>(false);

  private loadInitialWallpaper(): WallpaperItem {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const found = WALLPAPERS.find((w) => w.id === savedId);
        if (found) return found;
      }
    } catch {
      // Ignore storage read errors in restricted contexts
    }
    // Default to scenic alpine valley with optical depth
    return WALLPAPERS[0];
  }

  setWallpaper(id: string): void {
    const target = WALLPAPERS.find((w) => w.id === id);
    if (target) {
      this.currentWallpaper.set(target);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // Ignore storage write errors
      }
    }
  }

  nextWallpaper(): void {
    const current = this.currentWallpaper();
    const idx = WALLPAPERS.findIndex((w) => w.id === current.id);
    const nextIdx = (idx + 1) % WALLPAPERS.length;
    this.setWallpaper(WALLPAPERS[nextIdx].id);
  }

  openPicker(): void {
    this.isPickerOpen.set(true);
  }

  closePicker(): void {
    this.isPickerOpen.set(false);
  }

  togglePicker(): void {
    this.isPickerOpen.update((v) => !v);
  }
}
