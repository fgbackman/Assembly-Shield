/**
 * x86-64 Assembly Disassembler, CPU Register Inspector & MicroJS Bytecode Engine
 */

import React, { useState, useEffect } from 'react';
import { cpuInstance } from '../engine/asmCpu';
import { microJsEngine, DEFAULT_JS_UI_SCRIPT } from '../engine/microJsEngine';
import { vgaHardware, VGA_GRAPHICS_BASE, PACKET_DMA_BASE } from '../engine/vgaMemory';
import { AsmInstruction } from '../types';
import { Play, Pause, StepForward, RotateCcw, Code, Cpu, Database, Check, AlertCircle } from 'lucide-react';

export const AsmJsEngineDebugger: React.FC = () => {
  const [instructions, setInstructions] = useState<AsmInstruction[]>([]);
  const [rip, setRip] = useState<bigint>(cpuInstance.registers.rip);
  const [registers, setRegisters] = useState(cpuInstance.registers);
  const [isRunning, setIsRunning] = useState(true);
  const [clockSpeed, setClockSpeed] = useState<number>(30); // Hz
  const [jsCode, setJsCode] = useState<string>(DEFAULT_JS_UI_SCRIPT);
  const [activeMemoryTab, setActiveMemoryTab] = useState<'VGA_RAM' | 'DMA_PACKETS' | 'STACK'>('VGA_RAM');
  const [memoryOffset, setMemoryOffset] = useState<number>(0);
  const [compileSuccess, setCompileSuccess] = useState<boolean>(false);

  // Load initial assembly instructions from MicroJS engine
  useEffect(() => {
    const insts = microJsEngine.compileToAssembly(jsCode);
    cpuInstance.loadProgram(insts);
    setInstructions(insts);
  }, []);

  // CPU Execution loop
  useEffect(() => {
    let timer: any;
    if (isRunning) {
      timer = setInterval(() => {
        cpuInstance.step();
        setRip(cpuInstance.registers.rip);
        setRegisters({ ...cpuInstance.registers });
      }, 1000 / clockSpeed);
    }
    return () => clearInterval(timer);
  }, [isRunning, clockSpeed]);

  const handleStep = () => {
    setIsRunning(false);
    cpuInstance.step();
    setRip(cpuInstance.registers.rip);
    setRegisters({ ...cpuInstance.registers });
  };

  const handleReset = () => {
    cpuInstance.resetCpu();
    setRip(cpuInstance.registers.rip);
    setRegisters({ ...cpuInstance.registers });
  };

  const handleRecompileJs = () => {
    try {
      const compiled = microJsEngine.compileToAssembly(jsCode);
      cpuInstance.loadProgram(compiled);
      setInstructions(compiled);
      setRip(cpuInstance.registers.rip);
      setRegisters({ ...cpuInstance.registers });
      setCompileSuccess(true);
      setTimeout(() => setCompileSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const formatReg = (val: bigint) => '0x' + val.toString(16).padStart(16, '0').toUpperCase();

  // Read 128 bytes from selected memory segment
  const getMemoryBytes = () => {
    const base =
      activeMemoryTab === 'VGA_RAM'
        ? VGA_GRAPHICS_BASE + memoryOffset
        : activeMemoryTab === 'DMA_PACKETS'
        ? PACKET_DMA_BASE + memoryOffset
        : 0x07ffff; // Stack approximate
    const bytes: number[] = [];
    for (let i = 0; i < 128; i++) {
      bytes.push(vgaHardware.peek(base + i));
    }
    return { base, bytes };
  };

  const { base: memBase, bytes: memBytes } = getMemoryBytes();

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controller Bar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-200">CPU Architecture:</span>
            <span className="font-mono text-emerald-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
              x86-64 Long Mode (Bare-Metal)
            </span>
          </div>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400 font-mono">Total Cycles: {cpuInstance.totalCycles.toLocaleString()}</span>
        </div>

        {/* Stepper Controls */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-semibold transition-colors ${
              isRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause (F9)' : 'Run Continuous'}</span>
          </button>

          <button
            onClick={handleStep}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-mono text-xs border border-neutral-700 transition-colors"
          >
            <StepForward className="w-3.5 h-3.5 text-cyan-400" />
            <span>Step (F7)</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded border border-neutral-700 transition-colors"
            title="Reset Registers & RIP"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Clock Speed Selector */}
          <div className="flex items-center gap-1 bg-neutral-800 px-2 py-1 rounded border border-neutral-700 text-neutral-400 font-mono">
            <span>Clock:</span>
            <select
              value={clockSpeed}
              onChange={(e) => setClockSpeed(Number(e.target.value))}
              className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value={5}>5 Hz</option>
              <option value={30}>30 Hz</option>
              <option value={60}>60 Hz</option>
              <option value={200}>200 Hz</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid: Registers & Disassembly */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Col (5 cols): CPU Registers & Status Flags */}
        <div className="lg:col-span-5 flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-neutral-200">x86-64 General Purpose Registers</h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">64-bit Flat Model</span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-cyan-400 font-semibold">RAX</span>
              <span className="text-neutral-300 truncate">{formatReg(registers.rax)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-cyan-400 font-semibold" title="VGA Framebuffer Address">RBX</span>
              <span className="text-emerald-400 truncate" title="0xA0000 VGA Base">{formatReg(registers.rbx)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-cyan-400 font-semibold">RCX</span>
              <span className="text-neutral-300 truncate">{formatReg(registers.rcx)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-cyan-400 font-semibold" title="DMA Packet Ring Address">RDX</span>
              <span className="text-amber-400 truncate" title="0x100000 Packet Ring">{formatReg(registers.rdx)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-cyan-400 font-semibold">RSI</span>
              <span className="text-neutral-300 truncate">{formatReg(registers.rsi)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-cyan-400 font-semibold" title="VGA Dest Pointer">RDI</span>
              <span className="text-emerald-400 truncate">{formatReg(registers.rdi)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-cyan-400 font-semibold">RBP</span>
              <span className="text-neutral-400 truncate">{formatReg(registers.rbp)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-cyan-400 font-semibold">RSP</span>
              <span className="text-neutral-400 truncate">{formatReg(registers.rsp)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-purple-400 font-semibold">R8</span>
              <span className="text-neutral-300 truncate">{formatReg(registers.r8)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-purple-400 font-semibold">R9</span>
              <span className="text-neutral-300 truncate">{formatReg(registers.r9)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-purple-400 font-semibold" title="VGA Pel Port 0x3C8">R10</span>
              <span className="text-neutral-300 truncate">{formatReg(registers.r10)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-purple-400 font-semibold" title="VGA Pel Port 0x3C9">R11</span>
              <span className="text-neutral-300 truncate">{formatReg(registers.r11)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-purple-400 font-semibold" title="Threat Count">R12</span>
              <span className="text-red-400 truncate">{formatReg(registers.r12)}</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-950/60 p-1.5 rounded border border-neutral-800/80">
              <span className="text-purple-400 font-semibold">R13</span>
              <span className="text-neutral-300 truncate">{formatReg(registers.r13)}</span>
            </div>
          </div>

          {/* RIP & Control Registers */}
          <div className="mt-3 pt-2 border-t border-neutral-800 flex flex-col gap-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-800/50 p-1.5 rounded">
              <span className="text-emerald-400 font-bold">RIP (Program Counter)</span>
              <span className="text-emerald-300 font-bold">{formatReg(registers.rip)}</span>
            </div>

            <div className="flex items-center justify-between bg-neutral-950 p-1.5 rounded border border-neutral-800">
              <span className="text-neutral-400">CR0 (Protected/Paging)</span>
              <span className="text-neutral-200">0x80000011</span>
            </div>
          </div>

          {/* RFLAGS Indicator */}
          <div className="mt-3 pt-2 border-t border-neutral-800">
            <span className="text-[11px] font-mono text-neutral-400 block mb-1">RFLAGS Status Register:</span>
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className={`px-2 py-0.5 rounded border ${registers.rflags.zf ? 'bg-emerald-900/60 border-emerald-600 text-emerald-300' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}>
                ZF: {registers.rflags.zf ? '1' : '0'}
              </span>
              <span className={`px-2 py-0.5 rounded border ${registers.rflags.cf ? 'bg-amber-900/60 border-amber-600 text-amber-300' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}>
                CF: {registers.rflags.cf ? '1' : '0'}
              </span>
              <span className={`px-2 py-0.5 rounded border ${registers.rflags.sf ? 'bg-purple-900/60 border-purple-600 text-purple-300' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}>
                SF: {registers.rflags.sf ? '1' : '0'}
              </span>
              <span className={`px-2 py-0.5 rounded border ${registers.rflags.of ? 'bg-red-900/60 border-red-600 text-red-300' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}>
                OF: {registers.rflags.of ? '1' : '0'}
              </span>
              <span className={`px-2 py-0.5 rounded border ${registers.rflags.if ? 'bg-cyan-900/60 border-cyan-600 text-cyan-300' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}>
                IF: {registers.rflags.if ? '1' : '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Col (7 cols): Disassembly View */}
        <div className="lg:col-span-7 flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold text-neutral-200">x86-64 Disassembler (.text section)</h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">{instructions.length} instructions loaded</span>
          </div>

          {/* Disassembly Table */}
          <div className="max-h-[300px] overflow-y-auto font-mono text-[11px] border border-neutral-800 rounded bg-neutral-950 divide-y divide-neutral-800/60">
            {instructions.map((inst, idx) => {
              const isCurrent = BigInt(inst.address) === rip;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-3 py-1.5 transition-colors ${
                    isCurrent ? 'bg-emerald-950/70 border-l-4 border-l-emerald-400 text-emerald-200' : 'text-neutral-300 hover:bg-neutral-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-500 select-none">
                      0x{inst.address.toString(16).toUpperCase()}
                    </span>
                    <span className="text-neutral-600 text-[10px] w-20 truncate">{inst.hexBytes}</span>
                    <span className="font-bold text-cyan-300 w-16">{inst.mnemonic}</span>
                    <span className="text-neutral-200">{inst.operands}</span>
                  </div>

                  {inst.comment && (
                    <span className="text-neutral-500 text-[10px] hidden sm:inline-block">
                      ; {inst.comment}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* "Built Own JS Engine in Assembly" Interactive Script & Compiler */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              In-Memory JS Engine Compiler (Translating JavaScript to Assembly)
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              The custom in-assembly JS runtime compiles UI rendering code into x86-64 opcodes that write directly into VGA memory at <code className="text-emerald-400">0x0A0000</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={handleRecompileJs}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded transition-colors"
            >
              {compileSuccess ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
              <span>{compileSuccess ? 'Compiled to x86-64 ASM!' : 'Compile JS to x86-64 ASM'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1 font-mono">
              <span>JavaScript UI Logic Source:</span>
              <span>MicroJS JIT Compiler Target</span>
            </div>
            <textarea
              value={jsCode}
              onChange={(e) => setJsCode(e.target.value)}
              rows={9}
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 resize-none"
              spellCheck={false}
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1 font-mono">
              <span>Generated x86-64 Assembly Mapping:</span>
              <span className="text-emerald-400">Direct VGA 0xA0000 Ops</span>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded p-3 font-mono text-xs text-neutral-300 h-[190px] overflow-y-auto whitespace-pre leading-relaxed">
              <span className="text-neutral-500">; --- JIT Output for renderNetSecHUD() ---</span>
              {'\n'}
              <span className="text-cyan-400">_js_render_hud:</span>
              {'\n'}
              {'    '}push rbp{'\n'}
              {'    '}mov  rbp, rsp{'\n'}
              {'    '}mov  rdi, 0x000A0000       <span className="text-neutral-500">; VGA framebuffer base</span>{'\n'}
              {'    '}xor  rax, rax              <span className="text-neutral-500">; Color 0 (Black)</span>{'\n'}
              {'    '}mov  rcx, 64000            <span className="text-neutral-500">; 320x200 pixels</span>{'\n'}
              {'    '}rep  stosb                 <span className="text-neutral-500">; Fast memory fill</span>{'\n'}
              {'    '}call _asm_vga_fill_rect{'\n'}
              {'    '}mov  rdx, 0x00100000       <span className="text-neutral-500">; DMA Packet Ring</span>{'\n'}
              {'    '}cmp  r12, 0                <span className="text-neutral-500">; Check active threats</span>{'\n'}
              {'    '}je   _nominal_state{'\n'}
              {'    '}mov  al, 12                <span className="text-neutral-500">; Red Alert Color</span>{'\n'}
              {'    '}call _asm_vga_render_alert{'\n'}
              {'    '}leave{'\n'}
              {'    '}ret
            </div>
          </div>
        </div>
      </div>

      {/* Raw Physical Memory Hex Inspector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-neutral-200">Raw Physical Memory Inspector</h3>
          </div>

          {/* Segment Selector */}
          <div className="flex items-center gap-1 bg-neutral-800 p-0.5 rounded font-mono text-[11px]">
            <button
              onClick={() => { setActiveMemoryTab('VGA_RAM'); setMemoryOffset(0); }}
              className={`px-2 py-0.5 rounded ${activeMemoryTab === 'VGA_RAM' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              0x0A0000 (VGA RAM)
            </button>
            <button
              onClick={() => { setActiveMemoryTab('DMA_PACKETS'); setMemoryOffset(0); }}
              className={`px-2 py-0.5 rounded ${activeMemoryTab === 'DMA_PACKETS' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              0x100000 (Packet DMA)
            </button>
          </div>
        </div>

        {/* Hex Dump Table */}
        <div className="bg-neutral-950 border border-neutral-800 rounded p-2.5 font-mono text-[11px] overflow-x-auto">
          <div className="text-neutral-500 pb-1 mb-1 border-b border-neutral-900 grid grid-cols-12 gap-2">
            <span className="col-span-3">OFFSET</span>
            <span className="col-span-6">00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</span>
            <span className="col-span-3">ASCII</span>
          </div>

          {[0, 16, 32, 48, 64, 80, 96, 112].map((rowOffset) => {
            const rowAddr = memBase + rowOffset;
            const slice = memBytes.slice(rowOffset, rowOffset + 16);
            const hexStr = slice.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
            const asciiStr = slice.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');

            return (
              <div key={rowOffset} className="grid grid-cols-12 gap-2 py-0.5 text-neutral-300 hover:bg-neutral-900/40">
                <span className="col-span-3 text-cyan-400 font-semibold">
                  0x{rowAddr.toString(16).padStart(8, '0').toUpperCase()}
                </span>
                <span className="col-span-6 text-neutral-300 tracking-wider">{hexStr}</span>
                <span className="col-span-3 text-neutral-500">{asciiStr}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
