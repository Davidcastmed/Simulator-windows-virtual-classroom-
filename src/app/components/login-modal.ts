import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { FirebaseService, RegisteredUser } from '../services/firebase.service';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-login-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div
      id="login-screen-overlay"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl select-none"
    >
      <div
        id="login-card"
        class="w-full max-w-lg max-h-[95vh] overflow-y-auto no-scrollbar bg-gradient-to-b from-[#1a202c] to-[#0d1017] border border-zinc-700/90 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.14)] flex flex-col animate-in fade-in zoom-in-95 duration-200 text-zinc-200"
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
          <div class="w-13 h-13 mx-auto mb-2 rounded-2xl bg-gradient-to-tr from-zinc-700 via-zinc-800 to-zinc-700 border border-zinc-500 flex items-center justify-center text-zinc-100 shadow-xl">
            <mat-icon class="text-3xl !w-7 !h-7 flex items-center justify-center text-sky-300">desktop_windows</mat-icon>
          </div>

          <h1 class="text-xl font-extrabold text-zinc-100 tracking-tight">
            {{ t().system.appName }}
          </h1>
          <p class="text-xs text-zinc-400 mt-0.5">
            {{ t().system.appTagline }}
          </p>

          <!-- Firebase Database Badge -->
          <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-[11px] font-mono shadow-sm">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Firestore: <strong>klassenRoom</strong> / users</span>
          </div>

          <!-- Role Selector Tabs -->
          <div class="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950/80 rounded-xl border border-zinc-750 mt-4">
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
              (click)="selectRole('student')"
            >
              <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center text-sky-300">person</mat-icon>
              <span>{{ t().roles.student }} (5)</span>
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
              (click)="selectRole('teacher')"
            >
              <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center text-purple-300">school</mat-icon>
              <span>{{ t().roles.teacher }} (2)</span>
            </button>
          </div>
        </div>

        <!-- Form Body -->
        <div class="p-5 sm:p-6 flex flex-col gap-4 text-xs">
          <!-- Registered accounts quick picker -->
          <div class="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-750/90 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <mat-icon class="text-amber-400 text-xs !w-3.5 !h-3.5">verified_user</mat-icon>
                <span>{{ i18n.isDe() ? 'Registrierte Konten (Datenbank klassenRoom)' : 'Usuarios Registrados en klassenRoom' }}</span>
              </span>
              <span class="text-[10px] text-zinc-400">
                {{ activeTab() === 'student' ? (i18n.isDe() ? '5 Schüler' : '5 Estudiantes') : (i18n.isDe() ? '2 Lehrkräfte' : '2 Maestros') }}
              </span>
            </div>

            @if (activeTab() === 'student') {
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                @for (student of registeredStudents(); track student.id) {
                  <button
                    type="button"
                    class="px-2.5 py-1.5 rounded-xl border text-[11px] font-medium text-left flex items-center gap-2 transition"
                    [class.bg-sky-950/50]="studentName() === student.username"
                    [class.border-sky-500]="studentName() === student.username"
                    [class.text-sky-200]="studentName() === student.username"
                    [class.bg-zinc-800/60]="studentName() !== student.username"
                    [class.border-zinc-700]="studentName() !== student.username"
                    [class.text-zinc-300]="studentName() !== student.username"
                    [class.hover:bg-zinc-750]="studentName() !== student.username"
                    (click)="pickUser(student)"
                  >
                    <span class="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span class="font-bold truncate">{{ student.displayName }}</span>
                  </button>
                }
              </div>
            } @else {
              <div class="grid grid-cols-1 gap-1.5">
                @for (teacher of registeredTeachers(); track teacher.id) {
                  <button
                    type="button"
                    class="px-3 py-2 rounded-xl border text-[11px] font-medium text-left flex items-center gap-2 transition"
                    [class.bg-purple-950/50]="teacherName() === teacher.username"
                    [class.border-purple-500]="teacherName() === teacher.username"
                    [class.text-purple-200]="teacherName() === teacher.username"
                    [class.bg-zinc-800/60]="teacherName() !== teacher.username"
                    [class.border-zinc-700]="teacherName() !== teacher.username"
                    [class.text-zinc-300]="teacherName() !== teacher.username"
                    [class.hover:bg-zinc-750]="teacherName() !== teacher.username"
                    (click)="pickUser(teacher)"
                  >
                    <span class="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span class="font-bold truncate">{{ teacher.displayName }}</span>
                    <span class="ml-auto text-[10px] text-purple-300/80">{{ i18n.isDe() ? 'Lehrkraft' : 'Rol Maestro' }}</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Error Alert -->
          @if (errorMessage()) {
            <div class="p-3.5 bg-rose-950/70 border border-rose-700 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 shadow-md animate-in fade-in">
              <mat-icon class="text-rose-400 text-base !w-5 !h-5 shrink-0 mt-0.5">block</mat-icon>
              <div class="flex-1">
                <p class="font-bold text-rose-200 leading-tight">
                  {{ i18n.isDe() ? 'Zugriff verweigert' : 'Acceso Denegado' }}
                </p>
                <p class="text-rose-300 text-[11px] mt-1 leading-relaxed">{{ errorMessage() }}</p>
              </div>
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
              <div class="flex items-center justify-between mb-1.5">
                <label for="input-student-name" class="font-semibold text-zinc-300">
                  {{ t().login.studentName }}
                </label>
                <span class="text-[10px] text-amber-400 font-mono">
                  *{{ i18n.isDe() ? 'Muss registriert sein' : 'Solo usuarios registrados' }}
                </span>
              </div>
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
              class="w-full py-3 rounded-xl bg-gradient-to-b from-sky-600 to-sky-750 hover:from-sky-500 hover:to-sky-700 text-white font-bold text-sm transition-all border border-sky-400 shadow-lg shadow-sky-950/40 flex items-center justify-center gap-2 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="loading()"
              (click)="joinAsStudent()"
            >
              @if (loading()) {
                <mat-icon class="animate-spin text-base">refresh</mat-icon>
                <span>{{ i18n.isDe() ? 'Verifiziere Registrierung...' : 'Verificando en klassenRoom...' }}</span>
              } @else {
                <mat-icon class="text-base">lock_open</mat-icon>
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
              <div class="flex items-center justify-between mb-1.5">
                <label for="input-teacher-name" class="font-semibold text-zinc-300">
                  {{ t().login.teacherName }}
                </label>
                <span class="text-[10px] text-amber-400 font-mono">
                  *{{ i18n.isDe() ? 'Muss registriert sein' : 'Solo usuarios registrados' }}
                </span>
              </div>
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
              class="w-full py-3 rounded-xl bg-gradient-to-b from-purple-600 to-purple-750 hover:from-purple-500 hover:to-purple-700 text-white font-bold text-sm transition-all border border-purple-400 shadow-lg shadow-purple-950/40 flex items-center justify-center gap-2 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="loading()"
              (click)="createAsTeacher()"
            >
              @if (loading()) {
                <mat-icon class="animate-spin text-base">refresh</mat-icon>
                <span>{{ i18n.isDe() ? 'Verifiziere Registrierung...' : 'Verificando en klassenRoom...' }}</span>
              } @else {
                <mat-icon class="text-base">lock_open</mat-icon>
                <span>{{ t().login.createClass }}</span>
              }
            </button>
          }

          <!-- Quick Actions & Autonomous Mode -->
          <div class="mt-2 pt-3 border-t border-zinc-750 flex flex-col gap-1.5">
            <span class="text-[10px] uppercase font-bold tracking-wider text-zinc-400 text-center">
              {{ i18n.isDe() ? 'Schnellstart mit registrierten Konten' : 'Acceso Rápido con Usuarios Registrados' }}
            </span>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                id="btn-quick-teacher"
                type="button"
                class="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] sm:text-[11px] font-medium transition-colors text-center shadow-sm truncate"
                (click)="quickStartTeacher('Frau Weber')"
              >
                {{ i18n.isDe() ? 'Frau Weber' : 'Frau Weber' }}
              </button>
              <button
                id="btn-quick-teacher-bean"
                type="button"
                class="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] sm:text-[11px] font-medium transition-colors text-center shadow-sm truncate"
                (click)="quickStartTeacher('Herr Bean')"
              >
                {{ i18n.isDe() ? 'Herr Bean' : 'Herr Bean' }}
              </button>
              <button
                id="btn-quick-student"
                type="button"
                class="p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] sm:text-[11px] font-medium transition-colors text-center shadow-sm truncate"
                (click)="quickStartStudent()"
              >
                {{ i18n.isDe() ? 'Lukas (Schüler)' : 'Lukas (Alumno)' }}
              </button>
            </div>

            <button
              id="btn-direct-standalone"
              type="button"
              class="w-full py-2 px-3 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-1"
              (click)="startOfflineSession()"
            >
              <mat-icon class="text-xs !w-3.5 !h-3.5 text-zinc-400">verified</mat-icon>
              <span>{{ i18n.isDe() ? 'Lokale Sitzung (Registrierter Nutzer)' : 'Sesión Local (Usuario Registrado)' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginModal {
  readonly classroom = inject(ClassroomService);
  readonly firebase = inject(FirebaseService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;

  readonly activeTab = signal<'student' | 'teacher'>('student');
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly studentRoomCode = signal<string>('INF-101');
  readonly studentName = signal<string>('Lukas');

  readonly teacherClassName = signal<string>('Informatik Klasse 6b');
  readonly teacherName = signal<string>('Frau Weber');

  registeredStudents(): RegisteredUser[] {
    return this.firebase.getRegisteredStudents();
  }

  registeredTeachers(): RegisteredUser[] {
    return this.firebase.getRegisteredTeachers();
  }

  selectRole(role: 'student' | 'teacher'): void {
    this.activeTab.set(role);
    this.errorMessage.set('');
  }

  pickUser(user: RegisteredUser): void {
    this.errorMessage.set('');
    if (user.role === 'student') {
      this.studentName.set(user.username);
      this.studentRoomCode.set(user.roomCode || 'INF-101');
    } else {
      this.teacherName.set(user.username);
    }
  }

  toggleLanguage(): void {
    const next = this.i18n.currentLang() === 'de' ? 'es' : 'de';
    this.i18n.setLanguage(next);
  }

  async startOfflineSession(): Promise<void> {
    const isTeacher = this.activeTab() === 'teacher';
    const name = isTeacher
      ? (this.teacherName().trim() || 'Frau Weber')
      : (this.studentName().trim() || 'Lukas');

    this.loading.set(true);
    this.errorMessage.set('');

    const check = await this.firebase.verifyRegisteredUser(name, isTeacher ? 'teacher' : 'student');
    this.loading.set(false);

    if (!check.valid) {
      this.errorMessage.set(check.error || 'Acceso denegado: Usuario no registrado en la base de datos klassenRoom.');
      return;
    }

    this.classroom.startStandaloneSession(isTeacher ? 'teacher' : 'student', name);
  }

  async joinAsStudent(): Promise<void> {
    const code = this.studentRoomCode().trim();
    const name = this.studentName().trim();
    if (!code || !name) {
      this.errorMessage.set(
        this.i18n.isDe()
          ? 'Bitte gib den Klassen-Code und deinen Schülernamen ein.'
          : 'Por favor ingresa el código de clase y tu nombre de estudiante.',
      );
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    // Validación estricta contra la base de datos Firestore klassenRoom
    const check = await this.firebase.verifyRegisteredUser(name, 'student');
    if (!check.valid) {
      this.loading.set(false);
      this.errorMessage.set(
        check.error ||
          (this.i18n.isDe()
            ? `Zugriff verweigert: Der Schüler "${name}" ist nicht in der Datenbank klassenRoom registriert.`
            : `Acceso denegado: El estudiante "${name}" no está registrado en la base de datos klassenRoom.`),
      );
      return;
    }

    const res = await this.classroom.joinClassroom(code, name);
    this.loading.set(false);

    if (!res.success) {
      this.errorMessage.set(res.error || (this.i18n.isDe() ? 'Fehler beim Beitritt.' : 'Error al unirse al aula.'));
    }
  }

  async createAsTeacher(): Promise<void> {
    const cName = this.teacherClassName().trim();
    const tName = this.teacherName().trim();
    if (!cName || !tName) {
      this.errorMessage.set(
        this.i18n.isDe()
          ? 'Bitte gib einen Klassen- und Lehrkraftnamen ein.'
          : 'Por favor ingresa el nombre de la clase y el del docente.',
      );
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    // Validación estricta contra la base de datos Firestore klassenRoom
    const check = await this.firebase.verifyRegisteredUser(tName, 'teacher');
    if (!check.valid) {
      this.loading.set(false);
      this.errorMessage.set(
        check.error ||
          (this.i18n.isDe()
            ? `Zugriff verweigert: Die Lehrkraft "${tName}" ist nicht in der Datenbank klassenRoom registriert.`
            : `Acceso denegado: El docente "${tName}" no está registrado en la base de datos klassenRoom.`),
      );
      return;
    }

    const res = await this.classroom.createClassroom(cName, tName);
    this.loading.set(false);

    if (!res.success) {
      this.errorMessage.set(res.error || (this.i18n.isDe() ? 'Fehler beim Erstellen der Klasse.' : 'Error al crear la clase.'));
    }
  }

  async quickStartTeacher(name = 'Frau Weber'): Promise<void> {
    this.activeTab.set('teacher');
    this.teacherClassName.set('Informatik Klasse 6b');
    this.teacherName.set(name);
    await this.createAsTeacher();
  }

  async quickStartStudent(): Promise<void> {
    this.activeTab.set('student');
    this.studentRoomCode.set('INF-101');
    this.studentName.set('Lukas');
    const res = await this.classroom.joinClassroom('INF-101', 'Lukas');
    if (!res.success) {
      await this.classroom.createClassroom('Informatik 6b', 'Frau Weber');
      await this.classroom.joinClassroom('INF-101', 'Lukas');
    }
  }
}

