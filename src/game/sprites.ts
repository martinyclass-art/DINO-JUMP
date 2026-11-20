// Crisp pixel-matrix sprite definitions rendered cleanly at integer scale on Canvas.
// '.' = transparent, '#' = primary ink, 'E' = background cutout (eye / highlight), 'A' = accent detail

type PixelGrid = readonly string[];

const DINO_HEAD_STAND: PixelGrid = [
  '...........########.',
  '..........##########',
  '..........##E#######',
  '..........##########',
  '..........##########',
  '..........##########',
  '..........#####.....',
  '..........########..',
  '.........######.....',
  '#.......#######.....',
  '#......########.....',
  '##....###########...',
  '###..##########.#...',
  '##############......',
  '##############......',
  '.############.......',
  '..##########........',
  '...########.........',
];

const DINO_LEGS_IDLE: PixelGrid = [
  '....###..###........',
  '....##....##........',
  '....##....##........',
  '....###...###.......',
];

const DINO_LEGS_RUN_A: PixelGrid = [
  '....###..###........',
  '....##....###.......',
  '....##..............',
  '....###.............',
];

const DINO_LEGS_RUN_B: PixelGrid = [
  '....###..###........',
  '.....###..##........',
  '..........##........',
  '..........###.......',
];

const DINO_CRASH_HEAD: PixelGrid = [
  '...........########.',
  '..........##########',
  '..........#EEE######',
  '..........#E#E######',
  '..........#EEE######',
  '..........##########',
  '..........#####.....',
  '..........########..',
  '.........######.....',
  '#.......#######.....',
  '#......########.....',
  '##....###########...',
  '###..##########.#...',
  '##############......',
  '##############......',
  '.############.......',
  '..##########........',
  '...########.........',
];

const DINO_DUCK_A: PixelGrid = [
  '................########.',
  '...............##########',
  '...............##E#######',
  '...............##########',
  '#.............###########',
  '##....###################',
  '####.#################...',
  '####################.....',
  '.#################.......',
  '..#######..###...........',
  '...##.......##...........',
  '...###......###..........',
];

const DINO_DUCK_B: PixelGrid = [
  '................########.',
  '...............##########',
  '...............##E#######',
  '...............##########',
  '#.............###########',
  '##....###################',
  '####.#################...',
  '####################.....',
  '.#################.......',
  '..#######..###...........',
  '....###.....##...........',
  '............###..........',
];

const PTERO_UP: PixelGrid = [
  '......##.............',
  '.....####............',
  '....######...........',
  '...#######...........',
  '.####.######.........',
  '#############........',
  '...###############...',
  '.....################',
  '.......############..',
  '.........#######.....',
];

const PTERO_DOWN: PixelGrid = [
  '.....................',
  '.####................',
  '######...............',
  '..###############....',
  '....################.',
  '......#############..',
  '.......#####.........',
  '.......####..........',
  '........###..........',
  '.........#...........',
];

const CACTUS_SMALL: PixelGrid = [
  '...##...',
  '..####..',
  '..####..',
  '#.####..',
  '#.####.#',
  '#.####.#',
  '######.#',
  '.#####.#',
  '..######',
  '..####..',
  '..####..',
  '..####..',
  '..####..',
  '..####..',
];

const CACTUS_LARGE: PixelGrid = [
  '....####....',
  '...######...',
  '...######...',
  '#..######...',
  '#..######..#',
  '##.######.##',
  '##.######.##',
  '#########.##',
  '.########.##',
  '..##########',
  '...######...',
  '...######...',
  '...######...',
  '...######...',
  '...######...',
  '...######...',
  '...######...',
  '...######...',
];

const CLOUD_GRID: PixelGrid = [
  '.......######..........',
  '.....##########........',
  '...##############......',
  '.###################...',
  '######################.',
];

function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  x: number,
  y: number,
  pixelSize: number,
  inkColor: string,
  cutoutColor: string
) {
  for (let row = 0; row < grid.length; row++) {
    const line = grid[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.') continue;
      ctx.fillStyle = ch === 'E' ? cutoutColor : inkColor;
      ctx.fillRect(
        Math.round(x + col * pixelSize),
        Math.round(y + row * pixelSize),
        pixelSize,
        pixelSize
      );
    }
  }
}

export function drawDinoSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pose: 'IDLE' | 'RUN_A' | 'RUN_B' | 'JUMP' | 'DUCK_A' | 'DUCK_B' | 'CRASH',
  inkColor: string,
  bgColor: string
) {
  const pixel = 2.2;
  if (pose === 'DUCK_A') {
    drawGrid(ctx, DINO_DUCK_A, x, y + 2, 2.3, inkColor, bgColor);
    return;
  }
  if (pose === 'DUCK_B') {
    drawGrid(ctx, DINO_DUCK_B, x, y + 2, 2.3, inkColor, bgColor);
    return;
  }

  const head = pose === 'CRASH' ? DINO_CRASH_HEAD : DINO_HEAD_STAND;
  const legs =
    pose === 'RUN_A'
      ? DINO_LEGS_RUN_A
      : pose === 'RUN_B'
        ? DINO_LEGS_RUN_B
        : DINO_LEGS_IDLE;

  drawGrid(ctx, head, x, y, pixel, inkColor, bgColor);
  drawGrid(ctx, legs, x, y + head.length * pixel, pixel, inkColor, bgColor);
}

export function drawCactusSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: 'CACTUS_SMALL_1' | 'CACTUS_SMALL_2' | 'CACTUS_LARGE_1' | 'CACTUS_CLUSTER',
  inkColor: string,
  bgColor: string
) {
  if (kind === 'CACTUS_SMALL_1') {
    drawGrid(ctx, CACTUS_SMALL, x, y, 2.5, inkColor, bgColor);
  } else if (kind === 'CACTUS_SMALL_2') {
    drawGrid(ctx, CACTUS_SMALL, x, y, 2.5, inkColor, bgColor);
    drawGrid(ctx, CACTUS_SMALL, x + 22, y + 4, 2.2, inkColor, bgColor);
  } else if (kind === 'CACTUS_LARGE_1') {
    drawGrid(ctx, CACTUS_LARGE, x, y, 2.6, inkColor, bgColor);
  } else {
    drawGrid(ctx, CACTUS_SMALL, x, y + 10, 2.4, inkColor, bgColor);
    drawGrid(ctx, CACTUS_LARGE, x + 18, y, 2.6, inkColor, bgColor);
    drawGrid(ctx, CACTUS_SMALL, x + 50, y + 8, 2.3, inkColor, bgColor);
  }
}

export function drawPterodactylSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wingFrame: 0 | 1,
  inkColor: string,
  bgColor: string
) {
  const grid = wingFrame === 0 ? PTERO_UP : PTERO_DOWN;
  drawGrid(ctx, grid, x, y, 2.2, inkColor, bgColor);
}

export function drawCloudSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string
) {
  drawGrid(ctx, CLOUD_GRID, x, y, 2 * scale, color, color);
}
