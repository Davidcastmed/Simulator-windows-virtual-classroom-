import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { VirtualItem } from '../models/classroom.types';
import { ActivityTrackerService } from '../services/activity-tracker.service';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { WindowManagerService } from '../services/window-manager.service';

@Component({
  selector: 'app-file-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div id="file-explorer-container" class="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none">
      <!-- Toolbar -->
      <div id="explorer-toolbar" class="p-2 border-b border-slate-800 bg-slate-900 flex items-center gap-1.5 shrink-0 text-xs overflow-x-auto no-scrollbar">
        <!-- New Folder -->
        <button
          id="btn-explorer-new-folder"
          type="button"
          class="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border"
          [class.opacity-50]="isReadOnly()"
          [class.cursor-not-allowed]="isReadOnly()"
          [class.bg-slate-800]="!isReadOnly()"
          [class.hover:bg-slate-700]="!isReadOnly()"
          [class.border-slate-700]="true"
          [disabled]="isReadOnly()"
          (click)="promptNewFolder()"
          title="Neuen Ordner erstellen"
        >
          <mat-icon class="text-amber-400 text-base !w-4 !h-4 flex items-center justify-center">create_new_folder</mat-icon>
          <span>{{ t().explorer.newFolder }}</span>
        </button>

        <div class="h-4 w-px bg-slate-700 mx-1"></div>

        <!-- Cut -->
        <button
          id="btn-explorer-cut"
          type="button"
          class="px-2 py-1.5 rounded-lg flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="!selectedItem() || isItemProtected(selectedItem()) || isTrashView()"
          (click)="onCut()"
          title="Ausschneiden (Strg+X)"
        >
          <mat-icon class="text-slate-300 text-base !w-4 !h-4 flex items-center justify-center">content_cut</mat-icon>
          <span>{{ t().explorer.cut }}</span>
        </button>

        <!-- Copy -->
        <button
          id="btn-explorer-copy"
          type="button"
          class="px-2 py-1.5 rounded-lg flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="!selectedItem() || isTrashView()"
          (click)="onCopy()"
          title="Kopieren (Strg+C)"
        >
          <mat-icon class="text-slate-300 text-base !w-4 !h-4 flex items-center justify-center">content_copy</mat-icon>
          <span>{{ t().explorer.copy }}</span>
        </button>

        <!-- Paste -->
        <button
          id="btn-explorer-paste"
          type="button"
          class="px-2 py-1.5 rounded-lg flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="!classroom.clipboard() || isReadOnly() || isTrashView()"
          (click)="onPaste()"
          title="Einfügen (Strg+V)"
        >
          <mat-icon class="text-emerald-400 text-base !w-4 !h-4 flex items-center justify-center">content_paste</mat-icon>
          <span>{{ t().explorer.paste }}</span>
        </button>

        <div class="h-4 w-px bg-slate-700 mx-1"></div>

        <!-- Rename -->
        <button
          id="btn-explorer-rename"
          type="button"
          class="px-2 py-1.5 rounded-lg flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="!selectedItem() || isItemProtected(selectedItem()) || isTrashView()"
          (click)="promptRename()"
          title="Umbenennen"
        >
          <mat-icon class="text-blue-400 text-base !w-4 !h-4 flex items-center justify-center">edit</mat-icon>
          <span>{{ t().explorer.rename }}</span>
        </button>

        <!-- Delete / Move to trash -->
        @if (!isTrashView()) {
          <button
            id="btn-explorer-delete"
            type="button"
            class="px-2 py-1.5 rounded-lg flex items-center gap-1 bg-slate-800 hover:bg-red-900/40 text-red-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            [disabled]="!selectedItem() || isItemProtected(selectedItem())"
            (click)="onTrash()"
            title="In den Papierkorb verschieben"
          >
            <mat-icon class="text-red-400 text-base !w-4 !h-4 flex items-center justify-center">delete</mat-icon>
            <span>{{ t().explorer.delete }}</span>
          </button>
        } @else {
          <!-- Restore from trash -->
          <button
            id="btn-explorer-restore"
            type="button"
            class="px-2 py-1.5 rounded-lg flex items-center gap-1 bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
            [disabled]="!selectedItem()"
            (click)="onRestore()"
            title="Wiederherstellen"
          >
            <mat-icon class="text-emerald-400 text-base !w-4 !h-4 flex items-center justify-center">restore</mat-icon>
            <span>{{ t().explorer.restore }}</span>
          </button>

          <!-- Delete forever -->
          <button
            id="btn-explorer-delete-forever"
            type="button"
            class="px-2 py-1.5 rounded-lg flex items-center gap-1 bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
            [disabled]="!selectedItem()"
            (click)="onDeleteForever()"
            title="Endgültig löschen"
          >
            <mat-icon class="text-red-400 text-base !w-4 !h-4 flex items-center justify-center">delete_forever</mat-icon>
            <span>{{ t().explorer.deleteForever }}</span>
          </button>
        }

        <div class="ml-auto flex items-center gap-1">
          <!-- Quick button to open Paint -->
          <button
            id="btn-explorer-open-paint"
            type="button"
            class="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium"
            (click)="openPaint()"
          >
            <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">palette</mat-icon>
            <span>{{ t().startMenu.paintApp }}</span>
          </button>
        </div>
      </div>

      <!-- Address Bar & Navigation -->
      <div id="explorer-address-bar" class="px-2 sm:px-3 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center gap-1.5 sm:gap-2 text-xs">
        <!-- Mobile Sidebar Toggle -->
        <button
          id="btn-nav-sidebar-toggle"
          type="button"
          class="sm:hidden w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
          (click)="toggleMobileSidebar()"
          [title]="showMobileSidebar() ? 'Dateien anzeigen' : 'Ordner anzeigen'"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">{{ showMobileSidebar() ? 'grid_view' : 'menu' }}</mat-icon>
        </button>

        <!-- Back Button -->
        <button
          id="btn-nav-back"
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          [disabled]="historyIndex() <= 0"
          (click)="goBack()"
          title="Zurück"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">arrow_back</mat-icon>
        </button>

        <!-- Up One Level -->
        <button
          id="btn-nav-up"
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          [disabled]="currentPath() === '/'"
          (click)="goUp()"
          title="Eine Ebene nach oben"
        >
          <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">arrow_upward</mat-icon>
        </button>

        <!-- Breadcrumb Path Display -->
        <div id="explorer-breadcrumbs" class="flex-1 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto no-scrollbar min-w-0">
          <mat-icon class="text-slate-400 text-base !w-4 !h-4 flex items-center justify-center shrink-0">computer</mat-icon>
          <span class="text-slate-500">/</span>

          <button
            type="button"
            class="hover:text-white hover:underline cursor-pointer shrink-0"
            (click)="navigateTo('/')"
          >
            {{ t().system.thisPC }}
          </button>

          @for (part of breadcrumbParts(); track part.path) {
            <span class="text-slate-500 shrink-0">/</span>
            <button
              type="button"
              class="hover:text-white hover:underline cursor-pointer truncate max-w-[100px] sm:max-w-[140px] shrink-0"
              (click)="navigateTo(part.path)"
            >
              {{ part.name }}
            </button>
          }
        </div>

        <!-- Search input -->
        <div class="relative w-24 sm:w-48 shrink-0">
          <input
            id="explorer-search-input"
            type="text"
            [placeholder]="t().explorer.searchPlaceholder"
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
            class="w-full pl-6 sm:pl-7 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <mat-icon class="absolute left-1.5 top-1.5 text-slate-500 text-base !w-4 !h-4 flex items-center justify-center">search</mat-icon>
        </div>
      </div>

      <!-- Banner notices -->
      @if (isReadOnly()) {
        <div id="explorer-readonly-banner" class="px-3 py-1.5 bg-amber-950/50 border-b border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
          <mat-icon class="text-amber-400 text-sm !w-4 !h-4 flex items-center justify-center">lock</mat-icon>
          <span>{{ t().explorer.readOnlyBanner }}</span>
        </div>
      } @else if (isUserPersonalFolder()) {
        <div id="explorer-owner-banner" class="px-3 py-1.5 bg-blue-950/40 border-b border-blue-800/40 text-blue-300 text-xs flex items-center gap-2">
          <mat-icon class="text-blue-400 text-sm !w-4 !h-4 flex items-center justify-center">verified_user</mat-icon>
          <span>{{ t().explorer.ownerBadge }}</span>
        </div>
      }

      <!-- Main Body: Sidebar + Items Area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left Sidebar: Folder Tree -->
        <div
          id="explorer-sidebar"
          class="border-r border-slate-800 bg-slate-950/95 sm:bg-slate-950/60 p-2 overflow-y-auto text-xs shrink-0 flex-col gap-0.5"
          [class.hidden]="!showMobileSidebar() && wm.isMobile()"
          [class.flex]="showMobileSidebar() || !wm.isMobile()"
          [class.w-full]="wm.isMobile()"
          [class.sm:w-52]="true"
        >
          <div class="text-slate-500 uppercase tracking-wider text-[10px] font-semibold px-2 py-1">
            Schnellzugriff
          </div>

          <!-- This PC -->
          <button
            id="tree-item-root"
            type="button"
            class="w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left transition-colors"
            [class.bg-blue-600]="currentPath() === '/'"
            [class.text-white]="currentPath() === '/'"
            [class.text-slate-300]="currentPath() !== '/'"
            [class.hover:bg-slate-800]="currentPath() !== '/'"
            (click)="navigateTo('/')"
          >
            <mat-icon class="text-slate-400 text-base !w-4 !h-4 flex items-center justify-center">computer</mat-icon>
            <span class="truncate">{{ t().system.thisPC }}</span>
          </button>

          <!-- Meine Klasse -->
          <button
            id="tree-item-klasse"
            type="button"
            class="w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left transition-colors"
            [class.bg-blue-600]="currentPath().startsWith('/Klasse')"
            [class.text-white]="currentPath().startsWith('/Klasse')"
            [class.text-slate-300]="!currentPath().startsWith('/Klasse')"
            [class.hover:bg-slate-800]="!currentPath().startsWith('/Klasse')"
            (click)="navigateTo('/Klasse')"
          >
            <mat-icon class="text-amber-400 text-base !w-4 !h-4 flex items-center justify-center">groups</mat-icon>
            <span class="truncate">{{ t().system.myClass }}</span>
          </button>

          <!-- Lehrermaterial -->
          <button
            id="tree-item-lehrer"
            type="button"
            class="w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left transition-colors"
            [class.bg-blue-600]="currentPath().startsWith('/Lehrermaterial')"
            [class.text-white]="currentPath().startsWith('/Lehrermaterial')"
            [class.text-slate-300]="!currentPath().startsWith('/Lehrermaterial')"
            [class.hover:bg-slate-800]="!currentPath().startsWith('/Lehrermaterial')"
            (click)="navigateTo('/Lehrermaterial')"
          >
            <mat-icon class="text-purple-400 text-base !w-4 !h-4 flex items-center justify-center">school</mat-icon>
            <span class="truncate">{{ t().system.teacherMaterial }}</span>
          </button>

          <!-- Geteilte Arbeiten -->
          <button
            id="tree-item-geteilt"
            type="button"
            class="w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left transition-colors"
            [class.bg-blue-600]="currentPath().startsWith('/Geteilte Arbeiten')"
            [class.text-white]="currentPath().startsWith('/Geteilte Arbeiten')"
            [class.text-slate-300]="!currentPath().startsWith('/Geteilte Arbeiten')"
            [class.hover:bg-slate-800]="!currentPath().startsWith('/Geteilte Arbeiten')"
            (click)="navigateTo('/Geteilte Arbeiten')"
          >
            <mat-icon class="text-emerald-400 text-base !w-4 !h-4 flex items-center justify-center">share</mat-icon>
            <span class="truncate">{{ t().system.sharedWorks }}</span>
          </button>

          <!-- Papierkorb -->
          <button
            id="tree-item-papierkorb"
            type="button"
            class="w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left transition-colors mt-2 border-t border-slate-800/80 pt-2"
            [class.bg-blue-600]="currentPath().startsWith('/Papierkorb')"
            [class.text-white]="currentPath().startsWith('/Papierkorb')"
            [class.text-slate-300]="!currentPath().startsWith('/Papierkorb')"
            [class.hover:bg-slate-800]="!currentPath().startsWith('/Papierkorb')"
            (click)="navigateToTrash()"
          >
            <mat-icon class="text-red-400 text-base !w-4 !h-4 flex items-center justify-center">delete</mat-icon>
            <span class="truncate">{{ t().system.recycleBin }}</span>
          </button>
        </div>

        <!-- Right Side: Items View -->
        <div
          id="explorer-content-view"
          class="flex-1 p-4 overflow-y-auto"
          role="region"
          aria-label="Dateiinhalt"
          tabindex="0"
          (click)="clearSelection($event)"
          (keydown.escape)="clearSelection($event)"
          (dragover)="onDragOver($event)"
          (drop)="onDropInFolder($event, currentPath())"
        >
          @if (filteredItems().length === 0) {
            <div class="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <mat-icon class="text-4xl !w-10 !h-10 text-slate-600">folder_open</mat-icon>
              <p class="text-sm">{{ t().explorer.emptyFolder }}</p>
              @if (!isReadOnly()) {
                <button
                  type="button"
                  class="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-1"
                  (click)="promptNewFolder()"
                >
                  + {{ t().explorer.newFolder }}
                </button>
              }
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              @for (item of filteredItems(); track item.path) {
                <button
                  [id]="'explorer-item-' + item.id"
                  type="button"
                  class="group relative flex flex-col items-center p-2.5 rounded-xl border transition-all cursor-pointer text-center w-full"
                  [class.bg-blue-900/40]="selectedItem()?.path === item.path"
                  [class.border-blue-500]="selectedItem()?.path === item.path"
                  [class.bg-slate-800/40]="selectedItem()?.path !== item.path"
                  [class.border-slate-800]="selectedItem()?.path !== item.path"
                  [class.hover:border-slate-600]="selectedItem()?.path !== item.path"
                  draggable="true"
                  (dragstart)="onDragStart($event, item)"
                  (dragover)="onDragOverItem($event, item)"
                  (drop)="onDropOnItem($event, item)"
                  (click)="selectItem($event, item)"
                  (dblclick)="openItem(item)"
                  (keydown.enter)="openItem(item)"
                >
                  <!-- Item Icon / Thumbnail -->
                  <div class="w-14 h-14 flex items-center justify-center mb-1 relative">
                    @if (item.type === 'folder') {
                      <mat-icon class="text-amber-400 text-5xl !w-12 !h-12 flex items-center justify-center">folder</mat-icon>
                      @if (item.isProtected) {
                        <mat-icon class="absolute bottom-1 right-1 text-slate-400 text-xs !w-3 !h-3 bg-slate-900 rounded-full">lock</mat-icon>
                      }
                    } @else if (item.fileType === 'image') {
                      @if (item.thumbnail || item.content) {
                        <img
                          [src]="item.thumbnail || item.content"
                          alt="thumbnail"
                          class="w-12 h-12 object-contain rounded bg-white/10 p-0.5 border border-slate-700"
                        />
                      } @else {
                        <mat-icon class="text-blue-400 text-4xl !w-10 !h-10 flex items-center justify-center">image</mat-icon>
                      }
                    } @else {
                      <mat-icon class="text-slate-300 text-4xl !w-10 !h-10 flex items-center justify-center">description</mat-icon>
                    }
                  </div>

                  <!-- Item Name -->
                  <div class="text-xs font-medium text-slate-200 truncate w-full px-1" [title]="item.name">
                    {{ item.name }}
                  </div>

                  <!-- Item details badge -->
                  <div class="text-[10px] text-slate-400 mt-0.5 truncate w-full">
                    @if (item.type === 'folder') {
                      {{ t().explorer.typeFolder }}
                    } @else if (item.fileType === 'image') {
                      {{ t().explorer.typeImage }}
                    } @else {
                      {{ t().explorer.typeText }}
                    }
                  </div>
                </button>
              }
            </div>
          }
        </div>
      </div>

      <!-- Footer Status Bar -->
      <div id="explorer-status-bar" class="px-3 py-1.5 border-t border-slate-800 bg-slate-950 text-slate-400 text-[11px] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <span>{{ filteredItems().length }} {{ t().explorer.itemsCount }}</span>
          @if (selectedItem()) {
            <span class="text-slate-500">|</span>
            <span class="text-slate-200 font-medium truncate max-w-xs">Ausgewählt: {{ selectedItem()?.name }}</span>
          }
        </div>

        <div class="flex items-center gap-2 truncate max-w-sm text-slate-500">
          <span>Pfad: {{ currentPath() }}</span>
        </div>
      </div>

      <!-- Quick Text Viewer Modal -->
      @if (viewingTextDoc()) {
        <div class="absolute inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4">
          <div class="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[80%] overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <mat-icon class="text-blue-400 text-base">description</mat-icon>
                <span>{{ viewingTextDoc()?.name }}</span>
              </div>
              <button
                type="button"
                class="text-slate-400 hover:text-white"
                (click)="viewingTextDoc.set(null)"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>
            <div class="p-4 overflow-y-auto text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {{ viewingTextDoc()?.content }}
            </div>
            <div class="p-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                (click)="viewingTextDoc.set(null)"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class FileExplorer {
  readonly initialPath = input<string>('/');
  readonly classroom = inject(ClassroomService);
  readonly wm = inject(WindowManagerService);
  readonly activity = inject(ActivityTrackerService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;

  readonly currentPath = signal<string>('/');
  readonly searchQuery = signal<string>('');
  readonly selectedItem = signal<VirtualItem | null>(null);
  readonly viewingTextDoc = signal<VirtualItem | null>(null);
  readonly showMobileSidebar = signal<boolean>(false);

  toggleMobileSidebar(): void {
    this.showMobileSidebar.update((v) => !v);
  }

  // History stack for Back/Forward navigation
  readonly pathHistory = signal<string[]>(['/']);
  readonly historyIndex = signal<number>(0);

  private draggedItem: VirtualItem | null = null;

  constructor() {
    // If student, default start path can be their folder or root
    const user = this.classroom.currentUser();
    if (user?.role === 'student') {
      const studentFolder = `/Klasse/${user.name}`;
      this.navigateTo(studentFolder);
    }
  }

  readonly breadcrumbParts = computed(() => {
    const p = this.currentPath();
    if (p === '/') return [];
    const segments = p.split('/').filter(Boolean);
    let accum = '';
    return segments.map((seg) => {
      accum += '/' + seg;
      return { name: seg, path: accum };
    });
  });

  readonly isTrashView = computed(() => {
    return this.currentPath().startsWith('/Papierkorb');
  });

  readonly isReadOnly = computed(() => {
    const user = this.classroom.currentUser();
    if (!user) return true;
    if (user.role === 'teacher') return false;

    const p = this.currentPath();
    const userFolder = `/Klasse/${user.name}`;
    const userTrash = `/Papierkorb/${user.name}`;

    return !p.startsWith(userFolder) && !p.startsWith(userTrash);
  });

  readonly isUserPersonalFolder = computed(() => {
    const user = this.classroom.currentUser();
    if (!user || user.role !== 'student') return false;
    return this.currentPath() === `/Klasse/${user.name}`;
  });

  readonly currentFolderItems = computed<VirtualItem[]>(() => {
    const room = this.classroom.classroom();
    if (!room) return [];

    const path = this.currentPath();
    const items: VirtualItem[] = [];

    // Root path shows standard top-level virtual directories
    if (path === '/') {
      return [
        room.files['/Klasse'],
        room.files['/Lehrermaterial'],
        room.files['/Geteilte Arbeiten'],
        room.files['/Papierkorb'],
      ].filter(Boolean) as VirtualItem[];
    }

    const prefix = path.endsWith('/') ? path : path + '/';

    for (const [fPath, item] of Object.entries(room.files)) {
      if (fPath === path) continue;
      if (fPath.startsWith(prefix)) {
        const sub = fPath.substring(prefix.length);
        // Only direct children
        if (!sub.includes('/')) {
          items.push(item);
        }
      }
    }

    return items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  });

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const items = this.currentFolderItems();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  });

  isItemProtected(item: VirtualItem | null): boolean {
    if (!item) return true;
    if (item.isProtected) return true;
    const user = this.classroom.currentUser();
    if (!user) return true;
    if (user.role === 'teacher') return false;
    const userFolder = `/Klasse/${user.name}`;
    const userTrash = `/Papierkorb/${user.name}`;
    return !item.path.startsWith(userFolder) && !item.path.startsWith(userTrash);
  }

  navigateTo(path: string): void {
    const cleanPath = path || '/';
    this.currentPath.set(cleanPath);
    this.selectedItem.set(null);
    this.searchQuery.set('');
    this.showMobileSidebar.set(false);

    // Push history
    const hist = this.pathHistory();
    const idx = this.historyIndex();
    const nextHist = [...hist.slice(0, idx + 1), cleanPath];
    this.pathHistory.set(nextHist);
    this.historyIndex.set(nextHist.length - 1);

    // Track for activity progress
    this.activity.recordExplorerNavigation(cleanPath);
  }

  navigateToTrash(): void {
    const user = this.classroom.currentUser();
    if (user?.role === 'student') {
      this.navigateTo(`/Papierkorb/${user.name}`);
    } else {
      this.navigateTo('/Papierkorb');
    }
  }

  goBack(): void {
    const idx = this.historyIndex();
    if (idx > 0) {
      this.historyIndex.set(idx - 1);
      const target = this.pathHistory()[idx - 1];
      this.currentPath.set(target);
      this.selectedItem.set(null);
      this.activity.recordExplorerNavigation(target);
    }
  }

  goUp(): void {
    const p = this.currentPath();
    if (p === '/') return;
    const lastSlash = p.lastIndexOf('/');
    const parent = lastSlash === 0 ? '/' : p.substring(0, lastSlash);
    this.navigateTo(parent);
  }

  selectItem(e: MouseEvent, item: VirtualItem): void {
    e.stopPropagation();
    if (this.wm.isMobile() || this.selectedItem()?.path === item.path) {
      this.openItem(item);
      return;
    }
    this.selectedItem.set(item);
  }

  clearSelection(e?: Event): void {
    if (!e || !(e.target as HTMLElement).closest('.group')) {
      this.selectedItem.set(null);
    }
  }

  openItem(item: VirtualItem): void {
    if (item.type === 'folder') {
      this.navigateTo(item.path);
    } else if (item.fileType === 'image') {
      // Open in Paint for editing or viewing
      this.wm.openWindow('paint', `Malstudio: ${item.name}`, {
        file: item,
      });
    } else if (item.fileType === 'text') {
      this.viewingTextDoc.set(item);
    }
  }

  openPaint(): void {
    this.wm.openWindow('paint');
  }

  async promptNewFolder(): Promise<void> {
    const name = prompt('Name des neuen Ordners (z.B. "Meine Zeichnungen"):');
    if (!name || !name.trim()) return;

    const res = await this.classroom.createFolder(this.currentPath(), name.trim());
    if (!res.success) {
      alert(res.error || 'Ordner konnte nicht erstellt werden.');
    }
  }

  async promptRename(): Promise<void> {
    const item = this.selectedItem();
    if (!item) return;

    const newName = prompt(`Neuer Name für "${item.name}":`, item.name);
    if (!newName || !newName.trim() || newName.trim() === item.name) return;

    const res = await this.classroom.renameItem(item.path, newName.trim());
    if (!res.success) {
      alert(res.error || 'Umbenennen fehlgeschlagen.');
    }
  }

  onCut(): void {
    const item = this.selectedItem();
    if (!item) return;
    this.classroom.clipboard.set({ item, isCut: true });
  }

  onCopy(): void {
    const item = this.selectedItem();
    if (!item) return;
    this.classroom.clipboard.set({ item, isCut: false });
  }

  async onPaste(): Promise<void> {
    const clip = this.classroom.clipboard();
    if (!clip) return;

    const destPath = this.currentPath();
    if (clip.isCut) {
      const res = await this.classroom.moveItem(clip.item.path, destPath);
      if (res.success) {
        this.classroom.clipboard.set(null);
      } else {
        alert(res.error || 'Einfügen fehlgeschlagen.');
      }
    } else {
      const res = await this.classroom.copyItem(clip.item.path, destPath);
      if (!res.success) {
        alert(res.error || 'Kopieren fehlgeschlagen.');
      }
    }
  }

  async onTrash(): Promise<void> {
    const item = this.selectedItem();
    if (!item) return;

    if (confirm(`Möchtest du "${item.name}" wirklich in den Papierkorb verschieben?`)) {
      const res = await this.classroom.trashFile(item.path);
      if (!res.success) {
        alert(res.error || 'Konnte nicht in den Papierkorb verschoben werden.');
      }
      this.selectedItem.set(null);
    }
  }

  async onRestore(): Promise<void> {
    const item = this.selectedItem();
    if (!item) return;

    const res = await this.classroom.restoreFile(item.path);
    if (!res.success) {
      alert(res.error || 'Wiederherstellen fehlgeschlagen.');
    }
    this.selectedItem.set(null);
  }

  async onDeleteForever(): Promise<void> {
    const item = this.selectedItem();
    if (!item) return;

    if (confirm(`"${item.name}" wird endgültig gelöscht. Fortfahren?`)) {
      const res = await this.classroom.deleteForever(item.path);
      if (!res.success) {
        alert(res.error || 'Endgültiges Löschen fehlgeschlagen.');
      }
      this.selectedItem.set(null);
    }
  }

  // Drag & Drop
  onDragStart(e: DragEvent, item: VirtualItem): void {
    this.draggedItem = item;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', item.path);
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
  }

  onDragOverItem(e: DragEvent, targetItem: VirtualItem): void {
    if (targetItem.type === 'folder' && targetItem !== this.draggedItem) {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    }
  }

  async onDropOnItem(e: DragEvent, targetFolder: VirtualItem): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!this.draggedItem || targetFolder.type !== 'folder' || targetFolder.path === this.draggedItem.path) {
      return;
    }

    const item = this.draggedItem;
    this.draggedItem = null;

    const res = await this.classroom.moveItem(item.path, targetFolder.path);
    if (!res.success) {
      alert(res.error || 'Verschieben nicht erlaubt.');
    }
  }

  async onDropInFolder(e: DragEvent, destFolder: string): Promise<void> {
    e.preventDefault();
    if (!this.draggedItem) return;

    const item = this.draggedItem;
    this.draggedItem = null;

    if (item.path.startsWith(destFolder + '/')) return; // already there

    const res = await this.classroom.moveItem(item.path, destFolder);
    if (!res.success) {
      alert(res.error || 'Verschieben nicht erlaubt.');
    }
  }
}
