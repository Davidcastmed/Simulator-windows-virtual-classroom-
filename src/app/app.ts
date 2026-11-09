import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivitiesWidget } from './components/activities-widget';
import { ClassDemoOverlay } from './components/class-demo-overlay';
import { FileExplorer } from './components/file-explorer';
import { CodingApp } from './components/coding-app';
import { DesktopContextMenu } from './components/desktop-context-menu';
import { GroupsWall } from './components/groups-wall';
import { HelpDialog } from './components/help-dialog';
import { LoginModal } from './components/login-modal';
import { LogicGames } from './components/logic-games';
import { PaintApp } from './components/paint-app';
import { StartMenu } from './components/start-menu';
import { Taskbar } from './components/taskbar';
import { TeacherDashboard } from './components/teacher-dashboard';
import { WallpaperDialog } from './components/wallpaper-dialog';
import { WindowFrame } from './components/window-frame';
import { ClassroomChatComponent } from './components/classroom-chat';
import { WhiteboardAppComponent } from './components/whiteboard-app';
import { PeersWidgetComponent } from './components/peers-widget';
import { SettingsApp } from './components/settings-app';
import { StudentScreenViewer } from './components/student-screen-viewer';
import { AppearanceService } from './services/appearance.service';
import { ClassroomService } from './services/classroom.service';
import { I18nService } from './services/i18n.service';
import { WallpaperService } from './services/wallpaper.service';
import { WindowManagerService } from './services/window-manager.service';
import type { VirtualItem } from './models/classroom.types';

interface DesktopIcon {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  appType:
    | 'explorer'
    | 'paint'
    | 'activities'
    | 'teacher'
    | 'help'
    | 'coding'
    | 'logic-games'
    | 'groups-wall'
    | 'chat'
    | 'whiteboard'
    | 'peers'
    | 'settings'
    | 'screen-monitor';
  params?: Record<string, unknown>;
  teacherOnly?: boolean;
  studentOnly?: boolean;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    WindowFrame,
    FileExplorer,
    PaintApp,
    ActivitiesWidget,
    TeacherDashboard,
    HelpDialog,
    ClassDemoOverlay,
    Taskbar,
    StartMenu,
    LoginModal,
    CodingApp,
    LogicGames,
    GroupsWall,
    WallpaperDialog,
    DesktopContextMenu,
    ClassroomChatComponent,
    WhiteboardAppComponent,
    PeersWidgetComponent,
    SettingsApp,
    StudentScreenViewer,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly classroom = inject(ClassroomService);
  readonly wm = inject(WindowManagerService);
  readonly i18n = inject(I18nService);
  readonly wallpaperService = inject(WallpaperService);
  readonly appearance = inject(AppearanceService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;

  readonly isStartMenuOpen = signal<boolean>(false);
  readonly selectedIconId = signal<string | null>(null);
  readonly contextMenuPos = signal<{ x: number; y: number } | null>(null);
  readonly isRefreshing = signal<boolean>(false);

  readonly desktopIcons = computed<DesktopIcon[]>(() => {
    const user = this.classroom.currentUser();
    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';

    const icons: DesktopIcon[] = [
      {
        id: 'icon-pc',
        name: this.t().system.thisPC,
        icon: 'computer',
        iconColor: 'text-sky-300',
        appType: 'explorer',
        params: { initialPath: '/' },
      },
      {
        id: 'icon-coding',
        name: this.t().coding.title,
        icon: 'terminal',
        iconColor: 'text-indigo-300',
        appType: 'coding',
      },
      {
        id: 'icon-logic-games',
        name: this.t().logicGames.title,
        icon: 'videogame_asset',
        iconColor: 'text-cyan-300',
        appType: 'logic-games',
      },
      {
        id: 'icon-zeek',
        name: 'Zeek the Geek',
        icon: 'pest_control',
        iconColor: 'text-amber-300',
        appType: 'logic-games',
        params: { initialGame: 'zeek' },
      },
      {
        id: 'icon-groups-wall',
        name: this.t().groupsWall.title,
        icon: 'diversity_3',
        iconColor: 'text-violet-300',
        appType: 'groups-wall',
      },
      {
        id: 'icon-paint',
        name: this.t().startMenu.paintApp,
        icon: 'palette',
        iconColor: 'text-rose-300',
        appType: 'paint',
      },
      {
        id: 'icon-peers',
        name: this.t().peersWidget.dockTitle,
        icon: 'groups',
        iconColor: 'text-emerald-300',
        appType: 'peers',
      },
      {
        id: 'icon-chat',
        name: this.t().classroomChat.title,
        icon: 'forum',
        iconColor: 'text-teal-300',
        appType: 'chat',
      },
      {
        id: 'icon-whiteboard',
        name: this.t().whiteboard.title,
        icon: 'gesture',
        iconColor: 'text-amber-300',
        appType: 'whiteboard',
      },
    ];

    if (isStudent && user) {
      icons.push(
        {
          id: 'icon-my-folder',
          name: this.t().system.myFolder,
          icon: 'folder_shared',
          iconColor: 'text-amber-300',
          appType: 'explorer',
          params: { initialPath: `/Klasse/${user.name}` },
          studentOnly: true,
        },
        {
          id: 'icon-activities',
          name: this.t().startMenu.activities,
          icon: 'assignment',
          iconColor: 'text-emerald-300',
          appType: 'activities',
          studentOnly: true,
        },
      );
    }

    if (isTeacher) {
      icons.push(
        {
          id: 'icon-teacher',
          name: this.t().startMenu.teacherDashboard,
          icon: 'school',
          iconColor: 'text-purple-300',
          appType: 'teacher',
          teacherOnly: true,
        },
        {
          id: 'icon-screen-monitor',
          name: this.isDe() ? 'Schüler-Bildschirme' : 'Pantallas Alumnos',
          icon: 'desktop_windows',
          iconColor: 'text-sky-300',
          appType: 'screen-monitor',
          teacherOnly: true,
        },
      );
    }

    icons.push(
      {
        id: 'icon-teacher-mat',
        name: this.t().system.teacherMaterial,
        icon: 'folder_special',
        iconColor: 'text-indigo-400',
        appType: 'explorer',
        params: { initialPath: '/Lehrermaterial' },
      },
      {
        id: 'icon-trash',
        name: this.t().system.recycleBin,
        icon: 'delete',
        iconColor: 'text-red-400',
        appType: 'explorer',
        params: {
          initialPath: user?.role === 'student' ? `/Papierkorb/${user.name}` : '/Papierkorb',
        },
      },
      {
        id: 'icon-help',
        name: this.t().startMenu.help,
        icon: 'help_outline',
        iconColor: 'text-sky-400',
        appType: 'help',
      },
      {
        id: 'icon-settings',
        name: this.isDe() ? 'Einstellungen' : 'Ajustes',
        icon: 'tune',
        iconColor: 'text-blue-400',
        appType: 'settings',
      },
    );

    return icons;
  });

  onIconClick(e: MouseEvent, icon: DesktopIcon): void {
    e.stopPropagation();
    if (this.wm.isMobile() || this.selectedIconId() === icon.id) {
      this.wm.openWindow(icon.appType, undefined, icon.params);
      this.selectedIconId.set(null);
      return;
    }
    this.selectedIconId.set(icon.id);
  }

  onIconDblClick(icon: DesktopIcon): void {
    this.wm.openWindow(icon.appType, undefined, icon.params);
  }

  getInitialPath(params?: Record<string, unknown>): string {
    return typeof params?.['initialPath'] === 'string' ? (params['initialPath'] as string) : '/';
  }

  getInitialFile(params?: Record<string, unknown>): VirtualItem | null {
    return (params?.['file'] as VirtualItem) || null;
  }

  getInitialGame(params?: Record<string, unknown>): 'zeek' | 'cables' | 'boxes' {
    const g = params?.['initialGame'];
    if (g === 'zeek' || g === 'cables' || g === 'boxes') {
      return g;
    }
    return 'zeek';
  }

  getInitialStudentId(params?: Record<string, unknown>): string | null {
    return typeof params?.['initialStudentId'] === 'string' ? (params['initialStudentId'] as string) : null;
  }

  onDesktopClick(e?: Event): void {
    this.contextMenuPos.set(null);
    if (e && (e.target as HTMLElement).closest('.desktop-icon')) {
      return;
    }
    this.selectedIconId.set(null);
    if (!e || (!(e.target as HTMLElement).closest('#start-menu-popup') && !(e.target as HTMLElement).closest('#taskbar-start-button'))) {
      this.isStartMenuOpen.set(false);
    }
  }

  onDesktopContextMenu(e: MouseEvent): void {
    // If clicking on an existing open window, let the window handle it
    if ((e.target as HTMLElement).closest('.window-frame-container')) {
      return;
    }
    e.preventDefault();
    this.isStartMenuOpen.set(false);

    // Keep menu nicely within screen bounds
    const menuWidth = 260;
    const menuHeight = 280;
    const x = Math.min(e.clientX, Math.max(10, window.innerWidth - menuWidth - 10));
    const y = Math.min(e.clientY, Math.max(10, window.innerHeight - menuHeight - 50));

    this.contextMenuPos.set({ x, y });
  }

  onRefreshDesktop(): void {
    this.isRefreshing.set(true);
    setTimeout(() => {
      this.isRefreshing.set(false);
    }, 400);
  }

  onOpenPaint(): void {
    this.wm.openWindow('paint');
  }

  onStartToggle(open: boolean): void {
    this.isStartMenuOpen.set(open);
    if (open) {
      this.contextMenuPos.set(null);
    }
  }

  onCloseStartMenu(): void {
    this.isStartMenuOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.isStartMenuOpen.set(false);
      this.contextMenuPos.set(null);
      this.wallpaperService.closePicker();
    }
  }
}
