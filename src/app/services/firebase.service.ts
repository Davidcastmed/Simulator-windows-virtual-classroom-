import { Injectable, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Initialize Firebase App and Firestore Database (databaseId: klassenroom)
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface RegisteredUser {
  id: string;
  username: string;
  role: 'student' | 'teacher';
  displayName: string;
  roomCode: string;
  active: boolean;
  createdAt: number;
}

export interface FirestoreGroup {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  members: { id: string; name: string; role: 'student' | 'teacher'; lastActive?: number }[];
  icon: string;
  color: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FirestoreMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'teacher';
  text: string;
  type: 'text' | 'reaction' | 'question' | 'system';
  emoji?: string;
  timestamp: number;
}

export interface FirestoreNote {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher';
  title: string;
  text: string;
  color: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FirestoreTask {
  id: string;
  groupId: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
  category: 'files' | 'drawing' | 'logic' | 'coding' | 'general';
  dueDate: number;
  completedBy: string[]; // array of student user IDs
  createdAt: number;
}

export interface FirestoreResource {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher';
  title: string;
  type: 'document' | 'image' | 'link' | 'exercise';
  content: string;
  urlOrPath: string;
  createdAt: number;
}

// 5 Estudiantes y 2 Maestros registrados por defecto
export const INITIAL_REGISTERED_USERS: RegisteredUser[] = [
  // 2 Maestros
  {
    id: 'user_teacher_weber',
    username: 'Frau Weber',
    displayName: 'Frau Weber',
    role: 'teacher',
    roomCode: 'INF-101',
    active: true,
    createdAt: 1731000000000,
  },
  {
    id: 'user_teacher_bean',
    username: 'Herr Bean',
    displayName: 'Herr Bean',
    role: 'teacher',
    roomCode: 'INF-101',
    active: true,
    createdAt: 1731000000000,
  },
  // 5 Estudiantes
  {
    id: 'user_student_lukas',
    username: 'Lukas',
    displayName: 'Lukas',
    role: 'student',
    roomCode: 'INF-101',
    active: true,
    createdAt: 1731000000000,
  },
  {
    id: 'user_student_emma',
    username: 'Emma',
    displayName: 'Emma',
    role: 'student',
    roomCode: 'INF-101',
    active: true,
    createdAt: 1731000000000,
  },
  {
    id: 'user_student_noah',
    username: 'Noah',
    displayName: 'Noah',
    role: 'student',
    roomCode: 'INF-101',
    active: true,
    createdAt: 1731000000000,
  },
  {
    id: 'user_student_mia',
    username: 'Mia',
    displayName: 'Mia',
    role: 'student',
    roomCode: 'INF-101',
    active: true,
    createdAt: 1731000000000,
  },
  {
    id: 'user_student_leon',
    username: 'Leon',
    displayName: 'Leon',
    role: 'student',
    roomCode: 'INF-101',
    active: true,
    createdAt: 1731000000000,
  },
];

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  readonly isConnected = signal<boolean>(false);
  readonly registeredUsers = signal<RegisteredUser[]>(INITIAL_REGISTERED_USERS);
  
  // Colecciones reactivas en Firestore
  readonly activeGroups = signal<FirestoreGroup[]>([]);
  readonly currentGroup = signal<FirestoreGroup | null>(null);
  readonly activeMessages = signal<FirestoreMessage[]>([]);
  readonly activeNotes = signal<FirestoreNote[]>([]);
  readonly activeTasks = signal<FirestoreTask[]>([]);
  readonly activeResources = signal<FirestoreResource[]>([]);

  private unsubMessages: Unsubscribe | null = null;
  private unsubGroups: Unsubscribe | null = null;
  private unsubNotes: Unsubscribe | null = null;
  private unsubTasks: Unsubscribe | null = null;
  private unsubResources: Unsubscribe | null = null;

  constructor() {
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      await this.syncAndSeedAllCollections();
      this.isConnected.set(true);
    } catch {
      this.isConnected.set(false);
    }
  }

  /**
   * Sincroniza y siembra todas las colecciones en la base de datos klassenRoom:
   * - users
   * - groups
   * - messages
   * - notes
   * - tasks
   * - resources
   */
  async syncAndSeedAllCollections(): Promise<void> {
    await this.syncAndSeedUsers();
    await this.syncAndSeedGroups();
    await this.syncAndSeedNotes();
    await this.syncAndSeedTasks();
    await this.syncAndSeedResources();
    await this.syncAndSeedMessages();
  }

  async syncAndSeedUsers(): Promise<RegisteredUser[]> {
    const path = 'users';
    try {
      const usersCol = collection(db, path);
      const snapshot = await getDocs(usersCol);

      const existingUsers: RegisteredUser[] = [];
      snapshot.forEach((d) => {
        existingUsers.push(d.data() as RegisteredUser);
      });

      if (existingUsers.length > 0) {
        for (const initUser of INITIAL_REGISTERED_USERS) {
          const exists = existingUsers.some(
            (u) => u.username.toLowerCase() === initUser.username.toLowerCase(),
          );
          if (!exists) {
            await setDoc(doc(db, path, initUser.id), initUser);
            existingUsers.push(initUser);
          }
        }
        this.registeredUsers.set(existingUsers);
        return existingUsers;
      }

      for (const user of INITIAL_REGISTERED_USERS) {
        await setDoc(doc(db, path, user.id), user);
      }
      this.registeredUsers.set(INITIAL_REGISTERED_USERS);
      return INITIAL_REGISTERED_USERS;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async syncAndSeedGroups(): Promise<FirestoreGroup[]> {
    const path = 'groups';
    try {
      const col = collection(db, path);
      const snapshot = await getDocs(col);
      const list: FirestoreGroup[] = [];
      snapshot.forEach((d) => list.push(d.data() as FirestoreGroup));

      if (list.length > 0) {
        this.activeGroups.set(list);
        if (!this.currentGroup() && list.length > 0) {
          this.currentGroup.set(list[0]);
        }
        return list;
      }

      // Grupo único inicial por defecto para conectar a la clase completa
      const defaultGroup: FirestoreGroup = {
        id: 'grp_inf_101',
        code: 'INF-101',
        name: 'Informatik Klasse 6b',
        teacherId: 'user_teacher_weber',
        teacherName: 'Frau Weber',
        studentIds: [
          'user_student_lukas',
          'user_student_emma',
          'user_student_noah',
          'user_student_mia',
          'user_student_leon',
        ],
        members: [
          { id: 'user_teacher_weber', name: 'Frau Weber', role: 'teacher' },
          { id: 'user_teacher_bean', name: 'Herr Bean', role: 'teacher' },
          { id: 'user_student_lukas', name: 'Lukas', role: 'student' },
          { id: 'user_student_emma', name: 'Emma', role: 'student' },
          { id: 'user_student_noah', name: 'Noah', role: 'student' },
          { id: 'user_student_mia', name: 'Mia', role: 'student' },
          { id: 'user_student_leon', name: 'Leon', role: 'student' },
        ],
        icon: 'school',
        color: '#6366f1',
        active: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, path, defaultGroup.id), defaultGroup);
      this.activeGroups.set([defaultGroup]);
      this.currentGroup.set(defaultGroup);
      return [defaultGroup];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async syncAndSeedNotes(): Promise<FirestoreNote[]> {
    const path = 'notes';
    try {
      const col = collection(db, path);
      const snapshot = await getDocs(col);
      const list: FirestoreNote[] = [];
      snapshot.forEach((d) => list.push(d.data() as FirestoreNote));

      if (list.length > 0) {
        this.activeNotes.set(list);
        return list;
      }

      const seedNotes: FirestoreNote[] = [
        {
          id: 'note_welcome',
          groupId: 'grp_inf_101',
          authorId: 'user_teacher_weber',
          authorName: 'Frau Weber',
          authorRole: 'teacher',
          title: 'Regeln für den Computerraum',
          text: '1. Speichert eure Dateien immer im eigenen Ordner.\n2. Benutzt klare Dateinamen wie "MeinHaus.png".\n3. Helft einander im Chat bei Fragen.',
          color: 'amber',
          pinned: true,
          createdAt: Date.now() - 3600000,
          updatedAt: Date.now() - 3600000,
        },
        {
          id: 'note_project_ideas',
          groupId: 'grp_inf_101',
          authorId: 'user_student_lukas',
          authorName: 'Lukas',
          authorRole: 'student',
          title: 'Ideen für unsere Zeichnungen',
          text: 'Wir können ein Pixel-Art Schloss oder ein Raumschiff in Paint zeichnen und teilen!',
          color: 'sky',
          pinned: false,
          createdAt: Date.now() - 1800000,
          updatedAt: Date.now() - 1800000,
        },
      ];

      for (const n of seedNotes) {
        await setDoc(doc(db, path, n.id), n);
      }
      this.activeNotes.set(seedNotes);
      return seedNotes;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async syncAndSeedTasks(): Promise<FirestoreTask[]> {
    const path = 'tasks';
    try {
      const col = collection(db, path);
      const snapshot = await getDocs(col);
      const list: FirestoreTask[] = [];
      snapshot.forEach((d) => list.push(d.data() as FirestoreTask));

      if (list.length > 0) {
        this.activeTasks.set(list);
        return list;
      }

      const seedTasks: FirestoreTask[] = [
        {
          id: 'task_create_folder',
          groupId: 'grp_inf_101',
          teacherId: 'user_teacher_weber',
          teacherName: 'Frau Weber',
          title: 'Eigenen Dateiordner erstellen',
          description: 'Erstelle im Datei-Explorer unter /Klasse/ deinen eigenen Ordner mit deinem Vornamen.',
          category: 'files',
          dueDate: Date.now() + 86400000,
          completedBy: ['user_student_lukas', 'user_student_emma'],
          createdAt: Date.now() - 7200000,
        },
        {
          id: 'task_draw_avatar',
          groupId: 'grp_inf_101',
          teacherId: 'user_teacher_bean',
          teacherName: 'Herr Bean',
          title: 'Zeichne dein Klassen-Wappen in Paint',
          description: 'Male ein Bild mit geometrischen Formen und speichere es in deinem Ordner.',
          category: 'drawing',
          dueDate: Date.now() + 172800000,
          completedBy: ['user_student_lukas'],
          createdAt: Date.now() - 3600000,
        },
        {
          id: 'task_logic_game',
          groupId: 'grp_inf_101',
          teacherId: 'user_teacher_bean',
          teacherName: 'Herr Bean',
          title: 'Zeek the Geek - Level 1 lösen',
          description: 'Finde den Schlüssel und weiche den Hindernissen im Logik-Spiel aus.',
          category: 'logic',
          dueDate: Date.now() + 259200000,
          completedBy: [],
          createdAt: Date.now() - 1800000,
        },
      ];

      for (const t of seedTasks) {
        await setDoc(doc(db, path, t.id), t);
      }
      this.activeTasks.set(seedTasks);
      return seedTasks;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async syncAndSeedResources(): Promise<FirestoreResource[]> {
    const path = 'resources';
    try {
      const col = collection(db, path);
      const snapshot = await getDocs(col);
      const list: FirestoreResource[] = [];
      snapshot.forEach((d) => list.push(d.data() as FirestoreResource));

      if (list.length > 0) {
        this.activeResources.set(list);
        return list;
      }

      const seedResources: FirestoreResource[] = [
        {
          id: 'res_shortcuts',
          groupId: 'grp_inf_101',
          authorId: 'user_teacher_weber',
          authorName: 'Frau Weber',
          authorRole: 'teacher',
          title: 'Tastenkombinationen Spickzettel',
          type: 'document',
          content: 'Strg+C = Kopieren\nStrg+V = Einfügen\nStrg+Z = Rückgängig\nF11 = Vollbildmodus',
          urlOrPath: '/Klasse/Vorlagen/Shortcuts.txt',
          createdAt: Date.now() - 7200000,
        },
        {
          id: 'res_color_palette',
          groupId: 'grp_inf_101',
          authorId: 'user_teacher_bean',
          authorName: 'Herr Bean',
          authorRole: 'teacher',
          title: 'Farbpalette für Paint',
          type: 'image',
          content: 'Primär- und Sekundärfarben zum Mischen in digitalen Zeichenprogrammen.',
          urlOrPath: '/Klasse/Vorlagen/Farben.png',
          createdAt: Date.now() - 3600000,
        },
      ];

      for (const r of seedResources) {
        await setDoc(doc(db, path, r.id), r);
      }
      this.activeResources.set(seedResources);
      return seedResources;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async syncAndSeedMessages(): Promise<FirestoreMessage[]> {
    const path = 'messages';
    try {
      const col = collection(db, path);
      const snapshot = await getDocs(col);
      const list: FirestoreMessage[] = [];
      snapshot.forEach((d) => list.push(d.data() as FirestoreMessage));

      if (list.length > 0) {
        list.sort((a, b) => a.timestamp - b.timestamp);
        this.activeMessages.set(list);
        return list;
      }

      const seedMessages: FirestoreMessage[] = [
        {
          id: 'msg_init_1',
          groupId: 'grp_inf_101',
          senderId: 'user_teacher_weber',
          senderName: 'Frau Weber',
          senderRole: 'teacher',
          text: 'Guten Morgen Klasse 6b! Bitte öffnet den Datei-Explorer und folgt der ersten Aufgabe.',
          type: 'text',
          timestamp: Date.now() - 1800000,
        },
        {
          id: 'msg_init_2',
          groupId: 'grp_inf_101',
          senderId: 'user_student_lukas',
          senderName: 'Lukas',
          senderRole: 'student',
          text: 'Hallo Frau Weber! Ich habe meinen Ordner schon erstellt.',
          type: 'text',
          timestamp: Date.now() - 1200000,
        },
        {
          id: 'msg_init_3',
          groupId: 'grp_inf_101',
          senderId: 'user_teacher_bean',
          senderName: 'Herr Bean',
          senderRole: 'teacher',
          text: 'Sehr gut Lukas! 👏 Schaut auch in das Spiel "Zeek the Geek" für etwas Logik-Training.',
          type: 'text',
          emoji: '👏',
          timestamp: Date.now() - 600000,
        },
      ];

      for (const m of seedMessages) {
        await setDoc(doc(db, path, m.id), m);
      }
      this.activeMessages.set(seedMessages);
      return seedMessages;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  // -------------------------------------------------------------
  // REAL-TIME SUBSCRIPTIONS (onSnapshot)
  // -------------------------------------------------------------

  /**
   * Conecta en tiempo real a los mensajes instantáneos de un grupo
   */
  subscribeToGroupMessages(groupId: string): void {
    if (this.unsubMessages) {
      this.unsubMessages();
      this.unsubMessages = null;
    }

    const path = 'messages';
    try {
      const col = collection(db, path);
      // Query messages for this group or room
      this.unsubMessages = onSnapshot(
        col,
        (snapshot) => {
          const msgs: FirestoreMessage[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as FirestoreMessage;
            if (data.groupId === groupId || data.groupId === 'grp_inf_101') {
              msgs.push(data);
            }
          });
          msgs.sort((a, b) => a.timestamp - b.timestamp);
          this.activeMessages.set(msgs);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        },
      );
    } catch (err) {
      console.warn('Could not subscribe to messages:', err);
    }
  }

  /**
   * Conecta en tiempo real al grupo para ver cambios de miembros y estado
   */
  subscribeToGroups(): void {
    if (this.unsubGroups) {
      this.unsubGroups();
      this.unsubGroups = null;
    }

    const path = 'groups';
    try {
      const col = collection(db, path);
      this.unsubGroups = onSnapshot(
        col,
        (snapshot) => {
          const list: FirestoreGroup[] = [];
          snapshot.forEach((d) => list.push(d.data() as FirestoreGroup));
          this.activeGroups.set(list);
          if (list.length > 0 && !this.currentGroup()) {
            this.currentGroup.set(list[0]);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        },
      );
    } catch (err) {
      console.warn('Could not subscribe to groups:', err);
    }
  }

  /**
   * Conecta en tiempo real a notas, tareas y recursos
   */
  subscribeToCollaboration(groupId?: string): void {
    if (groupId) {
      const g = this.activeGroups().find((x) => x.id === groupId || x.code === groupId);
      if (g) {
        this.currentGroup.set(g);
      }
    }
    const notesPath = 'notes';
    const tasksPath = 'tasks';
    const resPath = 'resources';

    if (this.unsubNotes) this.unsubNotes();
    if (this.unsubTasks) this.unsubTasks();
    if (this.unsubResources) this.unsubResources();

    try {
      this.unsubNotes = onSnapshot(
        collection(db, notesPath),
        (snap) => {
          const notes: FirestoreNote[] = [];
          snap.forEach((d) => notes.push(d.data() as FirestoreNote));
          this.activeNotes.set(notes);
        },
        (err) => handleFirestoreError(err, OperationType.GET, notesPath),
      );

      this.unsubTasks = onSnapshot(
        collection(db, tasksPath),
        (snap) => {
          const tasks: FirestoreTask[] = [];
          snap.forEach((d) => tasks.push(d.data() as FirestoreTask));
          this.activeTasks.set(tasks);
        },
        (err) => handleFirestoreError(err, OperationType.GET, tasksPath),
      );

      this.unsubResources = onSnapshot(
        collection(db, resPath),
        (snap) => {
          const res: FirestoreResource[] = [];
          snap.forEach((d) => res.push(d.data() as FirestoreResource));
          this.activeResources.set(res);
        },
        (err) => handleFirestoreError(err, OperationType.GET, resPath),
      );
    } catch (err) {
      console.warn('Error connecting collaboration snapshot:', err);
    }
  }

  // -------------------------------------------------------------
  // OPERACIONES CRUD EN FIRESTORE
  // -------------------------------------------------------------

  /**
   * Envía un mensaje instantáneo en Firestore
   */
  async sendInstantMessage(
    groupId: string,
    senderId: string,
    senderName: string,
    senderRole: 'student' | 'teacher',
    text: string,
    type: 'text' | 'reaction' | 'question' | 'system' = 'text',
    emoji?: string,
  ): Promise<FirestoreMessage> {
    const path = 'messages';
    const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const msg: FirestoreMessage = {
      id,
      groupId,
      senderId,
      senderName,
      senderRole,
      text,
      type,
      emoji: emoji || '',
      timestamp: Date.now(),
    };

    try {
      await setDoc(doc(db, path, id), msg);
      return msg;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Crea un nuevo grupo único creado por el profesor
   */
  async createGroup(
    name: string,
    code: string,
    teacherId: string,
    teacherName: string,
    studentIds: string[] = [],
    icon = 'groups',
    color = '#6366f1',
  ): Promise<FirestoreGroup> {
    const path = 'groups';
    const id = 'grp_' + code.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Obtener información de los miembros agregados
    const allUsers = this.registeredUsers();
    const studentMembers = allUsers
      .filter((u) => studentIds.includes(u.id))
      .map((u) => ({ id: u.id, name: u.username, role: 'student' as const }));

    const members: FirestoreGroup['members'] = [
      { id: teacherId, name: teacherName, role: 'teacher' as const },
      ...studentMembers,
    ];

    const group: FirestoreGroup = {
      id,
      code: code.toUpperCase().trim(),
      name: name.trim(),
      teacherId,
      teacherName,
      studentIds,
      members,
      icon,
      color,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, path, id), group);
      this.currentGroup.set(group);
      return group;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Agrega un estudiante a un grupo existente
   */
  async addStudentToGroup(groupId: string, studentId: string, studentName: string): Promise<void> {
    const path = 'groups';
    try {
      const ref = doc(db, path, groupId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as FirestoreGroup;
        const studentIds = Array.from(new Set([...(data.studentIds || []), studentId]));
        const memberExists = (data.members || []).some((m) => m.id === studentId);
        const members = memberExists
          ? data.members
          : [...(data.members || []), { id: studentId, name: studentName, role: 'student' as const }];

        await updateDoc(ref, {
          studentIds,
          members,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  /**
   * Crea una nota compartida
   */
  async createNote(
    groupId: string,
    authorId: string,
    authorName: string,
    authorRole: 'student' | 'teacher',
    title: string,
    text: string,
    color = 'amber',
  ): Promise<FirestoreNote> {
    const path = 'notes';
    const id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const note: FirestoreNote = {
      id,
      groupId,
      authorId,
      authorName,
      authorRole,
      title: title.trim() || 'Nota sin título',
      text: text.trim(),
      color,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, path, id), note);
      return note;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Elimina una nota
   */
  async deleteNote(noteId: string): Promise<void> {
    const path = 'notes';
    try {
      await deleteDoc(doc(db, path, noteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Crea una nueva tarea (asignación del profesor)
   */
  async createTask(
    groupId: string,
    teacherId: string,
    teacherName: string,
    title: string,
    description: string,
    category: 'files' | 'drawing' | 'logic' | 'coding' | 'general' = 'general',
    dueDate: number = Date.now() + 86400000,
  ): Promise<FirestoreTask> {
    const path = 'tasks';
    const id = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const task: FirestoreTask = {
      id,
      groupId,
      teacherId,
      teacherName,
      title: title.trim(),
      description: description.trim(),
      category,
      dueDate,
      completedBy: [],
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, path, id), task);
      return task;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Marca o desmarca una tarea como completada por un estudiante
   */
  async toggleTaskCompletion(taskId: string, studentId: string): Promise<void> {
    const path = 'tasks';
    try {
      const ref = doc(db, path, taskId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const task = snap.data() as FirestoreTask;
        const completed = task.completedBy || [];
        const isCompleted = completed.includes(studentId);
        const next = isCompleted ? completed.filter((id) => id !== studentId) : [...completed, studentId];
        await updateDoc(ref, { completedBy: next });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  /**
   * Crea un nuevo recurso educativo compartido
   */
  async createResource(
    groupId: string,
    authorId: string,
    authorName: string,
    authorRole: 'student' | 'teacher',
    title: string,
    type: 'document' | 'image' | 'link' | 'exercise',
    content: string,
    urlOrPath = '',
  ): Promise<FirestoreResource> {
    const path = 'resources';
    const id = 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const res: FirestoreResource = {
      id,
      groupId,
      authorId,
      authorName,
      authorRole,
      title: title.trim(),
      type,
      content: content.trim(),
      urlOrPath: urlOrPath.trim(),
      createdAt: Date.now(),
    };

    try {
      await setDoc(doc(db, path, id), res);
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Valida si un usuario que intenta ingresar está registrado en Firestore con el rol indicado.
   */
  async verifyRegisteredUser(
    usernameInput: string,
    expectedRole: 'student' | 'teacher',
  ): Promise<{ valid: boolean; user?: RegisteredUser; error?: string }> {
    const cleanName = usernameInput.trim().toLowerCase();
    if (!cleanName) {
      return {
        valid: false,
        error:
          expectedRole === 'teacher'
            ? 'Por favor introduce el nombre del docente registrado.'
            : 'Por favor introduce tu nombre de estudiante registrado.',
      };
    }

    const list = this.registeredUsers();
    let found = list.find(
      (u) => u.username.toLowerCase() === cleanName && u.role === expectedRole,
    );

    if (!found && typeof window !== 'undefined') {
      try {
        const refreshed = await this.syncAndSeedUsers();
        found = refreshed.find(
          (u) => u.username.toLowerCase() === cleanName && u.role === expectedRole,
        );
      } catch {
        // Ignorar
      }
    }

    if (found) {
      if (!found.active) {
        return {
          valid: false,
          error: 'Esta cuenta de usuario ha sido desactivada por el administrador.',
        };
      }
      return {
        valid: true,
        user: found,
      };
    }

    const validNames = this.getRegisteredNamesByRole(expectedRole).join(', ');
    return {
      valid: false,
      error:
        expectedRole === 'teacher'
          ? `Docente no registrado en la base de datos "klassenRoom". Docentes válidos: ${validNames}.`
          : `El alumno "${usernameInput}" no está registrado en la base de datos "klassenRoom". Alumnos autorizados: ${validNames}.`,
    };
  }

  getRegisteredNamesByRole(role: 'student' | 'teacher'): string[] {
    return this.registeredUsers()
      .filter((u) => u.role === role)
      .map((u) => u.username);
  }

  getRegisteredStudents(): RegisteredUser[] {
    return this.registeredUsers().filter((u) => u.role === 'student');
  }

  getRegisteredTeachers(): RegisteredUser[] {
    return this.registeredUsers().filter((u) => u.role === 'teacher');
  }
}
