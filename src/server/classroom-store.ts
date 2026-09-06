import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Response } from 'express';
import type {
  ChatMessage,
  ClassroomState,
  UserSession,
  VirtualItem,
  WhiteboardStamp,
  WhiteboardStroke,
} from '../app/models/classroom.types.js';

const DATA_DIR = join(process.cwd(), 'data');
const DB_FILE = join(DATA_DIR, 'classrooms.json');

// In-memory store
const classrooms = new Map<string, ClassroomState>();
// SSE subscribers: roomCode -> Set of Express Response objects
const subscribers = new Map<string, Set<Response>>();

function ensureDataDir(): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data dir:', err);
  }
}

export function loadPersistentData(): void {
  ensureDataDir();
  try {
    if (existsSync(DB_FILE)) {
      const raw = readFileSync(DB_FILE, 'utf-8');
      const data: Record<string, ClassroomState> = JSON.parse(raw);
      for (const [code, state] of Object.entries(data)) {
        classrooms.set(code.toUpperCase(), state);
      }
      console.log(`Loaded ${classrooms.size} classrooms from disk.`);
    }
  } catch (err) {
    console.error('Error loading classrooms.json:', err);
  }

  // If no classroom exists, create a default demo classroom: 'INF-101'
  if (classrooms.size === 0) {
    createInitialClassroom('INF-101', 'Informatik Klasse 6b', 'Frau Weber');
  }
}

export function savePersistentData(): void {
  ensureDataDir();
  try {
    const data: Record<string, ClassroomState> = {};
    for (const [code, state] of classrooms.entries()) {
      data[code] = state;
    }
    writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving classrooms.json:', err);
  }
}

export function createInitialClassroom(code: string, name: string, teacherName: string): ClassroomState {
  const teacherId = 'teach_' + Math.random().toString(36).substring(2, 9);
  const now = Date.now();

  const files: Record<string, VirtualItem> = {};

  // System Root Folders
  files['/Klasse'] = {
    id: 'f_klasse',
    name: 'Meine Klasse',
    type: 'folder',
    parentId: null,
    path: '/Klasse',
    ownerId: 'system',
    isProtected: false,
    createdAt: now,
    updatedAt: now,
  };

  files['/Lehrermaterial'] = {
    id: 'f_lehrer',
    name: 'Lehrermaterial',
    type: 'folder',
    parentId: null,
    path: '/Lehrermaterial',
    ownerId: 'teacher',
    ownerName: teacherName,
    isProtected: true,
    createdAt: now,
    updatedAt: now,
  };

  files['/Geteilte Arbeiten'] = {
    id: 'f_geteilt',
    name: 'Geteilte Arbeiten',
    type: 'folder',
    parentId: null,
    path: '/Geteilte Arbeiten',
    ownerId: 'teacher',
    isProtected: false,
    createdAt: now,
    updatedAt: now,
  };

  // Shared Team Work Folder
  files['/Klasse/Equipos'] = {
    id: 'f_equipos',
    name: 'Equipos de Trabajo',
    type: 'folder',
    parentId: 'f_klasse',
    path: '/Klasse/Equipos',
    ownerId: 'system',
    isProtected: false,
    createdAt: now,
    updatedAt: now,
  };

  files['/Klasse/Equipos/Equipo Astronautas'] = {
    id: 'f_equipo_astronautas',
    name: 'Equipo Astronautas',
    type: 'folder',
    parentId: 'f_equipos',
    path: '/Klasse/Equipos/Equipo Astronautas',
    ownerId: 'system',
    isProtected: false,
    createdAt: now,
    updatedAt: now,
  };

  files['/Papierkorb'] = {
    id: 'f_papierkorb',
    name: 'Papierkorb',
    type: 'folder',
    parentId: null,
    path: '/Papierkorb',
    ownerId: 'system',
    isProtected: false,
    createdAt: now,
    updatedAt: now,
  };

  // Sample teacher materials
  files['/Lehrermaterial/Computer_Grundregeln.txt'] = {
    id: 'f_doc_grundregeln',
    name: 'Computer_Grundregeln.txt',
    type: 'file',
    fileType: 'text',
    parentId: 'f_lehrer',
    path: '/Lehrermaterial/Computer_Grundregeln.txt',
    ownerId: 'teacher',
    ownerName: teacherName,
    isProtected: true,
    content: `WILLKOMMEN ZUM COMPUTER-FÜHRERSCHEIN (Klasse 6)
-----------------------------------------------
1. Jeder Schüler hat seinen eigenen persönlichen Ordner.
2. Speichere deine Zeichnungen immer mit einem aussagekräftigen Namen (z.B. "Mein Haus.png").
3. Lösche niemals Dateien von Mitschülern!
4. Im Papierkorb findest du Dateien wieder, falls du versehentlich etwas gelöscht hast.
5. Benutze Strg+C zum Kopieren und Strg+V zum Einfügen.

Viel Spaß beim Entdecken des Computers!
- ${teacherName}`,
    createdAt: now,
    updatedAt: now,
    sizeBytes: 450,
  };

  files['/Lehrermaterial/Tastatur_Tricks.txt'] = {
    id: 'f_doc_tastatur',
    name: 'Tastatur_Tricks.txt',
    type: 'file',
    fileType: 'text',
    parentId: 'f_lehrer',
    path: '/Lehrermaterial/Tastatur_Tricks.txt',
    ownerId: 'teacher',
    ownerName: teacherName,
    isProtected: true,
    content: `SCHNELLE TASTEN-KOMBINATIONEN:
----------------------------------
* Strg + C = Kopieren (Copy)
* Strg + V = Einfügen (Paste)
* Strg + X = Ausschneiden (Cut)
* Strg + Z = Rückgängig machen (Undo)
* Strg + Y = Wiederholen (Redo)
* Entf (Entfernen) = In den Papierkorb verschieben

Tipp: Mit der Tab-Taste kannst du schnell zwischen Feldern springen!`,
    createdAt: now,
    updatedAt: now,
    sizeBytes: 310,
  };

  // Sample SVG DataURL for a sample house drawing in teacher material
  const sampleHouseSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f1f5f9"/><rect x="120" y="140" width="160" height="120" fill="%23f59e0b" stroke="%23b45309" stroke-width="4"/><polygon points="200,60 100,140 300,140" fill="%23ef4444" stroke="%23b91c1c" stroke-width="4"/><rect x="180" y="190" width="40" height="70" fill="%233b82f6"/><circle cx="150" cy="170" r="18" fill="%2360a5fa" stroke="%231d4ed8" stroke-width="3"/><circle cx="250" cy="170" r="18" fill="%2360a5fa" stroke="%231d4ed8" stroke-width="3"/><rect x="240" y="80" width="25" height="40" fill="%2378716c"/><circle cx="50" cy="60" r="30" fill="%23facc15"/><text x="130" y="285" font-family="sans-serif" font-size="14" fill="%23334155">Muster-Haus von Frau Weber</text></svg>`;

  files['/Lehrermaterial/Muster_Haus.png'] = {
    id: 'f_img_musterhaus',
    name: 'Muster_Haus.png',
    type: 'file',
    fileType: 'image',
    parentId: 'f_lehrer',
    path: '/Lehrermaterial/Muster_Haus.png',
    ownerId: 'teacher',
    ownerName: teacherName,
    isProtected: true,
    content: sampleHouseSvg,
    thumbnail: sampleHouseSvg,
    createdAt: now,
    updatedAt: now,
    sizeBytes: 1240,
  };

  const state: ClassroomState = {
    code: code.toUpperCase(),
    name,
    createdAt: now,
    teacherId,
    teacherName,
    students: [],
    files,
    demoMode: {
      active: false,
      controlledBy: teacherId,
      controlledByName: teacherName,
      teacherCursor: { x: 200, y: 150, visible: false },
    },
    helpRequests: [],
    observingStudentId: null,
    groups: [
      {
        id: 'grp_astronautas',
        name: 'Equipo Astronautas',
        icon: 'rocket_launch',
        color: 'blue',
        creatorId: 'system',
        creatorName: 'Profesor',
        members: [],
        notes: [
          {
            id: 'note_1',
            author: 'Profesor',
            text: '¡Bienvenidos a este equipo! Aquí pueden guardar archivos colaborativos y compartir ideas.',
            timestamp: now,
          },
        ],
        folderPath: '/Klasse/Equipos/Equipo Astronautas',
        createdAt: now,
      },
      {
        id: 'grp_exploradores',
        name: 'Equipo Exploradores',
        icon: 'explore',
        color: 'emerald',
        creatorId: 'system',
        creatorName: 'Profesor',
        members: [],
        notes: [],
        folderPath: '/Klasse/Equipos/Equipo Exploradores',
        createdAt: now,
      },
    ],
    reactions: [],
    chatMessages: [
      {
        id: 'msg_welcome',
        senderId: teacherId,
        senderName: teacherName,
        senderRole: 'teacher',
        text: '¡Bienvenidos al espacio de la clase! Aquí podemos comunicarnos, compartir dudas e ideas.',
        timestamp: now,
        type: 'system',
      },
    ],
    whiteboardStrokes: [],
    whiteboardStamps: [],
  };

  classrooms.set(code.toUpperCase(), state);
  savePersistentData();
  return state;
}

export function getClassroom(code: string): ClassroomState | undefined {
  return classrooms.get(code.toUpperCase());
}

export function subscribeToClassroom(code: string, res: Response): void {
  const normCode = code.toUpperCase();
  if (!subscribers.has(normCode)) {
    subscribers.set(normCode, new Set());
  }
  subscribers.get(normCode)!.add(res);

  res.on('close', () => {
    const set = subscribers.get(normCode);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        subscribers.delete(normCode);
      }
    }
  });
}

export function broadcastEvent(code: string, eventName: string, data: unknown): void {
  const normCode = code.toUpperCase();
  const set = subscribers.get(normCode);
  if (!set || set.size === 0) return;

  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of set) {
    try {
      client.write(payload);
    } catch {
      set.delete(client);
    }
  }
}

export function registerStudentInRoom(
  room: ClassroomState,
  studentName: string,
): { student: UserSession; isNew: boolean } {
  const now = Date.now();
  // Check if student with same name already exists in room
  let student = room.students.find(
    (s) => s.name.trim().toLowerCase() === studentName.trim().toLowerCase(),
  );
  let isNew = false;

  if (!student) {
    isNew = true;
    const studentId = 'stud_' + Math.random().toString(36).substring(2, 9);
    student = {
      id: studentId,
      name: studentName.trim(),
      role: 'student',
      roomCode: room.code,
      connectedAt: now,
      lastActive: now,
      taskProgress: 0,
      currentApp: 'explorer',
    };
    room.students.push(student);
  } else {
    student.lastActive = now;
  }

  // Ensure student personal folder exists: /Klasse/{studentName}
  const folderPath = `/Klasse/${student.name}`;
  if (!room.files[folderPath]) {
    room.files[folderPath] = {
      id: 'f_stud_' + student.id,
      name: student.name,
      type: 'folder',
      parentId: 'f_klasse',
      path: folderPath,
      ownerId: student.id,
      ownerName: student.name,
      isProtected: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Ensure student trash folder exists: /Papierkorb/{studentName}
  const trashPath = `/Papierkorb/${student.name}`;
  if (!room.files[trashPath]) {
    room.files[trashPath] = {
      id: 'f_trash_' + student.id,
      name: student.name,
      type: 'folder',
      parentId: 'f_papierkorb',
      path: trashPath,
      ownerId: student.id,
      ownerName: student.name,
      isProtected: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  savePersistentData();
  broadcastEvent(room.code, 'room:update', {
    students: room.students,
    files: room.files,
  });

  return { student, isNew };
}

export function checkWritePermission(
  userRole: string,
  userId: string,
  userName: string,
  targetPath: string,
): boolean {
  if (userRole === 'teacher') return true;

  // Students can write inside their personal folders or team workspaces
  const studentFolder = `/Klasse/${userName}`;
  const studentTrash = `/Papierkorb/${userName}`;
  const teamWorkspace = `/Klasse/Equipos`;

  if (
    targetPath.startsWith(studentFolder) ||
    targetPath.startsWith(studentTrash) ||
    targetPath.startsWith(teamWorkspace)
  ) {
    return true;
  }

  return false;
}

export function createGroup(
  code: string,
  name: string,
  icon: string,
  color: string,
  creatorId: string,
  creatorName: string,
) {
  const room = getClassroom(code);
  if (!room) return null;
  if (!room.groups) room.groups = [];

  const now = Date.now();
  const safeName = name.trim();
  const groupId = 'grp_' + Math.random().toString(36).substring(2, 9);
  const folderPath = `/Klasse/Equipos/${safeName}`;

  // Ensure folder exists in files
  if (!room.files[folderPath]) {
    room.files[folderPath] = {
      id: 'f_grp_' + groupId,
      name: safeName,
      type: 'folder',
      parentId: 'f_equipos',
      path: folderPath,
      ownerId: creatorId,
      ownerName: creatorName,
      isProtected: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  const group = {
    id: groupId,
    name: safeName,
    icon: icon || 'groups',
    color: color || 'blue',
    creatorId,
    creatorName,
    members: [{ id: creatorId, name: creatorName }],
    notes: [],
    folderPath,
    createdAt: now,
  };

  room.groups.push(group);

  // Set student's groupId
  const student = room.students.find((s) => s.id === creatorId);
  if (student) {
    student.groupId = groupId;
  }

  savePersistentData();
  broadcastEvent(room.code, 'room:update', {
    groups: room.groups,
    students: room.students,
    files: room.files,
  });

  return group;
}

export function joinGroup(
  code: string,
  groupId: string,
  userId: string,
  userName: string,
) {
  const room = getClassroom(code);
  if (!room || !room.groups) return false;

  // Remove user from any existing group
  for (const g of room.groups) {
    g.members = g.members.filter((m) => m.id !== userId);
  }

  const targetGroup = room.groups.find((g) => g.id === groupId);
  if (targetGroup) {
    targetGroup.members.push({ id: userId, name: userName });
  }

  const student = room.students.find((s) => s.id === userId);
  if (student) {
    student.groupId = targetGroup ? groupId : undefined;
  }

  savePersistentData();
  broadcastEvent(room.code, 'room:update', {
    groups: room.groups,
    students: room.students,
  });

  return true;
}

export function addGroupNote(
  code: string,
  groupId: string,
  author: string,
  text: string,
) {
  const room = getClassroom(code);
  if (!room || !room.groups) return false;

  const group = room.groups.find((g) => g.id === groupId);
  if (!group) return false;

  const note = {
    id: 'note_' + Math.random().toString(36).substring(2, 9),
    author,
    text,
    timestamp: Date.now(),
  };

  group.notes.push(note);
  savePersistentData();
  broadcastEvent(room.code, 'room:update', {
    groups: room.groups,
  });

  return true;
}

export function sendPeerReaction(
  code: string,
  fromStudentId: string,
  fromStudentName: string,
  toStudentId: string,
  type: 'bravo' | 'star' | 'idea' | 'rocket',
) {
  const room = getClassroom(code);
  if (!room) return false;
  if (!room.reactions) room.reactions = [];

  const emojiMap: Record<string, string> = {
    bravo: '👏',
    star: '⭐',
    idea: '💡',
    rocket: '🚀',
  };

  const labelMap: Record<string, string> = {
    bravo: '¡Gran trabajo!',
    star: '¡Estrella de oro!',
    idea: '¡Qué buena idea!',
    rocket: '¡Imparable!',
  };

  const reaction = {
    id: 'rx_' + Math.random().toString(36).substring(2, 9),
    fromStudentId,
    fromStudentName,
    toStudentId,
    type,
    emoji: emojiMap[type] || '👍',
    label: labelMap[type] || '¡Bien hecho!',
    timestamp: Date.now(),
  };

  room.reactions.push(reaction);
  // Keep last 40 reactions in memory
  if (room.reactions.length > 40) {
    room.reactions = room.reactions.slice(-40);
  }

  // Update target student's counters
  const target = room.students.find((s) => s.id === toStudentId);
  if (target) {
    if (!target.reactionsReceived) {
      target.reactionsReceived = { bravo: 0, star: 0, idea: 0, rocket: 0 };
    }
    if (type in target.reactionsReceived) {
      target.reactionsReceived[type] += 1;
    }
  }

  savePersistentData();
  broadcastEvent(room.code, 'room:reaction', reaction);
  broadcastEvent(room.code, 'room:update', {
    students: room.students,
    reactions: room.reactions,
  });

  return true;
}

export function updateStudentActivity(
  code: string,
  userId: string,
  currentApp?: string,
  activityDetail?: string,
  thumbnail?: string,
) {
  const room = getClassroom(code);
  if (!room) return false;

  const student = room.students.find((s) => s.id === userId);
  if (!student) return false;

  student.lastActive = Date.now();
  if (currentApp !== undefined) student.currentApp = currentApp;
  if (activityDetail !== undefined) student.activityDetail = activityDetail;
  if (thumbnail !== undefined) student.thumbnail = thumbnail;

  savePersistentData();
  broadcastEvent(room.code, 'room:update', {
    students: room.students,
  });

  return true;
}

export function removeClassroom(code: string): boolean {
  const norm = code.toUpperCase();
  broadcastEvent(norm, 'room:closed', { message: 'Classroom has been closed by the teacher.' });
  const deleted = classrooms.delete(norm);
  subscribers.delete(norm);
  savePersistentData();
  return deleted;
}

export function sendChatMessage(
  code: string,
  senderId: string,
  senderName: string,
  senderRole: 'teacher' | 'student',
  text: string,
  type: 'text' | 'reaction' | 'system' | 'question' = 'text',
  emoji?: string,
): ChatMessage | null {
  const room = getClassroom(code);
  if (!room) return null;

  if (!room.chatMessages) {
    room.chatMessages = [];
  }

  const message: ChatMessage = {
    id: 'msg_' + Math.random().toString(36).substring(2, 9),
    senderId,
    senderName,
    senderRole,
    text: text.trim(),
    timestamp: Date.now(),
    type,
    emoji,
  };

  room.chatMessages.push(message);
  // Cap at 100 messages to prevent excessive memory
  if (room.chatMessages.length > 100) {
    room.chatMessages = room.chatMessages.slice(-100);
  }

  savePersistentData();
  broadcastEvent(room.code, 'chat:message', message);
  return message;
}

export function clearChatMessages(code: string): boolean {
  const room = getClassroom(code);
  if (!room) return false;

  room.chatMessages = [];
  savePersistentData();
  broadcastEvent(room.code, 'chat:cleared', {});
  return true;
}

export function addWhiteboardStroke(
  code: string,
  strokeData: Omit<WhiteboardStroke, 'id' | 'timestamp'>,
): WhiteboardStroke | null {
  const room = getClassroom(code);
  if (!room) return null;

  if (!room.whiteboardStrokes) {
    room.whiteboardStrokes = [];
  }

  const stroke: WhiteboardStroke = {
    ...strokeData,
    id: 'strk_' + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  };

  room.whiteboardStrokes.push(stroke);
  // Cap at 400 strokes
  if (room.whiteboardStrokes.length > 400) {
    room.whiteboardStrokes = room.whiteboardStrokes.slice(-400);
  }

  savePersistentData();
  broadcastEvent(room.code, 'whiteboard:stroke', stroke);
  return stroke;
}

export function addWhiteboardStamp(
  code: string,
  stampData: Omit<WhiteboardStamp, 'id' | 'timestamp'>,
): WhiteboardStamp | null {
  const room = getClassroom(code);
  if (!room) return null;

  if (!room.whiteboardStamps) {
    room.whiteboardStamps = [];
  }

  const stamp: WhiteboardStamp = {
    ...stampData,
    id: 'stmp_' + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  };

  room.whiteboardStamps.push(stamp);
  if (room.whiteboardStamps.length > 100) {
    room.whiteboardStamps = room.whiteboardStamps.slice(-100);
  }

  savePersistentData();
  broadcastEvent(room.code, 'whiteboard:stamp', stamp);
  return stamp;
}

export function clearWhiteboard(code: string): boolean {
  const room = getClassroom(code);
  if (!room) return false;

  room.whiteboardStrokes = [];
  room.whiteboardStamps = [];
  savePersistentData();
  broadcastEvent(room.code, 'whiteboard:cleared', {});
  return true;
}

