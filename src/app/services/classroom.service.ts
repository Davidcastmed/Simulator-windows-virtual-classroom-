import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ChatMessage,
  ClassroomState,
  UserSession,
  VirtualItem,
  WhiteboardStamp,
  WhiteboardStroke,
} from '../models/classroom.types';

const STORAGE_SESSION_KEY = 'klassendesktop_session';
const STORAGE_ROOM_KEY = 'klassendesktop_room_code';

@Injectable({
  providedIn: 'root',
})
export class ClassroomService {
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<UserSession | null>(null);
  readonly classroom = signal<ClassroomState | null>(null);
  readonly connectionStatus = signal<'connected' | 'connecting' | 'disconnected'>('disconnected');
  readonly syncStatus = signal<'saved' | 'saving' | 'error'>('saved');

  // Clipboard for copy / cut
  readonly clipboard = signal<{ item: VirtualItem; isCut: boolean } | null>(null);

  // Quick pointers
  readonly isTeacher = computed(() => this.currentUser()?.role === 'teacher');
  readonly isStudent = computed(() => this.currentUser()?.role === 'student');
  readonly isDemoActive = computed(() => !!this.classroom()?.demoMode.active);
  readonly isController = computed(() => {
    const user = this.currentUser();
    const demo = this.classroom()?.demoMode;
    if (!demo?.active || !user) return false;
    return demo.controlledBy === user.id;
  });

  readonly isBeingObserved = computed(() => {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || user.role !== 'student' || !room) return false;
    return room.observingStudentId === user.id;
  });

  readonly students = computed(() => this.classroom()?.students || []);
  readonly groups = computed(() => this.classroom()?.groups || []);
  readonly reactions = computed(() => this.classroom()?.reactions || []);
  readonly myGroup = computed(() => {
    const me = this.currentUser();
    if (!me) return null;
    return this.groups().find((g) => g.members.some((m) => m.id === me.id)) || null;
  });

  readonly chatMessages = computed(() => this.classroom()?.chatMessages || []);
  readonly whiteboardStrokes = computed(() => this.classroom()?.whiteboardStrokes || []);
  readonly whiteboardStamps = computed(() => this.classroom()?.whiteboardStamps || []);

  readonly onlineStudents = computed(() => {
    const list = this.students();
    const now = Date.now();
    return list.map((s) => ({
      ...s,
      isOnline: now - (s.lastActive || 0) < 60000,
    }));
  });

  readonly activePeersCount = computed(() => {
    const list = this.onlineStudents().filter((s) => s.isOnline);
    // Add teacher if connected
    return list.length + (this.classroom()?.teacherId ? 1 : 0);
  });

  private eventSource: EventSource | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.restoreSessionFromStorage();
  }

  private restoreSessionFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
      const savedRoomCode = localStorage.getItem(STORAGE_ROOM_KEY);
      if (savedSession && savedRoomCode) {
        const user: UserSession = JSON.parse(savedSession);
        this.currentUser.set(user);
        this.fetchClassroomState(savedRoomCode).then((success) => {
          if (success) {
            this.connectEventStream(savedRoomCode);
            this.startHeartbeat();
          } else {
            this.clearSessionStorage();
          }
        });
      }
    } catch (e) {
      console.error('Error restoring session:', e);
    }
  }

  private saveSessionToStorage(user: UserSession, roomCode: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      localStorage.setItem(STORAGE_ROOM_KEY, roomCode);
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  private clearSessionStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_ROOM_KEY);
    } catch {
      // Storage unavailable
    }
  }

  async createClassroom(className: string, teacherName: string): Promise<{ success: boolean; error?: string }> {
    this.syncStatus.set('saving');
    try {
      const res = await this.http
        .post<{ success: boolean; code: string; room: ClassroomState; teacher: UserSession }>(
          '/api/classroom/create',
          { name: className, teacherName },
        )
        .toPromise();

      if (res && res.success) {
        this.currentUser.set(res.teacher);
        this.classroom.set(res.room);
        this.saveSessionToStorage(res.teacher, res.code);
        this.connectEventStream(res.code);
        this.startHeartbeat();
        this.syncStatus.set('saved');
        return { success: true };
      }
      this.syncStatus.set('error');
      return { success: false, error: 'Konnte Klasse nicht erstellen.' };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Verbindungsfehler.' };
    }
  }

  async joinClassroom(code: string, studentName: string): Promise<{ success: boolean; error?: string }> {
    this.syncStatus.set('saving');
    try {
      const res = await this.http
        .post<{ success: boolean; code: string; student: UserSession; room: ClassroomState }>(
          '/api/classroom/join',
          { code: code.toUpperCase().trim(), studentName: studentName.trim() },
        )
        .toPromise();

      if (res && res.success) {
        this.currentUser.set(res.student);
        this.classroom.set(res.room);
        this.saveSessionToStorage(res.student, res.code);
        this.connectEventStream(res.code);
        this.startHeartbeat();
        this.syncStatus.set('saved');
        return { success: true };
      }
      this.syncStatus.set('error');
      return { success: false, error: 'Beitritt fehlgeschlagen.' };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Klassenraum nicht gefunden.' };
    }
  }

  leaveClassroom(): void {
    this.stopHeartbeat();
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.currentUser.set(null);
    this.classroom.set(null);
    this.connectionStatus.set('disconnected');
    this.clearSessionStorage();
  }

  async fetchClassroomState(code: string): Promise<boolean> {
    try {
      const room = await this.http.get<ClassroomState>(`/api/classroom/${code}/state`).toPromise();
      if (room) {
        this.classroom.set(room);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private connectEventStream(code: string): void {
    if (typeof window === 'undefined') return;
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.connectionStatus.set('connecting');
    const es = new EventSource(`/api/classroom/${code}/stream`);
    this.eventSource = es;

    es.onopen = () => {
      this.connectionStatus.set('connected');
    };

    es.onerror = () => {
      this.connectionStatus.set('disconnected');
    };

    es.addEventListener('init', (e: MessageEvent) => {
      try {
        const state: ClassroomState = JSON.parse(e.data);
        this.classroom.set(state);
        this.connectionStatus.set('connected');
      } catch (err) {
        console.error('Error parsing init event:', err);
      }
    });

    es.addEventListener('room:update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          return {
            ...current,
            students: data.students || current.students,
            files: data.files || current.files,
          };
        });
      } catch (err) {
        console.error('Error parsing room:update:', err);
      }
    });

    es.addEventListener('fs:update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          return {
            ...current,
            files: data.files,
            students: data.students || current.students,
          };
        });
      } catch (err) {
        console.error('Error parsing fs:update:', err);
      }
    });

    es.addEventListener('demo:update', (e: MessageEvent) => {
      try {
        const demoMode = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          return { ...current, demoMode };
        });
      } catch (err) {
        console.error('Error parsing demo:update:', err);
      }
    });

    es.addEventListener('demo:cursor', (e: MessageEvent) => {
      try {
        const cursor = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          return {
            ...current,
            demoMode: {
              ...current.demoMode,
              teacherCursor: cursor,
            },
          };
        });
      } catch (err) {
        console.error('Error parsing demo:cursor:', err);
      }
    });

    es.addEventListener('demo:state-sync', (e: MessageEvent) => {
      try {
        const demoState = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          return {
            ...current,
            demoMode: {
              ...current.demoMode,
              ...demoState,
            },
          };
        });
      } catch (err) {
        console.error('Error parsing demo:state-sync:', err);
      }
    });

    es.addEventListener('help:update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          return {
            ...current,
            helpRequests: data.helpRequests,
            students: data.students || current.students,
          };
        });
      } catch (err) {
        console.error('Error parsing help:update:', err);
      }
    });

    es.addEventListener('teacher:observe', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          return { ...current, observingStudentId: data.observingStudentId };
        });
      } catch (err) {
        console.error('Error parsing teacher:observe:', err);
      }
    });

    es.addEventListener('room:heartbeat', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          return { ...current, students: data.students };
        });
      } catch (err) {
        console.error('Error parsing room:heartbeat:', err);
      }
    });

    es.addEventListener('chat:message', (e: MessageEvent) => {
      try {
        const msg: ChatMessage = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          const prev = current.chatMessages || [];
          if (prev.some((m) => m.id === msg.id)) return current;
          return { ...current, chatMessages: [...prev, msg] };
        });
      } catch (err) {
        console.error('Error parsing chat:message:', err);
      }
    });

    es.addEventListener('chat:cleared', () => {
      this.classroom.update((current) => {
        if (!current) return null;
        return { ...current, chatMessages: [] };
      });
    });

    es.addEventListener('whiteboard:stroke', (e: MessageEvent) => {
      try {
        const stroke: WhiteboardStroke = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          const prev = current.whiteboardStrokes || [];
          if (prev.some((s) => s.id === stroke.id)) return current;
          return { ...current, whiteboardStrokes: [...prev, stroke] };
        });
      } catch (err) {
        console.error('Error parsing whiteboard:stroke:', err);
      }
    });

    es.addEventListener('whiteboard:stamp', (e: MessageEvent) => {
      try {
        const stamp: WhiteboardStamp = JSON.parse(e.data);
        this.classroom.update((current) => {
          if (!current) return null;
          const prev = current.whiteboardStamps || [];
          if (prev.some((s) => s.id === stamp.id)) return current;
          return { ...current, whiteboardStamps: [...prev, stamp] };
        });
      } catch (err) {
        console.error('Error parsing whiteboard:stamp:', err);
      }
    });

    es.addEventListener('whiteboard:cleared', () => {
      this.classroom.update((current) => {
        if (!current) return null;
        return { ...current, whiteboardStrokes: [], whiteboardStamps: [] };
      });
    });

    es.addEventListener('room:closed', () => {
      alert('Der Klassenraum wurde von der Lehrkraft geschlossen.');
      this.leaveClassroom();
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async sendHeartbeat(options?: {
    currentApp?: string;
    taskProgress?: number;
    currentPath?: string;
    thumbnail?: string;
  }): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/heartbeat`, {
          userId: user.id,
          role: user.role,
          currentApp: options?.currentApp || user.currentApp,
          taskProgress: options?.taskProgress !== undefined ? options.taskProgress : user.taskProgress,
          currentPath: options?.currentPath,
          thumbnail: options?.thumbnail,
        })
        .toPromise();
    } catch {
      // Ignore background heartbeat error
    }
  }

  // ==========================================
  // FILE SYSTEM OPERATIONS
  // ==========================================

  async createFolder(parentPath: string, folderName: string): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'Nicht angemeldet.' };

    this.syncStatus.set('saving');
    try {
      const res = await this.http
        .post<{ success: boolean; item: VirtualItem }>(`/api/classroom/${room.code}/fs/create-folder`, {
          parentPath,
          folderName,
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        })
        .toPromise();

      this.syncStatus.set('saved');
      return { success: !!res?.success };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Fehler beim Erstellen des Ordners.' };
    }
  }

  async saveFile(
    parentPath: string,
    fileName: string,
    content: string,
    fileType: 'image' | 'text',
    thumbnail?: string,
  ): Promise<{ success: boolean; error?: string; item?: VirtualItem }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'Nicht angemeldet.' };

    this.syncStatus.set('saving');
    try {
      const res = await this.http
        .post<{ success: boolean; item: VirtualItem }>(`/api/classroom/${room.code}/fs/save-file`, {
          parentPath,
          fileName,
          content,
          fileType,
          thumbnail,
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        })
        .toPromise();

      this.syncStatus.set('saved');
      return { success: true, item: res?.item };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Fehler beim Speichern der Datei.' };
    }
  }

  async renameItem(path: string, newName: string): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'Nicht angemeldet.' };

    this.syncStatus.set('saving');
    try {
      await this.http
        .post(`/api/classroom/${room.code}/fs/rename`, {
          path,
          newName,
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        })
        .toPromise();

      this.syncStatus.set('saved');
      return { success: true };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Umbenennen fehlgeschlagen.' };
    }
  }

  async moveItem(sourcePath: string, destinationParentPath: string): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'Nicht angemeldet.' };

    this.syncStatus.set('saving');
    try {
      await this.http
        .post(`/api/classroom/${room.code}/fs/move`, {
          sourcePath,
          destinationParentPath,
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        })
        .toPromise();

      this.syncStatus.set('saved');
      return { success: true };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Verschieben nicht erlaubt.' };
    }
  }

  async copyItem(sourcePath: string, destinationParentPath: string): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'Nicht angemeldet.' };

    this.syncStatus.set('saving');
    try {
      await this.http
        .post(`/api/classroom/${room.code}/fs/copy`, {
          sourcePath,
          destinationParentPath,
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        })
        .toPromise();

      this.syncStatus.set('saved');
      return { success: true };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Kopieren fehlgeschlagen.' };
    }
  }

  async trashFile(path: string): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'Nicht angemeldet.' };

    this.syncStatus.set('saving');
    try {
      await this.http
        .post(`/api/classroom/${room.code}/fs/trash`, {
          path,
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        })
        .toPromise();

      this.syncStatus.set('saved');
      return { success: true };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Löschen fehlgeschlagen.' };
    }
  }

  async restoreFile(path: string): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'Nicht angemeldet.' };

    this.syncStatus.set('saving');
    try {
      await this.http
        .post(`/api/classroom/${room.code}/fs/restore`, {
          path,
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        })
        .toPromise();

      this.syncStatus.set('saved');
      return { success: true };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Wiederherstellen fehlgeschlagen.' };
    }
  }

  async deleteForever(path: string): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'Nicht angemeldet.' };

    this.syncStatus.set('saving');
    try {
      await this.http
        .post(`/api/classroom/${room.code}/fs/delete-forever`, {
          path,
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        })
        .toPromise();

      this.syncStatus.set('saved');
      return { success: true };
    } catch (err: unknown) {
      this.syncStatus.set('error');
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Endgültiges Löschen fehlgeschlagen.' };
    }
  }

  // ==========================================
  // DEMO & CLASSROOM COLLABORATION
  // ==========================================

  async toggleDemoMode(active: boolean): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room || user.role !== 'teacher') return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/demo/toggle`, {
          active,
          userId: user.id,
        })
        .toPromise();
    } catch {
      // Ignore network sync error
    }
  }

  async streamCursor(x: number, y: number, visible: boolean): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room || !room.demoMode.active) return;
    if (user.id !== room.demoMode.controlledBy) return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/demo/cursor`, {
          x,
          y,
          visible,
          userId: user.id,
        })
        .toPromise();
    } catch {
      // Ignore cursor stream frame drops
    }
  }

  async delegateControl(targetUserId?: string, targetUserName?: string): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room || user.role !== 'teacher') return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/demo/control`, {
          targetUserId,
          targetUserName,
          userId: user.id,
        })
        .toPromise();
    } catch {
      // Ignore delegate error
    }
  }

  async syncDemoState(partial: {
    activeWindow?: string;
    currentFolderId?: string;
    currentFolderPath?: string;
    demoCanvasData?: string;
  }): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room || !room.demoMode.active) return;
    if (user.id !== room.demoMode.controlledBy) return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/demo/state-sync`, {
          ...partial,
          userId: user.id,
        })
        .toPromise();
    } catch {
      // Ignore demo state sync error
    }
  }

  async presentWork(filePath: string): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room || user.role !== 'teacher') return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/demo/present-work`, {
          filePath,
          userId: user.id,
        })
        .toPromise();
    } catch {
      // Ignore present work error
    }
  }

  // ==========================================
  // HELP & OBSERVATION
  // ==========================================

  async requestHelp(message?: string): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/help/request`, {
          studentId: user.id,
          studentName: user.name,
          message: message || 'Braucht Hilfe bei der aktuellen Aufgabe.',
        })
        .toPromise();
    } catch {
      // Ignore help request error
    }
  }

  async resolveHelp(studentId: string): Promise<void> {
    const room = this.classroom();
    if (!room) return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/help/resolve`, {
          studentId,
        })
        .toPromise();
    } catch {
      // Ignore resolve help error
    }
  }

  async setObserving(targetStudentId: string | null): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room || user.role !== 'teacher') return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/observe`, {
          teacherId: user.id,
          targetStudentId,
        })
        .toPromise();
    } catch {
      // Ignore observe error
    }
  }

  async createGroup(
    name: string,
    icon: string,
    color: string,
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return { success: false, error: 'No conectado.' };

    try {
      await this.http
        .post(`/api/classroom/${room.code}/groups/create`, {
          name,
          icon,
          color,
          userId: user.id,
          userName: user.name,
        })
        .toPromise();
      return { success: true };
    } catch (err: unknown) {
      const errObj = err as { error?: { error?: string } };
      return { success: false, error: errObj?.error?.error || 'Error al crear grupo.' };
    }
  }

  async joinGroup(groupId: string): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/groups/join`, {
          groupId,
          userId: user.id,
          userName: user.name,
        })
        .toPromise();
      return true;
    } catch {
      return false;
    }
  }

  async addGroupNote(groupId: string, text: string): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/groups/note`, {
          groupId,
          author: user.name,
          text,
        })
        .toPromise();
      return true;
    } catch {
      return false;
    }
  }

  async sendPeerReaction(
    toStudentId: string,
    type: 'bravo' | 'star' | 'idea' | 'rocket',
  ): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/reaction`, {
          fromStudentId: user.id,
          fromStudentName: user.name,
          toStudentId,
          type,
        })
        .toPromise();
      return true;
    } catch {
      return false;
    }
  }

  async reportActivity(
    currentApp?: string,
    activityDetail?: string,
    thumbnail?: string,
  ): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/activity`, {
          userId: user.id,
          currentApp,
          activityDetail,
          thumbnail,
        })
        .toPromise();
    } catch {
      // Ignore background ping
    }
  }

  async closeClassroom(): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room || user.role !== 'teacher') return;

    try {
      await this.http
        .delete(`/api/classroom/${room.code}`, {
          body: { teacherId: user.id },
        })
        .toPromise();
      this.leaveClassroom();
    } catch {
      // Ignore close error
    }
  }

  async sendChatMessage(
    text: string,
    type: 'text' | 'reaction' | 'question' = 'text',
    emoji?: string,
  ): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/chat/send`, {
          senderId: user.id,
          senderName: user.name,
          senderRole: user.role,
          text,
          type,
          emoji,
        })
        .toPromise();
      return true;
    } catch {
      return false;
    }
  }

  async clearChat(): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room || user.role !== 'teacher') return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/chat/clear`, {
          userId: user.id,
        })
        .toPromise();
      return true;
    } catch {
      return false;
    }
  }

  async sendWhiteboardStroke(stroke: {
    color: string;
    size: number;
    tool: 'pencil' | 'brush' | 'eraser';
    points: { x: number; y: number }[];
  }): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/whiteboard/stroke`, {
          authorId: user.id,
          authorName: user.name,
          ...stroke,
        })
        .toPromise();
      return true;
    } catch {
      return false;
    }
  }

  async sendWhiteboardStamp(emoji: string, x: number, y: number): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/whiteboard/stamp`, {
          authorId: user.id,
          authorName: user.name,
          emoji,
          x,
          y,
        })
        .toPromise();
      return true;
    } catch {
      return false;
    }
  }

  async clearWhiteboard(): Promise<boolean> {
    const room = this.classroom();
    if (!room) return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/whiteboard/clear`, {})
        .toPromise();
      return true;
    } catch {
      return false;
    }
  }
}
