import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ChatMessage,
  ClassroomGroup,
  ClassroomState,
  GroupNote,
  PeerReaction,
  UserRole,
  UserSession,
  VirtualItem,
  WhiteboardStamp,
  WhiteboardStroke,
} from '../models/classroom.types';

const STORAGE_SESSION_KEY = 'klassendesktop_session';
const STORAGE_ROOM_KEY = 'klassendesktop_room_code';
const STORAGE_ROOM_STATE_KEY = 'klassendesktop_room_state';

@Injectable({
  providedIn: 'root',
})
export class ClassroomService {
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<UserSession | null>(null);
  readonly classroom = signal<ClassroomState | null>(null);
  readonly connectionStatus = signal<'connected' | 'connecting' | 'disconnected' | 'local'>('connecting');
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
      const savedRoomState = localStorage.getItem(STORAGE_ROOM_STATE_KEY);
      if (savedSession && savedRoomCode) {
        const user: UserSession = JSON.parse(savedSession);
        this.currentUser.set(user);

        // Instantly restore saved state so there is zero delay or UI flicker
        if (savedRoomState) {
          try {
            const parsedRoom: ClassroomState = JSON.parse(savedRoomState);
            this.classroom.set(parsedRoom);
            this.connectionStatus.set('local');
          } catch {
            // Clear broken room cache
            localStorage.removeItem(STORAGE_ROOM_STATE_KEY);
          }
        }

        this.fetchClassroomState(savedRoomCode).then((success) => {
          if (success) {
            this.connectEventStream(savedRoomCode);
            this.startHeartbeat();
          } else {
            // Server unavailable (e.g. Vercel or offline): stay in local resilient mode
            this.connectionStatus.set('local');
            if (!this.classroom()) {
              const fallback = this.initializeLocalClassroom(
                savedRoomCode,
                'Klassenraum',
                user.name,
                user.role,
              );
              this.classroom.set(fallback.room);
              this.saveRoomStateToStorage(fallback.room);
            }
          }
        }).catch(() => {
          this.connectionStatus.set('local');
        });
      } else {
        this.connectionStatus.set('disconnected');
      }
    } catch (e) {
      console.error('Error restoring session, resetting storage cache:', e);
      this.clearSessionStorage();
      this.connectionStatus.set('disconnected');
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

  saveRoomStateToStorage(room: ClassroomState): void {
    if (typeof window === 'undefined') return;
    try {
      // Create a lightweight copy without huge base64 image buffers to prevent mobile OOM
      const sanitizedFiles: Record<string, VirtualItem> = {};
      for (const [path, item] of Object.entries(room.files || {})) {
        if (item.content && item.content.length > 50000) {
          sanitizedFiles[path] = { ...item, content: '' };
        } else {
          sanitizedFiles[path] = item;
        }
      }
      const lightRoom = {
        ...room,
        files: sanitizedFiles,
        // Limit whiteboards and strokes stored in local storage
        whiteboardStrokes: (room.whiteboardStrokes || []).slice(-50),
        whiteboardStamps: (room.whiteboardStamps || []).slice(-30),
      };
      localStorage.setItem(STORAGE_ROOM_STATE_KEY, JSON.stringify(lightRoom));
    } catch {
      // Storage quota or unavailable: safely ignore
    }
  }

  private clearSessionStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_ROOM_KEY);
      localStorage.removeItem(STORAGE_ROOM_STATE_KEY);
    } catch {
      // Storage unavailable
    }
  }

  startStandaloneSession(role: UserRole = 'student', name?: string): { room: ClassroomState; user: UserSession } {
    const userName = name || (role === 'teacher' ? 'Frau Weber' : 'Lukas');
    const code = role === 'teacher' ? `INF-${Math.floor(100 + Math.random() * 900)}` : 'INF-101';
    const fallback = this.initializeLocalClassroom(
      code,
      role === 'teacher' ? 'Informatik Klasse 6b' : 'Informatik 6b',
      userName,
      role,
    );
    this.currentUser.set(fallback.user);
    this.classroom.set(fallback.room);
    this.saveSessionToStorage(fallback.user, fallback.room.code);
    this.saveRoomStateToStorage(fallback.room);
    this.connectionStatus.set('local');
    this.syncStatus.set('saved');
    return fallback;
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
        this.saveRoomStateToStorage(res.room);
        this.connectEventStream(res.code);
        this.startHeartbeat();
        this.syncStatus.set('saved');
        return { success: true };
      }
      // Fallback for resilient standalone session
      const fallback = this.initializeLocalClassroom(
        `INF-${Math.floor(100 + Math.random() * 900)}`,
        className,
        teacherName,
        'teacher',
      );
      this.currentUser.set(fallback.user);
      this.classroom.set(fallback.room);
      this.saveSessionToStorage(fallback.user, fallback.room.code);
      this.saveRoomStateToStorage(fallback.room);
      this.connectionStatus.set('local');
      this.syncStatus.set('saved');
      return { success: true };
    } catch {
      // If server is unreachable (e.g. Vercel serverless / read-only environment)
      const fallback = this.initializeLocalClassroom(
        `INF-${Math.floor(100 + Math.random() * 900)}`,
        className,
        teacherName,
        'teacher',
      );
      this.currentUser.set(fallback.user);
      this.classroom.set(fallback.room);
      this.saveSessionToStorage(fallback.user, fallback.room.code);
      this.saveRoomStateToStorage(fallback.room);
      this.connectionStatus.set('local');
      this.syncStatus.set('saved');
      return { success: true };
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
        this.saveRoomStateToStorage(res.room);
        this.connectEventStream(res.code);
        this.startHeartbeat();
        this.syncStatus.set('saved');
        return { success: true };
      }
      // Fallback for resilient standalone session
      const fallback = this.initializeLocalClassroom(
        code.toUpperCase().trim() || 'INF-101',
        'Informatik 6b',
        studentName.trim(),
        'student',
      );
      this.currentUser.set(fallback.user);
      this.classroom.set(fallback.room);
      this.saveSessionToStorage(fallback.user, fallback.room.code);
      this.saveRoomStateToStorage(fallback.room);
      this.connectionStatus.set('local');
      this.syncStatus.set('saved');
      return { success: true };
    } catch {
      // If server is unreachable (e.g. Vercel serverless / read-only environment)
      const fallback = this.initializeLocalClassroom(
        code.toUpperCase().trim() || 'INF-101',
        'Informatik 6b',
        studentName.trim(),
        'student',
      );
      this.currentUser.set(fallback.user);
      this.classroom.set(fallback.room);
      this.saveSessionToStorage(fallback.user, fallback.room.code);
      this.saveRoomStateToStorage(fallback.room);
      this.connectionStatus.set('local');
      this.syncStatus.set('saved');
      return { success: true };
    }
  }

  private initializeLocalClassroom(
    code: string,
    className: string,
    userName: string,
    role: UserRole,
  ): { room: ClassroomState; user: UserSession } {
    const now = Date.now();
    const userId = role === 'teacher' ? 'teach_' + Math.random().toString(36).substring(2, 7) : 'stud_' + Math.random().toString(36).substring(2, 7);
    const userSession: UserSession = {
      id: userId,
      name: userName,
      role,
      roomCode: code,
      connectedAt: now,
      lastActive: now,
      isHandRaised: false,
    };

    const files: Record<string, VirtualItem> = {
      '/Klasse': {
        id: 'f_klasse',
        name: 'Meine Klasse',
        type: 'folder',
        parentId: null,
        path: '/Klasse',
        ownerId: 'system',
        createdAt: now,
        updatedAt: now,
      },
      '/Lehrermaterial': {
        id: 'f_lehrer',
        name: 'Lehrermaterial',
        type: 'folder',
        parentId: null,
        path: '/Lehrermaterial',
        ownerId: 'teacher',
        isProtected: true,
        createdAt: now,
        updatedAt: now,
      },
      '/Papierkorb': {
        id: 'f_papierkorb',
        name: 'Papierkorb',
        type: 'folder',
        parentId: null,
        path: '/Papierkorb',
        ownerId: 'system',
        createdAt: now,
        updatedAt: now,
      },
    };

    if (role === 'student') {
      files[`/Klasse/${userName}`] = {
        id: 'f_my_folder',
        name: userName,
        type: 'folder',
        parentId: 'f_klasse',
        path: `/Klasse/${userName}`,
        ownerId: userId,
        ownerName: userName,
        createdAt: now,
        updatedAt: now,
      };
    }

    const room: ClassroomState = {
      code,
      name: className,
      createdAt: now,
      teacherId: role === 'teacher' ? userId : 'teacher_demo',
      teacherName: role === 'teacher' ? userName : 'Frau Weber',
      students: role === 'student' ? [userSession] : [],
      files,
      demoMode: { active: false, controlledBy: '', controlledByName: '' },
      helpRequests: [],
      observingStudentId: null,
      chatMessages: [
        {
          id: 'welcome-msg',
          senderId: 'system',
          senderName: 'System',
          senderRole: 'teacher',
          text: 'Willkommen im Klassenraum! / ¡Bienvenido al aula virtual!',
          timestamp: now,
        },
      ],
      groups: [],
      reactions: [],
      whiteboardStrokes: [],
      whiteboardStamps: [],
    };

    return { room, user: userSession };
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
      // In serverless environments (like Vercel) or when offline, keep app running locally
      if (this.classroom()) {
        this.connectionStatus.set('local');
      } else {
        this.connectionStatus.set('disconnected');
      }
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

      if (res?.success) {
        this.syncStatus.set('saved');
        return { success: true };
      }
    } catch {
      // Local fallback for Vercel / serverless / offline
    }

    const folderPath = parentPath === '/' ? `/${folderName}` : `${parentPath}/${folderName}`;
    const folderItem: VirtualItem = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      name: folderName,
      type: 'folder',
      path: folderPath,
      parentId: parentPath === '/' ? null : parentPath,
      ownerId: user.id,
      ownerName: user.name,
      creatorName: user.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.classroom.update((current) => {
      if (!current) return null;
      const updated = {
        ...current,
        files: {
          ...current.files,
          [folderPath]: folderItem,
        },
      };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    this.syncStatus.set('saved');
    return { success: true };
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

      if (res?.success && res.item) {
        this.syncStatus.set('saved');
        return { success: true, item: res.item };
      }
    } catch {
      // Local fallback for Vercel / serverless / offline
    }

    const filePath = parentPath === '/' ? `/${fileName}` : `${parentPath}/${fileName}`;
    const fileItem: VirtualItem = {
      id: 'file_' + Math.random().toString(36).substring(2, 9),
      name: fileName,
      type: 'file',
      path: filePath,
      parentId: parentPath === '/' ? null : parentPath,
      fileType,
      content,
      thumbnail,
      ownerId: user.id,
      ownerName: user.name,
      creatorName: user.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sizeBytes: content.length,
    };

    this.classroom.update((current) => {
      if (!current) return null;
      const updated = {
        ...current,
        files: {
          ...current.files,
          [filePath]: fileItem,
        },
      };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    this.syncStatus.set('saved');
    return { success: true, item: fileItem };
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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current || !current.files[path]) return current;
      const oldItem = current.files[path];
      const parentDir = path.substring(0, path.lastIndexOf('/')) || '/';
      const newPath = parentDir === '/' ? `/${newName}` : `${parentDir}/${newName}`;
      const files = { ...current.files };
      delete files[path];
      files[newPath] = {
        ...oldItem,
        name: newName,
        path: newPath,
        parentId: parentDir === '/' ? null : parentDir,
        updatedAt: Date.now(),
      };
      const updated = { ...current, files };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    this.syncStatus.set('saved');
    return { success: true };
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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current || !current.files[sourcePath]) return current;
      const item = current.files[sourcePath];
      const newPath = destinationParentPath === '/' ? `/${item.name}` : `${destinationParentPath}/${item.name}`;
      const files = { ...current.files };
      delete files[sourcePath];
      files[newPath] = {
        ...item,
        path: newPath,
        parentId: destinationParentPath === '/' ? null : destinationParentPath,
        updatedAt: Date.now(),
      };
      const updated = { ...current, files };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    this.syncStatus.set('saved');
    return { success: true };
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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current || !current.files[sourcePath]) return current;
      const item = current.files[sourcePath];
      const copyName = `${item.name.replace(/(\.[^.]+)$/, '')}_Kopie${item.name.match(/(\.[^.]+)$/)?.[0] || ''}`;
      const newPath = destinationParentPath === '/' ? `/${copyName}` : `${destinationParentPath}/${copyName}`;
      const files = {
        ...current.files,
        [newPath]: {
          ...item,
          id: 'copy_' + Math.random().toString(36).substring(2, 9),
          name: copyName,
          path: newPath,
          parentId: destinationParentPath === '/' ? null : destinationParentPath,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };
      const updated = { ...current, files };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    this.syncStatus.set('saved');
    return { success: true };
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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current || !current.files[path]) return current;
      const item = current.files[path];
      const trashPath = `/Papierkorb/${item.name}`;
      const files = { ...current.files };
      delete files[path];
      files[trashPath] = {
        ...item,
        path: trashPath,
        parentId: '/Papierkorb',
        inTrash: true,
        originalPath: path,
        updatedAt: Date.now(),
      };
      const updated = { ...current, files };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    this.syncStatus.set('saved');
    return { success: true };
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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current || !current.files[path]) return current;
      const item = current.files[path];
      const restoredPath = item.originalPath || `/Eigene Dateien/${item.name}`;
      const parentDir = restoredPath.substring(0, restoredPath.lastIndexOf('/')) || '/';
      const files = { ...current.files };
      delete files[path];
      files[restoredPath] = {
        ...item,
        path: restoredPath,
        parentId: parentDir === '/' ? null : parentDir,
        inTrash: false,
        originalPath: undefined,
        updatedAt: Date.now(),
      };
      const updated = { ...current, files };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    this.syncStatus.set('saved');
    return { success: true };
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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const files = { ...current.files };
      delete files[path];
      for (const p of Object.keys(files)) {
        if (p.startsWith(path + '/')) {
          delete files[p];
        }
      }
      const updated = { ...current, files };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    this.syncStatus.set('saved');
    return { success: true };
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

    const newGroup: ClassroomGroup = {
      id: 'grp_' + Math.random().toString(36).substring(2, 9),
      name,
      icon,
      color,
      creatorId: user.id,
      creatorName: user.name,
      folderPath: `/Klasse/Gruppen/${name}`,
      members: [{ id: user.id, name: user.name }],
      notes: [],
      createdAt: Date.now(),
    };

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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const prev = current.groups || [];
      const updated: ClassroomState = { ...current, groups: [...prev, newGroup] };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return { success: true };
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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const groups = (current.groups || []).map((g) => {
        if (g.id !== groupId) {
          // Remove from other groups
          return {
            ...g,
            members: g.members.filter((m) => m.id !== user.id),
          };
        }
        const hasMember = g.members.some((m) => m.id === user.id);
        return {
          ...g,
          members: hasMember ? g.members : [...g.members, { id: user.id, name: user.name }],
        };
      });
      const updated: ClassroomState = { ...current, groups };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return true;
  }

  async addGroupNote(groupId: string, text: string): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    const note: GroupNote = {
      id: 'note_' + Math.random().toString(36).substring(2, 9),
      author: user.name,
      text,
      timestamp: Date.now(),
    };

    try {
      await this.http
        .post(`/api/classroom/${room.code}/groups/note`, {
          groupId,
          author: user.name,
          text,
        })
        .toPromise();
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const groups = (current.groups || []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          notes: [...g.notes, note],
        };
      });
      const updated: ClassroomState = { ...current, groups };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return true;
  }

  async sendPeerReaction(
    toStudentId: string,
    type: 'bravo' | 'star' | 'idea' | 'rocket',
  ): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    const emojiMap: Record<string, { emoji: string; label: string }> = {
      bravo: { emoji: '👏', label: 'Bravo!' },
      star: { emoji: '⭐', label: 'Super!' },
      idea: { emoji: '💡', label: 'Tolle Idee!' },
      rocket: { emoji: '🚀', label: 'Rakete!' },
    };

    const reaction: PeerReaction = {
      id: 'react_' + Math.random().toString(36).substring(2, 9),
      fromStudentId: user.id,
      fromStudentName: user.name,
      toStudentId,
      type,
      emoji: emojiMap[type]?.emoji || '👏',
      label: emojiMap[type]?.label || 'Bravo!',
      timestamp: Date.now(),
    };

    try {
      await this.http
        .post(`/api/classroom/${room.code}/reaction`, {
          fromStudentId: user.id,
          fromStudentName: user.name,
          toStudentId,
          type,
        })
        .toPromise();
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const prev = current.reactions || [];
      const updated: ClassroomState = { ...current, reactions: [...prev, reaction] };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return true;
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
      this.leaveClassroom();
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

    const msg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text,
      type,
      emoji,
      timestamp: Date.now(),
    };

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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const prev = current.chatMessages || [];
      const updated = { ...current, chatMessages: [...prev, msg] };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return true;
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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const updated = { ...current, chatMessages: [] };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return true;
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

    const fullStroke: WhiteboardStroke = {
      id: 'st_' + Math.random().toString(36).substring(2, 9),
      authorId: user.id,
      authorName: user.name,
      ...stroke,
      timestamp: Date.now(),
    };

    try {
      await this.http
        .post(`/api/classroom/${room.code}/whiteboard/stroke`, {
          authorId: user.id,
          authorName: user.name,
          ...stroke,
        })
        .toPromise();
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const prev = current.whiteboardStrokes || [];
      const updated = { ...current, whiteboardStrokes: [...prev, fullStroke] };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return true;
  }

  async sendWhiteboardStamp(emoji: string, x: number, y: number): Promise<boolean> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return false;

    const stamp: WhiteboardStamp = {
      id: 'stmp_' + Math.random().toString(36).substring(2, 9),
      authorId: user.id,
      authorName: user.name,
      emoji,
      x,
      y,
      timestamp: Date.now(),
    };

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
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const prev = current.whiteboardStamps || [];
      const updated = { ...current, whiteboardStamps: [...prev, stamp] };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return true;
  }

  async clearWhiteboard(): Promise<boolean> {
    const room = this.classroom();
    if (!room) return false;

    try {
      await this.http
        .post(`/api/classroom/${room.code}/whiteboard/clear`, {})
        .toPromise();
    } catch {
      // Local fallback
    }

    this.classroom.update((current) => {
      if (!current) return null;
      const updated = { ...current, whiteboardStrokes: [], whiteboardStamps: [] };
      this.saveRoomStateToStorage(updated);
      return updated;
    });

    return true;
  }
}
