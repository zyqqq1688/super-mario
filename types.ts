export enum EntityType {
  PLAYER = 'PLAYER',
  PLATFORM = 'PLATFORM',
  ENEMY = 'ENEMY',
  COIN = 'COIN',
  FLAG = 'FLAG',
  DECORATION = 'DECORATION'
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  size: Size;
  color?: string;
  // Specific properties
  isDead?: boolean;
  patrolRange?: { min: number, max: number }; // For enemies
  direction?: 1 | -1; // 1 = right, -1 = left
  vel?: Velocity;
}

export interface Player extends Entity {
  vel: Velocity;
  isGrounded: boolean;
  isJumping: boolean;
  facing: 1 | -1;
  score: number;
  coins: number;
}

export interface GameState {
  status: 'MENU' | 'PLAYING' | 'GAME_OVER' | 'VICTORY';
  levelName: string;
  levelDescription: string;
  cameraOffset: number;
}

export interface AIGeneratedLevelInfo {
  name: string;
  description: string;
  colorTheme: string;
}