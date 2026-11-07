import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClassroomService } from '../services/classroom.service';
import { I18nService } from '../services/i18n.service';

// ============================================================================
// GAME 1: ZEEK THE GEEK (Retro Logic Puzzle Adventure)
// ============================================================================
export type ZeekTileType =
  | 'floor'
  | 'wall'
  | 'cracked_wall'
  | 'mushroom'
  | 'apple'
  | 'plant' // Carnivorous Venus flytrap
  | 'plant_sleeping' // Pacified plant after eating apple
  | 'key_yellow'
  | 'door_yellow'
  | 'key_blue'
  | 'door_blue'
  | 'bomb' // TNT explosive
  | 'flower' // Goal exit
  | 'boulder'; // Heavy pushable stone

export interface ZeekLevel {
  id: number;
  nameDe: string;
  nameEs: string;
  width: number;
  height: number;
  parMoves: number;
  playerStart: { x: number; y: number; dir?: 'N' | 'S' | 'E' | 'W' };
  layout: string[]; // ASCII grid layout
  hintDe: string;
  hintEs: string;
}

// Legend for Zeek ASCII layout:
// ' ' = floor
// '#' = wall
// '=' = cracked_wall (can be blown up with bomb)
// 'M' = mushroom
// 'A' = apple
// 'P' = plant (carnivorous)
// 'Y' = key_yellow, 'D' = door_yellow
// 'B' = key_blue,   'G' = door_blue
// 'T' = bomb (TNT)
// 'F' = flower (exit)
// 'O' = boulder
const ZEEK_LEVELS: ZeekLevel[] = [
  {
    id: 1,
    nameDe: 'Level 1: Zeeks Frühstück',
    nameEs: 'Nivel 1: El Desayuno de Zeek',
    width: 7,
    height: 6,
    parMoves: 14,
    playerStart: { x: 1, y: 4, dir: 'E' },
    hintDe: 'Friss alle 3 Pilze! Schiebe den Apfel zur Seite, um zur goldenen Blume zu gelangen.',
    hintEs: '¡Come los 3 champiñones! Empuja la manzana a un lado para alcanzar la flor mágica.',
    layout: [
      '#######',
      '#  M  #',
      '# #A# #',
      '# M F #',
      '#   M #',
      '#######',
    ],
  },
  {
    id: 2,
    nameDe: 'Level 2: Die gefräßige Pflanze',
    nameEs: 'Nivel 2: La Planta Glotona',
    width: 8,
    height: 6,
    parMoves: 18,
    playerStart: { x: 1, y: 2, dir: 'E' },
    hintDe: 'Die Pflanze versperrt den Weg! Schiebe den Apfel direkt in ihr Maul, damit sie einschläft.',
    hintEs: '¡La planta carnívora bloquea el paso! Empuja la manzana hacia su boca para calmarla.',
    layout: [
      '########',
      '#   M  #',
      '# A P MF',
      '#   M  #',
      '#   M  #',
      '########',
    ],
  },
  {
    id: 3,
    nameDe: 'Level 3: Schlüssel & Geheimtüren',
    nameEs: 'Nivel 3: Llaves y Puertas Secretas',
    width: 8,
    height: 7,
    parMoves: 26,
    playerStart: { x: 1, y: 1, dir: 'S' },
    hintDe: 'Finde den gelben Schlüssel für die gelbe Tür und den blauen Schlüssel für das Pilzlager!',
    hintEs: '¡Consigue la llave amarilla para la puerta dorada y la llave azul para la cámara de setas!',
    layout: [
      '########',
      '# Y# M #',
      '#  # M #',
      '#D###G##',
      '# A B  #',
      '#   M F#',
      '########',
    ],
  },
  {
    id: 4,
    nameDe: 'Level 4: TNT im Felsenlabyrinth',
    nameEs: 'Nivel 4: ¡Dinamita en el Laberinto!',
    width: 9,
    height: 7,
    parMoves: 24,
    playerStart: { x: 1, y: 3, dir: 'E' },
    hintDe: 'Schiebe das TNT an die brüchige Steinwand (=) und zünde es, um den geheimen Pfad zu öffnen.',
    hintEs: 'Empuja la dinamita contra la roca agrietada (=) y pulsa "Detonar" para abrir la cueva secreta.',
    layout: [
      '#########',
      '# M #MF #',
      '# A #M  #',
      '# T = M #',
      '#   #####',
      '#   M   #',
      '#########',
    ],
  },
  {
    id: 5,
    nameDe: 'Level 5: Das doppelte Festmahl',
    nameEs: 'Nivel 5: Doble Banquete',
    width: 9,
    height: 8,
    parMoves: 32,
    playerStart: { x: 1, y: 1, dir: 'E' },
    hintDe: 'Zwei Pflanzen bewachen die Gänge. Füttere die erste Pflanze, um an den zweiten Apfel zu kommen!',
    hintEs: 'Dos plantas custodian los pasillos. ¡Alimenta a la primera para llegar a la segunda manzana!',
    layout: [
      '#########',
      '#  A P  #',
      '# ##### #',
      '# M # M #',
      '# #A# P #',
      '#   # M #',
      '#   # F #',
      '#########',
    ],
  },
  {
    id: 6,
    nameDe: 'Level 6: Zeeks Meisterprüfung',
    nameEs: 'Nivel 6: El Templo Maestro de Zeek',
    width: 10,
    height: 8,
    parMoves: 38,
    playerStart: { x: 1, y: 6, dir: 'N' },
    hintDe: 'Das ultimative Rätsel: Schalter, Äpfel, Pflanzen und Felsen erfordern vorausschauende Planung!',
    hintEs: 'El desafío definitivo: llaves, manzanas, plantas y rocas. ¡Un solo error puede atraparte!',
    layout: [
      '##########',
      '#Y# M  MF#',
      '# #A#G####',
      '# # P  B #',
      '#D####D###',
      '# A P  M #',
      '#   #  M #',
      '##########',
    ],
  },
];

// ============================================================================
// GAME 2: CAMINOS DIGITALES (Path Cable Rotating)
// ============================================================================
export interface CableTile {
  x: number;
  y: number;
  shape: 'line' | 'corner' | 't' | 'cross' | 'start' | 'goal';
  rotation: number; // 0, 90, 180, 270
  isPowered?: boolean;
}

export interface CableLevel {
  id: number;
  nameDe: string;
  nameEs: string;
  gridSize: number;
  start: { x: number; y: number; dir: number };
  goal: { x: number; y: number; dir: number };
  initialTiles: Omit<CableTile, 'isPowered'>[];
}

const CABLE_LEVELS: CableLevel[] = [
  {
    id: 1,
    nameDe: 'Level 1: Basis-Verbindung',
    nameEs: 'Nivel 1: Conexión Básica',
    gridSize: 3,
    start: { x: 0, y: 1, dir: 1 }, // East
    goal: { x: 2, y: 1, dir: 3 }, // West
    initialTiles: [
      { x: 0, y: 0, shape: 'corner', rotation: 90 },
      { x: 1, y: 0, shape: 'line', rotation: 0 },
      { x: 2, y: 0, shape: 'corner', rotation: 180 },
      { x: 0, y: 1, shape: 'start', rotation: 0 },
      { x: 1, y: 1, shape: 'line', rotation: 90 },
      { x: 2, y: 1, shape: 'goal', rotation: 0 },
      { x: 0, y: 2, shape: 'corner', rotation: 0 },
      { x: 1, y: 2, shape: 'line', rotation: 0 },
      { x: 2, y: 2, shape: 'corner', rotation: 270 },
    ],
  },
  {
    id: 2,
    nameDe: 'Level 2: Umleitung in L-Form',
    nameEs: 'Nivel 2: Esquina en L',
    gridSize: 3,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 2, y: 2, dir: 0 },
    initialTiles: [
      { x: 0, y: 0, shape: 'start', rotation: 0 },
      { x: 1, y: 0, shape: 'corner', rotation: 0 },
      { x: 2, y: 0, shape: 'corner', rotation: 90 },
      { x: 0, y: 1, shape: 'line', rotation: 0 },
      { x: 1, y: 1, shape: 'line', rotation: 0 },
      { x: 2, y: 1, shape: 'line', rotation: 0 },
      { x: 0, y: 2, shape: 'corner', rotation: 0 },
      { x: 1, y: 2, shape: 'line', rotation: 0 },
      { x: 2, y: 2, shape: 'goal', rotation: 0 },
    ],
  },
  {
    id: 3,
    nameDe: 'Level 3: Server-Weiche (T-Stück)',
    nameEs: 'Nivel 3: Cruce de Servidores',
    gridSize: 4,
    start: { x: 0, y: 1, dir: 1 },
    goal: { x: 3, y: 2, dir: 3 },
    initialTiles: [
      { x: 0, y: 0, shape: 'corner', rotation: 90 },
      { x: 1, y: 0, shape: 'line', rotation: 0 },
      { x: 2, y: 0, shape: 't', rotation: 90 },
      { x: 3, y: 0, shape: 'corner', rotation: 180 },
      { x: 0, y: 1, shape: 'start', rotation: 0 },
      { x: 1, y: 1, shape: 'corner', rotation: 180 },
      { x: 2, y: 1, shape: 'line', rotation: 90 },
      { x: 3, y: 1, shape: 'line', rotation: 0 },
      { x: 0, y: 2, shape: 'line', rotation: 0 },
      { x: 1, y: 2, shape: 'corner', rotation: 0 },
      { x: 2, y: 2, shape: 'corner', rotation: 270 },
      { x: 3, y: 2, shape: 'goal', rotation: 0 },
      { x: 0, y: 3, shape: 'corner', rotation: 0 },
      { x: 1, y: 3, shape: 'line', rotation: 0 },
      { x: 2, y: 3, shape: 'line', rotation: 0 },
      { x: 3, y: 3, shape: 'corner', rotation: 270 },
    ],
  },
  {
    id: 4,
    nameDe: 'Level 4: Die Ring-Netzwerkstruktur',
    nameEs: 'Nivel 4: Red Troncal en Anillo',
    gridSize: 4,
    start: { x: 0, y: 0, dir: 2 },
    goal: { x: 3, y: 3, dir: 0 },
    initialTiles: [
      { x: 0, y: 0, shape: 'start', rotation: 0 },
      { x: 1, y: 0, shape: 'corner', rotation: 90 },
      { x: 2, y: 0, shape: 'line', rotation: 0 },
      { x: 3, y: 0, shape: 'corner', rotation: 180 },
      { x: 0, y: 1, shape: 'line', rotation: 90 },
      { x: 1, y: 1, shape: 't', rotation: 0 },
      { x: 2, y: 1, shape: 'corner', rotation: 270 },
      { x: 3, y: 1, shape: 'line', rotation: 90 },
      { x: 0, y: 2, shape: 'corner', rotation: 0 },
      { x: 1, y: 2, shape: 'line', rotation: 0 },
      { x: 2, y: 2, shape: 't', rotation: 180 },
      { x: 3, y: 2, shape: 'line', rotation: 90 },
      { x: 0, y: 3, shape: 'line', rotation: 0 },
      { x: 1, y: 3, shape: 'corner', rotation: 0 },
      { x: 2, y: 3, shape: 'line', rotation: 0 },
      { x: 3, y: 3, shape: 'goal', rotation: 0 },
    ],
  },
  {
    id: 5,
    nameDe: 'Level 5: Glasfaser-Knotenpunkt',
    nameEs: 'Nivel 5: Nodo Central de Fibra',
    gridSize: 4,
    start: { x: 0, y: 2, dir: 1 },
    goal: { x: 3, y: 1, dir: 3 },
    initialTiles: [
      { x: 0, y: 0, shape: 'corner', rotation: 0 },
      { x: 1, y: 0, shape: 'cross', rotation: 0 },
      { x: 2, y: 0, shape: 'line', rotation: 0 },
      { x: 3, y: 0, shape: 'corner', rotation: 180 },
      { x: 0, y: 1, shape: 'line', rotation: 90 },
      { x: 1, y: 1, shape: 't', rotation: 90 },
      { x: 2, y: 1, shape: 'corner', rotation: 0 },
      { x: 3, y: 1, shape: 'goal', rotation: 0 },
      { x: 0, y: 2, shape: 'start', rotation: 0 },
      { x: 1, y: 2, shape: 'cross', rotation: 0 },
      { x: 2, y: 2, shape: 't', rotation: 270 },
      { x: 3, y: 2, shape: 'line', rotation: 90 },
      { x: 0, y: 3, shape: 'corner', rotation: 90 },
      { x: 1, y: 3, shape: 'line', rotation: 0 },
      { x: 2, y: 3, shape: 'corner', rotation: 270 },
      { x: 3, y: 3, shape: 'corner', rotation: 180 },
    ],
  },
  {
    id: 6,
    nameDe: 'Level 6: Datenautobahn 5G',
    nameEs: 'Nivel 6: Autopista Digital 5G',
    gridSize: 5,
    start: { x: 0, y: 0, dir: 1 },
    goal: { x: 4, y: 4, dir: 0 },
    initialTiles: [
      { x: 0, y: 0, shape: 'start', rotation: 0 },
      { x: 1, y: 0, shape: 'line', rotation: 90 },
      { x: 2, y: 0, shape: 'corner', rotation: 0 },
      { x: 3, y: 0, shape: 'line', rotation: 0 },
      { x: 4, y: 0, shape: 'corner', rotation: 180 },
      { x: 0, y: 1, shape: 'line', rotation: 0 },
      { x: 1, y: 1, shape: 'corner', rotation: 90 },
      { x: 2, y: 1, shape: 'cross', rotation: 0 },
      { x: 3, y: 1, shape: 'corner', rotation: 270 },
      { x: 4, y: 1, shape: 'line', rotation: 90 },
      { x: 0, y: 2, shape: 'corner', rotation: 90 },
      { x: 1, y: 2, shape: 't', rotation: 180 },
      { x: 2, y: 2, shape: 'line', rotation: 0 },
      { x: 3, y: 2, shape: 'cross', rotation: 0 },
      { x: 4, y: 2, shape: 'line', rotation: 90 },
      { x: 0, y: 3, shape: 'line', rotation: 90 },
      { x: 1, y: 3, shape: 'corner', rotation: 0 },
      { x: 2, y: 3, shape: 'line', rotation: 0 },
      { x: 3, y: 3, shape: 'corner', rotation: 90 },
      { x: 4, y: 3, shape: 'line', rotation: 90 },
      { x: 0, y: 4, shape: 'corner', rotation: 0 },
      { x: 1, y: 4, shape: 'line', rotation: 0 },
      { x: 2, y: 4, shape: 'corner', rotation: 270 },
      { x: 3, y: 4, shape: 'line', rotation: 0 },
      { x: 4, y: 4, shape: 'goal', rotation: 0 },
    ],
  },
];

// ============================================================================
// GAME 3: MOVER CAJAS (Data Warehouse / Sokoban)
// ============================================================================
export interface BoxLevel {
  id: number;
  nameDe: string;
  nameEs: string;
  width: number;
  height: number;
  parMoves: number;
  playerStart: { x: number; y: number };
  walls: { x: number; y: number }[];
  goals: { x: number; y: number }[];
  boxes: { x: number; y: number }[];
}

const BOX_LEVELS: BoxLevel[] = [
  {
    id: 1,
    nameDe: 'Level 1: Erstes Datenpaket',
    nameEs: 'Nivel 1: Primer Paquete de Memoria',
    width: 5,
    height: 5,
    parMoves: 4,
    playerStart: { x: 1, y: 2 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 },
    ],
    goals: [{ x: 3, y: 2 }],
    boxes: [{ x: 2, y: 2 }],
  },
  {
    id: 2,
    nameDe: 'Level 2: Zwei Register füllen',
    nameEs: 'Nivel 2: Dos Registros Simultáneos',
    width: 6,
    height: 5,
    parMoves: 12,
    playerStart: { x: 1, y: 2 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 },
      { x: 3, y: 1 },
    ],
    goals: [{ x: 4, y: 1 }, { x: 4, y: 3 }],
    boxes: [{ x: 2, y: 2 }, { x: 3, y: 3 }],
  },
  {
    id: 3,
    nameDe: 'Level 3: Der Speicher-Korridor',
    nameEs: 'Nivel 3: El Pasillo de Memoria RAM',
    width: 6,
    height: 6,
    parMoves: 16,
    playerStart: { x: 1, y: 1 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
      { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 },
      { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 },
    ],
    goals: [{ x: 1, y: 4 }, { x: 4, y: 1 }],
    boxes: [{ x: 2, y: 1 }, { x: 3, y: 3 }],
  },
  {
    id: 4,
    nameDe: 'Level 4: Zirkulärer Cache-Puffer',
    nameEs: 'Nivel 4: Buffer de Caché Circular',
    width: 6,
    height: 6,
    parMoves: 22,
    playerStart: { x: 2, y: 2 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
      { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 },
      { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 },
      { x: 3, y: 2 },
    ],
    goals: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }],
    boxes: [{ x: 2, y: 1 }, { x: 3, y: 3 }, { x: 2, y: 4 }],
  },
  {
    id: 5,
    nameDe: 'Level 5: Das Kreuz der Prozessoren',
    nameEs: 'Nivel 5: La Cruz de Microchips',
    width: 7,
    height: 6,
    parMoves: 28,
    playerStart: { x: 1, y: 1 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
      { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 },
      { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 },
      { x: 3, y: 2 }, { x: 3, y: 3 },
    ],
    goals: [{ x: 1, y: 4 }, { x: 5, y: 1 }, { x: 5, y: 4 }],
    boxes: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 3 }],
  },
  {
    id: 6,
    nameDe: 'Level 6: Hauptspeicher-Architektur',
    nameEs: 'Nivel 6: Arquitectura de Memoria Principal',
    width: 7,
    height: 7,
    parMoves: 34,
    playerStart: { x: 3, y: 3 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
      { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 },
      { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }, { x: 0, y: 5 },
      { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 },
      { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 4 },
    ],
    goals: [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 1, y: 5 }, { x: 5, y: 5 }],
    boxes: [{ x: 2, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 4 }],
  },
];

@Component({
  selector: 'app-logic-games',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logic-games.html',
})
export class LogicGames implements OnInit, OnDestroy {
  readonly initialGame = input<'zeek' | 'cables' | 'boxes'>('zeek');

  private readonly classroomService = inject(ClassroomService);
  private readonly i18n = inject(I18nService);

  readonly t = this.i18n.t;
  readonly isDe = this.i18n.isDe;

  readonly activeGame = signal<'zeek' | 'cables' | 'boxes'>('zeek');
  readonly currentLevelId = signal<number>(1);
  readonly soundEnabled = signal<boolean>(true);
  readonly bannerMessage = signal<string | null>(null);

  // ==========================================
  // ZEEK THE GEEK STATE
  // ==========================================
  readonly ZEEK_LEVELS = ZEEK_LEVELS;
  readonly zeekGrid = signal<ZeekTileType[][]>([]);
  readonly zeekPlayer = signal<{ x: number; y: number; dir: 'N' | 'S' | 'E' | 'W' }>({
    x: 0,
    y: 0,
    dir: 'S',
  });
  readonly zeekMoves = signal<number>(0);
  readonly zeekScore = signal<number>(0);
  readonly zeekMushroomsLeft = signal<number>(0);
  readonly zeekTotalMushrooms = signal<number>(0);
  readonly zeekKeysYellow = signal<number>(0);
  readonly zeekKeysBlue = signal<number>(0);
  readonly zeekBombs = signal<number>(0);
  readonly zeekWon = signal<boolean>(false);
  readonly zeekHistory = signal<{
    grid: ZeekTileType[][];
    player: { x: number; y: number; dir: 'N' | 'S' | 'E' | 'W' };
    mushroomsLeft: number;
    keysYellow: number;
    keysBlue: number;
    bombs: number;
    score: number;
  }[]>([]);

  // ==========================================
  // CABLES STATE
  // ==========================================
  readonly CABLE_LEVELS = CABLE_LEVELS;
  readonly cableTiles = signal<CableTile[]>([]);
  readonly cablesWon = signal<boolean>(false);
  readonly isTestingSignal = signal<boolean>(false);

  // ==========================================
  // BOXES (SOKOBAN) STATE
  // ==========================================
  readonly BOX_LEVELS = BOX_LEVELS;
  readonly boxPlayer = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly boxPositions = signal<{ x: number; y: number }[]>([]);
  readonly boxMoves = signal<number>(0);
  readonly boxHistory = signal<{
    player: { x: number; y: number };
    boxes: { x: number; y: number }[];
  }[]>([]);
  readonly boxesWon = signal<boolean>(false);

  private audioCtx: AudioContext | null = null;
  private bannerTimeout: ReturnType<typeof setTimeout> | null = null;

  // Computed Properties
  readonly currentZeekLevel = computed(() => {
    return ZEEK_LEVELS.find((l) => l.id === this.currentLevelId()) || ZEEK_LEVELS[0];
  });

  readonly currentCableLevel = computed(() => {
    return CABLE_LEVELS.find((l) => l.id === this.currentLevelId()) || CABLE_LEVELS[0];
  });

  readonly currentBoxLevel = computed(() => {
    return BOX_LEVELS.find((l) => l.id === this.currentLevelId()) || BOX_LEVELS[0];
  });

  readonly currentLevelsList = computed(() => {
    switch (this.activeGame()) {
      case 'zeek':
        return ZEEK_LEVELS;
      case 'cables':
        return CABLE_LEVELS;
      case 'boxes':
        return BOX_LEVELS;
      default:
        return ZEEK_LEVELS;
    }
  });

  readonly zeekGridCells = computed<{ x: number; y: number; tile: ZeekTileType }[]>(() => {
    const grid = this.zeekGrid();
    const lvl = this.currentZeekLevel();
    const cells: { x: number; y: number; tile: ZeekTileType }[] = [];

    for (let y = 0; y < lvl.height; y++) {
      const row = grid[y];
      for (let x = 0; x < lvl.width; x++) {
        cells.push({
          x,
          y,
          tile: row ? (row[x] || 'floor') : 'floor',
        });
      }
    }
    return cells;
  });

  readonly boxesOnGoalCount = computed(() => {
    const goals = this.currentBoxLevel().goals;
    const boxes = this.boxPositions();
    return boxes.filter((b) => goals.some((g) => g.x === b.x && g.y === b.y)).length;
  });

  readonly boxGridCells = computed(() => {
    const lvl = this.currentBoxLevel();
    const cells: {
      x: number;
      y: number;
      type: 'floor' | 'wall';
      isGoal: boolean;
      hasBox: boolean;
    }[] = [];
    const boxes = this.boxPositions();

    for (let y = 0; y < lvl.height; y++) {
      for (let x = 0; x < lvl.width; x++) {
        const isWall = lvl.walls.some((w) => w.x === x && w.y === y);
        const isGoal = lvl.goals.some((g) => g.x === x && g.y === y);
        const hasBox = boxes.some((b) => b.x === x && b.y === y);

        cells.push({
          x,
          y,
          type: isWall ? 'wall' : 'floor',
          isGoal,
          hasBox,
        });
      }
    }
    return cells;
  });

  ngOnInit(): void {
    const initG = this.initialGame();
    if (initG && (initG === 'zeek' || initG === 'cables' || initG === 'boxes')) {
      this.activeGame.set(initG);
    }
    this.selectLevel(1);
  }

  ngOnDestroy(): void {
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // audio context cleanup
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Only capture arrow keys/WASD if inside games container or not focusing an input
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    if (this.activeGame() === 'zeek') {
      if (['ArrowUp', 'KeyW'].includes(event.code)) {
        event.preventDefault();
        this.moveZeek(0, -1, 'N');
      } else if (['ArrowDown', 'KeyS'].includes(event.code)) {
        event.preventDefault();
        this.moveZeek(0, 1, 'S');
      } else if (['ArrowLeft', 'KeyA'].includes(event.code)) {
        event.preventDefault();
        this.moveZeek(-1, 0, 'W');
      } else if (['ArrowRight', 'KeyD'].includes(event.code)) {
        event.preventDefault();
        this.moveZeek(1, 0, 'E');
      } else if (event.code === 'KeyZ' || event.code === 'KeyU') {
        event.preventDefault();
        this.undoZeek();
      } else if (event.code === 'KeyR') {
        event.preventDefault();
        this.restartLevel();
      } else if (event.code === 'Space') {
        event.preventDefault();
        this.detonateZeekBomb();
      }
    } else if (this.activeGame() === 'boxes') {
      if (['ArrowUp', 'KeyW'].includes(event.code)) {
        event.preventDefault();
        this.moveBoxPlayer(0, -1);
      } else if (['ArrowDown', 'KeyS'].includes(event.code)) {
        event.preventDefault();
        this.moveBoxPlayer(0, 1);
      } else if (['ArrowLeft', 'KeyA'].includes(event.code)) {
        event.preventDefault();
        this.moveBoxPlayer(-1, 0);
      } else if (['ArrowRight', 'KeyD'].includes(event.code)) {
        event.preventDefault();
        this.moveBoxPlayer(1, 0);
      } else if (event.code === 'KeyZ' || event.code === 'KeyU') {
        event.preventDefault();
        this.undoBoxMove();
      } else if (event.code === 'KeyR') {
        event.preventDefault();
        this.restartLevel();
      }
    }
  }

  switchGame(game: 'zeek' | 'cables' | 'boxes'): void {
    this.activeGame.set(game);
    this.selectLevel(1);

    const gameName =
      game === 'zeek'
        ? 'Zeek the Geek'
        : game === 'cables'
        ? 'Caminos Digitales'
        : 'Almacén de Datos';
    this.classroomService.reportActivity('Juegos de Lógica', `Jugando a ${gameName}`);
  }

  selectLevel(id: number): void {
    this.currentLevelId.set(id);
    this.bannerMessage.set(null);

    switch (this.activeGame()) {
      case 'zeek':
        this.initZeekLevel(id);
        break;
      case 'cables':
        this.initCableLevel(id);
        break;
      case 'boxes':
        this.initBoxLevel(id);
        break;
    }
  }

  restartLevel(): void {
    this.selectLevel(this.currentLevelId());
  }

  toggleSound(): void {
    this.soundEnabled.update((v) => !v);
  }

  showNotification(msg: string): void {
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerMessage.set(msg);
    this.bannerTimeout = setTimeout(() => {
      this.bannerMessage.set(null);
    }, 3800);
  }

  // ==========================================================================
  // ZEEK THE GEEK LOGIC & GAMEPLAY
  // ==========================================================================
  private initZeekLevel(id: number): void {
    const lvl = ZEEK_LEVELS.find((l) => l.id === id) || ZEEK_LEVELS[0];
    this.zeekWon.set(false);
    this.zeekMoves.set(0);
    this.zeekScore.set(0);
    this.zeekKeysYellow.set(0);
    this.zeekKeysBlue.set(0);
    this.zeekBombs.set(0);
    this.zeekHistory.set([]);
    this.zeekPlayer.set({
      x: lvl.playerStart.x,
      y: lvl.playerStart.y,
      dir: lvl.playerStart.dir || 'S',
    });

    let mushroomCount = 0;
    const grid: ZeekTileType[][] = [];

    for (let y = 0; y < lvl.height; y++) {
      const row: ZeekTileType[] = [];
      const line = lvl.layout[y] || '';
      for (let x = 0; x < lvl.width; x++) {
        const char = line.charAt(x);
        let tile: ZeekTileType = 'floor';
        switch (char) {
          case '#':
            tile = 'wall';
            break;
          case '=':
            tile = 'cracked_wall';
            break;
          case 'M':
            tile = 'mushroom';
            mushroomCount++;
            break;
          case 'A':
            tile = 'apple';
            break;
          case 'P':
            tile = 'plant';
            break;
          case 'Y':
            tile = 'key_yellow';
            break;
          case 'D':
            tile = 'door_yellow';
            break;
          case 'B':
            tile = 'key_blue';
            break;
          case 'G':
            tile = 'door_blue';
            break;
          case 'T':
            tile = 'bomb';
            break;
          case 'F':
            tile = 'flower';
            break;
          case 'O':
            tile = 'boulder';
            break;
          default:
            tile = 'floor';
            break;
        }
        row.push(tile);
      }
      grid.push(row);
    }

    this.zeekGrid.set(grid);
    this.zeekTotalMushrooms.set(mushroomCount);
    this.zeekMushroomsLeft.set(mushroomCount);

    this.classroomService.reportActivity(
      'Zeek the Geek',
      `Nivel ${id}: ${this.isDe() ? lvl.nameDe : lvl.nameEs}`,
    );
  }

  moveZeek(dx: number, dy: number, dir: 'N' | 'S' | 'E' | 'W'): void {
    if (this.zeekWon()) return;

    const p = this.zeekPlayer();
    const curGrid = this.zeekGrid();
    const lvl = this.currentZeekLevel();

    const nx = p.x + dx;
    const ny = p.y + dy;

    // Check grid bounds
    if (nx < 0 || nx >= lvl.width || ny < 0 || ny >= lvl.height) {
      return;
    }

    const targetTile = curGrid[ny][nx];

    // If wall or cracked wall, Zeek cannot walk through
    if (targetTile === 'wall' || targetTile === 'cracked_wall') {
      this.zeekPlayer.set({ ...p, dir });
      this.playTone(180, 0.05, 'sawtooth');
      return;
    }

    // CARNIVOROUS PLANT INTERACTION
    if (targetTile === 'plant') {
      this.zeekPlayer.set({ ...p, dir });
      this.playTone(220, 0.2, 'sawtooth');
      this.showNotification(
        this.isDe()
          ? this.t().logicGames.zeekPlantWarning
          : this.t().logicGames.zeekPlantWarning,
      );
      return;
    }

    // LOCKED DOORS
    if (targetTile === 'door_yellow') {
      if (this.zeekKeysYellow() > 0) {
        // Unlock door!
        this.saveZeekHistory();
        const nextGrid = curGrid.map((r) => [...r]);
        nextGrid[ny][nx] = 'floor';
        this.zeekGrid.set(nextGrid);
        this.zeekKeysYellow.update((k) => k - 1);
        this.zeekPlayer.set({ x: nx, y: ny, dir });
        this.zeekMoves.update((m) => m + 1);
        this.playChime();
        return;
      } else {
        this.zeekPlayer.set({ ...p, dir });
        this.playTone(200, 0.1, 'sawtooth');
        this.showNotification(
          this.isDe()
            ? 'Du brauchst einen gelben Schlüssel!'
            : '¡Necesitas la llave dorada para abrir esta puerta!',
        );
        return;
      }
    }

    if (targetTile === 'door_blue') {
      if (this.zeekKeysBlue() > 0) {
        this.saveZeekHistory();
        const nextGrid = curGrid.map((r) => [...r]);
        nextGrid[ny][nx] = 'floor';
        this.zeekGrid.set(nextGrid);
        this.zeekKeysBlue.update((k) => k - 1);
        this.zeekPlayer.set({ x: nx, y: ny, dir });
        this.zeekMoves.update((m) => m + 1);
        this.playChime();
        return;
      } else {
        this.zeekPlayer.set({ ...p, dir });
        this.playTone(200, 0.1, 'sawtooth');
        this.showNotification(
          this.isDe()
            ? 'Du brauchst einen blauen Schlüssel!'
            : '¡Necesitas la llave azul para abrir esta puerta!',
        );
        return;
      }
    }

    // PUSHING AN APPLE OR BOULDER OR BOMB
    if (targetTile === 'apple' || targetTile === 'boulder' || targetTile === 'bomb') {
      const pushNx = nx + dx;
      const pushNy = ny + dy;

      if (pushNx < 0 || pushNx >= lvl.width || pushNy < 0 || pushNy >= lvl.height) {
        this.zeekPlayer.set({ ...p, dir });
        return;
      }

      const behindTile = curGrid[pushNy][pushNx];

      // APPLE PUSHED INTO A CARNIVOROUS PLANT (Signature Zeek mechanic!)
      if (targetTile === 'apple' && behindTile === 'plant') {
        this.saveZeekHistory();
        const nextGrid = curGrid.map((r) => [...r]);
        // The plant eats the apple and falls asleep peacefully
        nextGrid[pushNy][pushNx] = 'plant_sleeping';
        nextGrid[ny][nx] = 'floor';
        this.zeekGrid.set(nextGrid);
        this.zeekPlayer.set({ x: nx, y: ny, dir });
        this.zeekMoves.update((m) => m + 1);
        this.zeekScore.update((s) => s + 250);
        this.playMunch();
        this.showNotification(
          this.isDe()
            ? this.t().logicGames.zeekPlantAteApple
            : this.t().logicGames.zeekPlantAteApple,
        );
        return;
      }

      // Can only push into empty floor or sleeping plant
      if (behindTile !== 'floor' && behindTile !== 'plant_sleeping') {
        this.zeekPlayer.set({ ...p, dir });
        this.playTone(180, 0.05, 'sawtooth');
        return;
      }

      // Valid push
      this.saveZeekHistory();
      const nextGrid = curGrid.map((r) => [...r]);
      nextGrid[pushNy][pushNx] = targetTile;
      nextGrid[ny][nx] = 'floor';
      this.zeekGrid.set(nextGrid);
      this.zeekPlayer.set({ x: nx, y: ny, dir });
      this.zeekMoves.update((m) => m + 1);
      this.playTone(280, 0.06, 'triangle');
      return;
    }

    // STEPPING ONTO COLLECTIBLES OR REGULAR FLOOR
    this.saveZeekHistory();
    const nextGrid = curGrid.map((r) => [...r]);

    if (targetTile === 'mushroom') {
      nextGrid[ny][nx] = 'floor';
      this.zeekMushroomsLeft.update((count) => Math.max(0, count - 1));
      this.zeekScore.update((s) => s + 100);
      this.playTone(660, 0.08, 'sine');
    } else if (targetTile === 'key_yellow') {
      nextGrid[ny][nx] = 'floor';
      this.zeekKeysYellow.update((k) => k + 1);
      this.playChime();
    } else if (targetTile === 'key_blue') {
      nextGrid[ny][nx] = 'floor';
      this.zeekKeysBlue.update((k) => k + 1);
      this.playChime();
    } else if (targetTile === 'flower') {
      // Exit flower: check if mushrooms all collected!
      if (this.zeekMushroomsLeft() === 0) {
        this.zeekWon.set(true);
        this.playWinFanfare();
        this.zeekScore.update((s) => s + 500);
      } else {
        this.showNotification(
          this.isDe()
            ? `Es fehlen noch ${this.zeekMushroomsLeft()} Pilze!`
            : `¡Aún te faltan ${this.zeekMushroomsLeft()} champiñones por comer!`,
        );
      }
    } else {
      this.playTone(420, 0.04, 'sine');
    }

    this.zeekGrid.set(nextGrid);
    this.zeekPlayer.set({ x: nx, y: ny, dir });
    this.zeekMoves.update((m) => m + 1);

    // If level has no exit flower, winning condition is eating all mushrooms
    const hasFlowerInLevel = curGrid.some((r) => r.includes('flower'));
    if (!hasFlowerInLevel && this.zeekMushroomsLeft() === 0 && !this.zeekWon()) {
      this.zeekWon.set(true);
      this.playWinFanfare();
    }
  }

  detonateZeekBomb(): void {
    if (this.zeekWon()) return;

    // Look for adjacent bomb or any bomb in player's inventory
    const p = this.zeekPlayer();
    const grid = this.zeekGrid();
    const lvl = this.currentZeekLevel();

    let bombFound = false;
    let bx = -1;
    let by = -1;

    // Check adjacent tiles
    const deltas = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const d of deltas) {
      const tx = p.x + d.dx;
      const ty = p.y + d.dy;
      if (tx >= 0 && tx < lvl.width && ty >= 0 && ty < lvl.height) {
        if (grid[ty][tx] === 'bomb') {
          bombFound = true;
          bx = tx;
          by = ty;
          break;
        }
      }
    }

    if (!bombFound) {
      this.showNotification(
        this.isDe()
          ? 'Kein TNT in direkter Reichweite zum Zünden!'
          : '¡No hay dinamita adyacente para detonar!',
      );
      return;
    }

    this.saveZeekHistory();
    const nextGrid = grid.map((r) => [...r]);

    // Clear 3x3 area around the bomb
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = bx + dx;
        const ty = by + dy;
        if (tx >= 0 && tx < lvl.width && ty >= 0 && ty < lvl.height) {
          const t = nextGrid[ty][tx];
          if (t === 'bomb' || t === 'cracked_wall') {
            nextGrid[ty][tx] = 'floor';
          }
        }
      }
    }

    this.zeekGrid.set(nextGrid);
    this.playExplosion();
    this.showNotification(
      this.isDe() ? 'BOOM! Felswand weggesprengt!' : '¡BOOM! ¡Roca agrietada detonada!',
    );
  }

  private saveZeekHistory(): void {
    const curGrid = this.zeekGrid();
    this.zeekHistory.update((h) => [
      ...h,
      {
        grid: curGrid.map((r) => [...r]),
        player: { ...this.zeekPlayer() },
        mushroomsLeft: this.zeekMushroomsLeft(),
        keysYellow: this.zeekKeysYellow(),
        keysBlue: this.zeekKeysBlue(),
        bombs: this.zeekBombs(),
        score: this.zeekScore(),
      },
    ]);
  }

  undoZeek(): void {
    const h = this.zeekHistory();
    if (h.length === 0 || this.zeekWon()) return;

    const prev = h[h.length - 1];
    this.zeekHistory.set(h.slice(0, -1));
    this.zeekGrid.set(prev.grid);
    this.zeekPlayer.set(prev.player);
    this.zeekMushroomsLeft.set(prev.mushroomsLeft);
    this.zeekKeysYellow.set(prev.keysYellow);
    this.zeekKeysBlue.set(prev.keysBlue);
    this.zeekBombs.set(prev.bombs);
    this.zeekScore.set(prev.score);
    this.zeekMoves.update((m) => Math.max(0, m - 1));
    this.playTone(340, 0.05, 'sine');
  }

  // ==========================================================================
  // CABLE CIRCUIT LOGIC
  // ==========================================================================
  private initCableLevel(id: number): void {
    const lvl = CABLE_LEVELS.find((l) => l.id === id) || CABLE_LEVELS[0];
    this.cablesWon.set(false);
    this.isTestingSignal.set(false);

    const tiles: CableTile[] = lvl.initialTiles.map((t) => ({
      ...t,
      isPowered: t.shape === 'start',
    }));

    this.cableTiles.set(tiles);
    this.evaluateCablePower();
  }

  rotateTile(tile: CableTile): void {
    if (tile.shape === 'start' || tile.shape === 'goal' || this.cablesWon()) return;

    this.playTone(400, 0.05);
    this.cableTiles.update((tiles) =>
      tiles.map((t) => {
        if (t.x === tile.x && t.y === tile.y) {
          return { ...t, rotation: (t.rotation + 90) % 360 };
        }
        return t;
      }),
    );

    this.evaluateCablePower();
  }

  private evaluateCablePower(): void {
    const tiles = this.cableTiles();
    const lvl = this.currentCableLevel();

    const tileMap = new Map<string, CableTile>();
    for (const t of tiles) {
      tileMap.set(`${t.x}-${t.y}`, { ...t, isPowered: false });
    }

    const startKey = `${lvl.start.x}-${lvl.start.y}`;
    const startTile = tileMap.get(startKey);
    if (!startTile) return;

    startTile.isPowered = true;
    const queue: CableTile[] = [startTile];
    const visited = new Set<string>([startKey]);

    const getConnections = (t: CableTile): number[] => {
      const rot = Math.round(t.rotation / 90) % 4; // 0, 1, 2, 3
      if (t.shape === 'line') {
        return [(3 + rot) % 4, (1 + rot) % 4];
      }
      if (t.shape === 'corner') {
        return [(0 + rot) % 4, (1 + rot) % 4];
      }
      if (t.shape === 't') {
        return [(3 + rot) % 4, (1 + rot) % 4, (2 + rot) % 4];
      }
      if (t.shape === 'cross') {
        return [0, 1, 2, 3];
      }
      if (t.shape === 'start') {
        return [lvl.start.dir];
      }
      if (t.shape === 'goal') {
        return [lvl.goal.dir];
      }
      return [];
    };

    let reachedGoal = false;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curConns = getConnections(cur);

      for (const dir of curConns) {
        let nx = cur.x;
        let ny = cur.y;
        const oppositeDir = (dir + 2) % 4;

        if (dir === 0) ny--;
        if (dir === 1) nx++;
        if (dir === 2) ny++;
        if (dir === 3) nx--;

        const neighborKey = `${nx}-${ny}`;
        const neighbor = tileMap.get(neighborKey);

        if (neighbor && !visited.has(neighborKey)) {
          const neighborConns = getConnections(neighbor);
          if (neighborConns.includes(oppositeDir)) {
            neighbor.isPowered = true;
            visited.add(neighborKey);
            queue.push(neighbor);

            if (neighbor.shape === 'goal') {
              reachedGoal = true;
            }
          }
        }
      }
    }

    this.cableTiles.set(Array.from(tileMap.values()));

    if (reachedGoal && !this.cablesWon()) {
      this.cablesWon.set(true);
      this.playWinFanfare();
    }
  }

  triggerSignalPulse(): void {
    this.isTestingSignal.set(true);
    this.playTone(520, 0.15, 'sine');
    setTimeout(() => {
      this.playTone(780, 0.2, 'triangle');
      this.isTestingSignal.set(false);
    }, 800);
  }

  // ==========================================================================
  // SOKOBAN / BOXES LOGIC
  // ==========================================================================
  private initBoxLevel(id: number): void {
    const lvl = BOX_LEVELS.find((l) => l.id === id) || BOX_LEVELS[0];
    this.boxesWon.set(false);
    this.boxMoves.set(0);
    this.boxHistory.set([]);
    this.boxPlayer.set({ ...lvl.playerStart });
    this.boxPositions.set(lvl.boxes.map((b) => ({ ...b })));
  }

  moveBoxPlayer(dx: number, dy: number): void {
    if (this.boxesWon()) return;

    const p = this.boxPlayer();
    const nx = p.x + dx;
    const ny = p.y + dy;
    const lvl = this.currentBoxLevel();

    // Check wall
    if (lvl.walls.some((w) => w.x === nx && w.y === ny)) {
      return;
    }

    const boxes = this.boxPositions();
    const boxIndex = boxes.findIndex((b) => b.x === nx && b.y === ny);

    if (boxIndex !== -1) {
      // Pushing a box
      const boxNx = nx + dx;
      const boxNy = ny + dy;

      if (
        lvl.walls.some((w) => w.x === boxNx && w.y === boxNy) ||
        boxes.some((b) => b.x === boxNx && b.y === boxNy)
      ) {
        return;
      }

      this.boxHistory.update((h) => [
        ...h,
        { player: { ...p }, boxes: boxes.map((b) => ({ ...b })) },
      ]);

      const nextBoxes = [...boxes];
      nextBoxes[boxIndex] = { x: boxNx, y: boxNy };
      this.boxPositions.set(nextBoxes);
      this.boxPlayer.set({ x: nx, y: ny });
      this.boxMoves.update((m) => m + 1);
      this.playTone(320, 0.08);

      const allOnGoals = nextBoxes.every((b) =>
        lvl.goals.some((g) => g.x === b.x && g.y === b.y),
      );
      if (allOnGoals) {
        this.boxesWon.set(true);
        this.playWinFanfare();
      }
    } else {
      this.boxHistory.update((h) => [
        ...h,
        { player: { ...p }, boxes: boxes.map((b) => ({ ...b })) },
      ]);
      this.boxPlayer.set({ x: nx, y: ny });
      this.boxMoves.update((m) => m + 1);
      this.playTone(480, 0.04);
    }
  }

  undoBoxMove(): void {
    const history = this.boxHistory();
    if (history.length === 0 || this.boxesWon()) return;

    const prev = history[history.length - 1];
    this.boxHistory.set(history.slice(0, -1));
    this.boxPlayer.set(prev.player);
    this.boxPositions.set(prev.boxes);
    this.boxMoves.update((m) => Math.max(0, m - 1));
  }

  // ==========================================================================
  // RETRO AUDIO SYNTHESIS ENGINE
  // ==========================================================================
  private playTone(freq: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.soundEnabled()) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // AudioContext policy
    }
  }

  private playChime(): void {
    if (!this.soundEnabled()) return;
    [659, 880, 1174].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'triangle'), i * 80);
    });
  }

  private playMunch(): void {
    if (!this.soundEnabled()) return;
    [320, 260, 440].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.1, 'sawtooth'), i * 70);
    });
  }

  private playExplosion(): void {
    if (!this.soundEnabled()) return;
    this.playTone(120, 0.4, 'sawtooth');
    setTimeout(() => this.playTone(80, 0.3, 'square'), 100);
  }

  private playWinFanfare(): void {
    if (!this.soundEnabled()) return;
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.22, 'triangle'), idx * 110);
    });
  }
}
