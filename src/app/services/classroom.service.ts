import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ChatMessage,
  ClassroomGroup,
  ClassroomState,
  GroupNote,
  HelpRequest,
  PeerReaction,
  TeamsPresenceStatus,
  UserRole,
  UserSession,
  VirtualItem,
  WhiteboardStamp,
  WhiteboardStroke,
} from '../models/classroom.types';
import { FirebaseService } from './firebase.service';

const STORAGE_SESSION_KEY = 'klassendesktop_session';
const STORAGE_ROOM_KEY = 'klassendesktop_room_code';
const STORAGE_ROOM_STATE_KEY = 'klassendesktop_room_state';

@Injectable({
  providedIn: 'root',
})
export class ClassroomService {
  private readonly http = inject(HttpClient);
  readonly firebase = inject(FirebaseService);

  readonly currentUser = signal<UserSession | null>(null);
  readonly classroom = signal<ClassroomState | null>(null);
  readonly connectionStatus = signal<'connected' | 'connecting' | 'disconnected' | 'local'>('connecting');
  readonly syncStatus = signal<'saved' | 'saving' | 'error'>('saved');

  // Modal para agregar estudiante desde el avatar o barra
  readonly isAddStudentModalOpen = signal<boolean>(false);
  readonly myPresenceStatus = signal<TeamsPresenceStatus>('available');

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

  readonly students = computed(() => {
    const room = this.classroom();
    const currentGrp = this.firebase.currentGroup();
    const regUsers = this.firebase.registeredUsers().filter((u) => u.role === 'student');
    const me = this.currentUser();
    const now = Date.now();

    // Combine database registered students, group members, and live room students
    const map = new Map<string, UserSession>();

    // 1. Registered students from Firestore database
    for (const u of regUsers) {
      const isCurrentSessionUser =
        !!me &&
        (me.id === u.id || (me.role === 'student' && me.name.toLowerCase() === u.username.toLowerCase()));
      // Un alumno sólo tiene lastActive reciente si es esta sesión activa o si un cliente real ya envió latido
      const studentLastActive = isCurrentSessionUser ? now : u.lastActive;

      map.set(u.id, {
        id: u.id,
        name: u.username,
        role: 'student' as const,
        roomCode: u.roomCode || currentGrp?.code || 'INF-101',
        connectedAt: u.createdAt || now - 86400000,
        lastActive: studentLastActive,
        currentApp: u.currentApp || 'desktop',
        activityDetail: u.activityDetail || (u.currentApp ? `En ${u.currentApp}` : 'Arbeitsbereich bereit'),
        taskProgress: u.taskProgress !== undefined ? u.taskProgress : 1,
        thumbnail: u.thumbnail,
        screenSnapshot: u.screenSnapshot,
        isHandRaised: !!u.isHandRaised,
        presenceStatus: isCurrentSessionUser
          ? this.myPresenceStatus() || 'available'
          : u.presenceStatus || 'offline',
      });
    }

    // 2. Members from current Firestore group
    if (currentGrp && currentGrp.members) {
      const studentMembers = currentGrp.members.filter((m) => m.role === 'student');
      for (const m of studentMembers) {
        const existing = map.get(m.id);
        const isCurrentSessionUser =
          !!me &&
          (me.id === m.id || (me.role === 'student' && me.name.toLowerCase() === m.name.toLowerCase()));
        const memberLastActive = isCurrentSessionUser ? now : m.lastActive || existing?.lastActive;

        if (existing) {
          map.set(m.id, {
            ...existing,
            lastActive: memberLastActive,
            isHandRaised: m.isHandRaised !== undefined ? m.isHandRaised : existing.isHandRaised,
            currentApp: m.currentApp || existing.currentApp,
            activityDetail: m.activityDetail || existing.activityDetail,
            taskProgress: m.taskProgress !== undefined ? m.taskProgress : existing.taskProgress,
            thumbnail: m.thumbnail || existing.thumbnail,
            screenSnapshot: m.screenSnapshot || existing.screenSnapshot,
            presenceStatus: isCurrentSessionUser
              ? this.myPresenceStatus() || 'available'
              : m.presenceStatus || existing.presenceStatus || 'offline',
          });
        } else {
          map.set(m.id, {
            id: m.id,
            name: m.name,
            role: 'student' as const,
            roomCode: currentGrp.code,
            connectedAt: currentGrp.createdAt,
            lastActive: memberLastActive,
            currentApp: m.currentApp || 'desktop',
            activityDetail: m.activityDetail || 'Informatik Klasse 6b',
            taskProgress: m.taskProgress !== undefined ? m.taskProgress : 1,
            thumbnail: m.thumbnail,
            screenSnapshot: m.screenSnapshot,
            isHandRaised: !!m.isHandRaised,
            presenceStatus: isCurrentSessionUser ? 'available' : m.presenceStatus || 'offline',
          });
        }
      }
    }

    // 3. Current active room students (e.g. current session user)
    if (room && room.students) {
      for (const s of room.students) {
        const existing = map.get(s.id);
        const isCurrentSessionUser = !!me && me.id === s.id;
        if (existing) {
          map.set(s.id, {
            ...existing,
            ...s,
            lastActive: isCurrentSessionUser ? now : s.lastActive || existing.lastActive,
            isHandRaised: s.isHandRaised !== undefined ? s.isHandRaised : existing.isHandRaised,
            presenceStatus: isCurrentSessionUser
              ? this.myPresenceStatus() || 'available'
              : existing.presenceStatus,
          });
        }
      }
    }

    return Array.from(map.values());
  });

  readonly groups = computed(() => {
    const fbGroups = this.firebase.activeGroups();
    const fbNotes = this.firebase.activeNotes();
    if (fbGroups.length > 0) {
      return fbGroups.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        color: g.color,
        creatorId: g.teacherId,
        creatorName: g.teacherName,
        members: (g.members || []).map((m) => ({ id: m.id, name: m.name })),
        notes: (fbNotes || [])
          .filter((n) => n.groupId === g.id || n.groupId === g.code)
          .map((n) => ({ id: n.id, author: n.authorName, text: n.text, timestamp: n.createdAt })),
        folderPath: `/Klasse/Gruppen/${g.name}`,
        createdAt: g.createdAt,
      }));
    }
    return this.classroom()?.groups || [];
  });

  readonly reactions = computed(() => this.classroom()?.reactions || []);
  readonly currentGroup = computed(() => this.firebase.currentGroup());

  readonly myGroup = computed(() => {
    const me = this.currentUser();
    if (!me) return null;
    return this.groups().find((g) => g.members.some((m) => m.id === me.id)) || null;
  });

  readonly chatMessages = computed(() => {
    const fbMsgs = this.firebase.activeMessages();
    const localMsgs = this.classroom()?.chatMessages || [];
    if (fbMsgs.length > 0) {
      const map = new Map<string, ChatMessage>();
      for (const m of localMsgs) {
        map.set(m.id, m);
      }
      for (const m of fbMsgs) {
        map.set(m.id, {
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          senderRole: m.senderRole,
          text: m.text,
          timestamp: m.timestamp,
          type: m.type,
          emoji: m.emoji,
        });
      }
      return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    }
    return localMsgs;
  });

  readonly whiteboardStrokes = computed(() => this.classroom()?.whiteboardStrokes || []);
  readonly whiteboardStamps = computed(() => this.classroom()?.whiteboardStamps || []);

  readonly activeHelpRequests = computed<HelpRequest[]>(() => {
    const currentGrp = this.firebase.currentGroup();
    const localHelpRequests = this.classroom()?.helpRequests || [];
    const groupHelpRequests = currentGrp?.helpQueue || [];

    const map = new Map<string, HelpRequest>();
    for (const h of localHelpRequests) {
      map.set(h.studentId, h);
    }
    for (const gh of groupHelpRequests) {
      map.set(gh.studentId, {
        id: gh.id || 'help_' + gh.studentId,
        studentId: gh.studentId,
        studentName: gh.studentName,
        message: gh.message,
        timestamp: gh.timestamp,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  });

  readonly onlineStudents = computed<UserSession[]>(() => {
    const list = this.students();
    const now = Date.now();
    const me = this.currentUser();
    const demo = this.classroom()?.demoMode;
    const allHelpRequests = this.activeHelpRequests();

    // Cola numerada de manos levantadas estilo Microsoft Teams (#1, #2, ...)
    const handRaisedOrderMap = new Map<string, number>();
    let orderCounter = 1;
    for (const req of allHelpRequests) {
      if (!handRaisedOrderMap.has(req.studentId)) {
        handRaisedOrderMap.set(req.studentId, orderCounter++);
      }
    }

    // Colores oficiales de presencia de Microsoft Teams
    const teamsColors = ['#0078d4', '#107c41', '#d83b01', '#8764b8', '#008272', '#b4009e', '#038387'];

    return list.map((s) => {
      const isCurrentSessionUser =
        !!me &&
        (me.id === s.id || (me.role === 'student' && me.name.toLowerCase() === s.name.toLowerCase()));
      // CRÍTICO: Un estudiante sólo está ONLINE si es el usuario actual de este navegador O si tiene un latido registrado en los últimos 60 segundos
      const timeSinceActive = isCurrentSessionUser ? 0 : s.lastActive ? now - s.lastActive : Number.MAX_SAFE_INTEGER;
      const isOnline = isCurrentSessionUser || timeSinceActive < 60000;
      const isHandRaised = !!s.isHandRaised || handRaisedOrderMap.has(s.id);
      const handOrder = handRaisedOrderMap.get(s.id) || (s.isHandRaised ? 1 : undefined);

      let presenceStatus: TeamsPresenceStatus = 'offline';
      let statusMessage = '';

      if (demo?.active && demo.controlledBy === s.id) {
        presenceStatus = 'presenting';
        statusMessage = '🟣 Compartiendo pantalla en clase';
      } else if (isHandRaised) {
        presenceStatus = 'busy';
        statusMessage = `✋ Mano levantada (#${handOrder || 1}): Solicitó ayuda`;
      } else if (!isOnline || timeSinceActive > 60000) {
        presenceStatus = 'offline';
        statusMessage = '⚪ Desconectado (Sin sesión abierta)';
      } else if (timeSinceActive > 40000) {
        presenceStatus = 'away';
        statusMessage = '🟡 Ausente';
      } else {
        if (s.presenceStatus && s.presenceStatus !== 'offline') {
          presenceStatus = s.presenceStatus;
        } else {
          presenceStatus = 'available';
        }

        if (s.currentApp === 'paint') {
          presenceStatus = 'busy';
          statusMessage = '🔴 Ocupado — En Paint';
        } else if (s.currentApp === 'coding') {
          presenceStatus = 'busy';
          statusMessage = '🔴 Ocupado — En RoboCode';
        } else if (s.currentApp === 'logic-games') {
          presenceStatus = 'busy';
          statusMessage = '🔴 Ocupado — En Zeek the Geek';
        } else if (s.currentApp === 'explorer') {
          statusMessage = '🟢 Disponible — En Explorador';
        } else {
          statusMessage = '🟢 Disponible — En el aula';
        }
      }

      // Hash consistente de color para el avatar Teams
      let hash = 0;
      for (let i = 0; i < (s.name || '').length; i++) {
        hash = s.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const avatarColor = teamsColors[Math.abs(hash) % teamsColors.length];

      const filesRecord = this.classroom()?.files || {};
      const filesCount = Object.values(filesRecord).filter(
        (f: VirtualItem) => !f.inTrash && f.type === 'file' && f.path.startsWith(`/Klasse/${s.name}`)
      ).length;

      return {
        ...s,
        isOnline,
        isHandRaised,
        handRaisedOrder: handOrder,
        presenceStatus,
        statusMessage,
        avatarColor,
        filesCount,
      };
    });
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
      // Prioritize tab-specific sessionStorage so teacher and student can be opened in separate tabs
      const savedSession =
        sessionStorage.getItem(STORAGE_SESSION_KEY) || localStorage.getItem(STORAGE_SESSION_KEY);
      const savedRoomCode =
        sessionStorage.getItem(STORAGE_ROOM_KEY) || localStorage.getItem(STORAGE_ROOM_KEY);
      const savedRoomState =
        sessionStorage.getItem(STORAGE_ROOM_STATE_KEY) || localStorage.getItem(STORAGE_ROOM_STATE_KEY);
      if (savedSession && savedRoomCode) {
        const user: UserSession = JSON.parse(savedSession);
        this.currentUser.set(user);
        this.connectFirestoreSync(savedRoomCode || 'INF-101');

        // Instantly restore saved state so there is zero delay or UI flicker
        if (savedRoomState) {
          try {
            const parsedRoom: ClassroomState = JSON.parse(savedRoomState);
            this.classroom.set(parsedRoom);
            this.connectionStatus.set('local');
          } catch {
            // Clear broken room cache
            sessionStorage.removeItem(STORAGE_ROOM_STATE_KEY);
            localStorage.removeItem(STORAGE_ROOM_STATE_KEY);
          }
        }

        this.fetchClassroomState(savedRoomCode)
          .then((success) => {
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
          })
          .catch(() => {
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
      const userStr = JSON.stringify(user);
      sessionStorage.setItem(STORAGE_SESSION_KEY, userStr);
      sessionStorage.setItem(STORAGE_ROOM_KEY, roomCode);
      localStorage.setItem(STORAGE_SESSION_KEY, userStr);
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
      const roomStr = JSON.stringify(lightRoom);
      sessionStorage.setItem(STORAGE_ROOM_STATE_KEY, roomStr);
      localStorage.setItem(STORAGE_ROOM_STATE_KEY, roomStr);
    } catch {
      // Storage quota or unavailable: safely ignore
    }
  }

  private clearSessionStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_ROOM_KEY);
      sessionStorage.removeItem(STORAGE_ROOM_STATE_KEY);
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem(STORAGE_ROOM_KEY);
      localStorage.removeItem(STORAGE_ROOM_STATE_KEY);
    } catch {
      // Storage unavailable
    }
  }

  private connectFirestoreSync(code: string): void {
    if (typeof window === 'undefined') return;
    try {
      this.firebase.subscribeToUsers();
      this.firebase.subscribeToGroups();
      this.firebase.subscribeToGroupMessages(code);
      this.firebase.subscribeToCollaboration(code);
    } catch (e) {
      console.warn('Could not connect Firestore sync:', e);
    }
  }

  startStandaloneSession(role: UserRole = 'student', name?: string): { room: ClassroomState; user: UserSession } {
    const userName = name || (role === 'teacher' ? 'Frau Weber' : 'Lukas');
    const code = 'INF-101'; // Single cohesive classroom session uniting teachers and students
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
    this.connectFirestoreSync(fallback.room.code);
    this.connectEventStream(fallback.room.code);
    this.startHeartbeat();
    this.connectionStatus.set('connected');
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
        this.connectFirestoreSync(res.code);
        this.startHeartbeat();
        this.syncStatus.set('saved');
        return { success: true };
      }
      // Fallback for resilient standalone session
      const fallback = this.initializeLocalClassroom(
        'INF-101',
        className,
        teacherName,
        'teacher',
      );
      this.currentUser.set(fallback.user);
      this.classroom.set(fallback.room);
      this.saveSessionToStorage(fallback.user, fallback.room.code);
      this.saveRoomStateToStorage(fallback.room);
      this.connectFirestoreSync(fallback.room.code);
      this.connectionStatus.set('local');
      this.syncStatus.set('saved');
      return { success: true };
    } catch {
      // If server is unreachable
      const fallback = this.initializeLocalClassroom(
        'INF-101',
        className,
        teacherName,
        'teacher',
      );
      this.currentUser.set(fallback.user);
      this.classroom.set(fallback.room);
      this.saveSessionToStorage(fallback.user, fallback.room.code);
      this.saveRoomStateToStorage(fallback.room);
      this.connectFirestoreSync(fallback.room.code);
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
        this.connectFirestoreSync(res.code);
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
      this.connectFirestoreSync(fallback.room.code);
      this.connectionStatus.set('local');
      this.syncStatus.set('saved');
      return { success: true };
    } catch {
      // If server is unreachable
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
      this.connectFirestoreSync(fallback.room.code);
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

    // Initialize individual folders and sample artworks for all students
    const studentNames = ['Lukas', 'Emma', 'Noah', 'Mia', 'Leon'];
    for (const sName of studentNames) {
      const folderPath = `/Klasse/${sName}`;
      files[folderPath] = {
        id: `f_folder_${sName.toLowerCase()}`,
        name: sName,
        type: 'folder',
        parentId: 'f_klasse',
        path: folderPath,
        ownerId: `user_student_${sName.toLowerCase()}`,
        ownerName: sName,
        createdAt: now,
        updatedAt: now,
      };

      // Add a sample drawing inside each student's folder for live screen monitor preview
      const sampleArtPath = `${folderPath}/Mein Haus.png`;
      files[sampleArtPath] = {
        id: `f_art_${sName.toLowerCase()}`,
        name: 'Mein Haus.png',
        type: 'file',
        parentId: `f_folder_${sName.toLowerCase()}`,
        path: sampleArtPath,
        ownerId: `user_student_${sName.toLowerCase()}`,
        ownerName: sName,
        fileType: 'image',
        sizeBytes: 4096,
        createdAt: now - 1800000,
        updatedAt: now - 300000,
        content: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="%230f172a"/><polygon points="160,30 80,100 240,100" fill="%23e11d48"/><rect x="100" y="100" width="120" height="80" fill="%23f59e0b"/><rect x="145" y="130" width="30" height="50" fill="%233b82f6"/><rect x="115" y="115" width="20" height="20" fill="%23ffffff"/><rect x="185" y="115" width="20" height="20" fill="%23ffffff"/><circle cx="270" cy="50" r="22" fill="%23facc15"/></svg>',
      };
    }

    const initialStudents: UserSession[] = studentNames.map((name) => {
      const isCurrent = role === 'student' && userName.toLowerCase() === name.toLowerCase();
      return {
        id: `user_student_${name.toLowerCase()}`,
        name,
        role: 'student' as const,
        roomCode: code,
        connectedAt: isCurrent ? now : now - 86400000,
        lastActive: isCurrent ? now : undefined,
        isHandRaised: false,
        currentApp: 'desktop',
        activityDetail: 'Arbeitsbereich bereit',
        taskProgress: 1,
        presenceStatus: isCurrent ? 'available' : 'offline',
      };
    });

    const room: ClassroomState = {
      code,
      name: className,
      createdAt: now,
      teacherId: role === 'teacher' ? userId : 'user_teacher_weber',
      teacherName: role === 'teacher' ? userName : 'Frau Weber',
      students: initialStudents,
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
          text: 'Willkommen im vernetzten Klassenraum INF-101! / ¡Bienvenidos al aula virtual!',
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
    const user = this.currentUser();
    if (user) {
      try {
        this.firebase.updateStudentPresence(user.id, {
          lastActive: 0,
          presenceStatus: 'offline',
          isHandRaised: false,
        });
      } catch {
        // Ignore
      }
    }
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

    // Persistir presencia en tiempo real en la base de datos Firestore
    try {
      await this.firebase.updateStudentPresence(user.id, {
        lastActive: Date.now(),
        currentApp: options?.currentApp || user.currentApp,
        presenceStatus: this.myPresenceStatus(),
        isHandRaised: user.isHandRaised,
      });
    } catch {
      // Ignorar error de fondo
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

    this.currentUser.update((u) => (u ? { ...u, isHandRaised: true } : null));

    // 1. Persistir solicitud en tiempo real en Firestore (cola compartida del grupo)
    try {
      await this.firebase.raiseHand(user.id, user.name, message || 'Braucht Hilfe');
    } catch (e) {
      console.warn('Firestore raiseHand error:', e);
    }

    // 2. Transmitir por SSE local
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

    // 3. Notificación en el chat de la clase
    try {
      await this.sendChatMessage(
        `✋ ${user.name} ha levantado la mano para participar: "${message || 'Consulta de clase'}"`,
        'question',
        '✋',
      );
    } catch {
      // Ignore
    }

    // 4. Actualización optimista local
    this.classroom.update((current) => {
      if (!current) return null;
      const prev = current.helpRequests || [];
      const exists = prev.some((h) => h.studentId === user.id);
      const helpRequests = exists
        ? prev
        : [
            ...prev,
            {
              id: 'help_' + Date.now(),
              studentId: user.id,
              studentName: user.name,
              message: message || 'Braucht Hilfe',
              timestamp: Date.now(),
            },
          ];
      const students = (current.students || []).map((s) =>
        s.id === user.id ? { ...s, isHandRaised: true } : s,
      );
      const updated = { ...current, helpRequests, students };
      this.saveRoomStateToStorage(updated);
      return updated;
    });
  }

  async resolveHelp(studentId: string): Promise<void> {
    const room = this.classroom();
    if (!room) return;

    // 1. Quitar solicitud de mano en Firestore
    try {
      await this.firebase.lowerHand(studentId);
    } catch (e) {
      console.warn('Firestore lowerHand error:', e);
    }

    // 2. Transmitir por SSE local
    try {
      await this.http
        .post(`/api/classroom/${room.code}/help/resolve`, {
          studentId,
        })
        .toPromise();
    } catch {
      // Ignore resolve help error
    }

    // 3. Notificación en el chat de la clase
    const student = this.students().find((s) => s.id === studentId);
    const studentName = student?.name || 'el alumno';
    try {
      await this.sendChatMessage(
        `✅ La consulta de ${studentName} ha sido atendida por la profesora.`,
        'text',
        '✅',
      );
    } catch {
      // Ignore
    }

    // 4. Actualización local
    this.classroom.update((current) => {
      if (!current) return null;
      const students = (current.students || []).map((s) =>
        s.id === studentId ? { ...s, isHandRaised: false } : s,
      );
      const helpRequests = (current.helpRequests || []).filter((h) => h.studentId !== studentId);
      const updated = { ...current, students, helpRequests };
      this.saveRoomStateToStorage(updated);
      return updated;
    });
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
      await this.firebase.createGroup(
        name,
        room.code,
        user.id,
        user.name,
        [],
        icon,
        color,
      );
    } catch (e) {
      console.warn('Firestore createGroup error:', e);
    }

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
      await this.firebase.addStudentToGroup(groupId, user.id, user.name);
    } catch (e) {
      console.warn('Firestore addStudentToGroup error:', e);
    }

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
    screenSnapshot?: string,
  ): Promise<void> {
    const user = this.currentUser();
    const room = this.classroom();
    if (!user || !room) return;

    this.currentUser.update((u) => {
      if (!u) return null;
      return {
        ...u,
        currentApp: currentApp || u.currentApp,
        activityDetail: activityDetail || u.activityDetail,
        thumbnail: thumbnail || u.thumbnail,
        screenSnapshot: screenSnapshot || u.screenSnapshot,
        lastActive: Date.now(),
      };
    });

    try {
      await this.http
        .post(`/api/classroom/${room.code}/activity`, {
          userId: user.id,
          currentApp,
          activityDetail,
          thumbnail,
          screenSnapshot,
        })
        .toPromise();
    } catch {
      // Ignore background ping
    }

    try {
      await this.firebase.updateStudentPresence(user.id, {
        lastActive: Date.now(),
        currentApp: currentApp || user.currentApp,
        activityDetail,
        thumbnail,
        screenSnapshot,
        presenceStatus: this.myPresenceStatus(),
      });
    } catch {
      // Ignore
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
      await this.firebase.sendInstantMessage(
        room.code,
        user.id,
        user.name,
        user.role,
        text,
        type,
        emoji,
      );
    } catch (e) {
      console.warn('Firestore instant message error:', e);
    }

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

  // ==========================================
  // TEAMS PRESENCE & STUDENT MANAGEMENT
  // ==========================================

  openAddStudentModal(): void {
    this.isAddStudentModalOpen.set(true);
  }

  closeAddStudentModal(): void {
    this.isAddStudentModalOpen.set(false);
  }

  setMyPresence(status: TeamsPresenceStatus): void {
    this.myPresenceStatus.set(status);
    this.currentUser.update((u) => {
      if (!u) return null;
      return { ...u, presenceStatus: status };
    });
    const user = this.currentUser();
    if (user) {
      this.firebase.updateStudentPresence(user.id, {
        presenceStatus: status,
        lastActive: Date.now(),
      });
    }
  }

  lowerStudentHand(studentId: string): void {
    this.resolveHelp(studentId);
    this.classroom.update((current) => {
      if (!current) return null;
      const students = (current.students || []).map((s) => (s.id === studentId ? { ...s, isHandRaised: false } : s));
      const helpRequests = (current.helpRequests || []).filter((h) => h.studentId !== studentId);
      const updated = { ...current, students, helpRequests };
      this.saveRoomStateToStorage(updated);
      return updated;
    });
  }

  /**
   * Agrega un nuevo estudiante al aula virtual, crea su espacio de trabajo y lo persiste en Firestore
   */
  async addStudent(
    name: string,
    options?: { currentApp?: string; avatarColor?: string },
  ): Promise<UserSession> {
    const cleanName = name.trim();
    const app = options?.currentApp || 'paint';
    const id =
      'user_student_' +
      cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_') +
      '_' +
      Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    const newStudent: UserSession = {
      id,
      name: cleanName,
      role: 'student',
      roomCode: 'INF-101',
      connectedAt: now,
      lastActive: now,
      isHandRaised: false,
      currentApp: app,
      activityDetail:
        app === 'paint'
          ? 'Zeichnet "Mein Projekt.png"'
          : app === 'coding'
          ? 'RoboCode: Startet Projekt'
          : 'Arbeitsbereich bereit',
      taskProgress: 1,
      presenceStatus: 'available',
      statusMessage: '🟢 En línea — ' + (app === 'paint' ? 'En Paint' : app === 'coding' ? 'En RoboCode' : 'En el Escritorio'),
      avatarColor: options?.avatarColor,
    };

    // 1. Crear estructura de carpetas y archivo de muestra en el sistema de archivos virtual
    const folderPath = `/Klasse/${cleanName}`;
    const starterArtPath = `${folderPath}/Mein Projekt.png`;

    this.classroom.update((current) => {
      if (!current) return null;
      const updatedStudents = [...(current.students || []), newStudent];
      const updatedFiles = {
        ...current.files,
        [folderPath]: {
          id: `f_folder_${cleanName.toLowerCase()}`,
          name: cleanName,
          type: 'folder' as const,
          parentId: 'f_klasse',
          path: folderPath,
          ownerId: id,
          ownerName: cleanName,
          createdAt: now,
          updatedAt: now,
        },
        [starterArtPath]: {
          id: `f_art_${cleanName.toLowerCase()}`,
          name: 'Mein Projekt.png',
          type: 'file' as const,
          fileType: 'image' as const,
          parentId: `f_folder_${cleanName.toLowerCase()}`,
          path: starterArtPath,
          ownerId: id,
          ownerName: cleanName,
          sizeBytes: 4096,
          createdAt: now,
          updatedAt: now,
          content:
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="%230f172a"/><circle cx="160" cy="100" r="50" fill="%233b82f6"/><text x="160" y="105" fill="white" font-size="14" text-anchor="middle">Hallo ' +
            cleanName +
            '!</text></svg>',
        },
      };
      const updatedRoom = { ...current, students: updatedStudents, files: updatedFiles };
      this.saveRoomStateToStorage(updatedRoom);
      return updatedRoom;
    });

    // 2. Persistir en Firestore (colección users y groups)
    try {
      await this.firebase.addStudentUser(cleanName, 'INF-101');
      await this.sendChatMessage(`👋 ¡Se ha unido ${cleanName} a la clase!`, 'text');
    } catch (e) {
      console.warn('Firebase student registration error:', e);
    }

    this.closeAddStudentModal();
    return newStudent;
  }
}
