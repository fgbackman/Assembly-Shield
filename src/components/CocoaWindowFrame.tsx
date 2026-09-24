/**
 * macOS Cocoa Window Wrapper for Apple Silicon M4 Architecture
 * Provides authentic Cocoa titlebar, traffic light buttons, segmented tabs, and Metal status telemetry.
 */

import React, { useState } from 'react';
import {
  Monitor,
  Shield,
  Cpu,
  Binary,
  Sliders,
  Maximize2,
  Minimize2,
  Terminal,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CocoaWindowFrameProps {
  children: React.ReactNode;
  activeTab: 'DASHBOARD' | 'VGA_MONITOR' | 'ASM_JS_ENGINE' | 'PACKET_INSPECTOR' | 'MITIGATION';
  onTabChange: (tab: 'DASHBOARD' | 'VGA_MONITOR' | 'ASM_JS_ENGINE' | 'PACKET_INSPECTOR' | 'MITIGATION') => void;
  activeThreatCount: number;
}

export const CocoaWindowFrame: React.FC<CocoaWindowFrameProps> = ({
  children,
  activeTab,
  onTabChange,
  activeThreatCount,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTrafficHovered, setIsTrafficHovered] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-neutral-100 flex flex-col items-center justify-start p-2 sm:p-4 select-none">
      {/* Outer macOS Aluminum Window Shell */}
      <div className="w-full max-w-[1520px] rounded-xl border border-neutral-700/60 shadow-2xl bg-neutral-900/95 backdrop-blur-xl overflow-hidden flex flex-col">
        {/* Cocoa Titlebar & Traffic Lights */}
        <div className="h-11 bg-gradient-to-b from-neutral-800 to-neutral-850 border-b border-neutral-700/80 px-4 flex items-center justify-between">
          {/* Traffic Lights */}
          <div
            className="flex items-center gap-2"
            onMouseEnter={() => setIsTrafficHovered(true)}
            onMouseLeave={() => setIsTrafficHovered(false)}
          >
            {/* Close Button */}
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center cursor-pointer shadow-sm">
              {isTrafficHovered && <span className="text-[8px] text-neutral-900 font-bold leading-none">✕</span>}
            </div>
            {/* Minimize Button */}
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center cursor-pointer shadow-sm">
              {isTrafficHovered && <span className="text-[8px] text-neutral-900 font-bold leading-none">−</span>}
            </div>
            {/* Zoom / Fullscreen Button */}
            <div
              onClick={toggleFullscreen}
              className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center cursor-pointer shadow-sm"
            >
              {isTrafficHovered && <span className="text-[8px] text-neutral-900 font-bold leading-none">+</span>}
            </div>
          </div>

          {/* Window Title & Architecture Banner */}
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-neutral-100">ASM-VGA Security SOC</span>
            <span className="text-neutral-500">·</span>
            <span className="font-mono text-cyan-400 text-[11px] bg-neutral-950/70 px-2 py-0.5 rounded border border-neutral-800">
              Apple M4 (ARM64 host) ➔ x86-64 Bare-Metal VGA [0xA0000]
            </span>
          </div>

          {/* Metal 3 & Window Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80 text-[11px] font-mono text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Metal 3 Blit Active</span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Cocoa Native Segmented Control Tabs */}
        <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-neutral-950/90 p-1 rounded-lg border border-neutral-800 font-medium text-xs">
            <button
              onClick={() => onTabChange('DASHBOARD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'DASHBOARD'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>SOC Dashboard</span>
              {activeThreatCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-red-950 text-red-300 border border-red-800 font-mono">
                  {activeThreatCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('VGA_MONITOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'VGA_MONITOR'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>VGA 0xA0000 CRT Screen</span>
            </button>

            <button
              onClick={() => onTabChange('ASM_JS_ENGINE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'ASM_JS_ENGINE'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>x86-64 CPU & MicroJS Engine</span>
            </button>

            <button
              onClick={() => onTabChange('PACKET_INSPECTOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'PACKET_INSPECTOR'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Binary className="w-3.5 h-3.5 text-purple-400" />
              <span>Deep Packet Inspection (DPI)</span>
            </button>

            <button
              onClick={() => onTabChange('MITIGATION')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'MITIGATION'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-red-400" />
              <span>Mitigation & ASM Rules</span>
            </button>
          </div>

          {/* M4 Host Telemetry */}
          <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-neutral-400">
            <span>M4 Neural Engine: <strong className="text-emerald-400">Nominal</strong></span>
            <span className="text-neutral-600">·</span>
            <span>DMA Ring: <strong className="text-cyan-400">0x00100000</strong></span>
            <span className="text-neutral-600">·</span>
            <span>VGA Bus: <strong className="text-amber-400">PCI-Direct Mode 13h</strong></span>
          </div>
        </div>

        {/* Content Body Area */}
        <div className="p-4 sm:p-5 flex-1 bg-[#0f141c] overflow-y-auto">
          {children}
        </div>

        {/* Native Cocoa Bottom Status Bar */}
        <div className="h-7 bg-neutral-900 border-t border-neutral-800 px-4 flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-3">
            <span>Cocoa Window: <strong className="text-neutral-200">NSWindow / NSView (M4 Metal Blit)</strong></span>
            <span className="text-neutral-600">·</span>
            <span>Guest Architecture: <strong className="text-neutral-200">x86-64 Long Mode Bare-Metal</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Video Memory: <strong className="text-emerald-400">0xA0000 - 0xAFFFF</strong></span>
            <span className="text-neutral-600">·</span>
            <span>JIT Memory: <strong className="text-cyan-400">0xE0000</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
