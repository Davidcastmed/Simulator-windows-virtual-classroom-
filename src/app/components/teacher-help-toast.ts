import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { WindowManagerService } from '../services/window-manager.service';
import { I18nService } from '../services/i18n.service';
import type { HelpRequest } from '../models/classroom.types';

export function playHandChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: G5 (783.99 Hz) for an upbeat chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.65);
  } catch {
    // Audio blocked or not permitted yet
  }
}

@Component({
  selector: 'app-teacher-help-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (classroom.isTeacher() && activeRequests().length > 0 && isVisible()) {
      <div
        id="teacher-floating-help-toast"
        class="fixed top-4 right-4 z-[9999] max-w-sm sm:max-w-md w-full bg-slate-900/95 border-2 border-amber-500 rounded-2xl shadow-[0_15px_40px_rgba(245,158,11,0.45)] p-4 backdrop-blur-xl text-slate-100 flex flex-col gap-3 animate-in slide-in-from-top-4 duration-200"
        role="alert"
        aria-live="assertive"
      >
        <!-- Header: Student info & Order -->
        <div class="flex items-start justify-between gap-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl shrink-0 animate-bounce">
              ✋
            </div>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm font-bold text-white">
                  {{ topRequest()?.studentName }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wide">
                  #{{ activeRequests().length === 1 ? '1' : '1 de ' + activeRequests().length }}
                </span>
              </div>
              <p class="text-[11px] text-amber-200/90 font-medium">
                {{ isDe() ? 'Möchte sich melden / braucht Hilfe!' : '¡Ha levantado la mano para participar!' }}
              </p>
            </div>
          </div>

          <!-- Close / Snooze toast -->
          <button
            type="button"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
            (click)="dismissToast()"
            [title]="isDe() ? 'Schließen' : 'Cerrar aviso'"
            aria-label="Cerrar notificación"
          >
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>

        <!-- Message snippet -->
        @if (topRequest()?.message; as msg) {
          <div class="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 italic">
            "{{ msg }}"
          </div>
        }

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-1 border-t border-slate-800/80">
          <button
            type="button"
            class="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow"
            (click)="attendTopRequest()"
          >
            <mat-icon class="text-sm !w-4 !h-4">check_circle</mat-icon>
            <span>{{ isDe() ? 'Erledigt & Hand senken' : 'Atender y Bajar Mano' }}</span>
          </button>

          <button
            type="button"
            class="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 transition"
            (click)="openPeers()"
            [title]="isDe() ? 'Multischüler öffnen' : 'Abrir Multischüler Online'"
          >
            <mat-icon class="text-sm !w-4 !h-4 text-sky-400">groups</mat-icon>
            <span>Multischüler</span>
          </button>

          <button
            type="button"
            class="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 transition"
            (click)="openScreenMonitor()"
            [title]="isDe() ? 'Bildschirm ansehen' : 'Ver Pantalla del alumno'"
          >
            <mat-icon class="text-sm !w-4 !h-4 text-purple-400">desktop_windows</mat-icon>
          </button>
        </div>
      </div>
    }
  `,
})
export class TeacherHelpToastComponent {
  readonly classroom = inject(ClassroomService);
  readonly wm = inject(WindowManagerService);
  readonly i18n = inject(I18nService);

  readonly isDe = this.i18n.isDe;
  readonly isVisible = signal<boolean>(true);
  private lastCount = 0;

  readonly activeRequests = computed<HelpRequest[]>(() => {
    return this.classroom.activeHelpRequests();
  });

  readonly topRequest = computed<HelpRequest | null>(() => {
    const list = this.activeRequests();
    return list.length > 0 ? list[0] : null;
  });

  constructor() {
    effect(() => {
      const currentRequests = this.activeRequests();
      const count = currentRequests.length;
      if (count > this.lastCount) {
        // New student raised hand: Play chime and ensure toast is visible!
        playHandChime();
        this.isVisible.set(true);
      }
      this.lastCount = count;
    });
  }

  attendTopRequest(): void {
    const req = this.topRequest();
    if (req) {
      this.classroom.lowerStudentHand(req.studentId);
    }
  }

  openPeers(): void {
    this.wm.openWindow(
      'peers',
      this.isDe() ? 'Multischüler Online' : 'Compañeros del Aula',
    );
  }

  openScreenMonitor(): void {
    const req = this.topRequest();
    this.wm.openWindow(
      'screen-monitor',
      this.isDe() ? 'Schüler-Bildschirme' : 'Monitor de Pantallas',
      req ? { initialStudentId: req.studentId } : undefined,
    );
  }

  dismissToast(): void {
    this.isVisible.set(false);
  }
}
