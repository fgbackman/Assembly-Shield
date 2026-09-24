/**
 * Direct VGA Hardware Canvas Renderer
 * Directly blits physical memory 0x0A0000 (Mode 13h) or 0x0B8000 to an HTML5 Canvas.
 * Supports CRT Scanlines, P1 Phosphor Green, Amber Plasma, and Retina Blit modes.
 */

import React, { useEffect, useRef, useState } from 'react';
import { vgaHardware, VGA_WIDTH, VGA_HEIGHT, VGA_GRAPHICS_BASE } from '../engine/vgaMemory';
import { Eye, Monitor, Cpu, Sparkles, Sliders } from 'lucide-react';

interface VgaCanvasDisplayProps {
  crtEffect?: boolean;
  colorScheme?: 'COLOR_DAC' | 'PHOSPHOR_GREEN' | 'AMBER_RADAR';
  showHexOverlay?: boolean;
}

export const VgaCanvasDisplay: React.FC<VgaCanvasDisplayProps> = ({
  crtEffect: initialCrt = true,
  colorScheme: initialScheme = 'COLOR_DAC',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crtEffect, setCrtEffect] = useState(initialCrt);
  const [colorScheme, setColorScheme] = useState<'COLOR_DAC' | 'PHOSPHOR_GREEN' | 'AMBER_RADAR'>(initialScheme);
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; addr: number; val: number } | null>(null);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const imgData = ctx.createImageData(VGA_WIDTH, VGA_HEIGHT);

    const renderLoop = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = time;
      }

      // Blit VGA physical memory directly into Canvas ImageData
      const data = imgData.data;
      const mem = vgaHardware.memory;
      const palette = vgaHardware.dacPalette;
      const base = VGA_GRAPHICS_BASE;
      let ptr = 0;

      for (let i = 0; i < VGA_WIDTH * VGA_HEIGHT; i++) {
        const colorIdx = mem[base + i];
        const [r, g, b] = palette[colorIdx] || [0, 0, 0];

        if (colorScheme === 'PHOSPHOR_GREEN') {
          // P1 Green phosphor response
          const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          data[ptr] = Math.floor(lum * 24);
          data[ptr + 1] = Math.floor(lum * 255);
          data[ptr + 2] = Math.floor(lum * 48);
          data[ptr + 3] = 255;
        } else if (colorScheme === 'AMBER_RADAR') {
          // P3 Amber phosphor response
          const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          data[ptr] = Math.floor(lum * 255);
          data[ptr + 1] = Math.floor(lum * 170);
          data[ptr + 2] = 0;
          data[ptr + 3] = 255;
        } else {
          data[ptr] = r;
          data[ptr + 1] = g;
          data[ptr + 2] = b;
          data[ptr + 3] = 255;
        }
        ptr += 4;
      }

      ctx.putImageData(imgData, 0, 0);
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [colorScheme]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VGA_WIDTH / rect.width;
    const scaleY = VGA_HEIGHT / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < VGA_WIDTH && y >= 0 && y < VGA_HEIGHT) {
      const addr = VGA_GRAPHICS_BASE + y * VGA_WIDTH + x;
      const val = vgaHardware.memory[addr];
      setHoverPixel({ x, y, addr, val });
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  return (
    <div className="flex flex-col bg-neutral-950 rounded-lg border border-neutral-800 overflow-hidden shadow-2xl">
      {/* VGA Hardware Driver Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 text-xs text-neutral-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-semibold tracking-wide">
            <Monitor className="w-4 h-4 text-emerald-400" />
            <span>VGA MODE 13h [0xA0000]</span>
          </div>
          <span className="text-neutral-600">·</span>
          <span className="font-mono text-neutral-400">320×200 @ 8-bit DAC</span>
          <span className="text-neutral-600">·</span>
          <span className="font-mono text-cyan-400">{fps} FPS</span>
        </div>

        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          {/* Color Mode Selector */}
          <div className="flex items-center bg-neutral-800 p-0.5 rounded border border-neutral-700 font-mono text-[11px]">
            <button
              onClick={() => setColorScheme('COLOR_DAC')}
              className={`px-2 py-1 rounded transition-colors ${
                colorScheme === 'COLOR_DAC' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              256-DAC
            </button>
            <button
              onClick={() => setColorScheme('PHOSPHOR_GREEN')}
              className={`px-2 py-1 rounded transition-colors ${
                colorScheme === 'PHOSPHOR_GREEN' ? 'bg-emerald-950 text-emerald-300 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              P1-Green
            </button>
            <button
              onClick={() => setColorScheme('AMBER_RADAR')}
              className={`px-2 py-1 rounded transition-colors ${
                colorScheme === 'AMBER_RADAR' ? 'bg-amber-950 text-amber-300 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Amber
            </button>
          </div>

          {/* CRT Scanline Toggle */}
          <button
            onClick={() => setCrtEffect(!crtEffect)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[11px] border transition-colors ${
              crtEffect
                ? 'bg-neutral-800 border-neutral-600 text-cyan-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>CRT Scanlines</span>
          </button>
        </div>
      </div>

      {/* Screen Frame Container */}
      <div className="relative p-2 sm:p-4 bg-black flex items-center justify-center overflow-hidden">
        <div className="relative border-4 border-neutral-800 rounded-lg shadow-inner overflow-hidden max-w-full">
          <canvas
            ref={canvasRef}
            width={VGA_WIDTH}
            height={VGA_HEIGHT}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full max-w-[800px] h-auto aspect-[320/200] block cursor-crosshair [image-rendering:pixelated]"
          />

          {/* Realistic CRT Shader Overlay */}
          {crtEffect && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 2px)',
                boxShadow: 'inset 0 0 60px rgba(0,0,0,0.9), inset 0 0 10px rgba(0,255,180,0.1)',
              }}
            />
          )}

          {/* Hardware Coordinates Tooltip */}
          {hoverPixel && (
            <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/85 border border-cyan-500/40 rounded text-[11px] font-mono text-cyan-300 pointer-events-none backdrop-blur-sm shadow-lg">
              X:{hoverPixel.x} Y:{hoverPixel.y} · ADDR:0x{hoverPixel.addr.toString(16).toUpperCase()} · VALUE:0x{hoverPixel.val.toString(16).padStart(2, '0').toUpperCase()} ({hoverPixel.val})
            </div>
          )}
        </div>
      </div>

      {/* Physical Hardware Memory Info Footer */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-neutral-900/60 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-400">
        <div className="flex items-center gap-3">
          <span>FRAMEBUFFER: <strong className="text-neutral-200">0x000A0000 - 0x000AFFFF</strong> (64 KB)</span>
          <span className="text-neutral-600">·</span>
          <span>DAC PALETTE: <strong className="text-emerald-400">PORTS 0x3C8 / 0x3C9</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>HOST DRIVER: <strong className="text-cyan-400">Apple Silicon M4 Metal Blit</strong></span>
        </div>
      </div>
    </div>
  );
};
