export type UserRole = 'teacher' | 'student';

export interface GroupNote {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface ClassroomGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  creatorId: string;
  creatorName: string;
  members: { id: string; name: string }[];
  notes: GroupNote[];
  folderPath: string;
  createdAt: number;
}

export interface PeerReaction {
  id: string;
  fromStudentId: string;
  fromStudentName: string;
  toStudentId: string;
  type: 'bravo' | 'star' | 'idea' | 'rocket';
  emoji: string;
  label: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: number;
  type?: 'text' | 'reaction' | 'system' | 'question';
  emoji?: string;
}

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  authorId: string;
  authorName: string;
  color: string;
  size: number;
  tool: 'pencil' | 'brush' | 'eraser';
  points: WhiteboardPoint[];
  timestamp: number;
}

export interface WhiteboardStamp {
  id: string;
  authorId: string;
  authorName: string;
  emoji: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  roomCode: string;
  connectedAt: number;
  lastActive: number;
  currentApp?: string;
  activityDetail?: string;
  isHandRaised?: boolean;
  helpMessage?: string;
  taskProgress?: number; // 0 to 7
  currentPath?: string;
  thumbnail?: string; // latest drawing thumbnail or code snapshot
  screenSnapshot?: string; // live screen capture / snapshot of student workspace
  groupId?: string;
  reactionsReceived?: {
    bravo: number;
    star: number;
    idea: number;
    rocket: number;
  };
}

export type VirtualItemType = 'folder' | 'file';
export type VirtualFileType = 'image' | 'text';

export interface VirtualItem {
  id: string;
  name: string;
  type: VirtualItemType;
  fileType?: VirtualFileType;
  content?: string; // base64 / dataUrl for image, text string for text
  parentId: string | null;
  path: string; // e.g. /Klasse/Lukas/Meine Zeichnungen/Mein Haus.png
  ownerId: string; // 'system' | 'teacher' | studentId
  ownerName?: string;
  creatorName?: string;
  isProtected?: boolean; // read-only for students
  isShared?: boolean;
  inTrash?: boolean;
  originalPath?: string; // when in recycle bin
  createdAt: number;
  updatedAt: number;
  sizeBytes?: number;
  thumbnail?: string;
}

export interface DemoState {
  active: boolean;
  controlledBy: string; // teacherId or studentId
  controlledByName: string;
  teacherCursor?: { x: number; y: number; visible: boolean };
  activeWindow?: string;
  currentFolderId?: string;
  currentFolderPath?: string;
  demoCanvasData?: string;
  sharedItemToPresent?: VirtualItem | null;
  presentationFilePath?: string;
}

export interface HelpRequest {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  timestamp: number;
}

export interface ClassroomState {
  code: string;
  name: string;
  createdAt: number;
  teacherId: string;
  teacherName: string;
  students: UserSession[];
  files: Record<string, VirtualItem>;
  demoMode: DemoState;
  helpRequests: HelpRequest[];
  observingStudentId: string | null;
  groups?: ClassroomGroup[];
  reactions?: PeerReaction[];
  chatMessages?: ChatMessage[];
  whiteboardStrokes?: WhiteboardStroke[];
  whiteboardStamps?: WhiteboardStamp[];
}

export interface WindowState {
  id: string;
  title: string;
  appType:
    | 'explorer'
    | 'paint'
    | 'activities'
    | 'help'
    | 'teacher'
    | 'presentation'
    | 'viewer'
    | 'coding'
    | 'logic-games'
    | 'groups-wall'
    | 'chat'
    | 'whiteboard'
    | 'peers'
    | 'settings'
    | 'screen-monitor';
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  params?: Record<string, unknown>;
}

export interface EducationalActivityStep {
  step: number;
  title: string;
  instruction: string;
  hint: string;
  completed: boolean;
}
