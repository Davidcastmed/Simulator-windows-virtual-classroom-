import { Injectable, signal, computed } from '@angular/core';

export type Language = 'de' | 'es';

export interface Translations {
  system: {
    title: string;
    appName: string;
    tagline: string;
    appTagline: string;
    recycleBin: string;
    myClass: string;
    teacherMaterial: string;
    sharedWorks: string;
    thisPC: string;
    myFolder: string;
    networkOnline: string;
    networkOffline: string;
    saving: string;
    saved: string;
    connecting: string;
    loading: string;
    wallpaper: string;
    changeWallpaper: string;
    wallpaperTheme: string;
    chooseWallpaper: string;
    refreshDesktop: string;
    opticalDepthDesc: string;
  };
  roles: {
    student: string;
    teacher: string;
  };
  login: {
    roomCode: string;
    roomCodePlaceholder: string;
    studentName: string;
    studentNamePlaceholder: string;
    joinClass: string;
    className: string;
    classNamePlaceholder: string;
    teacherName: string;
    teacherNamePlaceholder: string;
    createClass: string;
  };
  auth: {
    title: string;
    subtitle: string;
    teacherTab: string;
    studentTab: string;
    createClass: string;
    classNamePlaceholder: string;
    teacherNamePlaceholder: string;
    joinClass: string;
    codePlaceholder: string;
    studentNamePlaceholder: string;
    btnCreate: string;
    btnJoin: string;
    quickDemoTitle: string;
    quickDemoDesc: string;
    quickTeacher: string;
    quickStudent: string;
    errorNameRequired: string;
    errorCodeRequired: string;
    errorRoomNotFound: string;
    leaveClass: string;
  };
  taskbar: {
    start: string;
    search: string;
    classroomCode: string;
    roleTeacher: string;
    roleStudent: string;
    handRaised: string;
    raiseHand: string;
    lowerHand: string;
  };
  startMenu: {
    allApps: string;
    userFolder: string;
    paintApp: string;
    explorerApp: string;
    fileExplorer: string;
    activities: string;
    activitiesApp: string;
    teacherDashboard: string;
    teacherBarApp: string;
    help: string;
    helpApp: string;
    codingApp: string;
    codingSub: string;
    logicGamesApp: string;
    logicGamesSub: string;
    groupsWallApp: string;
    groupsWallSub: string;
    pinnedApps: string;
    fileExplorerSub: string;
    paintAppSub: string;
    activitiesSub: string;
    teacherDashboardSub: string;
    helpSub: string;
    searchPlaceholder: string;
    logout: string;
    exit: string;
  };
  explorer: {
    title: string;
    address: string;
    newFolder: string;
    rename: string;
    cut: string;
    copy: string;
    paste: string;
    delete: string;
    restore: string;
    emptyFolder: string;
    readOnlyBanner: string;
    ownerBadge: string;
    itemsCount: string;
    searchPlaceholder: string;
    typeFolder: string;
    typeImage: string;
    typeText: string;
    confirmDelete: string;
    deleteForever: string;
    nameExists: string;
    nameEmpty: string;
  };
  paint: {
    title: string;
    pencil: string;
    brush: string;
    eraser: string;
    shapes: string;
    line: string;
    rectangle: string;
    circle: string;
    fillMode: string;
    strokeMode: string;
    textTool: string;
    undo: string;
    redo: string;
    newCanvas: string;
    save: string;
    saveAs: string;
    colorPalette: string;
    strokeWidth: string;
    saveDialogTitle: string;
    fileNamePrompt: string;
    selectFolderPrompt: string;
    btnConfirmSave: string;
    btnCancel: string;
    autoDraftFound: string;
    restoreDraft: string;
    discardDraft: string;
    savedSuccess: string;
    cannotSaveReadOnly: string;
  };
  teacher: {
    title: string;
    dashboardTitle: string;
    studentsOnline: string;
    classCode: string;
    roomCode: string;
    helpQueue: string;
    noHelpRequests: string;
    pendingHelp: string;
    resolveHelp: string;
    startDemoMode: string;
    startDemo: string;
    stopDemoMode: string;
    stopDemo: string;
    closeRoom: string;
    delegateControl: string;
    takeControl: string;
    presentWork: string;
    selectArtworkToPresent: string;
    observeStudent: string;
    stopObserving: string;
    teacherObservingStudent: string;
    progress: string;
    taskProgress: string;
    studentCardActionObserve: string;
    confirmEndClass: string;
  };
  demo: {
    bannerTitle: string;
    bannerSub: string;
    controlledBy: string;
    watchingOnly: string;
    youHaveControl: string;
    handRaisedNotice: string;
    handRaised: string;
    raiseHand: string;
    teacherObserving: string;
  };
  activities: {
    title: string;
    subtitle: string;
    badgeTitle: string;
    allCompletedTitle: string;
    allCompletedMsg: string;
    allDoneTitle: string;
    allDoneMessage: string;
    completed: string;
    stepOf: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
    step5Title: string;
    step5Desc: string;
    step6Title: string;
    step6Desc: string;
    step7Title: string;
    step7Desc: string;
    steps: {
      step1Title: string;
      step1Desc: string;
      step1Hint: string;
      step2Title: string;
      step2Desc: string;
      step2Hint: string;
      step3Title: string;
      step3Desc: string;
      step3Hint: string;
      step4Title: string;
      step4Desc: string;
      step4Hint: string;
      step5Title: string;
      step5Desc: string;
      step5Hint: string;
      step6Title: string;
      step6Desc: string;
      step6Hint: string;
      step7Title: string;
      step7Desc: string;
      step7Hint: string;
    };
  };
  help: {
    title: string;
    whatIsFolderTitle: string;
    whatIsFolderDesc: string;
    whatIsFileTitle: string;
    whatIsFileDesc: string;
    whatIsPathTitle: string;
    whatIsPathDesc: string;
    whatIsRecycleBinTitle: string;
    whatIsRecycleBinDesc: string;
    needTeacherHelp: string;
    tipsTitle: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
    tip5: string;
    shortcutsTitle: string;
    shortcutCopy: string;
    shortcutPaste: string;
    shortcutCut: string;
    shortcutUndo: string;
  };
  coding: {
    title: string;
    level: string;
    levelSelect: string;
    teacherTipTitle: string;
    blocksPalette: string;
    myProgram: string;
    run: string;
    stepByStep: string;
    reset: string;
    speedNormal: string;
    speedFast: string;
    clearProgram: string;
    blockForward: string;
    blockTurnLeft: string;
    blockTurnRight: string;
    blockCollectStar: string;
    blockRepeat2x: string;
    blockRepeat3x: string;
    objective: string;
    starsCollected: string;
    congratsTitle: string;
    congratsMsg: string;
    nextLevel: string;
    tryAgain: string;
    shareToWall: string;
    sharedSuccess: string;
  };
  logicGames: {
    title: string;
    tabZeek: string;
    tabCables: string;
    tabBoxes: string;
    zeekTitle: string;
    zeekSubtitle: string;
    zeekWin: string;
    zeekMushrooms: string;
    zeekMoves: string;
    zeekPlantWarning: string;
    zeekPlantAteApple: string;
    cablesTitle: string;
    cablesSubtitle: string;
    cablesWin: string;
    boxesTitle: string;
    boxesSubtitle: string;
    boxesWin: string;
    undoMove: string;
    restart: string;
    level: string;
    nextLevel: string;
    teacherTipZeek: string;
    teacherTipCables: string;
    teacherTipBoxes: string;
    soundToggle: string;
  };
  groupsWall: {
    title: string;
    tabLiveWall: string;
    tabTeams: string;
    liveWallTitle: string;
    liveWallSubtitle: string;
    activeStudents: string;
    onlineNow: string;
    noStudentsYet: string;
    reactBravo: string;
    reactStar: string;
    reactIdea: string;
    reactRocket: string;
    reactionsCount: string;
    teamsTitle: string;
    teamsSubtitle: string;
    createTeam: string;
    teamName: string;
    teamNamePlaceholder: string;
    teamIcon: string;
    teamColor: string;
    joinTeam: string;
    myTeam: string;
    openTeamFolder: string;
    teamNotesTitle: string;
    addNote: string;
    notePlaceholder: string;
    members: string;
    noTeamsYet: string;
  };
  classroomChat: {
    title: string;
    subtitle: string;
    placeholder: string;
    send: string;
    quickPromptsTitle: string;
    promptHello: string;
    promptQuestion: string;
    promptPraise: string;
    promptIdea: string;
    promptWork: string;
    rulesNotice: string;
    clearChat: string;
    emptyMessages: string;
    msgFromTeacher: string;
  };
  whiteboard: {
    title: string;
    subtitle: string;
    pencil: string;
    brush: string;
    eraser: string;
    clear: string;
    clearConfirm: string;
    stamps: string;
    colors: string;
    size: string;
    download: string;
    cooperativeNotice: string;
    peersDrawing: string;
    saveSuccess: string;
  };
  peersWidget: {
    title: string;
    dockTitle: string;
    activeCount: string;
    roomCode: string;
    copyCode: string;
    copied: string;
    howItWorks: string;
    onlineNow: string;
    teacherBadge: string;
    studentBadge: string;
    youBadge: string;
    inApp: string;
    greetBtn: string;
    cheerBtn: string;
    openChatBtn: string;
    openWhiteboardBtn: string;
    noPeersOnline: string;
    didacticTip: string;
  };
}

const DE_TRANSLATIONS: Translations = {
  system: {
    title: 'KlassenDesktop',
    appName: 'KlassenDesktop',
    tagline: 'Virtueller Klassen-PC für IT-Grundkenntnisse',
    appTagline: 'Virtueller Klassen-PC für IT-Grundkenntnisse',
    recycleBin: 'Papierkorb',
    myClass: 'Meine Klasse',
    teacherMaterial: 'Lehrermaterial',
    sharedWorks: 'Geteilte Arbeiten',
    thisPC: 'Dieser PC',
    myFolder: 'Mein persönlicher Ordner',
    networkOnline: 'Verbunden (Live)',
    networkOffline: 'Offline (Wiederverbindung...)',
    saving: 'Wird gespeichert...',
    saved: 'Gespeichert',
    connecting: 'Verbindung wird aufgebaut...',
    loading: 'Wird geladen...',
    wallpaper: 'Hintergrundbild',
    changeWallpaper: 'Hintergrundbild anpassen',
    wallpaperTheme: 'Hintergrund-Landschaft',
    chooseWallpaper: 'Landschaft & Tiefe auswählen',
    refreshDesktop: 'Desktop aktualisieren',
    opticalDepthDesc: 'Vielschichtige Naturkulissen mit faszinierender Tiefenwirkung',
  },
  roles: {
    student: 'Schüler/in',
    teacher: 'Lehrkraft',
  },
  login: {
    roomCode: 'Klassen-Code',
    roomCodePlaceholder: 'z.B. INF-101',
    studentName: 'Dein Vorname',
    studentNamePlaceholder: 'z.B. Lukas oder Anna',
    joinClass: 'Am Klassen-PC anmelden',
    className: 'Name der Klasse / Fach',
    classNamePlaceholder: 'z.B. Informatik Klasse 6b',
    teacherName: 'Name der Lehrkraft',
    teacherNamePlaceholder: 'z.B. Frau Weber oder Herr Schmidt',
    createClass: 'Klassenraum starten',
  },
  auth: {
    title: 'Willkommen am Klassen-Desktop',
    subtitle: 'Wähle deine Rolle und starte die gemeinsame Computer-Lernstunde.',
    teacherTab: 'Lehrkraft',
    studentTab: 'Schüler / Schülerin',
    createClass: 'Neue Schulklasse anlegen',
    classNamePlaceholder: 'z.B. Informatik Klasse 6b',
    teacherNamePlaceholder: 'Dein Name (z.B. Frau Weber)',
    joinClass: 'Klassenraum beitreten',
    codePlaceholder: '6-stelliger Klassen-Code (z.B. ABC-123)',
    studentNamePlaceholder: 'Dein Vorname oder Nickname',
    btnCreate: 'Klasse starten & Code erzeugen',
    btnJoin: 'Am Klassen-PC anmelden',
    quickDemoTitle: 'Schnellstart zum Testen',
    quickDemoDesc: 'Starte sofort eine Test-Klasse, um alle Funktionen auszuprobieren.',
    quickTeacher: 'Als Lehrkraft testen',
    quickStudent: 'Als Schüler/in testen',
    errorNameRequired: 'Bitte gib deinen Namen ein.',
    errorCodeRequired: 'Bitte gib den Klassen-Code ein.',
    errorRoomNotFound: 'Klassenraum nicht gefunden. Bitte Code prüfen.',
    leaveClass: 'Abmelden / Klasse verlassen',
  },
  taskbar: {
    start: 'Start',
    search: 'Programme & Dateien suchen...',
    classroomCode: 'Klassen-Code',
    roleTeacher: 'Lehrer-Pult',
    roleStudent: 'Schüler-Arbeitsplatz',
    handRaised: 'Hand gehoben',
    raiseHand: 'Hand heben',
    lowerHand: 'Hand senken',
  },
  startMenu: {
    allApps: 'Alle Programme',
    userFolder: 'Persönlicher Ordner',
    paintApp: 'Malstudio (Zeichnen)',
    explorerApp: 'Datei-Explorer',
    fileExplorer: 'Datei-Explorer',
    activities: 'Lernaufgaben (7 Schritte)',
    activitiesApp: 'Lernaufgaben (7 Schritte)',
    teacherDashboard: 'Lehrerpult & Steuerung',
    teacherBarApp: 'Lehrerpult & Schülerübersicht',
    help: 'Hilfe & Tastenkombinationen',
    helpApp: 'Hilfe & Tastenkombinationen',
    codingApp: 'Programmieren lernen (RoboCode)',
    codingSub: 'Algorithmen, Schleifen & Logik-Bausteine',
    logicGamesApp: 'Logik- & Pfadspiele',
    logicGamesSub: 'Kabelwege verbinden & Kisten im Speicher sortieren',
    groupsWallApp: 'Klassenwand & Teams',
    groupsWallSub: 'Mitschüler-Aktivitäten & gemeinsame Team-Ordner',
    pinnedApps: 'Angeheftete Programme',
    fileExplorerSub: 'Dateien, Ordner & Laufwerke verwalten',
    paintAppSub: 'Zeichnen, Malen & Formen gestalten',
    activitiesSub: 'Aufgaben & Computer-Führerschein',
    teacherDashboardSub: 'Klassenübersicht & Bildschirm-Freigabe',
    helpSub: 'Glossar & nützliche Computer-Tipps',
    searchPlaceholder: 'Programme & Dateien durchsuchen...',
    logout: 'Desktop sperren / Abmelden',
    exit: 'Desktop sperren / Abmelden',
  },
  explorer: {
    title: 'Datei-Explorer',
    address: 'Adresse',
    newFolder: 'Neuer Ordner',
    rename: 'Umbenennen',
    cut: 'Ausschneiden',
    copy: 'Kopieren',
    paste: 'Einfügen',
    delete: 'In den Papierkorb',
    restore: 'Wiederherstellen',
    emptyFolder: 'Dieser Ordner ist leer.',
    readOnlyBanner: 'Schreibgeschützt: Hier darf nur die Lehrkraft Änderungen vornehmen.',
    ownerBadge: 'Dein persönlicher Speicherbereich',
    itemsCount: 'Element(e)',
    searchPlaceholder: 'Dateien im aktuellen Ordner suchen...',
    typeFolder: 'Dateiordner',
    typeImage: 'PNG-Bilddatei',
    typeText: 'Textdokument',
    confirmDelete: 'Möchtest du dieses Element wirklich in den Papierkorb verschieben?',
    deleteForever: 'Endgültig löschen',
    nameExists: 'Ein Element mit diesem Namen existiert hier bereits.',
    nameEmpty: 'Der Name darf nicht leer sein.',
  },
  paint: {
    title: 'Malstudio',
    pencil: 'Bleistift',
    brush: 'Pinsel',
    eraser: 'Radiergummi',
    shapes: 'Formen',
    line: 'Linie',
    rectangle: 'Rechteck',
    circle: 'Kreis',
    fillMode: 'Gefüllt',
    strokeMode: 'Umriss',
    textTool: 'Text einfügen',
    undo: 'Rückgängig (Strg+Z)',
    redo: 'Wiederholen (Strg+Y)',
    newCanvas: 'Neues Blatt',
    save: 'Speichern',
    saveAs: 'Speichern unter...',
    colorPalette: 'Farbpalette',
    strokeWidth: 'Strichstärke',
    saveDialogTitle: 'Bild speichern',
    fileNamePrompt: 'Dateiname:',
    selectFolderPrompt: 'Speicherort auswählen:',
    btnConfirmSave: 'Bild speichern',
    btnCancel: 'Abbrechen',
    autoDraftFound: 'Automatisch gesicherter Entwurf gefunden!',
    restoreDraft: 'Entwurf wiederherstellen',
    discardDraft: 'Verwerfen',
    savedSuccess: 'Erfolgreich gespeichert in:',
    cannotSaveReadOnly: 'In diesem Ordner hast du keine Schreibrechte. Bitte wähle deinen eigenen Ordner.',
  },
  teacher: {
    title: 'Lehrerpult',
    dashboardTitle: 'Lehrerpult - Klassenraumverwaltung',
    studentsOnline: 'Schüler/innen im Klassenraum',
    classCode: 'Code für Schüler',
    roomCode: 'Klassen-Code',
    helpQueue: 'Offene Hilferufe',
    noHelpRequests: 'Keine offenen Hilferufe. Alle arbeiten konzentriert!',
    pendingHelp: 'Hilferufe',
    resolveHelp: 'Als erledigt markieren',
    startDemoMode: 'Klassenmodus starten (Vorführen)',
    startDemo: 'Klassenmodus starten',
    stopDemoMode: 'Klassenmodus beenden',
    stopDemo: 'Klassenmodus beenden',
    closeRoom: 'Klasse beenden',
    delegateControl: 'Steuerung übergeben',
    takeControl: 'Steuerung zurücknehmen',
    presentWork: 'Arbeit der Klasse vorführen',
    selectArtworkToPresent: 'Schülerzeichnung zum Präsentieren auswählen',
    observeStudent: 'Arbeitsplatz ansehen & helfen',
    stopObserving: 'Beobachtung beenden',
    teacherObservingStudent: 'Die Lehrkraft schaut dir gerade über die Schulter und unterstützt dich.',
    progress: 'Fortschritt',
    taskProgress: 'Fortschritt der Lernaufgaben',
    studentCardActionObserve: 'Zuschauen',
    confirmEndClass: 'Klassenraum schließen und Sitzung beenden?',
  },
  demo: {
    bannerTitle: 'KLASSENMODUS AKTIV',
    bannerSub: 'Die Lehrkraft führt gerade etwas am gemeinsamen Bildschirm vor.',
    controlledBy: 'Aktive Steuerung durch:',
    watchingOnly: 'Du bist im Zuschauermodus. Deine persönlichen Fenster bleiben im Hintergrund erhalten.',
    youHaveControl: 'Du hast jetzt die Steuerung erhalten! Du führst für die Klasse vor.',
    handRaisedNotice: 'Deine Hand ist gehoben. Die Lehrkraft sieht deinen Hilferuf.',
    handRaised: 'Hand gehoben',
    raiseHand: 'Hand heben',
    teacherObserving: '👀 Lehrkraft schaut zu',
  },
  activities: {
    title: 'Lernaufgaben: Mein Computer-Führerschein',
    subtitle: 'Lerne Schritt für Schritt, wie ein echter Computer funktioniert!',
    badgeTitle: 'Aufgaben-Meister',
    allCompletedTitle: 'Herzlichen Glückwunsch!',
    allCompletedMsg: 'Du hast alle 7 Aufgaben mit Bravour gemeistert und kennst dich jetzt super mit Ordnern, Fenstern und Dateien aus!',
    allDoneTitle: 'Alle 7 Aufgaben erledigt! 🎉',
    allDoneMessage: 'Hervorragend! Du hast alle Schritte gemeistert. Du weißt jetzt, wie man Ordner erstellt, Fenster bedient, Bilder malt und Dateien verschiebt.',
    completed: 'erledigt',
    stepOf: 'Schritt {current} von {total}',
    step1Title: '1. Deinen eigenen Ordner öffnen',
    step1Desc: 'Navigiere im Datei-Explorer in den Ordner "Meine Klasse" und öffne dort deinen persönlichen Ordner.',
    step2Title: '2. Unterordner anlegen',
    step2Desc: 'Erstelle in deinem persönlichen Ordner einen neuen Unterordner mit dem Namen "Meine Zeichnungen".',
    step3Title: '3. Malstudio starten',
    step3Desc: 'Öffne das Programm "Malstudio" vom Desktop oder aus dem Startmenü.',
    step4Title: '4. Ein Haus zeichnen',
    step4Desc: 'Zeichne ein schönes Haus. Verwende mindestens 3 verschiedene Farben und 2 Formen.',
    step5Title: '5. Zeichnung am richtigen Ort speichern',
    step5Desc: 'Speichere dein Bild unter dem Namen "Mein Haus" im Ordner "Meine Zeichnungen".',
    step6Title: '6. Ordner für fertige Arbeiten erstellen',
    step6Desc: 'Erstelle in deinem persönlichen Ordner einen weiteren Ordner namens "Fertige Arbeiten".',
    step7Title: '7. Datei verschieben',
    step7Desc: 'Verschiebe deine Zeichnung "Mein Haus.png" in den Ordner "Fertige Arbeiten".',
    steps: {
      step1Title: '1. Deinen eigenen Ordner öffnen',
      step1Desc: 'Navigiere im Datei-Explorer in den Ordner "Meine Klasse" und öffne dort deinen persönlichen Ordner.',
      step1Hint: 'Doppelklicke auf "Meine Klasse" und wähle deinen Namen aus.',
      step2Title: '2. Unterordner anlegen',
      step2Desc: 'Erstelle in deinem persönlichen Ordner einen neuen Unterordner mit dem Namen "Meine Zeichnungen".',
      step2Hint: 'Klicke in der Menüleiste auf "Neuer Ordner" und tippe "Meine Zeichnungen".',
      step3Title: '3. Malstudio starten',
      step3Desc: 'Öffne das Programm "Malstudio" vom Desktop oder aus dem Startmenü.',
      step3Hint: 'Doppelklicke auf das Pinsel-Symbol auf deinem Desktop.',
      step4Title: '4. Ein Haus zeichnen',
      step4Desc: 'Zeichne ein schönes Haus. Verwende mindestens 3 verschiedene Farben und 2 Formen (z.B. Rechteck und Dreieck/Linie).',
      step4Hint: 'Wähle verschiedene Werkzeuge und Farben aus der Palette.',
      step5Title: '5. Zeichnung am richtigen Ort speichern',
      step5Desc: 'Speichere dein Bild unter dem Namen "Mein Haus" im Ordner "Meine Zeichnungen".',
      step5Hint: 'Klicke auf "Speichern unter...", wähle den Ordner "Meine Zeichnungen" und tippe "Mein Haus".',
      step6Title: '6. Ordner für fertige Arbeiten erstellen',
      step6Desc: 'Erstelle in deinem persönlichen Ordner einen weiteren Ordner namens "Fertige Arbeiten".',
      step6Hint: 'Gehe eine Ebene nach oben und klicke auf "Neuer Ordner".',
      step7Title: '7. Datei verschieben',
      step7Desc: 'Verschiebe deine Zeichnung "Mein Haus.png" in den Ordner "Fertige Arbeiten" (durch Ausschneiden & Einfügen oder Ziehen mit der Maus).',
      step7Hint: 'Schneide die Datei aus und füge sie im neuen Ordner ein, oder ziehe sie per Drag & Drop hinein.',
    },
  },
  help: {
    title: 'Hilfe & Computer-Tipps',
    whatIsFolderTitle: 'Was ist ein Ordner?',
    whatIsFolderDesc: 'Ein Ordner ist wie ein digitaler Hefter oder Aktenordner im Schrank. Darin kannst du viele Dateien sauber sortiert sammeln.',
    whatIsFileTitle: 'Was ist eine Datei?',
    whatIsFileDesc: 'Eine Datei ist ein einzelnes Dokument – z.B. eine Zeichnung (.png) oder ein Text. Sie hat immer einen Namen und eine Endung.',
    whatIsPathTitle: 'Was ist ein Dateipfad?',
    whatIsPathDesc: 'Der Pfad ist die genaue Adresse auf dem Computer. Er zeigt dir den Weg durch die Ordner (z.B. /Klasse/Lukas/Mein Haus.png).',
    whatIsRecycleBinTitle: 'Der Papierkorb',
    whatIsRecycleBinDesc: 'Gelöschte Dinge wandern zuerst in den Papierkorb. Falls du etwas versehentlich gelöscht hast, kannst du es wiederherstellen.',
    needTeacherHelp: 'Brauchst du Unterstützung?',
    tipsTitle: 'Grundregeln für den Computer',
    tip1: 'Ein Ordner ist wie eine Mappe im Regal: Er hilft dir, Ordnung zu halten.',
    tip2: 'Eine Datei (z.B. ein Bild oder ein Text) hat immer einen Namen und einen bestimmten Typ (z.B. .png).',
    tip3: 'Der Dateipfad zeigt dir genau, wo deine Datei liegt – wie eine Hausadresse!',
    tip4: 'Gelöschte Dateien landen im Papierkorb. Solange du ihn nicht leerst, kannst du sie wieder herausholen.',
    tip5: 'Du kannst Fenster am oberen Balken anfassen und mit gedrückter Maustaste verschieben.',
    shortcutsTitle: 'Nützliche Tastenkombinationen',
    shortcutCopy: 'Strg + C : Kopieren',
    shortcutPaste: 'Strg + V : Einfügen',
    shortcutCut: 'Strg + X : Ausschneiden',
    shortcutUndo: 'Strg + Z : Rückgängig',
  },
  coding: {
    title: 'RoboCode: Programmieren lernen',
    level: 'Aufgabe / Level',
    levelSelect: 'Level auswählen',
    teacherTipTitle: 'Didaktischer Tipp vom Lehrer',
    blocksPalette: 'Befehls-Bausteine',
    myProgram: 'Dein Programm-Ablauf',
    run: 'Programm starten',
    stepByStep: 'Schritt-für-Schritt',
    reset: 'Zurücksetzen',
    speedNormal: 'Normal',
    speedFast: 'Schnell',
    clearProgram: 'Zurücksetzen',
    blockForward: '1 Schritt vorwärts',
    blockTurnLeft: 'Nach links drehen ↺',
    blockTurnRight: 'Nach rechts drehen ↻',
    blockCollectStar: 'Daten-Stern einsammeln ★',
    blockRepeat2x: 'Wiederhole 2x [ ... ]',
    blockRepeat3x: 'Wiederhole 3x [ ... ]',
    objective: 'Ziel',
    starsCollected: 'Sterne gesammelt',
    congratsTitle: 'Hervorragend gelöst!',
    congratsMsg: 'Dein Code hat den Roboter fehlerfrei ans Ziel gesteuert.',
    nextLevel: 'Nächstes Level',
    tryAgain: 'Erneut versuchen',
    shareToWall: 'Erfolg an die Klassenwand senden',
    sharedSuccess: 'An die Klassenwand gesendet!',
  },
  logicGames: {
    title: 'Logik- & Denkspiele',
    tabZeek: '🍄 Zeek the Geek',
    tabCables: 'Digitale Pfade (Kabel)',
    tabBoxes: 'Daten-Lagerist (Sokoban)',
    zeekTitle: 'Zeek the Geek: Logik-Abenteuer',
    zeekSubtitle: 'Füttere fleischfressende Pflanzen mit Äpfeln, sammle Schlüssel, sprenge Felsen und iss alle Pilze!',
    zeekWin: 'Hurra! Zeek hat alle Pilze gemampft und das Ziel erreicht!',
    zeekMushrooms: 'Pilze gesammelt',
    zeekMoves: 'Züge',
    zeekPlantWarning: 'Vorsicht! Die Pflanze beißt zu. Schiebe einen Apfel hinein, um sie satt zu machen!',
    zeekPlantAteApple: 'Mampf! Die Pflanze hat den Apfel gefressen und schläft friedlich ein.',
    cablesTitle: 'Verbinde die Datenkabel',
    cablesSubtitle: 'Drehe die Leitungselemente, damit das Signal von Start nach Ziel fließen kann.',
    cablesWin: 'Signal vollständig verbunden! Der Datenstrom fließt!',
    boxesTitle: 'Sortiere die Datenpakete',
    boxesSubtitle: 'Schiebe die Kisten auf die grünen Ziel-Speicherfelder. Vorausschauend denken!',
    boxesWin: 'Alle Datenpakete sicher im Speicher abgelegt!',
    undoMove: 'Schritt zurück',
    restart: 'Neu starten',
    level: 'Rätsel',
    nextLevel: 'Nächstes Rätsel',
    teacherTipZeek: 'Vorausschauendes Denken: Man kann Äpfel nur schieben, niemals ziehen!',
    teacherTipCables: 'In der Informatik müssen Daten wie Strom durch geschlossene Netze fließen.',
    teacherTipBoxes: 'Algorithmen planen Schritte voraus, um Blockaden im Speicher zu vermeiden.',
    soundToggle: 'Ton umschalten',
  },
  groupsWall: {
    title: 'Klassenwand & Arbeitsgruppen',
    tabLiveWall: 'Live-Klassenwand',
    tabTeams: 'Gruppen & Teams',
    liveWallTitle: 'Aktivitäten der Mitschüler in Echtzeit',
    liveWallSubtitle: 'Schau, woran deine Mitschüler gerade arbeiten, und feuere sie mit Reaktionen an!',
    activeStudents: 'Verbundene Schüler/innen',
    onlineNow: 'Online im Klassenraum',
    noStudentsYet: 'Noch keine weiteren Mitschüler online.',
    reactBravo: 'Applaus',
    reactStar: 'Super-Stern',
    reactIdea: 'Gute Idee',
    reactRocket: 'Raketen-Power',
    reactionsCount: 'Reaktionen',
    teamsTitle: 'Team-Arbeitsbereiche',
    teamsSubtitle: 'Gründet Gruppen, teilt Notizen und speichert gemeinsam Dateien im Ordner /Klasse/Equipos.',
    createTeam: 'Neues Team gründen',
    teamName: 'Team-Name',
    teamNamePlaceholder: 'z.B. Team Cyber-Forscher',
    teamIcon: 'Icon',
    teamColor: 'Farbe',
    joinTeam: 'Team beitreten',
    myTeam: 'Dein Team',
    openTeamFolder: 'Team-Ordner im Explorer öffnen',
    teamNotesTitle: 'Gemeinsame Team-Notizen',
    addNote: 'Notiz teilen',
    notePlaceholder: 'Schreibe eine Idee oder Nachricht für dein Team...',
    members: 'Mitglieder',
    noTeamsYet: 'Bisher wurden keine Teams gegründet.',
  },
  classroomChat: {
    title: 'Klassen-Chat',
    subtitle: 'Direkter, sicherer Austausch mit Mitschülern und Lehrkraft',
    placeholder: 'Schreibe eine Nachricht an die Klasse...',
    send: 'Senden',
    quickPromptsTitle: 'Schnellbausteine:',
    promptHello: '👋 Hallo zusammen!',
    promptQuestion: '❓ Ich habe eine Frage zur Aufgabe',
    promptPraise: '⭐ Tolle Arbeit!',
    promptIdea: '💡 Ich habe eine Idee',
    promptWork: '📁 Seht euch meine Datei im Klassenordner an',
    rulesNotice: '💬 Klassenregel: Freundlich, respektvoll und hilfsbereit bleiben!',
    clearChat: 'Chat leeren',
    emptyMessages: 'Noch keine Nachrichten. Sei der Erste, der Hallo sagt!',
    msgFromTeacher: 'Lehrkraft',
  },
  whiteboard: {
    title: 'Gemeinsame Tafel',
    subtitle: 'Kollaborative digitale Tafel für die gesamte Klasse',
    pencil: 'Stift',
    brush: 'Pinsel',
    eraser: 'Radiergummi',
    clear: 'Tafel leeren',
    clearConfirm: 'Möchtest du die gemeinsame Tafel für alle leeren?',
    stamps: 'Stempel & Sticker',
    colors: 'Farben',
    size: 'Strichstärke',
    download: 'Bild speichern',
    cooperativeNotice: '🎨 Alle Zeichnungen und Sticker sind sofort für deine Mitschüler sichtbar!',
    peersDrawing: 'Mitschüler zeichnen live mit',
    saveSuccess: 'Tafelbild erfolgreich in deinem Schülerordner gespeichert!',
  },
  peersWidget: {
    title: 'Live-Klasse',
    dockTitle: 'Mitschüler online',
    activeCount: 'aktiv im Raum',
    roomCode: 'Klassen-Code',
    copyCode: 'Code kopieren',
    copied: 'Kopiert!',
    howItWorks: '📡 Wie funktioniert das? Alle mit diesem Code verbundenen Personen sehen Dateien, Chat und Tafel in Echtzeit.',
    onlineNow: 'Jetzt online',
    teacherBadge: 'Lehrkraft',
    studentBadge: 'Schüler/in',
    youBadge: 'Du',
    inApp: 'Aktiv in',
    greetBtn: 'Grüßen',
    cheerBtn: 'Stern schenken',
    openChatBtn: 'Chat öffnen',
    openWhiteboardBtn: 'Tafel öffnen',
    noPeersOnline: 'Aktuell sind keine weiteren Mitschüler online.',
    didacticTip: 'Tipp: Öffne den Klassen-Code in einem zweiten Fenster, um Multi-User direkt auszuprobieren.',
  },
};

const ES_TRANSLATIONS: Translations = {
  system: {
    title: 'KlassenDesktop',
    appName: 'KlassenDesktop',
    tagline: 'Escritorio virtual educativo para informática básica',
    appTagline: 'Escritorio virtual educativo para informática básica',
    recycleBin: 'Papelera',
    myClass: 'Mi clase',
    teacherMaterial: 'Material del profesor',
    sharedWorks: 'Trabajos compartidos',
    thisPC: 'Este equipo',
    myFolder: 'Mi carpeta personal',
    networkOnline: 'Conectado (En vivo)',
    networkOffline: 'Sin conexión (Reconectando...)',
    saving: 'Guardando...',
    saved: 'Guardado',
    connecting: 'Estableciendo conexión...',
    loading: 'Cargando...',
    wallpaper: 'Fondo de pantalla',
    changeWallpaper: 'Cambiar fondo de escritorio',
    wallpaperTheme: 'Fondo de paisaje',
    chooseWallpaper: 'Elegir paisaje con profundidad óptica',
    refreshDesktop: 'Actualizar escritorio',
    opticalDepthDesc: 'Hermosos paisajes naturales con efecto de perspectiva y profundidad',
  },
  roles: {
    student: 'Estudiante',
    teacher: 'Profesor',
  },
  login: {
    roomCode: 'Código de clase',
    roomCodePlaceholder: 'p. ej. INF-101',
    studentName: 'Tu nombre',
    studentNamePlaceholder: 'p. ej. Lucas o Ana',
    joinClass: 'Entrar al aula',
    className: 'Nombre de la clase',
    classNamePlaceholder: 'p. ej. Informática 6º B',
    teacherName: 'Nombre del docente',
    teacherNamePlaceholder: 'p. ej. Profe Gómez',
    createClass: 'Iniciar clase',
  },
  auth: {
    title: 'Bienvenido al Escritorio del Aula',
    subtitle: 'Elige tu rol e inicia la sesión compartida de aprendizaje.',
    teacherTab: 'Profesor',
    studentTab: 'Estudiante',
    createClass: 'Crear una nueva clase',
    classNamePlaceholder: 'p. ej. Informática 6º B',
    teacherNamePlaceholder: 'Tu nombre (p. ej. Profe Gómez)',
    joinClass: 'Unirse al aula',
    codePlaceholder: 'Código de 6 caracteres (p. ej. ABC-123)',
    studentNamePlaceholder: 'Tu nombre o apodo',
    btnCreate: 'Crear clase y generar código',
    btnJoin: 'Entrar al equipo del aula',
    quickDemoTitle: 'Inicio rápido de prueba',
    quickDemoDesc: 'Prueba inmediatamente una clase de muestra para explorar las funciones.',
    quickTeacher: 'Probar como profesor',
    quickStudent: 'Probar como estudiante',
    errorNameRequired: 'Por favor escribe tu nombre.',
    errorCodeRequired: 'Por favor introduce el código de clase.',
    errorRoomNotFound: 'Clase no encontrada. Comprueba el código.',
    leaveClass: 'Cerrar sesión / Salir',
  },
  taskbar: {
    start: 'Inicio',
    search: 'Buscar programas y archivos...',
    classroomCode: 'Código de clase',
    roleTeacher: 'Panel del profesor',
    roleStudent: 'Espacio de estudiante',
    handRaised: 'Mano levantada',
    raiseHand: 'Levantar la mano',
    lowerHand: 'Bajar la mano',
  },
  startMenu: {
    allApps: 'Todas las aplicaciones',
    userFolder: 'Carpeta personal',
    paintApp: 'Taller de dibujo (Paint)',
    explorerApp: 'Explorador de archivos',
    fileExplorer: 'Explorador de archivos',
    activities: 'Actividades guiadas (7 pasos)',
    activitiesApp: 'Actividades guiadas (7 pasos)',
    teacherDashboard: 'Panel de control',
    teacherBarApp: 'Panel del profesor',
    help: 'Ayuda y atajos',
    helpApp: 'Ayuda y atajos',
    codingApp: 'Aprende a Programar (RoboCode)',
    codingSub: 'Algoritmos, bucles y lógica por bloques',
    logicGamesApp: 'Juegos de Lógica y Caminos',
    logicGamesSub: 'Caminos de red y almacén de memoria',
    groupsWallApp: 'Muro y Equipos de la Clase',
    groupsWallSub: 'Actividad en vivo y carpetas compartidas',
    pinnedApps: 'Aplicaciones ancladas',
    fileExplorerSub: 'Archivos, carpetas y discos',
    paintAppSub: 'Dibujo, pintura y formas',
    activitiesSub: 'Tareas y progreso guiado',
    teacherDashboardSub: 'Control docente y pantalla compartida',
    helpSub: 'Glosario y conceptos informáticos',
    searchPlaceholder: 'Buscar programas y archivos...',
    logout: 'Bloquear escritorio / Salir',
    exit: 'Bloquear escritorio / Salir',
  },
  explorer: {
    title: 'Explorador de archivos',
    address: 'Dirección',
    newFolder: 'Nueva carpeta',
    rename: 'Cambiar nombre',
    cut: 'Cortar',
    copy: 'Copiar',
    paste: 'Pegar',
    delete: 'A la papelera',
    restore: 'Recuperar',
    emptyFolder: 'Esta carpeta está vacía.',
    readOnlyBanner: 'Solo lectura: Solo el profesor puede realizar cambios aquí.',
    ownerBadge: 'Tu espacio personal de trabajo',
    itemsCount: 'Elemento(s)',
    searchPlaceholder: 'Buscar en la carpeta actual...',
    typeFolder: 'Carpeta de archivos',
    typeImage: 'Imagen PNG',
    typeText: 'Documento de texto',
    confirmDelete: '¿Seguro que quieres enviar este elemento a la papelera?',
    deleteForever: 'Eliminar definitivamente',
    nameExists: 'Ya existe un elemento con este nombre en esta carpeta.',
    nameEmpty: 'El nombre no puede estar vacío.',
  },
  paint: {
    title: 'Taller de dibujo',
    pencil: 'Lápiz',
    brush: 'Pincel',
    eraser: 'Borrador',
    shapes: 'Formas',
    line: 'Línea',
    rectangle: 'Rectángulo',
    circle: 'Círculo',
    fillMode: 'Relleno',
    strokeMode: 'Contorno',
    textTool: 'Texto',
    undo: 'Deshacer (Ctrl+Z)',
    redo: 'Rehacer (Ctrl+Y)',
    newCanvas: 'Nuevo lienzo',
    save: 'Guardar',
    saveAs: 'Guardar como...',
    colorPalette: 'Paleta de colores',
    strokeWidth: 'Grosor de trazo',
    saveDialogTitle: 'Guardar dibujo',
    fileNamePrompt: 'Nombre de archivo:',
    selectFolderPrompt: 'Elegir carpeta de destino:',
    btnConfirmSave: 'Guardar imagen',
    btnCancel: 'Cancelar',
    autoDraftFound: '¡Se ha encontrado una copia de seguridad automática!',
    restoreDraft: 'Restaurar borrador',
    discardDraft: 'Descartar',
    savedSuccess: 'Guardado correctamente en:',
    cannotSaveReadOnly: 'No tienes permisos de escritura en esta carpeta. Elige tu propia carpeta.',
  },
  teacher: {
    title: 'Panel del profesor',
    dashboardTitle: 'Panel de control del profesor',
    studentsOnline: 'Estudiantes en el aula',
    classCode: 'Código para los alumnos',
    roomCode: 'Código de clase',
    helpQueue: 'Solicitudes de ayuda pendientes',
    noHelpRequests: 'No hay solicitudes de ayuda. ¡Todos están trabajando bien!',
    pendingHelp: 'Solicitudes',
    resolveHelp: 'Marcar como resuelta',
    startDemoMode: 'Activar Modo Clase (Demostración)',
    startDemo: 'Activar Modo Clase',
    stopDemoMode: 'Finalizar Modo Clase',
    stopDemo: 'Finalizar Modo Clase',
    closeRoom: 'Cerrar clase',
    delegateControl: 'Ceder control a estudiante',
    takeControl: 'Recuperar control',
    presentWork: 'Presentar trabajo a la clase',
    selectArtworkToPresent: 'Seleccionar dibujo para presentar',
    observeStudent: 'Observar espacio y asistir',
    stopObserving: 'Dejar de observar',
    teacherObservingStudent: 'El profesor está observando tu espacio para ayudarte.',
    progress: 'Progreso',
    taskProgress: 'Progreso de las actividades',
    studentCardActionObserve: 'Ver espacio',
    confirmEndClass: '¿Deseas cerrar el aula y finalizar la sesión?',
  },
  demo: {
    bannerTitle: 'MODO CLASE ACTIVO',
    bannerSub: 'El profesor está realizando una demostración en vivo para toda la clase.',
    controlledBy: 'Control activo por:',
    watchingOnly: 'Estás en modo observación. Tus ventanas individuales se mantienen en segundo plano.',
    youHaveControl: '¡Has recibido el control de la demostración!',
    handRaisedNotice: 'Has levantado la mano. El profesor ha recibido tu aviso.',
    handRaised: 'Mano levantada',
    raiseHand: 'Levantar la mano',
    teacherObserving: '👀 El profesor te está observando',
  },
  activities: {
    title: 'Actividades guiadas: Mi carné de informática',
    subtitle: '¡Aprende paso a paso cómo organizar tu ordenador!',
    badgeTitle: 'Maestro de la informática',
    allCompletedTitle: '¡Enhorabuena!',
    allCompletedMsg: 'Has completado los 7 pasos con éxito. ¡Ya dominas las carpetas, archivos y dibujos!',
    allDoneTitle: '¡Todas las actividades completadas! 🎉',
    allDoneMessage: '¡Excelente trabajo! Has completado todos los pasos guiados.',
    completed: 'completadas',
    stepOf: 'Paso {current} de {total}',
    step1Title: '1. Entra en tu carpeta',
    step1Desc: 'En el explorador de archivos, entra en "Mi clase" y abre tu carpeta personal.',
    step2Title: '2. Crea una subcarpeta',
    step2Desc: 'Dentro de tu carpeta, crea una nueva subcarpeta llamada "Mis dibujos".',
    step3Title: '3. Abre el taller de dibujo',
    step3Desc: 'Inicia el programa de dibujo desde el escritorio o el menú de inicio.',
    step4Title: '4. Dibuja una casa',
    step4Desc: 'Dibuja una casa utilizando al menos 3 colores distintos y 2 formas geométricas.',
    step5Title: '5. Guarda el dibujo en su lugar',
    step5Desc: 'Guarda tu dibujo como "Mi casa" dentro de la carpeta "Mis dibujos".',
    step6Title: '6. Crea otra carpeta',
    step6Desc: 'En tu carpeta principal, crea otra carpeta llamada "Trabajo terminado".',
    step7Title: '7. Mueve el dibujo',
    step7Desc: 'Mueve la imagen "Mi casa.png" dentro de la carpeta "Trabajo terminado".',
    steps: {
      step1Title: '1. Entra en tu carpeta',
      step1Desc: 'En el explorador de archivos, entra en "Mi clase" y abre tu carpeta personal.',
      step1Hint: 'Haz doble clic en "Mi clase" y luego en la carpeta con tu nombre.',
      step2Title: '2. Crea una subcarpeta',
      step2Desc: 'Dentro de tu carpeta, crea una nueva subcarpeta llamada "Mis dibujos".',
      step2Hint: 'Pulsa el botón "Nueva carpeta" y escribe "Mis dibujos".',
      step3Title: '3. Abre el taller de dibujo',
      step3Desc: 'Inicia el programa de dibujo desde el escritorio o el menú de inicio.',
      step3Hint: 'Haz doble clic en el icono del pincel en el escritorio.',
      step4Title: '4. Dibuja una casa',
      step4Desc: 'Dibuja una casa utilizando al menos 3 colores distintos y 2 formas geométricas.',
      step4Hint: 'Usa las herramientas de rectángulos, líneas y diferentes colores.',
      step5Title: '5. Guarda el dibujo en su lugar',
      step5Desc: 'Guarda tu dibujo como "Mi casa" dentro de la carpeta "Mis dibujos".',
      step5Hint: 'Usa "Guardar como...", selecciona "Mis dibujos" y pon de nombre "Mi casa".',
      step6Title: '6. Crea otra carpeta',
      step6Desc: 'En tu carpeta principal, crea otra carpeta llamada "Trabajo terminado".',
      step6Hint: 'Sube un nivel y pulsa "Nueva carpeta".',
      step7Title: '7. Mueve el dibujo',
      step7Desc: 'Mueve la imagen "Mi casa.png" dentro de la carpeta "Trabajo terminado".',
      step7Hint: 'Corta y pega el archivo o arrástralo con el ratón a la carpeta de destino.',
    },
  },
  help: {
    title: 'Ayuda y consejos del ordenador',
    whatIsFolderTitle: '¿Qué es una carpeta?',
    whatIsFolderDesc: 'Una carpeta es como un archivador o archivador digital. Te ayuda a organizar tus archivos.',
    whatIsFileTitle: '¿Qué es un archivo?',
    whatIsFileDesc: 'Un archivo es un documento individual, como un dibujo (.png) o texto (.txt).',
    whatIsPathTitle: '¿Qué es una ruta?',
    whatIsPathDesc: 'La ruta es la dirección exacta donde está guardado un archivo (p. ej. /Mi clase/Lucas/Mi casa.png).',
    whatIsRecycleBinTitle: 'La papelera',
    whatIsRecycleBinDesc: 'Los archivos borrados van a la papelera. Puedes recuperarlos si no la has vaciado.',
    needTeacherHelp: '¿Necesitas ayuda del profesor?',
    tipsTitle: 'Reglas básicas de un ordenador',
    tip1: 'Una carpeta es como un archivador: te ayuda a tener todo ordenado.',
    tip2: 'Un archivo (imagen o texto) siempre tiene un nombre y una extensión que define su tipo.',
    tip3: 'La ruta te indica exactamente en qué lugar se encuentra un archivo, como su dirección postal.',
    tip4: 'Los elementos borrados van a la papelera. Puedes recuperarlos mientras no la vacíes.',
    tip5: 'Puedes mover cualquier ventana arrastrándola desde su barra superior con el ratón.',
    shortcutsTitle: 'Atajos de teclado imprescindibles',
    shortcutCopy: 'Ctrl + C : Copiar',
    shortcutPaste: 'Ctrl + V : Pegar',
    shortcutCut: 'Ctrl + X : Cortar',
    shortcutUndo: 'Ctrl + Z : Deshacer',
  },
  coding: {
    title: 'RoboCode: Aprende a Programar',
    level: 'Misión / Nivel',
    levelSelect: 'Seleccionar nivel',
    teacherTipTitle: 'Consejo didáctico del profesor',
    blocksPalette: 'Bloques de código',
    myProgram: 'Tu algoritmo (Instrucciones)',
    run: 'Ejecutar código',
    stepByStep: 'Paso a paso',
    reset: 'Reiniciar',
    speedNormal: 'Normal',
    speedFast: 'Rápido',
    clearProgram: 'Borrar todo',
    blockForward: 'Avanzar 1 casilla',
    blockTurnLeft: 'Girar a la izquierda ↺',
    blockTurnRight: 'Girar a la derecha ↻',
    blockCollectStar: 'Recoger estrella ★',
    blockRepeat2x: 'Repetir 2 veces [ ... ]',
    blockRepeat3x: 'Repetir 3 veces [ ... ]',
    objective: 'Objetivo de la misión',
    starsCollected: 'Estrellas recogidas',
    congratsTitle: '¡Misión completada con éxito!',
    congratsMsg: '¡Excelente pensamiento computacional! Tu algoritmo guió al robot sin fallos.',
    nextLevel: 'Siguiente reto',
    tryAgain: 'Volver a intentar',
    shareToWall: 'Publicar logro en el Muro',
    sharedSuccess: '¡Publicado en el muro de la clase!',
  },
  logicGames: {
    title: 'Juegos de Lógica y Algoritmos',
    tabZeek: '🍄 Zeek the Geek',
    tabCables: 'Caminos Digitales (Red)',
    tabBoxes: 'Almacén de Datos (Sokoban)',
    zeekTitle: 'Zeek the Geek: Aventura Retro de Lógica',
    zeekSubtitle: 'Alimenta a las plantas carnívoras con manzanas, recoge llaves, detona dinamita y come todos los champiñones para ganar.',
    zeekWin: '¡Genial! ¡Zeek comió todos los champiñones y completó el nivel con éxito!',
    zeekMushrooms: 'Champiñones comidos',
    zeekMoves: 'Movimientos',
    zeekPlantWarning: '¡Cuidado! La planta carnívora muerde. ¡Empuja una manzana hacia su boca para calmarla!',
    zeekPlantAteApple: '¡Ñam ñam! La planta devoró la manzana y se quedó profundamente dormida.',
    cablesTitle: 'Conecta el Cableado de Red',
    cablesSubtitle: 'Haz clic en las piezas del cable para rotarlas y conectar el servidor con el ordenador terminal.',
    cablesWin: '¡Circuito conectado! Los datos viajan a la velocidad de la luz.',
    boxesTitle: 'Ordena los Paquetes de Memoria',
    boxesSubtitle: 'Empuja las cajas de datos hasta las zonas verdes de almacenamiento. ¡Planea antes de mover!',
    boxesWin: '¡Perfecto! Todos los datos están ordenados en su lugar.',
    undoMove: 'Deshacer paso',
    restart: 'Reiniciar puzzle',
    level: 'Nivel',
    nextLevel: 'Siguiente puzzle',
    teacherTipZeek: 'Pensamiento lógico: Las manzanas solo se pueden empujar, ¡nunca jalar! Piensa bien antes de moverte.',
    teacherTipCables: 'En informática, la información viaja por redes cerradas de conexiones ordenadas.',
    teacherTipBoxes: 'Pensar con anticipación te enseña cómo los procesadores organizan la memoria sin bloquearse.',
    soundToggle: 'Activar/Desactivar Sonido',
  },
  groupsWall: {
    title: 'Muro de la Clase y Equipos',
    tabLiveWall: 'Muro en Vivo',
    tabTeams: 'Equipos de Trabajo',
    liveWallTitle: '¿Qué están haciendo tus compañeros?',
    liveWallSubtitle: 'Descubre en qué aplicación trabaja cada compañero y envíale ánimos con reacciones en directo.',
    activeStudents: 'Estudiantes en el aula',
    onlineNow: 'Conectados ahora',
    noStudentsYet: 'Aún no hay más compañeros conectados.',
    reactBravo: 'Aplausos',
    reactStar: 'Estrella brillante',
    reactIdea: '¡Gran idea!',
    reactRocket: '¡A tope!',
    reactionsCount: 'Reacciones recibidas',
    teamsTitle: 'Equipos y Proyectos Colaborativos',
    teamsSubtitle: 'Crea o únete a un equipo para compartir notas e ideas, y guardar archivos juntos en /Klasse/Equipos.',
    createTeam: 'Crear nuevo equipo',
    teamName: 'Nombre del equipo',
    teamNamePlaceholder: 'p. ej. Equipo Astronautas o Creadores 3D',
    teamIcon: 'Icono del equipo',
    teamColor: 'Color distintivo',
    joinTeam: 'Unirme a este equipo',
    myTeam: 'Mi equipo actual',
    openTeamFolder: 'Abrir carpeta del equipo en el Explorador',
    teamNotesTitle: 'Tablón de notas del equipo',
    addNote: 'Publicar nota',
    notePlaceholder: 'Escribe una idea, plan o mensaje para tus compañeros...',
    members: 'Miembros',
    noTeamsYet: 'Aún no se han creado equipos. ¡Sé el primero en fundar uno!',
  },
  classroomChat: {
    title: 'Chat de Clase',
    subtitle: 'Canal directo y respetuoso entre compañeros y docente',
    placeholder: 'Escribe un mensaje para toda la clase...',
    send: 'Enviar',
    quickPromptsTitle: 'Plantillas rápidas:',
    promptHello: '👋 ¡Hola a todos!',
    promptQuestion: '❓ Tengo una duda con la actividad',
    promptPraise: '⭐ ¡Buen trabajo!',
    promptIdea: '💡 Se me ocurrió una idea',
    promptWork: '📁 Miren mi nuevo trabajo en la carpeta compartida',
    rulesNotice: '💬 Norma del aula: Compartir siempre con amabilidad y respeto mutuo.',
    clearChat: 'Vaciar chat',
    emptyMessages: 'Aún no hay mensajes. ¡Sé el primero en saludar a la clase!',
    msgFromTeacher: 'Profesor/a',
  },
  whiteboard: {
    title: 'Pizarra Digital Colaborativa',
    subtitle: 'Espacio de dibujo y anotaciones compartidas en tiempo real',
    pencil: 'Lápiz',
    brush: 'Pincel',
    eraser: 'Borrador',
    clear: 'Limpiar pizarra',
    clearConfirm: '¿Deseas borrar los trazos de la pizarra para toda la clase?',
    stamps: 'Pegatinas & Sellos',
    colors: 'Colores',
    size: 'Grosor',
    download: 'Guardar dibujo',
    cooperativeNotice: '🎨 ¡Todos los trazos y pegatinas se transmiten al instante a tus compañeros!',
    peersDrawing: 'compañeros dibujando en vivo',
    saveSuccess: '¡Lienzo guardado con éxito en tu carpeta de clase!',
  },
  peersWidget: {
    title: 'Aula en Vivo',
    dockTitle: 'Compañeros en línea',
    activeCount: 'activos en la sesión',
    roomCode: 'Código de clase',
    copyCode: 'Copiar código',
    copied: '¡Copiado!',
    howItWorks: '📡 ¿Cómo funciona? Toda persona conectada con este código comparte archivos, pizarra y chat en directo.',
    onlineNow: 'Conectados ahora',
    teacherBadge: 'Docente',
    studentBadge: 'Estudiante',
    youBadge: 'Tú',
    inApp: 'En',
    greetBtn: 'Saludar',
    cheerBtn: 'Dar estrella',
    openChatBtn: 'Abrir chat',
    openWhiteboardBtn: 'Abrir pizarra',
    noPeersOnline: 'Por ahora no hay otros compañeros en línea.',
    didacticTip: 'Consejo: Abre la aplicación en una segunda pestaña o desde otro equipo para ver cómo interactúan en tiempo real.',
  },
};

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly STORAGE_KEY = 'klassendesktop_lang_pref';

  private getInitialLanguage(): Language {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved === 'es' || saved === 'de') {
          return saved;
        }
      } catch {
        // ignore error
      }
    }
    // Default to German ('de') in accordance with user directive
    return 'de';
  }

  readonly currentLanguage = signal<Language>(this.getInitialLanguage());
  readonly currentLang = computed(() => this.currentLanguage());
  readonly isDe = computed(() => this.currentLanguage() === 'de');

  readonly t = computed(() => {
    return this.currentLanguage() === 'de' ? DE_TRANSLATIONS : ES_TRANSLATIONS;
  });

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, lang);
      } catch {
        // ignore error
      }
    }
  }

  toggleLanguage(): void {
    const next = this.currentLanguage() === 'de' ? 'es' : 'de';
    this.setLanguage(next);
  }
}
