import React, { useCallback, useEffect, useRef } from 'react';
import { soundEngine } from '../audio/soundEffects';
import {
  drawCactusSprite,
  drawCloudSprite,
  drawDinoSprite,
  drawPterodactylSprite,
} from '../game/sprites';
import {
  Cloud,
  DINO_DUCK_HEIGHT,
  DINO_DUCK_WIDTH,
  DINO_STAND_HEIGHT,
  DINO_STAND_WIDTH,
  DINO_X,
  DustParticle,
  FAST_FALL_GRAVITY_MULTIPLIER,
  GROUND_Y,
  GameState,
  GroundBump,
  INITIAL_SPEED,
  JUMP_VELOCITY,
  MAX_SPEED,
  NIGHT_CYCLE_SCORE,
  Obstacle,
  ObstacleKind,
  SPEED_ACCELERATION,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  Star,
  GRAVITY,
} from '../game/types';

interface DinoGameCanvasProps {
  gameState: GameState;
  score: number;
  highScore: number;
  isNewRecord: boolean;
  onStartGame: () => void;
  onPauseToggle: () => void;
  onScoreChange: (score: number, speedMultiplier: number) => void;
  onGameOver: (finalScore: number) => void;
  jumpSignal: number;
  duckActive: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(
  day: [number, number, number],
  night: [number, number, number],
  t: number
): string {
  const r = Math.round(lerp(day[0], night[0], t));
  const g = Math.round(lerp(day[1], night[1], t));
  const b = Math.round(lerp(day[2], night[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

export const DinoGameCanvas: React.FC<DinoGameCanvasProps> = ({
  gameState,
  score,
  highScore,
  isNewRecord,
  onStartGame,
  onPauseToggle,
  onScoreChange,
  onGameOver,
  jumpSignal,
  duckActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const duckButtonRef = useRef<boolean>(duckActive);
  duckButtonRef.current = duckActive;

  // Mutable simulation state kept in ref for 60fps requestAnimationFrame loop
  const simRef = useRef({
    dinoY: GROUND_Y - DINO_STAND_HEIGHT,
    dinoVy: 0,
    isGrounded: true,
    isDuckingKey: false,
    isJumpHeld: false,
    runAnimTimer: 0,
    runFrame: 0 as 0 | 1,

    speed: INITIAL_SPEED,
    distance: 0,
    score: 0,
    lastMilestone: 0,
    milestoneFlashTimer: 0,
    nightBlend: 0,

    spawnTimer: 0.75,
    nextObstacleId: 1,
    obstacles: [] as Obstacle[],
    clouds: [] as Cloud[],
    bumps: [] as GroundBump[],
    particles: [] as DustParticle[],
    stars: [] as Star[],

    gameOverAt: 0,
    lastReportedScore: -1,
    lastReportedSpeed: -1,
  });

  const initEnvironment = useCallback(() => {
    const clouds: Cloud[] = [
      { x: 140, y: 58, speedFactor: 0.16, scale: 1 },
      { x: 430, y: 38, speedFactor: 0.12, scale: 0.85 },
      { x: 740, y: 74, speedFactor: 0.19, scale: 1.05 },
    ];

    const bumps: GroundBump[] = [];
    for (let i = 0; i < 36; i++) {
      bumps.push({
        x: i * 28 + Math.random() * 14,
        width: 2 + Math.floor(Math.random() * 6),
        height: 2,
        yOffset: 6 + Math.floor(Math.random() * 12),
      });
    }

    const stars: Star[] = [];
    for (let i = 0; i < 24; i++) {
      stars.push({
        x: Math.random() * STAGE_WIDTH,
        y: 22 + Math.random() * 120,
        size: i % 4 === 0 ? 3 : 2,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    simRef.current.clouds = clouds;
    simRef.current.bumps = bumps;
    simRef.current.stars = stars;
  }, []);

  const resetSimulation = useCallback(() => {
    const sim = simRef.current;
    sim.dinoY = GROUND_Y - DINO_STAND_HEIGHT;
    sim.dinoVy = 0;
    sim.isGrounded = true;
    sim.runAnimTimer = 0;
    sim.runFrame = 0;
    sim.speed = INITIAL_SPEED;
    sim.distance = 0;
    sim.score = 0;
    sim.lastMilestone = 0;
    sim.milestoneFlashTimer = 0;
    sim.nightBlend = 0;
    sim.spawnTimer = 0.65;
    sim.obstacles = [];
    sim.particles = [];
    sim.lastReportedScore = 0;
    sim.lastReportedSpeed = 1;
    onScoreChange(0, 1);
  }, [onScoreChange]);

  const spawnDust = useCallback((x: number, y: number, count: number) => {
    const sim = simRef.current;
    for (let i = 0; i < count; i++) {
      sim.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y - Math.random() * 4,
        vx: -40 - Math.random() * 90,
        vy: -20 - Math.random() * 65,
        size: 2 + Math.floor(Math.random() * 3),
        alpha: 0.8,
      });
    }
  }, []);

  const triggerJump = useCallback(() => {
    const sim = simRef.current;
    const state = gameStateRef.current;

    if (state === 'TITLE_MENU') {
      resetSimulation();
      onStartGame();
      sim.dinoVy = JUMP_VELOCITY;
      sim.isGrounded = false;
      sim.isJumpHeld = true;
      spawnDust(DINO_X + 16, GROUND_Y, 6);
      soundEngine.playJump();
      return;
    }

    if (state === 'GAME_OVER') {
      if (performance.now() - sim.gameOverAt > 240) {
        resetSimulation();
        onStartGame();
        soundEngine.playJump();
      }
      return;
    }

    if (state !== 'PLAYING') return;

    if (sim.isGrounded) {
      sim.dinoVy = JUMP_VELOCITY;
      sim.isGrounded = false;
      sim.isJumpHeld = true;
      spawnDust(DINO_X + 16, GROUND_Y, 6);
      soundEngine.playJump();
    }
  }, [onStartGame, resetSimulation, spawnDust]);

  // Reset simulation whenever transitioning back into PLAYING from TITLE_MENU or GAME_OVER via button click
  const prevGameStateRef = useRef<GameState>(gameState);
  useEffect(() => {
    const prev = prevGameStateRef.current;
    if (
      gameState === 'PLAYING' &&
      (prev === 'TITLE_MENU' || prev === 'GAME_OVER')
    ) {
      if (simRef.current.score > 0 || simRef.current.obstacles.length > 0) {
        resetSimulation();
      }
    }
    prevGameStateRef.current = gameState;
  }, [gameState, resetSimulation]);

  // External touch jump button signal
  const lastJumpSignalRef = useRef<number>(jumpSignal);
  useEffect(() => {
    if (jumpSignal !== lastJumpSignalRef.current) {
      lastJumpSignalRef.current = jumpSignal;
      triggerJump();
    }
  }, [jumpSignal, triggerJump]);

  // Initialize decorative environment once
  useEffect(() => {
    initEnvironment();
  }, [initEnvironment]);

  // Keyboard bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (!e.repeat) {
          triggerJump();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        simRef.current.isDuckingKey = true;
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (
          gameStateRef.current === 'PLAYING' ||
          gameStateRef.current === 'PAUSED'
        ) {
          e.preventDefault();
          onPauseToggle();
        }
      } else if (e.code === 'Enter') {
        if (
          gameStateRef.current === 'TITLE_MENU' ||
          gameStateRef.current === 'GAME_OVER'
        ) {
          e.preventDefault();
          triggerJump();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        simRef.current.isJumpHeld = false;
        // Variable jump height: release early for snappy short hop
        if (simRef.current.dinoVy < -240) {
          simRef.current.dinoVy *= 0.56;
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        simRef.current.isDuckingKey = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPauseToggle, triggerJump]);

  // Main animation & physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const spawnObstacle = () => {
      const sim = simRef.current;
      const canSpawnPtero = sim.score >= 220;
      const roll = Math.random();

      let kind: ObstacleKind = 'CACTUS_SMALL_1';
      let width = 20;
      let height = 35;
      let y = GROUND_Y - height;

      if (canSpawnPtero && roll < 0.22) {
        kind = 'PTERODACTYL';
        width = 46;
        height = 22;
        const altitudes = [GROUND_Y - 26, GROUND_Y - 54, GROUND_Y - 82];
        y = altitudes[Math.floor(Math.random() * altitudes.length)];
      } else if (roll < 0.44) {
        kind = 'CACTUS_SMALL_1';
        width = 20;
        height = 35;
        y = GROUND_Y - height;
      } else if (roll < 0.64) {
        kind = 'CACTUS_SMALL_2';
        width = 40;
        height = 35;
        y = GROUND_Y - height;
      } else if (roll < 0.84) {
        kind = 'CACTUS_LARGE_1';
        width = 30;
        height = 47;
        y = GROUND_Y - height;
      } else {
        kind = 'CACTUS_CLUSTER';
        width = 68;
        height = 47;
        y = GROUND_Y - height;
      }

      sim.obstacles.push({
        id: sim.nextObstacleId++,
        kind,
        x: STAGE_WIDTH + 30,
        y,
        width,
        height,
        wingTimer: 0,
        wingFrame: 0,
      });

      const minGapTime = Math.max(0.56, 420 / sim.speed);
      const maxGapTime = Math.max(1.08, 860 / sim.speed);
      sim.spawnTimer =
        minGapTime + Math.random() * (maxGapTime - minGapTime);
    };

    const updateSimulation = (dt: number) => {
      const sim = simRef.current;
      const state = gameStateRef.current;

      // Ambient cloud drift on Title Menu
      if (state === 'TITLE_MENU') {
        for (const c of sim.clouds) {
          c.x -= 24 * c.speedFactor * 2 * dt;
          if (c.x < -70) c.x = STAGE_WIDTH + 30;
        }
        return;
      }

      if (state !== 'PLAYING') return;

      const isDucking = sim.isDuckingKey || duckButtonRef.current;

      // Speed progression
      sim.speed = Math.min(MAX_SPEED, sim.speed + SPEED_ACCELERATION * dt);
      sim.distance += sim.speed * dt;
      sim.score = Math.floor(sim.distance * 0.025);

      const speedMult = Number((sim.speed / INITIAL_SPEED).toFixed(1));
      if (
        sim.score !== sim.lastReportedScore ||
        speedMult !== sim.lastReportedSpeed
      ) {
        sim.lastReportedScore = sim.score;
        sim.lastReportedSpeed = speedMult;
        onScoreChange(sim.score, speedMult);
      }

      // Milestone 100pt chime & flash
      const currentMilestone = Math.floor(sim.score / 100);
      if (currentMilestone > sim.lastMilestone && sim.score >= 100) {
        sim.lastMilestone = currentMilestone;
        sim.milestoneFlashTimer = 0.55;
        soundEngine.playMilestone();
      }
      if (sim.milestoneFlashTimer > 0) {
        sim.milestoneFlashTimer = Math.max(0, sim.milestoneFlashTimer - dt);
      }

      // Day/Night cycle transition every 700 points
      const targetNight = Math.floor(sim.score / NIGHT_CYCLE_SCORE) % 2 === 1 ? 1 : 0;
      sim.nightBlend = lerp(sim.nightBlend, targetNight, Math.min(1, dt * 2.5));

      // Dino physics
      const activeHeight =
        isDucking && sim.isGrounded ? DINO_DUCK_HEIGHT : DINO_STAND_HEIGHT;

      if (!sim.isGrounded) {
        const grav = isDucking
          ? GRAVITY * FAST_FALL_GRAVITY_MULTIPLIER
          : GRAVITY;
        sim.dinoVy += grav * dt;
        sim.dinoY += sim.dinoVy * dt;

        const floorY = GROUND_Y - activeHeight;
        if (sim.dinoY >= floorY) {
          sim.dinoY = floorY;
          sim.dinoVy = 0;
          sim.isGrounded = true;
          spawnDust(DINO_X + 18, GROUND_Y, 5);
        }
      } else {
        sim.dinoY = GROUND_Y - activeHeight;
      }

      // Dino running leg cadence scales with speed
      sim.runAnimTimer += dt * (sim.speed / INITIAL_SPEED);
      if (sim.runAnimTimer >= 0.095) {
        sim.runAnimTimer = 0;
        sim.runFrame = sim.runFrame === 0 ? 1 : 0;
      }

      // Clouds
      for (const c of sim.clouds) {
        c.x -= sim.speed * c.speedFactor * dt;
        if (c.x < -70) {
          c.x = STAGE_WIDTH + 40 + Math.random() * 140;
          c.y = 28 + Math.random() * 82;
        }
      }

      // Ground bumps
      for (const b of sim.bumps) {
        b.x -= sim.speed * dt;
        if (b.x + b.width < 0) {
          b.x = STAGE_WIDTH + Math.random() * 30;
          b.yOffset = 6 + Math.floor(Math.random() * 12);
        }
      }

      // Dust particles
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 180 * dt;
        p.alpha -= dt * 2.1;
        if (p.alpha <= 0) {
          sim.particles.splice(i, 1);
        }
      }

      // Obstacles spawn & movement
      sim.spawnTimer -= dt;
      if (sim.spawnTimer <= 0) {
        spawnObstacle();
      }

      for (let i = sim.obstacles.length - 1; i >= 0; i--) {
        const obs = sim.obstacles[i];
        const obsSpeed =
          obs.kind === 'PTERODACTYL' ? sim.speed * 1.12 : sim.speed;
        obs.x -= obsSpeed * dt;

        if (obs.kind === 'PTERODACTYL') {
          obs.wingTimer += dt;
          if (obs.wingTimer >= 0.16) {
            obs.wingTimer = 0;
            obs.wingFrame = obs.wingFrame === 0 ? 1 : 0;
          }
        }

        if (obs.x + obs.width < -40) {
          sim.obstacles.splice(i, 1);
        }
      }

      // Forgiving hitbox collision check
      const dinoWidth = isDucking ? DINO_DUCK_WIDTH : DINO_STAND_WIDTH;
      const dinoHeight = isDucking ? DINO_DUCK_HEIGHT : DINO_STAND_HEIGHT;
      const dinoBox = {
        left: DINO_X + 8,
        right: DINO_X + dinoWidth - 10,
        top: sim.dinoY + 6,
        bottom: sim.dinoY + dinoHeight - 5,
      };

      for (const obs of sim.obstacles) {
        const obsBox = {
          left: obs.x + 5,
          right: obs.x + obs.width - 5,
          top: obs.y + 5,
          bottom: obs.y + obs.height - 4,
        };

        const hit =
          dinoBox.left < obsBox.right &&
          dinoBox.right > obsBox.left &&
          dinoBox.top < obsBox.bottom &&
          dinoBox.bottom > obsBox.top;

        if (hit) {
          sim.gameOverAt = performance.now();
          soundEngine.playGameOver();
          onGameOver(sim.score);
          break;
        }
      }
    };

    const renderScene = (now: number) => {
      const sim = simRef.current;
      const state = gameStateRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const targetW = STAGE_WIDTH * dpr;
      const targetH = STAGE_HEIGHT * dpr;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const t = sim.nightBlend;
      const bgColor = lerpRgb([250, 248, 243], [22, 25, 34], t);
      const inkColor = lerpRgb([31, 36, 45], [234, 236, 239], t);
      const mutedInk = lerpRgb([148, 142, 130], [92, 102, 122], t);
      const cloudColor = lerpRgb([224, 219, 209], [46, 53, 70], t);

      // Background sky
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

      // Stars & crescent moon when night phase is active
      if (t > 0.05) {
        ctx.save();
        for (const star of sim.stars) {
          const twinkle =
            0.45 + 0.55 * Math.sin(now * 0.003 + star.twinkleOffset);
          ctx.globalAlpha = t * twinkle * 0.85;
          ctx.fillStyle = inkColor;
          ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
        }

        // Crescent moon
        ctx.globalAlpha = t * 0.85;
        ctx.fillStyle = inkColor;
        ctx.beginPath();
        ctx.arc(STAGE_WIDTH - 110, 56, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(STAGE_WIDTH - 103, 52, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Clouds
      for (const c of sim.clouds) {
        drawCloudSprite(ctx, c.x, c.y, c.scale, cloudColor);
      }

      // Horizon ground line
      ctx.fillStyle = mutedInk;
      ctx.fillRect(0, GROUND_Y, STAGE_WIDTH, 2);

      // Ground texture bumps
      for (const b of sim.bumps) {
        ctx.fillRect(Math.round(b.x), GROUND_Y + b.yOffset, b.width, b.height);
      }

      // Dust particles
      for (const p of sim.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = mutedInk;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        ctx.restore();
      }

      // Obstacles
      for (const obs of sim.obstacles) {
        if (obs.kind === 'PTERODACTYL') {
          drawPterodactylSprite(
            ctx,
            obs.x,
            obs.y,
            obs.wingFrame,
            inkColor,
            bgColor
          );
        } else {
          drawCactusSprite(ctx, obs.x, obs.y, obs.kind, inkColor, bgColor);
        }
      }

      // Dino pose selection
      const isDucking = sim.isDuckingKey || duckButtonRef.current;
      let pose:
        | 'IDLE'
        | 'RUN_A'
        | 'RUN_B'
        | 'JUMP'
        | 'DUCK_A'
        | 'DUCK_B'
        | 'CRASH' = 'IDLE';

      if (state === 'GAME_OVER') {
        pose = 'CRASH';
      } else if (state === 'TITLE_MENU') {
        pose = 'IDLE';
      } else if (!sim.isGrounded) {
        pose = 'JUMP';
      } else if (isDucking) {
        pose = sim.runFrame === 0 ? 'DUCK_A' : 'DUCK_B';
      } else {
        pose = sim.runFrame === 0 ? 'RUN_A' : 'RUN_B';
      }

      drawDinoSprite(ctx, DINO_X, sim.dinoY, pose, inkColor, bgColor);

      // Milestone "+100" flash indicator inside top-right of canvas
      if (sim.milestoneFlashTimer > 0 && state === 'PLAYING') {
        const blink = Math.floor(sim.milestoneFlashTimer * 10) % 2 === 0;
        if (blink) {
          ctx.fillStyle = '#D95D39';
          ctx.font = '700 14px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(
            `${sim.lastMilestone * 100}m 돌파`,
            STAGE_WIDTH - 24,
            34
          );
        }
      }

      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      updateSimulation(dt);
      renderScene(now);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onGameOver, onScoreChange, spawnDust]);

  const handleStagePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    triggerJump();
  };

  const handleStagePointerUp = () => {
    simRef.current.isJumpHeld = false;
    if (simRef.current.dinoVy < -240) {
      simRef.current.dinoVy *= 0.56;
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[#DDD7C8] bg-[#FAF8F3] shadow-sm">
      <canvas
        ref={canvasRef}
        onPointerDown={handleStagePointerDown}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        aria-label="공룡 점프 게임 화면"
        className="block w-full aspect-[3/1] cursor-pointer touch-none select-none"
      />

      {gameState === 'TITLE_MENU' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF8F3]/80 backdrop-blur-[2px] px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1F242D]">
            사막을 건너는 공룡
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#595E68]">
            선인장을 뛰어넘고 낮게 나는 익룡을 피해 최고 기록에 도전하세요
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => triggerJump()}
              className="inline-flex items-center justify-center rounded-lg bg-[#D95D39] px-6 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:bg-[#C44D2B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D95D39] whitespace-nowrap shrink-0 cursor-pointer"
            >
              게임 시작
            </button>
          </div>
          <p className="mt-3 text-xs text-[#737882]">
            Space / ↑ 점프 · ↓ 숙이기 · 화면 터치 지원
          </p>
        </div>
      )}

      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1F242D]/35 backdrop-blur-[2px] px-6 text-center">
          <div className="rounded-xl border border-[#DDD7C8] bg-[#FAF8F3] px-8 py-6 shadow-md">
            <h2 className="font-display text-xl font-bold text-[#1F242D]">
              일시정지
            </h2>
            <p className="mt-1 text-sm text-[#595E68]">
              현재 점수 {score.toLocaleString()}점
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onPauseToggle}
                className="rounded-lg bg-[#D95D39] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C44D2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D95D39] whitespace-nowrap shrink-0 cursor-pointer"
              >
                계속하기
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSimulation();
                  onStartGame();
                }}
                className="rounded-lg border border-[#D4CEC0] bg-white px-4 py-2 text-sm font-medium text-[#1F242D] transition-colors hover:bg-[#F2EFE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F242D] whitespace-nowrap shrink-0 cursor-pointer"
              >
                처음부터
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1F242D]/30 backdrop-blur-[2px] px-6 text-center">
          <div className="rounded-xl border border-[#DDD7C8] bg-[#FAF8F3] px-8 py-6 shadow-md">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1F242D]">
              게임 오버
            </h2>
            <div className="mt-2 flex items-center justify-center gap-3 text-sm text-[#595E68] font-mono-tabular">
              <span>점수 {String(score).padStart(5, '0')}</span>
              <span aria-hidden="true">·</span>
              <span>최고 {String(highScore).padStart(5, '0')}</span>
            </div>
            {isNewRecord && score > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-[#D95D39]">
                새로운 최고 기록 달성
              </p>
            )}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  resetSimulation();
                  onStartGame();
                  soundEngine.playJump();
                }}
                className="inline-flex items-center justify-center rounded-lg bg-[#D95D39] px-6 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:bg-[#C44D2B] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D95D39] whitespace-nowrap shrink-0 cursor-pointer"
              >
                다시 하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
