import { Injectable, computed, signal } from '@angular/core';

export type WindowTheme = 'light-silver' | 'light-titanium' | 'soft-white' | 'dark-metal';
export type BlurLevel = 'low' | 'medium' | 'high' | 'ultra';

const STORAGE_THEME_KEY = 'klassendesktop_window_theme';
const STORAGE_BLUR_KEY = 'klassendesktop_window_blur';
const STORAGE_OPACITY_KEY = 'klassendesktop_window_opacity';

@Injectable({
  providedIn: 'root',
})
export class AppearanceService {
  readonly windowTheme = signal<WindowTheme>('light-silver');
  readonly blurLevel = signal<BlurLevel>('ultra');
  readonly windowOpacity = signal<number>(94); // 80 - 100 percentage

  readonly isLight = computed(() => this.windowTheme() !== 'dark-metal');

  readonly themeClass = computed(() => {
    switch (this.windowTheme()) {
      case 'light-titanium':
        return 'theme-light-titanium';
      case 'soft-white':
        return 'theme-soft-white';
      case 'dark-metal':
        return 'theme-dark-metal';
      case 'light-silver':
      default:
        return 'theme-light-silver';
    }
  });

  readonly blurClass = computed(() => {
    switch (this.blurLevel()) {
      case 'low':
        return 'window-blur-low';
      case 'medium':
        return 'window-blur-medium';
      case 'high':
        return 'window-blur-high';
      case 'ultra':
      default:
        return 'window-blur-ultra';
    }
  });

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) as WindowTheme;
      if (savedTheme && ['light-silver', 'light-titanium', 'soft-white', 'dark-metal'].includes(savedTheme)) {
        this.windowTheme.set(savedTheme);
      }
      const savedBlur = localStorage.getItem(STORAGE_BLUR_KEY) as BlurLevel;
      if (savedBlur && ['low', 'medium', 'high', 'ultra'].includes(savedBlur)) {
        this.blurLevel.set(savedBlur);
      }
      const savedOpacity = localStorage.getItem(STORAGE_OPACITY_KEY);
      if (savedOpacity) {
        const num = parseInt(savedOpacity, 10);
        if (!isNaN(num) && num >= 75 && num <= 100) {
          this.windowOpacity.set(num);
        }
      }
    } catch {
      // Storage unavailable
    }
  }

  setTheme(theme: WindowTheme): void {
    this.windowTheme.set(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_THEME_KEY, theme);
      } catch {
        // Ignored
      }
    }
  }

  setBlur(level: BlurLevel): void {
    this.blurLevel.set(level);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_BLUR_KEY, level);
      } catch {
        // Ignored
      }
    }
  }

  setOpacity(opacity: number): void {
    const clamped = Math.max(75, Math.min(100, Math.round(opacity)));
    this.windowOpacity.set(clamped);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_OPACITY_KEY, clamped.toString());
      } catch {
        // Ignored
      }
    }
  }

  resetToDefaults(): void {
    this.setTheme('light-silver');
    this.setBlur('ultra');
    this.setOpacity(94);
  }
}
