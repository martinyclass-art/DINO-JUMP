import { useCallback, useEffect, useState } from 'react';
import { Volume2, VolumeX, Pause, Play, ArrowUp, ArrowDown } from 'lucide-react';
import { DinoGameCanvas } from './components/DinoGameCanvas';
import { soundEngine } from './audio/soundEffects';
import { GameState, HIGH_SCORE_STORAGE_KEY } from './game/types';

function readStoredHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [score, setScore] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [highScore, setHighScore] = useState<number>(() => readStoredHighScore());
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [jumpSignal, setJumpSignal] = useState(0);
  const [duckActive, setDuckActive] = useState(false);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleToggleMute]);

  const handleStartGame = useCallback(() => {
    setIsNewRecord(false);
    setGameState('PLAYING');
  }, []);

  const handlePauseToggle = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const handleScoreChange = useCallback(
    (nextScore: number, nextSpeed: number) => {
      setScore(nextScore);
      setSpeedMultiplier(nextSpeed);
    },
    []
  );

  const handleGameOver = useCallback(
    (finalScore: number) => {
      setScore(finalScore);
      setDuckActive(false);
      if (finalScore > highScore) {
        setHighScore(finalScore);
        setIsNewRecord(true);
        try {
          localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(finalScore));
        } catch {
          // Ignore storage quota errors
        }
      } else {
        setIsNewRecord(false);
      }
      setGameState('GAME_OVER');
    },
    [highScore]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F1EA] text-[#1F242D]">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-[960px]">
          {/* Unobtrusive Top HUD */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <div className="flex items-baseline gap-3">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#1F242D] whitespace-nowrap">
                공룡 점프 러너
              </h1>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              {/* Zero-pill tabular score readout */}
              <div className="flex items-center gap-3 text-sm text-[#595E68] font-mono-tabular">
                <span>
                  최고{' '}
                  <strong className="font-bold text-[#1F242D]">
                    {String(highScore).padStart(5, '0')}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  점수{' '}
                  <strong className="font-bold text-[#1F242D]">
                    {String(score).padStart(5, '0')}
                  </strong>
                </span>
                <span aria-hidden="true" className="hidden sm:inline">
                  ·
                </span>
                <span className="hidden sm:inline text-[#737882]">
                  {speedMultiplier.toFixed(1)}x
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
                  <button
                    type="button"
                    onClick={handlePauseToggle}
                    aria-label={gameState === 'PAUSED' ? '계속하기' : '일시정지'}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#DDD7C8] bg-white px-3 text-xs font-medium text-[#1F242D] transition-colors hover:bg-[#FAF8F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F242D] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {gameState === 'PAUSED' ? (
                      <>
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>계속</span>
                      </>
                    ) : (
                      <>
                        <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>일시정지</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DDD7C8] bg-white text-[#1F242D] transition-colors hover:bg-[#FAF8F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F242D] shrink-0 cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 text-[#737882]" aria-hidden="true" />
                  ) : (
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Primary Game Stage */}
          <DinoGameCanvas
            gameState={gameState}
            score={score}
            highScore={highScore}
            isNewRecord={isNewRecord}
            onStartGame={handleStartGame}
            onPauseToggle={handlePauseToggle}
            onScoreChange={handleScoreChange}
            onGameOver={handleGameOver}
            jumpSignal={jumpSignal}
            duckActive={duckActive}
          />

          {/* Touch Action Controls (Mobile / Tablet) & Keyboard Guide (Desktop) */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:hidden">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDuckActive(true);
                }}
                onPointerUp={() => setDuckActive(false)}
                onPointerLeave={() => setDuckActive(false)}
                onPointerCancel={() => setDuckActive(false)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#DDD7C8] bg-white px-5 py-3 text-sm font-semibold text-[#1F242D] active:bg-[#EAE5D9] select-none touch-none"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                <span>숙이기</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setJumpSignal((s) => s + 1);
                }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#D95D39] px-5 py-3 text-sm font-semibold text-white active:bg-[#C44D2B] select-none touch-none"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                <span>점프</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-xs text-[#6B707B]">
              <span>Space / ↑ : 점프 (길게 누르면 높이 점프)</span>
              <span aria-hidden="true">·</span>
              <span>↓ : 숙이기 및 빠른 하강</span>
              <span aria-hidden="true">·</span>
              <span>P : 일시정지</span>
              <span aria-hidden="true">·</span>
              <span>M : 소리</span>
            </div>

            <p className="text-xs text-[#737882]">
              700점마다 밤과 낮이 바뀝니다
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
