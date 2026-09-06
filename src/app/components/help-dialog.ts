import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-help-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div id="help-dialog-content" class="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-y-auto p-4 text-xs">
      <div class="mb-4">
        <h2 class="text-base font-bold text-slate-100 flex items-center gap-2">
          <mat-icon class="text-blue-400">help_outline</mat-icon>
          <span>{{ t().help.title }}</span>
        </h2>
        <p class="text-slate-400 mt-1">
          Hier findest du schnelle Erklärungen zu den wichtigsten Begriffen rund um den Computer.
        </p>
      </div>

      <!-- Help Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <!-- What is a Folder -->
        <div class="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl flex flex-col gap-1.5">
          <div class="flex items-center gap-2 text-amber-400 font-bold">
            <mat-icon class="text-base">folder</mat-icon>
            <span>{{ t().help.whatIsFolderTitle }}</span>
          </div>
          <p class="text-slate-300 leading-relaxed">
            {{ t().help.whatIsFolderDesc }}
          </p>
        </div>

        <!-- What is a File -->
        <div class="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl flex flex-col gap-1.5">
          <div class="flex items-center gap-2 text-blue-400 font-bold">
            <mat-icon class="text-base">description</mat-icon>
            <span>{{ t().help.whatIsFileTitle }}</span>
          </div>
          <p class="text-slate-300 leading-relaxed">
            {{ t().help.whatIsFileDesc }}
          </p>
        </div>

        <!-- What is a Path -->
        <div class="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl flex flex-col gap-1.5">
          <div class="flex items-center gap-2 text-purple-400 font-bold">
            <mat-icon class="text-base">alt_route</mat-icon>
            <span>{{ t().help.whatIsPathTitle }}</span>
          </div>
          <p class="text-slate-300 leading-relaxed">
            {{ t().help.whatIsPathDesc }}
          </p>
        </div>

        <!-- Recycle Bin -->
        <div class="p-3 bg-slate-800/60 border border-slate-700/70 rounded-xl flex flex-col gap-1.5">
          <div class="flex items-center gap-2 text-red-400 font-bold">
            <mat-icon class="text-base">delete</mat-icon>
            <span>{{ t().help.whatIsRecycleBinTitle }}</span>
          </div>
          <p class="text-slate-300 leading-relaxed">
            {{ t().help.whatIsRecycleBinDesc }}
          </p>
        </div>
      </div>

      <!-- Shortcuts Section -->
      <div class="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl mb-4">
        <h3 class="font-bold text-slate-200 mb-2 flex items-center gap-2">
          <mat-icon class="text-emerald-400 text-base">keyboard</mat-icon>
          <span>{{ t().help.shortcutsTitle }}</span>
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
          <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
            <span class="text-blue-400 font-bold">Strg + C</span>
            <div class="text-slate-400 font-sans text-[10px] mt-0.5">Kopieren</div>
          </div>
          <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
            <span class="text-blue-400 font-bold">Strg + X</span>
            <div class="text-slate-400 font-sans text-[10px] mt-0.5">Ausschneiden</div>
          </div>
          <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
            <span class="text-blue-400 font-bold">Strg + V</span>
            <div class="text-slate-400 font-sans text-[10px] mt-0.5">Einfügen</div>
          </div>
          <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
            <span class="text-blue-400 font-bold">Strg + Z</span>
            <div class="text-slate-400 font-sans text-[10px] mt-0.5">Rückgängig</div>
          </div>
        </div>
      </div>

      <!-- Need Help from Teacher -->
      @if (classroom.isStudent()) {
        <div class="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between gap-3">
          <div>
            <h4 class="font-bold text-blue-200">{{ t().help.needTeacherHelp }}</h4>
            <p class="text-slate-400 text-[11px] mt-0.5">
              Klicke auf den Knopf, damit die Lehrkraft auf ihrem Bildschirm sieht, dass du Unterstützung brauchst.
            </p>
          </div>
          <button
            type="button"
            class="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center gap-1.5 shrink-0 shadow-md"
            (click)="raiseHand()"
          >
            <mat-icon class="text-sm">pan_tool</mat-icon>
            <span>Hand heben</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class HelpDialog {
  readonly classroom = inject(ClassroomService);
  readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;

  raiseHand(): void {
    this.classroom.requestHelp();
    alert('Die Lehrkraft wurde benachrichtigt!');
  }
}
