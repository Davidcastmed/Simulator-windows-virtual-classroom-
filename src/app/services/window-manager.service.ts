import { Injectable, inject, signal } from '@angular/core';
import type { WindowState } from '../models/classroom.types';
import { I18nService } from './i18n.service';

@Injectable({
  providedIn: 'root',
})
export class WindowManagerService {
  private readonly i18n = inject(I18nService);

  readonly windows = signal<WindowState[]>([]);
  readonly activeWindowId = signal<string | null>(null);
  readonly isMobile = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  private nextZIndex = 10;
  private openCount = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        const mobile = window.innerWidth < 768;
        if (this.isMobile() !== mobile) {
          this.isMobile.set(mobile);
        }
      });
    }
  }

  openWindow(
    appType:
      | 'explorer'
      | 'paint'
      | 'activities'
      | 'help'
      | 'teacher'
      | 'presentation'
      | 'viewer'
      | 'coding'
      | 'logic-games'
      | 'groups-wall'
      | 'chat'
      | 'whiteboard'
      | 'peers'
      | 'settings'
      | 'screen-monitor',
    title?: string,
    params?: Record<string, unknown>,
  ): WindowState {
    const existing = this.windows().find((w) => w.appType === appType && !params?.['forceNew']);
    if (existing) {
      if (existing.isMinimized) {
        this.minimizeWindow(existing.id); // toggle back
      }
      if (params) {
        existing.params = { ...existing.params, ...params };
      }
      this.bringToFront(existing.id);
      return existing;
    }

    this.openCount++;
    const id = `win_${appType}_${Date.now()}`;
    const offset = (this.openCount % 6) * 28;

    let defaultWidth = 840;
    let defaultHeight = 560;
    const t = this.i18n.t();
    const isDe = this.i18n.isDe();
    let defaultTitle = title || (isDe ? 'Anwendung' : 'Aplicación');
    let icon = 'folder';

    switch (appType) {
      case 'explorer':
        defaultTitle = title || t.startMenu.fileExplorer;
        icon = 'folder_open';
        defaultWidth = 860;
        defaultHeight = 580;
        break;
      case 'paint':
        defaultTitle = title || t.startMenu.paintApp;
        icon = 'palette';
        defaultWidth = 920;
        defaultHeight = 640;
        break;
      case 'coding':
        defaultTitle = title || t.coding.title;
        icon = 'terminal';
        defaultWidth = 960;
        defaultHeight = 620;
        break;
      case 'logic-games':
        defaultTitle = title || t.logicGames.title;
        icon = 'videogame_asset';
        defaultWidth = 820;
        defaultHeight = 600;
        break;
      case 'groups-wall':
        defaultTitle = title || t.groupsWall.title;
        icon = 'diversity_3';
        defaultWidth = 940;
        defaultHeight = 620;
        break;
      case 'activities':
        defaultTitle = title || t.startMenu.activities;
        icon = 'assignment';
        defaultWidth = 540;
        defaultHeight = 620;
        break;
      case 'teacher':
        defaultTitle = title || t.startMenu.teacherDashboard;
        icon = 'school';
        defaultWidth = 960;
        defaultHeight = 620;
        break;
      case 'help':
        defaultTitle = title || t.startMenu.help;
        icon = 'help_outline';
        defaultWidth = 600;
        defaultHeight = 540;
        break;
      case 'viewer':
        defaultTitle = title || (isDe ? 'Dateibetrachter' : 'Visor de Archivos');
        icon = 'visibility';
        defaultWidth = 720;
        defaultHeight = 540;
        break;
      case 'presentation':
        defaultTitle = title || (isDe ? 'Bildschirm-Präsentation' : 'Demostración en Pantalla');
        icon = 'co_present';
        defaultWidth = 900;
        defaultHeight = 600;
        break;
      case 'chat':
        defaultTitle = title || t.classroomChat.title;
        icon = 'forum';
        defaultWidth = 460;
        defaultHeight = 620;
        break;
      case 'whiteboard':
        defaultTitle = title || t.whiteboard.title;
        icon = 'gesture';
        defaultWidth = 940;
        defaultHeight = 640;
        break;
      case 'peers':
        defaultTitle = title || t.peersWidget.title;
        icon = 'groups';
        defaultWidth = 440;
        defaultHeight = 600;
        break;
      case 'settings':
        defaultTitle = title || (isDe ? 'Einstellungen' : 'Ajustes del Sistema');
        icon = 'tune';
        defaultWidth = 780;
        defaultHeight = 560;
        break;
      case 'screen-monitor':
        defaultTitle = title || (isDe ? 'Schüler-Bildschirme (Live-Monitor)' : 'Pantallas de Estudiantes (Monitor en Vivo)');
        icon = 'desktop_windows';
        defaultWidth = 1040;
        defaultHeight = 680;
        break;
    }

    const isMobileDevice = this.isMobile();
    const winWidth = isMobileDevice && typeof window !== 'undefined' ? window.innerWidth : defaultWidth;
    const winHeight = isMobileDevice && typeof window !== 'undefined' ? Math.max(300, window.innerHeight - 48) : defaultHeight;

    const newWindow: WindowState = {
      id,
      title: defaultTitle,
      appType,
      icon,
      isOpen: true,
      isMinimized: false,
      isMaximized: isMobileDevice,
      x: isMobileDevice ? 0 : Math.max(20, Math.min(window.innerWidth - defaultWidth - 40, 60 + offset)),
      y: isMobileDevice ? 0 : Math.max(20, Math.min(window.innerHeight - defaultHeight - 70, 50 + offset)),
      width: winWidth,
      height: winHeight,
      zIndex: ++this.nextZIndex,
      params,
    };

    this.windows.update((wins) => [...wins, newWindow]);
    this.activeWindowId.set(id);
    return newWindow;
  }

  closeWindow(id: string): void {
    this.windows.update((wins) => wins.filter((w) => w.id !== id));
    if (this.activeWindowId() === id) {
      const remaining = this.windows().filter((w) => !w.isMinimized);
      if (remaining.length > 0) {
        const top = remaining.reduce((prev, curr) => (curr.zIndex > prev.zIndex ? curr : prev));
        this.activeWindowId.set(top.id);
      } else {
        this.activeWindowId.set(null);
      }
    }
  }

  minimizeWindow(id: string): void {
    this.windows.update((wins) =>
      wins.map((w) => {
        if (w.id === id) {
          return { ...w, isMinimized: !w.isMinimized };
        }
        return w;
      }),
    );

    const win = this.windows().find((w) => w.id === id);
    if (win && !win.isMinimized) {
      this.bringToFront(id);
    } else if (this.activeWindowId() === id) {
      const remaining = this.windows().filter((w) => !w.isMinimized && w.id !== id);
      if (remaining.length > 0) {
        const top = remaining.reduce((prev, curr) => (curr.zIndex > prev.zIndex ? curr : prev));
        this.activeWindowId.set(top.id);
      } else {
        this.activeWindowId.set(null);
      }
    }
  }

  maximizeWindow(id: string): void {
    this.windows.update((wins) =>
      wins.map((w) => {
        if (w.id === id) {
          return { ...w, isMaximized: !w.isMaximized };
        }
        return w;
      }),
    );
    this.bringToFront(id);
  }

  bringToFront(id: string): void {
    this.nextZIndex++;
    this.windows.update((wins) =>
      wins.map((w) => {
        if (w.id === id) {
          return { ...w, isMinimized: false, zIndex: this.nextZIndex };
        }
        return w;
      }),
    );
    this.activeWindowId.set(id);
  }

  updatePosition(id: string, x: number, y: number): void {
    this.windows.update((wins) =>
      wins.map((w) => {
        if (w.id === id) {
          return { ...w, x, y };
        }
        return w;
      }),
    );
  }

  updateSize(id: string, width: number, height: number): void {
    this.windows.update((wins) =>
      wins.map((w) => {
        if (w.id === id) {
          return { ...w, width, height };
        }
        return w;
      }),
    );
  }

  isWindowOpen(appType: string): boolean {
    return this.windows().some((w) => w.appType === appType && !w.isMinimized);
  }

  closeAll(): void {
    this.windows.set([]);
    this.activeWindowId.set(null);
  }
}
