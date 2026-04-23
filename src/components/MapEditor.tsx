'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MapData } from '@/game/map';
import { TILE_WALKABLE } from '@/game/map';

interface MapEditorProps {
  initialData: MapData;
  onSave: (data: MapData) => void;
}

const TILE_COLORS: Record<number, string> = {
  0: '#8cccd0', // Reception
  7: '#a1a1aa', // Open Office
  8: '#c4b5fd', // Meeting
  9: '#fef08a', // Break Room
  10: '#93c5fd', // Quiet Zone
  11: '#86efac', // Terrace
  12: '#7ec850', // Garden
  13: '#c9a06c', // Lobby
  14: '#4a4063', // Private
  // Furniture/walls
  6: '#243e47', // Wall
  1: '#af8b44', // Desk
  2: '#333333', // Chair
  3: '#2e8c4a', // Plant
  4: '#aaaaaa', // Lamp
  5: '#e0607e', // Sofa
  15: '#1a6b2e', // Tree
  16: '#3ea05a', // Bush
  17: '#888888', // Bike rack
  18: '#2a2a4a', // Vending
  19: '#c8a96e', // Reception Counter
  20: '#111111', // Monitor Desk
  21: '#8b6914', // Conf Table
  22: '#f0f0f0', // Whiteboard
  23: '#cc6633', // Flower Pot
  24: '#1a1a2e', // Coffee
  25: '#1a3a5c', // TV
  [-1]: '#ff4757', // Spawn Point Marker
};

const TILE_SIZE = 16; // Display size in pixels for the 2D grid

export default function MapEditor({ initialData, onSave }: MapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mapData, setMapData] = useState<MapData>(JSON.parse(JSON.stringify(initialData)));
  const [selectedTool, setSelectedTool] = useState<number>(0); // tile id
  const [isDrawing, setIsDrawing] = useState(false);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { grid, width, height } = mapData;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileId = grid[y]?.[x] ?? 0;
        ctx.fillStyle = TILE_COLORS[tileId] || '#000000';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw Spawn Point Marker
    if (mapData.spawn_x !== undefined && mapData.spawn_y !== undefined) {
      ctx.fillStyle = TILE_COLORS[-1];
      ctx.beginPath();
      ctx.arc(
        mapData.spawn_x * TILE_SIZE + TILE_SIZE / 2,
        mapData.spawn_y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE / 3, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [mapData]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    paintTile(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) paintTile(e);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const paintTile = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);

    if (x >= 0 && x < mapData.width && y >= 0 && y < mapData.height) {
      if (selectedTool === -1) {
        setMapData(prev => ({ ...prev, spawn_x: x, spawn_y: y }));
        return;
      }

      if (mapData.grid[y][x] !== selectedTool) {
        setMapData((prev) => {
          const next = { ...prev };
          next.grid[y][x] = selectedTool;
          return next;
        });
      }
    }
  };

  const toolCategories = [
    { title: 'Sistema', items: [-1] },
    { title: 'Pisos', items: [0, 7, 8, 9, 10, 11, 12, 13, 14] },
    { title: 'Muros', items: [6] },
    { title: 'Mobiliario', items: [1, 2, 3, 4, 5, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
  ];

  return (
    <div className="map-editor">
      <div className="palette">
        <h3>Herramientas</h3>
        {toolCategories.map((cat) => (
          <div key={cat.title} className="tool-category">
            <h4>{cat.title}</h4>
            <div className="tool-grid">
              {cat.items.map((toolId) => (
                <button
                  key={toolId}
                  className={`tool-btn ${selectedTool === toolId ? 'active' : ''}`}
                  onClick={() => setSelectedTool(toolId)}
                  title={`Tile ID: ${toolId}`}
                  style={{ backgroundColor: TILE_COLORS[toolId] }}
                />
              ))}
            </div>
          </div>
        ))}
        <button className="btn-save" onClick={() => onSave(mapData)}>
          💾 Guardar Cambios
        </button>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={mapData.width * TILE_SIZE}
          height={mapData.height * TILE_SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        />
      </div>

      <style jsx>{`
        .map-editor {
          display: flex;
          gap: 1.5rem;
          height: 100%;
        }
        .palette {
          width: 200px;
          flex-shrink: 0;
          background: rgba(0,0,0,0.3);
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          .map-editor {
            flex-direction: column;
          }
          .palette {
            width: 100%;
            height: auto;
            max-height: 200px;
          }
        }
        .tool-category h4 {
          margin: 1rem 0 0.5rem 0;
          color: var(--text-muted);
          font-size: 0.8rem;
          text-transform: uppercase;
        }
        .tool-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tool-btn {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .tool-btn:hover {
          transform: scale(1.1);
        }
        .tool-btn.active {
          border-color: white;
          box-shadow: 0 0 8px rgba(255,255,255,0.8);
        }
        .canvas-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0d0d1a;
          border-radius: 12px;
          overflow: auto;
          padding: 2rem;
          border: 1px dashed rgba(255,255,255,0.2);
        }
        canvas {
          background: #000;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          cursor: crosshair;
        }
        .btn-save {
          margin-top: 2rem;
          width: 100%;
          background: var(--accent);
          color: white;
          border: none;
          padding: 0.8rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-save:hover {
          background: #7c74ff;
        }
      `}</style>
    </div>
  );
}
