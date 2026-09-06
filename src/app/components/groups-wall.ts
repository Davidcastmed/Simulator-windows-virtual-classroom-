import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { WindowManagerService } from '../services/window-manager.service';
import { I18nService } from '../services/i18n.service';

@Component({
  selector: 'app-groups-wall',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div id="groups-wall-root" class="flex flex-col h-full bg-slate-900 text-slate-100 font-sans select-none overflow-hidden">
      <!-- Top Navigation Tabs -->
      <header class="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700/80 shrink-0">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-lg text-sm font-semibold">
            <mat-icon class="text-base leading-none">diversity_3</mat-icon>
            <span>{{ t().groupsWall.title }}</span>
          </div>

          <!-- Switcher Tabs: Live Wall vs Teams -->
          <div class="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              id="tab-live-wall"
              (click)="activeTab.set('wall')"
              class="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition"
              [class.bg-violet-600]="activeTab() === 'wall'"
              [class.text-white]="activeTab() === 'wall'"
              [class.text-slate-400]="activeTab() !== 'wall'"
              [class.hover:text-slate-200]="activeTab() !== 'wall'"
            >
              <mat-icon class="text-sm">dashboard</mat-icon>
              <span>{{ t().groupsWall.tabLiveWall }}</span>
            </button>

            <button
              type="button"
              id="tab-teams"
              (click)="activeTab.set('teams')"
              class="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition"
              [class.bg-violet-600]="activeTab() === 'teams'"
              [class.text-white]="activeTab() === 'teams'"
              [class.text-slate-400]="activeTab() !== 'teams'"
              [class.hover:text-slate-200]="activeTab() !== 'teams'"
            >
              <mat-icon class="text-sm">groups</mat-icon>
              <span>{{ t().groupsWall.tabTeams }}</span>
              @if (classroomService.groups().length > 0) {
                <span class="px-1.5 py-0.2 bg-violet-500/30 text-violet-300 text-[10px] rounded-full font-mono">
                  {{ classroomService.groups().length }}
                </span>
              }
            </button>
          </div>
        </div>

        <!-- Right Side: Online Counter and My Team Badge -->
        <div class="flex items-center gap-3 text-xs">
          @if (classroomService.myGroup(); as mg) {
            <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-300">
              <mat-icon class="text-sm text-amber-400">{{ mg.icon }}</mat-icon>
              <span>{{ isDe() ? 'Dein Team:' : 'Tu equipo:' }} <strong class="text-white">{{ mg.name }}</strong></span>
            </div>
          }

          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{{ classroomService.students().length }} {{ t().groupsWall.activeStudents }}</span>
          </div>
        </div>
      </header>

      <!-- Sub-banner: Didactic Explanation -->
      <div class="flex items-center justify-between px-4 py-1.5 bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 shrink-0">
        @if (activeTab() === 'wall') {
          <p class="truncate">{{ t().groupsWall.liveWallSubtitle }}</p>
        } @else {
          <p class="truncate">{{ t().groupsWall.teamsSubtitle }}</p>
        }
      </div>

      <!-- Main Content Container -->
      <div class="flex-1 p-4 overflow-y-auto bg-slate-950/80">
        <!-- ============================================== -->
        <!-- VIEW 1: LIVE CLASS WALL (Ver a los demás) -->
        <!-- ============================================== -->
        @if (activeTab() === 'wall') {
          <div class="max-w-6xl mx-auto space-y-4">
            <!-- Active Students Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              @for (student of classroomService.students(); track student.id) {
                <div
                  [id]="'student-card-' + student.id"
                  class="bg-slate-900 border rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-md hover:border-slate-600 transition"
                  [class.border-indigo-500]="student.id === classroomService.currentUser()?.id"
                  [class.border-slate-800]="student.id !== classroomService.currentUser()?.id"
                >
                  <!-- Top: Avatar, Name, Status Badge -->
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm">
                          {{ student.name.charAt(0).toUpperCase() }}
                        </div>
                        <div>
                          <div class="flex items-center gap-1.5">
                            <h4 class="text-sm font-bold text-slate-200 leading-none">{{ student.name }}</h4>
                            @if (student.id === classroomService.currentUser()?.id) {
                              <span class="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[10px] rounded font-medium border border-indigo-500/30">{{ isDe() ? 'Du' : 'Tú' }}</span>
                            }
                          </div>
                          <!-- Student Team Badge if joined one -->
                          @if (getStudentGroupName(student.groupId); as groupName) {
                            <span class="text-[11px] text-amber-400 flex items-center gap-1 mt-0.5">
                              <mat-icon class="text-xs">shield</mat-icon>
                              <span>{{ groupName }}</span>
                            </span>
                          }
                        </div>
                      </div>

                      <!-- Hand Raised Badge if any -->
                      @if (student.isHandRaised) {
                        <span class="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-semibold flex items-center gap-1 animate-bounce">
                          <span>✋</span>
                          <span>{{ isDe() ? 'Frage' : 'Duda' }}</span>
                        </span>
                      }
                    </div>

                    <!-- What the student is doing right now -->
                    <div class="p-2 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                      <mat-icon class="text-base text-cyan-400 shrink-0">
                        {{ getAppIcon(student.currentApp) }}
                      </mat-icon>
                      <div class="truncate">
                        <span class="text-slate-400 text-[10px] block uppercase font-mono">{{ isDe() ? 'Aktuelle Aktivität:' : 'Actividad en curso:' }}</span>
                        <span class="font-medium text-slate-200">
                          {{ student.activityDetail || student.currentApp || (isDe() ? 'Auf dem Desktop' : 'En el Escritorio') }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Bottom: Peer Encouragement Reactions -->
                  <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <!-- Received Reactions Counter -->
                    <div class="flex items-center gap-1.5 text-xs text-slate-400">
                      @if (student.reactionsReceived) {
                        @if (student.reactionsReceived.bravo > 0) {
                          <span class="px-1.5 py-0.5 bg-slate-800 rounded text-[11px]">👏 {{ student.reactionsReceived.bravo }}</span>
                        }
                        @if (student.reactionsReceived.star > 0) {
                          <span class="px-1.5 py-0.5 bg-slate-800 rounded text-[11px]">⭐ {{ student.reactionsReceived.star }}</span>
                        }
                        @if (student.reactionsReceived.idea > 0) {
                          <span class="px-1.5 py-0.5 bg-slate-800 rounded text-[11px]">💡 {{ student.reactionsReceived.idea }}</span>
                        }
                        @if (student.reactionsReceived.rocket > 0) {
                          <span class="px-1.5 py-0.5 bg-slate-800 rounded text-[11px]">🚀 {{ student.reactionsReceived.rocket }}</span>
                        }
                      }
                    </div>

                    <!-- Reaction Buttons (if not oneself) -->
                    @if (student.id !== classroomService.currentUser()?.id) {
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          (click)="sendReaction(student.id, 'bravo')"
                          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs flex items-center justify-center transition border border-slate-700/60"
                          title="¡Bravo!"
                        >
                          👏
                        </button>
                        <button
                          type="button"
                          (click)="sendReaction(student.id, 'star')"
                          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs flex items-center justify-center transition border border-slate-700/60"
                          title="¡Estrella!"
                        >
                          ⭐
                        </button>
                        <button
                          type="button"
                          (click)="sendReaction(student.id, 'idea')"
                          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs flex items-center justify-center transition border border-slate-700/60"
                          title="¡Buena idea!"
                        >
                          💡
                        </button>
                        <button
                          type="button"
                          (click)="sendReaction(student.id, 'rocket')"
                          class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs flex items-center justify-center transition border border-slate-700/60"
                          title="¡A tope!"
                        >
                          🚀
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            @if (classroomService.students().length === 0) {
              <div class="text-center py-12 text-slate-500">
                <mat-icon class="text-5xl text-slate-600 mb-2">person_off</mat-icon>
                <p>{{ t().groupsWall.noStudentsYet }}</p>
              </div>
            }
          </div>
        }

        <!-- ============================================== -->
        <!-- VIEW 2: TEAMS & COLLABORATION (Grupos) -->
        <!-- ============================================== -->
        @if (activeTab() === 'teams') {
          <div class="max-w-6xl mx-auto space-y-5">
            <!-- Create Team Section Trigger / Form -->
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-bold text-slate-200">{{ t().groupsWall.teamsTitle }}</h3>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Organízate con tus compañeros. Cada equipo tiene una carpeta compartida en el Explorador para guardar archivos juntos.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-toggle-create-team"
                  (click)="toggleCreateForm()"
                  class="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <mat-icon class="text-base">{{ showCreateForm() ? 'close' : 'add' }}</mat-icon>
                  <span>{{ showCreateForm() ? 'Cancelar' : t().groupsWall.createTeam }}</span>
                </button>
              </div>

              <!-- Create Team Form -->
              @if (showCreateForm()) {
                <form [formGroup]="teamForm" (ngSubmit)="onCreateTeam()" class="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div class="md:col-span-2">
                    <label for="team-name-input" class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      {{ t().groupsWall.teamName }}
                    </label>
                    <input
                      id="team-name-input"
                      type="text"
                      formControlName="name"
                      [placeholder]="t().groupsWall.teamNamePlaceholder"
                      class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      {{ t().groupsWall.teamIcon }}
                    </span>
                    <div class="flex items-center gap-1">
                      @for (ic of ['rocket_launch', 'science', 'palette', 'sports_esports', 'terminal']; track ic) {
                        <button
                          type="button"
                          (click)="teamForm.patchValue({ icon: ic })"
                          class="w-8 h-8 rounded-lg flex items-center justify-center border transition"
                          [class.bg-violet-600]="teamForm.value.icon === ic"
                          [class.border-violet-400]="teamForm.value.icon === ic"
                          [class.bg-slate-800]="teamForm.value.icon !== ic"
                          [class.border-slate-700]="teamForm.value.icon !== ic"
                        >
                          <mat-icon class="text-sm">{{ ic }}</mat-icon>
                        </button>
                      }
                    </div>
                  </div>

                  <div class="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      [disabled]="teamForm.invalid || isSubmitting()"
                      class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow transition"
                    >
                      Fundar Equipo
                    </button>
                  </div>
                </form>
              }
            </div>

            <!-- Existing Teams List -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (grp of classroomService.groups(); track grp.id) {
                <div
                  [id]="'team-card-' + grp.id"
                  class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-md"
                  [class.border-violet-500]="isMyTeam(grp.id)"
                >
                  <!-- Team Header -->
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 flex items-center justify-center">
                          <mat-icon class="text-xl">{{ grp.icon }}</mat-icon>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <h4 class="text-sm font-bold text-white">{{ grp.name }}</h4>
                            @if (isMyTeam(grp.id)) {
                              <span class="px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full text-[10px] font-semibold">
                                {{ isDe() ? 'Mein Team' : 'Mi Equipo' }}
                              </span>
                            }
                          </div>
                          <p class="text-[11px] text-slate-400">
                            {{ grp.members.length }} {{ t().groupsWall.members }} • {{ isDe() ? 'Erstellt von' : 'Creado por' }} {{ grp.creatorName }}
                          </p>
                        </div>
                      </div>

                      @if (!isMyTeam(grp.id)) {
                        <button
                          type="button"
                          (click)="joinGroup(grp.id)"
                          class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition"
                        >
                          {{ t().groupsWall.joinTeam }}
                        </button>
                      }
                    </div>

                    <!-- Members Badges List -->
                    <div class="flex flex-wrap items-center gap-1.5 mb-3">
                      @for (member of grp.members; track member.id) {
                        <span class="px-2 py-0.5 bg-slate-800/80 border border-slate-700/60 rounded-md text-[11px] text-slate-300 flex items-center gap-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>{{ member.name }}</span>
                        </span>
                      }
                      @if (grp.members.length === 0) {
                        <span class="text-xs text-slate-500 italic">{{ isDe() ? 'Noch keine Mitglieder.' : 'Sin miembros aún.' }}</span>
                      }
                    </div>

                    <!-- Shared Team Folder Button -->
                    <button
                      type="button"
                      (click)="openTeamFolder(grp.folderPath)"
                      class="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 mb-3"
                    >
                      <mat-icon class="text-base text-amber-400">folder_shared</mat-icon>
                      <span>{{ t().groupsWall.openTeamFolder }}</span>
                    </button>

                    <!-- Team Notes Board -->
                    <div class="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <mat-icon class="text-xs text-amber-400">sticky_note_2</mat-icon>
                          <span>{{ t().groupsWall.teamNotesTitle }}</span>
                        </span>
                      </div>

                      <!-- Notes list -->
                      <div class="space-y-1.5 max-h-32 overflow-y-auto mb-2 pr-1">
                        @for (note of grp.notes; track note.id) {
                          <div class="p-2 bg-slate-900/90 border border-slate-800 rounded-md text-xs">
                            <div class="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <strong class="text-slate-300">{{ note.author }}</strong>
                              <span>{{ note.timestamp | date:'shortTime' }}</span>
                            </div>
                            <p class="text-slate-200">{{ note.text }}</p>
                          </div>
                        }
                        @if (grp.notes.length === 0) {
                          <p class="text-[11px] text-slate-500 italic py-1 text-center">
                            {{ isDe() ? 'Noch keine Notizen. Schreibe die erste Idee für dein Team!' : 'Aún no hay notas. ¡Escribe la primera idea para tu equipo!' }}
                          </p>
                        }
                      </div>

                      <!-- Add note input -->
                      <div class="flex items-center gap-1.5">
                        <input
                          type="text"
                          #noteInput
                          (keydown.enter)="addNote(grp.id, noteInput.value); noteInput.value = ''"
                          [placeholder]="t().groupsWall.notePlaceholder"
                          class="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                        />
                        <button
                          type="button"
                          (click)="addNote(grp.id, noteInput.value); noteInput.value = ''"
                          class="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-xs font-semibold transition"
                        >
                          {{ t().groupsWall.addNote }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }

              @if (classroomService.groups().length === 0) {
                <div class="col-span-2 text-center py-10 text-slate-500">
                  <mat-icon class="text-5xl text-slate-600 mb-2">groups</mat-icon>
                  <p>{{ t().groupsWall.noTeamsYet }}</p>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class GroupsWall implements OnInit {
  readonly classroomService = inject(ClassroomService);
  private readonly windowManager = inject(WindowManagerService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;
  readonly activeTab = signal<'wall' | 'teams'>('wall');
  readonly showCreateForm = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  readonly teamForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    icon: new FormControl('rocket_launch', [Validators.required]),
  });

  ngOnInit(): void {
    this.classroomService.reportActivity(
      'Muro de la Clase',
      'Viendo Muro y Equipos',
    );
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
  }

  isMyTeam(groupId: string): boolean {
    return this.classroomService.myGroup()?.id === groupId;
  }

  getStudentGroupName(groupId?: string): string | null {
    if (!groupId) return null;
    const grp = this.classroomService.groups().find((g) => g.id === groupId);
    return grp ? grp.name : null;
  }

  getAppIcon(app?: string): string {
    switch (app) {
      case 'RoboCode':
      case 'coding':
        return 'terminal';
      case 'Juegos de Lógica':
      case 'logic-games':
        return 'videogame_asset';
      case 'Paint':
      case 'paint':
        return 'brush';
      case 'Explorer':
      case 'explorer':
        return 'folder';
      case 'Lernaufgaben':
      case 'activities':
        return 'task_alt';
      default:
        return 'computer';
    }
  }

  async sendReaction(
    toStudentId: string,
    type: 'bravo' | 'star' | 'idea' | 'rocket',
  ): Promise<void> {
    await this.classroomService.sendPeerReaction(toStudentId, type);
  }

  async onCreateTeam(): Promise<void> {
    if (this.teamForm.invalid) return;
    this.isSubmitting.set(true);

    const name = this.teamForm.value.name || '';
    const icon = this.teamForm.value.icon || 'groups';

    const res = await this.classroomService.createGroup(name, icon, 'blue');
    this.isSubmitting.set(false);

    if (res.success) {
      this.teamForm.reset({ name: '', icon: 'rocket_launch' });
      this.showCreateForm.set(false);
    }
  }

  async joinGroup(groupId: string): Promise<void> {
    await this.classroomService.joinGroup(groupId);
  }

  async addNote(groupId: string, text: string): Promise<void> {
    const clean = text.trim();
    if (!clean) return;
    await this.classroomService.addGroupNote(groupId, clean);
  }

  openTeamFolder(path: string): void {
    this.windowManager.openWindow('explorer', undefined, {
      initialPath: path,
      forceNew: true,
    });
  }
}
