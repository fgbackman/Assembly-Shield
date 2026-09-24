/**
 * x86-64 Bare-Metal CPU & Virtual Machine Simulator
 * Emulates registers, stack frames, flag registers, and instruction decoding
 * mapped directly to VGA memory buffer (0xA0000) and Network DMA (0x100000).
 */

import { AsmInstruction, CPURegisters } from '../types';
import { vgaHardware, VGA_GRAPHICS_BASE } from './vgaMemory';

export class AsmCpu {
  public registers: CPURegisters;
  public instructions: AsmInstruction[] = [];
  public isRunning: boolean = true;
  public totalCycles: number = 0;
  public lastExecutedIndex: number = 0;
  public stack: bigint[] = [];

  constructor() {
    this.registers = this.initRegisters();
  }

  private initRegisters(): CPURegisters {
    return {
      rax: 0x0000000000000000n,
      rbx: 0x00000000000a0000n, // Pointing to VGA framebuffer
      rcx: 0x0000000000000040n, // Counter
      rdx: 0x0000000000100000n, // Network Packet DMA ring
      rsi: 0x00000000000e0000n, // JS Bytecode source
      rdi: 0x00000000000a0000n, // VGA Framebuffer destination
      rbp: 0x00007fffffffe000n,
      rsp: 0x00007fffffffe000n,
      r8: 0x0000000000000001n,
      r9: 0x0000000000000000n,
      r10: 0x00000000000003c8n, // VGA DAC Pel Address Write Port
      r11: 0x00000000000003c9n, // VGA DAC Pel Data Port
      r12: 0x0000000000001337n, // Threat Detection Matrix Flag
      r13: 0x0000000000000000n,
      r14: 0x0000000000000000n,
      r15: 0x0000000000000000n,
      rip: 0x0000000000401000n, // Entry point .text
      rflags: {
        cf: false,
        zf: false,
        sf: false,
        of: false,
        if: true,
      },
      cr0: 0x80000011n, // Protected Mode + Paging enabled
      cr3: 0x0000000000200000n, // PML4 table
    };
  }

  public resetCpu() {
    this.registers = this.initRegisters();
    this.totalCycles = 0;
    this.lastExecutedIndex = 0;
    this.stack = [];
  }

  public loadProgram(instructions: AsmInstruction[]) {
    this.instructions = instructions;
    if (instructions.length > 0) {
      this.registers.rip = BigInt(instructions[0].address);
      this.lastExecutedIndex = 0;
    }
  }

  /**
   * Executes a single instruction step in the x86-64 pipeline
   */
  public step(): AsmInstruction | null {
    if (this.instructions.length === 0) return null;

    // Find instruction at current RIP
    let currentIdx = this.instructions.findIndex(
      (inst) => BigInt(inst.address) === this.registers.rip
    );

    if (currentIdx === -1 || currentIdx >= this.instructions.length) {
      // Loop back to start if program ended
      currentIdx = 0;
      this.registers.rip = BigInt(this.instructions[0].address);
    }

    const inst = this.instructions[currentIdx];
    this.executeInstruction(inst);
    this.totalCycles += 1 + Math.floor(Math.random() * 2);
    this.lastExecutedIndex = currentIdx;

    return inst;
  }

  private executeInstruction(inst: AsmInstruction) {
    const mnemonic = inst.mnemonic.toUpperCase();
    const ops = inst.operands.split(',').map((s) => s.trim());

    // Advance RIP by instruction byte length (typical 2-7 bytes)
    const nextRip = this.registers.rip + BigInt(inst.hexBytes.replace(/\s+/g, '').length / 2 || 4);

    switch (mnemonic) {
      case 'MOV': {
        const dest = ops[0]?.toLowerCase();
        const src = ops[1]?.toLowerCase();
        const val = this.resolveValue(src);
        this.setRegister(dest, val);
        this.registers.rip = nextRip;
        break;
      }

      case 'ADD': {
        const dest = ops[0]?.toLowerCase();
        const val = this.resolveValue(ops[1]?.toLowerCase());
        const current = this.getRegister(dest);
        const res = (current + val) & 0xffffffffffffffffn;
        this.setRegister(dest, res);
        this.updateFlags(res);
        this.registers.rip = nextRip;
        break;
      }

      case 'SUB': {
        const dest = ops[0]?.toLowerCase();
        const val = this.resolveValue(ops[1]?.toLowerCase());
        const current = this.getRegister(dest);
        const res = (current - val) & 0xffffffffffffffffn;
        this.setRegister(dest, res);
        this.updateFlags(res);
        this.registers.rip = nextRip;
        break;
      }

      case 'XOR': {
        const dest = ops[0]?.toLowerCase();
        const val = this.resolveValue(ops[1]?.toLowerCase());
        const current = this.getRegister(dest);
        const res = (current ^ val) & 0xffffffffffffffffn;
        this.setRegister(dest, res);
        this.updateFlags(res);
        this.registers.rip = nextRip;
        break;
      }

      case 'CMP': {
        const a = this.resolveValue(ops[0]?.toLowerCase());
        const b = this.resolveValue(ops[1]?.toLowerCase());
        const res = (a - b) & 0xffffffffffffffffn;
        this.registers.rflags.zf = a === b;
        this.registers.rflags.sf = a < b;
        this.registers.rflags.cf = a < b;
        this.registers.rip = nextRip;
        break;
      }

      case 'JMP': {
        const target = this.resolveJumpTarget(ops[0]);
        if (target !== null) {
          this.registers.rip = target;
        } else {
          this.registers.rip = nextRip;
        }
        break;
      }

      case 'JE':
      case 'JZ': {
        if (this.registers.rflags.zf) {
          const target = this.resolveJumpTarget(ops[0]);
          this.registers.rip = target !== null ? target : nextRip;
        } else {
          this.registers.rip = nextRip;
        }
        break;
      }

      case 'JNE':
      case 'JNZ': {
        if (!this.registers.rflags.zf) {
          const target = this.resolveJumpTarget(ops[0]);
          this.registers.rip = target !== null ? target : nextRip;
        } else {
          this.registers.rip = nextRip;
        }
        break;
      }

      case 'PUSH': {
        const val = this.resolveValue(ops[0]?.toLowerCase());
        this.registers.rsp -= 8n;
        this.stack.push(val);
        this.registers.rip = nextRip;
        break;
      }

      case 'POP': {
        const dest = ops[0]?.toLowerCase();
        const val = this.stack.pop() || 0n;
        this.registers.rsp += 8n;
        this.setRegister(dest, val);
        this.registers.rip = nextRip;
        break;
      }

      case 'CALL': {
        this.registers.rsp -= 8n;
        this.stack.push(nextRip);
        const target = this.resolveJumpTarget(ops[0]);
        this.registers.rip = target !== null ? target : nextRip;
        break;
      }

      case 'RET': {
        const retAddr = this.stack.pop();
        if (retAddr !== undefined) {
          this.registers.rip = retAddr;
        } else {
          this.registers.rip = nextRip;
        }
        this.registers.rsp += 8n;
        break;
      }

      case 'INT': {
        const intNum = ops[0]?.toLowerCase();
        if (intNum === '0x10' || intNum === '10h') {
          // BIOS Video interrupt
          // AH = 0x0c: write graphics pixel
          // AL = color, CX = x, DX = y
          const color = Number(this.registers.rax & 0xffn);
          const x = Number(this.registers.rcx & 0xffffn) % 320;
          const y = Number(this.registers.rdx & 0xffffn) % 200;
          vgaHardware.vgaPutPixel(x, y, color);
        } else if (intNum === '0x80') {
          // Linux Syscall emulation
          // sys_write or net_packet_recv
          this.registers.rax = 0n; // Return success 0
        }
        this.registers.rip = nextRip;
        break;
      }

      case 'VGA_PIXEL': {
        // Custom micro-op: writes AL to [RDI]
        const color = Number(this.registers.rax & 0xffn);
        const addr = Number(this.registers.rdi & 0x1fffffn);
        vgaHardware.poke(addr, color);
        this.registers.rdi += 1n;
        this.registers.rip = nextRip;
        break;
      }

      default:
        this.registers.rip = nextRip;
        break;
    }
  }

  private resolveJumpTarget(targetStr: string): bigint | null {
    if (!targetStr) return null;
    const clean = targetStr.trim();
    if (clean.startsWith('0x')) {
      try {
        return BigInt(clean);
      } catch {
        return null;
      }
    }
    // Search for label in instruction list
    const found = this.instructions.find((inst) => inst.comment?.includes(clean) || inst.operands.includes(clean));
    if (found) {
      return BigInt(found.address);
    }
    return null;
  }

  private updateFlags(val: bigint) {
    this.registers.rflags.zf = val === 0n;
    this.registers.rflags.sf = (val & 0x8000000000000000n) !== 0n;
  }

  private resolveValue(operandStr?: string): bigint {
    if (!operandStr) return 0n;
    const s = operandStr.trim();

    // Hex literal
    if (s.startsWith('0x') || s.endsWith('h')) {
      try {
        const hex = s.endsWith('h') ? s.slice(0, -1) : s;
        return BigInt(hex);
      } catch {
        return 0n;
      }
    }

    // Decimal literal
    if (/^-?\d+$/.test(s)) {
      return BigInt(s);
    }

    // Dereferenced pointer e.g. [rbp-8] or [rax]
    if (s.startsWith('[') && s.endsWith(']')) {
      const inner = s.slice(1, -1).trim();
      const addr = Number(this.resolveValue(inner) & 0x1fffffn);
      return BigInt(vgaHardware.peek32(addr));
    }

    // Register name
    return this.getRegister(s);
  }

  private getRegister(name?: string): bigint {
    if (!name) return 0n;
    const reg = name.toLowerCase();
    switch (reg) {
      case 'rax': case 'eax': case 'ax': case 'al': return this.registers.rax;
      case 'rbx': case 'ebx': case 'bx': case 'bl': return this.registers.rbx;
      case 'rcx': case 'ecx': case 'cx': case 'cl': return this.registers.rcx;
      case 'rdx': case 'edx': case 'dx': case 'dl': return this.registers.rdx;
      case 'rsi': case 'esi': case 'si': return this.registers.rsi;
      case 'rdi': case 'edi': case 'di': return this.registers.rdi;
      case 'rbp': case 'ebp': case 'bp': return this.registers.rbp;
      case 'rsp': case 'esp': case 'sp': return this.registers.rsp;
      case 'r8': return this.registers.r8;
      case 'r9': return this.registers.r9;
      case 'r10': return this.registers.r10;
      case 'r11': return this.registers.r11;
      case 'r12': return this.registers.r12;
      case 'r13': return this.registers.r13;
      case 'r14': return this.registers.r14;
      case 'r15': return this.registers.r15;
      case 'rip': return this.registers.rip;
      default: return 0n;
    }
  }

  private setRegister(name?: string, val: bigint = 0n) {
    if (!name) return;
    const reg = name.toLowerCase();
    switch (reg) {
      case 'rax': case 'eax': case 'ax': case 'al': this.registers.rax = val; break;
      case 'rbx': case 'ebx': case 'bx': case 'bl': this.registers.rbx = val; break;
      case 'rcx': case 'ecx': case 'cx': case 'cl': this.registers.rcx = val; break;
      case 'rdx': case 'edx': case 'dx': case 'dl': this.registers.rdx = val; break;
      case 'rsi': case 'esi': case 'si': this.registers.rsi = val; break;
      case 'rdi': case 'edi': case 'di': this.registers.rdi = val; break;
      case 'rbp': case 'ebp': case 'bp': this.registers.rbp = val; break;
      case 'rsp': case 'esp': case 'sp': this.registers.rsp = val; break;
      case 'r8': this.registers.r8 = val; break;
      case 'r9': this.registers.r9 = val; break;
      case 'r10': this.registers.r10 = val; break;
      case 'r11': this.registers.r11 = val; break;
      case 'r12': this.registers.r12 = val; break;
      case 'r13': this.registers.r13 = val; break;
      case 'r14': this.registers.r14 = val; break;
      case 'r15': this.registers.r15 = val; break;
      case 'rip': this.registers.rip = val; break;
    }
  }
}

export const cpuInstance = new AsmCpu();
