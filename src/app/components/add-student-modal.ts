import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

interface ColorOption {
  hex: string;
  name: string;
}

const TEAMS_AVATAR_COLORS: ColorOption[] = [
  { hex: '#0078d4', name: 'Azul Teams' },
  { hex: '#107c41', name: 'Verde Excel' },
  { hex: '#d83b01', name: 'Naranja Cálido' },
  { hex: '#8764b8', name: 'Morado Teams' },
  { hex: '#008272', name: 'Verde Azulado' },
  { hex: '#b4009e', name: 'Magenta' },
];

@Component({
  selector: 'app-add-student-modal',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      id="add-student-modal-backdrop"
      class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-modal-title"
      tabindex="-1"
      (keydown.escape)="classroom.closeAddStudentModal()"
    >
      <!-- Accessible Backdrop Click Catcher -->
      <button
        type="button"
        class="fixed inset-0 w-full h-full cursor-default bg-transparent border-0 -z-10 focus:outline-none"
        (click)="classroom.closeAddStudentModal()"
        tabindex="-1"
        aria-hidden="true"
      ></button>

      <div
        id="add-student-modal-dialog"
        class="relative z-10 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 text-slate-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <!-- Modal Header (Microsoft Teams Style) -->
        <div class="px-5 py-4 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <mat-icon class="text-xl !w-5 !h-5 flex items-center justify-center">person_add</mat-icon>
            </div>
            <div>
              <h2 id="add-student-modal-title" class="text-sm font-bold text-white flex items-center gap-2">
                <span>{{ isDe() ? 'Schüler hinzufügen' : 'Agregar Estudiante' }}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">INF-101</span>
              </h2>
              <p class="text-[11px] text-slate-400">
                {{ isDe() ? 'Neuen Teilnehmer im vernetzten Klassenraum anlegen' : 'Añade un nuevo alumno con espacio de trabajo sincronizado' }}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            (click)="classroom.closeAddStudentModal()"
            title="Cerrar"
          >
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>

        <!-- Form Body -->
        <form (submit)="onSubmit($event)" class="p-5 space-y-4">
          <!-- Student Name Input -->
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5" for="input-student-name">
              {{ isDe() ? 'Vollständiger Name des Schülers:' : 'Nombre del Estudiante:' }}
            </label>
            <div class="relative">
              <input
                #nameInput
                id="input-student-name"
                type="text"
                [value]="studentName()"
                (input)="studentName.set($any($event.target).value)"
                [placeholder]="isDe() ? 'z. B. Sofia, David, Laura...' : 'Ej. Sofía, Mateo, Valentina...'"
                autocomplete="off"
                maxlength="30"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition shadow-inner placeholder-slate-500"
              />
              @if (studentName().trim()) {
                <button
                  type="button"
                  (click)="studentName.set('')"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <mat-icon class="text-sm !w-4 !h-4 flex items-center justify-center">cancel</mat-icon>
                </button>
              }
            </div>
          </div>

          <!-- Color Avatar Picker (Teams Style) -->
          <div>
            <span class="block text-xs font-semibold text-slate-300 mb-2">
              {{ isDe() ? 'Avatar-Farbe (Teams-Stil):' : 'Color de Avatar (Estilo Teams):' }}
            </span>
            <div class="flex items-center gap-2.5">
              @for (c of avatarColors; track c.hex) {
                <button
                  type="button"
                  (click)="selectedColor.set(c.hex)"
                  class="w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-150 relative shadow-sm"
                  [style.background-color]="c.hex"
                  [class.ring-2]="selectedColor() === c.hex"
                  [class.ring-white]="selectedColor() === c.hex"
                  [class.ring-offset-2]="selectedColor() === c.hex"
                  [class.ring-offset-slate-900]="selectedColor() === c.hex"
                  [class.scale-110]="selectedColor() === c.hex"
                  [title]="c.name"
                >
                  @if (selectedColor() === c.hex) {
                    <mat-icon class="text-white text-sm !w-4 !h-4 flex items-center justify-center font-bold">check</mat-icon>
                  }
                </button>
              }
            </div>
          </div>

          <!-- Initial Active App / Workspace Assignment -->
          <div>
            <span class="block text-xs font-semibold text-slate-300 mb-2">
              {{ isDe() ? 'Start-Aktivität im Unterricht:' : 'Actividad Inicial en Clase:' }}
            </span>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="selectedApp.set('paint')"
                class="p-2.5 rounded-xl border flex items-center gap-2 text-xs transition"
                [class]="selectedApp() === 'paint' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'"
              >
                <span class="text-base">🎨</span>
                <div class="text-left">
                  <div class="font-bold text-slate-200">Paint</div>
                  <div class="text-[10px] text-slate-400">Dibujo & Pixel Art</div>
                </div>
              </button>

              <button
                type="button"
                (click)="selectedApp.set('coding')"
                class="p-2.5 rounded-xl border flex items-center gap-2 text-xs transition"
                [class]="selectedApp() === 'coding' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'"
              >
                <span class="text-base">🤖</span>
                <div class="text-left">
                  <div class="font-bold text-slate-200">RoboCode</div>
                  <div class="text-[10px] text-slate-400">Bloques y Lógica</div>
                </div>
              </button>

              <button
                type="button"
                (click)="selectedApp.set('explorer')"
                class="p-2.5 rounded-xl border flex items-center gap-2 text-xs transition"
                [class]="selectedApp() === 'explorer' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'"
              >
                <span class="text-base">📁</span>
                <div class="text-left">
                  <div class="font-bold text-slate-200">Explorador</div>
                  <div class="text-[10px] text-slate-400">Archivos /Klasse</div>
                </div>
              </button>

              <button
                type="button"
                (click)="selectedApp.set('logic-games')"
                class="p-2.5 rounded-xl border flex items-center gap-2 text-xs transition"
                [class]="selectedApp() === 'logic-games' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'"
              >
                <span class="text-base">🍄</span>
                <div class="text-left">
                  <div class="font-bold text-slate-200">Zeek the Geek</div>
                  <div class="text-[10px] text-slate-400">Juego de lógica</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Live Preview Card (Teams Style) -->
          <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div class="relative">
              <div
                class="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md"
                [style.background-color]="selectedColor()"
              >
                {{ getInitials(studentName() || 'Nuevo Alumno') }}
              </div>
              <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-black" title="Disponible">
                ✓
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold text-slate-100 truncate">
                {{ studentName().trim() || (isDe() ? 'Name des Schülers' : 'Nombre del estudiante') }}
              </div>
              <div class="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <span>🟢 {{ isDe() ? 'Verfügbar' : 'Disponible' }}</span>
                <span class="text-slate-500">•</span>
                <span class="text-slate-400">/Klasse/{{ studentName().trim() || 'Alumno' }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              (click)="classroom.closeAddStudentModal()"
            >
              {{ isDe() ? 'Abbrechen' : 'Cancelar' }}
            </button>
            <button
              type="submit"
              [disabled]="!studentName().trim() || isSubmitting()"
              class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
            >
              <mat-icon class="text-base !w-4 !h-4 flex items-center justify-center">person_add</mat-icon>
              <span>{{ isSubmitting() ? (isDe() ? 'Wird gespeichert...' : 'Guardando...') : (isDe() ? 'Schüler anlegen' : 'Agregar Estudiante') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class AddStudentModal {
  readonly classroom = inject(ClassroomService);
  readonly i18n = inject(I18nService);

  readonly isDe = this.i18n.isDe;
  readonly avatarColors = TEAMS_AVATAR_COLORS;

  readonly studentName = signal<string>('');
  readonly selectedColor = signal<string>(TEAMS_AVATAR_COLORS[0].hex);
  readonly selectedApp = signal<string>('paint');
  readonly isSubmitting = signal<boolean>(false);

  readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  getInitials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.trim().slice(0, 2) || 'ST').toUpperCase();
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.studentName().trim();
    if (!name || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    try {
      await this.classroom.addStudent(name, {
        currentApp: this.selectedApp(),
        avatarColor: this.selectedColor(),
      });
      this.studentName.set('');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
