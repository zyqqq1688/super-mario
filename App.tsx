import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  Player, 
  Entity, 
  EntityType, 
  Position, 
  AIGeneratedLevelInfo 
} from './types';
import { 
  GRAVITY, 
  FRICTION, 
  MOVE_SPEED, 
  JUMP_FORCE, 
  BOUNCE_FORCE,
  TERMINAL_VELOCITY,
  PLAYER_SIZE,
  TILE_SIZE,
  WORLD_HEIGHT,
  INITIAL_LEVEL_WIDTH,
  SCREEN_WIDTH
} from './constants';
import GameRenderer from './components/GameRenderer';
import { generateLevelTheme } from './services/geminiService';
import { Play, RotateCcw, Loader2, Sparkles, Trophy, HeartCrack, Keyboard } from 'lucide-react';

const INITIAL_PLAYER: Player = {
  id: 'p1',
  type: EntityType.PLAYER,
  pos: { x: 100, y: 100 },
  size: PLAYER_SIZE,
  vel: { dx: 0, dy: 0 },
  isGrounded: false,
  isJumping: false,
  facing: 1,
  score: 0,
  coins: 0
};

// Simple AABB Collision
const checkCollision = (r1: Entity, r2: Entity) => {
  return (
    r1.pos.x < r2.pos.x + r2.size.width &&
    r1.pos.x + r1.size.width > r2.pos.x &&
    r1.pos.y < r2.pos.y + r2.size.height &&
    r1.pos.y + r1.size.height > r2.pos.y
  );
};

// Level Generator
const generateLevel = (level: number): Entity[] => {
  const entities: Entity[] = [];
  
  // Floor
  for (let x = 0; x < INITIAL_LEVEL_WIDTH; x += TILE_SIZE) {
    // Gaps
    if ((x > 600 && x < 750) || (x > 1800 && x < 1950) || (x > 2500 && x < 2600)) continue;
    
    entities.push({
      id: `floor-${x}`,
      type: EntityType.PLATFORM,
      pos: { x, y: WORLD_HEIGHT - TILE_SIZE },
      size: { width: TILE_SIZE, height: TILE_SIZE }
    });
  }

  // Platforms & Obstacles
  const platformConfigs = [
    { x: 300, y: WORLD_HEIGHT - 150, w: 3 },
    { x: 450, y: WORLD_HEIGHT - 250, w: 2 },
    { x: 800, y: WORLD_HEIGHT - 200, w: 4 },
    { x: 1000, y: WORLD_HEIGHT - 350, w: 2 },
    { x: 1200, y: WORLD_HEIGHT - 200, w: 3 },
    { x: 1500, y: WORLD_HEIGHT - 300, w: 4 },
    { x: 2000, y: WORLD_HEIGHT - 150, w: 2 },
    { x: 2200, y: WORLD_HEIGHT - 280, w: 3 },
  ];

  platformConfigs.forEach((p, idx) => {
    for (let i = 0; i < p.w; i++) {
      entities.push({
        id: `plat-${idx}-${i}`,
        type: EntityType.PLATFORM,
        pos: { x: p.x + (i * TILE_SIZE), y: p.y },
        size: { width: TILE_SIZE, height: TILE_SIZE }
      });
    }
    
    // Add coins above platforms
    entities.push({
      id: `coin-plat-${idx}`,
      type: EntityType.COIN,
      pos: { x: p.x + TILE_SIZE, y: p.y - 50 },
      size: { width: 24, height: 24 }
    });
  });

  // Enemies
  const enemyPositions = [500, 900, 1400, 2100, 2300];
  enemyPositions.forEach((x, idx) => {
    entities.push({
      id: `enemy-${idx}`,
      type: EntityType.ENEMY,
      pos: { x, y: WORLD_HEIGHT - TILE_SIZE * 2 }, // Start slightly above ground
      size: { width: 32, height: 32 },
      vel: { dx: -2, dy: 0 }, // Initial move left
      patrolRange: { min: x - 100, max: x + 100 },
      direction: -1
    });
  });

  // Ground Coins
  [400, 1050, 1600, 1700, 1800].forEach((x, idx) => {
    entities.push({
      id: `coin-g-${idx}`,
      type: EntityType.COIN,
      pos: { x, y: WORLD_HEIGHT - TILE_SIZE - 40 },
      size: { width: 24, height: 24 }
    });
  });

  // End Flag
  entities.push({
    id: 'end-flag',
    type: EntityType.FLAG,
    pos: { x: INITIAL_LEVEL_WIDTH - 100, y: WORLD_HEIGHT - 240 },
    size: { width: 40, height: 200 }
  });

  return entities;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'MENU',
    levelName: 'Loading...',
    levelDescription: 'Please wait while we build the world...',
    cameraOffset: 0
  });
  
  const [levelTheme, setLevelTheme] = useState<string>("from-sky-400 to-sky-200");
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [entities, setEntities] = useState<Entity[]>([]);
  
  // Refs for physics loop to avoid stale closures
  const playerRef = useRef<Player>(INITIAL_PLAYER);
  const entitiesRef = useRef<Entity[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameOverRef = useRef<boolean>(false);

  // Initialize Game
  const startGame = useCallback(async () => {
    setGameState(prev => ({ ...prev, status: 'PLAYING', cameraOffset: 0 }));
    setPlayer(INITIAL_PLAYER);
    playerRef.current = JSON.parse(JSON.stringify(INITIAL_PLAYER)); // Deep copy
    gameOverRef.current = false;

    const newLevel = generateLevel(1);
    setEntities(newLevel);
    entitiesRef.current = newLevel;

    // Start Loop
    lastTimeRef.current = performance.now();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Fetch AI Theme on mount
  useEffect(() => {
    const fetchTheme = async () => {
      const theme = await generateLevelTheme("classic Mario-style");
      setGameState(prev => ({ 
        ...prev, 
        levelName: theme.name, 
        levelDescription: theme.description 
      }));
      setLevelTheme(theme.colorTheme);
    };
    fetchTheme();
  }, []);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      // Quick Restart
      if (e.code === 'KeyR') {
        startGame();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);

      // Variable Jump Height: Cut upward velocity if jump key is released early
      // This allows for "short hops" by tapping the jump button
      const isJumpKey = ['Space', 'ArrowUp', 'KeyW'].includes(e.code);
      if (isJumpKey) {
        const p = playerRef.current;
        // Only cut velocity if we are moving up significantly (jumping)
        // -4 is a threshold to prevent cutting velocity at the very peak of the jump naturally
        if (p.vel.dy < -4) { 
           p.vel.dy = p.vel.dy * 0.5; 
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startGame]);

  // The Physics Engine
  const gameLoop = useCallback((time: number) => {
    if (gameOverRef.current) return;

    // const deltaTime = time - lastTimeRef.current; // Can be used for smoother interpolation
    lastTimeRef.current = time;

    const p = playerRef.current;
    const allEntities = entitiesRef.current;
    const keys = keysRef.current;

    // --- Player Movement ---
    if (keys.has('ArrowLeft') || keys.has('KeyA')) {
      p.vel.dx = -MOVE_SPEED;
      p.facing = -1;
    } else if (keys.has('ArrowRight') || keys.has('KeyD')) {
      p.vel.dx = MOVE_SPEED;
      p.facing = 1;
    } else {
      p.vel.dx *= FRICTION;
    }

    if ((keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')) && p.isGrounded) {
      p.vel.dy = JUMP_FORCE;
      p.isGrounded = false;
      p.isJumping = true;
    }

    // Apply Gravity
    p.vel.dy += GRAVITY;
    if (p.vel.dy > TERMINAL_VELOCITY) p.vel.dy = TERMINAL_VELOCITY;

    // Apply Velocity to Position (X)
    p.pos.x += p.vel.dx;

    // Collision X
    let collidedX = false;
    for (const ent of allEntities) {
      if (ent.type === EntityType.PLATFORM && checkCollision(p, ent)) {
         if (p.vel.dx > 0) { // Moving Right
            p.pos.x = ent.pos.x - p.size.width;
         } else if (p.vel.dx < 0) { // Moving Left
            p.pos.x = ent.pos.x + ent.size.width;
         }
         p.vel.dx = 0;
         collidedX = true;
      }
    }

    // Apply Velocity to Position (Y)
    p.pos.y += p.vel.dy;
    p.isGrounded = false; // Assume air until collision proof

    // Collision Y
    for (const ent of allEntities) {
      if (ent.type === EntityType.PLATFORM && checkCollision(p, ent)) {
        if (p.vel.dy > 0) { // Falling down
          p.pos.y = ent.pos.y - p.size.height;
          p.isGrounded = true;
          p.isJumping = false;
          p.vel.dy = 0;
        } else if (p.vel.dy < 0) { // Hitting head
           p.pos.y = ent.pos.y + ent.size.height;
           p.vel.dy = 0;
        }
      }
    }

    // --- Entity Logic (Enemies & Collectibles) ---
    allEntities.forEach(ent => {
      if (ent.isDead) return;

      if (ent.type === EntityType.ENEMY) {
        // Simple Patrol Logic
        ent.pos.x += (ent.direction || 1) * 2;
        if (ent.patrolRange) {
          if (ent.pos.x > ent.patrolRange.max) ent.direction = -1;
          if (ent.pos.x < ent.patrolRange.min) ent.direction = 1;
        }

        // Enemy Collision with Player
        if (checkCollision(p, ent)) {
          // Check if player is landing on top (Kill enemy)
          const hitFromTop = p.vel.dy > 0 && (p.pos.y + p.size.height - ent.pos.y) < 20;
          
          if (hitFromTop) {
            ent.isDead = true;
            p.vel.dy = BOUNCE_FORCE; // Bounce off enemy
            p.score += 100;
          } else {
            // Player Dies
            gameOverRef.current = true;
            setGameState(prev => ({ ...prev, status: 'GAME_OVER' }));
          }
        }
      }

      if (ent.type === EntityType.COIN) {
        if (checkCollision(p, ent)) {
          ent.isDead = true;
          p.score += 50;
          p.coins += 1;
        }
      }

      if (ent.type === EntityType.FLAG) {
         if (checkCollision(p, ent)) {
             gameOverRef.current = true;
             setGameState(prev => ({ ...prev, status: 'VICTORY' }));
         }
      }
    });

    // --- World Bounds ---
    if (p.pos.y > WORLD_HEIGHT + 100) {
      // Fell off world
      gameOverRef.current = true;
      setGameState(prev => ({ ...prev, status: 'GAME_OVER' }));
    }

    // --- Camera Update ---
    // Keep player in middle 1/3 of screen
    let targetCamX = p.pos.x - SCREEN_WIDTH / 3;
    if (targetCamX < 0) targetCamX = 0;
    if (targetCamX > INITIAL_LEVEL_WIDTH - SCREEN_WIDTH) targetCamX = INITIAL_LEVEL_WIDTH - SCREEN_WIDTH;
    
    // Smooth camera (optional, but direct assignment is snappy)
    const currentCamOffset = targetCamX; 

    // --- React State Sync ---
    // Optimization: In a huge app we wouldn't set state every frame, but for this size it's acceptable for smoothness in rendering via React
    setPlayer({ ...p });
    setEntities([...allEntities]); 
    setGameState(prev => ({ ...prev, cameraOffset: currentCamOffset }));

    if (!gameOverRef.current) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  }, []);

  // Clean up
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // UI Components
  const MainMenu = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50 text-white p-8 text-center">
      <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-lg">
        Super React Bros
      </h1>
      <div className="bg-white/10 p-6 rounded-2xl border border-white/20 max-w-lg mb-8">
        <h2 className="text-2xl font-semibold mb-2 flex items-center justify-center gap-2">
           <Sparkles className="text-yellow-400" />
           {gameState.levelName}
        </h2>
        <p className="text-gray-200 italic">{gameState.levelDescription}</p>
      </div>
      
      <button 
        onClick={startGame}
        className="group relative px-8 py-4 bg-green-500 hover:bg-green-600 rounded-full text-2xl font-bold shadow-[0_4px_0_rgb(21,128,61)] hover:shadow-[0_2px_0_rgb(21,128,61)] hover:translate-y-[2px] transition-all flex items-center gap-3"
      >
        <Play size={32} className="fill-white" />
        START GAME
      </button>
      
      <div className="mt-8 text-sm text-white/50 flex flex-col items-center gap-2">
        <p className="flex items-center gap-2"><Keyboard size={16}/> CONTROLS</p>
        <div className="flex gap-4 justify-center">
          <span className="bg-white/20 px-2 py-1 rounded border border-white/10">WASD / Arrows</span>
          <span className="opacity-70">Move</span>
          <span className="bg-white/20 px-2 py-1 rounded border border-white/10">Space</span>
          <span className="opacity-70">Jump</span>
          <span className="bg-white/20 px-2 py-1 rounded border border-white/10">R</span>
          <span className="opacity-70">Restart</span>
        </div>
      </div>
    </div>
  );

  const GameOverScreen = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 text-white">
      <HeartCrack size={80} className="text-red-500 mb-4 animate-bounce" />
      <h2 className="text-5xl font-bold mb-2">GAME OVER</h2>
      <p className="text-xl mb-6">Score: {player.score}</p>
      <button 
        onClick={startGame}
        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-xl font-bold flex items-center gap-2 transition-colors"
      >
        <RotateCcw /> Try Again (Press R)
      </button>
    </div>
  );

  const VictoryScreen = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-500/90 z-50 text-white">
      <Trophy size={80} className="text-yellow-100 mb-4 animate-pulse" />
      <h2 className="text-5xl font-bold mb-2">LEVEL CLEARED!</h2>
      <div className="bg-white/20 p-6 rounded-xl text-center mb-6 min-w-[300px]">
        <div className="flex justify-between items-center mb-2">
            <span>Score:</span>
            <span className="font-bold text-2xl">{player.score}</span>
        </div>
        <div className="flex justify-between items-center">
            <span>Coins:</span>
            <span className="font-bold text-2xl">{player.coins}</span>
        </div>
      </div>
      <button 
        onClick={startGame}
        className="px-6 py-3 bg-white text-yellow-600 hover:bg-gray-100 rounded-lg text-xl font-bold flex items-center gap-2 transition-colors shadow-lg"
      >
        <RotateCcw /> Play Again
      </button>
    </div>
  );

  const HUD = () => (
    <div className="absolute top-4 left-4 right-4 flex justify-between z-40 pointer-events-none">
       <div className="flex flex-col">
         <span className="text-white font-black text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wider">WORLD</span>
         <span className="text-white font-bold text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">1-1</span>
       </div>
       
       <div className="flex flex-col items-center">
         <span className="text-white font-black text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wider">COINS</span>
         <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-yellow-400 rounded-full border-2 border-yellow-600 animate-spin-slow"></div>
            <span className="text-white font-bold text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">x {player.coins}</span>
         </div>
       </div>

       <div className="flex flex-col items-end">
         <span className="text-white font-black text-2xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wider">SCORE</span>
         <span className="text-white font-bold text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{player.score.toString().padStart(6, '0')}</span>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Game Container */}
      <div className="relative w-[1000px] h-[600px] bg-sky-300 rounded-2xl overflow-hidden shadow-2xl ring-8 ring-slate-800">
        
        {/* State Screens */}
        {gameState.status === 'MENU' && <MainMenu />}
        {gameState.status === 'GAME_OVER' && <GameOverScreen />}
        {gameState.status === 'VICTORY' && <VictoryScreen />}
        
        {/* Heads Up Display */}
        {gameState.status !== 'MENU' && <HUD />}

        {/* The Game World */}
        <GameRenderer 
            player={player} 
            entities={entities} 
            cameraOffset={gameState.cameraOffset}
            levelTheme={levelTheme}
        />

      </div>
      
      {/* Footer Info */}
      <div className="fixed bottom-4 text-slate-500 text-xs text-center">
        Built with React & Tailwind • AI Powered Level Themes • Arrow Keys/WASD to play
      </div>
    </div>
  );
};

export default App;