export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type ObstacleKind =
  | 'CACTUS_SMALL_1'
  | 'CACTUS_SMALL_2'
  | 'CACTUS_LARGE_1'
  | 'CACTUS_CLUSTER'
  | 'PTERODACTYL';

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  width: number;
  height: number;
  wingTimer: number;
  wingFrame: 0 | 1;
}

export interface Cloud {
  x: number;
  y: number;
  speedFactor: number;
  scale: number;
}

export interface GroundBump {
  x: number;
  width: number;
  height: number;
  yOffset: number;
}

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  twinkleOffset: number;
}

export const STAGE_WIDTH = 900;
export const STAGE_HEIGHT = 300;
export const GROUND_Y = 248;

export const DINO_X = 68;
export const DINO_STAND_WIDTH = 44;
export const DINO_STAND_HEIGHT = 48;
export const DINO_DUCK_WIDTH = 58;
export const DINO_DUCK_HEIGHT = 30;

export const GRAVITY = 2150; // px / s^2
export const JUMP_VELOCITY = -720; // px / s
export const FAST_FALL_GRAVITY_MULTIPLIER = 2.6;
export const INITIAL_SPEED = 390; // px / s
export const MAX_SPEED = 880; // px / s
export const SPEED_ACCELERATION = 9.5; // px / s^2
export const NIGHT_CYCLE_SCORE = 700;
export const HIGH_SCORE_STORAGE_KEY = 'dino_runner_high_score_v1';
