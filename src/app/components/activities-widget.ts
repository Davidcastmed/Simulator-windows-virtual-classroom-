import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivityTrackerService } from '../services/activity-tracker.service';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';
import { WindowManagerService } from '../services/window-manager.service';

@Component({
  selector: 'app-activities-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div id="activities-widget" class="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-y-auto p-4">
      <!-- Header -->
      <div class="mb-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-100 flex items-center gap-2">
            <mat-icon class="text-amber-400">military_tech</mat-icon>
            <span>{{ t().activities.title }}</span>
          </h2>
          <span class="px-2.5 py-0.5 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 font-bold text-xs">
            {{ activity.completedCount() }} / 7 {{ t().activities.completed }}
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          {{ t().activities.subtitle }}
        </p>

        <!-- Progress Bar -->
        <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-3">
          <div
            class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
            [style.width.%]="(activity.completedCount() / 7) * 100"
          ></div>
        </div>
      </div>

      <!-- Celebratory banner if all finished -->
      @if (activity.allCompleted()) {
        <div class="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-blue-950/80 border border-emerald-500/60 shadow-lg text-center">
          <div class="text-2xl mb-1">🎉 🏆 🌟</div>
          <h3 class="text-sm font-bold text-emerald-300">
            {{ t().activities.allDoneTitle }}
          </h3>
          <p class="text-xs text-slate-300 mt-1">
            {{ t().activities.allDoneMessage }}
          </p>
        </div>
      }

      <!-- Steps List -->
      <div class="flex flex-col gap-2.5 flex-1">
        <!-- Step 1 -->
        <div
          id="step-card-1"
          class="p-3 rounded-xl border transition-all"
          [class.bg-emerald-950/30]="activity.step1()"
          [class.border-emerald-700/60]="activity.step1()"
          [class.bg-slate-800/50]="!activity.step1() && activity.currentStepNumber() === 1"
          [class.border-blue-500/60]="!activity.step1() && activity.currentStepNumber() === 1"
          [class.bg-slate-800/20]="activity.currentStepNumber() !== 1 && !activity.step1()"
          [class.border-slate-800]="activity.currentStepNumber() !== 1 && !activity.step1()"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                [class.bg-emerald-500]="activity.step1()"
                [class.text-slate-950]="activity.step1()"
                [class.bg-blue-600]="!activity.step1() && activity.currentStepNumber() === 1"
                [class.text-white]="!activity.step1() && activity.currentStepNumber() === 1"
                [class.bg-slate-700]="activity.currentStepNumber() > 1 && !activity.step1()"
                [class.text-slate-400]="activity.currentStepNumber() > 1 && !activity.step1()"
              >
                @if (activity.step1()) {
                  <mat-icon class="text-xs !w-3.5 !h-3.5">check</mat-icon>
                } @else {
                  1
                }
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-200">{{ t().activities.step1Title }}</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ t().activities.step1Desc }}</p>
              </div>
            </div>
            @if (!activity.step1()) {
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium shrink-0"
                (click)="openMyFolder()"
              >
                Öffnen
              </button>
            }
          </div>
        </div>

        <!-- Step 2 -->
        <div
          id="step-card-2"
          class="p-3 rounded-xl border transition-all"
          [class.bg-emerald-950/30]="activity.step2()"
          [class.border-emerald-700/60]="activity.step2()"
          [class.bg-slate-800/50]="!activity.step2() && activity.currentStepNumber() === 2"
          [class.border-blue-500/60]="!activity.step2() && activity.currentStepNumber() === 2"
          [class.bg-slate-800/20]="activity.currentStepNumber() !== 2 && !activity.step2()"
          [class.border-slate-800]="activity.currentStepNumber() !== 2 && !activity.step2()"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                [class.bg-emerald-500]="activity.step2()"
                [class.text-slate-950]="activity.step2()"
                [class.bg-blue-600]="!activity.step2() && activity.currentStepNumber() === 2"
                [class.text-white]="!activity.step2() && activity.currentStepNumber() === 2"
                [class.bg-slate-700]="activity.currentStepNumber() !== 2 && !activity.step2()"
                [class.text-slate-400]="activity.currentStepNumber() !== 2 && !activity.step2()"
              >
                @if (activity.step2()) {
                  <mat-icon class="text-xs !w-3.5 !h-3.5">check</mat-icon>
                } @else {
                  2
                }
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-200">{{ t().activities.step2Title }}</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ t().activities.step2Desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3 -->
        <div
          id="step-card-3"
          class="p-3 rounded-xl border transition-all"
          [class.bg-emerald-950/30]="activity.step3()"
          [class.border-emerald-700/60]="activity.step3()"
          [class.bg-slate-800/50]="!activity.step3() && activity.currentStepNumber() === 3"
          [class.border-blue-500/60]="!activity.step3() && activity.currentStepNumber() === 3"
          [class.bg-slate-800/20]="activity.currentStepNumber() !== 3 && !activity.step3()"
          [class.border-slate-800]="activity.currentStepNumber() !== 3 && !activity.step3()"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                [class.bg-emerald-500]="activity.step3()"
                [class.text-slate-950]="activity.step3()"
                [class.bg-blue-600]="!activity.step3() && activity.currentStepNumber() === 3"
                [class.text-white]="!activity.step3() && activity.currentStepNumber() === 3"
                [class.bg-slate-700]="activity.currentStepNumber() !== 3 && !activity.step3()"
                [class.text-slate-400]="activity.currentStepNumber() !== 3 && !activity.step3()"
              >
                @if (activity.step3()) {
                  <mat-icon class="text-xs !w-3.5 !h-3.5">check</mat-icon>
                } @else {
                  3
                }
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-200">{{ t().activities.step3Title }}</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ t().activities.step3Desc }}</p>
              </div>
            </div>
            @if (!activity.step3()) {
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium shrink-0"
                (click)="openPaint()"
              >
                Starten
              </button>
            }
          </div>
        </div>

        <!-- Step 4 -->
        <div
          id="step-card-4"
          class="p-3 rounded-xl border transition-all"
          [class.bg-emerald-950/30]="activity.step4()"
          [class.border-emerald-700/60]="activity.step4()"
          [class.bg-slate-800/50]="!activity.step4() && activity.currentStepNumber() === 4"
          [class.border-blue-500/60]="!activity.step4() && activity.currentStepNumber() === 4"
          [class.bg-slate-800/20]="activity.currentStepNumber() !== 4 && !activity.step4()"
          [class.border-slate-800]="activity.currentStepNumber() !== 4 && !activity.step4()"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                [class.bg-emerald-500]="activity.step4()"
                [class.text-slate-950]="activity.step4()"
                [class.bg-blue-600]="!activity.step4() && activity.currentStepNumber() === 4"
                [class.text-white]="!activity.step4() && activity.currentStepNumber() === 4"
                [class.bg-slate-700]="activity.currentStepNumber() !== 4 && !activity.step4()"
                [class.text-slate-400]="activity.currentStepNumber() !== 4 && !activity.step4()"
              >
                @if (activity.step4()) {
                  <mat-icon class="text-xs !w-3.5 !h-3.5">check</mat-icon>
                } @else {
                  4
                }
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-200">{{ t().activities.step4Title }}</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ t().activities.step4Desc }}</p>
                <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                  <span>Farben: {{ activity.drawingMetrics().colorCount }}/3</span>
                  <span>•</span>
                  <span>Formen: {{ activity.drawingMetrics().shapeCount }}/2</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 5 -->
        <div
          id="step-card-5"
          class="p-3 rounded-xl border transition-all"
          [class.bg-emerald-950/30]="activity.step5()"
          [class.border-emerald-700/60]="activity.step5()"
          [class.bg-slate-800/50]="!activity.step5() && activity.currentStepNumber() === 5"
          [class.border-blue-500/60]="!activity.step5() && activity.currentStepNumber() === 5"
          [class.bg-slate-800/20]="activity.currentStepNumber() !== 5 && !activity.step5()"
          [class.border-slate-800]="activity.currentStepNumber() !== 5 && !activity.step5()"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                [class.bg-emerald-500]="activity.step5()"
                [class.text-slate-950]="activity.step5()"
                [class.bg-blue-600]="!activity.step5() && activity.currentStepNumber() === 5"
                [class.text-white]="!activity.step5() && activity.currentStepNumber() === 5"
                [class.bg-slate-700]="activity.currentStepNumber() !== 5 && !activity.step5()"
                [class.text-slate-400]="activity.currentStepNumber() !== 5 && !activity.step5()"
              >
                @if (activity.step5()) {
                  <mat-icon class="text-xs !w-3.5 !h-3.5">check</mat-icon>
                } @else {
                  5
                }
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-200">{{ t().activities.step5Title }}</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ t().activities.step5Desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 6 -->
        <div
          id="step-card-6"
          class="p-3 rounded-xl border transition-all"
          [class.bg-emerald-950/30]="activity.step6()"
          [class.border-emerald-700/60]="activity.step6()"
          [class.bg-slate-800/50]="!activity.step6() && activity.currentStepNumber() === 6"
          [class.border-blue-500/60]="!activity.step6() && activity.currentStepNumber() === 6"
          [class.bg-slate-800/20]="activity.currentStepNumber() !== 6 && !activity.step6()"
          [class.border-slate-800]="activity.currentStepNumber() !== 6 && !activity.step6()"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                [class.bg-emerald-500]="activity.step6()"
                [class.text-slate-950]="activity.step6()"
                [class.bg-blue-600]="!activity.step6() && activity.currentStepNumber() === 6"
                [class.text-white]="!activity.step6() && activity.currentStepNumber() === 6"
                [class.bg-slate-700]="activity.currentStepNumber() !== 6 && !activity.step6()"
                [class.text-slate-400]="activity.currentStepNumber() !== 6 && !activity.step6()"
              >
                @if (activity.step6()) {
                  <mat-icon class="text-xs !w-3.5 !h-3.5">check</mat-icon>
                } @else {
                  6
                }
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-200">{{ t().activities.step6Title }}</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ t().activities.step6Desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 7 -->
        <div
          id="step-card-7"
          class="p-3 rounded-xl border transition-all"
          [class.bg-emerald-950/30]="activity.step7()"
          [class.border-emerald-700/60]="activity.step7()"
          [class.bg-slate-800/50]="!activity.step7() && activity.currentStepNumber() === 7"
          [class.border-blue-500/60]="!activity.step7() && activity.currentStepNumber() === 7"
          [class.bg-slate-800/20]="activity.currentStepNumber() !== 7 && !activity.step7()"
          [class.border-slate-800]="activity.currentStepNumber() !== 7 && !activity.step7()"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                [class.bg-emerald-500]="activity.step7()"
                [class.text-slate-950]="activity.step7()"
                [class.bg-blue-600]="!activity.step7() && activity.currentStepNumber() === 7"
                [class.text-white]="!activity.step7() && activity.currentStepNumber() === 7"
                [class.bg-slate-700]="activity.currentStepNumber() !== 7 && !activity.step7()"
                [class.text-slate-400]="activity.currentStepNumber() !== 7 && !activity.step7()"
              >
                @if (activity.step7()) {
                  <mat-icon class="text-xs !w-3.5 !h-3.5">check</mat-icon>
                } @else {
                  7
                }
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-200">{{ t().activities.step7Title }}</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ t().activities.step7Desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ActivitiesWidget {
  readonly activity = inject(ActivityTrackerService);
  readonly classroom = inject(ClassroomService);
  readonly wm = inject(WindowManagerService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;

  openMyFolder(): void {
    const user = this.classroom.currentUser();
    if (user) {
      this.wm.openWindow('explorer', `Explorer: ${user.name}`, {
        initialPath: `/Klasse/${user.name}`,
      });
    }
  }

  openPaint(): void {
    this.wm.openWindow('paint');
  }
}
