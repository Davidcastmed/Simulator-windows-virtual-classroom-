import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-login-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      id="login-screen-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl select-none"
    >
      <div
        id="login-card"
        class="w-full max-w-md max-h-[95vh] overflow-y-auto no-scrollbar bg-gradient-to-b from-[#1d232e] to-[#11141b] border border-zinc-650/90 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.14)] flex flex-col animate-in fade-in zoom-in-95 duration-200 text-zinc-200"
      >
        <!-- Card Header (Dark Metal finish) -->
        <div class="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-zinc-750 text-center relative bg-gradient-to-b from-zinc-800/40 to-transparent">
          <!-- Top language toggle -->
          <button
            type="button"
            class="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-650 text-[11px] text-zinc-300 font-semibold shadow-sm transition"
            (click)="toggleLanguage()"
          >
            {{ i18n.currentLang() === 'de' ? '🇩🇪 DE' : '🇪🇸 ES' }}
          </button>

          <!-- Computer Icon with Titanium frame -->
          <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-zinc-700 via-zinc-800 to-zinc-700 border border-zinc-500 flex items-center justify-center text-zinc-100 shadow-xl">
            <mat-icon class="text-3xl !w-8 !h-8 flex items-center justify-center text-sky-300">desktop_windows</mat-icon>
          </div>

          <h1 class="text-xl font-extrabold text-zinc-100 tracking-tight">
            {{ t().system.appName }}
          </h1>
          <p class="text-xs text-zinc-400 mt-1">
            {{ t().system.appTagline }}
          </p>

          <!-- Role Selector Tabs -->
          <div class="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950/80 rounded-xl border border-zinc-750 mt-5">
            <button
              id="tab-role-student"
              type="button"
              class="py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              [class.bg-gradient-to-b]="activeTab() === 'student'"
              [class.from-zinc-700]="activeTab() === 'student'"
              [class.to-zinc-800]="activeTab() === 'student'"
              [class.border]="activeTab() === 'student'"
              [class.border-zinc-500]="activeTab() === 'student'"
              [class.text-white]="activeTab() === 'student'"
              [class.shadow-md]="activeTab() === 'student'"
              [class.text-zinc-400]="activeTab() !== 'student'"
              [class.hover:text-zinc-200]="activeTab() !== 'student'"
              (click)="activeTab.set('student')"
            >
              <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center text-sky-300">person</mat-icon>
              <span>{{ t().roles.student }}</span>
            </button>

            <button
              id="tab-role-teacher"
              type="button"
              class="py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              [class.bg-gradient-to-b]="activeTab() === 'teacher'"
              [class.from-zinc-700]="activeTab() === 'teacher'"
              [class.to-zinc-800]="activeTab() === 'teacher'"
              [class.border]="activeTab() === 'teacher'"
              [class.border-zinc-500]="activeTab() === 'teacher'"
              [class.text-white]="activeTab() === 'teacher'"
              [class.shadow-md]="activeTab() === 'teacher'"
              [class.text-zinc-400]="activeTab() !== 'teacher'"
              [class.hover:text-zinc-200]="activeTab() !== 'teacher'"
              (click)="activeTab.set('teacher')"
            >
              <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center text-purple-300">school</mat-icon>
              <span>{{ t().roles.teacher }}</span>
            </button>
          </div>
        </div>

        <!-- Form Body -->
        <div class="p-6 flex flex-col gap-4 text-xs">
          @if (errorMessage()) {
            <div class="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <mat-icon class="text-rose-400 text-sm !w-4 !h-4">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (activeTab() === 'student') {
            <!-- Student Form -->
            <div>
              <label for="input-room-code" class="block font-semibold text-zinc-300 mb-1.5">
                {{ t().login.roomCode }}
              </label>
              <input
                id="input-room-code"
                type="text"
                [value]="studentRoomCode()"
                (input)="studentRoomCode.set($any($event.target).value)"
                [placeholder]="t().login.roomCodePlaceholder"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-sm font-mono tracking-wider uppercase text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/40 shadow-inner"
              />
            </div>

            <div>
              <label for="input-student-name" class="block font-semibold text-zinc-300 mb-1.5">
                {{ t().login.studentName }}
              </label>
              <input
                id="input-student-name"
                type="text"
                [value]="studentName()"
                (input)="studentName.set($any($event.target).value)"
                [placeholder]="t().login.studentNamePlaceholder"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/40 shadow-inner"
                (keydown.enter)="joinAsStudent()"
              />
            </div>

            <button
              id="btn-submit-student"
              type="button"
              class="w-full py-3 rounded-xl bg-gradient-to-b from-zinc-700 to-zinc-850 hover:from-zinc-650 hover:to-zinc-800 text-white font-bold text-sm transition-all border border-zinc-500 shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="loading()"
              (click)="joinAsStudent()"
            >
              @if (loading()) {
                <mat-icon class="animate-spin text-base">refresh</mat-icon>
                <span>{{ t().system.loading }}</span>
              } @else {
                <mat-icon class="text-base text-sky-300">login</mat-icon>
                <span>{{ t().login.joinClass }}</span>
              }
            </button>
          } @else {
            <!-- Teacher Form -->
            <div>
              <label for="input-class-name" class="block font-semibold text-zinc-300 mb-1.5">
                {{ t().login.className }}
              </label>
              <input
                id="input-class-name"
                type="text"
                [value]="teacherClassName()"
                (input)="teacherClassName.set($any($event.target).value)"
                [placeholder]="t().login.classNamePlaceholder"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/40 shadow-inner"
              />
            </div>

            <div>
              <label for="input-teacher-name" class="block font-semibold text-zinc-300 mb-1.5">
                {{ t().login.teacherName }}
              </label>
              <input
                id="input-teacher-name"
                type="text"
                [value]="teacherName()"
                (input)="teacherName.set($any($event.target).value)"
                [placeholder]="t().login.teacherNamePlaceholder"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/40 shadow-inner"
                (keydown.enter)="createAsTeacher()"
              />
            </div>

            <button
              id="btn-submit-teacher"
              type="button"
              class="w-full py-3 rounded-xl bg-gradient-to-b from-zinc-700 to-zinc-850 hover:from-zinc-650 hover:to-zinc-800 text-white font-bold text-sm transition-all border border-zinc-500 shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="loading()"
              (click)="createAsTeacher()"
            >
              @if (loading()) {
                <mat-icon class="animate-spin text-base">refresh</mat-icon>
                <span>{{ t().system.loading }}</span>
              } @else {
                <mat-icon class="text-base text-purple-300">add_circle</mat-icon>
                <span>{{ t().login.createClass }}</span>
              }
            </button>
          }

          <!-- Quick Test Presets -->
          <!-- Quick Test Presets & Offline Mode -->
          <div class="mt-3 pt-3 border-t border-zinc-750 flex flex-col gap-1.5">
            <span class="text-[10px] uppercase font-bold tracking-wider text-zinc-400 text-center">
              {{ i18n.isDe() ? 'Schnellstart & Autonomer Modus' : 'Acceso Rápido y Modo Autónomo' }}
            </span>
            <div class="grid grid-cols-2 gap-2">
              <button
                id="btn-quick-teacher"
                type="button"
                class="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors text-center shadow-sm"
                (click)="quickStartTeacher()"
              >
                {{ i18n.isDe() ? 'Als Lehrkraft testen' : 'Probar como Docente' }}
              </button>
              <button
                id="btn-quick-student"
                type="button"
                class="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors text-center shadow-sm"
                (click)="quickStartStudent()"
              >
                {{ i18n.isDe() ? 'Als Schüler testen' : 'Probar como Alumno' }}
              </button>
            </div>

            <!-- Direct Autonomous local button (Vercel / serverless friendly) -->
            <button
              id="btn-direct-standalone"
              type="button"
              class="w-full py-2 px-3 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/70 text-sky-300 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-1"
              (click)="startOfflineSession()"
            >
              <mat-icon class="text-xs !w-3.5 !h-3.5">laptop_chromebook</mat-icon>
              <span>{{ i18n.isDe() ? 'Autonomer Modus (Kein Server nötig)' : 'Modo Autónomo Local (Ideal Vercel / Sin servidor)' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginModal {
  readonly classroom = inject(ClassroomService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;

  readonly activeTab = signal<'student' | 'teacher'>('student');
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly studentRoomCode = signal<string>('INF-101');
  readonly studentName = signal<string>('Lukas');

  readonly teacherClassName = signal<string>('Informatik Klasse 6b');
  readonly teacherName = signal<string>('Frau Weber');

  toggleLanguage(): void {
    const next = this.i18n.currentLang() === 'de' ? 'es' : 'de';
    this.i18n.setLanguage(next);
  }

  startOfflineSession(): void {
    const isTeacher = this.activeTab() === 'teacher';
    const name = isTeacher
      ? (this.teacherName().trim() || 'Frau Weber')
      : (this.studentName().trim() || 'Lukas');
    this.classroom.startStandaloneSession(isTeacher ? 'teacher' : 'student', name);
  }

  async joinAsStudent(): Promise<void> {
    const code = this.studentRoomCode().trim();
    const name = this.studentName().trim();
    if (!code || !name) {
      this.errorMessage.set('Bitte gib den Klassen-Code und deinen Vornamen ein.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const res = await this.classroom.joinClassroom(code, name);
    this.loading.set(false);

    if (!res.success) {
      this.errorMessage.set(res.error || 'Fehler beim Beitritt.');
    }
  }

  async createAsTeacher(): Promise<void> {
    const cName = this.teacherClassName().trim();
    const tName = this.teacherName().trim();
    if (!cName || !tName) {
      this.errorMessage.set('Bitte gib einen Klassen- und Lehrkraftnamen ein.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const res = await this.classroom.createClassroom(cName, tName);
    this.loading.set(false);

    if (!res.success) {
      this.errorMessage.set(res.error || 'Fehler beim Erstellen der Klasse.');
    }
  }

  async quickStartTeacher(): Promise<void> {
    this.teacherClassName.set('Informatik Klasse 6b');
    this.teacherName.set('Frau Weber');
    await this.createAsTeacher();
  }

  async quickStartStudent(): Promise<void> {
    this.studentRoomCode.set('INF-101');
    this.studentName.set('Lukas');
    const res = await this.classroom.joinClassroom('INF-101', 'Lukas');
    if (!res.success) {
      await this.classroom.createClassroom('Informatik 6b', 'Frau Weber');
      await this.classroom.joinClassroom('INF-101', 'Lukas');
    }
  }
}
