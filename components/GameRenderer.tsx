import React from 'react';
import { Entity, Player, EntityType } from '../types';
import { TILE_SIZE, WORLD_HEIGHT } from '../constants';
import { Cloud, Mountain, Flag, Skull, Coins, User } from 'lucide-react';

interface GameRendererProps {
  player: Player;
  entities: Entity[];
  cameraOffset: number;
  levelTheme: string;
}

const GameRenderer: React.FC<GameRendererProps> = ({ player, entities, cameraOffset, levelTheme }) => {
  
  // Helper to calculate style position
  const getStyle = (entity: Entity) => ({
    left: entity.pos.x,
    top: entity.pos.y,
    width: entity.size.width,
    height: entity.size.height,
  });

  return (
    <div className={`relative w-full h-[${WORLD_HEIGHT}px] overflow-hidden bg-gradient-to-b ${levelTheme} rounded-xl shadow-2xl border-4 border-white/20`}>
      
      {/* Parallax Background Decorations - Clouds/Mountains */}
      <div className="absolute inset-0 pointer-events-none opacity-50" style={{ transform: `translateX(${-cameraOffset * 0.2}px)` }}>
        <Cloud className="absolute top-10 left-20 text-white w-24 h-24" />
        <Cloud className="absolute top-24 left-80 text-white w-16 h-16 opacity-80" />
        <Cloud className="absolute top-5 left-[600px] text-white w-28 h-28" />
        <Mountain className="absolute bottom-0 left-0 text-white/20 w-96 h-64" />
        <Mountain className="absolute bottom-0 left-[500px] text-white/20 w-80 h-52" />
      </div>

      {/* Game World Container - Moves based on camera */}
      <div 
        className="absolute top-0 left-0 h-full w-full will-change-transform"
        style={{ transform: `translateX(${-cameraOffset}px)` }}
      >
        {/* Render Entities */}
        {entities.map(entity => {
          if (entity.isDead) return null;

          switch (entity.type) {
            case EntityType.PLATFORM:
              return (
                <div 
                  key={entity.id}
                  style={getStyle(entity)}
                  className="absolute bg-amber-700 border-t-4 border-green-500 rounded-sm shadow-sm box-border"
                >
                  {/* Grass detail */}
                  <div className="w-full h-2 bg-green-400 opacity-50"></div>
                </div>
              );
            
            case EntityType.ENEMY:
              return (
                <div 
                  key={entity.id}
                  style={getStyle(entity)}
                  className="absolute flex items-center justify-center transition-transform"
                >
                  <div className={`relative w-full h-full bg-red-800 rounded-t-lg shadow-lg flex items-center justify-center ${entity.direction === 1 ? 'scale-x-[-1]' : ''}`}>
                    <Skull size={20} className="text-white animate-pulse" />
                    <div className="absolute -bottom-1 w-full flex justify-between px-1">
                       <div className="w-2 h-2 bg-black rounded-full animate-bounce delay-75"></div>
                       <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              );

            case EntityType.COIN:
              return (
                <div 
                  key={entity.id}
                  style={getStyle(entity)}
                  className="absolute flex items-center justify-center animate-bounce"
                >
                  <Coins className="text-yellow-400 drop-shadow-lg w-full h-full" />
                </div>
              );

            case EntityType.FLAG:
              return (
                <div 
                  key={entity.id}
                  style={getStyle(entity)}
                  className="absolute flex flex-col items-center justify-end"
                >
                  <div className="w-1 h-full bg-slate-800"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 bg-red-600 rounded-r-md animate-pulse origin-left skew-y-6 flex items-center justify-center">
                    <Flag size={16} className="text-white" />
                  </div>
                  <div className="w-8 h-8 bg-green-800 rounded-t-lg"></div>
                </div>
              );

            default:
              return null;
          }
        })}

        {/* Player */}
        <div 
          style={{
            ...getStyle(player),
            transform: `scaleX(${player.facing})` // Flip sprite
          }}
          className="absolute z-20 transition-transform duration-75"
        >
          <div className={`w-full h-full ${player.isJumping ? 'scale-95' : 'scale-100'} transition-all`}>
            {/* Mario-ish Character */}
            <div className="relative w-full h-full">
                {/* Head */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-red-500 rounded-t-xl z-10">
                   <div className="absolute bottom-1 right-1 w-8 h-2 bg-red-700 rounded-full -mr-1"></div> {/* Hat brim */}
                </div>
                {/* Body */}
                <div className="absolute bottom-0 left-1 w-[80%] h-1/2 bg-blue-600 rounded-b-lg"></div>
                {/* Buttons */}
                <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-yellow-300 rounded-full z-20"></div>
                <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-yellow-300 rounded-full z-20"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Foreground / Ground trim (Optional aesthetic) */}
      <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default GameRenderer;