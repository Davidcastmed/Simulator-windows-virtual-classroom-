import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { WindowManagerService } from '../services/window-manager.service';

@Component({
  selector: 'app-start-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      id="start-menu-popup"
      class="absolute bottom-14 left-2 w-84 bg-gradient-to-b from-[#1e232d] to-[#11141a] border border-zinc-650/90 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl flex flex-col overflow-hidden z-50 text-zinc-100 select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <!-- Search Field (Dark metal inset) -->
      <div class="p-3 border-b border-zinc-750 bg-zinc-950/70">
        <div class="relative">
          <input
            id="start-menu-search"
            type="text"
            [placeholder]="t().startMenu.searchPlaceholder"
            (input)="onSearchInput($event)"
            class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/40 shadow-inner"
          />
          <mat-icon class="absolute left-2 top-2 text-zinc-500 text-base !w-4 !h-4 flex items-center justify-center">search</mat-icon>
        </div>
      </div>

      <!-- App Grid / List -->
      <div class="p-3 flex-1 overflow-y-auto flex flex-col gap-1 max-h-80">
        <div class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1">
          {{ t().startMenu.pinnedApps }}
        </div>

        <!-- RoboCode: Learn to Program -->
        <button
          id="start-app-coding"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('coding')"
        >
          <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">terminal</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().coding.title }}</div>
            <div class="text-[10px] text-zinc-400">{{ t().startMenu.codingSub }}</div>
          </div>
        </button>

        <!-- Logic & Pathfinding Games -->
        <button
          id="start-app-logic-games"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('logic-games')"
        >
          <div class="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">videogame_asset</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().logicGames.title }}</div>
            <div class="text-[10px] text-zinc-400">{{ t().startMenu.logicGamesSub }}</div>
          </div>
        </button>

        <!-- Groups & Live Class Wall -->
        <button
          id="start-app-groups-wall"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('groups-wall')"
        >
          <div class="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center border border-violet-500/30">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">diversity_3</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().groupsWall.title }}</div>
            <div class="text-[10px] text-zinc-400">{{ t().startMenu.groupsWallSub }}</div>
          </div>
        </button>

        <!-- File Explorer -->
        <button
          id="start-app-explorer"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('explorer')"
        >
          <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">folder_open</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().startMenu.fileExplorer }}</div>
            <div class="text-[10px] text-zinc-400">{{ t().startMenu.fileExplorerSub }}</div>
          </div>
        </button>

        <!-- Paint App -->
        <button
          id="start-app-paint"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('paint')"
        >
          <div class="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/30">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">palette</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().startMenu.paintApp }}</div>
            <div class="text-[10px] text-zinc-400">{{ t().startMenu.paintAppSub }}</div>
          </div>
        </button>

        <!-- Live Peers -->
        <button
          id="start-app-peers"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('peers')"
        >
          <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">groups</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().peersWidget.dockTitle }}</div>
            <div class="text-[10px] text-zinc-400">{{ classroom.activePeersCount() }} {{ t().peersWidget.activeCount }}</div>
          </div>
        </button>

        <!-- Classroom Chat -->
        <button
          id="start-app-chat"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('chat')"
        >
          <div class="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">forum</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().classroomChat.title }}</div>
            <div class="text-[10px] text-zinc-400">{{ t().classroomChat.subtitle }}</div>
          </div>
        </button>

        <!-- Collaborative Whiteboard -->
        <button
          id="start-app-whiteboard"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('whiteboard')"
        >
          <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">gesture</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().whiteboard.title }}</div>
            <div class="text-[10px] text-zinc-400">{{ t().whiteboard.subtitle }}</div>
          </div>
        </button>

        <!-- Activities (Students) -->
        @if (classroom.isStudent()) {
          <button
            id="start-app-activities"
            type="button"
            class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
            (click)="openApp('activities')"
          >
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">assignment</mat-icon>
            </div>
            <div>
              <div class="text-xs font-semibold text-zinc-200">{{ t().startMenu.activities }}</div>
              <div class="text-[10px] text-zinc-400">{{ t().startMenu.activitiesSub }}</div>
            </div>
          </button>
        }

        <!-- Teacher Dashboard (Teacher) -->
        @if (classroom.isTeacher()) {
          <button
            id="start-app-teacher"
            type="button"
            class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
            (click)="openApp('teacher')"
          >
            <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
              <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">school</mat-icon>
            </div>
            <div>
              <div class="text-xs font-semibold text-zinc-200">{{ t().startMenu.teacherDashboard }}</div>
              <div class="text-[10px] text-zinc-400">{{ t().startMenu.teacherDashboardSub }}</div>
            </div>
          </button>
        }

        <!-- Help -->
        <button
          id="start-app-help"
          type="button"
          class="w-full p-2 rounded-xl flex items-center gap-3 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-colors text-left"
          (click)="openApp('help')"
        >
          <div class="w-8 h-8 rounded-lg bg-zinc-700/50 text-zinc-300 flex items-center justify-center border border-zinc-600">
            <mat-icon class="text-lg !w-5 !h-5 flex items-center justify-center">help_outline</mat-icon>
          </div>
          <div>
            <div class="text-xs font-semibold text-zinc-200">{{ t().startMenu.help }}</div>
            <div class="text-[10px] text-zinc-400">{{ t().startMenu.helpSub }}</div>
          </div>
        </button>
      </div>

      <!-- User Profile & Leave bar (Dark metal footer) -->
      <div class="p-3 border-t border-zinc-750 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-zinc-700 border border-zinc-500 text-white flex items-center justify-center font-bold text-xs shadow-inner">
            {{ classroom.currentUser()?.name?.charAt(0)?.toUpperCase() }}
          </div>
          <div class="truncate max-w-[130px]">
            <div class="text-xs font-bold text-zinc-200 truncate">{{ classroom.currentUser()?.name }}</div>
            <div class="text-[10px] text-zinc-400 truncate">
              {{ classroom.isTeacher() ? t().roles.teacher : t().roles.student }}
            </div>
          </div>
        </div>

        <button
          id="btn-start-logout"
          type="button"
          class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors"
          [title]="t().startMenu.logout"
          (click)="onLogout()"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">power_settings_new</mat-icon>
        </button>
      </div>
    </div>
  `,
})
export class StartMenu {
  readonly closeMenu = output<void>();

  readonly classroom = inject(ClassroomService);
  readonly wm = inject(WindowManagerService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly searchQuery = signal<string>('');

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  openApp(
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
      | 'peers',
  ): void {
    this.wm.openWindow(appType);
    this.closeMenu.emit();
  }

  onLogout(): void {
    this.classroom.leaveClassroom();
    this.wm.closeAll();
    this.closeMenu.emit();
  }
}

