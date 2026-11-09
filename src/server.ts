import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import {
  addGroupNote,
  addWhiteboardStamp,
  addWhiteboardStroke,
  broadcastEvent,
  checkWritePermission,
  clearChatMessages,
  clearWhiteboard,
  createGroup,
  createInitialClassroom,
  getClassroom,
  joinGroup,
  loadPersistentData,
  registerStudentInRoom,
  removeClassroom,
  savePersistentData,
  sendChatMessage,
  sendPeerReaction,
  subscribeToClassroom,
  updateStudentActivity,
} from './server/classroom-store.js';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Parse JSON request bodies
app.use(express.json({ limit: '15mb' }));

// Initialize classrooms from disk
loadPersistentData();

// ==========================================
// CLASSROOM REST & REAL-TIME API
// ==========================================

// 1. Create a new classroom (Teacher)
app.post('/api/classroom/create', (req, res) => {
  const { name, teacherName } = req.body;
  if (!name || !teacherName) {
    res.status(400).json({ error: 'Name und Lehrername sind erforderlich.' });
    return;
  }

  // Generate 6-char room code like 'INF-492' or random alphanumeric
  const randomDigits = Math.floor(100 + Math.random() * 900);
  const code = `INF-${randomDigits}`;

  const room = createInitialClassroom(code, name.trim(), teacherName.trim());
  res.json({
    success: true,
    code: room.code,
    room,
    teacher: {
      id: room.teacherId,
      name: room.teacherName,
      role: 'teacher',
      roomCode: room.code,
    },
  });
});

// 2. Join a classroom (Student)
app.post('/api/classroom/join', (req, res) => {
  const { code, studentName } = req.body;
  if (!code || !studentName) {
    res.status(400).json({ error: 'Klassen-Code und Schülername sind erforderlich.' });
    return;
  }

  const room = getClassroom(code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden. Bitte Code prüfen.' });
    return;
  }

  const { student } = registerStudentInRoom(room, studentName);
  res.json({
    success: true,
    code: room.code,
    student,
    room,
  });
});

// 3. Get classroom state
app.get('/api/classroom/:code/state', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }
  res.json(room);
});

// 4. Server-Sent Events (SSE) live connection stream
app.get('/api/classroom/:code/stream', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  subscribeToClassroom(room.code, res);

  // Send initial state
  res.write(`event: init\ndata: ${JSON.stringify(room)}\n\n`);

  // Heartbeat keep-alive every 20s
  const interval = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(interval);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// 5. File System: Create Folder
app.post('/api/classroom/:code/fs/create-folder', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { parentPath, folderName, userId, userRole, userName } = req.body;
  const cleanName = (folderName || '').trim();

  if (!cleanName || /[\\/:*?"<>|]/.test(cleanName)) {
    res.status(400).json({ error: 'Ungültiger Ordnername.' });
    return;
  }

  const newPath = parentPath === '/' ? `/${cleanName}` : `${parentPath}/${cleanName}`;

  if (!checkWritePermission(userRole, userId, userName, newPath)) {
    res.status(403).json({ error: 'Keine Schreibberechtigung in diesem Ordner.' });
    return;
  }

  if (room.files[newPath]) {
    res.status(400).json({ error: 'Ein Ordner mit diesem Namen existiert bereits.' });
    return;
  }

  const now = Date.now();
  const parentItem = room.files[parentPath];

  room.files[newPath] = {
    id: 'f_' + Math.random().toString(36).substring(2, 9),
    name: cleanName,
    type: 'folder',
    parentId: parentItem ? parentItem.id : null,
    path: newPath,
    ownerId: userId,
    ownerName: userName,
    createdAt: now,
    updatedAt: now,
  };

  savePersistentData();
  broadcastEvent(room.code, 'fs:update', {
    action: 'create-folder',
    item: room.files[newPath],
    files: room.files,
  });

  res.json({ success: true, item: room.files[newPath] });
});

// 6. File System: Save File (Paint drawing or text doc)
app.post('/api/classroom/:code/fs/save-file', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { parentPath, fileName, content, fileType, userId, userRole, userName, thumbnail } = req.body;
  let cleanName = (fileName || '').trim();
  if (!cleanName) {
    res.status(400).json({ error: 'Dateiname darf nicht leer sein.' });
    return;
  }

  const ext = fileType === 'image' ? '.png' : '.txt';
  if (!cleanName.toLowerCase().endsWith(ext)) {
    cleanName += ext;
  }

  const filePath = parentPath === '/' ? `/${cleanName}` : `${parentPath}/${cleanName}`;

  if (!checkWritePermission(userRole, userId, userName, filePath)) {
    res.status(403).json({ error: 'Du darfst nur in deinem eigenen Schülerordner speichern!' });
    return;
  }

  const now = Date.now();
  const parentItem = room.files[parentPath];
  const isUpdate = !!room.files[filePath];

  const fileItem = {
    id: isUpdate ? room.files[filePath].id : 'f_' + Math.random().toString(36).substring(2, 9),
    name: cleanName,
    type: 'file' as const,
    fileType: (fileType || 'image') as 'image' | 'text',
    parentId: parentItem ? parentItem.id : null,
    path: filePath,
    content,
    thumbnail: thumbnail || content,
    ownerId: userId,
    ownerName: userName,
    createdAt: isUpdate ? room.files[filePath].createdAt : now,
    updatedAt: now,
    sizeBytes: content ? content.length : 0,
  };

  room.files[filePath] = fileItem;

  // Update student thumbnail in classroom roster for Teacher preview
  const student = room.students.find((s) => s.id === userId);
  if (student && thumbnail) {
    student.thumbnail = thumbnail;
    student.lastActive = now;
  }

  savePersistentData();
  broadcastEvent(room.code, 'fs:update', {
    action: 'save-file',
    item: fileItem,
    files: room.files,
    students: room.students,
  });

  res.json({ success: true, item: fileItem });
});

// 7. File System: Rename Item
app.post('/api/classroom/:code/fs/rename', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { path, newName, userId, userRole, userName } = req.body;
  const cleanName = (newName || '').trim();

  if (!cleanName || /[\\/:*?"<>|]/.test(cleanName)) {
    res.status(400).json({ error: 'Ungültiger Name.' });
    return;
  }

  const oldItem = room.files[path];
  if (!oldItem) {
    res.status(404).json({ error: 'Element nicht gefunden.' });
    return;
  }

  if (oldItem.isProtected || !checkWritePermission(userRole, userId, userName, path)) {
    res.status(403).json({ error: 'Keine Berechtigung zum Umbenennen dieses Elements.' });
    return;
  }

  const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
  const newPath = parentPath === '/' ? `/${cleanName}` : `${parentPath}/${cleanName}`;

  if (room.files[newPath]) {
    res.status(400).json({ error: 'Ein Element mit diesem Namen existiert bereits.' });
    return;
  }

  // Rename item and all children if folder
  const now = Date.now();
  delete room.files[path];
  oldItem.name = cleanName;
  oldItem.path = newPath;
  oldItem.updatedAt = now;
  room.files[newPath] = oldItem;

  if (oldItem.type === 'folder') {
    for (const [childPath, childItem] of Object.entries(room.files)) {
      if (childPath.startsWith(path + '/')) {
        const updatedChildPath = newPath + childPath.substring(path.length);
        delete room.files[childPath];
        childItem.path = updatedChildPath;
        room.files[updatedChildPath] = childItem;
      }
    }
  }

  savePersistentData();
  broadcastEvent(room.code, 'fs:update', {
    action: 'rename',
    oldPath: path,
    newPath,
    files: room.files,
  });

  res.json({ success: true, item: oldItem });
});

// 8. File System: Move Item (Drag & Drop or Cut/Paste)
app.post('/api/classroom/:code/fs/move', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { sourcePath, destinationParentPath, userId, userRole, userName } = req.body;
  const item = room.files[sourcePath];
  if (!item) {
    res.status(404).json({ error: 'Quelldatei nicht gefunden.' });
    return;
  }

  const targetPath =
    destinationParentPath === '/'
      ? `/${item.name}`
      : `${destinationParentPath}/${item.name}`;

  if (
    !checkWritePermission(userRole, userId, userName, sourcePath) ||
    !checkWritePermission(userRole, userId, userName, targetPath)
  ) {
    res.status(403).json({ error: 'Keine Berechtigung zum Verschieben an diesen Ort.' });
    return;
  }

  if (room.files[targetPath]) {
    res.status(400).json({ error: 'Am Zielort existiert bereits eine Datei mit diesem Namen.' });
    return;
  }

  delete room.files[sourcePath];
  item.path = targetPath;
  item.updatedAt = Date.now();
  room.files[targetPath] = item;

  // Move child files if moving a folder
  if (item.type === 'folder') {
    for (const [childPath, childItem] of Object.entries(room.files)) {
      if (childPath.startsWith(sourcePath + '/')) {
        const updatedChildPath = targetPath + childPath.substring(sourcePath.length);
        delete room.files[childPath];
        childItem.path = updatedChildPath;
        room.files[updatedChildPath] = childItem;
      }
    }
  }

  savePersistentData();
  broadcastEvent(room.code, 'fs:update', {
    action: 'move',
    sourcePath,
    targetPath,
    files: room.files,
  });

  res.json({ success: true, item });
});

// 9. File System: Copy & Paste
app.post('/api/classroom/:code/fs/copy', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { sourcePath, destinationParentPath, userId, userRole, userName } = req.body;
  const source = room.files[sourcePath];
  if (!source) {
    res.status(404).json({ error: 'Quelle nicht gefunden.' });
    return;
  }

  let copyName = source.name;
  let targetPath =
    destinationParentPath === '/'
      ? `/${copyName}`
      : `${destinationParentPath}/${copyName}`;

  if (!checkWritePermission(userRole, userId, userName, targetPath)) {
    res.status(403).json({ error: 'Keine Schreibrechte im Zielordner.' });
    return;
  }

  // If item already exists, add (Kopie)
  if (room.files[targetPath]) {
    const dotIndex = copyName.lastIndexOf('.');
    if (dotIndex > 0) {
      copyName = `${copyName.substring(0, dotIndex)} - Kopie${copyName.substring(dotIndex)}`;
    } else {
      copyName = `${copyName} - Kopie`;
    }
    targetPath =
      destinationParentPath === '/'
        ? `/${copyName}`
        : `${destinationParentPath}/${copyName}`;
  }

  const now = Date.now();
  const newItem = {
    ...source,
    id: 'f_' + Math.random().toString(36).substring(2, 9),
    name: copyName,
    path: targetPath,
    ownerId: userId,
    ownerName: userName,
    createdAt: now,
    updatedAt: now,
  };

  room.files[targetPath] = newItem;
  savePersistentData();
  broadcastEvent(room.code, 'fs:update', {
    action: 'copy',
    item: newItem,
    files: room.files,
  });

  res.json({ success: true, item: newItem });
});

// 10. File System: Move to Papierkorb (Recycle Bin)
app.post('/api/classroom/:code/fs/trash', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { path, userId, userRole, userName } = req.body;
  const item = room.files[path];
  if (!item) {
    res.status(404).json({ error: 'Element nicht gefunden.' });
    return;
  }

  if (item.isProtected || !checkWritePermission(userRole, userId, userName, path)) {
    res.status(403).json({ error: 'Dieses Element darf nicht gelöscht werden.' });
    return;
  }

  const trashFolder = `/Papierkorb/${userName}`;
  const trashPath = `${trashFolder}/${item.name}`;

  delete room.files[path];
  item.originalPath = path;
  item.inTrash = true;
  item.path = trashPath;
  item.updatedAt = Date.now();
  room.files[trashPath] = item;

  savePersistentData();
  broadcastEvent(room.code, 'fs:update', {
    action: 'trash',
    oldPath: path,
    newPath: trashPath,
    files: room.files,
  });

  res.json({ success: true, item });
});

// 11. File System: Restore from Papierkorb
app.post('/api/classroom/:code/fs/restore', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { path, userName } = req.body;
  const item = room.files[path];
  if (!item) {
    res.status(404).json({ error: 'Element nicht gefunden.' });
    return;
  }

  const targetPath = item.originalPath || `/Klasse/${userName}/${item.name}`;
  delete room.files[path];
  item.inTrash = false;
  item.path = targetPath;
  item.updatedAt = Date.now();
  room.files[targetPath] = item;

  savePersistentData();
  broadcastEvent(room.code, 'fs:update', {
    action: 'restore',
    oldPath: path,
    newPath: targetPath,
    files: room.files,
  });

  res.json({ success: true, item });
});

// 12. File System: Delete Forever
app.post('/api/classroom/:code/fs/delete-forever', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { path, userId, userRole, userName } = req.body;
  const item = room.files[path];
  if (!item) {
    res.status(404).json({ error: 'Element nicht gefunden.' });
    return;
  }

  if (!checkWritePermission(userRole, userId, userName, path)) {
    res.status(403).json({ error: 'Keine Berechtigung zum Löschen.' });
    return;
  }

  delete room.files[path];
  savePersistentData();
  broadcastEvent(room.code, 'fs:update', {
    action: 'delete-forever',
    path,
    files: room.files,
  });

  res.json({ success: true });
});

// 13. Demo Mode: Toggle on/off (Teacher)
app.post('/api/classroom/:code/demo/toggle', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { active, userId } = req.body;
  if (room.teacherId !== userId) {
    res.status(403).json({ error: 'Nur die Lehrkraft kann den Klassenmodus steuern.' });
    return;
  }

  room.demoMode.active = !!active;
  if (active) {
    room.demoMode.controlledBy = room.teacherId;
    room.demoMode.controlledByName = room.teacherName;
  }

  savePersistentData();
  broadcastEvent(room.code, 'demo:update', room.demoMode);
  res.json({ success: true, demoMode: room.demoMode });
});

// 14. Demo Mode: Stream Cursor coordinates
app.post('/api/classroom/:code/demo/cursor', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room || !room.demoMode.active) {
    res.status(200).json({ ok: true });
    return;
  }

  const { x, y, visible, userId } = req.body;
  if (userId !== room.demoMode.controlledBy) {
    res.status(403).json({ error: 'Nicht am Steuer der Vorführung.' });
    return;
  }

  room.demoMode.teacherCursor = { x, y, visible };
  broadcastEvent(room.code, 'demo:cursor', {
    x,
    y,
    visible,
    name: room.demoMode.controlledByName,
  });

  res.json({ ok: true });
});

// 15. Demo Mode: Delegate or revoke control
app.post('/api/classroom/:code/demo/control', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { targetUserId, targetUserName, userId } = req.body;
  if (room.teacherId !== userId) {
    res.status(403).json({ error: 'Nur die Lehrkraft kann die Steuerung übergeben.' });
    return;
  }

  room.demoMode.controlledBy = targetUserId || room.teacherId;
  room.demoMode.controlledByName = targetUserName || room.teacherName;

  savePersistentData();
  broadcastEvent(room.code, 'demo:update', room.demoMode);
  res.json({ success: true, demoMode: room.demoMode });
});

// 16. Demo Mode: Sync window/canvas state
app.post('/api/classroom/:code/demo/state-sync', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room || !room.demoMode.active) {
    res.status(200).json({ ok: true });
    return;
  }

  const { activeWindow, currentFolderId, currentFolderPath, demoCanvasData, userId } = req.body;
  if (userId !== room.demoMode.controlledBy) {
    res.status(403).json({ error: 'Keine Berechtigung zur Synchronisation.' });
    return;
  }

  if (activeWindow !== undefined) room.demoMode.activeWindow = activeWindow;
  if (currentFolderId !== undefined) room.demoMode.currentFolderId = currentFolderId;
  if (currentFolderPath !== undefined) room.demoMode.currentFolderPath = currentFolderPath;
  if (demoCanvasData !== undefined) room.demoMode.demoCanvasData = demoCanvasData;

  broadcastEvent(room.code, 'demo:state-sync', room.demoMode);
  res.json({ ok: true });
});

// 17. Demo Mode: Present student work to all
app.post('/api/classroom/:code/demo/present-work', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { filePath, userId } = req.body;
  if (room.teacherId !== userId) {
    res.status(403).json({ error: 'Nur die Lehrkraft kann Arbeiten präsentieren.' });
    return;
  }

  const item = room.files[filePath];
  room.demoMode.sharedItemToPresent = item || null;
  if (item && !room.demoMode.active) {
    room.demoMode.active = true;
    room.demoMode.controlledBy = room.teacherId;
    room.demoMode.controlledByName = room.teacherName;
  }

  savePersistentData();
  broadcastEvent(room.code, 'demo:update', room.demoMode);
  res.json({ success: true, demoMode: room.demoMode });
});

// 18. Help: Request or raise hand (Student)
app.post('/api/classroom/:code/help/request', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { studentId, studentName, message } = req.body;
  const student = room.students.find((s) => s.id === studentId);
  if (student) {
    student.isHandRaised = true;
    student.helpMessage = message || 'Braucht Unterstützung bei der Aufgabe.';
  }

  const existing = room.helpRequests.find((h) => h.studentId === studentId);
  if (!existing) {
    room.helpRequests.push({
      id: 'help_' + Math.random().toString(36).substring(2, 9),
      studentId,
      studentName,
      message: message || 'Braucht Hilfe',
      timestamp: Date.now(),
    });
  }

  savePersistentData();
  broadcastEvent(room.code, 'help:update', {
    helpRequests: room.helpRequests,
    students: room.students,
  });

  res.json({ success: true, helpRequests: room.helpRequests });
});

// 19. Help: Resolve request (Teacher or student lower hand)
app.post('/api/classroom/:code/help/resolve', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { studentId } = req.body;
  const student = room.students.find((s) => s.id === studentId);
  if (student) {
    student.isHandRaised = false;
    delete student.helpMessage;
  }

  room.helpRequests = room.helpRequests.filter((h) => h.studentId !== studentId);
  savePersistentData();
  broadcastEvent(room.code, 'help:update', {
    helpRequests: room.helpRequests,
    students: room.students,
  });

  res.json({ success: true, helpRequests: room.helpRequests });
});

// 20. Observe Student (Teacher)
app.post('/api/classroom/:code/observe', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { teacherId, targetStudentId } = req.body;
  if (room.teacherId !== teacherId) {
    res.status(403).json({ error: 'Nur die Lehrkraft kann Schüler beobachten.' });
    return;
  }

  room.observingStudentId = targetStudentId || null;
  broadcastEvent(room.code, 'teacher:observe', {
    observingStudentId: room.observingStudentId,
  });

  res.json({ success: true, observingStudentId: room.observingStudentId });
});

// 21. Heartbeat & Activity Progress Ping
app.post('/api/classroom/:code/heartbeat', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { userId, role, currentApp, taskProgress, currentPath, thumbnail } = req.body;
  const now = Date.now();

  if (role === 'student') {
    const student = room.students.find((s) => s.id === userId);
    if (student) {
      student.lastActive = now;
      if (currentApp) student.currentApp = currentApp;
      if (taskProgress !== undefined) student.taskProgress = taskProgress;
      if (currentPath) student.currentPath = currentPath;
      if (thumbnail) student.thumbnail = thumbnail;
    }
  }

  broadcastEvent(room.code, 'room:heartbeat', {
    students: room.students,
  });

  res.json({ ok: true });
});

// 22. Groups: Create group
app.post('/api/classroom/:code/groups/create', (req, res) => {
  const { name, icon, color, userId, userName } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Nombre de equipo requerido.' });
    return;
  }
  const group = createGroup(req.params.code, name, icon, color, userId, userName);
  if (!group) {
    res.status(404).json({ error: 'Aula no encontrada.' });
    return;
  }
  res.json({ success: true, group });
});

// 23. Groups: Join group
app.post('/api/classroom/:code/groups/join', (req, res) => {
  const { groupId, userId, userName } = req.body;
  const ok = joinGroup(req.params.code, groupId, userId, userName);
  if (!ok) {
    res.status(404).json({ error: 'No se pudo unir al grupo.' });
    return;
  }
  res.json({ success: true });
});

// 24. Groups: Add team note
app.post('/api/classroom/:code/groups/note', (req, res) => {
  const { groupId, author, text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Texto requerido.' });
    return;
  }
  const ok = addGroupNote(req.params.code, groupId, author, text);
  if (!ok) {
    res.status(404).json({ error: 'No se pudo agregar la nota.' });
    return;
  }
  res.json({ success: true });
});

// 25. Reactions: Send peer reaction
app.post('/api/classroom/:code/reaction', (req, res) => {
  const { fromStudentId, fromStudentName, toStudentId, type } = req.body;
  const ok = sendPeerReaction(req.params.code, fromStudentId, fromStudentName, toStudentId, type);
  if (!ok) {
    res.status(404).json({ error: 'No se pudo enviar la reacción.' });
    return;
  }
  res.json({ success: true });
});

// 26. Activity: Report current app and detail (for Class Wall & Screen Monitor)
app.post('/api/classroom/:code/activity', (req, res) => {
  const { userId, currentApp, activityDetail, thumbnail, screenSnapshot } = req.body;
  const ok = updateStudentActivity(req.params.code, userId, currentApp, activityDetail, thumbnail, screenSnapshot);
  if (!ok) {
    res.status(404).json({ error: 'No se pudo actualizar la actividad.' });
    return;
  }
  res.json({ success: true });
});

// 27. Delete / Close Classroom (Teacher)
app.delete('/api/classroom/:code', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Klassenraum nicht gefunden.' });
    return;
  }

  const { teacherId } = req.body;
  if (room.teacherId !== teacherId) {
    res.status(403).json({ error: 'Nur die Lehrkraft kann den Raum schließen.' });
    return;
  }

  removeClassroom(req.params.code);
  res.json({ success: true });
});

// 28. Chat: Send Message
app.post('/api/classroom/:code/chat/send', (req, res) => {
  const { senderId, senderName, senderRole, text, type, emoji } = req.body;
  if (!text && !emoji) {
    res.status(400).json({ error: 'Mensaje vacío.' });
    return;
  }
  const message = sendChatMessage(
    req.params.code,
    senderId,
    senderName || 'Anónimo',
    senderRole || 'student',
    text || '',
    type || 'text',
    emoji,
  );
  if (!message) {
    res.status(404).json({ error: 'Aula no encontrada.' });
    return;
  }
  res.json({ success: true, message });
});

// 29. Chat: Clear (Teacher)
app.post('/api/classroom/:code/chat/clear', (req, res) => {
  const room = getClassroom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Aula no encontrada.' });
    return;
  }
  const { userId } = req.body;
  if (room.teacherId !== userId) {
    res.status(403).json({ error: 'Solo el docente puede vaciar el chat.' });
    return;
  }
  clearChatMessages(req.params.code);
  res.json({ success: true });
});

// 30. Whiteboard: Add stroke
app.post('/api/classroom/:code/whiteboard/stroke', (req, res) => {
  const { authorId, authorName, color, size, tool, points } = req.body;
  if (!points || !points.length) {
    res.status(400).json({ error: 'Trazos requeridos.' });
    return;
  }
  const stroke = addWhiteboardStroke(req.params.code, {
    authorId,
    authorName: authorName || 'Estudiante',
    color: color || '#3b82f6',
    size: size || 3,
    tool: tool || 'pencil',
    points,
  });
  if (!stroke) {
    res.status(404).json({ error: 'Aula no encontrada.' });
    return;
  }
  res.json({ success: true, stroke });
});

// 31. Whiteboard: Add stamp
app.post('/api/classroom/:code/whiteboard/stamp', (req, res) => {
  const { authorId, authorName, emoji, x, y } = req.body;
  if (!emoji) {
    res.status(400).json({ error: 'Emoji requerido.' });
    return;
  }
  const stamp = addWhiteboardStamp(req.params.code, {
    authorId,
    authorName: authorName || 'Estudiante',
    emoji,
    x: x || 100,
    y: y || 100,
  });
  if (!stamp) {
    res.status(404).json({ error: 'Aula no encontrada.' });
    return;
  }
  res.json({ success: true, stamp });
});

// 32. Whiteboard: Clear (Teacher or Student)
app.post('/api/classroom/:code/whiteboard/clear', (req, res) => {
  const ok = clearWhiteboard(req.params.code);
  if (!ok) {
    res.status(404).json({ error: 'Aula no encontrada.' });
    return;
  }
  res.json({ success: true });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

