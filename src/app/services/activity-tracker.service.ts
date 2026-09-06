import { Injectable, computed, inject, signal } from '@angular/core';
import { ClassroomService } from './classroom.service';
import { I18nService } from './i18n.service';

@Injectable({
  providedIn: 'root',
})
export class ActivityTrackerService {
  private readonly classroomService = inject(ClassroomService);
  private readonly i18n = inject(I18nService);

  // Drawing metrics updated from Paint component
  readonly drawingMetrics = signal<{ colorCount: number; shapeCount: number; hasDrawn: boolean }>({
    colorCount: 0,
    shapeCount: 0,
    hasDrawn: false,
  });

  // Current folder navigated to in Explorer
  readonly currentExplorerPath = signal<string>('/');

  // Paint app opened state
  readonly paintOpened = signal<boolean>(false);

  // Step 1: Open personal folder
  readonly step1 = computed(() => {
    const user = this.classroomService.currentUser();
    if (!user || user.role !== 'student') return false;
    const path = this.currentExplorerPath();
    const userFolder = `/Klasse/${user.name}`;
    return path.startsWith(userFolder);
  });

  // Step 2: Create subfolder "Meine Zeichnungen" (or "Mis dibujos")
  readonly step2 = computed(() => {
    const user = this.classroomService.currentUser();
    const room = this.classroomService.classroom();
    if (!user || !room) return false;

    const target1 = `/Klasse/${user.name}/Meine Zeichnungen`;
    const target2 = `/Klasse/${user.name}/Mis dibujos`;
    const target3 = `/Klasse/${user.name}/Zeichnungen`;

    return !!(room.files[target1] || room.files[target2] || room.files[target3]);
  });

  // Step 3: Open Paint app
  readonly step3 = computed(() => {
    return this.paintOpened();
  });

  // Step 4: Draw house with >= 3 colors and >= 2 shapes
  readonly step4 = computed(() => {
    const m = this.drawingMetrics();
    return m.hasDrawn && m.colorCount >= 3 && m.shapeCount >= 2;
  });

  // Step 5: Save drawing as "Mein Haus" in "Meine Zeichnungen"
  readonly step5 = computed(() => {
    const user = this.classroomService.currentUser();
    const room = this.classroomService.classroom();
    if (!user || !room) return false;

    for (const [path, file] of Object.entries(room.files)) {
      if (
        path.startsWith(`/Klasse/${user.name}`) &&
        (path.includes('Zeichnungen') || path.includes('dibujos')) &&
        (file.name.toLowerCase().includes('haus') || file.name.toLowerCase().includes('casa'))
      ) {
        return true;
      }
    }
    return false;
  });

  // Step 6: Create folder "Fertige Arbeiten" (or "Trabajo terminado")
  readonly step6 = computed(() => {
    const user = this.classroomService.currentUser();
    const room = this.classroomService.classroom();
    if (!user || !room) return false;

    const target1 = `/Klasse/${user.name}/Fertige Arbeiten`;
    const target2 = `/Klasse/${user.name}/Trabajo terminado`;
    const target3 = `/Klasse/${user.name}/Fertig`;

    return !!(room.files[target1] || room.files[target2] || room.files[target3]);
  });

  // Step 7: Move drawing into "Fertige Arbeiten"
  readonly step7 = computed(() => {
    const user = this.classroomService.currentUser();
    const room = this.classroomService.classroom();
    if (!user || !room) return false;

    for (const [path, file] of Object.entries(room.files)) {
      if (
        path.startsWith(`/Klasse/${user.name}`) &&
        (path.includes('Fertige Arbeiten') || path.includes('Trabajo terminado') || path.includes('Fertig')) &&
        (file.name.toLowerCase().includes('haus') || file.name.toLowerCase().includes('casa'))
      ) {
        return true;
      }
    }
    return false;
  });

  readonly stepStatusList = computed<boolean[]>(() => [
    this.step1(),
    this.step2(),
    this.step3(),
    this.step4(),
    this.step5(),
    this.step6(),
    this.step7(),
  ]);

  readonly completedCount = computed(() => {
    return this.stepStatusList().filter(Boolean).length;
  });

  readonly allCompleted = computed(() => {
    return this.completedCount() === 7;
  });

  readonly currentStepNumber = computed(() => {
    const list = this.stepStatusList();
    const idx = list.findIndex((s) => !s);
    return idx === -1 ? 7 : idx + 1;
  });

  recordPaintActivity(metrics: { colorCount: number; shapeCount: number; hasDrawn: boolean }): void {
    this.paintOpened.set(true);
    this.drawingMetrics.set(metrics);
    this.syncProgressToTeacher();
  }

  recordExplorerNavigation(path: string): void {
    this.currentExplorerPath.set(path);
    this.syncProgressToTeacher();
  }

  private syncProgressToTeacher(): void {
    this.classroomService.sendHeartbeat({
      taskProgress: this.completedCount(),
      currentPath: this.currentExplorerPath(),
    });
  }
}
