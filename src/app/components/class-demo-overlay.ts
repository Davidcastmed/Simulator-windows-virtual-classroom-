import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { VirtualItem } from '../models/classroom.types';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-class-demo-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    @if (classroom.isDemoActive()) {
      <div
        id="demo-overlay-container"
        class="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between"
      >
        <!-- Top Demo Notification Banner -->
        <div
          id="demo-banner-top"
          class="pointer-events-auto mx-auto mt-2 px-4 py-2 rounded-2xl bg-slate-900/95 border border-amber-500/80 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs"
        >
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span class="font-bold uppercase tracking-wider text-amber-300">
              {{ t().demo.bannerTitle }}
            </span>
          </div>

          <div class="h-4 w-px bg-slate-700"></div>

          <div class="text-slate-200 flex items-center gap-1.5">
            <mat-icon class="text-blue-400 text-sm !w-4 !h-4 flex items-center justify-center">person</mat-icon>
            <span>
              {{ t().demo.controlledBy }}:
              <strong class="text-white">{{ controllerName() }}</strong>
            </span>
          </div>

          @if (isCurrentStudentController()) {
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 animate-pulse">
              {{ t().demo.youHaveControl }}
            </span>
          }

          <!-- If student, show Hand raise button -->
          @if (classroom.isStudent()) {
            <div class="h-4 w-px bg-slate-700"></div>
            <button
              id="btn-demo-raise-hand"
              type="button"
              class="px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              [class.bg-red-600]="isHandRaised()"
              [class.text-white]="isHandRaised()"
              [class.bg-slate-800]="!isHandRaised()"
              [class.text-slate-300]="!isHandRaised()"
              [class.hover:bg-slate-700]="!isHandRaised()"
              (click)="toggleHandRaise()"
            >
              <mat-icon class="text-sm !w-3.5 !h-3.5">pan_tool</mat-icon>
              <span>{{ isHandRaised() ? t().demo.handRaised : t().demo.raiseHand }}</span>
            </button>
          }

          <!-- If teacher, show Stop Demo button -->
          @if (classroom.isTeacher()) {
            <div class="h-4 w-px bg-slate-700"></div>
            <button
              id="btn-demo-stop"
              type="button"
              class="px-2.5 py-1 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1"
              (click)="stopDemo()"
            >
              <mat-icon class="text-sm !w-3.5 !h-3.5">stop</mat-icon>
              <span>{{ t().teacher.stopDemo }}</span>
            </button>
          }
        </div>

        <!-- Presented Artwork Showcase (Center Stage Modal) -->
        @if (presentedItem(); as item) {
          <div
            id="demo-presented-artwork"
            class="pointer-events-auto fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <div class="max-w-4xl w-full bg-slate-900 border-2 border-indigo-500/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div class="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-indigo-400">stars</mat-icon>
                  <div>
                    <h3 class="text-sm font-bold text-white">{{ item.name }}</h3>
                    <p class="text-[11px] text-slate-400">Präsentiert für die ganze Klasse • Erstellt von {{ item.creatorName }}</p>
                  </div>
                </div>

                @if (classroom.isTeacher()) {
                  <button
                    type="button"
                    class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                    (click)="closePresentedWork()"
                  >
                    Präsentation schließen
                  </button>
                }
              </div>

              <div class="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto">
                <img
                  [src]="item.content || item.thumbnail"
                  [alt]="item.name"
                  class="max-h-[65vh] object-contain rounded-xl shadow-2xl bg-white p-2 border border-slate-800"
                />
              </div>
            </div>
          </div>
        }

        <!-- Streamed Controller Cursor (when someone else is presenting/controlling) -->
        @if (!classroom.isController() && cursorPosition(); as cursor) {
          @if (cursor.visible) {
            <div
              id="streamed-demo-cursor"
              class="fixed pointer-events-none z-50 transition-all duration-75 flex items-start"
              [style.left.px]="cursor.x"
              [style.top.px]="cursor.y"
            >
              <!-- Cursor Arrow -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="drop-shadow-lg text-amber-400">
                <path d="M4 2L20 12L12 14L8 22L4 2Z" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>

              <!-- Presenter Name Chip -->
              <span class="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] shadow-md border border-white/40 whitespace-nowrap">
                {{ controllerName() }}
              </span>
            </div>
          }
        }
      </div>
    }
  `,
})
export class ClassDemoOverlay {
  readonly classroom = inject(ClassroomService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;

  readonly controllerName = computed(() => {
    const demo = this.classroom.classroom()?.demoMode;
    return demo?.controlledByName || 'Lehrkraft';
  });

  readonly isCurrentStudentController = computed(() => {
    const user = this.classroom.currentUser();
    const demo = this.classroom.classroom()?.demoMode;
    return !!user && user.role === 'student' && demo?.controlledBy === user.id;
  });

  readonly isHandRaised = computed(() => {
    const user = this.classroom.currentUser();
    const room = this.classroom.classroom();
    if (!user || !room) return false;
    return room.helpRequests.some((h) => h.studentId === user.id);
  });

  readonly presentedItem = computed<VirtualItem | null>(() => {
    const room = this.classroom.classroom();
    const path = room?.demoMode?.presentationFilePath;
    if (!room || !path) return null;
    return room.files[path] || null;
  });

  readonly cursorPosition = computed(() => {
    return this.classroom.classroom()?.demoMode?.teacherCursor || null;
  });

  private lastCursorSend = 0;

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(e: MouseEvent): void {
    if (this.classroom.isController()) {
      const now = Date.now();
      if (now - this.lastCursorSend > 80) {
        this.lastCursorSend = now;
        this.classroom.streamCursor(e.clientX, e.clientY, true);
      }
    }
  }

  toggleHandRaise(): void {
    if (this.isHandRaised()) {
      const user = this.classroom.currentUser();
      if (user) {
        this.classroom.resolveHelp(user.id);
      }
    } else {
      this.classroom.requestHelp();
    }
  }

  stopDemo(): void {
    this.classroom.toggleDemoMode(false);
  }

  closePresentedWork(): void {
    this.classroom.presentWork('');
  }
}
